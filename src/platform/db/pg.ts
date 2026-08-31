// THE ONE MODULE THAT KNOWS POSTGRES EXISTS — the mirror of redis.ts, and the
// same rule applies: nothing else opens a connection, because connection count
// is a hard ceiling on a serverless runtime and a second pool doubles it
// invisibly. Every later task calls pgQuery/withTenant and never constructs a
// client of its own.
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
import { TBL } from "./keys";

let pool: Pool | null = null;

export function getPgClient(): Pool {
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
    statement_timeout: 15_000,
    query_timeout: 15_000,
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
// cannot false-positive.
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

// THE TENANT-AGNOSTIC PATH. Fine for schema/health-check work and anything
// that never touches collection_rows; refused (see assertNotTenantScoped) the
// moment it does, because this path sets no tenant and RLS would go quiet
// rather than loud.
export async function pgQuery<T = any>(text: string, params: readonly unknown[] = []): Promise<PgResult<T>> {
  assertNotTenantScoped(text, "pgQuery");
  return run<T>(getPgClient(), text, params);
}

/**
 * Run several statements in one transaction on one connection. Same
 * tenant-agnostic guard as pgQuery — a multi-statement transaction is not a
 * substitute for withTenant, it is a second door to the identical mistake.
 */
export async function pgTx<T>(fn: (q: PgQueryFn) => Promise<T>): Promise<T> {
  const client = await getPgClient().connect();
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
    // ROLLBACK failing too (a dead connection) must not mask the original
    // error — swallow it and let the caller see what actually went wrong.
    await client.query({ text: "ROLLBACK" }).catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

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
  const client = await getPgClient().connect();
  try {
    await client.query({ text: "BEGIN" });
    await client.query({
      text: "SELECT set_config('nompany.tenant_id', $1, true)",
      values: [tenantId],
    });
    // No assertNotTenantScoped in this closure: this IS the mechanism the
    // guard exists to require callers to go through.
    const q: PgQueryFn = (text, params = []) => run(client, text, params);
    const out = await fn(q);
    await client.query({ text: "COMMIT" });
    return out;
  } catch (e) {
    await client.query({ text: "ROLLBACK" }).catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
