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
  postInvoice, postExpense, postBill, postBillPayment, postPayment,
} from "./ledger";
import type { FinanceContext } from "./types";

/** What can be posted. A closed set: the dispatcher must never take a name it
 *  has not been taught, or a caller chooses which code path runs. */
export const POSTABLE = ["invoice", "expense", "bill", "bill-payment", "payment"] as const;
export type Postable = (typeof POSTABLE)[number];

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
) {
  if (!isPostable(kind)) return { error: "kind" };
  const documentId = String(id ?? "").trim();
  if (!documentId) return { error: "missing" };

  const payment = String(paymentId ?? "").trim();
  if ((kind === "payment" || kind === "bill-payment") && !payment) {
    return { error: "payment" };
  }

  switch (kind) {
    case "invoice": return postInvoice(ctx, documentId);
    case "expense": return postExpense(ctx, documentId);
    case "bill": return postBill(ctx, documentId);
    case "bill-payment": return postBillPayment(ctx, documentId, payment);
    case "payment": return postPayment(ctx, documentId, payment);
    default: return { error: "kind" };
  }
}
