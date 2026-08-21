import { route } from "@/lib/route";
import { operationsContext, createLocation, editLocation, removeLocation } from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: operationsContext, body: true, name: "operations/locations" };
const manageable = (ops) => (ops.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;

  const result = await createLocation(ops, ops.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, location: result.location } };
});

export const PUT = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;
  if (!ops.body.id) return { error: "missing" };

  const result = await editLocation(ops, ops.body.id, ops.body);
  if (result.error) return result;
  return { ok: true, location: result.location };
});

// Permits and shifts point at this place — deleting it would leave both
// referring to somewhere that no longer exists. The refusal names them, and
// those two lists travel back on their own now.

export const DELETE = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;
  if (!ops.body.id) return { error: "missing" };

  const result = await removeLocation(ops, ops.body.id);
  if (result.error) return result;
  return { ok: true };
});
