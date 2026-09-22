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
  /** A discount on this line alone, as the cashier typed it. */
  discount?: PosDiscount;
  // WHAT THE LINE CAME TO, written by `priceBasket` and stored on the receipt.
  // A return refunds `net`, never a re-priced figure (see priceBasket).
  /** The item's own price when the sale was made — what a discount is measured against. */
  listPrice?: number;
  /**
   * WHAT THE SHOP'S OWN OFFERS TOOK OFF THIS LINE (22/09/2026), worked out by
   * the promotions engine BEFORE the cashier's own discount and handed in here.
   * It is the shop deciding to charge less, which is a different act from a
   * cashier giving something away — so it is stored apart, and the cap on what
   * a cashier may give is measured after it (see discountPercentOf).
   */
  promotionDiscount?: number;
  /** count × price, rounded. */
  gross?: number;
  /** What the line's own discount took off. */
  lineDiscount?: number;
  /** This line's part of the basket discount. */
  basketShare?: number;
  /** What the customer paid: gross − promotionDiscount − lineDiscount − basketShare. */
  net?: number;
};

/**
 * A DISCOUNT AS TYPED AT THE TILL — a percentage or an amount (the owner,
 * 18/09/2026: per line and on the whole basket, either kind).
 */
export type PosDiscount = { kind: "percent" | "amount"; value: number };
export const DISCOUNT_KINDS = ["percent", "amount"] as const;

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

/** A discount as stored, or null when there is none worth keeping. */
export function cleanDiscount(raw: unknown): PosDiscount | null {
  const d = (raw || {}) as Record<string, unknown>;
  if (!(DISCOUNT_KINDS as readonly unknown[]).includes(d.kind)) return null;
  const value = roundSum(num(d.value));
  if (!(value > 0)) return null;
  if (d.kind === "percent") return { kind: "percent", value: Math.min(100, value) };
  return { kind: "amount", value };
}

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
        ...(cleanDiscount(l.discount) ? { discount: cleanDiscount(l.discount) as PosDiscount } : {}),
      };
    })
    .filter((l) => l.itemId && l.count > 0);
}

/**
 * WHAT EACH LINE CAME TO ONCE THE DISCOUNTS ARE TAKEN — the one place a
 * discount becomes money.
 *
 * THE LINE'S OWN DISCOUNT FIRST, then the basket's. A percentage is of what is
 * left; an amount can never take a line (or the basket) below nought.
 *
 * THE BASKET DISCOUNT IS SPREAD BACK ONTO THE LINES, in proportion to what each
 * came to after its own discount, and every line stores its share. Two things
 * read that share and neither can work from the basket figure alone:
 *  - TAX. Lines at different rates are taxed on what was actually charged for
 *    each, so a discount on a basket of standard and zero-rated goods lowers
 *    each rate's taxable amount by its own part.
 *  - RETURNS. Buy two things with 10 off the basket and return one: the refund
 *    is what that line was PAID, its share included. Refunding the full shelf
 *    price would pay the customer the whole discount back and let them keep the
 *    other item at a discount they no longer earned — the classic
 *    buy-one-get-one return problem.
 * Rounding each share to the currency's minor unit leaves a remainder; the
 * LAST line with anything to share takes it, so the shares add up to the basket
 * discount exactly.
 */
