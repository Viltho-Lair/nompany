import { register } from "node:module";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// CONNECTION SMOKE + THE TENANT SEAM (Task 1), THEN THE SCHEMA ITSELF (Task 2).
// Task 1's tests prove nompany.tenant_id is set INSIDE withTenant's
// transaction and nowhere else, and that a query which tries to reach the
// tenant-scoped table without going through withTenant is refused before it
// reaches Postgres. Task 2 applies pgSchema.sql (scripts/migrate/pg/schema.mjs)
// against the live database BEFORE this file runs, so collection_rows now
// exists — the shape/RLS-enabled assertions below and the RLS-actually-filters
// proof are what Task 2 adds; nothing here creates or drops the table itself.
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
const { _poolForTests, pgQuery, pgTx, pgSchemaQuery, withTenant } = await import("../src/platform/db/pg.ts");
const { TBL } = await import("../src/platform/db/keys.ts");
const { pgReadCol, pgAddRow, pgAddRows, pgUpdateRow, pgDeleteRow } = await import("../src/platform/db/pgRows.ts");
const { DB_BACKEND } = await import("../src/platform/db/sections.ts");

// ---- Task 5: the backend dispatcher ----------------------------------------

export async function testBackendDefaultsToRedis(t) {
  // Until cutover, an unset env must mean Redis. A migration that flips the
  // default is a migration that happened by accident.
  t.equal(DB_BACKEND, process.env.NOMPANY_DB || "redis", "backend comes from the env, Redis by default");
}

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
  const client = _poolForTests();
  t.equal(typeof client.query, "function", "pool exposes query");
  t.equal(client.options?.statement_timeout > 0, true, "a statement timeout is set");
}

