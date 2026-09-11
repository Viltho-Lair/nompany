// SERVICE CONTRACTS (SLA) — the maintenance a studio sells. The rules are
// modules/maintenance/contracts, pure; the visits are raised as work orders by
// the daily run, never through this route.
//
// PUT CARRIES THE MOVES AS NAMED ACTIONS — cancel, reinstate, and tick (a
// visit kept by hand) — and otherwise edits, so a generic edit can never write
// a status (the change-order lesson). PATCH raises a CALL-OUT, which is a work
// order and answers to the order's right.
import { route, refused } from "@/platform/http/route";
import {
  maintenanceContext, listContracts, createContract, editContract, tickVisit, moveContract, removeContract,
  raiseCallOut,
} from "@/modules/maintenance/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: maintenanceContext, body: true, name: "maintenance-contracts" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const result = await listContracts(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createContract(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, contract: result.contract } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const id = String(m.body.id);
  const action = String(m.body.action || "");
  if (action === "tick") {
    const ticked = await tickVisit(m, id, m.body);
    if (refused(ticked)) return ticked;
    return { ok: true, contract: ticked.contract };
  }
  if (action === "cancel" || action === "reinstate") {
    const moved = await moveContract(m, id, action);
    if (refused(moved)) return moved;
    return { ok: true, contract: moved.contract };
  }
  if (action) return { error: "status" };
  const result = await editContract(m, id, m.body);
  if (refused(result)) return result;
  return { ok: true, contract: result.contract };
});

export const PATCH = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await raiseCallOut(m, String(m.body.id), m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, order: result.order } };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await removeContract(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
