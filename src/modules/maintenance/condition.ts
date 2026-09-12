// CONDITION MONITORING, PURELY — a reading out of range, and the work it
// raises. No store, no clock: `now` is always passed in.
//
// A GAUGE IS NOT A METER, and that is why this is its own file and its own
// collection rather than a flag on ./meters. A meter is CUMULATIVE — running
// hours, kilometres, cycles — so `readingProblem` refuses a value below the
// last one, refuses one dated behind the latest, and refuses a negative. All
// three are right for a meter and wrong for a gauge:
//
//   A BEARING TEMPERATURE FALLS as legitimately as it rises. Under the meter's
//   rule every machine that cooled down would be refused.
//   A READING IS OFTEN BACK-DATED — yesterday's logbook, typed this morning.
//   Behind a meter that would read as the meter going backwards; on a gauge it
//   is simply an earlier measurement, and the LATEST one still decides.
//   MINUS FORTY IS A READING. A cold store runs there.
//
// Sharing the collection would be worse than sharing the rules: half its rows
// would be free to go down, and nothing reading `meterReadings` could rely on
// the one property that makes a meter trustworthy.
//
// WHAT IS MEASURED IS THE PLAN. A condition point — this machine, this
// quantity, these limits — IS a preventive plan whose trigger is `condition`.
// So it inherits one open order at a time, a checklist, assignees and the
// Active/Paused/Retired ladder instead of growing a second register beside the
// plans, and it mints no permission key: a condition plan answers to
// `maintenance.plans` and a reading to `maintenance.orders.edit`, exactly as a
// meter reading does.

import { orderOpen } from "./model";

export const MAX_CONDITION_LABEL = 60;
/** °C, mm/s, bar, ppm, dB — TYPED, never chosen from a list. See `conditionPlanProblem`. */
export const MAX_CONDITION_UNIT = 12;
/** The widest a gauge may read, either side of nought. */
export const MAX_CONDITION_VALUE = 1e9;

const text = (v: unknown) => String(v ?? "").trim();
const isConditionPlanOf = (p: { trigger?: unknown }) => text(p.trigger) === "condition";
export const isConditionPlan = isConditionPlanOf;

type PlanLike = {
  id?: unknown; status?: unknown; trigger?: unknown; assetId?: unknown;
  conditionLabel?: unknown; conditionUnit?: unknown; limitLow?: unknown; limitHigh?: unknown;
};

/**
 * THE POINT'S LIMITS, as numbers or null. BLANK IS NOT NOUGHT: a point with no
 * low limit is one where low does not matter, and reading that as 0 would put
 * every gauge permanently above its floor.
 */
export function conditionLimits(plan: PlanLike): { low: number | null; high: number | null } {
  const one = (v: unknown) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return { low: one(plan.limitLow), high: one(plan.limitHigh) };
}

/**
 * WHICH WAY THIS READING IS OUT — or null when it is in range.
 *
 * THE LIMIT IS THE LAST ACCEPTABLE VALUE, so a high limit of 90 is breached at
 * 90.1 and not at 90. Somebody setting a limit is naming the worst they will
 * accept, not the first value they will not.
 */
export function outOfRange(value: number, low: number | null, high: number | null): "low" | "high" | null {
  if (!Number.isFinite(value)) return null;
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  return null;
}

/**
 * WHY THIS CONDITION PLAN CANNOT BE SAVED — or null. Asked by `planProblem`,
 * which owns the calendar and meter branches.
 *
 * A POINT WITH NO LIMIT AT ALL WOULD NEVER RAISE ANYTHING, silently — the same
 * failure `meter-asset` exists to prevent, from the other side. One limit is
 * enough: plenty of points have only a ceiling (a temperature) or only a floor
 * (an oil pressure).
 */
export function conditionPlanProblem(plan: PlanLike): string | null {
  if (!text(plan.assetId)) return "condition-asset";
  if (!text(plan.conditionLabel)) return "condition-label";
  if (!text(plan.conditionUnit)) return "condition-unit";
  const { low, high } = conditionLimits(plan);
  if (low === null && high === null) return "condition-limits";
  // A FLOOR ABOVE THE CEILING is a point nothing can ever satisfy: every
  // reading would breach it, in both directions at once.
  if (low !== null && high !== null && low >= high) return "condition-order";
  return null;
}

