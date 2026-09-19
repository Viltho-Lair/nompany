// CUSTOMER INSIGHTS, PURELY — the owner's own analysis, rebuilt (19/09/2026).
//
// WHERE IT COMES FROM. The owner ran it for a sales department in Excel: the
// month's invoices exported, stacked January to December, and two pivots —
// how many invoices each customer had per month, and how much. Each customer's
// last seven months were read as three blocks: the first three, the second
// three, and the current month (the "stepper"), each judged zero, low, medium or
// high. A customer who bought in January to March, nothing in April to June and
// again in July read `-_-`, and every such shape had a name so the team knew
// who to call and why. It is purchase-pattern segmentation (RFM's recency,
// frequency and money, with a direction added) and here it is live rather than
// rebuilt each month.
//
// THE OWNER'S DECISIONS, 19/09/2026: in CRM & Sales; levels RELATIVE TO THE
// STUDIO, with the amounts behind them shown; the default pattern names; and
// MORE THAN MONTHS — a period may be a month, a quarter, a half-year or a year,
// always seven of them in the same 3 + 3 + 1 shape.
//
// No store, no clock: every function takes `asOf`. tests/insights-model.mjs.

export const PERIOD_UNITS = ["month", "quarter", "half", "year"] as const;
export type PeriodUnit = (typeof PERIOD_UNITS)[number];
export const MEASURES = ["value", "count"] as const;
export type Measure = (typeof MEASURES)[number];

/** Zero, low, medium, high — as 0..3, so "more" compares as a number. */
export const LEVELS = ["zero", "low", "medium", "high"] as const;
export type Level = 0 | 1 | 2 | 3;

export const PATTERNS = [
  "loyal", "growing", "steady", "fading", "slipping", "returning", "lapsed", "new", "stopped", "dormant",
] as const;
export type Pattern = (typeof PATTERNS)[number];

/** How many periods the window holds, and how they split: 3 + 3 + 1. */
export const WINDOW = 7;
export const BLOCKS: readonly [number, number][] = [[0, 3], [3, 6], [6, 7]];

type YM = { y: number; m: number }; // m is 0..11

const ymOf = (iso: string): YM | null => {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ""));
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1 } : null;
};
const monthsIn = (u: PeriodUnit) => ({ month: 1, quarter: 3, half: 6, year: 12 })[u];

/** The period a date falls in, as a stable key: 2026-09, 2026-Q3, 2026-H2, 2026. */
export function periodKey(iso: string, unit: PeriodUnit): string {
  const d = ymOf(iso);
  if (!d) return "";
  if (unit === "month") return `${d.y}-${String(d.m + 1).padStart(2, "0")}`;
  if (unit === "quarter") return `${d.y}-Q${Math.floor(d.m / 3) + 1}`;
  if (unit === "half") return `${d.y}-H${d.m < 6 ? 1 : 2}`;
  return String(d.y);
}

