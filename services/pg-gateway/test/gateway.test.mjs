// NO DATABASE ANYWHERE IN THIS FILE, and that is the point rather than a
// limitation. There is no IAM database user yet and no VPC path from a
// developer's machine to 10.90.208.3, so the only honest way to have this
// service tested at all is to make the parts that decide things independent of
// the part that connects: parseTxRequest and guardBatch are pure, runBatch
// takes any object with a `query` method, and createHandler takes the
// transaction function as a parameter. The same shape tests/pg-query.mjs uses
// to prove the query builder before a Cloud SQL instance exists.
//
// WHAT THIS FILE CANNOT PROVE is written down rather than implied: that the
// connector authenticates, that RLS confines a real statement, that a real
// COMMIT commits. Those need a deployed instance and are plan Tasks 5 and 6.
//
// One assertion per rule that would be a real defect if it broke — the house
// rule from CLAUDE.md — and each block names what it is guarding.
import { register } from "node:module";

const root = new URL("../../../", import.meta.url).href;
register(new URL("../../../tests/loader.mjs", import.meta.url), { data: { root } });

const { parseTxRequest, MAX_STATEMENTS } = await import("../src/request.ts");
const { guardBatch, guardStatement } = await import("../src/guard.ts");
const { runBatch, SET_TENANT_SQL } = await import("../src/tx.ts");
const { createGatewayServer, MAX_BODY_BYTES } = await import("../src/server.ts");
const { readConfig } = await import("../src/config.ts");

// ---- a client that records instead of connecting ---------------------------

function recordingClient(behaviour = {}) {
  const calls = [];
  return {
    calls,
    async query(config) {
      calls.push(config);
      const fail = behaviour.failOn;
      if (fail && fail(config)) throw new Error(`boom on: ${config.text}`);
      return { rows: [{ ok: config.text }], rowCount: 1 };
    },
  };
}

function threw(fn) {
  try {
    const out = fn();
    if (out && typeof out.then === "function") return out.then(() => null, (e) => e);
    return null;
  } catch (e) {
    return e;
  }
}

// ---- the request shape -----------------------------------------------------

export async function testAMistypedTenantIdIsRefusedRatherThanIgnored(t) {
  // THE FAILURE THIS RULE EXISTS FOR: a lenient reader would take
  // { tenantid, statements } as a batch with NO tenant set, and under FORCE
  // ROW LEVEL SECURITY that returns zero rows instead of erroring — the
  // silent-empty failure the whole tenant guard exists to prevent, arriving
  // through a spelling mistake.
  const e = threw(() => parseTxRequest({ tenantid: "st_1", statements: [{ text: "SELECT 1" }] }));
  t.equal(e instanceof Error, true, "an unknown top-level key is refused");
  t.equal(/unknown key "tenantid"/.test(e?.message || ""), true, "and named, so the typo is visible");
}

export async function testAStatementMayNotCarryAName(t) {
  // pg.ts's module header: never pass `name`. A named query is a PREPARED
  // statement, which lives in a SESSION, and transaction-mode pooling hands
  // the next statement a different backend. Refusing unknown per-statement
  // keys means that field cannot cross the network at all.
  const e = threw(() => parseTxRequest({ statements: [{ text: "SELECT 1", name: "s1" }] }));
  t.equal(/unknown key "name"/.test(e?.message || ""), true, "a named query cannot be requested remotely");
}

export async function testAnEmptyTenantIdIsRefused(t) {
  // Same rule withTenant states in pg.ts: an empty tenant id makes
  // current_setting read as SQL NULL, which matches no row and returns empty
  // rather than failing.
  const e = threw(() => parseTxRequest({ tenantId: "", statements: [{ text: "SELECT 1" }] }));
  t.equal(/non-empty string/.test(e?.message || ""), true, "an empty tenantId is refused before a connection is taken");
}

export async function testAnEmptyBatchIsRefused(t) {
  const e = threw(() => parseTxRequest({ statements: [] }));
  t.equal(/non-empty array/.test(e?.message || ""), true, "an empty batch is refused");
}

export async function testABatchIsBounded(t) {
  // One call is one transaction holding one pooled connection; an unbounded
  // batch is a way to hold one for as long as the caller likes.
  const statements = Array.from({ length: MAX_STATEMENTS + 1 }, () => ({ text: "SELECT 1" }));
  const e = threw(() => parseTxRequest({ statements }));
  t.equal(/at most/.test(e?.message || ""), true, `more than ${MAX_STATEMENTS} statements is refused`);
}

