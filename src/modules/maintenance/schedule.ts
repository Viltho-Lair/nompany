// PREVENTIVE PLANS, PURELY — when a plan raises work, and what happens to its
// next due date. No store, no clock: `today` is always passed in.
//
// ONE CALENDAR ENGINE. The occurrence arithmetic is Field Service's
// `nextOccurrence` (calendar months clamped to the month's end), imported
// rather than copied — two copies of "when is Quarterly next" are two answers
// free to disagree the first time somebody fixes one.
//
// FIXED OR FLOATING — the one scheduling choice that matters (Maximo, MaintainX
// and Fiix all offer both; Odoo and ERPNext offer only floating):
//
//   FIXED     the next due date follows the calendar, whenever the last one was
//             done. It moves on the moment an occurrence is raised. Statutory
//             inspections, which fall due on a date whatever happened last time.
//   FLOATING  the next due date is the completion date plus the interval. It
//             moves when the work is completed. Wear items, where servicing
//             early resets the clock.
//
// ONE OPEN WORK ORDER PER PLAN, whichever mode. A plan three quarters behind is
// not three identical orders against one machine: the next occurrence waits
// until the open one is finished, and arrives already overdue — which is the
// honest state, and what compliance then reports.

import { nextOccurrence, PLAN_FREQUENCIES } from "@/modules/operations/planSchedule";
import { addDaysISO } from "@/shared/dates";
import { orderOpen } from "./model";
import { isMeterUnit } from "./meters";

export { PLAN_FREQUENCIES };

/**
 * WHAT A PLAN RUNS ON. The calendar (every quarter), or a METER (every 250
 * running hours) — the second because a generator that sat idle all summer has
 * not worn a quarter's worth, and one run flat out through a shutdown has worn
 * three. Meter plans fall due on the machine's latest reading rather than a date.
 */
export const PLAN_TRIGGERS = ["calendar", "meter"] as const;
export type PlanTrigger = (typeof PLAN_TRIGGERS)[number];
const isMeterPlan = (p: { trigger?: unknown }) => String(p.trigger ?? "").trim() === "meter";

export const SCHEDULE_MODES = ["fixed", "floating"] as const;
export type ScheduleMode = (typeof SCHEDULE_MODES)[number];

