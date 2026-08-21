import { route } from "@/lib/route";
import { hrContext, createHrRole, editHrRole, removeHrRole } from "@/lib/hr";

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

const spec = { auth: "studio", context: hrContext, body: true, name: "hr/roles" };
const manageable = (hr) => (hr.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (hr) => {
  const refusal = manageable(hr);
  if (refusal) return refusal;

  const result = await createHrRole(hr, hr.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, role: result.role } };
});

export const PUT = route(spec, async (hr) => {
  const refusal = manageable(hr);
  if (refusal) return refusal;
  if (!hr.body.id) return { error: "missing" };

  const result = await editHrRole(hr, hr.body.id, hr.body);
  if (result.error) return result;
  return { ok: true, role: result.role };
});

export const DELETE = route(spec, async (hr) => {
  const refusal = manageable(hr);
  if (refusal) return refusal;
  if (!hr.body.id) return { error: "missing" };

  const result = await removeHrRole(hr, hr.body.id);
  if (result.error) return result;
  return { ok: true };
});
