import { route, refused } from "@/platform/http/route";
import { hrContext, createHrRole, editHrRole, removeHrRole, addLibraryRoles } from "@/modules/hr/hr";

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
const manageable = (hr: { canManage: boolean }) => (hr.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (hr) => {
  const refusal = manageable(hr);
  if (refusal) return refusal;

  // ONE DOOR, TWO ACTS: naming a job from scratch, and taking pre-built ones
  // from the catalogue. Both are hr.employees.create and both are refused for
  // the same person, so a second route would be a second place to keep that in
  // step — the same shape the departments route uses for add-standard.
  //
  // They differ in exactly one way and it is worth stating: a role typed here
  // starts with NO permissions, because HR must not be able to write its own
  // access; a library role arrives with the archetype the catalogue assigned,
  // which nobody in the studio can edit.
  if (hr.body.action === "add-library") {
    const added = await addLibraryRoles(hr, {
      departmentId: String(hr.body.departmentId || ""),
      names: Array.isArray(hr.body.names) ? hr.body.names.map((n) => String(n)) : [],
    });
    if (refused(added)) return added;
    return { status: 201, body: { ok: true, ...added } };
  }

  const result = await createHrRole(hr, hr.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, role: result.role } };
});

export const PUT = route(spec, async (hr) => {
  const refusal = manageable(hr);
  if (refusal) return refusal;
  if (!hr.body.id) return { error: "missing" };

  const result = await editHrRole(hr, hr.body.id, hr.body);
  if (refused(result)) return result;
  // `role` used to ride along here and editHrRole has never returned one, so
  // it serialised as absent every time. Saying so beats claiming it.
  return { ok: true };
});

export const DELETE = route(spec, async (hr) => {
  const refusal = manageable(hr);
  if (refusal) return refusal;
  if (!hr.body.id) return { error: "missing" };

  const result = await removeHrRole(hr, hr.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
