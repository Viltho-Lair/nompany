// SAFETY PERFORMANCE — the rates every contractor is asked for, computed.
//
// `daysLost` HAS BEEN STORED ON EVERY INCIDENT SINCE THE REGISTER SHIPPED AND
// NOTHING READ IT. That is the shape of gap this file closes: a number a studio
// types in, once a month, that answers no question until something divides it
// by the hours worked. Recording the numerator and never the rate is how a
// safety register becomes a filing cabinet.
//
// PURE. No imports, no store, no clock: the caller hands in the incidents, the
// hours and the window. So the screen and the server compute the same figures
// from the same inputs, and the arithmetic is asserted without a database.

/** What a rate needs from an incident. Structural, so an engine row fits. */
export type SafetyIncident = {
  id: string;
  reference?: string;
  status?: string;
  values?: Record<string, unknown>;
};

/** One person's hours on one day. The denominator, from Projects' timesheets. */
export type WorkedHours = { date: string; hours: number };

export type Period = { from: string; to: string };

// THE STANDARD CLASSIFICATION, and the reason it is a constant rather than a
// filter written at each call site: "recordable" is a defined term in every
// safety standard this product will meet, and a studio that counted near
// misses in its TRIFR would report a rate nobody can compare to anything.
//
// A LOST-TIME INJURY IS RECORDABLE TOO. LTIFR is the subset, not a sibling —
// getting that wrong makes TRIFR smaller than LTIFR, which is impossible and
// which a reader would spot before any test did.
export const LOST_TIME = "Lost time";
export const RECORDABLE_KINDS: readonly string[] = ["Lost time", "Medical treatment"];

// The rate everyone quotes is per million hours worked. Named rather than
// inlined so the two rates cannot drift onto different bases.
export const RATE_BASE = 1_000_000;

export type SafetySummary = {
  period: Period;
  /** Every incident kind that occurred, commonest first. */
  byKind: { kind: string; count: number }[];
  incidents: number;
  recordable: number;
  lostTime: number;
  daysLost: number;
  /** Hours worked in the window, or null when the reader may not see them. */
  hours: number | null;
  /** Lost-time injury frequency rate. Null when hours are unknown or nought. */
  ltifr: number | null;
  /** Total recordable injury frequency rate. Same nullability. */
  trifr: number | null;
  /**
   * WHY A RATE IS NULL, in a word the screen turns into a sentence. Three
   * states, and they send somebody to three different places — the same shape
   * earned value uses, and for the same reason: "0.0" and "we cannot say" look
   * identical on a tile and mean opposite things.
   */
  reason: "" | "no-hours-access" | "no-hours" | "no-incidents-yet";
};

const day = (v: unknown): string => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Rounded to one decimal — the precision every safety report is quoted at. */
const rate = (count: number, hours: number): number | null =>
  hours > 0 ? Math.round((count * RATE_BASE * 10) / hours) / 10 : null;

const within = (d: string, p: Period): boolean =>
  Boolean(d) && (!p.from || d >= p.from) && (!p.to || d <= p.to);

/**
 * SAFETY PERFORMANCE OVER A WINDOW.
 *
 * @param incidents - engine rows of the `incident` type
 * @param worked    - hours from Projects' timesheets, or NULL when the reader
 *                    holds no right to them. Null and an empty array are
 *                    DIFFERENT: one is "we may not look", the other is "nobody
 *                    booked any hours", and a rate computed over the second as
 *                    though it were the first would be an infinity.
 * @param period    - inclusive `from`/`to`; either may be blank for open-ended
 */
export function safetySummary(
  incidents: readonly SafetyIncident[],
  worked: readonly WorkedHours[] | null,
  period: Period,
): SafetySummary {
  const p = { from: day(period?.from), to: day(period?.to) };

  const inWindow = incidents.filter((i) => within(day(i.values?.happenedOn), p));

  const kinds = new Map<string, number>();
  let daysLost = 0;
  let lostTime = 0;
  let recordable = 0;

  for (const i of inWindow) {
    const kind = String(i.values?.kind ?? "").trim() || "Unclassified";
    kinds.set(kind, (kinds.get(kind) || 0) + 1);
    // `daysLost` IS NULLABLE ON THE RECORD AND SUMS AS ZERO HERE, which is the
    // one place the two readings agree: nought days lost and nobody having said
    // yet both add nothing to a total. The COUNT of lost-time incidents is what
    // the rate is built on, so an unfilled `daysLost` cannot understate LTIFR.
    daysLost += num(i.values?.daysLost);
    if (kind === LOST_TIME) lostTime += 1;
    if (RECORDABLE_KINDS.includes(kind)) recordable += 1;
  }

  const byKind = [...kinds.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));

  // NULL MEANS "WE MAY NOT LOOK" AND IS NOT THE SAME AS NOUGHT. A reader
  // holding no Projects right gets no hours and therefore no rate, rather than
  // a rate computed over nothing — the customer-360 rule, where a figure
  // derived from records somebody cannot open would leak the very thing the
  // gate is for.
  const hours = worked === null
    ? null
    : worked.reduce((n, w) => n + (within(day(w.date), p) ? num(w.hours) : 0), 0);

  const reason: SafetySummary["reason"] =
    hours === null ? "no-hours-access"
      : hours === 0 ? "no-hours"
        : inWindow.length === 0 ? "no-incidents-yet"
          : "";

  return {
    period: p,
    byKind,
    incidents: inWindow.length,
    recordable,
    lostTime,
    daysLost,
    hours,
    // NOTHING DIVIDES BY NOUGHT. No hours booked is not a zero rate — it is a
    // period nobody worked, and a "0.0 LTIFR" on it is a safety claim the data
    // does not support. Both rates are null together or neither is.
    ltifr: hours === null ? null : rate(lostTime, hours),
    trifr: hours === null ? null : rate(recordable, hours),
    reason,
  };
}
