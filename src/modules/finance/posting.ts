// POSTING A DOCUMENT TO THE LEDGER — one door onto the five posting functions.
//
// THEY WERE ALL WRITTEN AND ALL UNREACHABLE. `postInvoice`, `postExpense`,
// `postBill`, `postBillPayment` and `postPayment` have existed complete since
// the ledger was built: each guards its own permission, refuses a document that
// is not in a postable state, refuses when the chart is missing an account it
// needs, and is idempotent through `alreadyPosted`. Nothing called any of them,
// so raising an invoice never touched the books.
//
// WHY A DISPATCHER RATHER THAN FIVE ROUTES. The five differ only in which
// document they read and which accounts they touch; the decision a caller makes
// is "post this thing", and five endpoints would be five places to forget one.
import {
  postInvoice, postExpense, postBill, postBillPayment, postPayment, postCreditNote,
  postPayroll, ENTRY_SOURCE_KINDS,
} from "./ledger";
import type { FinanceContext } from "./types";
import type { PostOptions } from "./ledger";

/** What can be posted. A closed set: the dispatcher must never take a name it
 *  has not been taught, or a caller chooses which code path runs. */
// DERIVED FROM THE ENTRY'S OWN SOURCE KINDS, minus `manual` — which is the one
// source with no document behind it, so it is the one thing that cannot be
// "posted" from anywhere. Two hand-written lists is what let `credit-note` be
// dispatchable here and unrecognised by `postEntry`, which stored it as manual
// and made `alreadyPosted` blind to it: the same note would post again on every
// attempt. One list, and a new kind is added once.
export const POSTABLE = ENTRY_SOURCE_KINDS.filter((k) => k !== "manual");
export type Postable = Exclude<(typeof ENTRY_SOURCE_KINDS)[number], "manual">;

export const isPostable = (v: unknown): v is Postable =>
  (POSTABLE as readonly string[]).includes(String(v ?? ""));

/**
 * POST ONE DOCUMENT, or say why not.
 *
 * THE PAYMENT KINDS NEED TWO IDS and that is not an inconsistency to smooth
 * over. A payment is not a document in its own right — it hangs off the invoice
 * or the bill it settles, and posting it needs both: the parent to find it on,
 * and its own id to know which of several it is. Collapsing that to one id would
 * mean guessing, and a guess here posts money to the wrong account.
 */
export async function postDocument(
  ctx: FinanceContext,
  kind: unknown,
  id: unknown,
  paymentId?: unknown,
  options: PostOptions = {},
) {
  if (!isPostable(kind)) return { error: "kind" };
  const documentId = String(id ?? "").trim();
  if (!documentId) return { error: "missing" };

  const payment = String(paymentId ?? "").trim();
  if ((kind === "payment" || kind === "bill-payment") && !payment) {
    return { error: "payment" };
  }

  switch (kind) {
    case "invoice": return postInvoice(ctx, documentId, options);
    case "credit-note": return postCreditNote(ctx, documentId, options);
    case "expense": return postExpense(ctx, documentId, options);
    case "bill": return postBill(ctx, documentId, options);
    case "bill-payment": return postBillPayment(ctx, documentId, payment, options);
    case "payment": return postPayment(ctx, documentId, payment, options);
    // PAYROLL IS THE SEVENTH, and adding it to `ENTRY_SOURCE_KINDS` is what
    // made it dispatchable — `POSTABLE` derives from that list, so the kind
    // arrived here the moment the ledger learned it. That is the one-list
    // design working: a new kind is added once and both halves find out.
    case "payroll": return postPayroll(ctx, documentId, options);
    default: return { error: "kind" };
  }
}

/**
 * POST A DOCUMENT AS A CONSEQUENCE OF THE ACT THAT CREATED IT.
 *
 * THE AUTHORITY IS THE DOCUMENT'S, NOT THE LEDGER'S. Somebody issuing an invoice
 * has already been authorised to do the thing that makes the entry true; the
 * accounts it touches were chosen by `postInvoice` and not by them. Requiring
 * `finance.ledger.post` here would leave the books complete only for studios
 * whose invoice clerks happen to hold ledger rights.
 *
 * IT NEVER FAILS THE DOCUMENT. The invoice was issued; that happened. If the
 * ledger cannot take it — the chart is missing an account, the entry is already
 * posted — the refusal is RETURNED for the caller to surface, not thrown away
 * and not allowed to undo a write that already succeeded. A studio finding out
 * later that its books are short an entry is bad; a studio unable to invoice
 * because its chart of accounts is incomplete is worse.
 *
 * SO THE CALLER GETS BOTH ANSWERS and decides what to say. Nothing here logs,
 * because a silent log is how "the books are complete" becomes untrue quietly.
 */
export async function autoPost(
  ctx: FinanceContext,
  kind: Postable,
  id: string,
  paymentId?: string,
): Promise<{ posted: true; entryId: string } | { posted: false; reason: string }> {
  const result = await postDocument(ctx, kind, id, paymentId, { system: true });
  const failed = result as { error?: unknown };
  if (failed?.error) return { posted: false, reason: String(failed.error) };
  const ok = result as { entry?: { id?: unknown } };
  return { posted: true, entryId: String(ok?.entry?.id ?? "") };
}
