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
import { countedQuery } from "./commandCount";
import { guardAgainstConnectionError } from "./pgClientGuard";
// THE GUARDS LIVE IN A PURE SIBLING, NOT HERE. They used to be private to this
// file, which was right while this file was the only way to reach Postgres.
// The Cloud Run pg-gateway (services/pg-gateway) is a second, separately
// reachable door onto the same table, and it imports the same two functions —
// a guard that lives only at the caller is not a guard once the callee can be
// called directly. See sqlGuards.ts's header for why one module beats two
// copies.
import { assertNotTenantScoped, assertDdlOnly } from "./sqlGuards";
import { gatewayStatement } from "./pgGateway";

// ---- the transport switch (plan Task 3) ------------------------------------
//
// TWO WAYS TO REACH THE SAME DATABASE, and `direct` is the default for a
// reason that is not caution.
//
//  - `direct` is everything below this line: a `pg.Pool` against DATABASE_URL,
//    byte-for-byte what this file did before the switch existed. Local
//    development reaches Cloud SQL through the Auth Proxy; CI reaches its own
//    `postgres:18` container as `ci_app`.
//  - `gateway` posts each statement to the Cloud Run service in
//    services/pg-gateway, which holds the only network path Vercel has to the
//    instance (design 2026-08-31: zero authorized networks, private IP on a
//    VPC Vercel is not in).
//
// CI AND LOCAL STAY ON `direct`, DELIBERATELY — design D5. RLS is the thing
// most likely to break under the gateway, and a test that reaches Postgres
// through a gateway is testing the gateway, not the policy. That is also why
// `direct` must remain unchanged rather than merely equivalent: the goldens,
// the hop counts and every RLS assertion in tests/pg-parity.mjs were recorded
// against this path.
//
// READ ONCE AT MODULE SCOPE, the same shape DB_BACKEND uses in sections.ts, and
// for the same reason: which store answers is a property of the deployment, not
// of a request, and re-reading it per call invites a value that changes
// mid-flight.
const PG_TRANSPORT_RAW = process.env.PG_TRANSPORT;

export type PgTransport = "direct" | "gateway";

/**
 * The rule, as a pure function of the raw value — unset means `direct`.
 *
 * AN UNKNOWN VALUE THROWS RATHER THAN FALLING BACK TO `direct`. Falling back
 * is the worse bug of the two: on Vercel there is no direct path at all, so
 * `PG_TRANSPORT=gatway` silently taking the direct path does not produce a
 * configuration error, it produces a CONNECTION TIMEOUT — which the design
 * already names as the harder failure to read.
 *
 * Pure and separate from the module-scope read below so both halves of the
 * rule (unset defaults, unknown refuses) are provable without a process whose
 * environment has to be arranged first.
 */
export function parseTransport(raw: string | undefined): PgTransport {
  const value = raw || "direct";
  if (value === "direct" || value === "gateway") return value;
  throw new Error(
    `pg: PG_TRANSPORT is "${value}", which is neither "direct" nor "gateway". Refusing rather than ` +
      "defaulting — on Vercel there is no direct network path to Cloud SQL, so a silent fallback would " +
      "surface as a connection timeout rather than as the configuration mistake it is.",
  );
}

/**
 * The active transport. Throws on an unknown value HERE — when somebody asks
 * for a database — rather than at module load: this module is imported
 * transitively by the dispatcher in sections.ts, so throwing at load would take
 * down every Redis-backed page too, for a variable none of them consult.
 */
export function pgTransport(): PgTransport {
  return parseTransport(PG_TRANSPORT_RAW);
}

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
// assertNotTenantScoped now lives in ./sqlGuards, imported above, because the
// gateway must run the identical check on statements that never pass through
// this file at all. Its reasoning — why an unset tenant is a fail-closed but
// SILENT failure, and why a text match cannot see through a view — moved with
// it rather than being summarised here, so there is one place to read it and
// one place to change it.

export type PgResult<T> = { rows: T[]; rowCount: number };
export type PgQueryFn = <T = any>(text: string, params?: readonly unknown[]) => Promise<PgResult<T>>;

