// THE TILL'S ARITHMETIC — what a sale comes to, whether it is paid, and what a
// shift took. Pure: the screen and the server run exactly this, so a basket
// shows the total the receipt will print.
//
// ONE RULE THAT IS NOT A DOCUMENT'S. A quotation or an invoice is priced NET and
// the tax is added (shared/documentTotals). A shop's shelf price, almost
// everywhere a VAT exists, ALREADY INCLUDES the tax — so a till that added tax
// to it would charge the customer twice. `pricesIncludeTax` says which, and for
// a tax-inclusive price the tax is taken OUT of the price rather than put on
// top: 11.50 at 15% is 10.00 plus 1.50, never 11.50 plus 1.73. The total the
// customer pays is then exactly the prices on the shelf.

import { roundMoney, roundSum } from "@/shared/money";
import { documentTotals, type TaxBreakdown, type TotalsMethod } from "@/shared/documentTotals";
import { categoryRate, cleanTaxCategory, taxCategoryField } from "@/shared/taxProfile";

export const PAYMENT_METHODS = ["cash", "card", "transfer"] as const;
export type PosPaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SHIFT_STATUSES = ["Open", "Closed"] as const;

export type PosLine = {
  itemId: string;
  description: string;
  /** How many of the item's own unit were sold. */
  count: number;
  /** The price of ONE of what was sold, as the shelf shows it. */
  price: number;
  taxCategory?: "zero" | "exempt";
};

export type PosPayment = { method: PosPaymentMethod; amount: number; reference?: string };

export type PosTotals = {
  subtotal: number;
  vat: number;
  total: number;
  breakdown: TaxBreakdown[];
};

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Units of the item a line takes off the shelf — its count, in the item's unit. */
export const unitsOf = (l: Pick<PosLine, "count">) => Math.round(num(l.count) * 1000) / 1000;

/** A basket line as the server stores it. Anything unreadable is dropped. */
export function cleanPosLines(list: unknown): PosLine[] {
  return (Array.isArray(list) ? list : [])
    .slice(0, 300)
    .map((raw) => {
      const l = (raw || {}) as Record<string, unknown>;
      return {
        itemId: str(l.itemId, 60),
        description: str(l.description, 200),
        count: Math.round(num(l.count) * 1000) / 1000,
        price: roundSum(Math.max(0, num(l.price))),
        ...taxCategoryField(l.taxCategory),
      };
    })
    .filter((l) => l.itemId && l.count > 0);
}

/**
 * WHAT THE BASKET COMES TO.
 *
 * Tax-EXCLUSIVE prices (a US sales tax) go through the documents' own function.
 * Tax-INCLUSIVE prices take the tax out: per rate on the gross total
 * (`document`, and `legacy` for a studio in no listed country) or per line
 * (`line`). Either way the parts add up to exactly the gross total — the net is
 * the gross less the tax, never computed separately.
 */
export function posTotals(
  lines: readonly PosLine[],
  { vatRate, currency, method, pricesIncludeTax }:
  { vatRate: unknown; currency: unknown; method?: TotalsMethod; pricesIncludeTax: boolean },
): PosTotals {
  const priced = lines.map((l) => ({
    qty: num(l.count),
    unitPrice: num(l.price),
    taxCategory: l.taxCategory,
  }));
  if (!pricesIncludeTax) {
    const t = documentTotals({ lines: priced, vatRate, currency, method: method || "document" });
    return { subtotal: t.subtotal, vat: t.vat, total: t.total, breakdown: t.breakdown };
  }

  const groups = new Map<string, { category: TaxBreakdown["category"]; rate: number; gross: number; lineTax: number }>();
  for (const p of priced) {
    const category = cleanTaxCategory(p.taxCategory);
    const rate = categoryRate(category, vatRate);
    const gross = roundMoney(p.qty * p.unitPrice, currency);
    const key = `${category}:${rate}`;
    const g = groups.get(key) || { category, rate, gross: 0, lineTax: 0 };
    g.gross = roundSum(g.gross + gross);
    if (method === "line") g.lineTax = roundSum(g.lineTax + roundMoney((gross * rate) / (100 + rate), currency));
    groups.set(key, g);
  }
  const breakdown: TaxBreakdown[] = [...groups.values()]
    .sort((a, b) => b.rate - a.rate || a.category.localeCompare(b.category))
    .map((g) => {
      const tax = method === "line" ? g.lineTax : roundMoney((g.gross * g.rate) / (100 + g.rate), currency);
      return { category: g.category, rate: g.rate, taxable: roundSum(g.gross - tax), tax };
    });
  const total = roundSum([...groups.values()].reduce((s, g) => s + g.gross, 0));
  const vat = roundSum(breakdown.reduce((s, b) => s + b.tax, 0));
  return { subtotal: roundSum(total - vat), vat, total, breakdown };
}

