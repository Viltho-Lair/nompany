import { route } from "@/platform/http/route";
import { projectsContext } from "@/modules/projects/projects";
import { listProjectPlans, planHistory } from "@/modules/operations/planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The same history, through the PROJECTS door — see the plan route beside this
// one for why both doors exist. The plan must be one of THIS project's, or a
// member of one project could read another's by guessing an id.
const spec = { auth: "studio", context: projectsContext, body: false, name: "project-plan/history" };

export const GET = route(spec, async (c) => {
  const mine = await listProjectPlans(c.studio.id, c.params.projectId);
  if (!mine.some((p) => p.id === c.params.planId)) return { error: "notfound" };
  return { entries: await planHistory(c.studio.id, c.params.planId) };
});
