// RAISING, ISSUING AND CANCELLING A DEBIT NOTE — the mirror of
// ./creditNoteService. The rules live in `./debitNotes`, pure, so the screen
// refuses what this refuses.
//
// The same three doors and the same rights as a credit note: a debit note is
// receivables work (`finance.receivables.create` to raise, `.edit` to issue or
// cancel), and issuing is the act that posts — and, where the studio's country
// has nompany submit (Saudi Arabia), the act that reaches the authority: a note
// on a business invoice is cleared before it is issued, any other is reported.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import { studioEInvoiceRules } from "@/shared/compliance/rules";
import { roundMoney } from "@/shared/money";
import type { Row } from "@/platform/db/store";
import { debitNoteProblem, DEBIT_NOTE_STATUSES } from "./debitNotes";
import { autoPost } from "./posting";
import type { FinanceContext } from "./types";

const Notes = repo("debitNotes");
const Invoices = repo("invoices");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.cashSection });
const currencyOf = (ctx: FinanceContext, invoice: Row | undefined) =>
  (invoice as { currency?: unknown } | undefined)?.currency || ctx.studio.currency;

/** Every debit note. */
export async function listDebitNotes(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.receivables.view");
  if (denied) return denied;
  return { debitNotes: await Notes.find(scope(ctx)) };
}

/**
 * RAISE ONE, AS A DRAFT. It posts nothing and owes nothing yet — a draft is
 * somebody typing, the rule an invoice and a credit note follow.
 */
export async function createDebitNote(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.receivables.create");
  if (denied) return denied;
  const invoiceId = str(body?.invoiceId, 60);
  if (!invoiceId) return { error: "invoice" };

  const [invoices, notes] = await Promise.all([Invoices.find(scope(ctx)), Notes.find(scope(ctx))]);
  const invoice = invoices.find((i) => i.id === invoiceId) as (Row & { reference?: string; clientName?: string; status?: string }) | undefined;
  const currency = currencyOf(ctx, invoice);
  const amount = roundMoney(body?.amount, currency);
  const reason = str(body?.reason, 500);
  const problem = debitNoteProblem(invoice ? { ...invoice, currency } : null, amount, reason);
  if (problem) return { error: problem };

  const note = await Notes.create(scope(ctx), {
    reference: await nextReference(ctx.studio.id, {
      rows: notes as Row[], field: "reference",
      ...seriesSetting("debitNote", (ctx.studio as { numbering?: unknown }).numbering),
    }),
    invoiceId,
    // COPIED AT RAISE, like a credit note's: the note reads correctly beside its
    // invoice in a list of notes. `clientName` is sealed wherever it lands.
    invoiceReference: str(invoice?.reference, 60),
    clientName: str(invoice?.clientName, 160),
    amount,
    reason,
    status: "Draft",
    issueDate: "",
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { debitNote: note };
}

/**
 * ISSUE IT — the act that makes it owed, and the one that posts.
 *
 * THE INVOICE IS CHECKED AGAIN: it may have been cancelled since the draft was
 * raised, and a charge added to a cancelled invoice is a charge to nobody.
 */
export async function issueDebitNote(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;

  const [invoices, notes] = await Promise.all([Invoices.find(scope(ctx)), Notes.find(scope(ctx))]);
  const note = notes.find((n) => n.id === id) as (Row & { status?: string; invoiceId?: string; amount?: unknown; reason?: unknown }) | undefined;
  if (!note) return { error: "notfound" };
  if (note.status !== "Draft") return { error: "already-issued", status: note.status };
  const invoice = invoices.find((i) => i.id === note.invoiceId);
  const problem = debitNoteProblem(invoice ? { ...invoice, currency: currencyOf(ctx, invoice) } : null, note.amount, note.reason);
  if (problem) return { error: problem };

  // WHERE NOMPANY SUBMITS (Saudi Arabia): a note on a business invoice is
  // CLEARED before it is issued, and a refusal stops the issue — exactly as
  // the invoice it corrects (./einvoiceService). Elsewhere nothing happens.
  const today = new Date().toISOString().slice(0, 10);
  const svc = studioEInvoiceRules(ctx.studio) ? await import("./einvoiceService") : null;
  const cleared = svc ? await svc.clearBeforeIssue(ctx, id, { status: "Sent", issueDate: today }, "debitNote") : null;
  if (cleared && "error" in cleared) return cleared;

  const updated = await Notes.update(scope(ctx), id, { status: "Issued", issueDate: today });
  if (!updated) return { error: "notfound" };

  // THE BOOKS HEAR ABOUT IT AT THE MOMENT IT BECOMES OWED. `autoPost` never
  // fails the document; a ledger refusal travels back beside it.
  const posting = await autoPost(ctx, "debit-note", id);
  // AND A CONSUMER NOTE IS REPORTED NOW where the studio reports as it goes —
  // best-effort, the nightly batch behind it.
  const einvoice = svc && !cleared ? await svc.submitOnIssue(ctx, id, "debitNote") : null;
  return { debitNote: updated, posting, ...(cleared || einvoice ? { einvoiceSubmission: cleared ? { outcome: "accepted", message: "" } : einvoice } : {}) };
}

/** CANCEL ONE — a draft only. An issued note has posted and a client has been told. */
export async function cancelDebitNote(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  const note = (await Notes.find(scope(ctx))).find((n) => n.id === id) as (Row & { status?: string }) | undefined;
  if (!note) return { error: "notfound" };
  if (note.status === "Issued") return { error: "issued" };
  if (note.status === "Cancelled") return { error: "cancelled" };
  const updated = await Notes.update(scope(ctx), id, { status: "Cancelled" });
  return updated ? { debitNote: updated } : { error: "notfound" };
}

export { DEBIT_NOTE_STATUSES };
