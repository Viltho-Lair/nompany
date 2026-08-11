import { operationsGuard, createLocation, editLocation, removeLocation } from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await operationsGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createLocation(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "duplicate" ? 409 : 400 });
  return Response.json({ ok: true, location: result.location }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await operationsGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await editLocation(g, b.id, b);
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : result.error === "duplicate" ? 409 : 400 });
  }
  return Response.json({ ok: true, location: result.location });
}

export async function DELETE(request, ctx) {
  const g = await operationsGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeLocation(g, b.id);
  if (result.error) {
    // Permits and shifts point at this place — deleting it would leave both
    // referring to somewhere that no longer exists.
    return Response.json({ error: result.error, permits: result.permits, shifts: result.shifts },
      { status: result.error === "in-use" ? 409 : 404 });
  }
  return Response.json({ ok: true });
}
