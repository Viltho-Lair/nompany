// SERVICE ORDERS INTO JOBS (CLI) — tier 5, "one job system", the owner's
// choice of code + migrate.
//
// The record engine's `job` type ("Service orders") was a second job system
// that dispatch never read, beside the `jobs` collection a crew is dispatched
// from. New studios no longer get the type (platform/engine/builtins.ts). This
// copies an existing studio's service orders into `jobs`, one job each, so the
// dispatch board, the field view and the deal see them.
//
//   node scripts/migrate/service-orders-to-jobs.mjs [--studio ID] [--apply] [--allow-live]
//
// WHAT EACH ONE BECOMES — `jobFromServiceOrder` (modules/operations/planSchedule,
// pure and tested): a `service-job` with the order's state mapped across
// (Logged/Scheduled → scheduled, On site → in-progress, Completed, Cancelled),
// its site as the location, its due or reported date as the start, and every
// field a job has no column for — customer, priority, the fault, the work done,
// the order's own reference — in its notes under their own labels. Each heads
// its OWN field-service deal (Template D), because a service order named no
// deal and a job cannot exist on none (Law 7).
//
// IT DELETES NOTHING. The service orders stay exactly where they are, readable
// in their register. Removing them afterwards is a separate, destructive step
// under invariant 17 — two confirmations, an export first, a delete by explicit
// id list — and is not in this script, on purpose.
//
// IDEMPOTENT: a job carries `migratedFromRecordId`, and a service order a job
// already names is skipped — so --apply is safe to re-run and a second run
// reports zero.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md), and this WRITES:
//   • DRY-RUN BY DEFAULT. Without --apply it only reads and reports.
//   • It refuses the live namespace unless you pass --allow-live, and
//     `NOMPANY_KEY_PREFIX` does NOT sandbox the `jobs` rows it writes: they go
//     to `collection_rows` under the studio's real tenant id. Deals are
//     documents and ARE namespaced.
//   • It names the studios it touches from the registry, never by predicate.

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
const { getSectionByKey } = await import("@/platform/db/sections");
const { repo } = await import("@/platform/db/repo");
const { insertJob } = await import("@/modules/operations/jobs");
const { jobFromServiceOrder } = await import("@/modules/operations/planSchedule");

const Records = repo("engineRecords");
const Jobs = repo("jobs");

const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);

let studiosWithOrders = 0;
let toCopy = 0;
let copied = 0;
let already = 0;
let blocked = 0;

for (const studio of studios) {
  const id = String(studio.id || "");
  if (!id) continue;
  const name = studio.slug || id;

  // A studio with no service-order section never had the type: nothing to do.
  const orderSection = await getSectionByKey(id, "engine-job");
  if (!orderSection) continue;
  const records = await Records.find({ studio: { id }, section: orderSection }, { where: { typeKey: "job" } });
  if (!records.length) continue;
  studiosWithOrders += 1;

  const schedule = await getSectionByKey(id, "field-service-schedule");
  if (!schedule) {
    blocked += 1;
    console.log(`  ${name}\n    BLOCKED — ${records.length} service order(s) but no field-service-schedule section; run plant-sections.mjs first`);
    continue;
  }

  const jobs = await Jobs.find({ studio: { id }, section: schedule });
  const done = new Set(jobs.map((j) => String(j.migratedFromRecordId || "")).filter(Boolean));
  const todo = records.filter((r) => !done.has(String(r.id)));
  already += records.length - todo.length;
  if (!todo.length) continue;

  console.log(`  ${name}`);
  for (const record of todo) {
    const job = jobFromServiceOrder(record);
    console.log(`    ${record.reference || record.id} "${job.title}" ${record.status} -> job (${job.status}), own field-service deal`);
    toCopy += 1;
    if (APPLY) {
      await insertJob({ studio: { id }, section: schedule }, job, { id: "migration", type: "system" });
      copied += 1;
    }
  }
}

console.log(`\nStudios with service orders : ${studiosWithOrders}`);
console.log(`Service orders to copy      : ${toCopy}`);
console.log(`Already copied (skipped)    : ${already}`);
if (blocked) console.log(`Studios blocked             : ${blocked} (missing field-service-schedule — run plant-sections.mjs)`);
if (APPLY) console.log(`Copied                      : ${copied}`);
else console.log("(dry run — nothing written; re-run with --apply to copy)");
console.log("Nothing is deleted. The service orders stay in their register.\n");
process.exit(0);
