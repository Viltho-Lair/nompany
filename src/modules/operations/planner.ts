// PROJECT PLANS — the scheduler documents behind the /operations-planner app and
// a project's "Project plan" button. Studio-level storage (see PLAN in keys.ts):
// ONE index of summaries that both the app and a project read (the project
// filters by projectId), and ONE full document per plan. A plan is created FROM
// a project but is not section-scoped, precisely so it stays visible from the
// project with no Operations grant while the app lists every plan under
// Operations. The two access doors resolve to this one store, so the gating
// lives in the two route trees; this module does storage and the create seam.

import { editJSON, editArr, getJSON, delKeys } from "@/platform/db/store";
import { PLAN, ID } from "@/platform/db/keys";
import { listCollaborators } from "@/platform/auth/collaborators";

export type PlanStatus = "on_track" | "at_risk" | "off_track" | "on_hold";

export type PlanSummary = {
  id: string;
  projectId: string;
  projectTitle: string;
  name: string;
  status: PlanStatus;
  // The plan's overall % of completion, cached on the summary so the project it
  // belongs to can show its progress without opening the whole document — the
  // same figure the planner footer reads, computed once on save. It is the ONLY
  // source of a project's progress now (the milestone checklist is gone).
  progress: number;
  createdAt: string;
  updatedAt: string;
  createdByCollaboratorId: string;
};

// A plan is a schedule, not a data lake.
const PLAN_MAX_BYTES = 2_000_000;

// The project's stage does not map one-to-one onto the planner's status vocab —
// the planner tracks schedule health, a project tracks lifecycle — so this is a
// best-effort seed the user adjusts. Only "On Hold" carries across cleanly.
function statusFromStage(stage: string): PlanStatus {
  return stage === "On Hold" ? "on_hold" : "on_track";
}

// THE PLAN'S OVERALL COMPLETION, computed from its leaf tasks the same way the
// planner's own footer weights them: each leaf by its duration (a floor so a
// zero-length row still counts), times how far it is done. Summary rows (any
// task that is somebody's parent) are excluded — they roll up their children, so
// counting both would double them — as are milestones, which are zero-length
// checkpoints, not work. Days are normalised to hours only so the two units are
// comparable; the exact factor washes out of a ratio. A best-effort of the
// client engine's weightedPercent, run server-side so the projects list never
// has to open every plan document to show a bar.
type PlanTask = { id?: string; parentId?: string | null; duration?: number; durationUnit?: string; percentComplete?: number; milestone?: boolean };
export function planProgress(tasks: unknown): number {
  const list = (Array.isArray(tasks) ? tasks : []) as PlanTask[];
  if (!list.length) return 0;
  const parents = new Set(list.map((t) => t?.parentId).filter(Boolean) as string[]);
  const leaves = list.filter((t) => t && !parents.has(String(t.id)) && !t.milestone);
  const pool = leaves.length ? leaves : list.filter((t) => t && !t.milestone);
  if (!pool.length) return 0;
  let weight = 0;
  let weighted = 0;
  for (const t of pool) {
    const raw = Number(t.duration);
    const hours = t.durationUnit === "hours" ? raw : raw * 8;
    const w = Math.max(Number.isFinite(hours) ? hours : 0, 0.25);
    const pc = Math.min(100, Math.max(0, Number(t.percentComplete) || 0));
    weight += w;
    weighted += w * pc;
  }
  return weight ? Math.round(weighted / weight) : 0;
}

export async function listStudioPlans(studioId: string): Promise<PlanSummary[]> {
  const rows = await getJSON<PlanSummary[]>(PLAN.index(studioId));
  return Array.isArray(rows)
    ? [...rows].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    : [];
}

export async function listProjectPlans(studioId: string, projectId: string): Promise<PlanSummary[]> {
  return (await listStudioPlans(studioId)).filter((p) => p.projectId === projectId);
}

// A project's progress reads through its plan — ONE index read for the whole
// projects list, mapping each project to its most-recent plan's cached progress.
// listStudioPlans is newest-first, so the first summary seen for a projectId is
// the one a project opens (ProjectPlanButton also takes plans[0]).
export async function progressByProject(studioId: string): Promise<Map<string, number>> {
  const rows = await listStudioPlans(studioId);
  const map = new Map<string, number>();
  for (const p of rows) {
    if (!p.projectId || map.has(p.projectId)) continue;
    map.set(p.projectId, Number(p.progress) || 0);
  }
  return map;
}

export async function readPlan(studioId: string, planId: string) {
  return (await getJSON<Record<string, unknown>>(PLAN.doc(studioId, planId))) || null;
}

type ProjectForPlan = {
  id: string; title?: string; stage?: string; startDate?: string;
  notes?: string; managerCollaboratorId?: string;
};

