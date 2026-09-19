// THE OLD TASKS BOARD, CONVERTED INTO APPROVALS (CLI) — the owner, 19/09/2026.
//
// Approvals replaced the Tasks board, and the owner's instruction for what the
// board already holds is: read every task, create an approval for it carrying
// its overall status and each person's own answer, then delete all the tasks.
// This script is the FIRST half — it converts and deletes nothing. The second
// half is remove-tasks.mjs, destructive and gated on its own.
//
//   node scripts/migrate/tasks-to-approvals.mjs [--studio ID] [--apply] [--allow-live]
//
// WHAT EACH TASK BECOMES — `approvalFromTask` (modules/approvals/fromTasks.ts,
// pure and tested in tests/approvals-model.mjs):
//   status   Done → Approved · Open, In progress → Pending · Blocked → Rejected
//   typed    each authority a step, answered by whoever held it at conversion,
//            a signature already given carried as that person's answer
//   by hand  the writer the requester, the assignee the approver, `carried`
//
// THE APPROVAL KEEPS THE TASK'S ID. That is what makes the script safe to
// re-run — a task whose id an approval already has is skipped, so a second
// --apply reports zero — and it needs no field on the approval naming where it
// came from, which the owner's "no trace of Tasks" rules out.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md), and this WRITES:
//   • DRY-RUN BY DEFAULT. Without --apply it only reads and reports.
//   • It refuses the live namespace unless you pass --allow-live, and
//     `NOMPANY_KEY_PREFIX` does NOT sandbox the approval rows it writes: they
//     go to `collection_rows` under the studio's real tenant id.
//   • It names the studios it touches from the registry, never by predicate.
//   • Additive: nothing is overwritten and nothing is deleted.
//
// DELETED WITH THE REST OF THE OLD BOARD once it has run on every studio.

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
const { getSectionByKey, listSections } = await import("@/platform/db/sections");
const { repo } = await import("@/platform/db/repo");
const { approvalFromTask } = await import("@/modules/approvals/fromTasks");

// READ BY NAME. The board's code may already be gone when this runs; its rows
// are still stored under the collection name, and that is all a read needs.
const OldTasks = repo("tasks");
const Approvals = repo("approvals");

// The old settings' { authority: [CollaboratorID] }, read defensively: only
// arrays of non-empty strings survive, so a malformed row routes to nobody
// rather than to garbage.
function holdersOf(section) {
  const raw = section?.settings?.taskAssignees;
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [code, ids] of Object.entries(raw)) {
    if (Array.isArray(ids)) out[code] = ids.map((x) => String(x || "").trim()).filter(Boolean);
  }
  return out;
}

const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);

const totals = { studios: 0, tasks: 0, toConvert: 0, converted: 0, already: 0, byStatus: {}, byType: {} };

for (const studio of studios) {
  const id = String(studio.id || "");
  if (!id) continue;
  const name = studio.slug || id;

  const tasksSection = await getSectionByKey(id, "tasks");
  if (!tasksSection) continue;
  const tasks = await OldTasks.find({ studio: { id }, section: tasksSection });
  if (!tasks.length) continue;
  totals.studios += 1;
  totals.tasks += tasks.length;

  const settingsSection = (await getSectionByKey(id, "tasks-settings")) || tasksSection;
  const holders = holdersOf(settingsSection);

  // THE APPROVALS SECTION IS PLANTED ON THE FIRST READ of the section list
  // (plantMissingSections). A dry run must write nothing, so it only reports
  // the section missing; --apply reads the list, which plants it.
  let approvalsSection = await getSectionByKey(id, "approvals");
  if (!approvalsSection && APPLY) {
    await listSections(id);
    approvalsSection = await getSectionByKey(id, "approvals");
  }
  const existing = approvalsSection
    ? new Set((await Approvals.find({ studio: { id }, section: approvalsSection })).map((a) => String(a.id)))
    : new Set();

  const todo = tasks.filter((t) => !existing.has(String(t.id)));
  totals.already += tasks.length - todo.length;
  if (!todo.length) continue;

  console.log(`  ${name}${approvalsSection ? "" : "  (approvals section not planted yet — --apply plants it)"}`);
  const rows = todo.map((task) => {
    const approval = approvalFromTask(task, holders);
    totals.byStatus[approval.status] = (totals.byStatus[approval.status] || 0) + 1;
    totals.byType[approval.type] = (totals.byType[approval.type] || 0) + 1;
    const people = approval.steps.map((s) => s.approverIds.length).join("+") || "0";
    console.log(`    ${task.id}  ${String(task.type || "(by hand)").padEnd(16)} ${String(task.status || "").padEnd(12)} -> ${approval.type} ${approval.status}, ${approval.steps.length} step(s), approvers ${people}, ${approval.decisions.length} answer(s) carried`);
    return { id: String(task.id), ...approval };
  });
  totals.toConvert += rows.length;

  if (APPLY) {
    if (!approvalsSection) {
      console.log("    BLOCKED — the approvals section could not be planted; nothing written for this studio");
      continue;
    }
    // ONE WRITE PER STUDIO, not one per task: a studio's whole board lands or
    // none of it does, and a re-run picks up exactly what is left.
    await Approvals.createMany({ studio: { id }, section: approvalsSection }, rows);
    totals.converted += rows.length;
  }
}

console.log(`\nStudios with tasks        : ${totals.studios}`);
console.log(`Tasks found               : ${totals.tasks}`);
console.log(`To convert                : ${totals.toConvert}  ${JSON.stringify(totals.byType)}  ${JSON.stringify(totals.byStatus)}`);
console.log(`Already converted (skipped): ${totals.already}`);
if (APPLY) console.log(`Converted                 : ${totals.converted}`);
else console.log("(dry run — nothing written; re-run with --apply to convert)");
console.log("Nothing is deleted. The tasks stay where they are until remove-tasks.mjs runs.\n");
process.exit(0);
