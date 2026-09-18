import { route, refused } from "@/platform/http/route";
import { inventoryContext, importItems, undoItemImport } from "@/modules/inventory/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BULK ITEM CREATE, one batch at a time — see importItems. Its own route for
// the vendor import's reason: "create this item" hands back an item, "import
// these rows" hands back a tally and the lines it would not take.
//
// The file is read in the browser (CSV and .xlsx alike, src/shared/xlsx.ts);
// this route never sees a file, and never trusts the parse — every batch is
// planned again here against what is stored.
const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/items/import" };

export const POST = route(spec, async (inv) => {
  if (!inv.canManage) return { error: "read-only" };

  const result = await importItems(inv, inv.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, ...result } };
});

// Undo a whole import: everything it created, or nothing — see undoItemImport.
export const DELETE = route(spec, async (inv) => {
  if (!inv.canManage) return { error: "read-only" };
  if (!inv.body.importId) return { error: "missing" };

  const result = await undoItemImport(inv, String(inv.body.importId));
  if (refused(result)) return result;
  return { ok: true, ...result };
});