export async function testQueryTimeoutOutlivesStatementTimeout(t) {
  // Fix round 1, Critical 1: the two timeouts must never be equal. If they
  // were, which one fires is a race, and the client-side query_timeout
  // winning leaves a connection alive-but-desynced (see the release-on-error
  // test below for what that costs). Pinned here as a plain number
  // comparison so a future "tidy them to match" edit fails a test instead of
  // silently reopening the race.
  const client = _poolForTests();
  t.equal(client.options.query_timeout > client.options.statement_timeout, true,
    "the client-side timeout is strictly longer, so Postgres always aborts the statement first");
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
  // let through. Task 2 has applied the schema, so the table now exists and
  // RLS filters to the given tenant — the query succeeds and returns zero
  // rows (nothing was ever written for this made-up tenant). The point is
  // that the seam does not re-trigger its own guard on a query it already
  // authorised, and that reaching the table at all no longer fails with
  // Postgres's "relation does not exist" the way it did before Task 2.
  let code = null;
  let guardMessage = null;
  let rows = null;
  try {
    const res = await withTenant("tenant-c-p1t2", (q) => q(`SELECT * FROM ${TBL.rows} LIMIT 1`));
    rows = res.rows;
  } catch (e) {
    code = e?.code;
    guardMessage = /withTenant/.test(e?.message || "") ? e.message : null;
  }
  t.equal(guardMessage, null, "the seam does not re-apply its own guard to a query it authorised");
  t.equal(code, null, "the query succeeds now that Task 2 has applied the schema");
  t.equal(Array.isArray(rows) && rows.length === 0, true, "no rows exist for a tenant nothing was ever written under");
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

// ---- Task 2: the schema, applied ------------------------------------------
//
// scripts/migrate/pg/schema.mjs has already run against this database by the
// time this file is invoked (see task-2-report.md) — everything below reads
// back what actually landed rather than what pgSchema.sql merely asks for.

export async function testSchemaShape(t) {
  // PARAMETERISED, DELIBERATELY, where the brief's own draft inlined the
  // table name as a string literal. `WHERE table_name = 'collection_rows'`
  // puts the substring "collection_rows" in the QUERY TEXT itself, and
  // assertNotTenantScoped (pg.ts) is a blunt text match with no idea this is
  // metadata rather than data — it would refuse the call before pgQuery ever
  // ran it. Binding the same value as $1 keeps it out of the text while
  // asking Postgres the identical question.
  const { rows } = await pgQuery(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = $1 ORDER BY ordinal_position`,
    [TBL.rows],
  );
  const byName = Object.fromEntries(rows.map((r) => [r.column_name, r.data_type]));
  t.equal(byName.payload, "json", "payload is json, NOT jsonb — key order is pinned by the goldens");
  t.equal(byName.seq, "bigint", "seq orders the collection");
  t.equal(byName.row_version, "integer", "row_version carries the compare-and-set");
  t.equal(byName.tenant_id, "text", "tenant_id present");
}

export async function testRlsIsEnabled(t) {
  // Same parameterisation reasoning as testSchemaShape above.
  const { rows } = await pgQuery(
    `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
    [TBL.rows],
  );
  t.equal(rows[0].relrowsecurity, true, "row-level security is on");
  t.equal(rows[0].relforcerowsecurity, true, "and FORCED — even collection_rows's own owner is subject to it");
}

export async function testRlsFiltersRowsBetweenTenants(t) {
  // THE PROOF THIS TASK EXISTS TO PRODUCE: with the table created, the policy
  // can finally be exercised instead of just reasoned about. Two tenants each
  // insert one row into the SAME section/collection bucket; each must see
  // only its own — including under an aggregate, since a naive "RLS filters
  // SELECT * but not COUNT" belief would pass every other test here and still
  // leak a number.
  const tenantA = "p1t2-rls-tenant-a";
  const tenantB = "p1t2-rls-tenant-b";
  const sectionId = "p1t2-rls-sec";
  const collection = "p1t2-rls-col";
  const rowIdA = "p1t2-rls-row-a";
  const rowIdB = "p1t2-rls-row-b";
  const insert = (tenantId, rowId) => (q) => q(
    `INSERT INTO ${TBL.rows} (${TBL.cols.tenant}, ${TBL.cols.section}, ${TBL.cols.collection}, ${TBL.cols.id}, ${TBL.cols.seq}, ${TBL.cols.payload})
     VALUES ($1, $2, $3, $4, nextval('${TBL.seq}'), $5::json)`,
    [tenantId, sectionId, collection, rowId, JSON.stringify({ id: rowId, tenantId })],
  );

  try {
    await withTenant(tenantA, insert(tenantA, rowIdA));
    await withTenant(tenantB, insert(tenantB, rowIdB));

    const seenByA = await withTenant(tenantA, (q) => q(
      `SELECT ${TBL.cols.id} FROM ${TBL.rows} WHERE ${TBL.cols.section} = $1 AND ${TBL.cols.collection} = $2`,
      [sectionId, collection],
    ));
    t.equal(seenByA.rows.length, 1, "tenant A sees exactly one row in the shared bucket, not tenant B's too");
    t.equal(seenByA.rows[0][TBL.cols.id], rowIdA, "and it is specifically tenant A's own row");

    const countByA = await withTenant(tenantA, (q) => q(
      `SELECT count(*)::int AS n FROM ${TBL.rows} WHERE ${TBL.cols.section} = $1 AND ${TBL.cols.collection} = $2`,
      [sectionId, collection],
    ));
    t.equal(countByA.rows[0].n, 1, "a COUNT run under tenant A cannot see tenant B's row either — RLS filters aggregates too");

    const seenByB = await withTenant(tenantB, (q) => q(
      `SELECT ${TBL.cols.id} FROM ${TBL.rows} WHERE ${TBL.cols.section} = $1 AND ${TBL.cols.collection} = $2`,
      [sectionId, collection],
    ));
    t.equal(seenByB.rows.length, 1, "tenant B sees exactly one row too, symmetrically");
    t.equal(seenByB.rows[0][TBL.cols.id], rowIdB, "and it is specifically tenant B's own row, never tenant A's");
  } finally {
    // CLEANUP, BY EXPLICIT KEY (invariant 17's "delete by an explicit key
    // list" — the same rule for Postgres as for Redis). Each delete runs
    // inside the tenant it belongs to, through withTenant, exactly like the
    // insert did; there is deliberately no bare, tenant-agnostic delete
    // against this table.
    await withTenant(tenantA, (q) => q(
      `DELETE FROM ${TBL.rows} WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.id} = $2`,
      [tenantA, rowIdA],
    )).catch(() => {});
    await withTenant(tenantB, (q) => q(
      `DELETE FROM ${TBL.rows} WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.id} = $2`,
      [tenantB, rowIdB],
    )).catch(() => {});
  }
}

export async function testCheckConstraintRejectsEmptyTenantId(t) {
  // testWithTenantRefusesAnEmptyTenantId (above) already proves the
  // APPLICATION-LEVEL refusal — withTenant("") never opens a connection at
  // all. This proves the SECOND, independent backstop: the database's own
  // CHECK (tenant_id <> ''), for any path that reaches the table by some
  // other route than withTenant.
  //
  // Reaching the table with tenant_id = '' from INSIDE withTenant is not a
  // way to exercise this: current_setting() would then read the real
  // (non-empty) tenant, so RLS's own WITH CHECK — tenant_id = current_setting
  // — refuses the mismatched value FIRST (measured: SQLSTATE 42501, "new row
  // violates row-level security policy"), before the table CHECK is ever
  // reached. To isolate the CHECK from RLS, current_setting has to be made to
  // MATCH '' too — exactly the scenario pgSchema.sql's own comment names
  // ("current_setting(..., true) can genuinely return '' once a session has
  // touched the GUC and left its scope"). That is reproduced directly here,
  // deliberately below withTenant, since withTenant's own non-empty check
  // makes it impossible to reach that state through the sanctioned API.
  const pool = _poolForTests();
  const client = await pool.connect();
  let probeErr = null;
  try {
    await client.query("BEGIN");
    await client.query({ text: "SELECT set_config('nompany.tenant_id', $1, true)", values: [""] });
    await client.query({
      text: `INSERT INTO ${TBL.rows} (${TBL.cols.tenant}, ${TBL.cols.section}, ${TBL.cols.collection}, ${TBL.cols.id}, ${TBL.cols.seq}, ${TBL.cols.payload})
             VALUES ($1, $2, $3, $4, nextval('${TBL.seq}'), $5::json)`,
      values: ["", "p1t2-check-sec", "p1t2-check-col", "p1t2-check-row", JSON.stringify({ x: 1 })],
    });
  } catch (e) {
    probeErr = e;
  } finally {
    // ROLLBACK either way — an empty-tenant row must never actually persist,
    // proof or no proof.
    await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
  t.equal(probeErr?.code, "23514", "the empty tenant id is refused by the CHECK constraint (SQLSTATE 23514)");
  t.equal(probeErr?.constraint, "collection_rows_tenant_id_not_empty", "and named as the constraint this task added");
}

// ---- Task 2: the DDL-only door ---------------------------------------------

export async function testPgSchemaQueryRefusesANonDdlStatement(t) {
  let threw = null;
  try {
    await pgSchemaQuery(`SELECT * FROM ${TBL.rows} LIMIT 1`);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "a bare SELECT through pgSchemaQuery is refused");
  t.equal(/allows the exact DDL shapes/.test(threw?.message || ""), true,
    "the error names what the door is, not just that it failed");
}

export async function testPgSchemaQueryRefusesDropTableEvenGuarded(t) {
  // "Not even guarded" — an IF EXISTS on a forbidden statement must not
  // launder it past the check. No such table exists to actually drop; this
  // proves the refusal happens before pgSchemaQuery would ever ask Postgres.
  let threw = null;
  try {
    await pgSchemaQuery("DROP TABLE IF EXISTS p1t2_never_created_by_this_test");
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "DROP TABLE is refused even guarded by IF EXISTS");
  t.equal(/invariant 17/.test(threw?.message || ""), true, "the error points at why, not just that it failed");
}

// ---- fix round 1: the denylist was unbounded — these all sailed through ---
// ---- its old CREATE/ALTER/DROP/COMMENT keyword check ----------------------
//
// Every case here is asserted WITHOUT executing: assertDdlOnly runs
// synchronously, before pgSchemaQuery's run() ever calls client.query(), so a
// thrown error here proves Postgres was never asked — none of these targets
// need to exist (or not exist) for the assertion to be meaningful.

export async function testPgSchemaQueryRefusesDropSchema(t) {
  let threw = null;
  try {
    await pgSchemaQuery("DROP SCHEMA public CASCADE");
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "DROP SCHEMA ... CASCADE is refused — the exact invariant-17 class this door exists to keep out");
}

export async function testPgSchemaQueryRefusesDropOwned(t) {
  let threw = null;
  try {
    await pgSchemaQuery("DROP OWNED BY viltho");
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "DROP OWNED BY is refused");
}

export async function testPgSchemaQueryRefusesDropIndex(t) {
  let threw = null;
  try {
    // IF EXISTS and a target that was never created — proves this is refused
    // by shape, not because the index happens to exist.
    await pgSchemaQuery(`DROP INDEX IF EXISTS p1fix1_never_created_idx`);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "DROP INDEX is not on the allowlist — refused even guarded by IF EXISTS on a target that never existed");
}

export async function testPgSchemaQueryRefusesAlterTableDropColumn(t) {
  let threw = null;
  try {
    await pgSchemaQuery(`ALTER TABLE ${TBL.rows} DROP COLUMN ${TBL.cols.payload}`);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "ALTER TABLE ... DROP COLUMN is refused");
}

export async function testPgSchemaQueryRefusesAlterTableRename(t) {
  let threw = null;
  try {
    await pgSchemaQuery(`ALTER TABLE ${TBL.rows} RENAME TO renamed_away`);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "ALTER TABLE ... RENAME TO is refused");
}

export async function testPgSchemaQueryRefusesAlterColumnTypeJsonb(t) {
  // THE ONE THIS TASK EXISTS TO PREVENT MOST OF ALL: jsonb normalises key
  // order, and the 153 goldens pin it. This statement, if it ran, would
  // rewrite every existing row's payload and silently break every one of
  // them, forever, with no error anywhere.
  let threw = null;
  try {
    await pgSchemaQuery(`ALTER TABLE ${TBL.rows} ALTER COLUMN ${TBL.cols.payload} TYPE jsonb USING ${TBL.cols.payload}::jsonb`);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "ALTER COLUMN ... TYPE jsonb is refused — payload must never be silently rewritten to jsonb");
}

export async function testPgSchemaQueryRefusesDisableRls(t) {
  // THE OTHER ONE: silently removes the tenant isolation this whole task
  // exists to establish, leaving a database that LOOKS identical (same
  // table, same columns, same policy still defined) and no longer separates
  // tenants at all.
  let threw = null;
  try {
    await pgSchemaQuery(`ALTER TABLE ${TBL.rows} DISABLE ROW LEVEL SECURITY`);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "ALTER TABLE ... DISABLE ROW LEVEL SECURITY is refused");
  t.equal(/invariant 17/.test(threw?.message || ""), true, "and named as the invariant-17 class of refusal, not a generic shape mismatch");
}

export async function testPgSchemaQueryRefusesCreateView(t) {
  // pgSchema.sql's own comment (right above the table) forbids exactly this:
  // a view over collection_rows would defeat assertNotTenantScoped's text
  // match with no change needed on that guard's side at all.
  let threw = null;
  try {
    await pgSchemaQuery(`CREATE VIEW p1fix1_never_created_view AS SELECT * FROM ${TBL.rows}`);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "CREATE VIEW over the tenant table is refused");
}

export async function testPgSchemaQueryDoesNotLaunderADropThroughAStringLiteral(t) {
  // THE SECOND FIX ROUND 1 BUG, reproduced directly: a leading statement that
  // WOULD pass the allowlist on its own (a real CREATE TABLE IF NOT EXISTS),
  // carrying a "--" inside a string literal, followed by a genuinely
  // dangerous second statement. The old guard stripped comments with a blind
  // regex BEFORE splitting on ';' — the "--" inside '-- x' blanked
  // everything after it, INCLUDING the semicolon and the trailing DROP
  // TABLE, so the old check saw one harmless CREATE TABLE while Postgres
  // would have run the DROP TABLE right after it. The fix makes splitting
  // and comment-awareness the same pass, so this DROP TABLE is still found.
  const sql = `CREATE TABLE IF NOT EXISTS p1fix1_never_created (a text DEFAULT '-- x'); DROP TABLE ${TBL.rows}`;
  let threw = null;
  try {
    await pgSchemaQuery(sql);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "the smuggled DROP TABLE is still found and refused");
  t.equal(/DROP TABLE/.test(threw?.message || ""), true, "refused specifically as the DROP TABLE hidden after the string literal, not a coincidental other failure");
}

// ---- fix round 2: CREATE TABLE ... AS SELECT slipped past the anchor ------
//
// The CREATE TABLE shape anchored on `... ( ... )$` with no exclusion for a
// query — `CREATE TABLE IF NOT EXISTS foo (a text) AS SELECT * FROM (SELECT
// * FROM collection_rows)` satisfies that anchor by wrapping the source in
// one extra pair of parentheses, and would copy collection_rows into a
// brand-new table with NO RLS policy on it. Both variants below are asserted
// WITHOUT executing — assertDdlOnly throws before pgSchemaQuery's run() ever
// calls client.query().

export async function testPgSchemaQueryRefusesCreateTableAsSelectPlain(t) {
  let threw = null;
  try {
    await pgSchemaQuery(`CREATE TABLE IF NOT EXISTS p1fix2_never_created AS SELECT * FROM ${TBL.rows}`);
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "a plain CREATE TABLE ... AS SELECT (no column list) is refused");
}

export async function testPgSchemaQueryRefusesCreateTableAsSelectWithExtraParens(t) {
  // THE EXACT SHAPE THAT DEFEATED THE ORIGINAL ANCHOR: a real column list
  // followed by AS SELECT, with the subquery's source wrapped in one extra
  // pair of parentheses so the statement still ends in `)`.
  let threw = null;
  try {
    await pgSchemaQuery(
      `CREATE TABLE IF NOT EXISTS p1fix2_never_created (a text) AS SELECT * FROM (SELECT * FROM ${TBL.rows})`,
    );
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "CREATE TABLE (cols) AS SELECT, with the source wrapped in an extra parenthesis, is refused");
}

export async function testPgSchemaQueryAcceptsRealDdl(t) {
  // The positive case: a genuine DDL statement — COMMENT ON, which changes no
  // data and is trivially reversible — passes straight through unaltered.
  // Reset to NULL afterward so this test leaves nothing behind.
  let threw = null;
  try {
    await pgSchemaQuery(`COMMENT ON TABLE ${TBL.rows} IS 'p1t2 ddl-guard probe'`);
  } catch (e) {
    threw = e;
  } finally {
    await pgSchemaQuery(`COMMENT ON TABLE ${TBL.rows} IS NULL`).catch(() => {});
  }
  t.equal(threw, null, "a genuine CREATE/ALTER/DROP/COMMENT statement is let through unmodified");
}

// ---- fix round 1, Critical 1: a failed connection must be DESTROYED, ------
// ---- never handed back to the pool mid-transaction ------------------------

export async function testFailedTransactionDestroysItsConnectionRatherThanRecyclingIt(t) {
  // THE ASSERTION THAT WOULD HAVE CAUGHT THE ORIGINAL BUG. A plain
  // `client.release()` on an error path checks a mid-transaction connection
  // BACK INTO THE POOL as if nothing happened — pg-pool's own bookkeeping
  // (`totalCount`, `_clients.length`) does not change, because the client is
  // still one of the pool's members, just idle again. `client.release(err)`
  // instead calls the pool's `_remove`, which synchronously splices the
  // client OUT of `_clients` before this call even returns — so `totalCount`
  // dropping by exactly one, synchronously, on the error path IS the proof
  // that the connection was destroyed rather than recycled with its stale
  // `nompany.tenant_id` LOCAL setting still attached. If pg.ts regressed to a
  // bare `client.release()`, this assertion would see totalCount UNCHANGED
  // (or even see the pool grow, if `.connect()` had to make a new one to
  // satisfy a later query) and fail.
  //
  // The forced failure is a real Postgres error (division by zero) inside the
  // transaction — not a thrown JS error before any query ran — so it exercises
  // the exact path a mid-transaction wire-level failure (a query_timeout, per
  // Critical 1) would take: BEGIN and SET LOCAL both succeed, then the query
  // itself fails, then ROLLBACK, then release(err).
  const pool = _poolForTests();
  await pgQuery("SELECT 1"); // ensure at least one connection exists to measure against
  const before = pool.totalCount;

  const poisonTenant = "tenant-poison-p1t1fix";
  let threw = null;
  try {
    await withTenant(poisonTenant, async (q) => {
      await q("SELECT 1/0");
    });
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "the forced mid-transaction error surfaces to the caller");

  const after = pool.totalCount;
  t.equal(after, before - 1, "the failed connection was removed from the pool (destroyed), not left in it");
  t.equal(pool.idleCount === 0 || pool.idleCount < before, true,
    "the destroyed connection did not go back onto the idle list");

  // And the leak itself: whichever connection answers next must not be able
  // to see the poisoned tenant setting. Since the poisoned connection no
  // longer exists, this also confirms a fresh/other connection was used.
  const { rows } = await pgQuery("SELECT current_setting('nompany.tenant_id', true) AS tid");
  t.equal(rows[0].tid === poisonTenant, false, "no later query inherits the failed transaction's tenant scope");
}

export async function testPgTxAlsoDestroysAFailedConnection(t) {
  // Same fix, same proof, for pgTx (the non-tenant transaction helper) —
  // Critical 1 named both call sites (pg.ts:119 and :122 in the original
  // review).
  const pool = _poolForTests();
  await pgQuery("SELECT 1");
  const before = pool.totalCount;

  let threw = null;
  try {
    await pgTx(async (q) => {
      await q("SELECT 1/0");
    });
  } catch (e) {
    threw = e;
  }
  t.equal(threw instanceof Error, true, "pgTx surfaces the forced error");
  t.equal(pool.totalCount, before - 1, "pgTx also destroys rather than recycles a connection that failed mid-transaction");
}

// ---- fix round 1, Important 3: nesting withTenant fails fast --------------

export async function testReentrantWithTenantForTheSameTenantIsAbsorbed(t) {
  // A higher-level flow and the row primitive it calls both wrapping
  // themselves in withTenant for the SAME tenant must not pay for (or
  // exhaust the pool over) a second connection — the inner call reuses the
  // outer's client and transaction.
  const pool = _poolForTests();
  await pgQuery("SELECT 1");
  const before = pool.totalCount;

  const seen = await withTenant("tenant-reentrant-same-p1t1fix", async (q) => {
    return withTenant("tenant-reentrant-same-p1t1fix", async (innerQ) => {
      const { rows } = await innerQ("SELECT current_setting('nompany.tenant_id', true) AS tid");
      return rows[0].tid;
    });
  });
  t.equal(seen, "tenant-reentrant-same-p1t1fix", "the nested call still sees the (same) tenant");
  t.equal(pool.totalCount, before, "no second connection was taken for the re-entrant same-tenant call");
}

export async function testReentrantWithTenantForADifferentTenantFailsFast(t) {
  // THE STALL THIS REPLACES: measured at ~5.6s for four levels of naive
  // nesting against PGPOOL_MAX=3, ending in a generic pg-pool "timeout
  // exceeded when trying to connect" that reads as "the database is slow."
  // The fix must fail IMMEDIATELY (no pool wait at all) with a message that
  // names the actual mistake.
  const started = Date.now();
  let threw = null;
  try {
    await withTenant("tenant-outer-p1t1fix", async () => {
      await withTenant("tenant-inner-p1t1fix", async (q) => q("SELECT 1"));
    });
  } catch (e) {
    threw = e;
  }
  const elapsedMs = Date.now() - started;
  t.equal(threw instanceof Error, true, "nesting two different tenants is refused");
  t.equal(/tenant-inner-p1t1fix/.test(threw?.message || "") && /tenant-outer-p1t1fix/.test(threw?.message || ""), true,
    "the error names both tenants, not just that something failed");
  // Generous ceiling (the naive stall was ~5,600ms) — this only needs to prove
  // "fails fast", not pin an exact millisecond count.
  t.equal(elapsedMs < 1000, true, `failed in ${elapsedMs}ms, well under the ~5.6s stall it replaces`);
}

// ---- fix round 2, Critical: a killed connection must not crash the process

export async function testKilledConnectionDoesNotCrashTheProcess(t) {
  // THE ASSERTION THAT WOULD HAVE CAUGHT THE ORIGINAL BUG. pool.connect()
  // takes a client out of pg-pool's own bookkeeping, and pg-pool removes ITS
  // OWN idle-error listener the moment that happens — so for the whole time
  // withTenant holds this client, an unlistened 'error' event is one dropped
  // network packet away. Node's default behaviour for that is to throw,
  // uncaught, ON THE PROCESS — which this very test process would not
  // survive to report a result if the guard were missing or reverted.
  //
  // The kill is real, not simulated, and terminates ONLY a backend this test
  // itself opened: `pg_backend_pid()` is read from inside the very
  // transaction under test, and `pg_terminate_backend` is issued from a
  // second, separate connection this test also opens (via pgQuery, the same
  // shared pool) — never a connection this test did not create. Confirmed
  // empirically (a throwaway script, not committed) that `viltho` may
  // terminate its own role's backends and that the held connection then
  // emits TWO 'error' events in sequence (57P01 "terminating connection due
  // to administrator command", then a generic "Connection terminated
  // unexpectedly") — guardAgainstConnectionError's plain `.on` (not `.once`)
  // is written to tolerate exactly that.
  const pool = _poolForTests();
  await pgQuery("SELECT 1");
  const before = pool.totalCount;

  let caughtError = null;
  await withTenant("tenant-killed-p1t1fix2", async (q) => {
    const { rows } = await q("SELECT pg_backend_pid() AS pid");
    const pid = rows[0].pid;
    await pgQuery("SELECT pg_terminate_backend($1)", [pid]);
    // The termination lands as a socket-level event on the HELD connection
    // asynchronously; give it time to arrive while this callback is idle
    // (no query in flight) — the exact window pg-pool leaves unguarded, and
    // the window the original crash was found in.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return "should never get here — the connection is dead by now";
  }).catch((e) => { caughtError = e; });

  // Reaching this line at all is itself part of the proof: it means the
  // process survived the killed connection instead of dying uncaught.
  t.equal(caughtError instanceof Error, true,
    "the caller receives a real rejected error instead of the process crashing uncaught");
  t.equal(pool.totalCount, before,
    "the pool's connection count returned to where it started (the dead client was destroyed cleanly, not left dangling)");

  // The pool must still be usable afterward — a corrupted pool that merely
  // failed to crash the process would still be a real regression.
  const { rows } = await pgQuery("SELECT 1 AS one");
  t.equal(rows[0].one, 1, "the pool answers a fresh query normally after surviving the killed connection");
}

// ---- Task 4: the row primitives --------------------------------------------
//
// One tenant/section/collection bucket per test, scoped by NOMPANY_TEST_SESSION
// so two agent sessions running this file at once (a real occurrence in this
// repo — see the CLAUDE.md note on shared test namespaces) do not trip over
// each other's rows in the same bucket. Every test cleans up everything it
// wrote, in a finally block, because collection_rows is the live database and
// this suite must leave it exactly as it found it — empty.
const P1T4_SESSION = process.env.NOMPANY_TEST_SESSION || "p1t4";
const P1T4_S = `st_${P1T4_SESSION}`;
const P1T4_SEC = `sec_${P1T4_SESSION}`;
const P1T4_COL = "widgets";

export async function testKeyOrderSurvives(t) {
  const row = await pgAddRow(P1T4_S, P1T4_SEC, P1T4_COL, { name: "Acme", status: "Open" });
  try {
    const [read] = await pgReadCol(P1T4_S, P1T4_SEC, P1T4_COL);
    t.equal(
      JSON.stringify(read),
      JSON.stringify({ id: row.id, name: "Acme", status: "Open", studioId: P1T4_S, sectionId: P1T4_SEC }),
      "id first, then the item's own keys in order, then studioId and sectionId",
    );
  } finally {
    await pgDeleteRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id);
  }
}

export async function testNewestFirst(t) {
  const first = await pgAddRow(P1T4_S, P1T4_SEC, P1T4_COL, { name: "first" });
  const second = await pgAddRow(P1T4_S, P1T4_SEC, P1T4_COL, { name: "second" });
  try {
    const rows = await pgReadCol(P1T4_S, P1T4_SEC, P1T4_COL);
    t.equal(rows[0].name, "second", "a later add reads first");
  } finally {
    await pgDeleteRow(P1T4_S, P1T4_SEC, P1T4_COL, first.id);
    await pgDeleteRow(P1T4_S, P1T4_SEC, P1T4_COL, second.id);
  }
}

export async function testBatchKeepsArrivalOrderAmongItself(t) {
  const batch = await pgAddRows(P1T4_S, P1T4_SEC, P1T4_COL, [{ name: "a" }, { name: "b" }, { name: "c" }]);
  try {
    const rows = await pgReadCol(P1T4_S, P1T4_SEC, P1T4_COL);
    t.equal(rows.slice(0, 3).map((r) => r.name).join(""), "abc",
      "the batch is newest-first as a block, arrival-ordered within itself");
  } finally {
    for (const row of batch) await pgDeleteRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id);
  }
}

