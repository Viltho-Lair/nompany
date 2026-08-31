// THE ONE MODULE THAT KNOWS POSTGRES EXISTS — the mirror of redis.ts, and the
// same rule applies: nothing else opens a connection, because connection count
// is a hard ceiling on a serverless runtime and a second pool doubles it
// invisibly. Every later task calls pgQuery/withTenant and never constructs a
// client of its own — there is deliberately no exported "give me the pool"
// door (see _poolForTests below for why one existed and was removed).
//
// TRANSACTION-MODE POOLING IS THE CONSTRAINT THIS FILE IS BUILT AROUND. PgBouncer
// hands a different backend connection to every statement, so anything that
// lives in a SESSION — named prepared statements, SET, advisory locks, LISTEN —
// works in development against a direct connection and fails under the pooler.
// `pg` uses unnamed portals unless a query carries a `name`, so the rule is
// simply: never pass `name`. It is stated here because there is nowhere else it
// could be discovered before production, and it is why every query below is
// built as `{ text, values }` and nothing else.
import { Pool, type PoolClient } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { TBL } from "./keys";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("pg: DATABASE_URL is not set");
  pool = new Pool({
    connectionString,
    // SMALL ON PURPOSE. Every serverless invocation holds its own pool, so the
    // ceiling that matters is instances x max, not this number. PgBouncer (or,
    // today, the Cloud SQL Auth Proxy) is what multiplexes; this only needs
    // enough to overlap one request's queries.
    max: Number(process.env.PGPOOL_MAX || 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    // A QUERY THAT HANGS HOLDS A POOLED CONNECTION. On Redis the equivalent
    // failure self-healed; here it starves every other request on the instance.
    //
    // query_timeout MUST STAY STRICTLY GREATER THAN statement_timeout — do not
    // "tidy" these back to equal values; that was a real bug (fix round 1),
    // not a style choice. statement_timeout is enforced BY POSTGRES: the
    // server itself cancels the query and the connection comes back usable.
    // query_timeout is enforced BY THE CLIENT: `pg` rejects the in-flight
    // query's promise on its own timer WITHOUT touching the connection (see
    // node_modules/pg/lib/client.js's query_timeout handling) — the statement
    // may still be running server-side, and the connection is still sitting
    // mid-transaction with whatever SET LOCAL it carried. If the client timer
    // could win the race, `withTenant` would hand back a connection that
    // still has nompany.tenant_id LOCAL-set for a transaction the caller
    // thinks failed — exactly the leak this file exists to prevent. Keeping
    // the server timeout strictly shorter means Postgres always aborts first,
    // and query_timeout only ever fires as a backstop against a truly wedged
    // network. (The finally-block release(err) below is the second half of
    // this fix: even a backstop firing must destroy the connection, not
    // recycle it.)
    statement_timeout: 15_000,
    query_timeout: 20_000,
    // NO `ssl` OPTION HERE — DELIBERATELY, and do not "fix" it back in. The
    // connection reaches Postgres through the Cloud SQL Auth Proxy on
    // 127.0.0.1: a local socket that is already the encrypted tunnel.
    // DATABASE_URL carries no sslmode for the identical reason (see .env.local
    // and the task brief). Passing an `ssl` object here makes `pg` open a TLS
    // handshake against that local socket independently of the URL, and the
    // proxy's local endpoint does not speak TLS — every connection would fail.
    // What production points at (proxy vs. direct-with-TLS) is a decision for
    // DATABASE_URL and this option together, later; today there is no
    // sslmode and no ssl object, and the two facts have to move as a pair.
  });
  pool.on("error", (err) => {
    // Mirrors redis.ts: an idle-client error must not take the process down.
    console.error("[pg] idle client error", err.message);
  });
  return pool;
}

// TEST-ONLY ESCAPE HATCH. This used to be `export function getPgClient()`,
// returning the pool itself — the task brief's own interface. Review found
// that export was a hole: `getPgClient().query("SELECT * FROM collection_rows")`
// reaches Postgres with no tenant set and assertNotTenantScoped never runs,
// because the guard lives in pgQuery/pgTx/withTenant, not on the Pool object
// itself. Nothing in this codebase needs the raw pool — pgQuery, pgTx and
// withTenant already cover every real use — so the fix is to stop handing it
// out under an inviting name rather than to wrap it: a wrapper whose `.query`
// re-implements the guard would just be a second copy of pgQuery with extra
// steps. `tests/pg-parity.mjs` is the one legitimate caller, for reading pool
// configuration (statement_timeout) and closing the pool at the end of a bare
// run — the underscore-prefixed name is there so nobody reaches for this from
// application code by accident.
export function _poolForTests(): Pool {
  return getPool();
}

