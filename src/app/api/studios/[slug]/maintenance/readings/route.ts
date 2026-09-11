// METER READINGS — how far a machine has run.
//
// A READING CAN BRING A PLAN DUE, so recording one asks the plan run straight
// away: a reading that crosses 250 hours raises the service now rather than at
// tomorrow's cron. The run is idempotent, so asking it again tomorrow raises
// nothing twice. It is called from HERE rather than from the service because
// the run writes orders through the service module — the service calling the
// run would be an import loop.
//
// Readings are read with the machines (the Machines screen's own GET); this
// route only records and takes back.
import { route, refused } from "@/platform/http/route";
import { log } from "@/platform/http/observability";
import { maintenanceContext, recordReading, removeReading } from "@/modules/maintenance/maintenance";
import { raiseDuePmOrders } from "@/modules/maintenance/pmRun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: maintenanceContext, body: true, name: "maintenance-readings" };

export const POST = route(spec, async (m) => {
  const result = await recordReading(m, m.body);
  if (refused(result)) return result;
  // THE READING STANDS WHATEVER THE RUN DOES — a plan that cannot be raised is
  // tomorrow's cron's to try again, never a reason to lose what was read.
  let raised = 0;
  try {
    raised = await raiseDuePmOrders(m.studio.id, new Date().toISOString().slice(0, 10));
  } catch (err) {
    log.error("maintenance-readings: plan run failed", {
      studioId: m.studio.id, error: err instanceof Error ? err.message : String(err),
    });
  }
  return { status: 201, body: { ok: true, reading: result.reading, raised } };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await removeReading(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
