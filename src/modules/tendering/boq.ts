// A BILL OF QUANTITIES, as arithmetic. Pure: no store, no server imports.
//
// WHAT A BOQ IS. The tender documents name the work, item by item, with a
// quantity and a unit; the estimator supplies a RATE for each; the extension is
// quantity times rate, and the bid is the sum. Everything difficult about it is
// in that last sentence: which lines are priced, which are not, and what the
// total therefore means.
//
// AN UNPRICED LINE IS NOT A LINE PRICED AT ZERO, and keeping those apart is the
// whole reason this file exists rather than a `reduce` at the call site. A BOQ
// with forty lines and thirty-eight rates has a total, but it is not the bid —
// quoting it as one is how a studio wins work it has not costed. So a total
// always arrives beside the count of what is missing from it.

/** One priced line, as the grid holds it. */
export type BoqLine = {
  /** The trade or section heading a line sits under. Free text, grouped on display. */
  group?: unknown;
  qty?: unknown;
  rate?: unknown;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * A QUANTITY MAY BE ZERO AND STILL BE A REAL LINE — a provisional item, a rate
 * the client asked to be quoted against no measured quantity. So "priced" turns
 * on the RATE having been supplied, never on the extension being non-zero.
 */
export const isPriced = (line: BoqLine): boolean => num(line?.rate) > 0;

/** Quantity times rate, rounded to the money the rest of the product uses. */
export function extension(line: BoqLine): number {
  return Math.round(num(line?.qty) * num(line?.rate) * 100) / 100;
}

export type BoqTotals = {
  lines: number;
  /** How many carry a rate. The rest are the reason `complete` is false. */
  priced: number;
  unpriced: number;
  /** The sum of every priced extension. NOT the bid unless `complete`. */
  total: number;
  /**
   * TRUE ONLY WHEN EVERY LINE CARRIES A RATE. A screen may show the total
   * either way; what it may not do is call it the bid while this is false.
   */
  complete: boolean;
};

export function boqTotals(lines: readonly BoqLine[]): BoqTotals {
  const rows = Array.isArray(lines) ? lines : [];
  const priced = rows.filter(isPriced);
  return {
    lines: rows.length,
    priced: priced.length,
    unpriced: rows.length - priced.length,
    total: Math.round(priced.reduce((s, l) => s + extension(l), 0) * 100) / 100,
    // An EMPTY bill is not a complete one: a tender with no lines has not been
    // estimated, and reporting it as fully priced would be the same lie in the
    // opposite direction.
    complete: rows.length > 0 && priced.length === rows.length,
  };
}

/**
 * THE BILL BY TRADE, in the order the groups first appear.
 *
 * Alphabetical would be wrong: a bill of quantities is issued in an order —
 * preliminaries, then substructure, then frame — and reordering it stops it
 * matching the document the client sent, which is what an estimator checks it
 * against line by line.
 */
export function boqGroups(lines: readonly BoqLine[]): Array<{ group: string; lines: BoqLine[]; totals: BoqTotals }> {
  const order: string[] = [];
  const byGroup = new Map<string, BoqLine[]>();
  for (const line of Array.isArray(lines) ? lines : []) {
    const group = String(line?.group ?? "").trim();
    if (!byGroup.has(group)) { byGroup.set(group, []); order.push(group); }
    byGroup.get(group)!.push(line);
  }
  return order.map((group) => ({
    group,
    lines: byGroup.get(group)!,
    totals: boqTotals(byGroup.get(group)!),
  }));
}

/**
 * WHAT THE TENDER IS WORTH, given its bill.
 *
 * A tender carries a typed `estimatedValue` from the day it is noticed, long
 * before anybody prices it. Once a bill exists the two disagree, and the bill
 * is the one built from evidence — so it wins, and the typed figure survives as
 * what it always was: the first guess.
 *
 * Returns null when there is no bill to defer to, which is the caller's signal
 * to keep showing the typed figure rather than a zero.
 */
export function valueFromBoq(totals: BoqTotals): number | null {
  return totals.lines > 0 ? totals.total : null;
}
