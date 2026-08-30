import { route } from "@/platform/http/route";
import { plannerContext, scheduleFromStudio } from "@/modules/operations/operations";
import { readTemplate, saveTemplateDoc, removeTemplate, planPeople } from "@/modules/operations/planner";
import { requirePermission } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE TEMPLATE, edited in the planner. It returns the SAME shape a plan door
// does — { plan, canEdit, people, workWeek } — so StudioPlanner edits a template
// with no change at all; the difference is only which document the PUT saves to.
const spec = { auth: "studio", context: plannerContext, name: "projects-planner/template" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const plan = await readTemplate(c.studio.id, c.params.templateId);
  if (!plan) return { error: "notfound" };
  return {
    plan,
    canEdit: c.canManage,
    people: await planPeople(c.studio.id),
    workWeek: scheduleFromStudio(c.studio),
  };
});

export const PUT = route({ ...spec, body: true }, async (c) => {
  const denied = requirePermission(c.access, "projects.planner.edit");
  if (denied) return denied;
  return saveTemplateDoc(c.studio.id, c.params.templateId, c.body?.plan);
});

export const DELETE = route({ ...spec, body: false }, async (c) => {
  const denied = requirePermission(c.access, "projects.planner.edit");
  if (denied) return denied;
  return removeTemplate(c.studio.id, c.params.templateId);
});
