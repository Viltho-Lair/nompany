import { route } from "@/platform/http/route";
import { operationsContext, createShift, editShift, removeShift } from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: operationsContext, body: true, name: "operations/shifts" };
const manageable = (ops) => (ops.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;

  const result = await createShift(ops, ops.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, shift: result.shift } };
});

export const PUT = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;
  if (!ops.body.id) return { error: "missing" };

  const result = await editShift(ops, ops.body.id, ops.body);
  if (result.error) return result;
  return { ok: true, shift: result.shift };
});

// A CLASH IS A 409 WITH ITS EVIDENCE. Another shift in the same window comes
// back with startTime and endTime; leave HR has already approved comes back as
// on-leave with from, to and type. This route named all five fields by hand to
// keep them — the wrapper carries every refusal's context now, so the detail
// survives without anybody maintaining a list of which fields matter.

export const DELETE = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;
  if (!ops.body.id) return { error: "missing" };

  const result = await removeShift(ops, ops.body.id);
  if (result.error) return result;
  return { ok: true };
});
