// SERVICE ACTIONS LEAVE THE DATABASE — the owner's instruction, 03/10/2026: "we
// will remove the service actions from studios and all links to Items from code
// and database". The code no longer reads or writes any of what follows; this
// clears what is still stored, across every studio.
//
// WHAT IT CLEARS, field by field, and nothing else:
//   studios (the registry)        serviceActions, retiredServiceActions
//   salesTickets                  serviceIds — the ticket's services
//   rfqs, quotations              serviceIds — a copy older rows may carry
//   inventoryItems                scope — the item's link to actions (02/10/2026;
//                                 this script supersedes remove-item-scope.mjs)
//   KPI declarations (/super)     action
//   every deal's frozen KPIs      action, source
// Each is REMOVED from the row, never set to an empty value: an empty list is
// still a stored field, and "the field is gone" is what the re-scan proves.
//
// INVARIANT 17: it rewrites live rows across every tenant, so it runs only after
// the owner has confirmed twice. Dry run by default, printing what each studio
// stores. `--apply` requires `--export <file>` under service-actions-export/
// (git ignores it): every value is written there first. By explicit id, through
// the same compare-and-set doors the product writes with; safe to run twice.
//
//   node scripts/migrate/remove-service-actions.mjs --allow-live
//   node scripts/migrate/remove-service-actions.mjs --apply --allow-live --export service-actions-export/2026-10-03.json

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
if (APPLY && !EXPORT) fail("--apply needs --export <file>: every value is exported before it is removed.");
if (APPLY && !resolve(EXPORT).startsWith(resolve("service-actions-export"))) {
  fail("--export must be under service-actions-export/, which git ignores.");
}

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { listStudios, updateStudio } = await import("@/modules/main/studios");
const { sectionsAsStored, collectionsForKey, readCol, updateRow } = await import("@/platform/db/sections");
const { REG, ENG } = await import("@/platform/db/keys");
const { readArr, editArr, editJSON, getJSON, zRange } = await import("@/platform/db/store");

// The row fields to clear, per collection. A field's PRESENCE is what counts:
// createTicket wrote `serviceIds` on every ticket and createItem `scope: []` on
// every item, so an empty list is the common case and is still stored.
const ROW_FIELDS = {
  salesTickets: ["serviceIds"],
  rfqs: ["serviceIds"],
  quotations: ["serviceIds"],
  inventoryItems: ["scope"],
};
const STUDIO_FIELDS = ["serviceActions", "retiredServiceActions"];
const KPI_FIELDS = ["action"];
const DEAL_KPI_FIELDS = ["action", "source"];

const has = (obj, fields) => fields.filter((k) => obj && Object.prototype.hasOwnProperty.call(obj, k));
const pick = (obj, fields) => Object.fromEntries(has(obj, fields).map((k) => [k, obj[k]]));

async function scan() {
  const studios = await listStudios();
  const found = { studios: [], rows: [], kpis: [], deals: [] };
  for (const studio of studios) {
    if (has(studio, STUDIO_FIELDS).length) found.studios.push({ studio, values: pick(studio, STUDIO_FIELDS) });
    for (const section of await sectionsAsStored(studio.id)) {
      for (const [collection, fields] of Object.entries(ROW_FIELDS)) {
        if (!collectionsForKey(section.key).includes(collection)) continue;
        for (const row of await readCol(studio.id, section.id, collection)) {
          if (has(row, fields).length) found.rows.push({ studio, section, collection, row, values: pick(row, fields) });
        }
      }
    }
    for (const dealId of await zRange(ENG.index(studio.id), 0, -1)) {
      const deal = await getJSON(ENG.root(studio.id, dealId));
      const carried = (deal?.kpis || []).filter((k) => has(k, DEAL_KPI_FIELDS).length);
      if (carried.length) found.deals.push({ studio, dealId, values: carried.map((k) => ({ id: k.id, ...pick(k, DEAL_KPI_FIELDS) })) });
    }
  }
  for (const def of await readArr(REG.erpKpis)) {
    if (has(def, KPI_FIELDS).length) found.kpis.push({ id: def.id, values: pick(def, KPI_FIELDS) });
  }
  return { studios, found };
}

