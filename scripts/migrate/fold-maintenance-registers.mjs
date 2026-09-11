// ONE-OFF FOLD (CLI) — the three old maintenance registers into Maintenance.
//
//   Field Service → Maintenance contracts           → Maintenance → Service contracts (SLA)
//   Field Service → Preventive maintenance plans    → Maintenance → Preventive plans
//   Assets        → Maintenance                     → Maintenance → Work orders
//
//   node scripts/migrate/fold-maintenance-registers.mjs [--studio ID] [--apply] [--allow-live]
//
// The owner's instruction, 11/09/2026: an SLA is a preventive maintenance
// contract, so maintenance lives in one place. New studios never get the three
// old registers (builtins.ts); this brings an EXISTING studio's records across.
// What each record becomes is modules/maintenance/legacy (pure, tested); the
// reading and writing is modules/maintenance/fold.
//
// COPIES, NEVER DELETES. The engine records stay where they are; a Field
// Service plan still Active or Paused is set Retired so it stops raising
// dispatch jobs; the three registers are switched OFF (Studio settings →
// Sections undoes it). Idempotent: a record already folded is skipped.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md), and this WRITES:
//   • DRY-RUN BY DEFAULT. Without --apply it only reads and reports — not even
//     the section catch-up a normal read performs.
//   • It refuses the live namespace unless NOMPANY_KEY_PREFIX is set or
//     --allow-live is passed.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALLOW_LIVE = argv.includes("--allow-live");
const ONE_STUDIO = (() => {
  const i = argv.indexOf("--studio");
  return i >= 0 ? argv[i + 1] : "";
})();

try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI or an already-exported shell */ }

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — nothing to read from.");
  process.exit(1);
}

const prefix = process.env.NOMPANY_KEY_PREFIX || "";
if (!prefix && !ALLOW_LIVE) {
  console.error(
    "Refusing to run against the LIVE namespace.\n\n"
    + "  Set NOMPANY_KEY_PREFIX to work in a sandbox, or pass --allow-live\n"
    + "  once you have read a dry run and mean it.\n",
  );
  process.exit(1);
}

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { listStudios } = await import("@/modules/main/studios");
const { foldStudio } = await import("@/modules/maintenance/fold");

const today = new Date().toISOString().slice(0, 10);
const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);

const totals = { studios: 0, contracts: 0, plans: 0, orders: 0, retired: 0 };
for (const studio of studios) {
  const r = await foldStudio(studio.id, { apply: APPLY, today });
  const anything = r.contracts.length || r.plans.length || r.orders.length || r.retiredPlans || r.registersOff.length;
  if (!anything) continue;
  totals.studios += 1;
  totals.contracts += r.contracts.length;
  totals.plans += r.plans.length;
  totals.orders += r.orders.length;
  totals.retired += r.retiredPlans;
  console.log(`  ${studio.slug || studio.id}${r.skipped ? `  (${r.skipped})` : ""}`);
  for (const l of r.contracts) console.log(`    contract  ${l}`);
  for (const l of r.plans) console.log(`    plan      ${l}`);
  for (const l of r.orders) console.log(`    order     ${l}`);
  if (r.retiredPlans) console.log(`    ${r.retiredPlans} Field Service plan(s) set Retired`);
  if (r.registersOff.length) console.log(`    registers switched off: ${r.registersOff.join(", ")}`);
}

console.log(`\nStudios with something to fold : ${totals.studios}`);
console.log(`Service contracts              : ${totals.contracts}`);
console.log(`Preventive plans               : ${totals.plans}`);
console.log(`Work orders                    : ${totals.orders}`);
console.log(`Old plans retired              : ${totals.retired}`);
if (!APPLY) console.log("(dry run — nothing written; re-run with --apply to fold)");
console.log("");
process.exit(0);
