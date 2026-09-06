import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { projectsContext } from "@/modules/projects/projects";
import {
  listProjectBilling, addProjectMilestone, editProjectMilestone,
  removeProjectMilestone, saveRetention,
} from "@/modules/projects/milestones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `name` IS THE SECTION KEY THE AUDIT TRAIL READS BY. A payment schedule lives
// with the project it belongs to, so it names the project list's own section —
// the same reasoning the cost breakdown's route states.
const spec = { auth: "studio", context: projectsContext, body: true, name: "projects-list" };

export const GET = route({ ...spec, body: false }, async (projects) => {
  const projectId = new URL(projects.request.url).searchParams.get("projectId") || "";
  const result = await listProjectBilling(projects, projectId);
  if (refused(result)) return result;

  return {
    ok: true,
    project: result.project,
    milestones: result.milestones,
    billing: result.billing,
    // THE CLOCK TRAVELS WITH THE ANSWER, so "is this line overdue" is measured
    // from one instant rather than from whenever the screen rendered.
    asOf: result.asOf,
    // THE RIGHTS TRAVEL WITH THE ANSWER, so the screen draws a control only
    // where the service would accept what is behind it.
    canCreate: !requirePermission(projects.access, "projects.billing.create"),
    canEdit: !requirePermission(projects.access, "projects.billing.edit"),
    canDelete: !requirePermission(projects.access, "projects.billing.delete"),
  };
});

export const POST = route(spec, async (projects) => {
  const result = await addProjectMilestone(projects, projects.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, milestone: result.milestone } };
});

export const PUT = route(spec, async (projects) => {
  // THE RETENTION TERMS ARE A DIFFERENT RECORD, so they are a different branch
  // rather than a milestone edit with unfamiliar keys: they write to the
  // PROJECT, and routing them through the line editor would mean a body that
  // named a milestone id and changed something else entirely.
  if (projects.body.retention) {
    const saved = await saveRetention(
      projects, String(projects.body.projectId || ""), projects.body);
    if (refused(saved)) return saved;
    return { ok: true, project: saved.project };
  }

  if (!projects.body.id) return { error: "missing" };
  const result = await editProjectMilestone(projects, String(projects.body.id), projects.body);
  if (refused(result)) return result;
  return { ok: true, milestone: result.milestone };
});

export const DELETE = route(spec, async (projects) => {
  if (!projects.body.id) return { error: "missing" };
  const result = await removeProjectMilestone(projects, String(projects.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
