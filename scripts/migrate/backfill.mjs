// REDIS → SQL SERVER BACKFILL — Stage 1 of docs/database-migration-mssql.md.
//
// Extract (SCAN, never KEYS — reusing scanPrefix from the store, the same helper
// the cascade uses), Transform (transform.mjs, ids verbatim, coercions logged),
// Load (sinks.mjs — a .sql file by default, a live SQL Server behind --load).
//
//   node scripts/migrate/backfill.mjs [--out FILE] [--limit N] [--load] [--allow-live-read]
//
// SAFETY — two locks, the same philosophy keys.ts uses for KEY_PREFIX, because
// the read is against the LIVE, SHARED Redis (CLAUDE.md: there is no dev database):
//   • It is READ-ONLY. It calls getJSON / hGetAll / scanPrefix and NOTHING that
//     writes — no set, no del, no FLUSHDB, no sweep. It cannot mutate Redis.
//   • It still refuses to touch the live namespace unless you say so: run it under
//     NOMPANY_KEY_PREFIX (a sandbox namespace) OR pass --allow-live-read. Reading
//     is safe, but "safe to read" is a decision a human makes, not a default.
//
// It writes ONLY the .sql export file (or, with --load, the target SQL Server).

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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
const LIMIT = Number(opt("limit", "0")) || Infinity;
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

const { getJSON, hGetAll, scanPrefix } = await import("@/platform/db/store");
const { REG, S, SEC } = await import("@/platform/db/keys");
const { PLATFORM, USER_SATELLITES, STUDIO_LEVEL, COLLECTION_TABLE, CHILD_ARRAYS } = await import("./mapping.mjs");
const { transformCollection, transformObject, transformMap } = await import("./transform.mjs");
const { SqlFileSink, MssqlSink } = await import("./sinks.mjs");

const checksum = (rows) => createHash("sha256").update(JSON.stringify(rows)).digest("hex").slice(0, 12);

// ---- the sink --------------------------------------------------------------
let sink;
if (LOAD) {
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
  sink = new MssqlSink(cfg);
} else {
  sink = new SqlFileSink(OUT);
}
await sink.open();

const counts = {};
const anomalies = [];
const unmapped = new Set();
const tally = (table, rows) => (counts[table] = (counts[table] || 0) + rows.length);

async function emit(studioId, byTable) {
  await sink.begin(studioId);
  for (const [table, rows] of Object.entries(byTable)) {
    await sink.write(table, rows);
    tally(table, rows);
  }
  await sink.commit(studioId);
}

// ---- platform registries (g:*) ---------------------------------------------
console.log(`reading ${prefix ? `namespace "${prefix}"` : "the LIVE namespace"} …\n`);
{
  const byTable = {};
  for (const spec of PLATFORM) {
    const doc = await getJSON(spec.key);
    const list = spec.shape === "array" ? doc || [] : Object.values(doc || {});
    // Platform rows keep their fields as-is beyond id — they are hand-mapped in
    // the doc, so here they are passed straight through with ids verbatim; the
    // sink renders them. (A production run narrows these to the doc's columns.)
    (byTable[spec.table] ||= []).push(...list.map((row) => ({ ...row })));
  }
  await emit("(platform)", byTable);
}

// ---- per-user satellites (u:<id>:*) ----------------------------------------
// Reached by explicit key builder per user, not SCAN — their shapes are known.
{
  const users = (await getJSON(REG.users)) || [];
  const byTable = {};
  for (const user of users) {
    const uid = user.id;
    if (!uid) continue;
    for (const sat of USER_SATELLITES) {
      const doc = await getJSON(sat.via(uid));
      if (doc == null) continue;
      if (sat.shape === "object") {
        const { row, anomalies: a } = transformObject(sat.table, doc, { ownerField: sat.ownerField, ownerId: uid });
        (byTable[sat.table] ||= []).push(row);
        anomalies.push(...a);
      } else if (sat.shape === "array") {
        for (const el of doc) {
          const { row, anomalies: a } = transformObject(sat.table, el, { ownerField: sat.ownerField, ownerId: uid });
          (byTable[sat.table] ||= []).push(row);
          anomalies.push(...a);
        }
      } else if (sat.shape === "map") {
        const { rows } = transformMap(sat.table, doc, {
          ownerField: sat.ownerField, ownerId: uid, keyName: sat.keyName, valueName: sat.valueName,
        });
        (byTable[sat.table] ||= []).push(...rows);
      }
    }
  }
  await emit("(users)", byTable);
}

