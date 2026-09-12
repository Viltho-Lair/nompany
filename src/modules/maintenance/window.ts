// A ROLLING WINDOW OF THE LAST N DAYS, purely — no store, no clock: `now` is
// always passed in.
//
// TWO FILES IN THIS MODULE COMPUTED THIS BY HAND, and the copies had already
// drifted in spelling if not in arithmetic: `reliabilityByAsset` wrote
// `end - windowDays * 24 * HOUR` and `costByAsset` wrote
// `end - windowDays * 86_400_000`. Neither is more correct than the other, which
// is exactly the problem — two expressions of one idea are two places for the
// next change to land in only one of them.
//
// IT IS DELIBERATELY NOT SHARED WITH ASSETS' `daysOf`, and that is a judgement
// rather than an oversight. `daysOf` clips a span to a period in CALENDAR DAYS,
// inclusive at both ends, because a machine that went out on Monday and came
// back on Monday was on the job for a day and is charged for one. This measures
// INSTANTS. Folding them together would make one function answer two questions
// with different arithmetic, and the inclusive `+1` would have to become a flag
// — which is how a helper ends up harder to read than the two copies it
// replaced. It moves to `shared/` the day a third caller outside Maintenance
// wants the instant form, and not before.

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/** Epoch milliseconds, both ends inclusive. */
export type Window = { start: number; end: number };

/**
 * THE LAST `days` ENDING AT `now`.
 *
 * AN UNREADABLE `now` PRODUCES A WINDOW NOTHING FALLS IN — both ends NaN, and
 * every comparison against NaN is false. That is what both callers already did,
 * and it is the safe direction: a bad clock counts nothing rather than counting
 * everything.
 */
export function windowOf(now: unknown, days: number): Window {
  const end = Date.parse(String(now ?? ""));
  const span = Math.max(0, Number(days) || 0) * DAY_MS;
  return { start: end - span, end };
}

/** Is this instant inside the window? Both ends inclusive. */
export const within = (w: Window, t: number): boolean =>
  Number.isFinite(t) && t >= w.start && t <= w.end;

/**
 * HOW MUCH OF `from`–`to` FALLS INSIDE THE WINDOW, in milliseconds.
 *
 * NEVER NEGATIVE. A span entirely outside overlaps by nothing rather than by a
 * negative amount, which would subtract from whatever total it is added to —
 * the shape of a bug that shows up as a machine with less downtime than it had.
 */
export function overlapMs(w: Window, from: number, to: number): number {
  const lo = Math.max(from, w.start);
  const hi = Math.min(to, w.end);
  return hi > lo ? hi - lo : 0;
}

/** The window's own length in hours — what an availability figure divides by. */
export const hoursIn = (w: Window): number => (w.end - w.start) / HOUR_MS;

/**
 * THE SAME WINDOW, STARTING NO EARLIER THAN A GIVEN DAY — how a machine comes
 * to be judged only over the time it has existed.
 *
 * A BLANK OR UNREADABLE DAY LEAVES THE WINDOW ALONE. "Nobody recorded when this
 * was acquired" must not shorten anything, or a machine with no acquisition
 * date would quietly score differently from one acquired years ago, and the
 * difference would be a missing field rather than a fact about the machine.
 *
 * A DAY PAST THE WINDOW'S END EMPTIES IT rather than inverting it: the start is
 * clamped to the end, so the length is nought and never negative. Every figure
 * divided by it is then refused by the caller as having no honest value, which
 * is the truthful answer for a machine that does not exist yet.
 */
export function narrow(w: Window, notBefore: unknown): Window {
  const d = String(notBefore ?? "").trim();
  if (!ISO_DAY.test(d)) return w;
  const at = Date.parse(`${d.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(at) || at <= w.start) return w;
  return { start: Math.min(at, w.end), end: w.end };
}