export async function testValuesSurviveParsingUntouched(t) {
  const req = parseTxRequest({ statements: [{ text: "INSERT INTO t VALUES ($1)", values: ["a'; DROP TABLE x --"] }] });
  t.equal(req.statements[0].values[0], "a'; DROP TABLE x --",
    "a value that looks like SQL is carried through as data, unescaped and unaltered");
}

// ---- the guards, re-asserted server-side -----------------------------------

export async function testATenantlessStatementNamingTheTenantTableIsRefused(t) {
  // assertNotTenantScoped, running on THIS side of the network. The caller-side
  // copy in pg.ts is not reachable by a caller that is not pg.ts.
  const e = threw(() => guardBatch({ statements: [{ text: "SELECT * FROM collection_rows" }] }));
  t.equal(/FORCE ROW LEVEL SECURITY/.test(e?.message || ""), true,
    "a batch with no tenantId may not name the tenant table");
}

export async function testTheSameStatementIsAllowedInsideATenantScope(t) {
  // The positive half: naming the tenant table is the entire point of a tenant
  // scope. A guard that refused this would be refusing the mechanism.
  const e = threw(() => guardBatch({ tenantId: "st_1", statements: [{ text: "SELECT * FROM collection_rows" }] }));
  t.equal(e, null, "with a tenantId the same statement is allowed — set_config plus RLS is the mechanism");
}

export async function testDropTableIsRefusedUnconditionally(t) {
  // Invariant 17, unconditional here as it is in pg.ts.
  const e = threw(() => guardBatch({ statements: [{ text: "DROP TABLE IF EXISTS collection_rows" }] }));
  t.equal(/invariant 17/.test(e?.message || ""), true, "DROP TABLE is refused even guarded by IF EXISTS");
}

export async function testTruncateIsRefusedInsideATenantScopeToo(t) {
  // The dangerous shapes are named BEFORE the schema-in-a-tenant-batch
  // refusal, so the message points at invariant 17 rather than at a generic
  // routing complaint — which is what a reader of the log needs.
  const e = threw(() => guardBatch({ tenantId: "st_1", statements: [{ text: "TRUNCATE collection_rows" }] }));
  t.equal(/invariant 17/.test(e?.message || ""), true, "TRUNCATE is invariant 17 whether or not a tenant was given");
}

export async function testDisablingRowLevelSecurityIsRefused(t) {
  const e = threw(() => guardBatch({ statements: [{ text: "ALTER TABLE collection_rows DISABLE ROW LEVEL SECURITY" }] }));
  t.equal(/invariant 17/.test(e?.message || ""), true, "the statement that would silently un-separate every tenant is refused");
}

export async function testASecondStatementSmuggledIntoOneTextIsRefused(t) {
  // THE HOLE THAT IS SPECIFIC TO THIS SERVICE. `pg` uses the extended
  // (bind-parameter) protocol only when a query carries values; with none it
  // uses the SIMPLE protocol, which runs a semicolon-separated batch in one
  // message. Classifying the leading keyword alone would let the second
  // statement through unseen.
  const e = threw(() => guardBatch({
    tenantId: "st_1",
    statements: [{ text: "SELECT 1; DROP TABLE collection_rows" }],
  }));
  t.equal(e instanceof Error, true, "two statements in one text are refused");
  t.equal(/exactly one SQL statement/.test(e?.message || ""), true, "and refused for being two, not for looking odd");
}

export async function testASemicolonInsideAStringLiteralIsNotASecondStatement(t) {
  // The other half of the same rule: the splitter is string- and
  // comment-aware, so a legitimate value containing a semicolon is not
  // mistaken for a batch. A guard that refused this would break real writes.
  const e = threw(() => guardBatch({
    tenantId: "st_1",
    statements: [{ text: "UPDATE collection_rows SET payload = 'a;b' WHERE id = $1", values: ["r1"] }],
  }));
  t.equal(e, null, "a semicolon inside a quoted string is ordinary text");
}

export async function testAnUnterminatedQuoteIsRefusedRatherThanGuessed(t) {
  const e = threw(() => guardStatement("SELECT 'unclosed", "st_1"));
  t.equal(/unterminated/.test(e?.message || ""), true,
    "text the tokenizer cannot walk is refused, not partly inspected");
}

