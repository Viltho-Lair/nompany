import {
  inventoryGuard, listVendors, listItems, listMovements, listOrders, listDeliveries,
  openProjects, stockValue, ORDER_STATUSES, DELIVERY_STATUSES, UNITS,
} from "@/lib/inventory";
import { listShipments, listAirlines } from "@/lib/awbTracking";
import { AWB_STATUS } from "@/lib/awbStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Inventory screen. On-hand quantities, the stock value
// and every shipment's current milestone are all derived here, never stored.
export async function GET(request, ctx) {
  const g = await inventoryGuard(ctx.params);
  if (g.fail) return g.fail;

  const [vendors, items, movements, orders, deliveries, projects, shipments, airlines] = await Promise.all([
    listVendors(g), listItems(g), listMovements(g), listOrders(g), listDeliveries(g), openProjects(g),
    listShipments(g), listAirlines(g),
  ]);

  return Response.json({
    canManage: g.canManage,
    // Each sub-section carries its own Manage grant, so a person can be trusted
    // with the catalogue without also being trusted with the stock ledger.
    canManageStock: g.canManageStock,
    canManageVendors: g.canManageVendors,
    canManageItems: g.canManageItems,
    canManageSheets: g.canManageSheets,
    canManageAwb: g.canManageAwb,
    nav: g.nav,
    vendors, items, movements, orders, deliveries, projects, shipments, airlines,
    summary: {
      items: items.length,
      low: items.filter((i) => i.low).length,
      value: stockValue(items),
      awaiting: orders.filter((o) => o.status === "Ordered" || o.status === "Partly received").length,
      // Units actually held, so the dashboard can report the shelf rather than
      // just how many kinds of thing are on it.
      units: Math.round(items.reduce((sum, i) => sum + (i.onHand || 0), 0) * 1000) / 1000,
      inTransit: shipments.filter((s) => !s.delivered).length,
    },
    vocabulary: {
      orderStatuses: ORDER_STATUSES, deliveryStatuses: DELIVERY_STATUSES, units: UNITS,
      awbStatuses: AWB_STATUS,
    },
  });
}
