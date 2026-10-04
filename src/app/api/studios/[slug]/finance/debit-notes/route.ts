import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  listDebitNotes, createDebitNote, issueDebitNote, cancelDebitNote,
} from "@/modules/finance/debitNoteService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DEBIT NOTES — money added to an invoice after it was issued (04/10/2026), the
// mirror of ../credit-notes, and for every country rather than Saudi Arabia's.
//
// NO PERMISSION KEY OF ITS OWN, for the credit note's reason: a debit note is
// the invoice's content and answers to `finance.receivables.*`, checked in
// ./debitNoteService. NO PUT AND NO DELETE: an issued note has posted and gone
// to a client; a draft is cancelled.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/debit-notes" };

export const GET = route({ ...spec, body: false }, async (f) => {
  const result = await listDebitNotes(f);
  if (refused(result)) return result;
  return result;
});

export const POST = route(spec, async (f) => {
  const result = await createDebitNote(f, f.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, ...result } };
});

// THE TWO TRANSITIONS, named in the body rather than guessed from its shape.
export const PATCH = route(spec, async (f) => {
  const id = String(f.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const action = String(f.body?.action ?? "");
  if (action === "issue") {
    const result = await issueDebitNote(f, id);
    if (refused(result)) return result;
    return { ok: true, ...result };
  }
  if (action === "cancel") {
    const result = await cancelDebitNote(f, id);
    if (refused(result)) return result;
    return { ok: true, ...result };
  }
  return { error: "action" };
});
