import { route } from "@/platform/http/route";
import { inventoryContext } from "@/lib/inventory";
import { createAirline, editAirline, removeAirline } from "@/lib/awbTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The registry that turns a waybill's 3-digit prefix into a carrier. Read
// through the section's main GET; written only here, and writing answers to the
// AWB sub-section's own Manage grant rather than the coarse Inventory one.
const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/awb/airlines" };
const manageable = (inv) => (inv.canManageAwb ? null : { error: "read-only" });

export const POST = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;

  const result = await createAirline(inv, inv.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, airline: result.airline } };
});

export const PUT = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await editAirline(inv, inv.body.id, inv.body);
  if (result.error) return result;
  return { ok: true, airline: result.airline };
});

// A carrier still flying tracked freight can't be removed — those shipments
// would lose the name of who is carrying them. The refusal names them, and that
// list travels back on its own now rather than by hand.
export const DELETE = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await removeAirline(inv, inv.body.id);
  if (result.error) return result;
  return { ok: true };
});
