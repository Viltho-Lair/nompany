import { route } from "@/platform/http/route";
import { plannerContext } from "@/modules/operations/operations";
import { listTemplates, createTemplate } from "@/modules/operations/planner";
import { requirePermission } from "@/platform/access";
import { studioLocale } from "@/shared/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE STUDIO'S WBS TEMPLATES — the presets a new plan starts from. Listed through
// the planner's own door (operations.planner), seeded from the built-in set on
// first read, and created with the edit right — a template is edited in the
// planner exactly like a plan (see the [templateId] route).
const spec = { auth: "studio", context: plannerContext, name: "operations-planner/templates" };

export const GET = route({ ...spec, body: false }, async (c) => ({
  // The seed writes stored documents, so it needs the studio's language —
  // not the reader's, which is a per-person override and would make the
  // first person to open the screen decide what everyone else sees.
  templates: await listTemplates(c.studio.id, studioLocale(c.studio)),
  canEdit: c.canManage,
}));

export const POST = route({ ...spec, body: true }, async (c) => {
  const denied = requirePermission(c.access, "operations.planner.edit");
  if (denied) return denied;
  const { templateId } = await createTemplate(c.studio.id, c.body?.name);
  return { status: 201, body: { ok: true, templateId } };
});
