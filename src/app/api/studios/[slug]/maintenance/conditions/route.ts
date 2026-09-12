// CONDITION READINGS — what a gauge on a machine says.
//
// A READING OUT OF RANGE RAISES WORK, so recording one asks the condition run
// straight away: a bearing that has just gone over 80 °C raises its order now
// rather than at tomorrow's cron. The run is idempotent by the reading's id, so
// asking it again tomorrow raises nothing twice. Called from HERE rather than
// from the service, because the run writes orders through the service module
// and the service calling the run would be an import loop — the same shape the
// meter readings route carries, for the same reason.
//
// Readings are read with the machines and with the plans (each screen's own
// GET); this route only records and takes back.
import { route, refused } from "@/platform/http/route";
import { log } from "@/platform/http/observability";
import { maintenanceContext, recordConditionReading, removeConditionReading } from "@/modules/maintenance/maintenance";
import { raiseDueConditionOrders } from "@/modules/maintenance/pmRun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: maintenanceContext, body: true, name: "maintenance-conditions" };

export const POST = route(spec, async (m) => {
  const result = await recordConditionReading(m, m.body);
  if (refused(result)) return result;
  // THE READING STANDS WHATEVER THE RUN DOES. A measurement is a fact about the
  // machine; losing it because the work it should have raised could not be
  // written would be the wrong half to drop, and tomorrow's cron tries again.
  let raised = 0;
  try {
    raised = await raiseDueConditionOrders(m.studio.id, new Date().toISOString().slice(0, 10));
  } catch (err) {
    log.error("maintenance-conditions: condition run failed", {
      studioId: m.studio.id, error: err instanceof Error ? err.message : String(err),
    });
  }
  return { status: 201, body: { ok: true, reading: result.reading, raised } };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await removeConditionReading(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
