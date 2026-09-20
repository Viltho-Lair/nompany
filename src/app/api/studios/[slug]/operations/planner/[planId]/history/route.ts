import { route } from "@/platform/http/route";
import { plannerContext } from "@/modules/operations/operations";
import { planHistory } from "@/modules/operations/planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT HAS BEEN DONE TO THIS PLAN, through the planner app's door. Its own
// route rather than a field on the plan GET: the history is read when somebody
// opens the panel, and a plan is loaded on every visit — carrying two hundred
// entries into a request nobody asked them of would be paid on every open.
//
// It answers to the same right that opens the plan. Who changed a task is part
// of the plan, not a separate power, and a right nothing else grants would be
// one nobody thinks to give (invariant 16).
const spec = { auth: "studio", context: plannerContext, body: false, name: "projects-plan/history" };

export const GET = route(spec, async (c) => ({ entries: await planHistory(c.studio.id, c.params.planId) }));
