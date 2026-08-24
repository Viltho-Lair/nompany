import { route, refused } from "@/platform/http/route";
import { scheduleContext, createShift, editShift, removeShift } from "@/modules/operations/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE ROTA'S WRITES — on the schedule sub-section's own grant. A clash is a 409
// with its evidence (the overlapping shift's times), and scheduling over leave
// HR has approved comes back as on-leave with from/to/type; the route wrapper
// carries every refusal's context, so those fields survive without a hand-kept
// list of which ones matter.
const spec = { auth: "studio", context: scheduleContext, body: true, name: "operations-schedule/shifts" };
const manageable = (c: { canManage: boolean }) => (c.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (c) => {
  const refusal = manageable(c);
  if (refusal) return refusal;
  const result = await createShift(c, c.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, shift: result.shift } };
});

export const PUT = route(spec, async (c) => {
  const refusal = manageable(c);
  if (refusal) return refusal;
  if (!c.body.id) return { error: "missing" };
  const result = await editShift(c, c.body.id, c.body);
  if (refused(result)) return result;
  return { ok: true, shift: result.shift };
});

export const DELETE = route(spec, async (c) => {
  const refusal = manageable(c);
  if (refusal) return refusal;
  if (!c.body.id) return { error: "missing" };
  const result = await removeShift(c, c.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
