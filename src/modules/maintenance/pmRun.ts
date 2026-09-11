// PREVENTIVE PLANS RAISE WORK ORDERS — the daily run.
//
// Called once per studio by `cron/daily-notices`, beside Field Service's
// `raiseDuePlanJobs` and for the same reason: a cron of its own is a Vercel
// limit to re-learn, and one of those once refused a whole deployment.
//
// EVERY DECISION IS `raiseDecision`'s (./schedule, pure and tested); this file
// only reads, writes and tells. One open order per plan; idempotent by the
// occurrence an order answers (`pmDueOn`), so a second run the same day — or a
// crash between raising and moving the date — raises nothing twice.
//
// WITH THE STUDIO'S AUTHORITY, as an engine rule runs: nobody is signed in at
// 06:00, and a plan raising its own work is the studio acting (`system`).
// Assignees are told through the same notice a person assigning them sends.

import { repo } from "@/platform/db/repo";
import { listSections } from "@/platform/db/sections";
import { getStudioById } from "@/modules/main/studios";
import { raiseDecision, checklistFor } from "./schedule";
import { writeOrder, announce } from "./maintenance";
import type { PmPlan, WorkOrder } from "./schema";

const Plans = repo<PmPlan>("pmPlans");
const Orders = repo<WorkOrder>("workOrders");

export async function raiseDuePmOrders(studioId: string, todayISO: string): Promise<number> {
  const sections = await listSections(studioId);
  const plansSection = sections.find((s) => s.key === "maintenance-plans");
  const ordersSection = sections.find((s) => s.key === "maintenance-orders");
  // A studio not yet planted with Maintenance has nothing to raise — not an
  // error, and not something to plant from a cron.
  if (!plansSection || !ordersSection) return 0;
  const studio = await getStudioById(studioId);
  if (!studio) return 0;

  const at = { id: studioId };
  const [plans, orders] = await Promise.all([
    Plans.find({ studio: at, section: plansSection }),
    Orders.find({ studio: at, section: ordersSection }),
  ]);

  let raised = 0;
  for (const plan of plans) {
    const d = raiseDecision(plan, orders, todayISO);
    if (!d) continue;
    if (d.raise) {
      const order = await writeOrder(
        { studio: { id: studioId, numbering: (studio as { numbering?: unknown }).numbering }, section: ordersSection },
        {
          title: plan.title,
          description: plan.description,
          type: plan.type,
          priority: plan.priority,
          assetId: plan.assetId,
          locationId: plan.locationId,
          assignedToCollaboratorIds: plan.assignedToCollaboratorIds || [],
          dueOn: d.occurrence,
          estimatedHours: plan.estimatedHours,
          pmPlanId: plan.id,
          pmDueOn: d.occurrence,
          checklist: checklistFor(plan.checklist || []),
        },
        "system",
      );
      orders.push(order);
      raised += 1;
      await announce(studioId, order, []);
    }
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