/** The first month of the period `n` periods after (or before) the one holding `iso`. */
function shift(iso: string, unit: PeriodUnit, n: number): string {
  const d = ymOf(iso)!;
  const size = monthsIn(unit);
  const start = Math.floor(d.m / size) * size;
  const total = d.y * 12 + start + n * size;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

/**
 * THE SEVEN PERIODS, oldest first. The last is the period holding `asOf`, or —
 * when `current` is false — the last COMPLETE one, which is what the owner's
 * monthly routine actually looked at (invoices arrived after the month closed).
 * Each carries its key and the first day of the next period, so a record is in
 * a period when `start <= date < end`.
 */
export function windowPeriods(asOf: string, unit: PeriodUnit, current: boolean) {
  const lastOffset = current ? 0 : -1;
  const out: { key: string; start: string; end: string }[] = [];
  for (let i = WINDOW - 1; i >= 0; i -= 1) {
    const start = shift(asOf, unit, lastOffset - i);
    out.push({ key: periodKey(start, unit), start, end: shift(start, unit, 1) });
  }
  return out;
}

/** A sale as the analysis sees it: whose, when, and how much (in the studio's currency). */
export type Sale = { customer: string; at: string; value: number };

/**
 * EACH CUSTOMER'S SEVEN PERIODS — how many sales and how much in each — plus
 * whether they bought BEFORE the window at all, which is what tells a customer
 * who is new from one who has come back.
 */
export function tally(sales: readonly Sale[], periods: ReturnType<typeof windowPeriods>) {
  const first = periods[0].start;
  const out = new Map<string, { count: number[]; value: number[]; before: boolean; last: string }>();
  for (const s of sales) {
    if (!s.customer || !s.at) continue;
    const row = out.get(s.customer) || { count: Array(WINDOW).fill(0), value: Array(WINDOW).fill(0), before: false, last: "" };
    const day = s.at.slice(0, 10);
    if (day < first) row.before = true;
    const i = periods.findIndex((p) => day >= p.start && day < p.end);
    if (i >= 0) { row.count[i] += 1; row.value[i] = round2(row.value[i] + (Number(s.value) || 0)); }
    if (day < periods[WINDOW - 1].end && day > row.last) row.last = day;
    out.set(s.customer, row);
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export const blockSums = (series: readonly number[]) => BLOCKS.map(([a, b]) => round2(series.slice(a, b).reduce((s, v) => s + v, 0)));

/**
 * WHERE LOW ENDS AND HIGH BEGINS, per block, RELATIVE TO THE STUDIO — the
 * owner's choice. Among the customers who bought at all in that block, the
 * bottom third is low, the middle third medium, the top third high; nobody
 * buying is zero. The two boundaries travel with the result, because "with how
 * much" was the owner's own question: a level is only useful beside the amount
 * that earns it. Separate per block, because three months of buying and one
 * month of buying are not the same scale.
 */
export function bands(blockTotals: readonly number[][]) {
  return [0, 1, 2].map((b) => {
    const xs = blockTotals.map((t) => t[b]).filter((v) => v > 0).sort((p, q) => p - q);
    if (!xs.length) return { low: 0, high: 0, customers: 0 };
    const at = (q: number) => xs[Math.min(xs.length - 1, Math.floor(q * xs.length))];
    return { low: at(1 / 3), high: at(2 / 3), customers: xs.length };
  });
}

/** A block's level against its band: zero, then low up to the first boundary, high above the second. */
export function levelOf(v: number, band: { low: number; high: number }): Level {
  if (!(v > 0)) return 0;
  if (v < band.low) return 1;
  if (v < band.high) return 2;
  return 3;
}

/**
 * THE NAMED PATTERN for three block levels [first, second, current] — the
 * default names the owner chose (19/09/2026). Whether each block bought at all
 * decides the family; how much decides within it.
 *
 * - bought in all three: GROWING when the current block is above the first,
 *   FADING when it is below, else LOYAL when every block is medium or high,
 *   STEADY otherwise;
 * - first two, not the current: SLIPPING — quiet right now;
 * - first and current, not the middle: RETURNING (the owner's `-_-`);
 * - only the first: LAPSED;
 * - only the second: STOPPED, or NEW when that was their first purchase ever;
 * - the second and current, or only the current: NEW when they never bought
 *   before, else RETURNING;
 * - nothing in the window: DORMANT (they did buy before it).
 */
export function patternOf(levels: readonly Level[], boughtBefore: boolean, firstSeenBlock: number): Pattern {
  const [a, b, c] = levels;
  const on = `${a ? 1 : 0}${b ? 1 : 0}${c ? 1 : 0}`;
  const isNew = !boughtBefore && firstSeenBlock >= 1;
  switch (on) {
    case "111":
      if (c > a) return "growing";
      if (c < a) return "fading";
      return a >= 2 && b >= 2 && c >= 2 ? "loyal" : "steady";
    case "110": return "slipping";
    case "101": return "returning";
    case "100": return "lapsed";
    case "010": return isNew ? "new" : "stopped";
    case "011": case "001": return isNew ? "new" : "returning";
    default: return "dormant";
  }
}

/** The signature a person reads at a glance: H·0·M. */
export const signature = (levels: readonly Level[]) => levels.map((l) => ["0", "L", "M", "H"][l]).join("·");

/**
 * THE WHOLE ANALYSIS for one period size and one measure: every customer's
 * seven periods, their three block levels, pattern and signature, and the
 * bands that decided them. A customer who bought nothing in the window and
 * nothing before it is not in `sales` at all, so every row is somebody real.
 */
export function analyse(sales: readonly Sale[], asOf: string, unit: PeriodUnit, measure: Measure, current: boolean) {
  const periods = windowPeriods(asOf, unit, current);
  const rows = tally(sales, periods);
  const series = (r: { count: number[]; value: number[] }) => (measure === "count" ? r.count : r.value);
  // SOMEBODY WHOSE ONLY SALES FALL AFTER THE WINDOW is not a dormant customer of
  // this window; they are not in it at all.
  for (const [k, r] of rows) if (!r.before && !r.count.some((n) => n > 0)) rows.delete(k);
  const totals = [...rows.values()].map((r) => blockSums(series(r)));
  const bandsNow = bands(totals);
  const customers = [...rows.entries()].map(([customer, r]) => {
    const blocks = blockSums(series(r));
    const levels = blocks.map((v, i) => levelOf(v, bandsNow[i])) as Level[];
    const firstIdx = r.count.findIndex((n) => n > 0);
    const firstSeenBlock = firstIdx < 0 ? -1 : firstIdx < 3 ? 0 : firstIdx < 6 ? 1 : 2;
    return {
      customer,
      count: r.count, value: r.value,
      blocks, levels,
      pattern: patternOf(levels, r.before, firstSeenBlock),
      signature: signature(levels),
      totalValue: round2(r.value.reduce((s, v) => s + v, 0)),
      totalCount: r.count.reduce((s, v) => s + v, 0),
      lastSale: r.last,
    };
  });
  return { periods, bands: bandsNow, customers };
}

/**
 * WHO MOVED SINCE THE PERIOD BEFORE — the same analysis one period earlier,
 * compared customer by customer. Loyal → fading is the list worth a call today.
 */
export function movement(sales: readonly Sale[], asOf: string, unit: PeriodUnit, measure: Measure, current: boolean) {
  const before = analyse(sales, shift(asOf, unit, -1), unit, measure, current);
  return new Map(before.customers.map((c) => [c.customer, c.pattern]));
}

/** How many customers, and how much value in the window, per pattern — the tiles. */
export function patternTotals(customers: readonly { pattern: Pattern; totalValue: number }[]) {
  return PATTERNS.map((p) => {
    const rows = customers.filter((c) => c.pattern === p);
    return { pattern: p, customers: rows.length, value: round2(rows.reduce((s, c) => s + c.totalValue, 0)) };
  });
}

/** One sale for the scatter: who made it, on which team and channel, and how much. */
export type Credit = { person: string; team: string; channel: string; at: string; value: number };

/**
 * THE SCATTER — the owner's third sheet: every salesperson, team or channel as
 * a point, how many sales across the window against how much. Only sales inside
 * the window count.
 */
export function scatter(credits: readonly Credit[], periods: ReturnType<typeof windowPeriods>, by: "person" | "team" | "channel") {
  const start = periods[0].start;
  const end = periods[WINDOW - 1].end;
  const out = new Map<string, { label: string; count: number; value: number }>();
  for (const c of credits) {
    const day = String(c.at || "").slice(0, 10);
    if (!day || day < start || day >= end) continue;
    const label = c[by] || "";
    if (!label) continue;
    const p = out.get(label) || { label, count: 0, value: 0 };
    p.count += 1;
    p.value = round2(p.value + (Number(c.value) || 0));
    out.set(label, p);
  }
  return [...out.values()].sort((a, b) => b.value - a.value);
}
