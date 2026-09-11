// TIME BOOKED AGAINST A WORK ORDER.
//
// NO GET: the entries are read with the work orders they belong to (the
// register's own GET), so a second reader would be a second answer to "how
// long did this take". This route only writes.
import { route, refused } from "@/platform/http/route";
import { maintenanceContext, addLabour, removeLabour } from "@/modules/maintenance/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: maintenanceContext, body: true, name: "maintenance-labour" };

export const POST = route(spec, async (m) => {
  const result = await addLabour(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, labour: result.labour } };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await removeLabour(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
