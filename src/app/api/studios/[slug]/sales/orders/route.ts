import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { salesContext } from "@/modules/sales/sales";
import {
  listOrders, createOrder, updateOrder, moveOrder, removeOrder, orderPickers,
} from "@/modules/sales/orders";
import { studioVatRate } from "@/shared/vat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ORDERS SHARE THE QUOTATIONS SECTION and, like contracts, not its route name.
// The audit action is `${method} ${spec.name}`, and naming this after the
// section it stores in would record every order placed as
// "POST crm-sales-quotations" — indistinguishable from a quotation being
// raised. The name is the record, not the storage.
const spec = { auth: "studio", context: salesContext, body: true, name: "crm-sales-orders" };

// PERMISSION IS ENFORCED IN THE SERVICE, not here. A route can be added and
// forgotten; the function that does the work cannot be reached around. This
// layer decides HTTP shape and nothing else.
export const GET = route({ ...spec, body: false }, async (sales) => {
  const [result, pickers] = await Promise.all([listOrders(sales), orderPickers(sales)]);
  if (refused(result)) return result;
  // THE RIGHTS TRAVEL WITH THE LIST so the register draws a control only where
  // the route would accept it. `canDelete` opens the door; whether THIS order
  // may go through it is a question about its status, which the screen asks of
  // the same pure `orderDeletable` the service does.
  return {
    ok: true,
    orders: result.orders,
    // What the form picks the deal, customer, quotation and contract from.
    pickers,
    canCreate: !requirePermission(sales.access, "crmSales.orders.create"),
    canEdit: !requirePermission(sales.access, "crmSales.orders.edit"),
    canDelete: !requirePermission(sales.access, "crmSales.orders.delete"),
    // WHETHER AN ORDER CARRIES TAX AT ALL, and what a new one starts at: the
    // form hides the field for a studio with no rate (shared/vat).
    vatEnabled: studioVatRate(sales.studio) !== null,
    defaultVatRate: studioVatRate(sales.studio) ?? 0,
  };
});

export const POST = route(spec, async (sales) => {
  const result = await createOrder(sales, sales.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, order: result.order } };
});

export const PUT = route(spec, async (sales) => {
  if (!sales.body.id) return { error: "missing" };
  const id = String(sales.body.id);

  // MOVING IS ITS OWN BRANCH AND ITS OWN ACT, never a status written through
  // the edit path. `updateOrder` refuses to write `status` at all, so this is
  // the only door — which is what makes the transition table mean something.
  if (sales.body.action === "move") {
    const moved = await moveOrder(sales, id, String(sales.body.to || ""));
    if (refused(moved)) return moved;
    return { ok: true, order: moved.order };
  }

  const result = await updateOrder(sales, id, sales.body);
  if (refused(result)) return result;
  return { ok: true, order: result.order };
});

// DELETE EXISTS HERE AND NOT ON CONTRACTS, and the difference is the point. A
// contract is a value baseline that invoices and variations claim against, so
// it is never removed. A DRAFT order is a mistake somebody may take back before
// a customer has been told anything — and the moment it is confirmed, the
// service refuses this by name (`wrong-state`) and the honest exit is Cancelled,
// which keeps the reference spent and the trail intact.
export const DELETE = route(spec, async (sales) => {
  if (!sales.body.id) return { error: "missing" };
  const result = await removeOrder(sales, String(sales.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
