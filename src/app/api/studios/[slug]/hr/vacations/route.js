import { hrGuard, requestVacation, decideVacation, removeVacation } from "@/lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

// Requesting leave is NOT a write in the manage sense — anyone who can open HR
// may ask for their own. Filing it for someone else is checked in the service.
export async function POST(request, ctx) {
  const g = await hrGuard(ctx.params);
  if (g.fail) return g.fail;
  const result = await requestVacation(g, await body(request));
  if (result.error) {
    const status = result.error === "forbidden" ? 403
      : result.error === "notfound" ? 404
      : result.error === "overlap" ? 409 : 400;
    return Response.json({ error: result.error, from: result.from, to: result.to }, { status });
  }
  return Response.json({ ok: true, vacation: result.vacation }, { status: 201 });
}

// Approve / decline / cancel. Cancelling your own pending request is allowed
// without the Manage grant; deciding anyone else's is not.
export async function PUT(request, ctx) {
  const g = await hrGuard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id || !b.status) return Response.json({ error: "missing" }, { status: 400 });

  const result = await decideVacation(g, b.id, b.status);
  if (result.error) {
    const status = result.error === "forbidden" ? 403
      : result.error === "notfound" ? 404
      : result.error === "already-decided" ? 409 : 400;
    return Response.json({ error: result.error, status: result.status }, { status });
  }
  return Response.json({ ok: true, vacation: result.vacation });
}

export async function DELETE(request, ctx) {
  const g = await hrGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeVacation(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
