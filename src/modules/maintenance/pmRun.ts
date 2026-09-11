// PREVENTIVE PLANS RAISE WORK ORDERS — the run.
//
// Called once per studio by `cron/daily-notices`, beside Field Service's
// `raiseDuePlanJobs` and for the same reason: a cron of its own is a Vercel
// limit to re-learn, and one of those once refused a whole deployment. AND
// called by the readings route straight after a meter reading is recorded, so a
// reading that crosses 250 hours raises the service now rather than tomorrow.
//
// EVERY DECISION IS PURE (./schedule, tested): `raiseDecision` for a calendar
// plan, `meterRaiseDecision` for a meter plan against the machine's latest
// reading. This file only reads, writes and tells. One open order per plan;
// idempotent by the occurrence an order answers — `pmDueOn` for a date,
// `pmDueReading` for a reading — so a second run raises nothing twice.
//
// WITH THE STUDIO'S AUTHORITY, as an engine rule runs: nobody is signed in at
// 06:00, and a plan raising its own work is the studio acting (`system`).
// Assignees are told through the same notice a person assigning them sends.

import { repo } from "@/platform/db/repo";
import { listSections } from "@/platform/db/sections";
import { getStudioById } from "@/modules/main/studios";
import { raiseDecision, meterRaiseDecision, checklistFor } from "./schedule";
import { latestReading } from "./meters";
import { writeOrder, announce } from "./maintenance";
import type { MeterReading, PmPlan, WorkOrder } from "./schema";

const Plans = repo<PmPlan>("pmPlans");
const Orders = repo<WorkOrder>("workOrders");
const Readings = repo<MeterReading>("meterReadings");

export async function raiseDuePmOrders(studioId: string, todayISO: string): Promise<number> {
  const sections = await listSections(studioId);
  const plansSection = sections.find((s) => s.key === "maintenance-plans");
  const ordersSection = sections.find((s) => s.key === "maintenance-orders");
  const assetsSection = sections.find((s) => s.key === "maintenance-assets");
  // A studio not yet planted with Maintenance has nothing to raise — not an
  // error, and not something to plant from a cron.
  if (!plansSection || !ordersSection) return 0;
  const studio = await getStudioById(studioId);
  if (!studio) return 0;

  const at = { id: studioId };
  const [plans, orders, readings] = await Promise.all([
    Plans.find({ studio: at, section: plansSection }),
    Orders.find({ studio: at, section: ordersSection }),
    assetsSection ? Readings.find({ studio: at, section: assetsSection }) : Promise.resolve([] as MeterReading[]),
  ]);
  const scope = { studio: { id: studioId, numbering: (studio as { numbering?: unknown }).numbering }, section: ordersSection };

  const raise = async (plan: PmPlan, extra: Record<string, unknown>) => {
    const order = await writeOrder(scope, {
      title: plan.title,
      description: plan.description,
      type: plan.type,
      priority: plan.priority,
      assetId: plan.assetId,
      locationId: plan.locationId,
      assignedToCollaboratorIds: plan.assignedToCollaboratorIds || [],
      estimatedHours: plan.estimatedHours,
      pmPlanId: plan.id,
      checklist: checklistFor(plan.checklist || []),
      ...extra,
    }, "system");
    orders.push(order);
    await announce(studioId, order, []);
  };

  let raised = 0;
  for (const plan of plans) {
    if (plan.trigger === "meter") {
      const d = meterRaiseDecision(plan, orders, latestReading(readings, plan.assetId, plan.meterUnit || ""));
      if (!d) continue;
      // A METER ORDER IS DUE THE DAY THE READING SAID SO.
      if (d.raise) { await raise(plan, { dueOn: todayISO, pmDueReading: d.dueReading }); raised += 1; }
      if (d.next !== null) {
        const next = d.next;
        const stamp = new Date().toISOString();
        await Plans.update({ studio: at, section: plansSection }, plan.id, (row) =>
          (row.nextDueReading === d.dueReading ? { nextDueReading: next, updatedAt: stamp } : {}));
      }
      continue;
    }

    const d = raiseDecision(plan, orders, todayISO);
    if (!d) continue;
    if (d.raise) { await raise(plan, { dueOn: d.occurrence, pmDueOn: d.occurrence }); raised += 1; }
    // MOVED ON EVEN WHEN THE ORDER ALREADY EXISTED — the crash-between case —
    // and only if the plan still points at the occurrence judged, so a plan
    // somebody re-dated since the read is left as they set it.
    if (d.next) {
      const next = d.next;
      const stamp = new Date().toISOString();
      await Plans.update({ studio: at, section: plansSection }, plan.id, (row) =>
        (row.nextDue === d.occurrence ? { nextDue: next, updatedAt: stamp } : {}));
    }
  }
  return raised;
}
