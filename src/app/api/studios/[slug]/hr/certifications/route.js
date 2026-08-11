import { hrGuard, createCertification, editCertification, removeCertification } from "@/lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await hrGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createCertification(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "duplicate" ? 409 : 400 });
  return Response.json({ ok: true, certification: result.certification }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await hrGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await editCertification(g, b.id, b);
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : result.error === "duplicate" ? 409 : 400 });
  }
  return Response.json({ ok: true, certification: result.certification });
}

export async function DELETE(request, ctx) {
  const g = await hrGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeCertification(g, b.id);
  if (result.error) {
    return Response.json({ error: result.error, people: result.people }, { status: result.error === "in-use" ? 409 : 404 });
  }
  return Response.json({ ok: true });
}
