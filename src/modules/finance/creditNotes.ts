// CREDIT NOTES — money going back, and the rules about how much may.
//
// AN ISSUED INVOICE IS NOT EDITABLE AND MUST NOT BE. It has gone to a client,
// it has posted to the ledger, and a client holding INV-0007 for 1,200 must
// keep holding an INV-0007 for 1,200. So when the amount was wrong, or goods
// came back, or the job was part-cancelled, the answer is a SECOND document
// that reverses part of the first — never an edit to the first.
//
// WITHOUT ONE, a studio's only options were to cancel the whole invoice (wrong
// when nine tenths of it was right) or to edit it (wrong always). `finance.ts`
// refuses an edit to a Sent invoice by name; this is what that refusal has been
// pointing at.
//
// PURE. No imports, no store, no clock — the caller hands in the invoice, the
// credit notes already against it, and the amount. So the screen refuses
// exactly what the server refuses, and every rule below is asserted without a
// database.

export const CREDIT_NOTE_STATUSES = ["Draft", "Issued", "Cancelled"] as const;

export type CreditNoteLike = {
  id?: string;
  invoiceId?: string;
  status?: string;
  amount?: unknown;
};

export type InvoiceLike = {
  id?: string;
  status?: string;
  /** From `invoiceTotals` — what the invoice is for, gross. */
  total?: unknown;
};

const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * HOW MUCH OF THIS INVOICE IS ALREADY CREDITED.
 *
 * A CANCELLED CREDIT NOTE CREDITS NOTHING, and a DRAFT one credits nothing
 * either — a draft is somebody typing, and counting it would let an unfinished
 * note block a real one. Only what has actually been issued reduces what is
 * left to credit.
 */
export function creditedSoFar(notes: readonly CreditNoteLike[], invoiceId: string): number {
  return round((notes || [])
    .filter((n) => n.invoiceId === invoiceId && n.status === "Issued")
    .reduce((sum, n) => sum + (Number(n.amount) || 0), 0));
}

/** What may still be credited against this invoice. Never below nought. */
export function creditableRemaining(
  invoice: InvoiceLike,
  notes: readonly CreditNoteLike[],
): number {
  const total = Number(invoice?.total) || 0;
  return round(Math.max(0, total - creditedSoFar(notes, String(invoice?.id || ""))));
}

/**
 * WHY THIS CREDIT NOTE CANNOT BE RAISED, or an empty string.
 *
 * A single reason rather than a list: unlike a settings form, there is one
 * amount and one invoice here, so the first thing wrong with it is the thing
 * to say.
 */
export function creditNoteProblem(
  invoice: InvoiceLike | null | undefined,
  notes: readonly CreditNoteLike[],
  amount: unknown,
): string {
  if (!invoice) return "notfound";

  // A DRAFT INVOICE IS EDITED, NOT CREDITED. Nothing has gone to the client and
  // nothing has posted; a credit note against it would be two documents saying
  // what one correction would. This is the rule that keeps credit notes rare
  // enough to mean something.
  if (invoice.status === "Draft") return "not-issued";

  // A CANCELLED INVOICE IS ALREADY WHOLLY REVERSED. Crediting it would take the
  // receivable negative — the studio would owe the client money it never
  // charged them.
  if (invoice.status === "Cancelled") return "cancelled";

  const value = round(Number(amount));
  if (!Number.isFinite(value) || value <= 0) return "amount";

  // NOT MORE THAN IS LEFT. Two notes for two thirds each would credit more than
  // the invoice was ever for, and the second one is the one to refuse — which
  // is why this counts what is already ISSUED rather than looking at the
  // invoice alone.
  const remaining = creditableRemaining(invoice, notes);
  if (value > remaining) return "over-credit";

  return "";
}

/**
 * WHAT A CREDIT NOTE DOES TO AN INVOICE, for the screen and the reader.
 *
 * IT DOES NOT TOUCH THE INVOICE'S OWN TOTAL, deliberately: the invoice is what
 * was charged and stays what was charged. This is the NET view — what the
 * client actually owes once the credits are counted — and it is derived on
 * every read rather than written back, for the reason `projectBilling` gives
 * about stored flags: a total and the notes behind it part company the first
 * time one is cancelled.
 */
export function netOfCredits(
  invoice: InvoiceLike & { paid?: unknown },
  notes: readonly CreditNoteLike[],
) {
  const total = round(Number(invoice?.total) || 0);
  const credited = creditedSoFar(notes, String(invoice?.id || ""));
  const paid = round(Number(invoice?.paid) || 0);
  const net = round(Math.max(0, total - credited));
  return {
    total,
    credited,
    /** What was charged, less what has been credited back. */
    net,
    paid,
    // OUTSTANDING IS AGAINST THE NET, not the original. An invoice for 1,200
    // with a 200 credit and 1,000 paid is SETTLED — reporting 200 still due
    // would send somebody to chase money the studio has already given back.
    outstanding: round(Math.max(0, net - paid)),
    fullyCredited: credited > 0 && credited >= total,
  };
}