export async function testFunctionPatchIsReapplied(t) {
  const row = await pgAddRow(P1T4_S, P1T4_SEC, P1T4_COL, { hits: 0 });
  try {
    await Promise.all(Array.from({ length: 8 }, () =>
      pgUpdateRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id, (r) => ({ hits: Number(r.hits) + 1 }))));
    const [read] = await pgReadCol(P1T4_S, P1T4_SEC, P1T4_COL);
    t.equal(read.hits, 8, "eight concurrent flips all land — no lost update");
  } finally {
    await pgDeleteRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id);
  }
}

export async function testTwentyConcurrentFlipsAllLandNoneRejected(t) {
  // FIX ROUND 1, CRITICAL, REPRODUCED DIRECTLY: the reviewer measured the
  // single-withTenant-per-call draft landing only 13 of 16 and 13 of 20
  // concurrent flips, the rest rejected at pool.connect()'s
  // connectionTimeoutMillis because holding one connection across the WHOLE
  // retry loop capped how many writers could even enter the contest at
  // PGPOOL_MAX. This is the assertion that would have caught it: 20
  // concurrent increments against one row, using Promise.allSettled so a
  // rejection shows up as data instead of aborting the whole test early.
  const row = await pgAddRow(P1T4_S, P1T4_SEC, P1T4_COL, { hits: 0 });
  try {
    const settled = await Promise.allSettled(Array.from({ length: 20 }, () =>
      pgUpdateRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id, (r) => ({ hits: Number(r.hits) + 1 }))));
    const rejected = settled.filter((s) => s.status === "rejected");
    t.equal(rejected.length, 0,
      `all 20 concurrent attempts resolve rather than being rejected on a queued connection` +
      (rejected.length ? ` — first: ${rejected[0].reason?.message}` : ""));
    const [read] = await pgReadCol(P1T4_S, P1T4_SEC, P1T4_COL);
    t.equal(read.hits, 20, "twenty concurrent flips land exactly twenty, none lost, none rejected");
  } finally {
    await pgDeleteRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id);
  }
}