export async function testARealSchemaStatementIsAllowedWithoutATenant(t) {
  // The DDL door still opens for exactly the shapes pgSchema.sql uses —
  // otherwise the gateway could never carry a migration.
  const e = threw(() => guardBatch({ statements: [{ text: "ALTER TABLE collection_rows ENABLE ROW LEVEL SECURITY" }] }));
  t.equal(e, null, "an allowed DDL shape passes");
}

export async function testASchemaStatementInATenantBatchIsRefused(t) {
  // pgSchemaQuery is deliberately not tenant-scoped in pg.ts. Mixing the two
  // doors in one batch is a caller confusing them.
  const e = threw(() => guardBatch({
    tenantId: "st_1",
    statements: [{ text: "ALTER TABLE collection_rows ENABLE ROW LEVEL SECURITY" }],
  }));
  t.equal(/no tenant/.test(e?.message || ""), true, "a schema statement has no tenant and is refused inside one");
}

// ---- the transaction -------------------------------------------------------

export async function testABatchIsBeginSetConfigStatementsCommit(t) {
  const client = recordingClient();
  await runBatch(client, { tenantId: "st_1", statements: [{ text: "SELECT 1" }, { text: "SELECT 2" }] });
  t.equal(client.calls.map((c) => c.text).join(" | "),
    `BEGIN | ${SET_TENANT_SQL} | SELECT 1 | SELECT 2 | COMMIT`,
    "one call is one transaction, statements in the order given");
}

export async function testTheTenantIsSetLocalAndParameterised(t) {
  // SET LOCAL (is_local = true), never SET: under transaction-mode pooling the
  // backend goes to a different tenant's next statement the moment this
  // transaction ends. And parameterised, because this value arrives from
  // across a network.
  const client = recordingClient();
  await runBatch(client, { tenantId: "st_1", statements: [{ text: "SELECT 1" }] });
  const setCall = client.calls[1];
  t.equal(/set_config\('nompany\.tenant_id', \$1, true\)/.test(setCall.text), true,
    "the tenant is set with set_config(..., true) — SET LOCAL, scoped to the transaction");
  t.equal(setCall.values[0], "st_1", "and the id is a bind parameter, never in the SQL text");
  t.equal(/st_1/.test(setCall.text), false, "the tenant id does not appear in the statement text at all");
}

export async function testNoTenantMeansNoSetConfig(t) {
  const client = recordingClient();
  await runBatch(client, { statements: [{ text: "SELECT 1" }] });
  t.equal(client.calls.map((c) => c.text).join(" | "), "BEGIN | SELECT 1 | COMMIT",
    "a tenantless batch opens no tenant scope");
}

export async function testValuesAreBoundNeverInterpolated(t) {
  // THE REASON THIS SERVICE EXISTS instead of the Cloud SQL Data API, which
  // has no bind parameters at all (design, 31/08/2026). If this ever fails,
  // tenant-authored JSON is being concatenated into SQL text.
  const client = recordingClient();
  const evil = "'); DROP TABLE collection_rows; --";
  await runBatch(client, {
    tenantId: "st_1",
    statements: [{ text: "INSERT INTO collection_rows (payload) VALUES ($1::json)", values: [evil] }],
  });
  const insert = client.calls[2];
  t.equal(insert.values[0], evil, "the value reaches pg as a parameter");
  t.equal(insert.text.includes(evil), false, "and never appears in the statement text");
}

export async function testAFailedStatementRollsBack(t) {
  const client = recordingClient({ failOn: (c) => c.text === "SELECT 2" });
  const e = await threw(() => runBatch(client, { statements: [{ text: "SELECT 1" }, { text: "SELECT 2" }] }));
  t.equal(e instanceof Error, true, "the failure reaches the caller");
  t.equal(client.calls.map((c) => c.text).join(" | "), "BEGIN | SELECT 1 | SELECT 2 | ROLLBACK",
    "and the transaction is rolled back, never committed");
}

export async function testADeadConnectionIsNotAskedToRollBack(t) {
  // A connection that already emitted 'error' cannot run another query;
  // attempting ROLLBACK on it only adds a second, misleading failure for a
  // connection withClient is about to destroy anyway.
  const client = recordingClient({ failOn: (c) => c.text === "SELECT 1" });
  await threw(() => runBatch(client, { statements: [{ text: "SELECT 1" }] }, () => true));
  t.equal(client.calls.some((c) => c.text === "ROLLBACK"), false,
    "no ROLLBACK is attempted on a connection already known to be dead");
}

