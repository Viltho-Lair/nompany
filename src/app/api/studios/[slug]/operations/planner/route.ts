import { route } from "@/platform/http/route";
import { operationsContext } from "@/modules/operations/operations";
import { listStudioPlans } from "@/modules/operations/planner";
import { can } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PLANNER APP'S DOOR. It resolves through operationsContext, so the
// operations section grant is what opens it — the app lists every plan in the
// studio. Editing in the app needs the ability to manage Operations; a project's
// own plans are reached instead through the projects door, which needs no
// Operations grant at all. (A dedicated operations.planner.* right is deferred to
// avoid changing the access catalogue now — see the integration doc.)
const spec = { auth: "studio", context: operationsContext, name: "operations-planner" };

export const GET = route({ ...spec, body: false }, async (c) => ({
  plans: await listStudioPlans(c.studio.id),
  canEdit: can(c.access, "operations.tracking.edit") || can(c.access, "operations.settings.edit"),
}));
