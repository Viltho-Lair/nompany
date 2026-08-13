import { operationsGuard, reportPosition, clearPosition } from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (r) => { try { return await r.json(); } catch { return {}; } };

// Report YOUR OWN position. Viewing Operations is enough — sharing where you
// are is not a privileged act, it is a personal one, and the collaborator id is
// taken from the session so nobody can place someone else on the map.
export async function POST(request, ctx) {
  const g = await operationsGuard(ctx.params);
  if (g.fail) return g.fail;

  const result = await reportPosition(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, position: result.position });
}

// Come off the map. Your own always; somebody else's needs the Manage grant on
// Tracking — which is what you need when a phone is left logged in on a desk.
export async function DELETE(request, ctx) {
  const g = await operationsGuard(ctx.params);
  if (g.fail) return g.fail;

  const b = await body(request);
  const result = await clearPosition(g, b.collaboratorId);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "forbidden" ? 403 : 404 });
  return Response.json({ ok: true });
}
