import { route } from "@/platform/http/route";
import { projectsContext, listProjects } from "@/modules/projects/projects";
import { listProjectPlans, createPlanFromProject } from "@/modules/operations/planner";
import { requirePermission, can } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PROJECTS DOOR ONTO PLANS — this is why the "Project plan" button needs no
// Operations grant. It resolves through projectsContext, so the projects-list
// grant governs it: a project lists and creates ITS OWN plans here. Editing a
// plan still happens in the planner app (the operations door); this door creates
// and lists, and the sibling [planId] route reads view-only.
const spec = { auth: "studio", context: projectsContext, name: "project-plans" };

export const GET = route({ ...spec, body: false }, async (c) => ({
  plans: await listProjectPlans(c.studio.id, c.params.projectId),
  canCreate: can(c.access, "projects.list.edit"),
}));

// Clicking "Project plan" immediately creates a plan carrying a COPY of the
// project's facts into the plan's meta (see createPlanFromProject).
export const POST = route({ ...spec, body: true }, async (c) => {
  const denied = requirePermission(c.access, "projects.list.edit");
  if (denied) return denied;
  const project = (await listProjects(c)).find((p) => p.id === c.params.projectId);
  if (!project) return { error: "notfound" };
  const { planId } = await createPlanFromProject(c.studio.id, project, c.collaborator.id);
  return { status: 201, body: { ok: true, planId } };
});
