import { route } from "@/platform/http/route";
import { listItemCategories } from "@/modules/administration/itemCategories";
import { can, type PermissionKey } from "@/platform/access";
import { STOCK_ALERT_RIGHT } from "@/modules/inventory/stockAlerts";
import {
  inventoryContext, listVendors, listItems, listMovements, listOrders,
  openProjects, stockValue, listProjectSheets, ORDER_STATUSES,
} from "@/modules/inventory/inventory";
import { unitsFor } from "@/modules/administration/units";
import { listShipments, listAirlines } from "@/modules/inventory/awbTracking";
import { AWB_STATUS } from "@/modules/inventory/awbStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Inventory screen. On-hand quantities, the stock value
// and every shipment's current milestone are all derived here, never stored.
export const GET = route(
  { auth: "studio", context: inventoryContext, name: "inventory" },
  async (g) => {
  // A LIST NO SCREEN THAT IS ON CAN SHOW IS NOT READ — each is read for the
  // screens of this module that draw it, and only while one of them is on:
  //   items      the Items register, the Stock screen (on-hand per item) and
  //              the dashboard's item figures
  //   vendors    the Items form's supplier picker
  //   movements  the Stock screen's ledger and the dashboard's movement charts
  //   orders     the dashboard's purchase-order charts and "awaiting" figure —
  //              filed here, switched as Procurement → Orders
  //   projects   the air-waybill screen's project picker
  //   shipments, airlines   Logistics → Shipments
  //   sheets     Inventory → Project sheets
  //
  // DELIVERY NOTES ARE NOT HERE ANY MORE (20/09/2026). This response carried the
  // whole list — read from the store and sent to every reader of the Inventory
  // screen — and no screen had drawn it since the sheet workspace replaced the
  // hand-raised delivery note. They are still WRITTEN (deliveries/route.ts:
  // create, issue, cancel); what is gone is a list nothing listed.
  const on = g.on;
  const shipmentsOn = on("logistics-shipments");
  const [vendors, items, movements, orders, projects, shipments, airlines, sheets, categories] = await Promise.all([
    on("inventory-items") ? listVendors(g) : Promise.resolve([]),
    on("inventory-items") || on("inventory-stock") ? listItems(g) : Promise.resolve([]),
    on("inventory-stock") ? listMovements(g) : Promise.resolve([]),
    on("procurement-orders") ? listOrders(g) : Promise.resolve([]),
    shipmentsOn ? openProjects(g) : Promise.resolve([]),
    shipmentsOn ? listShipments(g) : Promise.resolve([]),
    shipmentsOn ? listAirlines(g) : Promise.resolve([]),
    on("inventory-sheets") ? listProjectSheets(g) : Promise.resolve([]),
    // ADMINISTRATION'S CATEGORY REGISTER, for the item form's own picker.
    // Reference data every section reads and none owns — the same borrow
    // Operations makes for locations. Null section, empty list, no picker.
    g.masterSection ? listItemCategories({ studio: g.studio, section: g.masterSection }) : Promise.resolve([]),
  ]);

  return {
    canManage: g.canManage,
    // Whether the module's OWN screen may be opened. The dashboard summarises
    // everything underneath it, so it is withheld on a right of its own.
    canViewDashboard: g.canViewDashboard,
    // Each sub-section carries its own Manage grant, so a person can be trusted
    // with the catalogue without also being trusted with the stock ledger.
    canManageStock: g.canManageStock,
    canManageVendors: g.canManageVendors,
    canManageItems: g.canManageItems,
    canManageSheets: g.canManageSheets,
    canManageAwb: g.canManageAwb,
    // WHETHER THE "STOCK TO REORDER" LIST IS DRAWN for this reader — the stock
    // alert is a right the owner hands out (modules/inventory/stockAlerts).
    canSeeStockAlerts: can(g.access, STOCK_ALERT_RIGHT as PermissionKey),
    nav: g.nav,
    // The money the studio counts in. Registered Items needs it to know when a
    // price is quoted in somebody else's currency — which is what brings the
    // shipping and customs charges out.
    currency: g.studio.currency || "",
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: g.manage,
    vendors, items, movements, orders, projects, shipments, airlines, sheets, categories,
    summary: {
      items: items.length,
      low: items.filter((i) => i.low).length,
      value: stockValue(items, g.studio.currency),
      awaiting: orders.filter((o) => o.status === "Ordered" || o.status === "Partly received").length,
      // Units actually held, so the dashboard can report the shelf rather than
      // just how many kinds of thing are on it.
      units: Math.round(items.reduce((sum, i) => sum + (i.onHand || 0), 0) * 1000) / 1000,
      inTransit: shipments.filter((s) => !s.delivered).length,
    },
    vocabulary: {
      // THE STUDIO'S OWN UNITS, not a fixed eight — the form offers exactly
      // what `createItem` will accept, which is the whole point of resolving
      // them in one pure place.
      orderStatuses: ORDER_STATUSES,
      units: unitsFor(g.studio.units, g.studio.unitsOff),
      awbStatuses: AWB_STATUS,
      // The studio's own service actions, so the item form can offer a scope
      // checkbox per action rather than the two that used to be hardcoded.
      serviceActions: (g.studio.serviceActions as string[]) || [],
    },
  };
});

