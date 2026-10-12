// NOMPANY'S PAYMENT REQUESTS — what a customer is asked to pay, before they pay
// it (the owner, 12/10/2026: "payment request, seats billed on next renewal").
//
// A REQUEST IS NOT A TAX INVOICE. The tax invoice is still issued when the
// money arrives (lib/data/customerBilling's `issueInvoice`), because in Jordan
// sales tax is owed from the day an invoice is issued, and issuing one on the
// renewal day would have nompany pay 16% on invoices nobody ever paid — and
// then credit-note each of them. A request carries the same lines; the invoice
// issued against it copies them.
//
// TWO KINDS:
//   purchase  the owner chose a plan (from Standard, or a seat count on a
//             package they are not on yet) — the first period, in full;
//   renewal   issued by the daily job on the day a period starts, which is
//             day 0 of the unpaid ladder, with the seats added during the
//             period before as lines of their own.
//
// PURE — the daily job, the owner's billing page and the console read it.

import { roundMoney } from "./money";
import { addDays, addMonths, periodMonths, type BillingPeriod, type SeatCharge } from "./subscription";
import type { InvoiceLine } from "./nompanyInvoice";
import type { Quote } from "./upgradeQuote";

export type PaymentRequest = {
  id: string;
  kind: "purchase" | "renewal";
  issuedOn: string;
  issuedAt: string;
  /** The period it pays for — for a purchase, provisional: the period starts the day it is paid. */
  periodFrom: string;
  periodTo: string;
  cycle: BillingPeriod;
  packageId: string;
  categoryId: string;
  tierId: string;
  seats: number;
  priceCountry: string;
  currency: string;
  lines: InvoiceLine[];
  subtotal: number;
  taxPercent: number;
  tax: number;
  total: number;
  /** The seat charges billed on it (renewal only). */
  chargeIds: string[];
  status: "open" | "paid" | "void";
  /** The payment that settled it. */
  eventId?: string;
};

const dmy = (d: string) => d.split("-").reverse().join("/");

/** The lines a quote prints: one per band, the tier, and any seats added during the last period. */
export function requestLines(quote: Quote, input: { packageName: string; tierName: string; from: string; to: string; charges?: readonly SeatCharge[] }): InvoiceLine[] {
  const span = `${dmy(input.from)} to ${dmy(addDays(input.to, -1))}`;
  const cycle = quote.cycle === "yearly" ? "yearly" : "monthly";
  const lines: InvoiceLine[] = quote.lines.map((l) => ({
    description: `${input.packageName || "Sitta"} — seats ${l.label}, ${cycle}, ${span}`,
    quantity: l.seats,
    unitPrice: roundMoney(l.periodAmount / l.seats, quote.currency),
    amount: l.periodAmount,
  }));
  if (quote.tierAmount > 0) lines.push({ description: `${input.tierName || "Tier"} — ${cycle}, ${span}`, quantity: 1, unitPrice: quote.tierAmount, amount: quote.tierAmount });
  for (const c of input.charges || []) {
    lines.push({
      description: `${c.seatsAfter - c.seatsBefore} seat${c.seatsAfter - c.seatsBefore === 1 ? "" : "s"} added (${c.seatsBefore} → ${c.seatsAfter}), ${dmy(c.from)} to ${dmy(addDays(c.to, -1))}`,
      quantity: 1, unitPrice: c.amount, amount: c.amount,
    });
  }
  return lines;
}

/**
 * ONE REQUEST, FIGURES INCLUDED. The subtotal is the sum of its lines and the
 * tax is on the subtotal, rounded to the currency's own decimals.
 *
 * A CHARGE IN ANOTHER CURRENCY IS LEFT FOR LATER rather than added to a total
 * it is not in — it can only happen if the region's currency changed between
 * the day seats were added and the renewal, and the console sees it still
 * unbilled.
 */
export function buildRequest(input: {
  id: string; kind: PaymentRequest["kind"]; quote: Quote; at: string; today: string; from: string;
  anchorDay?: number; priceCountry: string; packageName: string; tierName: string; charges?: readonly SeatCharge[];
}): PaymentRequest {
  const { quote } = input;
  const charges = (input.charges || []).filter((c) => c.currency === quote.currency && c.amount > 0);
  const to = addMonths(input.from, periodMonths(quote.cycle), input.anchorDay);
  const lines = requestLines(quote, { packageName: input.packageName, tierName: input.tierName, from: input.from, to, charges });
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.amount, 0), quote.currency);
  const tax = roundMoney((subtotal * quote.taxPercent) / 100, quote.currency);
  return {
    id: input.id, kind: input.kind, issuedOn: input.today, issuedAt: input.at,
    periodFrom: input.from, periodTo: to, cycle: quote.cycle,
    packageId: quote.packageId, categoryId: quote.categoryId, tierId: quote.tierId, seats: quote.seats,
    priceCountry: input.priceCountry, currency: quote.currency,
    lines, subtotal, taxPercent: quote.taxPercent, tax, total: roundMoney(subtotal + tax, quote.currency),
    chargeIds: charges.map((c) => c.id), status: "open",
  };
}

/** The request still waiting to be paid, newest first — one at a time is all there should be. */
export const openRequest = (requests: readonly PaymentRequest[] | undefined) =>
  [...(requests || [])].reverse().find((r) => r.status === "open") || null;

/** The renewal request's id: one per period start, so a job that runs twice issues one. */
export const renewalId = (periodFrom: string) => `renewal:${periodFrom}`;

/**
 * WHETHER A RENEWAL IS DUE TODAY, and for which period. Only a paid seat plan
 * renews this way — complimentary studios, Standard's free months, cancelled
 * plans and studios on a package's old fixed size (no seats bought) do not.
 */
export function renewalDue(
  sub: { kind: string; seats: number; paidUntil: string; cancelAt: string },
  requests: readonly PaymentRequest[] | undefined,
  today: string,
): string | null {
  if (sub.kind !== "paid" || !(sub.seats > 0) || sub.cancelAt) return null;
  if (today < sub.paidUntil) return null;
  const id = renewalId(sub.paidUntil);
  return (requests || []).some((r) => r.id === id) ? null : sub.paidUntil;
}
