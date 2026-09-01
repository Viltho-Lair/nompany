// DO THE TWO TRANSPORTS AGREE? (plan Task 5)
//
// The plan for this task says it needs a deployed gateway. It does not, and
// that is the interesting part: the seams put in by Tasks 1–4 already allow a
// COMPLETE end-to-end run on one machine.
//
//   services/pg-gateway/src/server.ts  createGatewayServer(runTx) — the runner is a parameter
//   services/pg-gateway/src/tx.ts      runBatch(client, req) / withClient(pool, fn) — the client is a parameter
//   src/platform/db/pgGatewayAuth.ts   GCP_STS_URL / GCP_IAM_CREDENTIALS_URL are read from the environment
//
// So this file starts the REAL gateway server in-process, wired to a REAL
// `pg.Pool` against DATABASE_URL — locally the Cloud SQL Auth Proxy on
// 127.0.0.1:5433, connecting as `viltho` (rolsuper=false, rolbypassrls=false),
// in CI the `postgres:18` container as `ci_app` (same shape, asserted by the
// workflow) — and points a child process's client at it over loopback HTTP.
//
// WHAT IS THEREFORE PROVEN HERE: client → real HTTP → real server → real
// Postgres → real RLS → back, for every operation in pgRows.ts, compared
// against the `direct` transport running the identical code.
//
// WHAT IS STILL NOT PROVEN, and no line in this file should be read as
// implying otherwise: Google STS, Workload Identity Federation, the
// impersonation binding, Cloud Run's IAM check, Direct VPC egress, the Cloud
// SQL connector's IAM handshake, and the container image. Those need cloud
// resources that do not exist (plan Task 6). The token this run carries is
// minted by a two-route stub on loopback and is meaningless outside it.
//
// COMPARED AS `JSON.stringify` TEXT, NEVER DEEP-EQUAL. That is deliberate and
// it is the rule tests/pg-parity.mjs already follows: `payload` is `json` and
// not `jsonb` precisely so key order survives a round trip, and the goldens pin
// that order — a deep-equal would not notice it changing. Text would.
//
// NO AUTHENTICATION BYPASS EXISTS FOR THIS TEST. Nothing in
// src/platform/db/pgGatewayAuth.ts, pgGateway.ts or the service was edited to
// make it run: a convenient test hook reachable in production is the hole this
// codebase refuses. The stub stands in for Google at addresses the auth config
// already reads from the environment; the service itself has never
// authenticated its caller (Cloud Run's IAM does that, plan Task 4/6), which is
// why the parent can also probe it directly.
//
// WHAT THIS RUN WRITES, AND HOW IT IS SWEPT. Only Postgres, and only rows under
// four synthetic tenant ids this file names itself. Every write passes
// `announce: false`, so `emit` and `bumpMainAgg` never fire and NO REDIS
// CONNECTION IS OPENED BY EITHER PROCESS — there is no Redis namespace to
// sweep. The Postgres sweep is `sweepPgTenants` with the explicit id list
// (invariant 17: delete by an explicit key list, never a predicate), in a
// `finally`, and it is the only deletion this file performs.
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
}

// THIS PROCESS IS THE `direct` HALF, and pg.ts captures PG_TRANSPORT at module
// scope — so the value has to be gone before the first dynamic import below,
// not merely unset by convention. Deleting it here means running this file with
// PG_TRANSPORT=gateway already exported (a shell left over from another task)
// still compares direct against gateway rather than gateway against itself.
delete process.env.PG_TRANSPORT;

// DATABASE_URL lives in .env.local, which Next loads and plain Node does not —
// the same six-line parse tests/pg-parity.mjs and tests/integration.test.mjs
// use, and it never overwrites anything already in the environment so CI can
// supply it directly.
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI supplies the environment directly */ }

