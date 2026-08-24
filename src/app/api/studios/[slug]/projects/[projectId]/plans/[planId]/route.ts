import { route } from "@/platform/http/route";
import { projectsContext } from "@/modules/projects/projects";
import { listProjectPlans, readPlan, savePlan, planPeople } from "@/modules/operations/planner";
import { requirePermission, can } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One plan, through the PROJECTS door — so a project member reaches (and, if they
// may edit the project, works on) the plan with no Operations grant at all. The
// operations door serves the cross-project planner app; this door serves the
// plan a project owns. Both edit; they differ only in what they can see.
const spec = { auth: "studio", context: projectsContext, name: "project-plan" };

// The plan must be one of THIS project's plans: a plan opened through a project
// rides that project's grant, so a projects-list member cannot reach another
// project's plan by guessing an id at this URL.
async function ownsPlan(studioId: string, projectId: string, planId: string) {
  return (await listProjectPlans(studioId, projectId)).some((p) => p.id === planId);
}

export const GET = route({ ...spec, body: false }, async (c) => {
  if (!(await ownsPlan(c.studio.id, c.params.projectId, c.params.planId))) return { error: "notfound" };
  const plan = await readPlan(c.studio.id, c.params.planId);
  if (!plan) return { error: "notfound" };
  return { plan, canEdit: can(c.access, "projects.list.edit"), people: await planPeople(c.studio.id) };
});

export const PUT = route({ ...spec, body: true }, async (c) => {
  const denied = requirePermission(c.access, "projects.list.edit");
  if (denied) return denied;
  if (!(await ownsPlan(c.studio.id, c.params.projectId, c.params.planId))) return { error: "notfound" };
  return savePlan(c.studio.id, c.params.planId, c.body?.plan);
});