// ---- the tenant guard --------------------------------------------------
//
// collection_rows carries FORCE ROW LEVEL SECURITY (pgSchema.sql), keyed on
// `current_setting('nompany.tenant_id', true)`. Unset, that reads as SQL NULL,
// the policy matches no row, and the table owner is subject to it too — so a
// query against that table that never set the tenant does not error, it
// returns an EMPTY result, which is indistinguishable from "this tenant has no
// data". That is a fail-CLOSED but SILENT failure, and silent is the part that
// makes it dangerous: nothing downstream can tell "empty because forgotten"
// from "empty because true".
//
// So it is refused here, in code, before the query ever reaches Postgres,
// wherever it comes in on the bare pool (pgQuery, pgTx) rather than through
// withTenant below. `\b` word-boundaries so a substring match ("collection_rows_seq")
// cannot false-positive. This is a text match, not a parser — it cannot see
// through a VIEW or FUNCTION built on top of collection_rows, which is exactly
// why pgSchema.sql now carries a comment forbidding either from ever being
// created over this table: a wrapping view would defeat this guard with no
// change needed here at all.
const TENANT_TABLE_RE = new RegExp(`\\b${TBL.rows}\\b`, "i");
function assertNotTenantScoped(text: string, calledFrom: string): void {
  if (TENANT_TABLE_RE.test(text)) {
    throw new Error(
      `pg: a query through ${calledFrom} touches "${TBL.rows}", which is under FORCE ROW ` +
        `LEVEL SECURITY keyed on nompany.tenant_id. ${calledFrom} never sets that — the ` +
        `query would silently return zero rows instead of failing. Use withTenant(tenantId, ` +
        `...) instead.\nQuery: ${text.slice(0, 120)}`,
    );
  }
}

export type PgResult<T> = { rows: T[]; rowCount: number };
export type PgQueryFn = <T = any>(text: string, params?: readonly unknown[]) => Promise<PgResult<T>>;

async function run<T>(client: Pool | PoolClient, text: string, params: readonly unknown[]): Promise<PgResult<T>> {
  // `{ text, values }`, never `{ text, values, name }` — see the module header.
  const res = await client.query({ text, values: params as unknown[] });
  return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
}

// THE TENANT-AGNOSTIC PATH. Fine for health-check work and anything that
// never touches collection_rows; refused (see assertNotTenantScoped) the
// moment it does, because this path sets no tenant and RLS would go quiet
// rather than loud. Schema work (CREATE TABLE and friends) is NOT this path
// either — see pgSchemaQuery below.
export async function pgQuery<T = any>(text: string, params: readonly unknown[] = []): Promise<PgResult<T>> {
  assertNotTenantScoped(text, "pgQuery");
  return run<T>(getPool(), text, params);
}

/**
 * Run several statements in one transaction on one connection. Same
 * tenant-agnostic guard as pgQuery — a multi-statement transaction is not a
 * substitute for withTenant, it is a second door to the identical mistake.
 */
export async function pgTx<T>(fn: (q: PgQueryFn) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  let failure: unknown;
  try {
    await client.query({ text: "BEGIN" });
    const q: PgQueryFn = (text, params = []) => {
      assertNotTenantScoped(text, "pgTx");
      return run(client, text, params);
    };
    const out = await fn(q);
    await client.query({ text: "COMMIT" });
    return out;
  } catch (e) {
    failure = e;
    // ROLLBACK failing too (a dead connection) must not mask the original
    // error — swallow it and let the caller see what actually went wrong.
    await client.query({ text: "ROLLBACK" }).catch(() => {});
    throw e;
  } finally {
    // release(err) ON ANY ERROR PATH, NOT A BARE release(). Fix round 1: a
    // `query_timeout` rejects the client-side promise without the server
    // aborting or the connection dying (see the statement_timeout/query_timeout
    // comment above) — a plain release() would check that connection back
    // into the pool still sitting mid-transaction, for whatever query the next
    // caller runs on it. Passing the caught error tells pg-pool to DESTROY the
    // physical connection instead of reusing it; a connection whose
    // transaction state we can no longer vouch for must never go back to a
    // different caller. `undefined` on the success path is release()'s normal
    // "safe to reuse" signal.
    client.release(failure as Error | undefined);
  }
}

/**
 * THE DDL DOOR (Important 4) — schema application ONLY. Used by the migration
 * runner that applies pgSchema.sql (Task 2/later) and nothing else. Schema
 * statements (CREATE TABLE, CREATE INDEX, ALTER TABLE …) have no tenant and
 * necessarily name collection_rows literally, which assertNotTenantScoped
 * would refuse from pgQuery/pgTx — correctly, for every OTHER caller. Rather
 * than carve an exemption into that guard (a hidden allowance for "CREATE
 * TABLE" would just as easily have let a stray SELECT through the same hole),
 * the exemption is this separate, clearly-named export: a reader can see it
 * is deliberately not tenant-scoped, and grep for its call sites to confirm
 * the migration runner is the only one.
 *
 * Task 1 calls this from nowhere — no schema is applied here. It exists now
 * so Task 2's migration runner has a door to call instead of reaching for
 * pgQuery and hitting the guard, or opening a second pool of its own.
 */
export async function pgSchemaQuery<T = any>(text: string, params: readonly unknown[] = []): Promise<PgResult<T>> {
  return run<T>(getPool(), text, params);
}