// SKIPS LOUDLY, NEVER SILENTLY, AND NEVER BY DYING MID-RUN. Same decision
// tests/pg-parity.mjs records: a developer with no local Postgres gets a banner
// and a per-test "skipped" line, so the number of unverified paths is visible
// in the output rather than inferred from its absence. CI always sets
// DATABASE_URL, so there a missing one is an infrastructure failure that
// surfaces at the provisioning step instead.
const HAS_DATABASE_URL = Boolean(process.env.DATABASE_URL);
if (!HAS_DATABASE_URL) {
  console.warn(
    "\n" + "=".repeat(78) +
    "\nDATABASE_URL is not set — SKIPPING the whole direct-vs-gateway parity run." +
    "\nNo gateway server is started, no statement crosses the transport, and NEITHER" +
    "\ntransport is verified this run. CI always sets DATABASE_URL; locally, set it" +
    "\nin .env.local (see CLAUDE.md's Postgres section) to cover these paths." +
    "\n" + "=".repeat(78) + "\n",
  );
}

const SESSION = process.env.NOMPANY_TEST_SESSION || "t5parity";
const FIXTURE = {
  tenant: `st_${SESSION}_tp`,
  otherTenant: `st_${SESSION}_tp_other`,
  section: `sec_${SESSION}_tp`,
  col: "widgets",
  batchCol: "batchwidgets",
};
const RLS = {
  tenantA: `st_${SESSION}_tp_rls_a`,
  tenantB: `st_${SESSION}_tp_rls_b`,
  section: `sec_${SESSION}_tp_rls`,
  collection: "rlsprobe",
};
const SWEPT_TENANTS = [FIXTURE.tenant, FIXTURE.otherTenant, RLS.tenantA, RLS.tenantB];

// A structurally real, cryptographically meaningless JWT — nothing in this run
// verifies a signature, and the stub that hands it back is not Google.
const b64url = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
const fakeJwt = (claims) => `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url(claims)}.c2lnbmF0dXJl`;
const SERVICE_ACCOUNT = "pg-gateway-parity@example.iam.gserviceaccount.com";
const STATIC_ID_TOKEN = fakeJwt({ aud: "http://127.0.0.1", exp: Math.floor(Date.now() / 1000) + 3600 });
const VERCEL_TOKEN = fakeJwt({
  iss: "https://oidc.vercel.com/vilthos-projects",
  aud: "https://vercel.com/vilthos-projects",
  sub: "owner:x:project:y:environment:test",
});
const PARENT_PROBE_BEARER = "Bearer parent-probe-not-a-token";

// ---- the run ----------------------------------------------------------------

