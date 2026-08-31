// APPLIES pgSchema.sql — THE FIRST WRITE THIS PROJECT EVER MAKES TO POSTGRES.
//
// IDEMPOTENT BY CONSTRUCTION, NOT BY THIS SCRIPT'S OWN CARE: every statement
// in pgSchema.sql is `CREATE ... IF NOT EXISTS` or a `DROP POLICY IF EXISTS` /
// `CREATE POLICY` pair, so re-running this script against an already-migrated
// database is a silent no-op (see task-2-report.md for the twice-run proof).
// Nothing here may ever DROP TABLE, TRUNCATE or DROP DATABASE — not even
// guarded — and pgSchemaQuery (src/platform/db/pg.ts) refuses all three
// unconditionally at the door, so this script cannot reach for them even by
// accident.
//
// GOES THROUGH pgSchemaQuery, NOT pgTx. pgTx's tenant guard
// (assertNotTenantScoped) does a plain text match for "collection_rows",
// which every CREATE/ALTER statement in pgSchema.sql names outright — a
// schema statement is not tenant data and has no tenant to set, so it
// belongs on the DDL-only door built for exactly this, not the tenant-scoped
// one.
//
// ONE STATEMENT, NOT ONE CALL PER LINE: the whole file is handed to Postgres
// in a single query. `pg` only uses the extended (prepared-statement)
// protocol when a query carries bind values (see run() in pg.ts) — this call
// passes none, so `pg` falls back to the simple query protocol, which is the
// one that accepts a `;`-separated batch of statements in one message. That
// also means the batch runs as one implicit transaction: Postgres wraps an
// unwrapped multi-statement simple-query message in a transaction of its own
// unless the text itself contains BEGIN/COMMIT, so a failure partway through
// leaves nothing applied rather than half a schema.
//
//   node scripts/migrate/pg/schema.mjs

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// SELF-REGISTERING LOADER, same reason and shape as tests/pg-parity.mjs: this
// file runs bare (`node scripts/migrate/pg/schema.mjs`) and pg.ts/keys.ts
// reach each other with an extensionless specifier (`./keys`) that plain
// Node's ESM resolver cannot follow without this hook filling the extension
// in. tests/loader.mjs already does exactly that walk — reused rather than
// duplicated.
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("../../../tests/loader.mjs", import.meta.url), { data: { root } });
}

// DATABASE_URL lives in .env.local, which Next loads and plain Node does not.
// Same parse every other migrate script under scripts/migrate/ already uses —
// no dependency, and it never overwrites anything CI supplies directly.
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI may supply the environment directly */ }

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — schema.mjs needs Postgres to talk to.");
  process.exit(1);
}

// Dynamic, not static — a static `import` is resolved before ANY module-level
// code runs (including the register() call above), which is exactly what
// leaves it too early to see the hook.
const { pgSchemaQuery } = await import("../../../src/platform/db/pg.ts");

const sql = readFileSync(new URL("../../../src/platform/db/pgSchema.sql", import.meta.url), "utf8");

try {
  await pgSchemaQuery(sql);
  console.log("schema applied (every statement is IF NOT EXISTS or DROP POLICY IF EXISTS / CREATE POLICY, so this is safe to run again)");
  process.exit(0);
} catch (e) {
  console.error("schema application failed:", e.message);
  process.exit(1);
}
