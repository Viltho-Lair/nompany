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
  if (result.error) {
    // A REFUSAL IS NOT A MALFORMED REQUEST. Assigning a role is an access act,
    // and both ways it can be turned down — not holding the right, or handing
    // out more than you hold yourself — are 403s a client should tell apart
    // from "you sent nonsense".
    const status = result.error === "notfound" ? 404
      : result.error === "role-forbidden" || result.error === "escalation" || result.error === "forbidden" ? 403 : 400;
    return Response.json({ error: result.error, keys: result.keys }, { status });
  }
  return Response.json({ ok: true });
}