async function collect() {
  const { Pool } = await import("pg");
  const { createGatewayServer } = await import("../services/pg-gateway/src/server.ts");
  const { runBatch, withClient } = await import("../services/pg-gateway/src/tx.ts");
  const { _poolForTests, pgTransport } = await import("../src/platform/db/pg.ts");
  const { pgAddRow, pgDeleteRow } = await import("../src/platform/db/pgRows.ts");
  const { TBL } = await import("../src/platform/db/keys.ts");
  const { sweepPgTenants } = await import("./pg-sweep.mjs");
  const { runOperations, asTexts } = await import("./pg-transport-ops.mjs");

  // THE POOL THE SERVICE WOULD HOLD. In production services/pg-gateway/src/pool.ts
  // builds this through the Cloud SQL connector with authType: IAM; here it is a
  // plain connection string, because the connector's IAM handshake is exactly
  // one of the things this run does NOT prove. Everything above the socket —
  // runBatch's BEGIN/set_config/statement/COMMIT, the release-with-error
  // discipline, the guards — is the service's own code, unmodified.
  //
  // `max` is 10 rather than pg.ts's 3: under the gateway every statement takes a
  // connection for its own short transaction and gives it straight back, so the
  // twenty concurrent writers in the contention block are twenty short
  // checkouts rather than twenty held ones. The timeouts mirror pg.ts's, and
  // query_timeout stays strictly greater than statement_timeout for the reason
  // stated there.
  const servicePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    query_timeout: 20_000,
  });
  servicePool.on("error", (err) => console.error("[parity gateway pool] idle client error", err.message));

  const server = createGatewayServer((req) =>
    withClient(servicePool, (client, connectionIsDead) => runBatch(client, req, connectionIsDead)));

  // A SECOND 'request' LISTENER, NOT A WRAPPER. node:http emits 'request' to
  // every listener, so this observes exactly what the server was handed without
  // standing between the socket and the handler — which is the only way the
  // Authorization header the CLIENT actually put on the wire can be read back
  // rather than assumed.
  const seen = [];
  server.on("request", (req) => {
    if ((req.url || "").split("?")[0] === "/tx") seen.push(req.headers.authorization ?? null);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const gatewayUrl = `http://127.0.0.1:${server.address().port}`;

  const post = async (body, bearer = PARENT_PROBE_BEARER) => {
    const res = await fetch(`${gatewayUrl}/tx`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: bearer },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* Cloud Run's own errors are HTML; keep the text */ }
    return { status: res.status, body: parsed, text };
  };

  const state = { gatewayUrl, transportInThisProcess: pgTransport() };
  try {
    // ---- the direct half, in this process ----------------------------------
    state.directTexts = asTexts(await runOperations(FIXTURE));
    const beforeChild = seen.length;

    // ---- the gateway half, in a child ---------------------------------------
    state.child = await runChild({ gatewayUrl });
    state.childTxRequests = seen.length - beforeChild;
    state.gatewayTexts = state.child.ok ? state.child.texts : null;

    // EVERY /tx REQUEST THE CHILD SENT CARRIED THE TOKEN, read off the requests
    // the server actually received rather than off the client's intent.
    const childAuth = seen.slice(beforeChild);
    state.childAuthAllStatic = childAuth.length > 0 && childAuth.every((h) => h === `Bearer ${STATIC_ID_TOKEN}`);
    state.childAuthMissing = childAuth.filter((h) => h === null).length;

    // ---- RLS, end to end, against the server itself --------------------------
    // Set up through the DIRECT transport on purpose: the fixtures for a test
    // about the gateway must not be created by the thing under test.
    await pgAddRow(RLS.tenantA, RLS.section, RLS.collection, { id: "rls-a", name: "tenant A" }, { announce: false });
    await pgAddRow(RLS.tenantB, RLS.section, RLS.collection, { id: "rls-b", name: "tenant B" }, { announce: false });

    const listBySection = {
      text: `SELECT ${TBL.cols.id} AS id FROM ${TBL.rows}
              WHERE ${TBL.cols.section} = $1 AND ${TBL.cols.collection} = $2 ORDER BY ${TBL.cols.id}`,
      values: [RLS.section, RLS.collection],
    };

    state.rlsAsTenantA = await post({ tenantId: RLS.tenantA, statements: [listBySection] });
    state.rlsAsTenantB = await post({ tenantId: RLS.tenantB, statements: [listBySection] });
    // THE SAME STATEMENT WITH NO TENANT. It must be REFUSED by the server's own
    // guard, not answered with zero rows — under FORCE ROW LEVEL SECURITY the
    // untenanted form does not error, it silently matches nothing, and "no
    // rows" is indistinguishable from "this tenant has no data".
    state.rlsWithNoTenant = await post({ statements: [listBySection] });
    // AND THE PROOF THAT IT IS THE DATABASE DOING IT, not the guard: a
    // perfectly legal statement, sent under tenant A, whose WHERE clause names
    // tenant B's id. The policy — not the query — is what makes this empty.
    state.rlsReachingAcross = await post({
      tenantId: RLS.tenantA,
      statements: [{
        text: `SELECT ${TBL.cols.id} AS id FROM ${TBL.rows} WHERE ${TBL.cols.tenant} = $1`,
        values: [RLS.tenantB],
      }],
    });
    // A WRITE claiming another tenant's id, which the policy's WITH CHECK must
    // refuse. Postgres raises it, so this is a 500 (the database path failing)
    // rather than a 400 (a decision made before Postgres was asked).
    state.rlsWriteAcross = await post({
      tenantId: RLS.tenantA,
      statements: [{
        text: `INSERT INTO ${TBL.rows} (${TBL.cols.tenant}, ${TBL.cols.section}, ${TBL.cols.collection}, ${TBL.cols.id}, ${TBL.cols.seq}, ${TBL.cols.payload})
                VALUES ($1, $2, $3, $4, nextval('${TBL.seq}'), $5::json)`,
        values: [RLS.tenantB, RLS.section, RLS.collection, "rls-smuggled", JSON.stringify({ id: "rls-smuggled" })],
      }],
    });
    // Read back through the direct transport: the smuggled row must not exist.
    state.smuggledRowSurvived = await pgDeleteRow(
      RLS.tenantB, RLS.section, RLS.collection, "rls-smuggled", { announce: false },
    );
  } finally {
    // INVARIANT 17: an explicit id list, never a predicate, and never anything
    // outside the four tenants this file named itself. sweepPgTenants is the
    // same door tests/suite.mjs and Gate A use.
    try {
      state.sweptRows = await sweepPgTenants(SWEPT_TENANTS);
    } catch (e) {
      state.sweepError = e instanceof Error ? e.message : String(e);
    }
    // closeAllConnections BESIDE close, not instead of it: `fetch`'s agent keeps
    // its sockets alive after the probes above, and `server.close()` alone waits
    // for idle keep-alive connections that nothing is going to close.
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });
    await servicePool.end().catch(() => {});
    await _poolForTests().end().catch(() => {});
  }
  return state;
}

