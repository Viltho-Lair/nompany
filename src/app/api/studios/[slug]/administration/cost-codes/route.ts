// THE COST CODE LIBRARY — Master data's third collection.
//
// The route lives here because the collection does, the same rule that moved
// locations off `operations/locations` and put departments beside them.
// Projects READS this library (to offer a new breakdown a standard starting
// point) and does not write it.
//
// NO BLANKET `canManage` GATE. Each verb is left to its own service call and
// its own requirePermission — the shape the two routes beside this one use.
import { route, refused } from "@/platform/http/route";
import { masterContext } from "@/modules/administration/master";
import {
  listCostCodeLibrary, createCostCode, editCostCode, removeCostCode,
} from "@/modules/administration/costCodeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: masterContext, body: true, name: "administration/cost-codes" };

export const GET = route({ ...spec, body: false }, async (master) => {
  const result = await listCostCodeLibrary(master);
  if (refused(result)) return result;
  return result;
});

export const POST = route(spec, async (master) => {
  const result = await createCostCode(master, master.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, code: result.code } };
});

export const PUT = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };

  const result = await editCostCode(master, String(master.body.id), master.body);
  if (refused(result)) return result;
  return { ok: true, code: result.code };
});

// Refused with the COUNT of projects still naming the code, so the screen can
// say what retiring it instead would preserve rather than a bare "no".
export const DELETE = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };

  const result = await removeCostCode(master, String(master.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