type ReadingLike = { id?: unknown; planId?: unknown; value?: unknown; readAt?: unknown; createdAt?: unknown };

/**
 * THIS POINT'S LATEST READING — by when it was read, then by when it was
 * written, so two typed for the same minute resolve to the one entered last.
 * The same tie-break ./meters uses, for the same reason.
 */
export function latestConditionReading<T extends ReadingLike>(readings: readonly T[], planId: string): T | null {
  let best: T | null = null;
  for (const r of readings) {
    if (text(r.planId) !== planId) continue;
    if (!best) { best = r; continue; }
    const byRead = text(r.readAt).localeCompare(text(best.readAt));
    if (byRead > 0 || (byRead === 0 && text(r.createdAt) > text(best.createdAt))) best = r;
  }
  return best;
}

/**
 * WHY THIS READING IS REFUSED — or null. Deliberately SHORT beside
 * `readingProblem`: a gauge has no monotonic rule to enforce, so what is left
 * is that the value is a number and the reading is not in the future. A
 * measurement nobody has taken yet is a guess.
 */
export function conditionReadingProblem(r: { value?: unknown; readAt?: unknown }, now: string): string | null {
  const value = Number(r.value);
  if (r.value === "" || r.value === null || r.value === undefined || !Number.isFinite(value)) return "condition-value";
  if (Math.abs(value) > MAX_CONDITION_VALUE) return "condition-value";
  const at = text(r.readAt);
  if (!at || Number.isNaN(Date.parse(at)) || at > now) return "condition-future";
  return null;
}

type OrderLike = { pmPlanId?: unknown; conditionReadingId?: unknown; status?: unknown };

/**
 * WHAT THIS POINT'S LATEST READING ASKS FOR — raise, or nothing.
 *
 * IDEMPOTENT BY THE READING'S ID, never by its value, which is where this
 * parts company with `meterRaiseDecision`. Two breaches can read the same
 * number, so keying on the number would silence the second one for ever.
 *
 * AND THAT ID IS WHAT STOPS A FLOOD WITHOUT HIDING A REAL FAULT. While the
 * order is open nothing more is raised (one open order per plan, as every
 * trigger has). Once it is closed, the reading that raised it still breaches —
 * but it already has its order, so it raises nothing. A NEW reading still out
 * of range raises new work, which is the honest answer: the machine is still
 * out of range after somebody said they had put it right.
 */
export function conditionRaiseDecision(
  plan: PlanLike,
  orders: readonly OrderLike[],
  reading: ReadingLike | null,
): { raise: boolean; readingId: string; breach: "low" | "high"; value: number } | null {
  if (text(plan.status) !== "Active" || !isConditionPlanOf(plan) || !reading) return null;
  const { low, high } = conditionLimits(plan);
  const value = Number(reading.value);
  const breach = outOfRange(value, low, high);
  if (!breach) return null;
  const mine = orders.filter((o) => text(o.pmPlanId) === text(plan.id));
  if (mine.some((o) => orderOpen(o))) return null;
  const readingId = text(reading.id);
  if (mine.some((o) => text(o.conditionReadingId) === readingId)) return { raise: false, readingId, breach, value };
  return { raise: true, readingId, breach, value };
}

/**
 * WHERE THIS POINT STANDS, for a screen — or null when nothing has been read.
 * NULL RATHER THAN IN-RANGE: "nobody has measured it" and "it is fine" are
 * different answers, and a point nobody reads is the one worth noticing.
 */
export function conditionState(plan: PlanLike, reading: ReadingLike | null) {
  if (!isConditionPlanOf(plan) || !reading) return null;
  const { low, high } = conditionLimits(plan);
  const value = Number(reading.value);
  return { value, readAt: text(reading.readAt), breach: outOfRange(value, low, high), low, high };
}
