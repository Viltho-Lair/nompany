// WHAT THE STOCK ON HAND IS WORTH.
//
// A LEVEL IS NOT A VALUE. Inventory has always known how many of a thing it
// holds — stock is the sum of its movements, appended and never edited — and it
// has never known what they cost. So a studio could say "eleven pumps" and not
// "eleven pumps, £14,300", which is the number that appears on a balance sheet
// and the one an auditor asks for.
//
// TWO METHODS, BECAUSE THE ANSWER GENUINELY DIFFERS. Buy five at 100 and five
// at 200, sell five: FIFO says the remaining five are worth 1,000 (the later,
// dearer batch is what is left) and weighted average says 750. Neither is
// wrong; they are different accounting policies, a studio picks one, and a
// product that silently picked for them would be putting a number on their
// accounts that they never chose.
//
// PURE. No imports, no store, no clock — the caller resolves what each inbound
// movement cost and hands the movements in, so the screen and the server value
// the same stock identically and every case below is asserted without a
// database.

export const VALUATION_METHODS = ["fifo", "average"] as const;
export type ValuationMethod = (typeof VALUATION_METHODS)[number];
export const DEFAULT_METHOD: ValuationMethod = "average";

export const isValuationMethod = (v: unknown): v is ValuationMethod =>
  (VALUATION_METHODS as readonly string[]).includes(String(v ?? ""));

/**
 * ONE MOVEMENT, WITH ITS COST RESOLVED.
 *
 * `unitCost` MATTERS ONLY ON THE WAY IN. What an outbound movement "cost" is
 * the question the method exists to answer — taking a cost off an issue would
 * be assuming the answer.
 */
export type CostedMovement = {
  itemId: string;
  /** Positive is in, negative is out. The sign the stock ledger already uses. */
  qty: number;
  /** What one unit cost, on an inbound movement. Ignored on an outbound one. */
  unitCost?: number;
  /** ISO instant. Ordering is by this, and ties break on the order supplied. */
  at?: string;
};

export type ItemValue = {
  itemId: string;
  /** Units on hand — the sum of the movements, unchanged by the method. */
  qty: number;
  value: number;
  /** value / qty, or null when nothing is on hand. Never a division by nought. */
  unitValue: number | null;
  /**
   * WHETHER ANY OF THIS STOCK WAS VALUED AT NOTHING, which is the one thing a
   * total cannot say for itself. An inbound movement whose cost could not be
   * resolved values at 0, so a studio whose receipts predate cost tracking sees
   * a total that is honestly too low rather than a confident wrong one.
   */
  uncosted: number;
};

const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * VALUE ONE ITEM'S STOCK.
 *
 * FIFO walks a queue of costed batches: an issue consumes the oldest first, and
 * what remains is what the stock is worth. AVERAGE keeps a running cost per
 * unit that is re-derived on every receipt and is NOT disturbed by an issue —
 * which is the whole property of the method, and the thing a naive
 * implementation gets wrong by recomputing over all receipts at the end.
 */
export function valueItem(
  movements: readonly CostedMovement[],
  method: ValuationMethod,
): ItemValue {
  const itemId = String(movements[0]?.itemId ?? "");
  // STABLE, AND BY TIME. `sort` is stable in every engine this runs on, so two
  // movements sharing an instant keep the order they were appended in — which
  // for an append-only ledger is the order they happened.
  const ordered = [...movements].sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));

  let uncosted = 0;

  if (method === "fifo") {
    const batches: { qty: number; unitCost: number }[] = [];
    for (const m of ordered) {
      const qty = num(m.qty);
      if (qty > 0) {
        const unitCost = num(m.unitCost);
        if (!unitCost) uncosted += qty;
        batches.push({ qty, unitCost });
        continue;
      }
      // AN ISSUE EATS THE OLDEST BATCHES FIRST. Anything left over when the
      // queue empties is stock that went out and was never received — a real
      // state in a ledger nobody has back-filled — and it is DROPPED rather
      // than allowed to make the queue negative, which would value the next
      // receipt against a debt.
      let take = -qty;
      while (take > 0 && batches.length) {
        const head = batches[0];
        const used = Math.min(head.qty, take);
        head.qty -= used;
        take -= used;
        if (head.qty <= 0) batches.shift();
      }
    }
    const qty = round(batches.reduce((n, b) => n + b.qty, 0));
    const value = round(batches.reduce((n, b) => n + b.qty * b.unitCost, 0));
    return { itemId, qty, value, unitValue: qty > 0 ? round(value / qty) : null, uncosted: round(Math.min(uncosted, qty)) };
  }

  // WEIGHTED AVERAGE, running. The cost per unit changes only when stock comes
  // IN; an issue removes units at the cost in force and leaves that cost alone.
  let qty = 0;
  let value = 0;
  for (const m of ordered) {
    const moved = num(m.qty);
    if (moved > 0) {
      const unitCost = num(m.unitCost);
      if (!unitCost) uncosted += moved;
      qty = round(qty + moved);
      value = round(value + moved * unitCost);
      continue;
    }
    const out = Math.min(-moved, qty);
    // AT THE COST IN FORCE, not at whatever the issue said. Taking units out at
    // the average is what keeps the remaining value consistent with the
    // remaining count — and issuing more than is held removes what there is
    // rather than going negative.
    const unit = qty > 0 ? value / qty : 0;
    qty = round(qty - out);
    value = round(Math.max(0, value - out * unit));
  }
  return { itemId, qty, value, unitValue: qty > 0 ? round(value / qty) : null, uncosted: round(Math.min(uncosted, qty)) };
}

export type StockValuation = {
  method: ValuationMethod;
  items: ItemValue[];
  total: number;
  /** Units on hand that were valued at nothing, across every item. */
  uncosted: number;
};

/** Value every item's stock, commonest convention: only what is on hand appears. */
export function valueStock(
  movements: readonly CostedMovement[],
  method: ValuationMethod,
): StockValuation {
  const byItem = new Map<string, CostedMovement[]>();
  for (const m of movements || []) {
    const key = String(m.itemId ?? "");
    const list = byItem.get(key);
    if (list) list.push(m); else byItem.set(key, [m]);
  }

  const items = [...byItem.values()]
    .map((ms) => valueItem(ms, method))
    // AN ITEM WITH NOTHING ON HAND IS NOT A VALUATION LINE. It has moved and it
    // has come back to nought, which is a fact about its history rather than
    // about what the company holds today.
    .filter((v) => v.qty > 0)
    .sort((a, b) => b.value - a.value || a.itemId.localeCompare(b.itemId));

  return {
    method,
    items,
    total: round(items.reduce((n, i) => n + i.value, 0)),
    uncosted: round(items.reduce((n, i) => n + i.uncosted, 0)),
  };
}