/** Runs tests/pg-transport-gateway.mjs and reads its one sentinel line back. */
function runChild({ gatewayUrl }) {
  const argument = JSON.stringify({
    fixture: FIXTURE,
    gatewayUrl,
    staticIdToken: STATIC_ID_TOKEN,
    vercelToken: VERCEL_TOKEN,
    serviceAccount: SERVICE_ACCOUNT,
  });
  // DATABASE_URL IS REMOVED FROM THE CHILD. It is the assertion that costs
  // nothing: if any operation over there took the direct path, `getPool()`
  // throws "pg: DATABASE_URL is not set" and the child fails loudly, instead of
  // quietly comparing two direct runs to each other.
  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.PG_TRANSPORT;

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["tests/pg-transport-gateway.mjs", argument], {
      env,
      // stderr inherited so a failure over there is readable here; stdout
      // captured because the result travels on it.
      stdio: ["ignore", "pipe", "inherit"],
    });
    let out = "";
    child.stdout.on("data", (c) => { out += c; });
    child.on("error", reject);
    child.on("close", (code) => {
      const line = out.split(/\r?\n/).find((l) => l.startsWith("__PG_TRANSPORT_RESULT__ "));
      for (const l of out.split(/\r?\n/)) {
        if (l && !l.startsWith("__PG_TRANSPORT_RESULT__")) console.log(`   [gateway child] ${l}`);
      }
      if (!line) {
        resolve({ ok: false, error: `the gateway child exited ${code} without reporting a result` });
        return;
      }
      resolve(JSON.parse(line.slice("__PG_TRANSPORT_RESULT__ ".length)));
    });
  });
}

// ---- the assertions ----------------------------------------------------------

const skip = (t) => { t.equal(true, true, "skipped — DATABASE_URL not set, this test needs a live Postgres"); };

export async function testTheGatewayRunReachedPostgresAtAll(t) {
  if (!STATE) return skip(t);
  // FIRST, BECAUSE EVERY OTHER COMPARISON BELOW IS MEANINGLESS OTHERWISE. A
  // child that crashed would report no texts, and comparing nothing to nothing
  // passes.
  t.equal(STATE.transportInThisProcess, "direct", "this process is the direct half");
  t.equal(STATE.child.ok, true, `the gateway child completed${STATE.child.ok ? "" : ` — ${STATE.child.error}`}`);
  t.equal(STATE.childTxRequests > 30, true,
    `every statement the child ran crossed real HTTP (${STATE.childTxRequests} POST /tx requests reached the server)`);
}

export async function testTheChildCouldNotHaveTakenTheDirectPath(t) {
  if (!STATE) return skip(t);
  // The child is spawned with DATABASE_URL deleted, so `getPool()` throws the
  // moment anything falls back to `direct`. Its completing at all is the proof;
  // this states it rather than leaving it in a comment.
  t.equal(STATE.child.ok, true, "the child ran to completion with no DATABASE_URL in its environment");
  t.equal(STATE.childAuthMissing, 0, "no /tx request arrived without an Authorization header");
  t.equal(STATE.childAuthAllStatic, true,
    "and every one carried the injected token, read off the request the server actually received");
}

