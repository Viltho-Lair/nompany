import { inventoryGuard, createDelivery, issueDelivery, removeDelivery } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createDelivery(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, delivery: result.delivery }, { status: 201 });
}

// Issuing a delivery note is what takes the stock out. Availability is checked
// against the ledger at this moment, not when the note was drafted.
export async function PUT(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await issueDelivery(g, b.id);
  if (result.error) {
    const status = result.error === "notfound" ? 404
      : result.error === "insufficient" || result.error === "already-issued" ? 409 : 400;
    return Response.json({ error: result.error, short: result.short }, { status });
  }
  return Response.json({ ok: true, delivery: result.delivery });
}

export async function DELETE(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeDelivery(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "already-issued" ? 409 : 404 });
  return Response.json({ ok: true });
}
