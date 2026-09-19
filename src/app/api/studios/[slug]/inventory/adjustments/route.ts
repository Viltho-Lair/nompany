import { route, refused } from "@/platform/http/route";
import { inventoryContext } from "@/modules/inventory/inventory";
import { listAdjustments } from "@/modules/inventory/adjustmentApproval";
import type { InventoryContext } from "@/modules/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// STOCK ADJUSTMENTS WAITING FOR APPROVAL, each with how far its approval has got.
//
// Raising one is `POST /inventory/stock` as it always was — `adjustStock`
// decides whether the amount needs anybody, so there is ONE door for "I want to
// move this stock" and a caller never has to know which path it took. ANSWERING
// is the Approvals page's (19/09/2026), so this route only reads.
const spec = { auth: "studio", context: inventoryContext, body: false, name: "inventory/adjustments" };

export const GET = route(spec, async (c) => {
  const result = await listAdjustments(c as InventoryContext);
  if (refused(result)) return result;
  return result;
});