// TASK 8 — QUERY COUNTING REPLACES HOP COUNTING. Every statement this module
// sends reaches Postgres through `run`, so this is the one place to make it
// report into commandCount.ts's counter — the identical shape `redis.ts` uses
// for `countingClient`, so no Postgres round trip can bypass the counter the
// way an unwrapped call site would.
//
// NAMED BY LEADING KEYWORD, the SQL analogue of a Redis command name (GET,
// MGET, ...). BEGIN/COMMIT/ROLLBACK and the `set_config(...)` call that opens a
// tenant scope are matched BY NAME rather than falling into the generic
// "select" bucket set_config's own SQL shape would otherwise put them in —
// `countedQuery`'s "envelope" kind (see its header in commandCount.ts) depends
// on being able to tell them apart from a caller's own SELECT/INSERT/UPDATE/
// DELETE, and a text match here is the only place that distinction can be made
// once both kinds of statement are flowing through the same `run`.
function statementKind(text: string): { name: string; envelope: boolean } {
  const head = text.trimStart();
  if (/^BEGIN\b/i.test(head)) return { name: "begin", envelope: true };
  if (/^COMMIT\b/i.test(head)) return { name: "commit", envelope: true };
  if (/^ROLLBACK\b/i.test(head)) return { name: "rollback", envelope: true };
  if (/set_config\s*\(/i.test(head)) return { name: "set_config", envelope: true };
  const leading = /^([A-Za-z]+)/.exec(head);
  return { name: (leading ? leading[1] : "query").toLowerCase(), envelope: false };
}

async function run<T>(client: Pool | PoolClient, text: string, params: readonly unknown[]): Promise<PgResult<T>> {
  // `{ text, values }`, never `{ text, values, name }` — see the module header.
  const { name, envelope } = statementKind(text);
  return countedQuery(name, text, async () => {
    const res = await client.query({ text, values: params as unknown[] });
    return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
  }, envelope ? "envelope" : "data");
}

// THE GATEWAY'S `run`. Same job, same counter, a different wire.
//
// COUNTED TWICE, ON PURPOSE, AND NOT INTO A NEW COUNTER (design D4 says the
// network budget already has one). The statement itself counts toward
// `queries` exactly as it does under `direct`, so every ceiling Gate A pins is
// measuring the same thing on both transports — a route asks for the same DATA
// whichever wire carries it. The `gateway_tx` entry counts toward `envelope`,
// which is the field whose whole meaning is "the transaction bookkeeping
// wrapped around a caller's statement": under this transport that bookkeeping
// is a BEGIN/[set_config]/COMMIT the gateway runs on our behalf, one per HTTPS
// call. So `envelope` reads as the number of network round trips, which is what
// D4 wanted it to mean, and it stays true rather than approximately true even
// for the two scopes that issue two statements.
//
// The name is in the trace (`names`, NOMPANY_HOP_TRACE=1) so a reader can see
// which transport a run took without being told.
async function runGateway<T>(
  tenantId: string | undefined,
  text: string,
  params: readonly unknown[],
): Promise<PgResult<T>> {
  const { name } = statementKind(text);
  return countedQuery(
    "gateway_tx",
    undefined,
    () => countedQuery(name, text, () => gatewayStatement<T>(tenantId, text, params), "data"),
    "envelope",
  );
}

// A SHARED REFUSAL, so the two multi-statement doors say the same thing in the
// same words. Both are schema and migration paths, and both run from CI or a
// developer's machine — which reach Postgres directly and therefore need no
// gateway at all.
function refuseUnderGateway(door: string, why: string): never {
  throw new Error(
    `pg: ${door} is not available under PG_TRANSPORT=gateway. ${why} The gateway is STATELESS — one HTTPS ` +
      "call is one transaction (design D1) — and holding a transaction open across calls was rejected " +
      "because it needs session affinity and leaks transactions holding row locks whenever an instance " +
      `dies mid-scope. ${door}'s callers are schema and migration paths that run from CI or a developer's ` +
      "machine, both of which reach Postgres directly: run them with PG_TRANSPORT=direct.",
  );
}

// ---- the process-crash guard (fix round 2, Critical) -----------------------
//
// guardAgainstConnectionError moved to ./pgClientGuard, imported above. The
// gateway holds a checked-out client across a BEGIN…COMMIT exactly as pgTx and
// withTenant do here, so it needs the same listener — and a second copy of a
// guard against an uncaught 'error' taking the whole process down is precisely
// the duplicate that would be left behind by the next fix. Its full account of
// why pg-pool removes its own listener on checkout lives with it.

// THE TENANT-AGNOSTIC PATH. Fine for health-check work and anything that
// never touches collection_rows; refused (see assertNotTenantScoped) the
// moment it does, because this path sets no tenant and RLS would go quiet
// rather than loud. Schema work (CREATE TABLE and friends) is NOT this path
// either — see pgSchemaQuery below.
export async function pgQuery<T = any>(text: string, params: readonly unknown[] = []): Promise<PgResult<T>> {
  assertNotTenantScoped(text, "pgQuery");
  // GUARDED BEFORE THE BRANCH, not inside each arm. The gateway re-runs this
  // identical check server-side (a guard that lives only at the caller is not a
  // guard once the callee is separately reachable) — running it here too means
  // a refusal costs no network call, and means both transports refuse the same
  // text for the same reason with the same message.
  if (pgTransport() === "gateway") return runGateway<T>(undefined, text, params);
  return run<T>(getPool(), text, params);
}

/**
 * Run several statements in one transaction on one connection. Same
 * tenant-agnostic guard as pgQuery — a multi-statement transaction is not a
 * substitute for withTenant, it is a second door to the identical mistake.
 */
export async function pgTx<T>(fn: (q: PgQueryFn) => Promise<T>): Promise<T> {
  // REFUSED UNDER THE GATEWAY, NEVER SILENTLY MADE TO WORK. Running each of
  // this callback's statements as its own HTTPS call would keep the signature
  // and lose the only thing pgTx exists for: several statements committing or
  // failing together, where a later one's TEXT depends on an earlier one's
  // RESULT. withTenant's scopes survive that split because their compare-and-set
  // is optimistic and `nextval` is non-transactional — neither of which is a
  // property pgTx can assume about an arbitrary callback. A door that quietly
  // stopped being atomic while still being called pgTx is worse than a door
  // that is closed.
  if (pgTransport() === "gateway") {
    refuseUnderGateway(
      "pgTx",
      "It exists to run several statements as one transaction, and each statement here would become its " +
        "own HTTPS call and therefore its own transaction.",
    );
  }
  const client = await getPool().connect();
  // See guardAgainstConnectionError above: without this, a connection killed
  // while held here (Cloud SQL maintenance, proxy restart, a network blip)
  // emits an unlistened 'error' and crashes the whole process, not just this
  // transaction.
  const guard = guardAgainstConnectionError(client);
  let failure: unknown;
  try {
    const work = (async () => {
      await run(client, "BEGIN", []);
      const q: PgQueryFn = (text, params = []) => {
        assertNotTenantScoped(text, "pgTx");
        return run(client, text, params);
      };
      const out = await fn(q);
      await run(client, "COMMIT", []);
      return out;
    })();
    // If `guard.errored` wins the race below, `work` is left running and may
    // reject on its own later (its BEGIN/query/COMMIT chain still pending on
    // a socket that will never answer) — attach a no-op handler now so that
    // eventual rejection never surfaces as an unhandled promise rejection.
    work.catch(() => {});
    return await Promise.race([work, guard.errored]);
  } catch (e) {
    failure = e;
    // A connection that already emitted 'error' cannot be trusted to run
    // another query — attempting ROLLBACK on it would just add a second,
    // confusing failure for a connection release(err) below destroys anyway.
    if (!guard.hadError()) {
      // ROLLBACK failing too (a dead connection) must not mask the original
      // error — swallow it and let the caller see what actually went wrong.
      await run(client, "ROLLBACK", []).catch(() => {});
    }
    throw e;
  } finally {
    guard.detach();
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

// ---- the DDL-only guard (Task 2, tightened in fix round 1) -----------------
//
// assertDdlOnly, its ALLOWED_DDL_SHAPES allowlist, nameDangerousShape and the
// string/comment-aware splitter now live in ./sqlGuards, imported above. The
// long account of why the allowlist replaced a denylist, and of the `--`-inside-
// a-string-literal bug that made comment-stripping and statement-splitting one
// pass, moved there verbatim — the gateway re-runs this exact check on every
// statement it is handed, and two copies of that reasoning would drift apart
// exactly where drifting is least survivable.

/**
 * THE DDL DOOR (Important 4) — schema application ONLY. Used by the migration
 * runner that applies pgSchema.sql (Task 2) and nothing else. Schema
 * statements (CREATE TABLE, CREATE INDEX, ALTER TABLE …) have no tenant and
 * necessarily name collection_rows literally, which assertNotTenantScoped
 * would refuse from pgQuery/pgTx — correctly, for every OTHER caller. Rather
 * than carve an exemption into that guard (a hidden allowance for "CREATE
 * TABLE" would just as easily have let a stray SELECT through the same hole),
 * the exemption is this separate, clearly-named export: a reader can see it
 * is deliberately not tenant-scoped, and grep for its call sites to confirm
 * the migration runner is the only one.
 *
 * NARROWED TO AN ALLOWLIST OF EXACT SHAPES (Task 2, tightened fix round 1 —
 * see assertDdlOnly/ALLOWED_DDL_SHAPES in ./sqlGuards): this no longer runs whatever
 * text a caller hands it, and it no longer trusts a leading keyword either —
 * a denylist of destructive statements is unbounded, so only the specific
 * statement shapes pgSchema.sql actually uses are accepted. A visible,
 * enforced allowlist is reviewable; a trusted denylist is a hole waiting for
 * the one destructive form nobody thought to name.
 */
export async function pgSchemaQuery<T = any>(text: string, params: readonly unknown[] = []): Promise<PgResult<T>> {
  assertDdlOnly(text);
  // REFUSED UNDER THE GATEWAY TOO, and this one is not a judgement call — the
  // gateway's own contract forbids it. pgSchemaQuery hands pgSchema.sql to
  // Postgres as ONE TEXT HOLDING MANY STATEMENTS on purpose: the simple query
  // protocol runs the whole file as one implicit transaction, so a failure
  // partway through leaves nothing applied. The gateway refuses any text that
  // is not exactly one statement (services/pg-gateway/src/guard.ts), because a
  // text with no bind values reaching Postgres on that same simple protocol is
  // how `SELECT 1; DROP TABLE collection_rows` would run as a batch. Sending
  // the file statement-by-statement instead would satisfy the gateway and lose
  // the all-or-nothing property the single text buys — a half-applied schema.
  //
  // So the migration runner keeps the direct transport, which costs nothing:
  // scripts/migrate/pg/schema.mjs runs from CI or a developer's machine, and
  // both reach Postgres already. Stated as a refusal rather than left to a
  // 400 from the far side, so it is answered before a deploy rather than
  // during one.
  if (pgTransport() === "gateway") {
    refuseUnderGateway(
      "pgSchemaQuery",
      "It sends the schema file as one text holding many statements, so that a failure partway through " +
        "applies nothing — and the gateway refuses any text that is not exactly one statement.",
    );
  }
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

  // THE GATEWAY ARM — below the guard and the re-entrancy check, not beside
  // them, so both transports enforce the identical two rules from one piece of
  // code. Re-entrancy still matters here even though there is no pool to
  // starve: absorbing a same-tenant nested call is what keeps a composed flow
  // from opening a SECOND remote transaction around statements that belong in
  // the caller's, and refusing a different-tenant nested call is a correctness
  // rule about one request holding two tenant scopes, which no transport
  // changes.
  //
  // WHAT IS DIFFERENT: there is no BEGIN, no set_config and no COMMIT sent from
  // here. The gateway runs all three around every statement it is given, which
  // is why each `q()` is its own transaction under this transport. See
  // pgGateway.ts's header for the walk of all eight scopes in pgRows.ts and why
  // the only two that issue more than one statement survive the split —
  // optimistic compare-and-set in one, and `nextval` being non-transactional in
  // Postgres in the other.
  if (pgTransport() === "gateway") {
    const q: PgQueryFn = (text, params = []) => runGateway(tenantId, text, params);
    // The store is still established, and must be: it is what the re-entrancy
    // check above reads. `fn` receives the same `q` an absorbed nested call
    // would be handed, so composition behaves identically on both transports.
    return tenantContext.run({ tenantId, q }, () => fn(q));
  }

  const client = await getPool().connect();
  // See guardAgainstConnectionError above: a client held across a whole
  // request (which is exactly what withTenant does) has no error listener at
  // all once checked out of the pool — without this, a connection killed
  // underneath a held tenant transaction (Cloud SQL maintenance, a proxy
  // restart, a network blip) crashes the entire process, taking every
  // tenant's in-flight request down with it, not just this one.
  const guard = guardAgainstConnectionError(client);
  let failure: unknown;
  try {
    const work = (async () => {
      await run(client, "BEGIN", []);
      await run(client, "SELECT set_config('nompany.tenant_id', $1, true)", [tenantId]);
      // No assertNotTenantScoped in this closure: this IS the mechanism the
      // guard exists to require callers to go through.
      const q: PgQueryFn = (text, params = []) => run(client, text, params);
      const out = await tenantContext.run({ tenantId, q }, () => fn(q));
      await run(client, "COMMIT", []);
      return out;
    })();
    // If the connection dies while `work` is between queries — the exact
    // window the reviewer's repro hit — `work` is left suspended on a socket
    // that will never answer and may reject on its own well after
    // `guard.errored` has already won the race. A no-op catch here keeps
    // that eventual rejection from surfacing as an unhandled promise
    // rejection once nothing is awaiting `work` directly any more.
    work.catch(() => {});
    return await Promise.race([work, guard.errored]);
  } catch (e) {
    failure = e;
    // A connection that already emitted 'error' is in unknown state and
    // cannot be trusted to run ROLLBACK — release(err) below destroys it
    // either way, so attempting one would only add a second, misleading
    // failure to the log for a connection already being torn down.
    if (!guard.hadError()) {
      await run(client, "ROLLBACK", []).catch(() => {});
    }
    throw e;
  } finally {
    guard.detach();
    // release(err) on any error path — see the identical comment in pgTx.
    // This is the exact path Critical 1's leak was reached through: a
    // query_timeout (or any other mid-transaction failure) must destroy this
    // connection rather than hand it back to the pool still carrying
    // nompany.tenant_id LOCAL-set for whichever tenant runs the next query.
    client.release(failure as Error | undefined);
  }
}
