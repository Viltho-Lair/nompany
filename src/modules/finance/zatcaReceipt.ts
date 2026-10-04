// A TILL RECEIPT AS ZATCA'S SIMPLIFIED INVOICE — composed, and nothing else.
// PURE, like ./zatcaDocument, which it mirrors for the other kind of sale.
//
// WHY A RECEIPT IS REPORTED AT ALL (04/10/2026): a sale over a counter in Saudi
// Arabia is a simplified tax invoice, exactly as a B2C invoice raised in
// Finance is, and must reach ZATCA the same way. The owner's answer on the
// discounts: "Yes" — a basket discount is written as ZATCA's document-level
// allowance, and the shop's offers and the cashier's line discounts are folded
// into each line's net price.
//
// THE RECEIPT'S OWN FIGURES ARE THE TRUTH, and nothing here recomputes them.
// The till already settled what the customer paid and what tax was in it
// (`posTotals`, stored on the receipt as `breakdown`, `subtotal`, `vat`,
// `total`). A document that re-derived the tax from rounded lines could differ
// from the slip in the customer's hand by a halala, which is the one thing a
// tax document must not do. So each category's TAXABLE AMOUNT AND TAX ARE THE
// RECEIPT'S, and the lines and the allowance are built to add up to them:
//
//   allowance(c)  = the basket discount in category c, without its tax
//   Σ lines(c)    = taxable(c) + allowance(c)     ← distributed over the lines
//                                                   by what each came to
//
// which is ZATCA's own rule read backwards (a category's taxable amount is its
// lines less its allowances), so it holds by construction.

import { roundMoney, roundSum } from "@/shared/money";
import { cleanTaxCategory, categoryRate } from "@/shared/taxProfile";
import { ZATCA_DOCUMENT_TYPES, ZATCA_SUBTYPES, type ZatcaAllowance, type ZatcaCategory, type ZatcaDocument, type ZatcaExemptions, type ZatcaLine, type ZatcaSeller, type ZatcaSubtotal } from "./zatcaDocument";

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/** What a receipt line stores (modules/sales/posModel PosLine, as priced). */
type ReceiptLine = {
  description?: unknown; count?: unknown; price?: unknown; taxCategory?: unknown;
  gross?: unknown; promotionDiscount?: unknown; lineDiscount?: unknown; basketShare?: unknown; net?: unknown;
};
type Receipt = {
  number?: unknown; currency?: unknown; vatRate?: unknown; pricesIncludeTax?: unknown;
  lines?: unknown; breakdown?: unknown; total?: unknown;
  payments?: unknown;
};

const FROM_CATEGORY: Record<string, ZatcaCategory> = { standard: "S", zero: "Z", exempt: "E" };

/**
 * UN/ECE 4461 for how the customer paid — the FIRST payment's method, the one
 * ZATCA has room for. 10 cash, 48 card, 30 credit transfer, 1 anything else.
 */
export function paymentMeansOf(payments: unknown): string {
  const first = (Array.isArray(payments) ? payments[0] : null) as { method?: unknown } | null;
  return ({ cash: "10", card: "48", transfer: "30" } as Record<string, string>)[String(first?.method || "")] || "1";
}

/** Split `total` over `weights` in proportion, in the currency's decimals, the last taking the remainder. */
function share(total: number, weights: number[], currency: string): number[] {
  const sum = roundSum(weights.reduce((s, w) => s + w, 0));
  let given = 0;
  let last = -1;
  weights.forEach((w, i) => { if (w > 0) last = i; });
  return weights.map((w, i) => {
    if (last < 0) return i === weights.length - 1 ? roundSum(total - given) : 0;
    if (!(w > 0)) return 0;
    const part = i === last ? roundSum(total - given) : roundMoney((total * w) / sum, currency);
    given = roundSum(given + part);
    return part;
  });
}

/**
 * A UNIT PRICE THAT MULTIPLIES BACK TO THE LINE EXACTLY. A two-decimal price
 * whose count times it is the net is written as it is; one that is not —
 * 10.00 for three — is written as "the price of `count`", so nothing rounds.
 */
function priced(net: number, count: number, currency: string): Pick<ZatcaLine, "unitPrice" | "baseQuantity"> {
  if (!(count > 0) || count === 1) return { unitPrice: net };
  const unit = roundMoney(net / count, currency);
  return roundSum(unit * count) === net ? { unitPrice: unit } : { unitPrice: net, baseQuantity: count };
}

