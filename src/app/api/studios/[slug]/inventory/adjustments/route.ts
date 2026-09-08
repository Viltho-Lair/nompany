import { route, refused } from "@/platform/http/route";
import { inventoryContext, applyApprovedAdjustment } from "@/modules/inventory/inventory";
import {
  listAdjustments, approveAdjustment, rejectAdjustment,
} from "@/modules/inventory/adjustmentApproval";
import type { InventoryContext } from "@/modules/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// STOCK ADJUSTMENTS WAITING FOR A SIGNATURE.
//
// Raising one is `POST /inventory/stock` as it always was — `adjustStock`
// decides whether the amount needs anybody, so there is ONE door for "I want to
// move this stock" and a caller never has to know which path it took. This
// route is only the answering half.
//
// NO PERMISSION KEY OF ITS OWN. Reading the queue is `inventory.stock.view`;
// signing asks whichever step's right the plan names, chosen at runtime.
const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/adjustments" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await listAdjustments(c as InventoryContext);
  if (refused(result)) return result;
  return result;
});

// APPROVE AND REJECT ARE NOT EDITS, so they are named in the body rather than
// reached through a generic PUT. Routing an answer through an edit is the shape
// that let a rejected change order approve itself (docs/functionality/
// variations.md) and it is not repeated here.
export const PATCH = route(spec, async (c) => {
  const ctx = c as InventoryContext;
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };

  const action = String(c.body?.action ?? "");
  if (action === "approve") {
    const result = await approveAdjustment(ctx, id, (row) => applyApprovedAdjustment(ctx, row));
    if (refused(result)) return result;
    return { ok: true, ...result };
  }
  if (action === "reject") {
    const result = await rejectAdjustment(ctx, id, String(c.body?.reason ?? ""));
    if (refused(result)) return result;
    return { ok: true, ...result };
  }
  return { error: "action" };
});
