import { inventoryGuard, createItem, editItem, removeItem } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createItem(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "duplicate-sku" ? 409 : 400 });
  return Response.json({ ok: true, item: result.item }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await editItem(g, b.id, b);
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : result.error === "duplicate-sku" ? 409 : 400 });
  }
  return Response.json({ ok: true, item: result.item });
}

export async function DELETE(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeItem(g, b.id);
  if (result.error) {
    // An item that has moved keeps its history — deleting it would erase the
    // record of stock that really came in or went out.
    return Response.json({ error: result.error, movements: result.movements, orders: result.orders, deliveries: result.deliveries },
      { status: result.error === "in-use" ? 409 : 404 });
  }
  return Response.json({ ok: true });
}
