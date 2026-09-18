// A RETURN AT THE COUNTER — what may still be returned from a sale, what it
// refunds, and which batch each unit goes back to. Pure: the Returns screen and
// the server run exactly this, so the refund on screen is the refund paid.
//
// THE REFUND IS WHAT THE LINE WAS PAID, never a re-priced figure. A receipt
// line stores its net — its own discount and its share of the basket's taken
// off (posModel.priceBasket) — and a return refunds that, pro rata by units.
// Re-pricing at today's shelf price would refund a discounted item at full
// price, or a price rise the customer never paid.
//
// THE LAST UNIT TAKES THE REMAINDER. Three units at 10.00 net each, returned one
// at a time, refund 3.33 + 3.33 + 3.34: a line returned in full, however it is
// split, refunds exactly what it was charged.

import { roundMoney, roundSum } from "@/shared/money";
import { posTotals, type PosLine } from "./posModel";

export const RETURN_STATUSES = ["Pending", "Approved", "Rejected"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

/** One receipt line as a return reads it. */
export type SoldLine = PosLine & { units?: number; picks?: { batchId: string; qty: number }[] };
export type SoldReceipt = {
  id: string;
  currency: string;
  vatRate: number;
  taxMethod?: string;
  pricesIncludeTax: boolean;
  lines: SoldLine[];
};

/** One line of a return: which receipt line, how many units, and what they refund (net). */
export type ReturnLine = {
  line: number;
  itemId: string;
  description: string;
  units: number;
  refund: number;
  taxCategory?: "zero" | "exempt";
};
export type ReturnLike = { status: string; receiptId: string; lines: readonly ReturnLine[] };

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const units3 = (v: number) => Math.round(v * 1000) / 1000;

/** What a sold line came to — its stored net, or count × price on a receipt from before discounts. */
const netOf = (l: SoldLine, currency: unknown) =>
  typeof l.net === "number" ? l.net : roundMoney(num(l.count) * num(l.price), currency);
const soldUnits = (l: SoldLine) => units3(num(l.units ?? l.count));

/**
 * WHAT EACH LINE HAS LEFT TO RETURN. A return waiting for its signature
 * RESERVES its units, so two cashiers cannot each ask for the same last unit;
 * a rejected one releases them.
 */
export function returnable(receipt: SoldReceipt, returns: readonly ReturnLike[]) {
  const live = returns.filter((r) => r.receiptId === receipt.id && r.status !== "Rejected");
  return receipt.lines.map((l, line) => {
    const mine = live.flatMap((r) => r.lines.filter((x) => x.line === line));
    const returned = units3(mine.reduce((s, x) => s + num(x.units), 0));
    const refunded = roundSum(mine.reduce((s, x) => s + num(x.refund), 0));
    const sold = soldUnits(l);
    return {
      line,
      itemId: l.itemId,
      description: l.description,
      taxCategory: l.taxCategory,
      sold,
      returned,
      remaining: units3(Math.max(0, sold - returned)),
      net: netOf(l, receipt.currency),
      refunded,
    };
  });
}

export type Returnable = ReturnType<typeof returnable>[number];

/** What returning `units` of a line refunds, net. The last units take whatever is left. */
export function refundFor(row: Returnable, units: number, currency: unknown): number {
  if (units >= row.remaining) return roundSum(Math.max(0, row.net - row.refunded));
  return row.sold > 0 ? roundMoney((row.net * units) / row.sold, currency) : 0;
}

/**
 * THE RETURN AS ASKED, checked against what is left: every asked line must be
 * on the receipt, and no more than its remaining units. Lines asked at nought
 * are dropped; a return with nothing left in it is refused.
 */
export function planReturn(
  receipt: SoldReceipt,
  returns: readonly ReturnLike[],
  asked: unknown,
): { lines: ReturnLine[] } | { error: "lines" | "too-many"; line?: number; remaining?: number } {
  const rows = returnable(receipt, returns);
  const out: ReturnLine[] = [];
  for (const raw of Array.isArray(asked) ? asked : []) {
    const a = (raw || {}) as { line?: unknown; units?: unknown };
    const line = Number(a.line);
    const units = units3(num(a.units));
    if (!(units > 0)) continue;
    const row = Number.isInteger(line) ? rows[line] : undefined;
    if (!row) return { error: "lines" };
    if (units > row.remaining) return { error: "too-many", line, remaining: row.remaining };
    if (out.some((x) => x.line === line)) return { error: "lines" };
    out.push({
      line,
      itemId: row.itemId,
      description: row.description,
      units,
      refund: refundFor(row, units, receipt.currency),
      ...(row.taxCategory ? { taxCategory: row.taxCategory } : {}),
    });
  }
  return out.length ? { lines: out } : { error: "lines" };
}

/**
 * WHAT THE RETURN PAYS BACK, in the SALE's own tax terms — its rate, its
 * method, and whether its prices included tax — so the tax refunded is the tax
 * that was charged, whatever the studio's settings say today.
 */
export function returnTotals(lines: readonly ReturnLine[], receipt: SoldReceipt) {
  return posTotals(
    lines.map((l) => ({
      itemId: l.itemId, description: l.description, count: l.units, price: 0, net: l.refund,
      ...(l.taxCategory ? { taxCategory: l.taxCategory } : {}),
    })),
    {
      vatRate: receipt.vatRate,
      currency: receipt.currency,
      method: (receipt.taxMethod || "document") as "document" | "line" | "legacy",
      pricesIncludeTax: receipt.pricesIncludeTax,
    },
  );
}

/**
 * WHERE RETURNED UNITS GO BACK: to the batches the sale took them from, the
 * LAST taken first. The sale took soonest-expiring batches first and unbatched
 * stock last (inventory/batches.pickBatches), so going back in reverse fills
 * the latest-expiring lot before the earliest, and units already returned are
 * skipped so two partial returns never put the same unit back twice. An empty
 * `batchId` is stock that came from no batch.
 */
export function restockPlan(line: SoldLine, alreadyReturned: number, units: number): { batchId: string; qty: number }[] {
  const picks = (line.picks || []).map((p) => ({ batchId: p.batchId, qty: num(p.qty) }));
  const fromBatches = picks.reduce((s, p) => s + p.qty, 0);
  const untracked = units3(Math.max(0, soldUnits(line) - fromBatches));
  const taken = [...picks, ...(untracked > 0 ? [{ batchId: "", qty: untracked }] : [])].reverse();
  let skip = units3(alreadyReturned);
  let want = units3(units);
  const out: { batchId: string; qty: number }[] = [];
  for (const t of taken) {
    let available = t.qty;
    if (skip > 0) {
      const s = Math.min(skip, available);
      skip = units3(skip - s);
      available = units3(available - s);
    }
    if (available <= 0 || want <= 0) continue;
    const q = Math.min(available, want);
    out.push({ batchId: t.batchId, qty: units3(q) });
    want = units3(want - q);
  }
  return out;
}
