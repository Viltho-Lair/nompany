import { operationsGuard, createShift, editShift, removeShift } from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

// A clash with another shift, or with leave HR has already approved, comes back
// as a 409 with the detail needed to explain it — not a silent accept.
function fail(result) {
  const status = result.error === "notfound" ? 404
    : result.error === "clash" || result.error === "on-leave" ? 409 : 400;
  return Response.json({
    error: result.error,
    startTime: result.startTime, endTime: result.endTime,
    from: result.from, to: result.to, type: result.type,
  }, { status });
}

export async function POST(request, ctx) {
  const g = await operationsGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createShift(g, await body(request));
  if (result.error) return fail(result);
  return Response.json({ ok: true, shift: result.shift }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await operationsGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await editShift(g, b.id, b);
  if (result.error) return fail(result);
  return Response.json({ ok: true, shift: result.shift });
}

export async function DELETE(request, ctx) {
  const g = await operationsGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeShift(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
