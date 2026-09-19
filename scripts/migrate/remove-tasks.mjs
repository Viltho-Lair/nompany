// REMOVE THE OLD TASKS BOARD (CLI) — the second, DESTRUCTIVE half of the owner's
// instruction of 19/09/2026: "replace tasks with approvals, then delete all
// tasks". tasks-to-approvals.mjs is the first half and must have run.
//
//   node scripts/migrate/remove-tasks.mjs [--studio ID] [--apply --export FILE] [--allow-live]
//
// WHAT IT DELETES, per studio — everything the old board left in stored data,
// so that no trace of it survives (the owner's rule):
//   • every row in the `tasks` collection, each first DETACHED from the deal
//     it was a member of (the engagement layer keeps members per type, and
//     readers walk the registry, so a task left attached would be invisible
//     and still stored);
//   • the rights `tasks.*` from every role and every personal override — the
//     catalogue no longer knows them, and cleanPermissions only drops an
//     unknown right when a role is next saved;
//   • every notification that announced a task or links to the board — they
//     would open a page that no longer exists;
//   • the `task` stage from any flow template a studio saved (Professional
//     Services carried one) — a stage the registry no longer knows renders as
//     nothing and fails the template's own check the next time it is saved;
//   • the `tasks` and `tasks-settings` section rows themselves (the settings —
//     who held each authority — live on the latter's own row, so they go with it).
// And once, platform-wide: any switch for the old board's Nova capabilities in
// the console's Nova config (inert once the capabilities are gone, but stored).
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
const { readArr, editArr, getJSON, editJSON } = await import("@/platform/db/store");
const { S, REG } = await import("@/platform/db/keys");
const { engagementIdFor, detachRecord } = await import("@/platform/db/engagement");

const isTaskRight = (k) => /^tasks\./.test(String(k || ""));
const withoutTaskRights = (list) => (Array.isArray(list) ? list.filter((k) => !isTaskRight(k)) : list);
const overridesHoldTaskRights = (c) => [...(c?.overrides?.allow || []), ...(c?.overrides?.deny || [])].some(isTaskRight);
// A notice about a task, or one whose link opens the board — `tasks` or a path
// under it. Approval notices the board raised link there too.
const isTaskNotice = (n) => n?.type === "task.assigned" || /^tasks(\/|$)/.test(String(n?.href || ""));
const isTaskCapability = (k) => /^(read|action)\.tasks\./.test(String(k || ""));
const FLOW_LISTS = ["stages", "heads", "statusChain", "costDrivers"];
const templateNamesTask = (t) => FLOW_LISTS.some((f) => Array.isArray(t?.[f]) && t[f].includes("task"));
const withoutTaskStage = (t) => Object.fromEntries(Object.entries(t).map(([k, v]) =>
  [k, FLOW_LISTS.includes(k) && Array.isArray(v) ? v.filter((x) => x !== "task") : v]));

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
  const roles = (await readArr(S.roles(id))).filter((r) => (r.permissions || []).some(isTaskRight));
  const people = (await readArr(S.collaborators(id))).filter(overridesHoldTaskRights);
  const notices = (await readArr(S.notifications(id))).filter(isTaskNotice);
  const templates = (await readArr(S.flowTemplates(id))).filter(templateNamesTask);
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
  plan.push({ id, name, tasksSection, settingsSection, tasks, roles, people, notices, templates });
  console.log(`  ${name}\n    ${tasks.length} task(s), every one converted; ${roles.length} role(s) and ${people.length} person(s) holding tasks.* rights; ${notices.length} notification(s); ${templates.length} saved flow template(s) naming a task stage; sections: ${[tasksSection && "tasks", settingsSection && "tasks-settings"].filter(Boolean).join(", ")}`);
}

