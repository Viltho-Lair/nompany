import { getCollection } from "@/lib/db";
import { currentUser, unauthorized, forbidden } from "@/lib/session";
import { getSectionAccess } from "@/lib/sectionAccess";
import { canAccessSection } from "@/lib/sectionAccessConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Item catalogue (vendor, docs) + stock (available serials + booked), for the
// Project Sheets vendor column and the Orders & Tracking shortfall view. Gated
// by either Project Sheets or Orders & Tracking access so those users don't need
// full Items/Stock/Vendors access.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const access = await getSectionAccess();
  if (!canAccessSection(actor, "inventory-sheets", access) && !canAccessSection(actor, "inventory-tracking", access)) return forbidden();

  const [items, vendors, stock] = await Promise.all([
    getCollection("inventoryItems"),
    getCollection("inventoryVendors"),
    getCollection("inventoryStock"),
  ]);
  const vName = Object.fromEntries(vendors.map((v) => [v.id, v.name]));
  const itemsMap = {};
  for (const it of items) {
    itemsMap[it.id] = { name: it.name || "", model: it.modelNumber || "", image: it.image || "", vendorId: it.vendorId || "", vendorName: vName[it.vendorId] || "", dataSheet: it.dataSheet || "", manual: it.manual || "" };
  }
  const stockMap = {};
  for (const s of stock) {
    stockMap[s.itemId] = { serials: Array.isArray(s.serials) ? s.serials : [], booked: Array.isArray(s.booked) ? s.booked : [] };
  }
  return Response.json({ items: itemsMap, stock: stockMap });
}
