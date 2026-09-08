import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  listCreditNotes, createCreditNote, issueCreditNote, cancelCreditNote,
} from "@/modules/finance/creditNoteService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CREDIT NOTES — money going back.
//
// NO PERMISSION KEY OF ITS OWN. A credit note is Cash's content, the way a
// variation is a contract's: it answers to `finance.cash.*`, and a second right
// over the same act would be free to disagree with the first about who may
// invoice. Issuing is `edit` rather than a verb of its own because it is a
// transition on a record the holder already owns.
//
// THERE IS NO PUT AND NO DELETE, deliberately. An issued note has posted to the
// ledger and gone to a client; editing or deleting it is the exact thing credit
// notes exist to stop anybody doing to an invoice. A draft is cancelled.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/credit-notes" };

export const GET = route({ ...spec, body: false }, async (f) => {
  const result = await listCreditNotes(f);
  if (refused(result)) return result;
  return result;
});

export const POST = route(spec, async (f) => {
  const result = await createCreditNote(f, f.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, ...result } };
});

// THE TWO TRANSITIONS, named in the body rather than split across two routes.
// `issue` and `cancel` are the only moves a note has, and routing an answer
// through a generic edit is the shape that let a rejected change order approve
// itself (see docs/functionality/variations.md).
export const PATCH = route(spec, async (f) => {
  const id = String(f.body?.id ?? "").trim();
  if (!id) return { error: "missing" };

  const action = String(f.body?.action ?? "");
  if (action === "issue") {
    const result = await issueCreditNote(f, id);
    if (refused(result)) return result;
    return { ok: true, ...result };
  }
  if (action === "cancel") {
    const result = await cancelCreditNote(f, id);
    if (refused(result)) return result;
    return { ok: true, ...result };
  }
  return { error: "action" };
});
