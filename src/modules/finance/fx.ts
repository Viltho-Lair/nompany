// A FOREIGN-CURRENCY BILL IN A STUDIO-CURRENCY BOOK.
//
// THE LEDGER IS KEPT IN ONE CURRENCY, THE STUDIO'S, and a bill from a supplier
// in dollars posted its dollar figures straight into it — so a book in dinars
// added 1,000 dollars to 700 dinars and called the sum 1,700 of something. The
// trial balance still balanced, which is exactly why nobody could see it: every
// entry balanced in its own wrong unit.
//
// THE RATE IS FROZEN ON THE DOCUMENT, never looked up again. The day a bill is
// booked fixes what the studio owes in its own money; the day each payment
// leaves fixes what that payment cost. The two differ, and the difference is a
// realised exchange gain or loss — a real figure on the P&L rather than a crumb
// left on the payable.
//
// PURE. No store, no clock. Its imports are shared/money and shared/currencies,
// both pure.

import { roundMoney, toMinor, fromMinor } from "@/shared/money";
import { crossRate } from "@/shared/currencies";

const code = (v: unknown) => String(v ?? "").trim().toUpperCase().slice(0, 8);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Is this document in a currency other than the book's? An unnamed currency is the book's. */
export function isForeign(currency: unknown, studioCurrency: unknown): boolean {
  const c = code(currency);
  return !!c && c !== code(studioCurrency);
}

/**
 * A RATE SOMEBODY TYPED, or null when it is not one. Units of the studio's
 * currency for ONE unit of the document's — the way a bank advice and a
 * supplier's invoice both print it.
 *
 * BOUNDED, because a rate of nought books nothing and a rate of a million is a
 * typo of an amount into the rate box.
 */
export function cleanRate(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? n : null;
}

/**
 * THE RATE TO USE: the one on the document if it carries one, otherwise the
 * day's market table. Null when neither can answer — the caller refuses rather
 * than guessing, because a guessed rate books a wrong liability that looks
 * exactly like a right one.
 */
export function rateFor(
  stored: unknown,
  rates: Record<string, number> | null | undefined,
  from: unknown,
  studioCurrency: unknown,
): number | null {
  if (!isForeign(from, studioCurrency)) return 1;
  return cleanRate(stored) ?? crossRate(rates, code(from), code(studioCurrency));
}

/**
 * A BILL'S NET AND TAX IN THE BOOK'S CURRENCY. Each side converted and rounded
 * on its own, and the total taken as their sum, so the entry balances to the
 * minor unit by construction rather than by a rounding that happens to agree.
 */
export function inBase(
  totals: { subtotal: number; vat: number },
  rate: number,
  studioCurrency: unknown,
): { net: number; vat: number; total: number } {
  const net = roundMoney(num(totals.subtotal) * rate, studioCurrency);
  const vat = roundMoney(num(totals.vat) * rate, studioCurrency);
  return { net, vat, total: fromMinor(toMinor(net, studioCurrency) + toMinor(vat, studioCurrency), studioCurrency) };
}

export type SettledPayment = {
  /** Accounts Payable cleared, at the rate the BILL was booked at. */
  payable: number;
  /** What left the bank, at the rate on the day of THIS payment. */
  bank: number;
  /** bank − payable. Positive costs the studio (a loss); negative is a gain. */
  difference: number;
};

/**
 * WHAT ONE PAYMENT OF A FOREIGN BILL DOES TO THE BOOK.
 *
 * THE PAYABLE IS CLEARED AT THE BILL'S RATE, NOT THE PAYMENT'S. It was booked at
 * one rate and has to leave at the same one, or it never reaches nought: a bill
 * booked at 0.709 and paid at 0.712 would leave three fils of every dollar on
 * Accounts Payable for ever.
 *
 * THE LAST PAYMENT CLEARS WHAT IS LEFT, not its own share. Each part-payment's
 * share is rounded, and rounded shares need not add back to the rounded whole;
 * the payment that settles the bill takes the remainder, so a settled bill
 * leaves exactly nought on the payable.
 *
 * Null when the payment is not on the bill or either rate is missing.
 */
export function settlePayment(
  bill: { total: number; payments?: readonly { id: string; amount: number; rate?: unknown }[] },
  paymentId: string,
  bookedTotal: number,
  bookRate: number,
  studioCurrency: unknown,
): SettledPayment | null {
  const payments = bill.payments || [];
  const at = payments.findIndex((p) => p.id === paymentId);
  if (at < 0) return null;
  const payRate = cleanRate(payments[at].rate);
  if (!payRate || !(bookRate > 0)) return null;

  const minor = (n: number) => toMinor(n, studioCurrency);
  const share = (amount: number) => minor(num(amount) * bookRate);
  const paidThrough = payments.slice(0, at + 1).reduce((t, p) => t + num(p.amount), 0);
  // In the BILL's currency, where both figures are stored exact to its minor
  // unit; the epsilon only absorbs the float crumbs of adding them up.
  const settles = num(bill.total) - paidThrough < 1e-9;
  const before = payments.slice(0, at).reduce((t, p) => t + share(p.amount), 0);
  const payable = settles ? minor(bookedTotal) - before : share(payments[at].amount);
  const bank = minor(num(payments[at].amount) * payRate);
  return {
    payable: fromMinor(payable, studioCurrency),
    bank: fromMinor(bank, studioCurrency),
    difference: fromMinor(bank - payable, studioCurrency),
  };
}
