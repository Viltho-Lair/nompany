import { inventoryGuard, createVendor, editVendor, removeVendor } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createVendor(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "duplicate" ? 409 : 400 });
  return Response.json({ ok: true, vendor: result.vendor }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await editVendor(g, b.id, b);
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : result.error === "duplicate" ? 409 : 400 });
  }
  return Response.json({ ok: true, vendor: result.vendor });
}

export async function DELETE(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeVendor(g, b.id);
  if (result.error) {
    return Response.json({ error: result.error, items: result.items, orders: result.orders },
      { status: result.error === "in-use" ? 409 : 404 });
  }
  return Response.json({ ok: true });
}
