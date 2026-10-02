import { route } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { inventoryContext, writeOffs } from "@/modules/inventory/inventory";
import type { InventoryContext } from "@/modules/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT WAS WRITTEN OFF in a period — damaged, expired, lost, counted short.
//
// NO PERMISSION KEY OF ITS OWN, on the valuation route's argument: these are
// the stock ledger's own rows added up, so they answer to `inventory.stock.view`.
//
// ITS OWN ROUTE rather than a field on the Inventory payload: it reads every
// movement the studio has made, and only somebody who opens the tab should pay
// for that.
const spec = { auth: "studio", context: inventoryContext, body: false, name: "inventory/write-offs" };

export const GET = route(spec, async (c) => {
  const ctx = c as InventoryContext & { request: Request };
  const denied = requirePermission(ctx.access, "inventory.stock.view");
  if (denied) return denied;
  // `from`/`to` are days somebody chose (YYYY-MM-DD) and win over `period`;
  // `rows=all` is the export asking for every row rather than the newest.
  const q = new URL(ctx.request.url).searchParams;
  return writeOffs(ctx, { period: q.get("period"), from: q.get("from"), to: q.get("to"), rows: q.get("rows") });
});
