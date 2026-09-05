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
  // READ ONLY BY `boqAsTables`, and declared `unknown` like the rest: this file
  // is handed whatever the store holds and narrows at the point of use, which
  // is what lets it stay import-free and be handed a plain row from anywhere.
  id?: unknown;
  description?: unknown;
  unit?: unknown;
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

/**
 * THE BILL, READ AS TABLES OF ROWS — the shape a project sheet composes from.
 *
 * A sheet stores no lines of its own: it composes a document's tables with what
 * Inventory added to them, keyed by row id. That document has always been a
 * QUOTATION, so a project handed over from a tender had sheets and nothing in
 * them. This is the bill offered in the same shape, so `composeSheet` reads one
 * function and not two — a second composition path would be a second set of
 * answers about what a sheet row is.
 *
 * THE GROUPS BECOME THE TABLES, in the document's order (`boqGroups`), because
 * that order is the thing a bill's own comment says must never be re-sorted: an
 * estimator checks it against the client's document line by line, and so does
 * whoever is now buying the work.
 *
 * `itemId` IS BLANK AND THAT IS THE TRUTH, not a gap to fill in later. A
 * quotation row names a Registered Item, which is what makes serial allocation
 * and vendor grouping possible; a bill line is a description, a unit and a
 * quantity, priced against nothing anybody has bought yet. So Main reads
 * exactly as it should and Bulk degrades honestly — every line stands alone
 * under "No vendor yet", which `composeSheet` already does for any row with no
 * item and is the correct answer rather than a degraded one.
 *
 * NO RATE CROSSES. `composeSheet` carries only the fields it names, and this
 * returns only the fields it names, so what the bill was priced at stays in
 * Tendering — the same rule that drops a quotation's prices on the way in.
 */
export function boqAsTables(lines: readonly BoqLine[]): Array<{
  id: string;
  title: string;
  rows: Array<{ id: string; itemId: string; description: string; unit: string; qty: number }>;
}> {
  return boqGroups(lines).map((g, i) => ({
    // The group NAME is the id, so a sheet's stored per-row data survives a
    // group being renamed — the rows are keyed by row id, and the table id is
    // only what the screen draws a heading from. `i` keeps an unnamed group
    // distinct from another unnamed one rather than collapsing the two.
    id: g.group || `group-${i}`,
    title: g.group,
    rows: g.lines.map((l) => ({
      id: String(l?.id ?? ""),
      itemId: "",
      description: String(l?.description ?? ""),
      unit: String(l?.unit ?? ""),
      qty: num(l?.qty),
    })),
  }));
}
