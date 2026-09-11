// PARTS TO A MAINTENANCE WORK ORDER — issued from stock, or brought back.
//
// INVENTORY'S ROUTE, NOT MAINTENANCE'S. The ledger has exactly one writer
// (`record` in modules/inventory), and a part leaving the stores is the stores'
// act — so this answers to `inventory.stock.edit`, the right that already
// issues a delivery note. Maintenance's screen posts here, the way the
// requisition screen posts its conversion to Inventory's order route.
//
// Append-only like every other stock route: a wrong issue is corrected by a
// return, so the history stays truthful.
import { route, refused } from "@/platform/http/route";
import { inventoryContext, moveForWorkOrder } from "@/modules/inventory/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(
  { auth: "studio", context: inventoryContext, body: true, name: "inventory/workorder-parts" },
  async (inv) => {
    const result = await moveForWorkOrder(inv, inv.body);
    if (refused(result)) return result;
    return { status: 201, body: { ok: true, movement: result.movement } };
  },
);
