// RAISING, ISSUING AND CANCELLING A CREDIT NOTE.
//
// The rules live in `./creditNotes`, pure, so the screen refuses what this
// refuses. This file is the doors: who may open them, what is read, what is
// written, and when the ledger hears about it.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import { invoiceTotals } from "./finance";
import { creditNoteProblem, creditableRemaining, CREDIT_NOTE_STATUSES } from "./creditNotes";
import { autoPost } from "./posting";
import type { FinanceContext } from "./types";
import type { Row } from "@/platform/db/store";

const Notes = repo("creditNotes");
const Invoices = repo("invoices");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const cash = (v: unknown) => {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.cashSection });

/** Every note, with the invoice each belongs to named. */
export async function listCreditNotes(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.cash.view");
  if (denied) return denied;
  return { creditNotes: await Notes.find(scope(ctx)) };
}

/**
 * RAISE ONE, AS A DRAFT.
 *
 * IT POSTS NOTHING YET. A draft is somebody typing — the same rule an invoice
 * follows, and the reason `creditedSoFar` counts only issued notes: an
 * unfinished note must neither move the books nor block a real one.
 */
export async function createCreditNote(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.cash.create");
  if (denied) return denied;

  const invoiceId = str(body?.invoiceId, 60);
  if (!invoiceId) return { error: "invoice" };

  const [invoices, notes] = await Promise.all([
    Invoices.find(scope(ctx)),
    Notes.find(scope(ctx)),
  ]);
  const found = invoices.find((i) => i.id === invoiceId);
  // The totals are DERIVED and the row's own fields are not, so both halves are
  // kept: `creditNoteProblem` reads `total` and `status`, and the copy below
  // reads the reference and the client name off the stored row.
  const invoice = found
    ? { ...found, ...invoiceTotals(found) } as Row & { reference?: string; clientName?: string; total?: number; status?: string }
    : null;

  const amount = cash(body?.amount);
  const problem = creditNoteProblem(invoice, notes, amount);
  if (problem) {
    // THE HEADROOM TRAVELS WITH THE REFUSAL, so the screen can say what IS
    // available rather than only that this was not — the shape `overpayment`
    // already uses on a payment.
    return problem === "over-credit"
      ? { error: problem, remaining: creditableRemaining(invoice!, notes) }
      : { error: problem };
  }

  const note = await Notes.create(scope(ctx), {
    reference: await nextReference(ctx.studio.id, {
      rows: notes as Row[], field: "reference",
      ...seriesSetting("creditNote", (ctx.studio as { numbering?: unknown }).numbering),
    }),
    invoiceId,
    // COPIED AT RAISE, like a contract's tender ref: the note has to read
    // correctly beside the invoice it credits even to somebody who is looking
    // at a list of notes rather than at the invoice.
    invoiceReference: str(invoice?.reference, 60),
    clientName: str(invoice?.clientName, 160),
    amount,
    reason: str(body?.reason, 500),
    status: "Draft",
    issueDate: "",
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { creditNote: note };
}

/**
 * ISSUE IT — the act that makes it real, and the one that posts.
 *
 * THE HEADROOM IS CHECKED AGAIN HERE, not only at raise. Two drafts can each be
 * within the remaining amount when written and not when issued: nothing stops a
 * studio drafting two full-value notes, and it is the second ISSUE that has to
 * refuse. Checking only at create would let both through and take the
 * receivable negative.
 */
export async function issueCreditNote(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const [invoices, notes] = await Promise.all([
    Invoices.find(scope(ctx)),
    Notes.find(scope(ctx)),
  ]);
  const note = notes.find((n) => n.id === id);
  if (!note) return { error: "notfound" };
  if (note.status !== "Draft") return { error: "already-issued", status: note.status };

  const found = invoices.find((i) => i.id === note.invoiceId);
  const invoice = found ? { ...found, ...invoiceTotals(found) } : null;
  // EXCLUDING THIS NOTE from what is already credited: it is still a draft, so
  // `creditedSoFar` ignores it anyway — but saying so here is what makes the
  // re-check readable rather than looking like a double count.
  const problem = creditNoteProblem(invoice, notes, note.amount);
  if (problem) {
    return problem === "over-credit"
      ? { error: problem, remaining: creditableRemaining(invoice!, notes) }
      : { error: problem };
  }

  const updated = await Notes.update(scope(ctx), id, {
    status: "Issued",
    issueDate: new Date().toISOString().slice(0, 10),
  });
  if (!updated) return { error: "notfound" };

  // THE BOOKS HEAR ABOUT IT AT THE MOMENT IT BECOMES REAL, exactly as an
  // invoice posts on Draft → Sent. `autoPost` never fails the document: the
  // note was issued, that happened, and a ledger refusal travels back beside it.
  const posting = await autoPost(ctx, "credit-note", id);
  return { creditNote: updated, posting };
}

/**
 * CANCEL ONE.
 *
 * A DRAFT ONLY. An issued note has posted and a client has been told; undoing
 * it is a second document, not a status change — the same rule that makes a
 * credit note necessary in the first place. Refusing here rather than reversing
 * quietly is the difference between a book somebody can audit and one they
 * cannot.
 */
export async function cancelCreditNote(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const note = (await Notes.find(scope(ctx))).find((n) => n.id === id);
  if (!note) return { error: "notfound" };
  if (note.status === "Issued") return { error: "issued" };
  if (note.status === "Cancelled") return { error: "cancelled" };

  const updated = await Notes.update(scope(ctx), id, { status: "Cancelled" });
  return updated ? { creditNote: updated } : { error: "notfound" };
}

export { CREDIT_NOTE_STATUSES };
