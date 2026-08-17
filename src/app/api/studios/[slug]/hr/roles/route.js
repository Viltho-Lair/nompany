import { hrGuard, createHrRole, editHrRole, removeHrRole } from "@/lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE JOB TITLES, from the HR side. This route names a role and nothing more —
// the permissions behind the name are Access's, on people.members.edit, and the
// service functions here refuse to write them whatever the payload says.
//
// It replaces /hr/positions, which kept a second list of job titles beside the
// roles that actually decided anything. There is one list now.
//
// There is no GET: the roles travel on the HR screen's single read, like every
// other list it draws.

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

const status = (error) => (error === "duplicate" ? 409
  : error === "in-use" ? 409
  : error === "protected" ? 403
  : error === "notfound" ? 404 : 400);

export async function POST(request, ctx) {
  const g = await hrGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createHrRole(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json({ ok: true, role: result.role }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await hrGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await editHrRole(g, b.id, b);
  if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json({ ok: true });
}

export async function DELETE(request, ctx) {
  const g = await hrGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeHrRole(g, b.id);
  if (result.error) {
    return Response.json({ error: result.error, people: result.people }, { status: status(result.error) });
  }
  return Response.json({ ok: true });
}
