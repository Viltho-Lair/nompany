// NOMPANY'S OWN INVOICES AND CREDIT NOTES — what nompany issues its customers
// for their packages and tiers. Not a studio's Finance: a studio's invoices to
// ITS clients are modules/finance. Pure: numbers, no store, no clock.
//
// ISSUED FROM /super WHEN A PAYMENT IS CONFIRMED (the owner, 26/09/2026): the
// console records the transfer and, in the same act, issues the invoice with
// nompany's details from /super → Payments. A refund issues a CREDIT NOTE
// against the invoice it refunds; the invoice itself is never edited.
//
// JORDANIAN TAX, THE CUSTOMER'S CURRENCY (agreed 23/09/2026). nompany is in
// Jordan, so its invoices carry Jordan's sales tax, and they are issued in the
// currency the customer paid in, not JOD. Rounded to that currency's own
// decimals (shared/money), so a dinar invoice keeps three and a dollar one two.
//
// THE AMOUNT CUSTOMERS PAY IS THE TOTAL, TAX INCLUDED, and the invoice splits
// it: the quote locked on the upgrade request already says how, and a payment
// recorded without one is split by the tax rate, the tax being the remainder so
// that subtotal + tax is exactly what arrived.

import { roundMoney } from "./money";

/** UN/ECE 4461 — how it was paid. 42 is a transfer to a bank account; 48 a card. */
export const PAYMENT_MEANS = Object.freeze({ bankTransfer: "42", card: "48" });

export type InvoiceParty = {
  name: string;
  address: string;
  country: string;
  taxNumber: string;
  email: string;
  phone?: string;
};

export type InvoiceLine = { description: string; quantity: number; unitPrice: number; amount: number };

export type NompanyInvoice = {
  number: string;
  kind: "invoice" | "credit-note";
  /** The day it was issued (YYYY-MM-DD, Amman). */
  issuedOn: string;
  issuedAt: string;
  issuedBy: string;
  studioId: string;
  currency: string;
  lines: InvoiceLine[];
  subtotal: number;
  taxPercent: number;
  tax: number;
  total: number;
  paymentMeans: string;
  /** The day the money arrived (invoice) or left (credit note). */
  paidOn: string;
  /** Frozen at issue: nompany's details as they were that day. */
  seller: InvoiceParty;
  /** Frozen at issue and ENCRYPTED (the customer's details) — JSON of an InvoiceParty. */
  buyerSealed: string;
  /** What it answers: the claim, the billing event, and for a credit note the invoice it credits. */
  claimId?: string;
  eventId?: string;
  creditsInvoice?: string;
  reason?: string;
};

/** A total, tax included, split into what was sold and the tax on it. */
export function splitTotal(total: number, taxPercent: number, currency: string) {
  const t = roundMoney(total, currency);
  const pct = Number.isFinite(taxPercent) && taxPercent > 0 ? taxPercent : 0;
  const subtotal = roundMoney(t / (1 + pct / 100), currency);
  return { subtotal, tax: roundMoney(t - subtotal, currency), total: t };
}

/**
 * THE NUMBER ON THE PAPER — one sequence per kind per year, moved only forward
 * (invariant 10): NMP-2026-00001, and NMP-CN-2026-00001 for credit notes.
 */
export function documentNumber(prefix: string, kind: NompanyInvoice["kind"], year: number, n: number): string {
  const p = (String(prefix || "NMP").toUpperCase().replace(/[^A-Z0-9]/g, "") || "NMP").slice(0, 8);
  return `${p}-${kind === "credit-note" ? "CN-" : ""}${year}-${String(n).padStart(5, "0")}`;
}

/** Why nompany's own details are not yet enough to issue a document on, or "". */
export function sellerProblem(seller: Partial<InvoiceParty> | null | undefined): "" | "seller-incomplete" {
  return seller?.name?.trim() && seller?.taxNumber?.trim() && seller?.address?.trim() ? "" : "seller-incomplete";
}

/**
 * AN INVOICE'S FIGURES FOR ONE PAYMENT. With the plan locked on a claim, the
 * lines are that plan's; without one, a single line for the period paid.
 * Either way the total is what ARRIVED — if nompany recorded a different amount
 * from the quote (a bank fee, a partial payment), the paper says what was paid.
 */
export function invoiceFigures(input: {
  total: number; currency: string; taxPercent: number; description: string; periods: number;
}) {
  const periods = Math.max(1, Math.trunc(Number(input.periods) || 1));
  const { subtotal, tax, total } = splitTotal(input.total, input.taxPercent, input.currency);
  const lines: InvoiceLine[] = [{
    description: input.description,
    quantity: periods,
    unitPrice: roundMoney(subtotal / periods, input.currency),
    amount: subtotal,
  }];
  return { lines, subtotal, tax, total, taxPercent: input.taxPercent > 0 ? input.taxPercent : 0 };
}

/**
 * A CREDIT NOTE'S FIGURES — the amount refunded, split at the INVOICE's tax
 * rate (the tax being returned is the tax that was charged), never more than
 * the invoice minus what was already credited against it.
 */
export function creditFigures(invoice: Pick<NompanyInvoice, "total" | "taxPercent" | "currency" | "number">, amount: number, alreadyCredited: number) {
  const left = roundMoney(invoice.total - alreadyCredited, invoice.currency);
  const want = roundMoney(amount, invoice.currency);
  if (!(want > 0)) return { error: "bad-amount" as const };
  if (want > left) return { error: "over-refund" as const };
  const split = splitTotal(want, invoice.taxPercent, invoice.currency);
  return {
    lines: [{ description: `Refund against ${invoice.number}`, quantity: 1, unitPrice: split.subtotal, amount: split.subtotal }],
    ...split,
    taxPercent: invoice.taxPercent,
  };
}

/** What has been credited against one invoice so far. */
export const creditedAgainst = (docs: readonly NompanyInvoice[], invoiceNo: string) =>
  docs.filter((d) => d.kind === "credit-note" && d.creditsInvoice === invoiceNo).reduce((s, d) => s + d.total, 0);
