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

export async function listStudioPlans(studioId: string): Promise<PlanSummary[]> {
  const rows = await getJSON<PlanSummary[]>(PLAN.index(studioId));
  return Array.isArray(rows)
    ? [...rows].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    : [];
}

export async function listProjectPlans(studioId: string, projectId: string): Promise<PlanSummary[]> {
  return (await listStudioPlans(studioId)).filter((p) => p.projectId === projectId);
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
    name: title, status, createdAt: now, updatedAt: now,
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
  const now = new Date().toISOString();
  await editArr<PlanSummary>(PLAN.index(studioId), (rows) => ({
    next: rows.map((r) =>
      r.id === planId ? { ...r, name: name || r.name, status: status || r.status, updatedAt: now } : r),
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
