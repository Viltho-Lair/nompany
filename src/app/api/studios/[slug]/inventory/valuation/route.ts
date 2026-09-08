import { route } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { inventoryContext } from "@/modules/inventory/inventory";
import { stockValuation } from "@/modules/inventory/stockValue";
import { isValuationMethod, DEFAULT_METHOD } from "@/modules/inventory/valuation";
import type { InventoryContext } from "@/modules/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT THE STOCK ON HAND IS WORTH.
//
// NO PERMISSION KEY OF ITS OWN. A valuation is the stock register's own rows
// counted a second way, so it answers to `inventory.stock.view` — a right over
// the same rows would be free to disagree with the first about who may see the
// warehouse.
//
// THE METHOD IS THE STUDIO'S, and it is READ here rather than taken from the
// query string by default: a valuation is an accounting policy, not a view
// option, and letting a caller pick per request would mean two people quoting
// two different figures for the same stock on the same day. The override exists
// so a studio can SEE what the other method would say before switching — which
// is the one legitimate reason to ask for the answer they have not chosen.
const spec = { auth: "studio", context: inventoryContext, body: false, name: "inventory/valuation" };

export const GET = route(spec, async (c) => {
  const ctx = c as InventoryContext & { request: Request };
  const denied = requirePermission(ctx.access, "inventory.stock.view");
  if (denied) return denied;

  const stored = (ctx.studio as { valuationMethod?: unknown }).valuationMethod;
  const chosen = isValuationMethod(stored) ? stored : DEFAULT_METHOD;

  const asked = new URL(ctx.request.url).searchParams.get("method");
  const method = isValuationMethod(asked) ? asked : chosen;

  return {
    ...await stockValuation(ctx, method),
    // WHICH ONE IS THE STUDIO'S, beside which one was used. A screen showing a
    // previewed figure must be able to say it is a preview — a number that
    // silently is not the policy is how the wrong one ends up on a return.
    studioMethod: chosen,
    preview: method !== chosen,
  };
});