export const PLAN_STATUSES = ["Active", "Paused", "Retired"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/** Paused stops raising and can resume; Retired is the end of a plan's life. */
export const PLAN_MOVES: Readonly<Record<PlanStatus, readonly PlanStatus[]>> = Object.freeze({
  Active: ["Paused", "Retired"],
  Paused: ["Active", "Retired"],
  Retired: [],
});

export const MAX_LEAD_DAYS = 60;
export const MAX_CHECKLIST = 40;

const text = (v: unknown) => String(v ?? "").trim();
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isFrequency = (v: unknown) => (PLAN_FREQUENCIES as readonly string[]).includes(text(v));

/**
 * A PLAN'S CHECKLIST, stored as labels. Each work order it raises gets its own
 * copy with a tick per item, so editing the plan re-words nothing already
 * issued — the BOQ rate rule, for its reason.
 */
export function cleanChecklist(raw: unknown): string[] {
  return (Array.isArray(raw) ? raw : [])
    .map((x) => text(x).slice(0, 200))
    .filter(Boolean)
    .slice(0, MAX_CHECKLIST);
}

/** The copy a work order carries: one tick per item, none ticked. */
export const checklistFor = (labels: readonly string[]) =>
  labels.map((label, i) => ({ id: String(i + 1), label, done: false }));

type PlanLike = {
  id?: unknown; title?: unknown; status?: unknown; frequency?: unknown; scheduleMode?: unknown;
  nextDue?: unknown; leadDays?: unknown; checklist?: unknown;
  trigger?: unknown; assetId?: unknown; meterUnit?: unknown; meterEvery?: unknown; nextDueReading?: unknown;
};

/** Why this plan cannot be saved — or null. */
export function planProblem(plan: PlanLike): string | null {
  if (!text(plan.title)) return "title";
  if (Array.isArray(plan.checklist) && plan.checklist.length > MAX_CHECKLIST) return "checklist-long";
  // A METER PLAN IS ABOUT ONE MACHINE'S METER — without the machine there is no
  // reading to fall due on, and it would never raise anything, silently.
  if (isMeterPlan(plan)) {
    if (!text(plan.assetId)) return "meter-asset";
    if (!isMeterUnit(plan.meterUnit)) return "meter-unit";
    const every = Number(plan.meterEvery);
    if (!Number.isFinite(every) || every <= 0) return "meter-every";
    const next = Number(plan.nextDueReading);
    if (plan.nextDueReading === "" || plan.nextDueReading === null || !Number.isFinite(next) || next < 0) return "meter-next";
    return null;
  }
  if (!isFrequency(plan.frequency)) return "frequency";
  if (!ISO.test(text(plan.nextDue))) return "next-due";
  const lead = Number(plan.leadDays ?? 0);
  if (!Number.isInteger(lead) || lead < 0 || lead > MAX_LEAD_DAYS) return "lead-days";
  return null;
}
// (`checklist-long` is its own token: `checklist` already means "an item is
// unticked" on a work order, and one word for two refusals is one sentence on
// screen for both.)

type OrderLike = {
  pmPlanId?: unknown; pmDueOn?: unknown; pmDueReading?: unknown; status?: unknown; completedAt?: unknown;
};

/**
 * WHAT TODAY'S RUN DOES FOR A METER PLAN, given the machine's latest reading.
 *
 * `dueReading` is the reading the order answers — the plan's `nextDueReading`
 * — and it is what makes the run idempotent, the way `pmDueOn` is for a
 * calendar plan. Fixed moves the trigger on by the interval the moment it
 * raises (the service is every 250 hours of the meter, whenever it is done);
 * floating moves it from the reading at completion (`nextDueReadingOnClose`).
 */
export function meterRaiseDecision(
  plan: PlanLike,
  orders: readonly OrderLike[],
  reading: { value?: unknown } | null,
): { raise: boolean; dueReading: number; next: number | null } | null {
  if (text(plan.status) !== "Active" || !isMeterPlan(plan) || !reading) return null;
  const due = Number(plan.nextDueReading);
  const every = Number(plan.meterEvery);
  if (!Number.isFinite(due) || !Number.isFinite(every) || every <= 0) return null;
  const mine = orders.filter((o) => text(o.pmPlanId) === text(plan.id));
  if (mine.some((o) => orderOpen(o))) return null;
  if (Number(reading.value) < due) return null;
  const following = due + every;
  const already = mine.some((o) => Number(o.pmDueReading) === due);
  if (already) return { raise: false, dueReading: due, next: following };
  return { raise: true, dueReading: due, next: text(plan.scheduleMode) === "floating" ? null : following };
}

/**
 * WHERE A FLOATING METER PLAN GOES WHEN ITS WORK IS FINISHED — the reading at
 * completion plus the interval, or past a cancelled occurrence. Only the order
 * answering the plan's current trigger moves it; a fixed plan returns null.
 */
export function nextDueReadingOnClose(
  plan: PlanLike, order: OrderLike, status: string, readingAtClose: number | null,
): number | null {
  if (!isMeterPlan(plan) || text(plan.scheduleMode) !== "floating") return null;
  if (text(order.pmPlanId) !== text(plan.id) || Number(order.pmDueReading) !== Number(plan.nextDueReading)) return null;
  const every = Number(plan.meterEvery);
  if (!Number.isFinite(every) || every <= 0) return null;
  if (status === "Completed") return (readingAtClose ?? Number(plan.nextDueReading)) + every;
  if (status === "Cancelled") return Number(plan.nextDueReading) + every;
  return null;
}

/**
 * WHAT TODAY'S RUN DOES FOR THIS PLAN.
 *
 * `raise` — whether to raise a work order for `occurrence`.
 * `next`  — what `nextDue` becomes now, or null to leave it.
 *
 * IDEMPOTENT BY THE OCCURRENCE: an order records the due date it answers
 * (`pmDueOn`), so a second run on the same day — or a crash between raising the
 * order and moving the date — finds it and raises nothing. For a fixed plan the
 * date still moves on (the crash case); for a floating one whose order is
 * already finished, the date moves on from the occurrence, so a plan whose
 * completion update was lost is not stuck for ever.
 */
export function raiseDecision(
  plan: PlanLike,
  orders: readonly OrderLike[],
  today: string,
): { raise: boolean; occurrence: string; next: string | null } | null {
  // A METER PLAN IS NOT ON THE CALENDAR — `meterRaiseDecision` answers it.
  if (text(plan.status) !== "Active" || isMeterPlan(plan)) return null;
  const occurrence = text(plan.nextDue);
  if (!ISO.test(occurrence) || !isFrequency(plan.frequency)) return null;
  const mine = orders.filter((o) => text(o.pmPlanId) === text(plan.id));
  if (mine.some((o) => orderOpen(o))) return null;
  const lead = Math.max(0, Math.min(MAX_LEAD_DAYS, Number(plan.leadDays) || 0));
  if (today < addDaysISO(occurrence, -lead)) return null;

  const floating = text(plan.scheduleMode) === "floating";
  const following = nextOccurrence(occurrence, plan.frequency) || null;
  const already = mine.some((o) => text(o.pmDueOn) === occurrence);
  if (already) return { raise: false, occurrence, next: following };
  return { raise: true, occurrence, next: floating ? null : following };
}

/**
 * WHERE A FLOATING PLAN GOES WHEN ITS WORK IS FINISHED — or null.
 *
 * Only the order answering the plan's CURRENT occurrence moves it: a stale
 * order finishing late must not drag a plan back. Completed moves it to the
 * completion day plus the interval; Cancelled skips that occurrence. A fixed
 * plan already moved when the order was raised, so it returns null.
 */
export function nextDueOnClose(plan: PlanLike, order: OrderLike, status: string, closedDay: string): string | null {
  if (text(plan.scheduleMode) !== "floating" || isMeterPlan(plan)) return null;
  if (text(order.pmPlanId) !== text(plan.id) || text(order.pmDueOn) !== text(plan.nextDue)) return null;
  if (status === "Completed") return nextOccurrence(closedDay, plan.frequency) || null;
  if (status === "Cancelled") return nextOccurrence(text(order.pmDueOn), plan.frequency) || null;
  return null;
}

// ---- compliance ----------------------------------------------------------------

const INTERVAL_DAYS: Record<string, number> = { Weekly: 7, Monthly: 30, Quarterly: 91, "Half-yearly": 182, Yearly: 365 };

/**
 * HOW LATE STILL COUNTS AS ON TIME: a tenth of the interval, at least a day —
 * the window commonly used for PM compliance. A weekly check done the next day
 * is on time; an annual one done five weeks late is not.
 */
export const complianceWindowDays = (frequency: unknown) =>
  Math.max(1, Math.round((INTERVAL_DAYS[text(frequency)] || 0) * 0.1));

/**
 * PM COMPLIANCE for one plan's orders: finished inside the window over
 * everything that fell due. Work still open past its window counts as late —
 * leaving it out would let a plan score 100% by never finishing anything.
 * Cancelled work is left out; it was decided not to be done. `percent` is null
 * when nothing has fallen due yet, because 0% and "no history" are different.
 */
export function planCompliance(orders: readonly OrderLike[], frequency: unknown, today: string) {
  const window = complianceWindowDays(frequency);
  let onTime = 0;
  let late = 0;
  for (const o of orders) {
    const due = text(o.pmDueOn);
    if (!ISO.test(due)) continue;
    const limit = addDaysISO(due, window);
    const status = text(o.status);
    if (status === "Completed" || status === "Closed") {
      if (text(o.completedAt).slice(0, 10) <= limit) onTime += 1;
      else late += 1;
    } else if (orderOpen(o) && today > limit) {
      late += 1;
    }
  }
  const total = onTime + late;
  return { onTime, late, total, percent: total ? Math.round((onTime / total) * 100) : null };
}
