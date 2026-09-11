// PREVENTIVE PLANS — work that comes round on a calendar.
//
// PUT CARRIES THE THREE MOVES AS NAMED ACTIONS — pause, resume, retire — and
// otherwise edits, so a generic edit can never write a status (the change-order
// lesson). The work orders a plan raises are written by the daily run, never
// through this route.
import { route, refused } from "@/platform/http/route";
import {
  maintenanceContext, listPlans, createPlan, editPlan, movePlan, removePlan,
} from "@/modules/maintenance/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: maintenanceContext, body: true, name: "maintenance-plans" };

const MOVE: Record<string, string> = { pause: "Paused", resume: "Active", retire: "Retired" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const result = await listPlans(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createPlan(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, pmPlan: result.plan } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const id = String(m.body.id);
  const action = String(m.body.action || "");
  if (action) {
    if (!MOVE[action]) return { error: "status" };
    const moved = await movePlan(m, id, MOVE[action]);
    if (refused(moved)) return moved;
    return { ok: true, pmPlan: moved.plan };
  }
  const result = await editPlan(m, id, m.body);
  if (refused(result)) return result;
  return { ok: true, pmPlan: result.plan };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await removePlan(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