const total = (f) => f.studios.length + f.rows.length + f.kpis.length + f.deals.length;

const { studios, found } = await scan();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);
for (const studio of studios) {
  const key = studio.slug || studio.id;
  const pool = found.studios.find((x) => x.studio.id === studio.id);
  const rows = found.rows.filter((x) => x.studio.id === studio.id);
  const deals = found.deals.filter((x) => x.studio.id === studio.id);
  const per = Object.keys(ROW_FIELDS).map((c) => `${rows.filter((r) => r.collection === c).length} ${c}`).join(", ");
  const actions = pool ? (pool.values.serviceActions || []).length + (pool.values.retiredServiceActions || []).length : 0;
  console.log(`  ${key.padEnd(28)} pool: ${pool ? `${actions} action(s)` : "none"} · rows: ${per} · deals with tagged KPIs: ${deals.length}`);
}
console.log(`\n  KPI declarations naming an action: ${found.kpis.length}`);
console.log(`\nTo clear: ${found.studios.length} studio pool(s), ${found.rows.length} row(s), ${found.kpis.length} declaration(s), ${found.deals.length} deal(s).`);

if (!APPLY) {
  console.log("(dry run — nothing written; re-run with --apply --export service-actions-export/<file>.json)\n");
  process.exit(0);
}

mkdirSync(dirname(resolve(EXPORT)), { recursive: true });
writeFileSync(EXPORT, JSON.stringify({
  exportedAt: new Date().toISOString(),
  namespace: prefix || "(LIVE)",
  studios: found.studios.map((x) => ({ studioId: x.studio.id, slug: x.studio.slug, ...x.values })),
  rows: found.rows.map((x) => ({ studioId: x.studio.id, sectionId: x.section.id, collection: x.collection, rowId: x.row.id, ...x.values })),
  kpis: found.kpis,
  deals: found.deals.map((x) => ({ studioId: x.studio.id, dealId: x.dealId, kpis: x.values })),
}, null, 1));
console.log(`Exported ${total(found)} record(s) to ${EXPORT}`);

const strip = (obj, fields) => {
  const out = { ...obj };
  for (const k of fields) delete out[k];
  return out;
};

let cleared = 0;
for (const x of found.studios) {
  // A FUNCTION patch, re-applied on every compare-and-set attempt (invariant 8),
  // setting each field to undefined — which the stored JSON drops.
  const out = await updateStudio(x.studio.id, () => Object.fromEntries(STUDIO_FIELDS.map((k) => [k, undefined])));
  if (out) cleared += 1;
}
for (const x of found.rows) {
  const fields = ROW_FIELDS[x.collection];
  const out = await updateRow(x.studio.id, x.section.id, x.collection, x.row.id,
    () => Object.fromEntries(fields.map((k) => [k, undefined])));
  if (out) cleared += 1;
}
if (found.kpis.length) {
  const ids = new Set(found.kpis.map((k) => k.id));
  await editArr(REG.erpKpis, (rows) => ({
    next: rows.map((r) => (ids.has(r.id) ? strip(r, KPI_FIELDS) : r)),
    result: undefined,
  }));
  cleared += found.kpis.length;
}
for (const x of found.deals) {
  await editJSON(ENG.root(x.studio.id, x.dealId), (current) => {
    if (!current) return { result: undefined };
    return { next: { ...current, kpis: (current.kpis || []).map((k) => strip(k, DEAL_KPI_FIELDS)) }, result: undefined };
  });
  cleared += 1;
}
console.log(`Cleared ${cleared} record(s)`);

const { found: left } = await scan();
if (total(left)) fail(`${total(left)} record(s) still store a service action.`);
console.log("Re-scan: nothing stores a service action.\n");
process.exit(0);
