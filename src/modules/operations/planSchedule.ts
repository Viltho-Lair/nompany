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
 * THE OCCURRENCE AFTER `iso` for a plan's frequency, or "" when either cannot
 * be read. Months are CALENDAR months clamped to the month's end — a plan due
 * on the 31st of January is next due on the last day of February, not in March,
 * because a visit that drifts a month late every time it meets a short month is
 * a schedule nobody asked for.
 */
export function nextOccurrence(iso: unknown, frequency: unknown): string {
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
  const date = Math.min(Number(m[3]), last);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
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
