// DEBIT NOTES — money added to an invoice after it was issued, and the rules
// about when one may be raised. PURE, like ./creditNotes, which it mirrors.
//
// WHY THEY EXIST (04/10/2026, the owner: "Yes, build them"). An issued invoice
// is never edited (./creditNotes says why). When it UNDERCHARGED — a price
// agreed higher, a quantity short-counted, a charge left off — the correction
// is a second document that adds to the first: a debit note. Without one a
// studio raised a second invoice, which a client reads as a second sale and a
// tax authority files as one.
//
// FOR EVERY COUNTRY. A debit note is ordinary accounting, not a Saudi thing:
// it posts, it is owed, and it is in the VAT return wherever a studio is. What
// is country-specific is only whether it ALSO reaches a tax authority, and that
// is the e-invoicing adapter's business (Saudi Arabia's today, ./zatca).
//
// THE AMOUNT IS GROSS, in the invoice's currency, taxed at the INVOICE's rate —
// the same convention as a credit note, so the ledger, the tax return and the
// e-invoice split it the one way (`splitGross`).

import { roundMoney } from "@/shared/money";

export const DEBIT_NOTE_STATUSES = ["Draft", "Issued", "Cancelled"] as const;

export type DebitNoteLike = {
  id?: string;
  invoiceId?: string;
  status?: string;
  amount?: unknown;
};

export type InvoiceLike = {
  id?: string;
  status?: string;
  currency?: unknown;
};

const round = (n: unknown, currency: unknown) => roundMoney(n, currency);

/**
 * HOW MUCH HAS BEEN ADDED TO THIS INVOICE. Only ISSUED notes count: a draft is
 * somebody typing, and a cancelled one added nothing.
 */
export function debitedSoFar(notes: readonly DebitNoteLike[], invoiceId: string, currency?: unknown): number {
  return round((notes || [])
    .filter((n) => n.invoiceId === invoiceId && n.status === "Issued")
    .reduce((sum, n) => sum + (Number(n.amount) || 0), 0), currency);
}

/**
 * WHY THIS DEBIT NOTE CANNOT BE RAISED, or "".
 *
 * NO CEILING, unlike a credit note: nothing caps what an invoice can be
 * corrected UP by, and a studio that undercharged by more than it charged is
 * still owed it. What a debit note must have is a REASON — it charges a client
 * more after they were invoiced, and one that does not say why is the one they
 * dispute. That holds in every country; Saudi Arabia's e-invoice happens to
 * require it too (BR-KSA-17).
 */
export function debitNoteProblem(invoice: InvoiceLike | null | undefined, amount: unknown, reason: unknown): string {
  if (!invoice) return "notfound";
  // A DRAFT INVOICE IS EDITED, NOT CORRECTED by a second document.
  if (invoice.status === "Draft") return "not-issued";
  // A CANCELLED INVOICE charged nobody anything to add to.
  if (invoice.status === "Cancelled") return "cancelled";
  const value = round(Number(amount), invoice.currency);
  if (!Number.isFinite(value) || value <= 0) return "amount";
  if (!String(reason ?? "").trim()) return "reason-required";
  return "";
}