export async function testRunBatchGuardsEvenWhenReachedDirectly(t) {
  // The HTTP handler guards before taking a connection; this call is what makes
  // an unguarded batch impossible by any other route into runBatch.
  const client = recordingClient();
  const e = await threw(() => runBatch(client, { statements: [{ text: "SELECT * FROM collection_rows" }] }));
  t.equal(e instanceof Error, true, "the guard runs inside runBatch too");
  t.equal(client.calls.length, 0, "and refuses before BEGIN — Postgres was never asked");
}

// ---- the HTTP surface ------------------------------------------------------

async function withServer(runTx, fn) {
  const server = createGatewayServer(runTx);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

export async function testHealthzTouchesNoDatabase(t) {
  let called = false;
  await withServer(async () => { called = true; return []; }, async (base) => {
    const res = await fetch(`${base}/healthz`);
    t.equal(res.status, 200, "healthz answers 200");
    t.equal(called, false, "without opening a database connection — a liveness probe that did would turn a blip into a restart loop");
  });
}

export async function testTxReturnsResultsInOrder(t) {
  await withServer(async (req) => req.statements.map((s, i) => ({ rows: [{ n: i }], rowCount: 1 })), async (base) => {
    const res = await fetch(`${base}/tx`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "st_1", statements: [{ text: "SELECT 1" }, { text: "SELECT 2" }] }),
    });
    const body = await res.json();
    t.equal(res.status, 200, "a well-formed batch answers 200");
    t.equal(JSON.stringify(body), JSON.stringify({ results: [{ rows: [{ n: 0 }], rowCount: 1 }, { rows: [{ n: 1 }], rowCount: 1 }] }),
      "the response is { results: [...] }, one per statement, in order");
  });
}

export async function testARefusedBatchNeverReachesTheDatabase(t) {
  let called = false;
  await withServer(async () => { called = true; return []; }, async (base) => {
    const res = await fetch(`${base}/tx`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statements: [{ text: "DROP TABLE collection_rows" }] }),
    });
    const body = await res.json();
    t.equal(res.status, 400, "a refusal is a 400 — retrying will never help");
    t.equal(/invariant 17/.test(body.error || ""), true, "and says which door refused it and why");
    t.equal(called, false, "no connection was taken to find that out");
  });
}

export async function testMalformedJsonIsARefusalNotACrash(t) {
  await withServer(async () => [], async (base) => {
    const res = await fetch(`${base}/tx`, { method: "POST", headers: { "content-type": "application/json" }, body: "{ not json" });
    t.equal(res.status, 400, "an unparseable body is refused, not thrown as a 500");
  });
}

export async function testOnlyPostTxAndGetHealthzExist(t) {
  await withServer(async () => [], async (base) => {
    const notFound = await fetch(`${base}/anything`);
    t.equal(notFound.status, 404, "there is no other route");
    const wrongMethod = await fetch(`${base}/tx`);
    t.equal(wrongMethod.status, 405, "/tx is POST only");
  });
}

export async function testAnOversizedBodyIsRefusedAsItArrives(t) {
  await withServer(async () => [], async (base) => {
    // An unbounded body on a service that holds a database connection per call
    // is a way to occupy one for as long as the caller can keep typing.
    const huge = "x".repeat(MAX_BODY_BYTES + 1024);
    const res = await fetch(`${base}/tx`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statements: [{ text: `SELECT '${huge}'` }] }),
    });
    t.equal(res.status, 413, "a body over the ceiling is refused");
  });
}

// ---- configuration ---------------------------------------------------------

export async function testAPasswordInTheEnvironmentRefusesToStart(t) {
  // The gateway authenticates as an IAM service-account database user and no
  // password exists anywhere (decided 01/09/2026). A password-shaped variable
  // is evidence the IAM path is not the one in use, and boot is the only
  // moment anyone will look.
  const base = { PG_GATEWAY_INSTANCE: "p:r:i", PG_GATEWAY_DB_USER: "u", PG_GATEWAY_DB_NAME: "d" };
  t.equal(threw(() => readConfig(base)), null, "the IAM-only environment is accepted");
  const e = threw(() => readConfig({ ...base, PGPASSWORD: "hunter2" }));
  t.equal(/no database password at all/.test(e?.message || ""), true, "PGPASSWORD refuses the boot");
}

