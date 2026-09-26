// ONE JOB SYSTEM — the pure half (tier 5).
//
// Two things the jobs collection now takes over from the record engine, both
// decided here so the daily run, the migration script and their test agree:
//
//   WHEN A PM PLAN IS NEXT DUE after an occurrence — the plan says "Quarterly"
//   and nothing ever turned that into a date or a visit;
//
//   WHAT A SERVICE ORDER BECOMES as a job — the engine's `job` type was a
//   second job system dispatch ignored, and the owner chose to fold it in.
//
// PURE: no store, no clock.

import { addDaysISO } from "@/shared/dates";

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS: Record<string, number> = { Monthly: 1, Quarterly: 3, "Half-yearly": 6, Yearly: 12 };

/**
 * THE FREQUENCIES `nextOccurrence` CAN READ — the one list, shared by Field
 * Service's PM register and Maintenance's preventive plans, so a plan can never
 * be saved with a frequency nothing turns into a date.
 */
export const PLAN_FREQUENCIES = ["Weekly", "Monthly", "Quarterly", "Half-yearly", "Yearly"] as const;
export type PlanFrequency = (typeof PLAN_FREQUENCIES)[number];

/**
 * THE OCCURRENCE AFTER `iso` for a plan's frequency, or "" when either cannot
 * be read. Months are CALENDAR months clamped to the month's end — a plan due
 * on the 31st of January is next due on the last day of February, not in March,
 * because a visit that drifts a month late every time it meets a short month is
 * a schedule nobody asked for.
 *
 * AND CLAMPING IS NOT DRIFTING — pass the plan's own day of the month as
 * `anchorDay`. Counted from the previous due date alone, a plan on the 31st
 * went 31 Jan → 28 Feb → 28 Mar → 28 Apr for ever: February's clamp became
 * the plan's new day, which is the drift this comment always claimed not to
 * have. With the anchor, 31 Jan → 28 Feb → 31 Mar → 30 Apr. Without one the
 * day of `iso` is the anchor, which is exactly the old arithmetic — right for
 * a floating plan, whose next date is meant to follow the completion day.
 */
export function nextOccurrence(iso: unknown, frequency: unknown, anchorDay?: unknown): string {
  const day = String(iso ?? "").slice(0, 10);
  const m = ISO_DAY.exec(day);
  if (!m) return "";
  if (frequency === "Weekly") return addDaysISO(day, 7);
  const months = MONTHS[String(frequency ?? "")];
  if (!months) return "";
  const total = Number(m[2]) - 1 + months;
  const year = Number(m[1]) + Math.floor(total / 12);
  const month = total % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const anchor = Number(anchorDay);
  const wanted = Number.isInteger(anchor) && anchor >= 1 && anchor <= 31 ? anchor : Number(m[3]);
  const date = Math.min(wanted, last);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

/**
 * WHICH DAY OF THE MONTH A PLAN FALLS ON, read off its next due date and the
 * occurrences it has already raised — nothing stored says, and existing plans
 * must keep working without a migration.
 *
 * Below the 28th the next due date's own day IS the anchor: no clamp can have
 * produced it, so it is the day the plan was set up on or the day somebody
 * deliberately moved it to. From the 28th up it may be a clamp that has
 * already drifted (31 Jan → 28 Feb → 28 Mar), and the plan's earlier
 * occurrences remember the day it really falls on — a clamp only ever LOWERS
 * the day, so the largest seen is the anchor. The one case this reads wrong is
 * a plan somebody moved by hand from the 31st to the 28th–30th, and it is the
 * price of repairing the far commoner case: every plan that ever met February.
 */
export function occurrenceAnchor(nextDue: unknown, earlier: readonly unknown[] = []): number | null {
  const m = ISO_DAY.exec(String(nextDue ?? "").slice(0, 10));
  if (!m) return null;
  const own = Number(m[3]);
  if (own < 28) return own;
  return earlier.reduce<number>((best, e) => {
    const x = ISO_DAY.exec(String(e ?? "").slice(0, 10));
    return x && Number(x[3]) > best ? Number(x[3]) : best;
  }, own);
}

/** A service order's state, as a job's. `On site` is the only one in flight. */
export const SERVICE_ORDER_STATUS: Readonly<Record<string, "scheduled" | "in-progress" | "completed" | "cancelled">> =
  Object.freeze({
    Logged: "scheduled",
    Scheduled: "scheduled",
    "On site": "in-progress",
    Completed: "completed",
    Cancelled: "cancelled",
  });

/**
 * WHAT A SERVICE ORDER BECOMES AS A JOB. Nothing is dropped: the fields a job
 * has no column for — customer, priority, the reported fault, the work done —
 * travel in its notes under their own labels, and the record's own reference
 * leads them, so the job can be found by the number people quoted.
 *
 * A status the map does not know reads as `scheduled` — the one state a job can
 * still be moved on from — rather than being guessed into a closed one.
 */
export function jobFromServiceOrder(record: {
  id?: unknown; reference?: unknown; status?: unknown; createdAt?: unknown; updatedAt?: unknown;
  values?: Record<string, unknown>;
}) {
  const v = record.values || {};
  const text = (x: unknown) => String(x ?? "").trim();
  const status = SERVICE_ORDER_STATUS[text(record.status)] || "scheduled";
  const notes = [
    ["Service order", text(record.reference)],
    ["Customer", text(v.customer)],
    ["Priority", text(v.priority)],
    ["Reported", text(v.reportedOn)],
    ["Due by", text(v.dueBy)],
    ["Reported fault", text(v.fault)],
    ["Work done", text(v.workDone)],
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n");
  return {
    title: text(v.title) || text(record.reference) || "Service order",
    kind: "service-job" as const,
    status,
    location: text(v.site),
    scheduledStart: text(v.dueBy) || text(v.reportedOn),
    completedAt: status === "completed" ? text(record.updatedAt) : "",
    notes: notes.slice(0, 4000),
    migratedFromRecordId: text(record.id),
    createdAt: text(record.createdAt),
  };
}
