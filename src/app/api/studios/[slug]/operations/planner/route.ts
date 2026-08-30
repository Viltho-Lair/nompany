import { route } from "@/platform/http/route";
import { plannerContext } from "@/modules/operations/operations";
import { listStudioPlans, createStandalonePlan, savePlannerPresets } from "@/modules/operations/planner";
import { requirePermission } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PLANNER APP'S DOOR. It resolves on the planner's own section, so the
// operations.planner grant is what opens it — the same grant the [planId] route
// checks, so what lists a plan and what edits it can never disagree. The app
// lists every plan in the studio; a project's own plans are reached instead
// through the projects door, which needs no planner grant at all.
const spec = { auth: "studio", context: plannerContext, name: "projects-planner" };

// `presets` are the new-plan defaults (calendar, resources, zoom, colorBy) the
// studio configures here — plannerContext reads them off the section's settings.
export const GET = route({ ...spec, body: false }, async (c) => ({
  plans: await listStudioPlans(c.studio.id),
  canEdit: c.canManage,
  presets: c.presets,
}));

// CREATE AN EXTERNAL PLAN — one that belongs to no project. A project's plan is
// born from the project (through the projects door); this is the other origin,
// the planner app starting a schedule of its own. Guarded on the edit right the
// key itself carries, so the audit sees operations.planner.edit reach a door.
export const POST = route({ ...spec, body: true }, async (c) => {
  const denied = requirePermission(c.access, "projects.planner.edit");
  if (denied) return denied;
  const { planId } = await createStandalonePlan(c.studio.id, c.collaborator.id, c.body?.name);
  return { planId };
});

// SAVE THE NEW-PLAN PRESETS. Whole-object set of the four preset fields onto the
// section's settings — the same edit right as creating a plan, so what sets the
// defaults and what starts a plan from them stay one grant.
export const PUT = route({ ...spec, body: true }, async (c) => {
  const denied = requirePermission(c.access, "projects.planner.edit");
  if (denied) return denied;
  return savePlannerPresets(c.studio.id, c.body?.presets);
});
