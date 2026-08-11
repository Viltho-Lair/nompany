import { websiteGuard, createService, editService, removeService } from "@/lib/website";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await websiteGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createService(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, service: result.service }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await websiteGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await editService(g, b.id, b);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : 400 });
  return Response.json({ ok: true, service: result.service });
}

export async function DELETE(request, ctx) {
  const g = await websiteGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeService(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