// ---- studios: one transaction (one emit) per studio ------------------------
// The natural consistency and retry unit (doc §4). SCAN s:<id>:* once, classify
// each key by suffix, transform, and hand the whole studio to the sink together.
const studios = (await getJSON(REG.studios)) || [];
let done = 0;
for (const studio of studios) {
  if (done >= LIMIT) break;
  const sid = studio.id;
  if (!sid) continue;
  const base = S.prefix(sid);
  const keys = await scanPrefix(base); // SCAN, not KEYS — bounded, non-blocking
  const byTable = {};

  for (const key of keys) {
    const rest = key.slice(base.length); // strip s:<id>: → the local suffix

    // Studio-level collections (collaborators, sections, roles, notifications).
    const level = STUDIO_LEVEL.find((s) => s.via(sid) === key);
    if (level) {
      const docs = (await getJSON(key)) || [];
      const { rows, anomalies: a } = transformCollection(level.table, level.table, docs, {
        studioId: sid, sectionId: null, childArrays: CHILD_ARRAYS,
      });
      for (const [t, rs] of Object.entries(rows)) (byTable[t] ||= []).push(...rs);
      anomalies.push(...a);
      continue;
    }

    // Reference counters (a Redis HASH) → Counter rows, one per prefix.
    if (rest === "counters") {
      const hash = await hGetAll(key);
      const rows = Object.entries(hash).map(([pfx, val]) => ({
        StudioId: sid, Prefix: pfx, Value: Number(val) || 0,
      }));
      (byTable.Counter ||= []).push(...rows);
      continue;
    }

    // A section's operational collection: sec:<secId>:c:<name>.
    const m = rest.match(/^sec:([^:]+):c:(.+)$/);
    if (m) {
      const [, sectionId, name] = m;
      const table = COLLECTION_TABLE[name];
      if (!table) { unmapped.add(name); continue; }
      const docs = (await getJSON(SEC.col(sid, sectionId, name))) || [];
      const { rows, anomalies: a } = transformCollection(name, table, docs, {
        studioId: sid, sectionId, childArrays: CHILD_ARRAYS,
      });
      for (const [t, rs] of Object.entries(rows)) (byTable[t] ||= []).push(...rs);
      anomalies.push(...a);
      continue;
    }

    // Streams stay in Redis (doc §1): the event log and audit are not records.
    if (rest === "events" || rest === "audit") continue;
    // Settings, chat usage, plans, templates, project boards: mapped in a later
    // pass. Recorded, never silently skipped — "no silent caps" (CLAUDE.md).
    unmapped.add(rest.replace(/[a-z0-9_-]{6,}/gi, (s) => (s.length > 20 ? "<id>" : s)));
  }

  await emit(sid, byTable);
  done++;
  if (done % 25 === 0) console.log(`  … ${done} studios`);
}

await sink.close();

// ---- report ----------------------------------------------------------------
console.log(`\nStudios processed : ${done}${LIMIT === Infinity ? "" : ` (limit ${LIMIT})`}`);
console.log("Rows per table    :");
for (const [table, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${table.padEnd(22)} ${String(n).padStart(7)}`);
}
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
console.log(LOAD ? "\nLoaded into SQL Server." : `\nWrote ${OUT}  (checksum ${checksum(counts)})`);
process.exit(0);
