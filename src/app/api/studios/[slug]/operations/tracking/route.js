import { route } from "@/platform/http/route";
import { operationsContext, reportPosition, clearPosition } from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NO canManage CHECK on either of these, deliberately.
//
// Reporting YOUR OWN position is not a privileged act, it is a personal one, and
// the collaborator id comes from the session rather than the body — so nobody
// can place someone else on the map whatever they send. Clearing follows the
// same rule in reverse: your own always, somebody else's needs the Manage grant
// on Tracking, which clearPosition asks for itself. That is the grant you need
// when a phone is left logged in on a desk.
const spec = { auth: "studio", context: operationsContext, body: true, name: "operations/tracking" };

export const POST = route(spec, async (ops) => {
  const result = await reportPosition(ops, ops.body);
  if (result.error) return result;
  return { ok: true, position: result.position };
});

export const DELETE = route(spec, async (ops) => {
  const result = await clearPosition(ops, ops.body.collaboratorId);
  if (result.error) return result;
  return { ok: true };
});
