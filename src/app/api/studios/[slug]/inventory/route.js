import {
  inventoryGuard, listVendors, listItems, listMovements, listOrders, listDeliveries,
  openProjects, stockValue, ORDER_STATUSES, DELIVERY_STATUSES, UNITS,
} from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Inventory screen. On-hand quantities and the stock
// value are summed from the movement ledger here, never stored.
export async function GET(request, ctx) {
  const g = await inventoryGuard(ctx.params);
  if (g.fail) return g.fail;

  const [vendors, items, movements, orders, deliveries, projects] = await Promise.all([
    listVendors(g), listItems(g), listMovements(g), listOrders(g), listDeliveries(g), openProjects(g),
  ]);

  return Response.json({
    canManage: g.canManage,
    nav: g.nav,
    vendors, items, movements, orders, deliveries, projects,
    summary: {
      items: items.length,
      low: items.filter((i) => i.low).length,
      value: stockValue(items),
      awaiting: orders.filter((o) => o.status === "Ordered" || o.status === "Partly received").length,
    },
    vocabulary: { orderStatuses: ORDER_STATUSES, deliveryStatuses: DELIVERY_STATUSES, units: UNITS },
  });
}