/**
 * Create a plan from a project, carrying a COPY of the project's facts into the
 * plan's meta. Seeds ONLY `meta` + empty `tasks` — the scheduling defaults
 * (calendar, resources, zoom…) live in the client store and are filled on
 * hydrate, so they are not duplicated here. Writes the document first, then the
 * index summary: a summary pointing at a document that failed to write would
 * list a plan that cannot open.
 */
export async function createPlanFromProject(studioId: string, project: ProjectForPlan, byCollaboratorId: string) {
  const planId = ID.plan();
  const now = new Date().toISOString();
  const title = String(project.title || "Untitled project");
  const status = statusFromStage(String(project.stage || ""));

  // The owner reads as a NAME, resolved from the manager collaborator, not an id.
  let owner = "";
  const mgr = String(project.managerCollaboratorId || "");
  if (mgr) {
    const person = (await listCollaborators(studioId)).find((c) => String(c.id) === mgr);
    owner = person ? String(person.alias || "") : "";
  }

  const meta = {
    name: title,
    status,
    owner,
    startDate: String(project.startDate || now.slice(0, 10)),
    description: String(project.notes || ""),
  };

  await editJSON(PLAN.doc(studioId, planId), () => ({ next: { meta, tasks: [] } }));

  const summary: PlanSummary = {
    id: planId, projectId: project.id, projectTitle: title,
    name: title, status, progress: 0, createdAt: now, updatedAt: now,
    createdByCollaboratorId: byCollaboratorId,
  };
  await editArr<PlanSummary>(PLAN.index(studioId), (rows) => ({ next: [...rows, summary] }));
  return { planId, summary };
}

/**
 * Create a plan that belongs to NO project — an external schedule started from
 * the planner app itself. Same storage as a project plan (document first, then
 * the index summary), but its `projectId` is blank, so it lists in the app and
 * never surfaces under a project. Seeded with an empty task list; the scheduling
 * defaults are filled on hydrate, client-side, exactly as a project plan's are.
 */
export async function createStandalonePlan(studioId: string, byCollaboratorId: string, rawName?: unknown) {
  const planId = ID.plan();
  const now = new Date().toISOString();
  const name = (String(rawName || "").trim() || "Untitled plan").slice(0, 200);
  const meta = { name, status: "on_track", owner: "", startDate: now.slice(0, 10), description: "" };

  await editJSON(PLAN.doc(studioId, planId), () => ({ next: { meta, tasks: [] } }));

  const summary: PlanSummary = {
    id: planId, projectId: "", projectTitle: "",
    name, status: "on_track", progress: 0, createdAt: now, updatedAt: now,
    createdByCollaboratorId: byCollaboratorId,
  };
  await editArr<PlanSummary>(PLAN.index(studioId), (rows) => ({ next: [...rows, summary] }));
  return { planId, summary };
}

/**
 * Save a plan document (whole-doc set, bounded) and keep the index summary's
 * name/status/updatedAt in step, so the list reflects edits without opening each
 * plan. Refuses a plan that does not exist rather than resurrecting a deleted one.
 */
export async function savePlan(studioId: string, planId: string, plan: unknown) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return { error: "plan" };
  const existing = await getJSON<Record<string, unknown>>(PLAN.doc(studioId, planId));
  if (!existing) return { error: "notfound" };
  if (JSON.stringify(plan).length > PLAN_MAX_BYTES) return { error: "too-large" };
  await editJSON(PLAN.doc(studioId, planId), () => ({ next: plan }));

  const meta = (plan as { meta?: { name?: unknown; status?: unknown } }).meta || {};
  const name = String(meta.name || "").slice(0, 200);
  const status = meta.status as PlanStatus | undefined;
  // Recompute the overall completion from the tasks just saved, so the project's
  // progress bar tracks the plan without opening the document to read it.
  const progress = planProgress((plan as { tasks?: unknown }).tasks);
  const now = new Date().toISOString();
  await editArr<PlanSummary>(PLAN.index(studioId), (rows) => ({
    next: rows.map((r) =>
      r.id === planId ? { ...r, name: name || r.name, status: status || r.status, progress, updatedAt: now } : r),
  }));
  return { ok: true };
}

/**
 * Cascade: when a project is removed, delete its plan DOCUMENTS and drop their
 * summaries from the index — children (the docs) first, registry (the index)
 * last, so a re-run after a crash is idempotent.
 */
export async function removeProjectPlans(studioId: string, projectId: string) {
  const mine = (await listStudioPlans(studioId)).filter((p) => p.projectId === projectId);
  if (!mine.length) return;
  await delKeys(mine.map((p) => PLAN.doc(studioId, p.id)));
  await editArr<PlanSummary>(PLAN.index(studioId), (all) => ({ next: all.filter((p) => p.projectId !== projectId) }));
}
