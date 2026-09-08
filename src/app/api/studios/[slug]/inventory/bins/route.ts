import { route, refused } from "@/platform/http/route";
import { inventoryContext } from "@/modules/inventory/inventory";
import { listBins, createBin, editBin, deleteBin, moveStock } from "@/modules/inventory/binService";
import type { InventoryContext } from "@/modules/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHERE THE STOCK IS — the bin register, and the one act that changes a bin
// balance.
//
// NO PERMISSION KEY OF ITS OWN: a bin is how the warehouse is arranged, so it
// answers to `inventory.stock`, the right somebody already holds to move what
// sits in it.
const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/bins" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await listBins(c as InventoryContext);
  return refused(result) ? result : result;
});

// A MOVE IS NAMED IN THE BODY rather than reached through a generic PUT, the
// same rule the adjustment answer follows: routing an act through an edit is
// the shape that once let a rejected change order approve itself.
export const POST = route(spec, async (c) => {
  const ctx = c as InventoryContext;
  if (c.body?.action === "move") {
    const result = await moveStock(ctx, c.body);
    return refused(result) ? result : { ok: true, ...result };
  }
  const result = await createBin(ctx, c.body);
  return refused(result) ? result : { ok: true, ...result };
});

export const PUT = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await editBin(c as InventoryContext, id, c.body);
  return refused(result) ? result : { ok: true, ...result };
});

export const DELETE = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await deleteBin(c as InventoryContext, id);
  return refused(result) ? result : result;
});
