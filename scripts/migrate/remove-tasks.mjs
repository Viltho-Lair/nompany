// REMOVE THE OLD TASKS BOARD (CLI) — the second, DESTRUCTIVE half of the owner's
// instruction of 19/09/2026: "replace tasks with approvals, then delete all
// tasks". tasks-to-approvals.mjs is the first half and must have run.
//
//   node scripts/migrate/remove-tasks.mjs [--studio ID] [--apply --export FILE] [--allow-live]
//
// WHAT IT DELETES, per studio: every row in the `tasks` collection, then the
// `tasks` and `tasks-settings` section rows themselves (the settings — who held
// each authority — live on the latter's own row, so they go with it).
//
// INVARIANT 17, IN FULL. Nothing here runs without the owner confirming it
// TWICE in the same exchange — the plan, then the run with its exact scope
// spelled out. And when it runs:
//   • EXPORT FIRST. --apply refuses without --export FILE, and every task and
//     both settings rows for every studio in scope are written to that file
//     BEFORE the first delete.
//   • BY EXPLICIT ID. Tasks are removed one id at a time from the list just
//     read, never by a predicate or a prefix.
//   • RE-SCAN TO PROVE IT. A studio whose tasks read back non-empty stops the
//     run before its sections are touched.
//   • The sections go through cascade.ts (invariant 11), once their rows are
//     already gone, so the cascade has nothing left to reap but the two rows.
//
// TWO REFUSALS BEFORE ANYTHING IS READ FOR DELETION:
//   • Tasks still declared in SECTION_DEFS — the next read of the section list
//     would plant the rows straight back (plantMissingSections). The code that
//     removes the board must be deployed first.
//   • A task with no approval of its id — it was never converted, and deleting
//     it would lose it. The whole studio is skipped, loudly.
//
// DRY-RUN BY DEFAULT: without --apply it reads and reports what it would do.
//
// DELETED WITH THE REST OF THE OLD BOARD once it has run on every studio.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALLOW_LIVE = argv.includes("--allow-live");
const arg = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] || "" : "";
};
const ONE_STUDIO = arg("--studio");
const EXPORT = arg("--export");

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
if (APPLY && !EXPORT) {
  console.error("Refusing --apply without --export FILE: every task is exported before the first delete.");
  process.exit(1);
}
if (APPLY && existsSync(EXPORT)) {
  console.error(`Refusing to overwrite ${EXPORT} — an earlier export is evidence; name a new file.`);
  process.exit(1);
}

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { SECTION_DEFS } = await import("@/platform/db/keys");
if (SECTION_DEFS.some((d) => d.key === "tasks")) {
  console.error(
    "Refusing: `tasks` is still declared in SECTION_DEFS, so the next read of any\n"
    + "studio's section list would plant the rows this removes straight back.\n"
    + "Deploy the code that removes the board first.\n",
  );
  process.exit(1);
}

const { listStudios } = await import("@/modules/main/studios");
const { getSectionByKey } = await import("@/platform/db/sections");
const { cascadeDeleteSection } = await import("@/platform/db/cascade");
const { repo } = await import("@/platform/db/repo");

const OldTasks = repo("tasks");
const Approvals = repo("approvals");

const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);

// ---- read everything first -------------------------------------------------
const plan = [];
let skipped = 0;
for (const studio of studios) {
  const id = String(studio.id || "");
  if (!id) continue;
  const name = studio.slug || id;
  const tasksSection = await getSectionByKey(id, "tasks");
  const settingsSection = await getSectionByKey(id, "tasks-settings");
  if (!tasksSection && !settingsSection) continue;

  const tasks = tasksSection ? await OldTasks.find({ studio: { id }, section: tasksSection }) : [];
  const approvalsSection = await getSectionByKey(id, "approvals");
  const converted = approvalsSection
    ? new Set((await Approvals.find({ studio: { id }, section: approvalsSection })).map((a) => String(a.id)))
    : new Set();
  const unconverted = tasks.filter((t) => !converted.has(String(t.id)));
  if (unconverted.length) {
    skipped += 1;
    console.log(`  ${name}\n    SKIPPED — ${unconverted.length} of ${tasks.length} task(s) have no approval yet; run tasks-to-approvals.mjs first`);
    continue;
  }
  plan.push({ id, name, tasksSection, settingsSection, tasks });
  console.log(`  ${name}\n    ${tasks.length} task(s), every one converted; sections: ${[tasksSection && "tasks", settingsSection && "tasks-settings"].filter(Boolean).join(", ")}`);
}

const taskCount = plan.reduce((n, p) => n + p.tasks.length, 0);
console.log(`\nStudios to clear : ${plan.length}${skipped ? `  (${skipped} skipped — not fully converted)` : ""}`);
console.log(`Tasks to delete  : ${taskCount}`);
console.log(`Section rows     : ${plan.reduce((n, p) => n + (p.tasksSection ? 1 : 0) + (p.settingsSection ? 1 : 0), 0)}`);

if (!APPLY) {
  console.log("\n(dry run — nothing exported, nothing deleted; re-run with --apply --export FILE)\n");
  process.exit(0);
}

// ---- export, then delete ---------------------------------------------------
writeFileSync(EXPORT, JSON.stringify({
  exportedAt: new Date().toISOString(),
  namespace: prefix || "(LIVE)",
  studios: plan.map((p) => ({
    studioId: p.id, slug: p.name,
    tasksSection: p.tasksSection, settingsSection: p.settingsSection, tasks: p.tasks,
  })),
}, null, 2));
console.log(`\nExported ${taskCount} task(s) from ${plan.length} studio(s) to ${EXPORT}`);

let deleted = 0;
for (const p of plan) {
  const scope = { studio: { id: p.id }, section: p.tasksSection };
  for (const task of p.tasks) {
    if (await OldTasks.remove(scope, String(task.id))) deleted += 1;
  }
  // RE-SCAN TO PROVE IT, before the sections are touched.
  const left = p.tasksSection ? await OldTasks.find(scope) : [];
  if (left.length) {
    console.error(`  ${p.name}: ${left.length} task(s) still read back after the delete — stopping before its sections. Nothing further is touched.`);
    process.exit(1);
  }
  // Children first: the settings row, then the board's own (cascadeDeleteSection
  // would take the child with the parent anyway; asking for it by id first
  // covers a settings row whose parent was never there).
  if (p.settingsSection) await cascadeDeleteSection(p.id, p.settingsSection.id);
  if (p.tasksSection) await cascadeDeleteSection(p.id, p.tasksSection.id);
  const stillThere = (await getSectionByKey(p.id, "tasks")) || (await getSectionByKey(p.id, "tasks-settings"));
  if (stillThere) {
    console.error(`  ${p.name}: a tasks section row still reads back — stopping.`);
    process.exit(1);
  }
  console.log(`  ${p.name}: ${p.tasks.length} task(s) and the board's sections removed, re-scan empty`);
}

console.log(`\nDeleted ${deleted} task(s) from ${plan.length} studio(s). The export is ${EXPORT}.\n`);
process.exit(0);
