// PACKS LEAVE EVERY ITEM — the owner's instruction, 17/09/2026: an item is sold
// in its UNIT, which a studio names itself, so a box of twenty is an item whose
// unit is the box. The code no longer reads or writes packs, and saving an item
// drops any it carries; this removes the rest, across every studio.
//
// WHAT IT CHANGES: the `packs` field on registered items (inventoryItems), and
// nothing else. Past receipts keep the description they printed ("Soap — Box")
// and the units they took; nothing is recomputed.
//
// INVARIANT 17: it rewrites live rows, so it runs only after the owner has
// confirmed twice. Dry run by default, printing studio, item and how many packs
// — never their codes or prices. \`--apply\` requires \`--export <file>\` under
// packs-export/ (git ignores it): every item's packs are written there first.
// By explicit id, through the row dispatcher; safe to run twice.
//
//   node scripts/migrate/remove-packs.mjs --allow-live
//   node scripts/migrate/remove-packs.mjs --apply --allow-live --export packs-export/2026-09-17.json

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALLOW_LIVE = argv.includes("--allow-live");
const EXPORT = (() => { const i = argv.indexOf("--export"); return i >= 0 ? argv[i + 1] || "" : ""; })();

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
if (APPLY && !EXPORT) fail("--apply needs --export <file>: every item's packs are exported before they are removed.");
if (APPLY && !resolve(EXPORT).startsWith(resolve("packs-export"))) fail("--export must be under packs-export/, which git ignores.");

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { listStudios } = await import("@/modules/main/studios");
const { sectionsAsStored, collectionsForKey, readCol, updateRow } = await import("@/platform/db/sections");

async function scan(studios) {
  const found = [];
  for (const studio of studios) {
    for (const section of await sectionsAsStored(studio.id)) {
      if (!collectionsForKey(section.key).includes("inventoryItems")) continue;
      for (const item of await readCol(studio.id, section.id, "inventoryItems")) {
        if (Array.isArray(item.packs)) found.push({ studio, section, item });
      }
    }
  }
  return found;
}

const studios = await listStudios();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);
const pending = await scan(studios);
for (const p of pending) {
  console.log(`  ${(p.studio.slug || p.studio.id).padEnd(24)} ${String(p.item.sku || p.item.id).padEnd(16)} ${p.item.packs.length} pack(s)`);
}
console.log(`\nItems carrying packs: ${pending.length}`);

if (!APPLY) {
  console.log("(dry run — nothing written; re-run with --apply --export packs-export/<file>.json)\n");
  process.exit(0);
}

mkdirSync(dirname(resolve(EXPORT)), { recursive: true });
writeFileSync(EXPORT, JSON.stringify(pending.map((p) => ({
  studioId: p.studio.id, sectionId: p.section.id, itemId: p.item.id, sku: p.item.sku, packs: p.item.packs,
})), null, 1));
console.log(`Exported ${pending.length} item(s) to ${EXPORT}`);

let cleared = 0;
for (const p of pending) {
  const out = await updateRow(p.studio.id, p.section.id, "inventoryItems", p.item.id, () => ({ packs: undefined }));
  if (out) cleared += 1;
}
console.log(`Cleared ${cleared} item(s)`);

const left = await scan(studios);
if (left.length) fail(`${left.length} item(s) still carry packs.`);
console.log("Re-scan: no item carries packs.\n");
process.exit(0);
