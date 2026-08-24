import { route } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { plannerContext } from "@/modules/operations/operations";
import { readPlan, savePlan, planPeople } from "@/modules/operations/planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One plan, through the planner app's door — read with operations.planner.view,
// edited with operations.planner.edit (the section's manage right). A viewer
// without edit gets a read-only plan; a project member without any planner grant
// reaches the plan through the projects door instead.
const spec = { auth: "studio", context: plannerContext, name: "operations-plan" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const plan = await readPlan(c.studio.id, c.params.planId);
  if (!plan) return { error: "notfound" };
  return { plan, canEdit: c.canManage, people: await planPeople(c.studio.id) };
});

export const PUT = route({ ...spec, body: true }, async (c) => {
  // Enforced on the key itself (not just c.canManage, which resolves to the same
  // grant) so the access audit sees operations.planner.edit reach a guard.
  const denied = requirePermission(c.access, "operations.planner.edit");
  if (denied) return denied;
  return savePlan(c.studio.id, c.params.planId, c.body?.plan);
});