const taskCount = plan.reduce((n, p) => n + p.tasks.length, 0);
console.log(`\nStudios to clear : ${plan.length}${skipped ? `  (${skipped} skipped — not fully converted)` : ""}`);
console.log(`Tasks to delete  : ${taskCount}`);
console.log(`Section rows     : ${plan.reduce((n, p) => n + (p.tasksSection ? 1 : 0) + (p.settingsSection ? 1 : 0), 0)}`);
console.log(`Roles to strip   : ${plan.reduce((n, p) => n + p.roles.length, 0)}`);
console.log(`People to strip  : ${plan.reduce((n, p) => n + p.people.length, 0)}`);
console.log(`Notifications    : ${plan.reduce((n, p) => n + p.notices.length, 0)}`);
console.log(`Flow templates   : ${plan.reduce((n, p) => n + p.templates.length, 0)}`);
// PLATFORM-WIDE, and only on a full run: the Nova config is one document for
// every studio, so a run scoped to one studio leaves it alone.
const novaConfig = ONE_STUDIO ? null : await getJSON(REG.novaConfig);
const novaSwitches = Object.keys(novaConfig?.enabled || {}).filter(isTaskCapability);
console.log(`Nova switches    : ${novaSwitches.length}${ONE_STUDIO ? " (skipped — a one-studio run leaves platform config alone)" : ""}`);

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
    // The roles and people exactly as they were, so a stripped right can be
    // read back if anybody needs to know who held it.
    roles: p.roles, people: p.people, notices: p.notices, flowTemplates: p.templates,
  })),
  novaSwitches: Object.fromEntries(novaSwitches.map((k) => [k, novaConfig.enabled[k]])),
}, null, 2));
console.log(`\nExported ${taskCount} task(s) from ${plan.length} studio(s) to ${EXPORT}`);

let deleted = 0;
for (const p of plan) {
  const scope = { studio: { id: p.id }, section: p.tasksSection };
  for (const task of p.tasks) {
    // OFF ITS DEAL FIRST, while the row still says what its lineage was.
    const dealId = await engagementIdFor(p.id, "task", String(task.id), {
      ticketId: task.ticketId, quotationId: task.quotationId, projectId: task.projectId,
    });
    if (dealId) await detachRecord(p.id, dealId, "task", String(task.id));
    if (await OldTasks.remove(scope, String(task.id))) deleted += 1;
  }
  // RE-SCAN TO PROVE IT, before the sections are touched.
  const left = p.tasksSection ? await OldTasks.find(scope) : [];
  if (left.length) {
    console.error(`  ${p.name}: ${left.length} task(s) still read back after the delete — stopping before its sections. Nothing further is touched.`);
    process.exit(1);
  }
  // THE RIGHTS, stripped under compare-and-set (invariant 8) — the lists are
  // re-read inside the write, so a role edited meanwhile keeps its edit.
  if (p.roles.length) {
    await editArr(S.roles(p.id), (rows) => ({
      next: rows.map((r) => ((r.permissions || []).some(isTaskRight) ? { ...r, permissions: withoutTaskRights(r.permissions) } : r)),
    }));
  }
  if (p.people.length) {
    await editArr(S.collaborators(p.id), (rows) => ({
      next: rows.map((c) => (overridesHoldTaskRights(c)
        ? { ...c, overrides: { ...c.overrides, allow: withoutTaskRights(c.overrides?.allow || []), deny: withoutTaskRights(c.overrides?.deny || []) } }
        : c)),
    }));
  }
  if (p.notices.length) {
    await editArr(S.notifications(p.id), (rows) => ({ next: rows.filter((n) => !isTaskNotice(n)) }));
  }
  if (p.templates.length) {
    await editArr(S.flowTemplates(p.id), (rows) => ({
      next: rows.map((t) => (templateNamesTask(t) ? withoutTaskStage(t) : t)),
    }));
  }
  const rightsLeft = (await readArr(S.roles(p.id))).some((r) => (r.permissions || []).some(isTaskRight))
    || (await readArr(S.collaborators(p.id))).some(overridesHoldTaskRights)
    || (await readArr(S.notifications(p.id))).some(isTaskNotice)
    || (await readArr(S.flowTemplates(p.id))).some(templateNamesTask);
  if (rightsLeft) {
    console.error(`  ${p.name}: a tasks.* right or a board notification still reads back — stopping before its sections.`);
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
  console.log(`  ${p.name}: ${p.tasks.length} task(s) off their deals and removed, ${p.roles.length} role(s) and ${p.people.length} person(s) stripped, ${p.notices.length} notification(s) removed, sections removed — re-scan empty`);
}

if (novaSwitches.length) {
  await editJSON(REG.novaConfig, (cfg) => {
    if (!cfg) return { result: undefined };
    const enabled = Object.fromEntries(Object.entries(cfg.enabled || {}).filter(([k]) => !isTaskCapability(k)));
    return { next: { ...cfg, enabled } };
  });
  console.log(`\nNova config: ${novaSwitches.length} switch(es) for the old board removed`);
}

console.log(`\nDeleted ${deleted} task(s) from ${plan.length} studio(s). The export is ${EXPORT}.\n`);
process.exit(0);
