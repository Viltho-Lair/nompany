import { route } from "@/platform/http/route";
import { operationsContext } from "@/modules/operations/operations";
import { readPlan, savePlan } from "@/modules/operations/planner";
import { can } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One plan, through the operations door — read and edited in the planner app.
// Editing is allowed when the person can manage Operations; a viewer without
// that manages a read-only plan, and a project member without any Operations
// grant reaches the plan through the projects door instead.
const spec = { auth: "studio", context: operationsContext, name: "operations-plan" };
const canEditOps = (access: Parameters<typeof can>[0]) =>
  can(access, "operations.tracking.edit") || can(access, "operations.settings.edit");

export const GET = route({ ...spec, body: false }, async (c) => {
  const plan = await readPlan(c.studio.id, c.params.planId);
  if (!plan) return { error: "notfound" };
  return { plan, canEdit: canEditOps(c.access) };
});

export const PUT = route({ ...spec, body: true }, async (c) => {
  if (!canEditOps(c.access)) return { error: "read-only" };
  return savePlan(c.studio.id, c.params.planId, c.body?.plan);
});