export async function testEveryOperationAgreesAsText(t) {
  if (!STATE) return skip(t);
  if (!STATE.gatewayTexts) {
    t.equal(true, false, "the gateway half produced no results, so nothing can be compared");
    return;
  }
  // ONE ASSERTION PER OPERATION, compared as `JSON.stringify` TEXT. Key order is
  // part of the contract (`payload` is `json`, not `jsonb`, and the goldens pin
  // the order), so a deep-equal would pass on a change the goldens would fail
  // on.
  const names = Object.keys(STATE.directTexts);
  t.equal(names.length, Object.keys(STATE.gatewayTexts).length, "both transports reported the same operations");
  for (const name of names) {
    t.equal(STATE.gatewayTexts[name], STATE.directTexts[name], `${name} — identical text on both transports`);
  }
}

export async function testTheOptimisticCasStillHoldsAcrossTwoRoundTrips(t) {
  if (!STATE?.gatewayTexts) return skip(t);
  // THE CASE THE TRANSPORT ACTUALLY CHANGES. Under `direct` pgUpdateRow's
  // SELECT and UPDATE share one transaction on one connection; under `gateway`
  // they are two transactions with a network hop between them. The
  // compare-and-set is optimistic — `WHERE row_version = $6` is what decides,
  // never the transaction — so twenty concurrent flips must still land exactly
  // twenty, one winner per round, no lost update.
  const gateway = JSON.parse(STATE.gatewayTexts.contention);
  const direct = JSON.parse(STATE.directTexts.contention);
  t.equal(direct.hits, 20, "direct: twenty concurrent flips land exactly twenty");
  t.equal(gateway.hits, 20, "gateway: twenty concurrent flips land exactly twenty, across two round trips each");
  t.equal(gateway.rejected, 0,
    `no attempt was rejected on the gateway transport${gateway.firstRejection ? ` — first: ${gateway.firstRejection}` : ""}`);
  t.equal(direct.rejected, 0, "and none on the direct transport either");
}

export async function testTheBatchReservationAssignsSeqIdentically(t) {
  if (!STATE?.gatewayTexts) return skip(t);
  // pgAddRows's `nextval` reservation and its INSERT are one transaction under
  // `direct` and two under `gateway`. That split is only safe because `nextval`
  // is non-transactional in Postgres, so what has to be identical is the
  // ASSIGNMENT — batch[0] takes the largest reserved value, so the batch reads
  // back newest-first as a block and arrival-ordered within itself.
  const gateway = JSON.parse(STATE.gatewayTexts.batchSeqRanks);
  const direct = JSON.parse(STATE.directTexts.batchSeqRanks);
  t.equal(JSON.stringify(direct.idsBySeqDescending), '["b1","b2","b3"]',
    "direct: the first element of the batch holds the largest seq");
  t.equal(JSON.stringify(gateway.idsBySeqDescending), '["b1","b2","b3"]',
    "gateway: the same, with the reservation and the insert in separate transactions");
  t.equal(gateway.strictlyDescending, true, "gateway: seq descends strictly across the batch");
  t.equal(direct.strictlyDescending, true, "direct: likewise");
  t.equal(STATE.gatewayTexts.readAfterAddRows, STATE.directTexts.readAfterAddRows,
    "and the collection reads back in the identical order on both");
}

// ---- RLS, proved through the server rather than around it ---------------------

export async function testAStatementWithATenantSeesOnlyThatTenantsRows(t) {
  if (!STATE) return skip(t);
  t.equal(STATE.rlsAsTenantA.status, 200, "the tenant-scoped statement is answered");
  t.equal(JSON.stringify(STATE.rlsAsTenantA.body?.results?.[0]?.rows), '[{"id":"rls-a"}]',
    "tenant A sees exactly its own row in a bucket both tenants wrote to");
  t.equal(JSON.stringify(STATE.rlsAsTenantB.body?.results?.[0]?.rows), '[{"id":"rls-b"}]',
    "and tenant B sees exactly its own, symmetrically");
}

export async function testTheSameStatementWithNoTenantIsRefusedRatherThanEmptied(t) {
  if (!STATE) return skip(t);
  // THE FAILURE THIS EXISTS FOR: with no tenant set, the policy matches nothing
  // and the query returns zero rows WITHOUT ERRORING — fail-closed but silent,
  // and indistinguishable from "this tenant has no data". The gateway must
  // refuse it before Postgres is asked, which is a 400 and not a 200 with an
  // empty array.
  t.equal(STATE.rlsWithNoTenant.status, 400, "the untenanted form is refused, not answered");
  t.equal(/FORCE ROW/.test(STATE.rlsWithNoTenant.body?.error || ""), true,
    "and refused by the shared tenant guard, naming why");
  t.equal(STATE.rlsWithNoTenant.body?.results, undefined, "no result array came back at all — nothing ran");
}

