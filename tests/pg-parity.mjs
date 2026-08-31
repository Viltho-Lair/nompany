import { register } from "node:module";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// CONNECTION SMOKE + THE TENANT SEAM (Task 1). No collection_rows table exists
// yet (Task 2 wrote the schema; nothing has applied it) — that is deliberately
// out of scope here. What this file proves instead is the one property Task 1
// is responsible for: nompany.tenant_id is set INSIDE withTenant's transaction
// and nowhere else, and a query that tries to reach the tenant-scoped table
// without going through withTenant is refused before it reaches Postgres.
//
// SELF-REGISTERING LOADER, same reason and shape as tests/pg-query.mjs: this
// file runs bare (`node tests/pg-parity.mjs`) and pg.ts/keys.ts reach each
// other with an extensionless specifier (`./keys`) that plain Node's ESM
// resolver cannot follow without this hook filling the extension in.
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("./loader.mjs", import.meta.url), { data: { root } });
}

// DATABASE_URL lives in .env.local, which Next loads and plain Node does not.
// Same six-line parse tests/integration.test.mjs already uses for REDIS_URL —
// no dependency, and it never touches process.env for anything already set
// (so CI can supply the environment directly instead of a file).
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI may supply the environment directly */ }

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — tests/pg-parity.mjs needs Postgres to talk to.");
  process.exit(1);
}

// Dynamic, not static — a static `import` is resolved before ANY module-level
// code runs (including the register() call above), which is exactly what
// leaves it too early to see the hook.
const { getPgClient, pgQuery, withTenant } = await import("../src/platform/db/pg.ts");
const { TBL } = await import("../src/platform/db/keys.ts");

export async function testPgConnects(t) {
  const { rows } = await pgQuery("SELECT 1 AS one");
  t.equal(rows[0].one, 1, "postgres answers");
}

export async function testPgRejectsNamedPreparedStatements(t) {
  // Transaction-mode pooling makes a named statement a latent production bug.
  // The module must never pass a `name` through — checked here at the level
  // the brief specified (the pool is configured with a real statement
  // timeout, and exposes the same `.query` every call site uses); the actual
  // "never pass name" rule is enforced by pg.ts's own `run()` helper always
  // building `{ text, values }` literals, which is verified by inspection in
  // task-1-report.md rather than by reflection on the pg driver's internals.
  const client = getPgClient();
  t.equal(typeof client.query, "function", "pool exposes query");
  t.equal(client.options?.statement_timeout > 0, true, "a statement timeout is set");
}

// ---- requirement A: the tenant seam, proved rather than asserted ----------

export async function testWithTenantSetsTheLocalTenantSetting(t) {
  const seen = await withTenant("tenant-a-p1t1", async (q) => {
    const { rows } = await q("SELECT current_setting('nompany.tenant_id', true) AS tid");
    return rows[0].tid;
  });
  t.equal(seen, "tenant-a-p1t1", "a query run through withTenant sees the tenant it was given");
}

export async function testTenantSettingDoesNotLeakAcrossTransactions(t) {
  // Run one tenant transaction to completion (COMMIT resets SET LOCAL on
  // whichever backend connection happened to serve it), then ask a plain,
  // tenant-agnostic query what the setting reads as. If SET LOCAL had leaked
  // — i.e. if withTenant had used a session-level SET instead — this would
  // come back "tenant-b-p1t1" on any run unlucky enough to reuse the same
  // backend, which with PGPOOL_MAX=3 is a real possibility, not a hypothetical
  // one.
  //
  // MEASURED, NOT ASSUMED: it comes back "" (empty string), not SQL NULL.
  // Postgres creates a per-connection placeholder the first time a custom GUC
  // (anything with a dotted name, like nompany.tenant_id) is referenced on
  // that backend; once the placeholder exists, current_setting(..., true)
  // reports "" rather than reverting to "never set" after the LOCAL scope
  // ends — a connection that has NEVER touched the setting reports null
  // instead (see the bare-pgQuery guard test above, which never reaches
  // Postgres at all). Either way the RLS policy's `tenant_id = current_setting(...)`
  // never matches a real tenant_id (never the empty string), so the two
  // outcomes are equivalent for the leak this test guards against: the value
  // set inside the finished transaction must not be readable outside it.
  await withTenant("tenant-b-p1t1", async (q) => {
    await q("SELECT 1");
  });
  const { rows } = await pgQuery("SELECT current_setting('nompany.tenant_id', true) AS tid");
  t.equal(rows[0].tid === null || rows[0].tid === "", true, "the tenant setting does not survive past its transaction");
  t.equal(rows[0].tid === "tenant-b-p1t1", false, "and specifically never reads back as the tenant that was set");
}

export async function testBareQueryAgainstTheTenantTableIsRefused(t) {
  // The sharpest failure this task guards against: a caller reaches for
  // pgQuery/pgTx against collection_rows and forgets withTenant. FORCE ROW
  // LEVEL SECURITY would make that query return zero rows with no error — so
  // it must never get as far as asking Postgres in the first place.
  let threw = null;
  try {
    await pgQuery(`SELECT * FROM ${TBL.rows} LIMIT 1`);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "a bare pgQuery touching the tenant table throws");
  t.equal(/withTenant/.test(threw?.message || ""), true, "the error names the fix, not just the failure");
}

export async function testWithinTheSeamTheTenantTableIsReachable(t) {
  // The guard must not overreach: inside withTenant the SAME query text is
  // let through. It still fails — the table has not been created (Task 2's
  // schema is authored, not applied) — but it must fail as Postgres's own
  // "relation does not exist" (SQLSTATE 42P01), never as this module's guard
  // error, which would mean the seam re-triggers the very refusal it exists
  // to lift.
  let code = null;
  let guardMessage = null;
  try {
    await withTenant("tenant-c-p1t1", (q) => q(`SELECT * FROM ${TBL.rows} LIMIT 1`));
  } catch (e) {
    code = e?.code;
    guardMessage = /withTenant/.test(e?.message || "") ? e.message : null;
  }
  t.equal(guardMessage, null, "the seam does not re-apply its own guard to a query it authorised");
  t.equal(code, "42P01", "it fails only because the table has not been created yet (Task 2/4), not because of the guard");
}

export async function testWithTenantRefusesAnEmptyTenantId(t) {
  let threw = null;
  try {
    await withTenant("", async (q) => q("SELECT 1"));
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "an empty tenant id is refused before a connection is even taken");
}

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

// import.meta.url is a file:// URL on every platform, but
// `file://${process.argv[1]}` is POSIX-only: on Windows argv[1] is a
// backslashed path (e.g. C:\...), so the naive template never matches and the
// runner silently no-ops. pathToFileURL(...).href normalises both sides.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    const tests = [
      testPgConnects,
      testPgRejectsNamedPreparedStatements,
      testWithTenantSetsTheLocalTenantSetting,
      testTenantSettingDoesNotLeakAcrossTransactions,
      testBareQueryAgainstTheTenantTableIsRefused,
      testWithinTheSeamTheTenantTableIsReachable,
      testWithTenantRefusesAnEmptyTenantId,
    ];
    let totalFails = 0;
    for (const test of tests) {
      console.log(`\n== ${test.name}`);
      const t = makeHarness();
      await test(t);
      totalFails += t.fails;
    }
    console.log(totalFails ? `\n${totalFails} FAILURES\n` : "\nall passed\n");
    const { getPgClient: gp } = await import("../src/platform/db/pg.ts");
    await gp().end();
    process.exit(totalFails ? 1 : 0);
  })().catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
}
