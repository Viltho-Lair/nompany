import { route, refused } from "@/platform/http/route";
import { inventoryContext, createOrder, editOrder, receiveOrder, removeOrder } from "@/modules/inventory/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/orders" };
const manageable = (inv: { canManage: boolean }) => (inv.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;

  const result = await createOrder(inv, inv.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, order: result.order } };
});

// Editing an order, or receiving goods against it. Receiving is a PUT with
// `receive` lines because it changes the same record — but it goes through its
// own service call, since it also writes the stock movements.
//
// An `over-receive` refusal carries the itemId and how much of it is still
// outstanding, so the line that is wrong can say so.
export const PUT = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = inv.body.receive
    ? await receiveOrder(inv, inv.body.id, { lines: inv.body.receive })
    : await editOrder(inv, inv.body.id, inv.body);

  if (refused(result)) return result;
  return { ok: true, order: result.order };
});

// Once goods have been received the order explains real movements — cancel it
// rather than deleting the reason those movements exist.
export const DELETE = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await removeOrder(inv, inv.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