/** THE RECEIPT AS ZATCA'S SIMPLIFIED INVOICE. */
export function zatcaReceiptDocument(input: {
  receipt: Receipt;
  seller: ZatcaSeller;
  uuid: string;
  issueDate: string;
  issueTime: string;
  counter: number;
  previousHash: string;
  exemptions?: ZatcaExemptions;
}): ZatcaDocument {
  const r = input.receipt;
  const currency = str(r.currency, 3).toUpperCase() || "SAR";
  const inclusive = Boolean(r.pricesIncludeTax);
  const raw = (Array.isArray(r.lines) ? r.lines : []) as ReceiptLine[];
  const breakdown = (Array.isArray(r.breakdown) ? r.breakdown : []) as Array<{ category?: unknown; rate?: unknown; taxable?: unknown; tax?: unknown }>;

  // THE LINES BY TAX CATEGORY, in the receipt's order within each.
  const groups = new Map<string, { category: ZatcaCategory; rate: number; lines: Array<{ l: ReceiptLine; i: number }> }>();
  raw.forEach((l, i) => {
    const cat = cleanTaxCategory(l.taxCategory);
    const rate = categoryRate(cat, r.vatRate);
    const key = `${cat}:${rate}`;
    const g = groups.get(key) || { category: FROM_CATEGORY[cat] || "S", rate, lines: [] };
    g.lines.push({ l, i });
    groups.set(key, g);
  });

  const lines: ZatcaLine[] = new Array(raw.length);
  const subtotals: ZatcaSubtotal[] = [];
  const allowances: ZatcaAllowance[] = [];
  for (const [key, g] of groups) {
    const [cat] = key.split(":");
    const stored = breakdown.find((b) => cleanTaxCategory(b.category) === cat && num(b.rate) === g.rate);
    // WHAT EACH LINE CAME TO BEFORE THE BASKET DISCOUNT — the shop's offers and
    // the cashier's line discount already off, as the till stored it.
    const before = g.lines.map(({ l }) => roundSum(num(l.net) + num(l.basketShare)));
    const basket = roundSum(g.lines.reduce((s, { l }) => s + num(l.basketShare), 0));
    const allowance = inclusive ? roundMoney((basket * 100) / (100 + g.rate), currency) : basket;
    // THE RECEIPT'S OWN TAXABLE AMOUNT AND TAX for this category; a receipt
    // written before `breakdown` existed is read from its lines instead.
    const grossNet = roundSum(g.lines.reduce((s, { l }) => s + num(l.net), 0));
    const tax = stored ? num(stored.tax)
      : inclusive ? roundMoney((grossNet * g.rate) / (100 + g.rate), currency) : roundMoney((grossNet * g.rate) / 100, currency);
    const taxable = stored ? num(stored.taxable) : inclusive ? roundSum(grossNet - tax) : grossNet;
    const nets = share(roundSum(taxable + allowance), before, currency);
    g.lines.forEach(({ l, i }, k) => {
      const count = num(l.count) || 1;
      lines[i] = {
        id: String(i + 1),
        name: str(l.description),
        quantity: count,
        ...priced(nets[k], count, currency),
        lineExtensionAmount: nets[k],
        category: g.category,
        percent: g.rate,
        taxAmount: roundMoney((nets[k] * g.rate) / 100, currency),
      };
    });
    const why = g.category === "S" ? undefined : input.exemptions?.[g.category];
    subtotals.push({
      category: g.category, percent: g.rate, taxableAmount: taxable, taxAmount: tax,
      ...(why ? { exemptionCode: str(why.code, 40), exemptionReason: str(why.reason, 300) } : {}),
    });
    if (allowance > 0) allowances.push({ category: g.category, percent: g.rate, amount: allowance });
  }

  const lineExtensionAmount = roundSum(lines.reduce((s, l) => s + l.lineExtensionAmount, 0));
  const allowanceTotal = roundSum(allowances.reduce((s, a) => s + a.amount, 0));
  const taxExclusiveAmount = roundSum(lineExtensionAmount - allowanceTotal);
  const taxAmount = roundSum(subtotals.reduce((s, t) => s + t.taxAmount, 0));
  const total = roundSum(taxExclusiveAmount + taxAmount);

  return {
    id: str(r.number, 60),
    uuid: input.uuid,
    issueDate: input.issueDate,
    issueTime: input.issueTime,
    typeCode: ZATCA_DOCUMENT_TYPES.invoice,
    subtype: ZATCA_SUBTYPES.simplified,
    currency,
    counter: input.counter,
    previousHash: input.previousHash,
    seller: input.seller,
    // A COUNTER SALE NAMES NOBODY — a walk-in customer is ordinary.
    buyer: null,
    paymentMeansCode: paymentMeansOf(r.payments),
    lines: lines.filter(Boolean),
    subtotals,
    ...(allowances.length ? { allowances } : {}),
    lineExtensionAmount,
    taxExclusiveAmount,
    taxAmount,
    taxInclusiveAmount: total,
    payableAmount: total,
  };
}
