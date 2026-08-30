import { route, refused } from "@/platform/http/route";
import { inventoryContext } from "@/modules/inventory/inventory";
import { trackShipment, updateShipment, removeShipment } from "@/modules/inventory/awbTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shipments are read through the section's main GET; this route only writes
// them, and writing needs the Manage grant on the AWB sub-section specifically
// rather than the coarse Inventory one.
const spec = { auth: "studio", context: inventoryContext, body: true, name: "logistics-shipments" };
const manageable = (inv: { canManageAwb: boolean }) => (inv.canManageAwb ? null : { error: "read-only" });

// Start following a waybill. An invalid number comes back with the arithmetic
// reason, so the field can say what is actually wrong with it.
export const POST = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;

  const result = await trackShipment(inv, inv.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, shipment: result.shipment } };
});

// Edit the shipment's details, or append one movement to its timeline.
export const PUT = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await updateShipment(inv, inv.body.id, inv.body);
  if (refused(result)) return result;
  return { ok: true, shipment: result.shipment };
});

export const DELETE = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await removeShipment(inv, inv.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