export function priceBasket(
  lines: readonly PosLine[],
  basket: PosDiscount | null | undefined,
  currency: unknown,
): { lines: PosLine[]; lineDiscounts: number; basketDiscount: number; discountTotal: number } {
  const first = lines.map((l) => {
    const gross = roundMoney(num(l.count) * num(l.price), currency);
    // THE SHOP'S OFFERS COME OFF FIRST and are already decided: a cashier's
    // percentage is of what is left after them, never of the shelf price.
    const promotion = Math.min(gross, roundMoney(num(l.promotionDiscount), currency));
    const room = roundSum(gross - promotion);
    const d = l.discount;
    const off = !d ? 0
      : d.kind === "percent" ? roundMoney((room * Math.min(100, d.value)) / 100, currency)
        : Math.min(room, roundMoney(d.value, currency));
    return { line: l, gross, promotion, lineDiscount: off, after: roundSum(gross - promotion - off) };
  });
  const base = roundSum(first.reduce((s, x) => s + x.after, 0));
  const basketDiscount = !basket || base <= 0 ? 0
    : basket.kind === "percent" ? roundMoney((base * Math.min(100, basket.value)) / 100, currency)
      : Math.min(base, roundMoney(basket.value, currency));

  let lastShared = -1;
  first.forEach((x, i) => { if (x.after > 0) lastShared = i; });
  let given = 0;
  const priced = first.map((x, i) => {
    let share = 0;
    if (basketDiscount > 0 && x.after > 0) {
      share = i === lastShared
        ? roundSum(basketDiscount - given)
        : roundMoney((basketDiscount * x.after) / base, currency);
      given = roundSum(given + share);
    }
    return {
      ...x.line,
      listPrice: x.line.listPrice ?? x.line.price,
      gross: x.gross,
      ...(x.promotion > 0 ? { promotionDiscount: x.promotion } : {}),
      lineDiscount: x.lineDiscount,
      basketShare: share,
      net: roundSum(x.after - share),
    };
  });
  const lineDiscounts = roundSum(first.reduce((s, x) => s + x.lineDiscount, 0));
  return { lines: priced, lineDiscounts, basketDiscount, discountTotal: roundSum(lineDiscounts + basketDiscount) };
}

/** What a line comes to — its net once priced, or count × price before. */
const amountOf = (l: PosLine, currency: unknown) =>
  typeof l.net === "number" ? l.net : roundMoney(num(l.count) * num(l.price), currency);

/**
 * HOW FAR BELOW ITS OWN PRICE A LINE WENT AT THE CASHIER'S HAND, as a
 * percentage — a typed price, the line's discount and its basket share
 * together. This is what a studio's cap is checked against, so a lower typed
 * price cannot walk round a cap on discounts.
 *
 * WHAT THE SHOP'S OWN OFFERS TOOK OFF IS NOT COUNTED (the owner, 22/09/2026).
 * The measure was the whole gap between the shelf price and what was paid,
 * which was right while a cashier was the only thing that could move a price —
 * and became a defect the day an offer could: an automatic 20% against a 10%
 * cap refused the sale, with the cashier having discounted nothing. The cap
 * limits what a PERSON gives away.
 */