export async function testAMissingInstanceRefusesToStart(t) {
  const e = threw(() => readConfig({ PG_GATEWAY_DB_USER: "u", PG_GATEWAY_DB_NAME: "d" }));
  t.equal(/PG_GATEWAY_INSTANCE is not set/.test(e?.message || ""), true,
    "nothing is hardcoded, so a missing address is a refusal rather than a default");
}

export async function testTheQueryTimeoutMustExceedTheStatementTimeout(t) {
  // Not a style choice — pg.ts's getPool carries the account. If the CLIENT
  // timer can win, a transaction is abandoned with its tenant setting still
  // LOCAL-set on a live backend.
  const { assertTimeoutsOrdered } = await import("../src/config.ts");
  const cfg = readConfig({
    PG_GATEWAY_INSTANCE: "p:r:i", PG_GATEWAY_DB_USER: "u", PG_GATEWAY_DB_NAME: "d",
    PG_GATEWAY_STATEMENT_TIMEOUT_MS: "20000", PG_GATEWAY_QUERY_TIMEOUT_MS: "20000",
  });
  const e = threw(() => assertTimeoutsOrdered(cfg));
  t.equal(/strictly greater/.test(e?.message || ""), true, "equal timeouts are refused, not tidied");
}

// ---- the runner ------------------------------------------------------------
//
// Same harness shape as tests/pg-query.mjs: every assertion is reported, one
// bad assertion does not hide the rest, and the process exits non-zero on any
// failure.
function makeHarness() {
  let fails = 0;
  return {
    equal(actual, expected, message = "") {
      const cond = actual === expected;
      if (!cond) fails += 1;
      console.log(
        `${cond ? "  ok  " : " FAIL "} ${message}` +
        (cond ? "" : `  — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`),
      );
    },
    get fails() { return fails; },
  };
}

const TESTS = [
  testAMistypedTenantIdIsRefusedRatherThanIgnored,
  testAStatementMayNotCarryAName,
  testAnEmptyTenantIdIsRefused,
  testAnEmptyBatchIsRefused,
  testABatchIsBounded,
  testValuesSurviveParsingUntouched,
  testATenantlessStatementNamingTheTenantTableIsRefused,
  testTheSameStatementIsAllowedInsideATenantScope,
  testDropTableIsRefusedUnconditionally,
  testTruncateIsRefusedInsideATenantScopeToo,
  testDisablingRowLevelSecurityIsRefused,
  testASecondStatementSmuggledIntoOneTextIsRefused,
  testASemicolonInsideAStringLiteralIsNotASecondStatement,
  testAnUnterminatedQuoteIsRefusedRatherThanGuessed,
  testARealSchemaStatementIsAllowedWithoutATenant,
  testASchemaStatementInATenantBatchIsRefused,
  testABatchIsBeginSetConfigStatementsCommit,
  testTheTenantIsSetLocalAndParameterised,
  testNoTenantMeansNoSetConfig,
  testValuesAreBoundNeverInterpolated,
  testAFailedStatementRollsBack,
  testADeadConnectionIsNotAskedToRollBack,
  testRunBatchGuardsEvenWhenReachedDirectly,
  testHealthzTouchesNoDatabase,
  testTxReturnsResultsInOrder,
  testARefusedBatchNeverReachesTheDatabase,
  testMalformedJsonIsARefusalNotACrash,
  testOnlyPostTxAndGetHealthzExist,
  testAnOversizedBodyIsRefusedAsItArrives,
  testAPasswordInTheEnvironmentRefusesToStart,
  testAMissingInstanceRefusesToStart,
  testTheQueryTimeoutMustExceedTheStatementTimeout,
];

let totalFails = 0;
for (const test of TESTS) {
  console.log(`\n== ${test.name}`);
  const t = makeHarness();
  await test(t);
  totalFails += t.fails;
}
console.log(totalFails ? `\n${totalFails} FAILURES\n` : `\nall passed (${TESTS.length} blocks)\n`);
// `process.exitCode`, NOT `process.exit()`. The HTTP blocks above close a
// listening socket immediately before this line, and calling process.exit()
// while libuv is still tearing that handle down aborts the process on Windows
// with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` — measured,
// and it prints AFTER "all passed", so it reads as a mystery crash in a green
// run. Setting the code and letting the event loop drain leaves nothing to
// race.
process.exitCode = totalFails ? 1 : 0;
