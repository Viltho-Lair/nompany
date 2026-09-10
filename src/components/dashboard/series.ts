// THE DASHBOARDS' TIME AND RANK ARITHMETIC — pure, UTC, and shared.
//
// Every department dashboard asks the same handful of questions of its own
// rows: what happened in each of the last twelve months, in each of the last
// twelve weeks, on which weekday, who the largest few are and what the rest add
// up to. Each dashboard used to answer them inline, which is how two of them
// came to disagree about which month a record on the 31st belongs to — one
// keyed by the viewer's local clock, one by UTC. They are answered once here.
//
// UTC THROUGHOUT, because every stored date in this product is an ISO string
// written on the server's clock. Bucketing by the reader's local midnight moves
// a record a day for half the world and drops today's rows off the end of a
// window for anybody east of Greenwich (technicalAnalytics paid for that once).
//
// NO FORMATTING BEYOND THE AXIS LABELS. Money and quantities are the screen's
// business; this returns numbers, and `monthLabel`/`weekdayLabels` exist only
// because an axis in Arabic has to say its months in Arabic.
//
// Asserted by tests/dashboard-series.mjs — pure, so it needs no database.

const DAY = 86400000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const ms = (day: string) => Date.parse(`${day}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The ISO day a value names, or "" when it names none — so a blank or a
 *  malformed date drops out of every bucket instead of landing in a phantom one. */
export function dayOf(v: unknown): string {
  const s = String(v ?? "");
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return "";
  return Number.isNaN(ms(s.slice(0, 10))) ? "" : s.slice(0, 10);
}

/** `before` months back and `after` months on from `asOf`'s month, oldest first. */
export function monthsAround(before: number, after: number, asOf: string): string[] {
  const d = new Date(`${asOf}T00:00:00Z`);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const out: string[] = [];
  for (let i = -before; i <= after; i++) out.push(new Date(Date.UTC(y, m + i, 1)).toISOString().slice(0, 7));
  return out;
}

/** The last `n` months ending with `asOf`'s own, oldest first. */
export const monthsBack = (n: number, asOf: string) => monthsAround(Math.max(0, n - 1), 0, asOf);

/** Sum `valueOf` per month; a row outside the window, or with no date, is not counted. */
export function sumByMonth<T>(
  rows: readonly T[], dateOf: (r: T) => unknown, valueOf: (r: T) => unknown, months: readonly string[],
): number[] {
  const at = new Map(months.map((m, i) => [m, i] as [string, number]));
  const out = months.map(() => 0);
  for (const r of rows) {
    const d = dayOf(dateOf(r));
    if (!d) continue;
    const i = at.get(d.slice(0, 7));
    if (i === undefined) continue;
    const v = Number(valueOf(r));
    if (Number.isFinite(v)) out[i] += v;
  }
  return out.map(round2);
}

export const countByMonth = <T>(rows: readonly T[], dateOf: (r: T) => unknown, months: readonly string[]) =>
  sumByMonth(rows, dateOf, () => 1, months);

export type Ranked = { label: string; value: number };

/**
 * Totals per key, largest first. With a `top`, the tail beyond it is folded
 * into ONE row named `other` rather than dropped — so the rows still add up to
 * the whole, which is the difference between a ranking and a flattering one.
 * Pass `other: null` for a plain top-N with no fold. A blank key is not a key:
 * the caller names it ("No client") if it should be counted.
 */
export function rankTotals<T>(
  rows: readonly T[], keyOf: (r: T) => unknown, valueOf: (r: T) => unknown,
  top = Infinity, other: string | null = "Other",
): Ranked[] {
  const by = new Map<string, number>();
  for (const r of rows) {
    const k = String(keyOf(r) ?? "").trim();
    if (!k) continue;
    const v = Number(valueOf(r));
    if (!Number.isFinite(v)) continue;
    by.set(k, (by.get(k) || 0) + v);
  }
  const ranked = [...by]
    .map(([label, value]) => ({ label, value: round2(value) }))
    .filter((r) => r.value !== 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  if (ranked.length <= top) return ranked;
  const head = ranked.slice(0, top);
  if (other === null) return head;
  const rest = ranked.slice(top).reduce((s, r) => s + r.value, 0);
  return [...head, { label: other, value: round2(rest) }];
}

/**
 * One series per key per month, for a stacked chart: the `top` keys by total
 * within the window, then everything else as `other`. Rows whose key is blank
 * land in `other` too — a stack that silently lost them would be shorter than
 * the month it claims to show.
 */
export function stackByMonth<T>(
  rows: readonly T[], dateOf: (r: T) => unknown, keyOf: (r: T) => unknown, valueOf: (r: T) => unknown,
  months: readonly string[], top = 4, other = "Other",
): { name: string; data: number[] }[] {
  const inside = new Set(months);
  const inWindow = rows.filter((r) => {
    const d = dayOf(dateOf(r));
    return d !== "" && inside.has(d.slice(0, 7));
  });
  const key = (r: T) => String(keyOf(r) ?? "").trim();
  const head = rankTotals(inWindow, key, valueOf).slice(0, top).map((r) => r.label);
  const series = head.map((name) => ({
    name,
    data: sumByMonth(inWindow.filter((r) => key(r) === name), dateOf, valueOf, months),
  }));
  const tail = inWindow.filter((r) => !head.includes(key(r)));
  const tailData = sumByMonth(tail, dateOf, valueOf, months);
  if (tailData.some(Boolean)) series.push({ name: other, data: tailData });
  return series;
}

/** The Monday of the week `day` falls in. Weeks start on Monday, as ISO's do. */
export function weekStart(day: string): string {
  const t = ms(day);
  const weekday = (new Date(t).getUTCDay() + 6) % 7;
  return iso(t - weekday * DAY);
}

/** The Mondays of the last `n` weeks, ending with `asOf`'s own week, oldest first. */
export function weeksBack(n: number, asOf: string): string[] {
  const start = ms(weekStart(asOf));
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(iso(start - i * 7 * DAY));
  return out;
}

/** The Mondays of `n` weeks starting with `asOf`'s own week. */
export function weeksAhead(n: number, asOf: string): string[] {
  const start = ms(weekStart(asOf));
  return Array.from({ length: Math.max(0, n) }, (_, i) => iso(start + i * 7 * DAY));
}

/** Sum `valueOf` per week (keyed by each week's Monday). */
export function sumByWeek<T>(
  rows: readonly T[], dateOf: (r: T) => unknown, valueOf: (r: T) => unknown, weeks: readonly string[],
): number[] {
  const at = new Map(weeks.map((w, i) => [w, i] as [string, number]));
  const out = weeks.map(() => 0);
  for (const r of rows) {
    const d = dayOf(dateOf(r));
    if (!d) continue;
    const i = at.get(weekStart(d));
    if (i === undefined) continue;
    const v = Number(valueOf(r));
    if (Number.isFinite(v)) out[i] += v;
  }
  return out.map(round2);
}

/** A 7 × weeks grid of counts: row 0 is Monday, column i is `weeks[i]`. */
export function weekdayHeat<T>(rows: readonly T[], dateOf: (r: T) => unknown, weeks: readonly string[]): number[][] {
  const at = new Map(weeks.map((w, i) => [w, i] as [string, number]));
  const grid = Array.from({ length: 7 }, () => weeks.map(() => 0));
  for (const r of rows) {
    const d = dayOf(dateOf(r));
    if (!d) continue;
    const col = at.get(weekStart(d));
    if (col === undefined) continue;
    grid[(new Date(ms(d)).getUTCDay() + 6) % 7][col] += 1;
  }
  return grid;
}

/** `n` consecutive days starting with `asOf`. */
export function daysAhead(n: number, asOf: string): string[] {
  const start = ms(asOf);
  return Array.from({ length: Math.max(0, n) }, (_, i) => iso(start + i * DAY));
}

/**
 * How many rows are ACTIVE on each day — a row spans `from`..`to` inclusive, and
 * a row with no end is a single day. What an absence chart counts: a person on
 * a fortnight's leave is away on each of those days, not only the first.
 */
export function activeOnDays<T>(
  rows: readonly T[], fromOf: (r: T) => unknown, toOf: (r: T) => unknown, days: readonly string[],
): number[] {
  const spans = rows
    .map((r) => { const from = dayOf(fromOf(r)); const to = dayOf(toOf(r)) || from; return { from, to }; })
    .filter((s) => s.from && s.to >= s.from);
  return days.map((d) => spans.filter((s) => s.from <= d && d <= s.to).length);
}

/**
 * Calendar days each row covers, attributed to the month each day falls in. A
 * leave from the 25th to the 8th is mostly next month's absence, and filing it
 * all under the month it starts in would say otherwise.
 */
export function spreadDaysByMonth<T>(
  rows: readonly T[], fromOf: (r: T) => unknown, toOf: (r: T) => unknown, months: readonly string[],
): number[] {
  const at = new Map(months.map((m, i) => [m, i] as [string, number]));
  const out = months.map(() => 0);
  if (!months.length) return out;
  const first = ms(`${months[0]}-01`);
  const lastMonth = months[months.length - 1];
  const last = Date.UTC(Number(lastMonth.slice(0, 4)), Number(lastMonth.slice(5, 7)), 0);
  for (const r of rows) {
    const from = dayOf(fromOf(r));
    if (!from) continue;
    const to = dayOf(toOf(r)) || from;
    const start = Math.max(ms(from), first);
    const end = Math.min(ms(to), last);
    // A YEAR IS THE LONGEST SPAN WALKED, so one row carrying a typo'd end date
    // of 2099 cannot turn a render into a hundred-thousand-step loop.
    for (let t = start, steps = 0; t <= end && steps < 366; t += DAY, steps++) {
      const i = at.get(iso(t).slice(0, 7));
      if (i !== undefined) out[i] += 1;
    }
  }
  return out;
}

const intlLocale = (locale: string) => (locale === "ar" ? "ar" : "en-GB");

/** "Sep" / "سبتمبر" — the month an axis tick names, in the reader's language. */
export function monthLabel(month: string, locale = "en"): string {
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", timeZone: "UTC" })
      .format(new Date(`${month}-01T00:00:00Z`));
  } catch {
    return month.slice(5);
  }
}

/** Monday..Sunday, short, in the reader's language — the heat grid's rows. */
export function weekdayLabels(locale = "en"): string[] {
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" });
  // 1 January 2024 was a Monday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
}

/** dd/mm — the product's date order, without the year a week axis never needs. */
export const shortDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** The largest value in a list, never below 1 — the denominator a meter divides by. */
export const peak = (rows: readonly { value: number }[]) => Math.max(1, ...rows.map((r) => r.value));

/** A whole-number percentage, 0 when there is no whole to be a share of. */
export const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
