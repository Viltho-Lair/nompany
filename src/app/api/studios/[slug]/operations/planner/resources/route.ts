import { route, refused } from "@/platform/http/route";
import { plannerContext } from "@/modules/operations/operations";
import { readResourceLoad } from "@/modules/projects/resourcePlan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHO IS COMMITTED TO WHAT, ACROSS EVERY PLAN. It sits under the planner because
// that is the grant it answers to and the section its data lives in — the
// question is the schedule read by person instead of by task.
//
// PERMISSION IS ENFORCED IN THE SERVICE. A route can be added and forgotten; the
// function that does the work cannot be reached around.
const spec = { auth: "studio", context: plannerContext, body: false, name: "projects-planner" };

// THE WINDOW COMES FROM THE QUERY, and both ends are optional. No window is "all
// the work there is", which is the right default for a question somebody asks
// before they know which weeks are the problem.
export const GET = route(spec, async (c) => {
  const url = new URL(c.request.url);
  const result = await readResourceLoad(c, {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (refused(result)) return result;
  return {
    ok: true,
    load: result.load,
    // BOTH TRAVEL, so the screen can say the report is partial rather than
    // presenting a truncated answer as the whole picture. A studio planning
    // against a load report that quietly omitted half its schedules would be
    // worse off than one with no report at all.
    plansRead: result.plansRead,
    truncated: result.truncated,
  };
});