export async function testImmutableFieldsCannotBePatched(t) {
  const row = await pgAddRow(P1T4_S, P1T4_SEC, P1T4_COL, { name: "x" });
  try {
    await pgUpdateRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id, { id: "hacked", studioId: "other", name: "y" });
    const [read] = await pgReadCol(P1T4_S, P1T4_SEC, P1T4_COL);
    t.equal(read.id, row.id, "id is immutable");
    t.equal(read.studioId, P1T4_S, "studioId is immutable");
    t.equal(read.name, "y", "everything else patches");
  } finally {
    await pgDeleteRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id);
  }
}

export async function testDeleteReportsWhetherAnythingWent(t) {
  const row = await pgAddRow(P1T4_S, P1T4_SEC, P1T4_COL, { name: "gone" });
  t.equal(await pgDeleteRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id), true, "a real delete reports true");
  t.equal(await pgDeleteRow(P1T4_S, P1T4_SEC, P1T4_COL, row.id), false, "a second reports false");
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
      testQueryTimeoutOutlivesStatementTimeout,
      testWithTenantSetsTheLocalTenantSetting,
      testTenantSettingDoesNotLeakAcrossTransactions,
      testBareQueryAgainstTheTenantTableIsRefused,
      testWithinTheSeamTheTenantTableIsReachable,
      testWithTenantRefusesAnEmptyTenantId,
      testSchemaShape,
      testRlsIsEnabled,
      testRlsFiltersRowsBetweenTenants,
      testCheckConstraintRejectsEmptyTenantId,
      testPgSchemaQueryRefusesANonDdlStatement,
      testPgSchemaQueryRefusesDropTableEvenGuarded,
      testPgSchemaQueryRefusesDropSchema,
      testPgSchemaQueryRefusesDropOwned,
      testPgSchemaQueryRefusesDropIndex,
      testPgSchemaQueryRefusesAlterTableDropColumn,
      testPgSchemaQueryRefusesAlterTableRename,
      testPgSchemaQueryRefusesAlterColumnTypeJsonb,
      testPgSchemaQueryRefusesDisableRls,
      testPgSchemaQueryRefusesCreateView,
      testPgSchemaQueryDoesNotLaunderADropThroughAStringLiteral,
      testPgSchemaQueryRefusesCreateTableAsSelectPlain,
      testPgSchemaQueryRefusesCreateTableAsSelectWithExtraParens,
      testPgSchemaQueryAcceptsRealDdl,
      testFailedTransactionDestroysItsConnectionRatherThanRecyclingIt,
      testPgTxAlsoDestroysAFailedConnection,
      testReentrantWithTenantForTheSameTenantIsAbsorbed,
      testReentrantWithTenantForADifferentTenantFailsFast,
      testKilledConnectionDoesNotCrashTheProcess,
      testKeyOrderSurvives,
      testNewestFirst,
      testBatchKeepsArrivalOrderAmongItself,
      testFunctionPatchIsReapplied,
      testTwentyConcurrentFlipsAllLandNoneRejected,
      testImmutableFieldsCannotBePatched,
      testDeleteReportsWhetherAnythingWent,
      testBackendDefaultsToRedis,
    ];
    let totalFails = 0;
    for (const test of tests) {
      console.log(`\n== ${test.name}`);
      const t = makeHarness();
      await test(t);
      totalFails += t.fails;
    }
    console.log(totalFails ? `\n${totalFails} FAILURES\n` : "\nall passed\n");
    await _poolForTests().end();
    process.exit(totalFails ? 1 : 0);
  })().catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
}
