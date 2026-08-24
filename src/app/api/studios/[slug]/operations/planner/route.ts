import { route } from "@/platform/http/route";
import { plannerContext } from "@/modules/operations/operations";
import { listStudioPlans, createStandalonePlan } from "@/modules/operations/planner";
import { requirePermission } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PLANNER APP'S DOOR. It resolves on the planner's own section, so the
// operations.planner grant is what opens it — the same grant the [planId] route
// checks, so what lists a plan and what edits it can never disagree. The app
// lists every plan in the studio; a project's own plans are reached instead
// through the projects door, which needs no planner grant at all.
const spec = { auth: "studio", context: plannerContext, name: "operations-planner" };

export const GET = route({ ...spec, body: false }, async (c) => ({
  plans: await listStudioPlans(c.studio.id),
  canEdit: c.canManage,
}));

// CREATE AN EXTERNAL PLAN — one that belongs to no project. A project's plan is
// born from the project (through the projects door); this is the other origin,
// the planner app starting a schedule of its own. Guarded on the edit right the
// key itself carries, so the audit sees operations.planner.edit reach a door.
export const POST = route({ ...spec, body: true }, async (c) => {
  const denied = requirePermission(c.access, "operations.planner.edit");
  if (denied) return denied;
  const { planId } = await createStandalonePlan(c.studio.id, c.collaborator.id, c.body?.name);
  return { planId };
});