export function discountPercentOf(l: PosLine, currency: unknown): number {
  const list = roundMoney(num(l.count) * num(l.listPrice ?? l.price), currency);
  const base = roundSum(list - Math.min(list, roundMoney(num(l.promotionDiscount), currency)));
  if (!(base > 0)) return 0;
  const paid = amountOf(l, currency);
  return Math.max(0, Math.round(((base - paid) / base) * 10000) / 100);
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
  // EACH LINE AT WHAT IT CAME TO: one "unit" at its net. For an undiscounted
  // line that is count × price rounded, exactly the net the documents' function
  // computed before discounts existed, so no stored receipt moves.
  const priced = lines.map((l) => ({
    qty: 1,
    unitPrice: amountOf(l, currency),
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
  /** What the till's discounts took off this sale; absent on sales before discounts. */
  discountTotal?: number;
};

/**
 * WHAT A SHIFT TOOK — the end-of-day ("Z") report.
 *
 * EXPECTED CASH is the float the drawer opened with, plus cash taken, less the
 * change handed back, less cash refunded for returns out of THIS drawer (a
 * return is paid by the shift open when its manager signed it, which need not
 * be the shift that made the sale). The counted figure is typed at close, and the difference
 * is REPORTED, never corrected: a drawer that is short is a fact somebody has to
 * look at, and an ERP that quietly reconciled it would hide the one number the
 * report exists for.
 */
export function shiftReport(
  receipts: readonly ShiftReceipt[],
  { openingFloat, countedCash, currency, refunds = [] }:
  { openingFloat: unknown; countedCash?: unknown; currency: unknown; refunds?: readonly { method: string; amount: number }[] },
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
  const refundedBy: Record<string, number> = {};
  for (const r of refunds) refundedBy[r.method] = roundSum((refundedBy[r.method] || 0) + num(r.amount));
  const cashRefunded = refundedBy.cash || 0;
  const expectedCash = roundSum(float + cashTaken - cashRefunded);
  const counted = countedCash === undefined || countedCash === null || countedCash === ""
    ? null : roundMoney(num(countedCash), currency);
  return {
    sales: sales.length,
    total: roundSum(sales.reduce((s, r) => s + num(r.total), 0)),
    subtotal: roundSum(sales.reduce((s, r) => s + num(r.subtotal), 0)),
    vat: roundSum(sales.reduce((s, r) => s + num(r.vat), 0)),
    // WHAT WAS GIVEN AWAY, beside what was taken — a drawer that balances can
    // still have been generous, and only this line says so.
    discounts: roundSum(sales.reduce((s, r) => s + num(r.discountTotal), 0)),
    byMethod: PAYMENT_METHODS.map((method) => ({ method, amount: byMethod[method] || 0 })).filter((m) => m.amount > 0),
    change,
    // RETURNS PAID OUT OF THIS SHIFT, by how they were paid — the cash part is
    // already out of the expected figure.
    refunds: roundSum(refunds.reduce((s, r) => s + num(r.amount), 0)),
    refundsByMethod: PAYMENT_METHODS.map((method) => ({ method, amount: refundedBy[method] || 0 })).filter((m) => m.amount > 0),
    cashRefunded,
    byTax: [...byTax.values()].sort((a, b) => b.rate - a.rate || a.category.localeCompare(b.category)),
    openingFloat: float,
    cashTaken,
    expectedCash,
    countedCash: counted,
    difference: counted === null ? null : roundSum(counted - expectedCash),
  };
}

export type ShiftReport = ReturnType<typeof shiftReport>;


/** One return paid out of a drawer, as the ledger needs to read it. */
export type ShiftRefund = { method: string; subtotal: number; vat: number; total: number };

/**
 * WHAT A CLOSED SHIFT DID, as figures a ledger entry is built from — money in
 * by method, what was earned, what was taxed, and the same three for what was
 * paid back.
 *
 * IT READS THE STORED REPORT, not the receipts again. The report is the fact
 * recorded when the drawer was counted and it is what the printed slip shows;
 * deriving the entry from the receipts a second time would be a second answer,
 * free to disagree with the slip the moment either changes. This is the same
 * rule `priceBasket` follows for a sale — one function, one figure.
 *
 * NO ACCOUNT CODES HERE. Which account cash lands in is the chart's business
 * and the chart is Finance's; this file knows tills. The join is one map in
 * `modules/finance/ledger`.
 *
 * MONEY IN IS NET OF CHANGE for cash and nothing else: change comes out of the
 * drawer, and a card payment never gives any.
 */
export function shiftLedgerFigures(
  report: {
    byMethod?: readonly { method: string; amount: number }[];
    cashTaken?: unknown;
    subtotal?: unknown;
    vat?: unknown;
  } | null | undefined,
  refunds: readonly ShiftRefund[] = [],
) {
  const moneyIn: Record<string, number> = {};
  for (const m of report?.byMethod || []) {
    const method = String(m?.method || "");
    if (!method) continue;
    moneyIn[method] = roundSum((moneyIn[method] || 0) + num(m?.amount));
  }
  // The report already took the change out for us, and it is the figure the
  // drawer was counted against.
  if ("cash" in moneyIn || num(report?.cashTaken) !== 0) moneyIn.cash = roundSum(num(report?.cashTaken));

  const moneyOut: Record<string, number> = {};
  for (const r of refunds) {
    const method = String(r?.method || "");
    if (!method) continue;
    moneyOut[method] = roundSum((moneyOut[method] || 0) + num(r?.total));
  }

  return {
    moneyIn,
    moneyOut,
    revenue: roundSum(num(report?.subtotal)),
    vat: roundSum(num(report?.vat)),
    refundNet: roundSum(refunds.reduce((s, r) => s + num(r?.subtotal), 0)),
    refundVat: roundSum(refunds.reduce((s, r) => s + num(r?.vat), 0)),
  };
}

export type ShiftLedgerFigures = ReturnType<typeof shiftLedgerFigures>;

/**
 * WHETHER THERE IS ANYTHING TO POST. An empty drawer opened and closed is a
 * fact about the rota, not about the books — and a ledger entry with no lines
 * fails the balance check for a reason that reads like a bug.
 */
export function shiftHasLedgerEntry(f: ShiftLedgerFigures): boolean {
  return f.revenue !== 0 || f.vat !== 0 || f.refundNet !== 0 || f.refundVat !== 0
    || Object.values(f.moneyIn).some((v) => v !== 0)
    || Object.values(f.moneyOut).some((v) => v !== 0);
}