export async function testRowLevelSecurityAndNotTheWhereClauseIsWhatConfines(t) {
  if (!STATE) return skip(t);
  // A legal, tenant-scoped statement whose WHERE clause names the OTHER
  // tenant's id. The guard has nothing to say about it; the policy does.
  t.equal(STATE.rlsReachingAcross.status, 200, "the statement itself is perfectly legal and runs");
  t.equal(JSON.stringify(STATE.rlsReachingAcross.body?.results?.[0]?.rows), "[]",
    "and returns nothing — the role holds no BYPASSRLS, so the policy confines it to its own tenant");
}

export async function testAWriteClaimingAnotherTenantIsRefusedByThePolicy(t) {
  if (!STATE) return skip(t);
  t.equal(STATE.rlsWriteAcross.status, 500,
    "a WITH CHECK violation is Postgres refusing, so it is a 500 (the database path) not a 400 (a decision before it)");
  t.equal(/row-level security/i.test(STATE.rlsWriteAcross.body?.error || ""), true,
    "and the policy is what refused it");
  t.equal(STATE.smuggledRowSurvived, false, "no row was written for the tenant the caller was not scoped to");
}

// ---- housekeeping --------------------------------------------------------------

export async function testTheRunSweptWhatItWrote(t) {
  if (!STATE) return skip(t);
  t.equal(STATE.sweepError, undefined, `the Postgres sweep ran${STATE.sweepError ? ` — ${STATE.sweepError}` : ""}`);
  // The operations delete everything they create, so a clean run sweeps zero or
  // a handful of rows (the RLS probes). A LARGE number here would mean an
  // operation stopped cleaning up after itself, which is worth seeing.
  t.equal(typeof STATE.sweptRows === "number" && STATE.sweptRows <= 4, true,
    `the sweep found ${STATE.sweptRows} leftover row(s) across the four synthetic tenants`);
}

// ---- the runner ---------------------------------------------------------------

const TESTS = [
  testTheGatewayRunReachedPostgresAtAll,
  testTheChildCouldNotHaveTakenTheDirectPath,
  testEveryOperationAgreesAsText,
  testTheOptimisticCasStillHoldsAcrossTwoRoundTrips,
  testTheBatchReservationAssignsSeqIdentically,
  testAStatementWithATenantSeesOnlyThatTenantsRows,
  testTheSameStatementWithNoTenantIsRefusedRatherThanEmptied,
  testRowLevelSecurityAndNotTheWhereClauseIsWhatConfines,
  testAWriteClaimingAnotherTenantIsRefusedByThePolicy,
  testTheRunSweptWhatItWrote,
];

function makeHarness() {
  let fails = 0;
  return {
    get fails() { return fails; },
    equal(actual, expected, message) {
      const ok = actual === expected;
      if (!ok) fails += 1;
      console.log(`   ${ok ? "ok" : "FAIL"}  ${message}${ok ? "" : `  (got ${JSON.stringify(actual)}, wanted ${JSON.stringify(expected)})`}`);
    },
  };
}

// THE WHOLE RUN HAPPENS ONCE, BEFORE ANY ASSERTION. Starting a server, running
// both transports and spawning a child per test would be forty seconds of setup
// for a text comparison; the assertions read a recorded state instead. `STATE`
// is null when there is no database, which is what every test's skip line reads.
const STATE = HAS_DATABASE_URL ? await collect() : null;

let totalFails = 0;
for (const test of TESTS) {
  console.log(`\n== ${test.name}`);
  const t = makeHarness();
  await test(t);
  totalFails += t.fails;
}
console.log(totalFails ? `\n${totalFails} FAILURES\n` : `\nall passed (${TESTS.length} blocks)\n`);
// EXIT RATHER THAN FALL OFF THE END. `fetch`'s keep-alive agent holds its
// sockets for a few seconds after the last probe, which would otherwise leave
// the process idling after every assertion has already been reported.
process.exit(totalFails ? 1 : 0);
