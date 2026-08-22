import { route } from "@/platform/http/route";
import { inventoryContext, createDelivery, issueDelivery, removeDelivery } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/deliveries" };
const manageable = (inv) => (inv.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;

  const result = await createDelivery(inv, inv.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, delivery: result.delivery } };
});

// Issuing a delivery note is what takes the stock out. Availability is checked
// against the ledger at this moment, not when the note was drafted — so an
// `insufficient` refusal carries `short`, the quantity actually missing.
export const PUT = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await issueDelivery(inv, inv.body.id);
  if (result.error) return result;
  return { ok: true, delivery: result.delivery };
});

export const DELETE = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await removeDelivery(inv, inv.body.id);
  if (result.error) return result;
  return { ok: true };
});