/** Payments as stored: a known method and a positive amount in the sale's currency. */
export function cleanPayments(list: unknown, currency: unknown): PosPayment[] {
  return (Array.isArray(list) ? list : [])
    .slice(0, 10)
    .map((raw) => {
      const p = (raw || {}) as Record<string, unknown>;
      const method = (PAYMENT_METHODS as readonly string[]).includes(String(p.method)) ? (p.method as PosPaymentMethod) : null;
      const reference = str(p.reference, 60);
      return method ? { method, amount: roundMoney(Math.max(0, num(p.amount)), currency), ...(reference ? { reference } : {}) } : null;
    })
    .filter((p): p is PosPayment => p !== null && p.amount > 0);
}

/**
 * IS THIS SALE PAID, AND WHAT CHANGE IS DUE?
 *
 * ONLY CASH GIVES CHANGE. A card or a transfer is for an exact amount, so one
 * that would take the payments past the total is refused rather than turned
 * into change nobody can hand back. What is tendered in cash beyond the total
 * is change, and the change can never exceed the cash.
 */
export function settle(
  total: number,
  payments: readonly PosPayment[],
  currency: unknown,
): { problem: string; paid: number; change: number } {
  const nonCash = roundSum(payments.filter((p) => p.method !== "cash").reduce((s, p) => s + p.amount, 0));
  const cash = roundSum(payments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0));
  if (nonCash > total) return { problem: "overpaid-card", paid: roundSum(nonCash + cash), change: 0 };
  const paid = roundSum(nonCash + cash);
  if (paid < total) return { problem: "underpaid", paid, change: 0 };
  return { problem: "", paid, change: roundMoney(paid - total, currency) };
}

export type ShiftReceipt = {
  kind?: string;
  status?: string;
  total: number;
  vat: number;
  subtotal: number;
  change?: number;
  payments?: PosPayment[];
  breakdown?: TaxBreakdown[];
};

/**
 * WHAT A SHIFT TOOK — the end-of-day ("Z") report.
 *
 * EXPECTED CASH is the float the drawer opened with, plus cash taken, less the
 * change handed back. The counted figure is typed at close, and the difference
 * is REPORTED, never corrected: a drawer that is short is a fact somebody has to
 * look at, and an ERP that quietly reconciled it would hide the one number the
 * report exists for.
 */
export function shiftReport(
  receipts: readonly ShiftReceipt[],
  { openingFloat, countedCash, currency }: { openingFloat: unknown; countedCash?: unknown; currency: unknown },
) {
  const sales = receipts.filter((r) => (r.kind || "sale") === "sale" && r.status !== "Voided");
  const byMethod: Record<string, number> = {};
  let change = 0;
  for (const r of sales) {
    change = roundSum(change + num(r.change));
    for (const p of r.payments || []) byMethod[p.method] = roundSum((byMethod[p.method] || 0) + num(p.amount));
  }
  const byTax = new Map<string, TaxBreakdown>();
  for (const r of sales) {
    for (const b of r.breakdown || []) {
      const key = `${b.category}:${b.rate}`;
      const g = byTax.get(key) || { category: b.category, rate: b.rate, taxable: 0, tax: 0 };
      g.taxable = roundSum(g.taxable + num(b.taxable));
      g.tax = roundSum(g.tax + num(b.tax));
      byTax.set(key, g);
    }
  }
  const float = roundMoney(num(openingFloat), currency);
  const cashTaken = roundSum((byMethod.cash || 0) - change);
  const expectedCash = roundSum(float + cashTaken);
  const counted = countedCash === undefined || countedCash === null || countedCash === ""
    ? null : roundMoney(num(countedCash), currency);
  return {
    sales: sales.length,
    total: roundSum(sales.reduce((s, r) => s + num(r.total), 0)),
    subtotal: roundSum(sales.reduce((s, r) => s + num(r.subtotal), 0)),
    vat: roundSum(sales.reduce((s, r) => s + num(r.vat), 0)),
    byMethod: PAYMENT_METHODS.map((method) => ({ method, amount: byMethod[method] || 0 })).filter((m) => m.amount > 0),
    change,
    byTax: [...byTax.values()].sort((a, b) => b.rate - a.rate || a.category.localeCompare(b.category)),
    openingFloat: float,
    cashTaken,
    expectedCash,
    countedCash: counted,
    difference: counted === null ? null : roundSum(counted - expectedCash),
  };
}

export type ShiftReport = ReturnType<typeof shiftReport>;
