// REDIS → SQL SERVER BACKFILL (CLI) — Stage 1 of docs/database-migration-mssql.md.
//
// A THIN WRAPPER over the shared core in src/platform/db/migrate, which the
// console's export route uses too — so the CLI and the button cannot drift. This
// file owns only what a command line adds: argument parsing, the .env load, the
// safety guard, and the live-load path.
//
//   node scripts/migrate/backfill.mjs [--out FILE] [--studio ID] [--load] [--allow-live-read]
//
// SAFETY — two locks, the KEY_PREFIX philosophy from keys.ts, because the read is
// against the LIVE, SHARED Redis (CLAUDE.md: there is no dev database):
//   • READ-ONLY. The core calls getJSON / hGetAll / scanPrefix and nothing that
//     writes — no set, no del, no FLUSHDB, no sweep.
//   • It refuses the live namespace unless you say so: run under NOMPANY_KEY_PREFIX
//     (a sandbox namespace) OR pass --allow-live-read.
//
// It writes ONLY the .sql export file (or, with --load, the target SQL Server).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const OUT = opt("out", "scripts/migrate/out/nompany-export.sql");
const STUDIO = opt("studio", "");
const LOAD = flag("load");
const ALLOW_LIVE = flag("allow-live-read");

// ---- env (Next loads .env.local; this plain-Node process must do it itself) --
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI or an already-exported shell */ }

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is not set — nothing to read from.");
  process.exit(1);
}

// LOCK TWO: refuse the live namespace unless explicitly allowed. An empty prefix
// IS production (keys.ts), so reading it is the thing the guard is about.
const prefix = process.env.NOMPANY_KEY_PREFIX || "";
if (!prefix && !ALLOW_LIVE) {
  console.error(
    "Refusing to read the LIVE key namespace without consent.\n" +
      "  • For a safe trial, run under a sandbox prefix: NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/backfill.mjs\n" +
      "  • To read live on purpose (read-only, still safe), pass --allow-live-read.",
  );
  process.exit(1);
}

// ---- the suites' loader, so `@/…` and TS strip work in plain Node ----------
const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { extract } = await import("@/platform/db/migrate/extract");
const { emitToString } = await import("@/platform/db/migrate/emit");

// ---- run -------------------------------------------------------------------
const scope = STUDIO ? { kind: "studio", studioId: STUDIO } : { kind: "all" };
console.log(`reading ${prefix ? `namespace "${prefix}"` : "the LIVE namespace"}${STUDIO ? `, studio ${STUDIO}` : ""} …`);

const { tables, anomalies, unmapped, studios } = await extract(scope);
const meta = { scope: STUDIO ? `studio ${STUDIO}` : "full database", generatedAt: new Date().toISOString() };

if (LOAD) {
  const { MssqlSink } = await import("./sinks.mjs");
  const cfg = {
    server: process.env.SQL_HOST,
    database: process.env.SQL_DB || "nompany",
    user: process.env.SQL_USER,
    password: process.env.SQL_PASS,
    options: { encrypt: true, trustServerCertificate: false },
  };
  if (!cfg.server || !cfg.user || !cfg.password) {
    console.error("--load needs SQL_HOST, SQL_USER and SQL_PASS in the environment.");
    process.exit(1);
  }
  const sink = new MssqlSink(cfg);
  await sink.open();
  // One transaction per table — bounded, and each is independently retryable.
  for (const [table, rows] of tables) {
    await sink.begin();
    await sink.write(table, rows);
    await sink.commit();
  }
  await sink.close();
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, emitToString(tables, meta), "utf8");
}

// ---- report ----------------------------------------------------------------
console.log(`\nStudios processed : ${studios}`);
console.log("Rows per table    :");
const counts = [...tables.entries()].map(([t, rows]) => [t, rows.length]).sort((a, b) => b[1] - a[1]);
for (const [table, n] of counts) console.log(`  ${table.padEnd(22)} ${String(n).padStart(7)}`);

if (unmapped.size) {
  console.log(`\nUnmapped keys (deferred to a later pass, NOT lost in Redis):\n  ${[...unmapped].join("\n  ")}`);
}
if (anomalies.length) {
  console.log(`\n⚠  ${anomalies.length} coercion anomalies — review before Stage 3:`);
  for (const a of anomalies.slice(0, 20)) {
    console.log(`  ${a.table}.${a.field} (${a.rowId}): ${a.reason} — ${JSON.stringify(a.value)?.slice(0, 60)}`);
  }
  if (anomalies.length > 20) console.log(`  … and ${anomalies.length - 20} more`);
}
console.log(LOAD ? "\nLoaded into SQL Server." : `\nWrote ${OUT}`);
process.exit(0);
