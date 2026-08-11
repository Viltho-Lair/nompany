import { hrGuard, saveEmployment } from "@/lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The employee record IS the collaborator row, so there is nothing to create or
// delete here — people arrive by joining the studio and leave by being removed
// from it. HR only fills in the employment fields on the row that already exists.
export async function PUT(request, ctx) {
  const g = await hrGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;

  let b = {};
  try { b = await request.json(); } catch { b = {}; }
  if (!b.collaboratorId) return Response.json({ error: "missing" }, { status: 400 });

  const result = await saveEmployment(g, b.collaboratorId, b.patch || {});
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : 400 });
  return Response.json({ ok: true });
}
