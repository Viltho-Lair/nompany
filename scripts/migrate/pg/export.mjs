// EXPORT, READ-ONLY. Walks every studio, every section, every collection named
// by SECTION_COLLECTIONS, and writes newline-delimited JSON to disk — one file
// per studio. It never writes to Redis and it never deletes: the export IS the
// safety net (invariant 17), and a safety net that mutates the thing it
// protects is not one. There is no write or delete primitive anywhere in this
// file — not a guarded one, none.
//
// THE COLLECTION LIST IS EXPLICIT, from SECTION_COLLECTIONS, never a prefix
// scan. A broad scan once wiped the whole shared Redis instance (invariant 17,
// CLAUDE.md), and a scan that only reads is still the habit that produced it —
// `extract.ts` was rewritten for the identical reason: a key found by SCAN
// proves only which backend is live, and its absence is not proof a collection
// is empty.
//
// ROW ORDER SURVIVES BY CONSTRUCTION. redisReadCol returns newest-first
// (addRow prepends — invariant reproduced in redisRows.ts's own header), and
// this loop writes each collection's rows to the file in exactly that order,
// one JSON line per row, with no sort and no reverse. load.mjs's job is to
// reproduce this order in Postgres; reversing it here would hide the very bug
// that ordering proof exists to catch.
//
//   node scripts/migrate/pg/export.mjs [outDir] [--allow-live]
import { createWriteStream, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// SELF-REGISTERING LOADER, same reason and shape as scripts/migrate/pg/schema.mjs
// and scripts/migrate/restructure-sections.mjs: this file runs bare (`node
// scripts/migrate/pg/export.mjs`) and the modules it imports reach each other
// with extensionless specifiers (`./keys`) that plain Node's ESM resolver
// cannot follow without this hook filling the extension in.
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("../../../tests/loader.mjs", import.meta.url), { data: { root } });
}

// DATABASE_URL is not needed here (this script never touches Postgres), but
// REDIS_URL lives in .env.local, which Next loads and plain Node does not.
// Same parse every other migrate script in this folder already uses.
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI may supply the environment directly */ }

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is not set — export.mjs needs Redis to read from.");
  process.exit(1);
}

const argv = process.argv.slice(2);
const ALLOW_LIVE = argv.includes("--allow-live");
const out = argv.find((a) => !a.startsWith("--")) || "./pg-export";

// REFUSED UNLESS EXPLICITLY ALLOWED — same guard, same wording, as every other
// script in this folder that reads Redis (backfill.mjs, restructure-sections.mjs,
// backfill-engagements.mjs). An empty prefix IS production (keys.ts), so
// reading it — even read-only — is exactly the thing Task 10's double
// confirmation exists to gate. This script itself never asks for that
// confirmation; it only refuses to proceed against the live namespace by
// default, the same way its siblings do.
const prefix = process.env.NOMPANY_KEY_PREFIX || "";
if (!prefix && !ALLOW_LIVE) {
  console.error(
    "Refusing to read the LIVE Redis namespace without consent.\n" +
      "  - For a safe trial, run under a sandbox prefix: NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/pg/export.mjs\n" +
      "  - To export live on purpose (Task 10, double-confirmed with the owner), pass --allow-live.",
  );
  process.exit(1);
}

const { listStudios } = await import("@/modules/main/studios");
const { listSections } = await import("@/platform/db/sections");
const { redisReadCol } = await import("@/platform/db/redisRows");
const { SECTION_COLLECTIONS } = await import("@/platform/db/keys");

await mkdir(out, { recursive: true });

let studioCount = 0, rowCount = 0, colCount = 0;
for (const studio of await listStudios()) {
  studioCount++;
  const stream = createWriteStream(`${out}/${studio.id}.ndjson`);
  for (const section of await listSections(studio.id)) {
    for (const collection of SECTION_COLLECTIONS[section.key] || []) {
      colCount++;
      const data = await redisReadCol(studio.id, section.id, collection);
      // WRITTEN IN readCol'S OWN ORDER — newest-first, unmodified.
      for (const row of data) {
        stream.write(`${JSON.stringify({ studioId: studio.id, sectionId: section.id, collection, row })}\n`);
        rowCount++;
      }
    }
  }
  await new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.end(resolve);
  });
}

console.log(
  `exported ${rowCount} row(s) from ${studioCount} studio(s) across ${colCount} collection(s) to ${out}`,
);
process.exit(0);