// ---- re-entrancy (Important 3) -----------------------------------------
//
// withTenant takes a DEDICATED connection per call (pool.connect(), not
// pool.query()) and holds it for the whole of `fn`. Nest it — Task 4's row
// primitives calling withTenant from inside code that is itself already
// inside a withTenant — and with no guard each nested call queues for its own
// connection out of the same small pool its own caller is holding one from.
// Measured against PGPOOL_MAX=3: four levels deep stalls for ~5.6s (the sum
// of connectionTimeoutMillis retries) before pg-pool gives up with a generic
// "timeout exceeded when trying to connect" — a request-killing stall under
// load that reads as "the database is slow," not as what it actually is (two
// tenant scopes nested on one call stack).
//
// AsyncLocalStorage tracks the innermost active tenant scope per call stack.
// A nested call for the SAME tenant is absorbed into the caller's own
// transaction — reusing its connection and its `q`, opening nothing new —
// because that is a legitimate composition (a higher-level flow and the row
// primitive it calls both wrapping themselves in withTenant for the same
// tenant) that should cost nothing. A nested call for a DIFFERENT tenant is
// refused immediately: one request must not hold two tenant scopes on one
// call stack at once, and failing fast with a message naming both tenants is
// far more debuggable than a five-second mystery stall.
const tenantContext = new AsyncLocalStorage<{ tenantId: string; q: PgQueryFn }>();

/**
 * THE SEAM REQUIREMENT A ASKS FOR — the only sanctioned way to run a query
 * against a tenant-scoped table. Row primitives (Task 4) call this instead of
 * pgQuery/pgTx.
 *
 * Runs `fn` inside one transaction on one dedicated backend connection,
 * having first told Postgres which tenant this transaction may see.
 *
 * `SET LOCAL`, NEVER `SET`. `set_config(name, value, is_local)` with
 * `is_local = true` IS `SET LOCAL` — scoped to the transaction, reset by
 * Postgres at COMMIT or ROLLBACK. That matters specifically because of
 * transaction-mode pooling (see module header): under PgBouncer, the backend
 * this transaction runs on gets handed to a DIFFERENT tenant's next statement
 * the moment this one ends, regardless of whether the *client-side* pool
 * socket ever closes. A session-level `SET` would still be sitting on that
 * backend when that happens — a live cross-tenant leak, not a hypothetical
 * one. `SET LOCAL` cannot leak because Postgres itself clears it when this
 * transaction ends, before the backend is ever handed to anyone else.
 *
 * PARAMETERISED, NOT INTERPOLATED. `SET LOCAL nompany.tenant_id = 'x'` has no
 * bind-parameter form in Postgres's own grammar, which is exactly the kind of
 * gap that invites string-interpolating a caller-supplied value into SQL
 * text — the one thing every other builder in this codebase (keys.ts, TBL,
 * pgQuery.ts) exists to avoid. `set_config(...)` is an ordinary function call
 * and takes `$1` like any other, so tenantId — which arrives here from
 * session/route state, never a literal — never touches the query text.
 */
export async function withTenant<T>(tenantId: string, fn: (q: PgQueryFn) => Promise<T>): Promise<T> {
  if (!tenantId) {
    // FAIL LOUD, NOT QUIET. An empty tenant id would make `current_setting`
    // read as SQL NULL — precisely the fail-closed-but-silent case this seam
    // exists to prevent — so it is refused before a connection is even taken
    // from the pool, rather than being let through to become an empty result.
    throw new Error("pg: withTenant requires a non-empty tenantId");
  }

  const outer = tenantContext.getStore();
  if (outer) {
    if (outer.tenantId === tenantId) {
      // Re-entrant call for the SAME tenant: absorbed into the caller's own
      // transaction, no new connection taken.
      return fn(outer.q);
    }
    // A DIFFERENT tenant while one is already active on this call stack.
    // Refused immediately rather than queuing for a connection the pool may
    // not have — see the comment above tenantContext for the stall this
    // replaces.
    throw new Error(
      `pg: withTenant("${tenantId}") was called while withTenant("${outer.tenantId}") is already ` +
        `active on the same call stack. One request may not hold two tenant scopes at once.`,
    );
  }

  const client = await getPool().connect();
  let failure: unknown;
  try {
    await client.query({ text: "BEGIN" });
    await client.query({
      text: "SELECT set_config('nompany.tenant_id', $1, true)",
      values: [tenantId],
    });
    // No assertNotTenantScoped in this closure: this IS the mechanism the
    // guard exists to require callers to go through.
    const q: PgQueryFn = (text, params = []) => run(client, text, params);
    const out = await tenantContext.run({ tenantId, q }, () => fn(q));
    await client.query({ text: "COMMIT" });
    return out;
  } catch (e) {
    failure = e;
    await client.query({ text: "ROLLBACK" }).catch(() => {});
    throw e;
  } finally {
    // release(err) on any error path — see the identical comment in pgTx.
    // This is the exact path Critical 1's leak was reached through: a
    // query_timeout (or any other mid-transaction failure) must destroy this
    // connection rather than hand it back to the pool still carrying
    // nompany.tenant_id LOCAL-set for whichever tenant runs the next query.
    client.release(failure as Error | undefined);
  }
}
