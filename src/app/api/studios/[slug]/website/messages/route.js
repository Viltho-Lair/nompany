import { websiteGuard, setMessageStatus, removeMessage } from "@/lib/website";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

// Messages arrive from the public form, never from here — there is no POST.
export async function PUT(request, ctx) {
  const g = await websiteGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id || !b.status) return Response.json({ error: "missing" }, { status: 400 });
  const result = await setMessageStatus(g, b.id, b.status);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : 400 });
  return Response.json({ ok: true, message: result.message });
}

export async function DELETE(request, ctx) {
  const g = await websiteGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeMessage(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
