// SCOPE LEAVES EVERY ITEM — the owner's instruction, 02/10/2026: "There is no
// need for Scope in Add items or edit items, it should be removed from there
// and in code and in database." The code no longer reads or writes an item's
// scope, and saving an item drops any it carries; this removes the rest,
// across every studio.
//
// WHAT IT CHANGES: the `scope` field on registered items (inventoryItems), and
// nothing else. A studio's service actions are untouched — a retired action
// only items named is pruned by `nextPool` the next time that studio saves its
// pool, which is the pool's own housekeeping and not this script's.
//
// INVARIANT 17: it rewrites live rows, so it runs only after the owner has
// confirmed twice. Dry run by default, printing studio, item and how many
// actions its scope names. `--apply` requires `--export <file>` under
// scope-export/ (git ignores it): every item's scope is written there first.
// By explicit id, through the row dispatcher; safe to run twice.
//
//   node scripts/migrate/remove-item-scope.mjs --allow-live
//   node scripts/migrate/remove-item-scope.mjs --apply --allow-live --export scope-export/2026-10-02.json

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
if (APPLY && !EXPORT) fail("--apply needs --export <file>: every item's scope is exported before it is removed.");
if (APPLY && !resolve(EXPORT).startsWith(resolve("scope-export"))) fail("--export must be under scope-export/, which git ignores.");

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { listStudios } = await import("@/modules/main/studios");
const { sectionsAsStored, collectionsForKey, readCol, updateRow } = await import("@/platform/db/sections");

// THE FIELD'S PRESENCE, not its contents: createItem wrote `scope: []` on every
// item, so an empty list is the common case and is still a stored field.
async function scan(studios) {
  const found = [];
  for (const studio of studios) {
    for (const section of await sectionsAsStored(studio.id)) {
      if (!collectionsForKey(section.key).includes("inventoryItems")) continue;
      for (const item of await readCol(studio.id, section.id, "inventoryItems")) {
        if (item.scope !== undefined) found.push({ studio, section, item });
      }
    }
  }
  return found;
}

const studios = await listStudios();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);
const pending = await scan(studios);
const named = (item) => (Array.isArray(item.scope) ? item.scope.length : 0);
// Per studio, and per item only where the scope actually names something —
// a wall of "0 action(s)" rows would bury the few that hold real choices.
const byStudio = new Map();
for (const p of pending) {
  const key = p.studio.slug || p.studio.id;
  const row = byStudio.get(key) || { items: 0, nonEmpty: 0 };
  row.items += 1;
  if (named(p.item) > 0) row.nonEmpty += 1;
  byStudio.set(key, row);
}
for (const [key, row] of byStudio) {
  console.log(`  ${key.padEnd(28)} ${String(row.items).padStart(5)} item(s) store a scope, ${row.nonEmpty} of them non-empty`);
}
for (const p of pending.filter((x) => named(x.item) > 0)) {
  console.log(`    ${(p.studio.slug || p.studio.id).padEnd(26)} ${String(p.item.sku || p.item.id).padEnd(16)} ${named(p.item)} action(s)`);
}
console.log(`\nItems storing a scope: ${pending.length} (${pending.filter((p) => named(p.item) > 0).length} non-empty)`);

if (!APPLY) {
  console.log("(dry run — nothing written; re-run with --apply --export scope-export/<file>.json)\n");
  process.exit(0);
}

mkdirSync(dirname(resolve(EXPORT)), { recursive: true });
writeFileSync(EXPORT, JSON.stringify(pending.map((p) => ({
  studioId: p.studio.id, sectionId: p.section.id, itemId: p.item.id, sku: p.item.sku, scope: p.item.scope,
})), null, 1));
console.log(`Exported ${pending.length} item(s) to ${EXPORT}`);

let cleared = 0;
for (const p of pending) {
  const out = await updateRow(p.studio.id, p.section.id, "inventoryItems", p.item.id, () => ({ scope: undefined }));
  if (out) cleared += 1;
}
console.log(`Cleared ${cleared} item(s)`);

const left = await scan(studios);
if (left.length) fail(`${left.length} item(s) still store a scope.`);
console.log("Re-scan: no item stores a scope.\n");
process.exit(0);
