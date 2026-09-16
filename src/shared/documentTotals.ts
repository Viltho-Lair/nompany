// WHAT A PRICED DOCUMENT COMES TO — one calculation for every document that has
// one: quotations, sales orders, invoices, bills and receipts.
//
// IT WAS TWO. `computeTotals` (Technical, for quotations and sales orders) and
// `invoiceTotals` (Finance, for invoices and bills) did the same sum
// separately, which holds only for as long as neither learns anything the
// other does not. A quotation's total has to be its invoice's total later; the
// day one of them rounds differently, a customer is quoted one figure and
// billed another. So there is one, here, and both of those call it.
//
// PURE and shared, because the screens that price a document show the figure
// before the server stores it and must arrive at the same one.

import { roundMoney, roundSum } from "./money";
import { categoryRate, cleanTaxCategory, type TaxCategory, type TaxMethod } from "./taxProfile";

/**
 * HOW THIS DOCUMENT ADDS UP ITS TAX. `document` and `line` are the two ways a
 * country asks for (shared/taxProfile). `legacy` is how every document in this
 * product was totalled before countries were known — the subtotal rounded once,
 * the tax taken on it — and it is what a document with no method stored gets.
 *
 * WHY A STORED DOCUMENT KEEPS ITS OWN METHOD. An invoice's totals are
 * recomputed on every read. Switching an issued invoice to a new rounding would
 * move its total by a minor unit under a ledger entry and a payment that were
 * made against the old one, so the method is FROZEN on a document when it is
 * raised, the way its currency is.
 */
export type TotalsMethod = TaxMethod | "legacy";

export type TotalsInput = {
  lines?: unknown;
  /** The document's rate — what a STANDARD line is taxed at. */
  vatRate?: unknown;
  /** The document's currency; it decides the decimals. Blank → two. */
  currency?: unknown;
  /** Absent → legacy, the arithmetic every existing document was written with. */
  method?: unknown;
};

/** The tax on one rate, which is what a tax invoice and a return list. */
export type TaxBreakdown = { category: TaxCategory; rate: number; taxable: number; tax: number };

export type Totals = { subtotal: number; vat: number; total: number; breakdown: TaxBreakdown[] };

export const TOTALS_METHODS = ["legacy", "document", "line"] as const;
export const cleanTotalsMethod = (v: unknown): TotalsMethod =>
  (TOTALS_METHODS as readonly unknown[]).includes(v) ? (v as TotalsMethod) : "legacy";

type PricedLine = { qty?: unknown; unitPrice?: unknown; taxCategory?: unknown };

/**
 * THE FIGURES. The subtotal and the tax always add up to the total exactly,
 * whatever the currency's decimals and whichever the method.
 *
 * A line without a number contributes nothing rather than NaN: every caller
 * this replaced coerced the same way, and a document is not made unreadable by
 * one blank cell. A line with no tax category is STANDARD — every line written
 * before categories existed.
 */
export function documentTotals({ lines, vatRate, currency, method }: TotalsInput): Totals {
  const how = cleanTotalsMethod(method);
  const list = (Array.isArray(lines) ? lines : []) as PricedLine[];

  // Each line's net and the rate it carries. `legacy` keeps the net unrounded,
  // as it always did; the two country methods round each line first, which is
  // what their tax authorities validate against (a line net amount has the
  // currency's decimals).
  const priced = list.map((l) => {
    const line = (l ?? {}) as PricedLine;
    const raw = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
    const category = cleanTaxCategory(line.taxCategory);
    return {
      category,
      rate: categoryRate(category, vatRate),
      net: how === "legacy" ? raw : roundMoney(raw, currency),
    };
  });

  // ONE GROUP PER CATEGORY AND RATE, in a fixed order, so the breakdown reads
  // the same way every time the document is opened.
  const groups = new Map<string, { category: TaxCategory; rate: number; net: number; lineTax: number }>();
  for (const p of priced) {
    const key = `${p.category}:${p.rate}`;
    const g = groups.get(key) || { category: p.category, rate: p.rate, net: 0, lineTax: 0 };
    g.net += p.net;
    // `line` takes each line's tax on its own and rounds it there.
    if (how === "line") g.lineTax += roundMoney(p.net * (p.rate / 100), currency);
    groups.set(key, g);
  }

  const breakdown: TaxBreakdown[] = [...groups.values()]
    .sort((a, b) => b.rate - a.rate || a.category.localeCompare(b.category))
    .map((g) => {
      const taxable = roundMoney(g.net, currency);
      const tax = how === "line"
        ? roundSum(g.lineTax)
        : roundMoney(taxable * (g.rate / 100), currency);
      return { category: g.category, rate: g.rate, taxable, tax };
    });

  // THE SUBTOTAL. `legacy` rounds the whole once — exactly the old figure, so
  // no existing document moves. The country methods add the rounded line nets.
  const subtotal = how === "legacy"
    ? roundMoney(priced.reduce((s, p) => s + p.net, 0), currency)
    : roundSum(priced.reduce((s, p) => s + p.net, 0));

  // THE TAX. `legacy` with a single rate is the old `subtotal × rate`; with
  // several (a document edited after categories arrived) it is the per-rate
  // sum, which is the only honest answer once rates differ.
  const vat = how === "legacy" && breakdown.length <= 1
    ? roundMoney(subtotal * ((breakdown[0]?.rate ?? categoryRate("standard", vatRate)) / 100), currency)
    : roundSum(breakdown.reduce((s, b) => s + b.tax, 0));

  return { subtotal, vat, total: roundSum(subtotal + vat), breakdown };
}
