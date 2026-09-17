// SEAL EVERY CLIENT DETAIL ALREADY IN THE DATABASE — the one-time half of
// client data sealed at rest (platform/db/sealing.ts).
//
// From the day sealing shipped, every write seals, and a row written before it
// is sealed WHOLE the first time anything touches it. A client nobody edits
// would stay readable in the table for ever, so this walks every studio and
// touches every row that still holds a client detail in the clear.
//
// THE WHOLE ERP, NEVER ONE STUDIO — the owner's rule of 12/09/2026. `--studio`
// exists for a sandbox check only and is refused against the live namespace.
//
// INVARIANT 17: this REWRITES LIVE ROWS, so it runs only after the owner has
// confirmed twice. Dry run by default, and a dry run prints COUNTS, never a
// value. `--apply` requires `--export <file>`: every row it will rewrite is
// written there first, IN THE CLEAR (that is what an export is), under
// seal-export/ which git ignores. Delete that file once the re-scan below has
// passed and the app has been opened — it is the only readable copy left.
//
// SAFE TO RUN TWICE: a row with nothing left in the clear is not touched, and
// sealing is deterministic, so a row rewritten twice is byte-identical.
//
//   node scripts/migrate/seal-clients.mjs                         # dry run
//   node scripts/migrate/seal-clients.mjs --apply --allow-live \
//        --export seal-export/2026-09-17.json                     # the real run

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALLOW_LIVE = argv.includes("--allow-live");
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] || "" : "";
};
const ONE_STUDIO = arg("--studio");
const EXPORT = arg("--export");

try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* an already-exported shell */ }

const fail = (msg) => { console.error(`\n${msg}\n`); process.exit(1); };
if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set — nothing to read from.");

const prefix = process.env.NOMPANY_KEY_PREFIX || "";
if (!prefix && !ALLOW_LIVE) {
  fail("Refusing to run against the LIVE namespace.\n  Set NOMPANY_KEY_PREFIX for a sandbox, or pass --allow-live once you have read a dry run and mean it.");
}
if (!prefix && ONE_STUDIO) fail("--studio is for a sandbox check; the live run covers every studio.");
if (!prefix && !process.env.NOMPANY_DATA_KEY) fail("NOMPANY_DATA_KEY is not set — there is no key to seal the live rows with.");
if (APPLY && !EXPORT) fail("--apply needs --export <file>: the rows are exported before anything is rewritten.");
if (APPLY && EXPORT && !resolve(EXPORT).startsWith(resolve("seal-export"))) {
  fail("--export must be under seal-export/, which git ignores — the export holds client data in the clear.");
}

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { listStudios } = await import("@/modules/main/studios");
const { sectionsAsStored, collectionsForKey, updateRow } = await import("@/platform/db/sections");
const { pgReadCol } = await import("@/platform/db/pgRows");
const { isSealed, isSealedField } = await import("@/platform/db/sealCipher");
const { sealingConfigured } = await import("@/platform/db/sealing");

if (!sealingConfigured()) fail("No master key is configured — nothing can be sealed.");

// A row still holding a client detail in the clear, read RAW so the answer is
// about what the table holds rather than about what the app would show.
const clearFields = (collection, row) => Object.entries(row)
  .filter(([field, value]) => value != null && !isSealed(value) && isSealedField(collection, field))
  .map(([field]) => field);

async function scan(studios) {
  const found = [];
  for (const studio of studios) {
    for (const section of await sectionsAsStored(studio.id)) {
      for (const collection of collectionsForKey(section.key)) {
        const rows = await pgReadCol(studio.id, section.id, collection);
        for (const row of rows) {
          const fields = clearFields(collection, row);
          if (fields.length) found.push({ studio, section, collection, row, fields });
        }
      }
    }
  }
  return found;
}

const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);

const pending = await scan(studios);
const tally = new Map();
for (const p of pending) {
  const k = `${p.studio.slug || p.studio.id}  ${p.collection}`;
  tally.set(k, (tally.get(k) || 0) + 1);
}
for (const [k, n] of [...tally].sort()) console.log(`  ${k.padEnd(56)} ${n} row(s)`);
console.log(`\nRows with client data in the clear: ${pending.length}`);

if (!APPLY) {
  console.log("(dry run — nothing written; re-run with --apply --export seal-export/<file>.json to seal)\n");
  process.exit(0);
}

// EXPORT FIRST, and in full, before the first rewrite.
mkdirSync(dirname(resolve(EXPORT)), { recursive: true });
writeFileSync(EXPORT, JSON.stringify(pending.map((p) => ({
  studioId: p.studio.id, sectionId: p.section.id, collection: p.collection, row: p.row,
})), null, 1));
console.log(`Exported ${pending.length} row(s) to ${EXPORT}`);

// BY EXPLICIT ID, one row at a time, through the dispatcher — so the rewrite is
// the same compare-and-set every write takes, and a row changed by somebody
// meanwhile is sealed as it now is rather than overwritten with the scan's copy.
let sealed = 0;
for (const p of pending) {
  const out = await updateRow(p.studio.id, p.section.id, p.collection, p.row.id, () => ({}));
  if (out) sealed += 1;
}
console.log(`Sealed ${sealed} row(s)`);

// RE-SCAN TO PROVE IT, reading raw again.
const left = await scan(studios);
if (left.length) {
  for (const p of left) console.error(`  STILL CLEAR  ${p.studio.id}  ${p.collection}  ${p.row.id}  ${p.fields.join(",")}`);
  fail(`${left.length} row(s) still hold client data in the clear.`);
}
console.log("Re-scan: no client data left in the clear.");
console.log(`Delete ${EXPORT} once the app has been opened and clients read correctly — it is the last readable copy.\n`);
process.exit(0);
