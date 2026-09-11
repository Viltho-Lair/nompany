import { route, refused } from "@/platform/http/route";
import { operationsContext, createPermit, editPermit, movePermit, removePermit } from "@/modules/operations/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: operationsContext, body: true, name: "operations/permits" };
const manageable = (ops: { canManage: boolean }) => (ops.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;

  const result = await createPermit(ops, ops.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, permit: result.permit } };
});

export const PUT = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;
  if (!ops.body.id) return { error: "missing" };

  const result = await editPermit(ops, ops.body.id, ops.body);
  if (refused(result)) return result;
  return { ok: true, permit: result.permit };
});

// ISSUE, CLOSE, CANCEL — the permit's workflow (tier 5), reachable from the
// Schedule screen's Permits tab until a studio has the Quality & HSE register.
export const PATCH = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;
  if (!ops.body.id) return { error: "missing" };

  const result = await movePermit(ops, String(ops.body.id), String(ops.body.status ?? ""));
  if (refused(result)) return result;
  return { ok: true, permit: result.permit };
});

export const DELETE = route(spec, async (ops) => {
  const refusal = manageable(ops);
  if (refusal) return refusal;
  if (!ops.body.id) return { error: "missing" };

  const result = await removePermit(ops, ops.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
