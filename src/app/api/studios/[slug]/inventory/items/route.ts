import { route, refused } from "@/platform/http/route";
import { inventoryContext, createItem, editItem, removeItem } from "@/modules/inventory/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/items" };
const manageable = (inv: { canManage: boolean }) => (inv.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;

  const result = await createItem(inv, inv.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, item: result.item } };
});

export const PUT = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await editItem(inv, inv.body.id, inv.body);
  if (refused(result)) return result;
  return { ok: true, item: result.item };
});

// An item that has moved keeps its history — deleting it would erase the record
// of stock that really came in or went out. The refusal names the movements,
// orders and deliveries still holding it, and those lists now travel back on
// their own: this route forwarded all three by hand.

export const DELETE = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await removeItem(inv, inv.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
