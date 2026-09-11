// WORK ORDERS — Maintenance's register of authorised work.
//
// FOUR VERBS, FOUR ACTS, the change-order route's lesson: an edit (PUT) and a
// move along the ladder (PATCH) are different doors, so a generic edit can never
// write a status. The status is read as a STRING before the service sees it —
// passing the whole body where a service expects one value is exactly how a
// rejected variation once approved itself.
import { route, refused } from "@/platform/http/route";
import {
  maintenanceContext, listOrders, createOrder, editOrder, moveOrder, removeOrder, tickChecklist,
} from "@/modules/maintenance/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: maintenanceContext, body: true, name: "maintenance-orders" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const result = await listOrders(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createOrder(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, workOrder: result.order } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await editOrder(m, String(m.body.id), m.body);
  if (refused(result)) return result;
  return { ok: true, workOrder: result.order };
});

export const PATCH = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  // A CHECKLIST TICK IS NOT A MOVE — a request naming a step ticks it and
  // touches no status.
  if (m.body.check !== undefined) {
    const ticked = await tickChecklist(m, String(m.body.id), { check: String(m.body.check), done: m.body.done === true });
    if (refused(ticked)) return ticked;
    return { ok: true, workOrder: ticked.order };
  }
  const result = await moveOrder(m, String(m.body.id), {
    status: String(m.body.status || ""),
    holdReason: String(m.body.holdReason || ""),
    resolution: String(m.body.resolution || ""),
    failureProblem: String(m.body.failureProblem || ""),
    failureCause: String(m.body.failureCause || ""),
    failureRemedy: String(m.body.failureRemedy || ""),
    upAt: String(m.body.upAt || ""),
  });
  if (refused(result)) return result;
  return { ok: true, workOrder: result.order };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await removeOrder(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
