import { getCollection } from "@/lib/db";
import { requireSection, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Available serials per item, for the Project Sheet booking picker. Gated by the
// Project Sheets section so sheet users can book without full Stock access.
export async function GET() {
  const actor = await requireSection("inventory-sheets");
  if (!actor) return forbidden();
  const stock = await getCollection("inventoryStock");
  return Response.json((Array.isArray(stock) ? stock : []).map((s) => ({ itemId: s.itemId, serials: Array.isArray(s.serials) ? s.serials : [] })));
}
