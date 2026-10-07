import { route, refused } from "@/platform/http/route";
import { inventoryContext } from "@/modules/inventory/inventory";
import { listCounts, createCount, saveCount, postCount, cancelCount } from "@/modules/inventory/stockCountService";
import type { InventoryContext } from "@/modules/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// STOCK COUNTS — the shelves beside the books, and the adjustments a count
// posts. No permission key of its own: see modules/inventory/stockCountService.
const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/counts" };

export const GET = route({ ...spec, body: false }, async (c) => listCounts(c as InventoryContext));

export const POST = route(spec, async (c) => {
  const result = await createCount(c as InventoryContext, c.body);
  return refused(result) ? result : { status: 201, body: { ok: true, ...result } };
});

// ONE VERB FOR THE THREE MOVES ON A COUNT, keyed by `action`: saving what has
// been counted (the default), posting it, or cancelling it.
export const PUT = route(spec, async (c) => {
  const ctx = c as InventoryContext;
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const action = String(c.body?.action ?? "");
  const result = action === "post" ? await postCount(ctx, id)
    : action === "cancel" ? await cancelCount(ctx, id)
      : await saveCount(ctx, id, c.body);
  return refused(result) ? result : { ok: true, ...result };
});
