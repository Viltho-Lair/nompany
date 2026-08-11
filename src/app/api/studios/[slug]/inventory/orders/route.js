import { inventoryGuard, createOrder, editOrder, receiveOrder, removeOrder } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createOrder(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, order: result.order }, { status: 201 });
}

// Editing an order, or receiving goods against it. Receiving is a PUT with
// `receive` lines because it changes the same record — but it goes through its
// own service call, since it also writes the stock movements.
export async function PUT(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = b.receive
    ? await receiveOrder(g, b.id, { lines: b.receive })
    : await editOrder(g, b.id, b);

  if (result.error) {
    const status = result.error === "notfound" ? 404
      : result.error === "over-receive" || result.error === "received-already" ? 409 : 400;
    return Response.json({ error: result.error, itemId: result.itemId, remaining: result.remaining }, { status });
  }
  return Response.json({ ok: true, order: result.order });
}

export async function DELETE(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeOrder(g, b.id);
  if (result.error) {
    // Once goods have been received the order explains real movements — cancel
    // it rather than deleting the reason those movements exist.
    return Response.json({ error: result.error }, { status: result.error === "received-already" ? 409 : 404 });
  }
  return Response.json({ ok: true });
}
