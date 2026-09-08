import { route, refused } from "@/platform/http/route";
import { inventoryContext } from "@/modules/inventory/inventory";
import { moveStock } from "@/modules/inventory/binService";
import {
  listBatches, listSerials, createBatch, editBatch, deleteBatch,
} from "@/modules/inventory/batchService";
import type { InventoryContext } from "@/modules/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHICH UNITS — the batch register, its expiry alerts, and the state of every
// serial. No permission key of its own: a batch is how the stock is labelled,
// so it answers to `inventory.stock` like the bin register does.
const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/batches" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = c as InventoryContext;
  // SERIALS RIDE ON THE SAME ROUTE, behind a query flag, because they answer
  // the same question from the other end — which units, rather than how many —
  // and a second route would ask the identical permission of the identical
  // context to read two of the same three collections.
  const wantSerials = new URL(c.request.url).searchParams.get("serials") === "1";
  const result = wantSerials ? await listSerials(ctx) : await listBatches(ctx);
  return refused(result) ? result : result;
});

export const POST = route(spec, async (c) => {
  const ctx = c as InventoryContext;
  // ASSIGNING STOCK TO A BATCH IS THE BIN REGISTER'S MOVE, keyed on `batchId`.
  // One writer for a net-zero movement pair — two would be two chances to get
  // the sign wrong, and one of them would be the one nobody exercised.
  if (c.body?.action === "assign") {
    const result = await moveStock(ctx, c.body, "batchId");
    return refused(result) ? result : { ok: true, ...result };
  }
  const result = await createBatch(ctx, c.body);
  return refused(result) ? result : { ok: true, ...result };
});

export const PUT = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await editBatch(c as InventoryContext, id, c.body);
  return refused(result) ? result : { ok: true, ...result };
});

export const DELETE = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await deleteBatch(c as InventoryContext, id);
  return refused(result) ? result : result;
});
