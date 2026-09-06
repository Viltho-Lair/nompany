import { route, refused } from "@/platform/http/route";
import { tenderingContext, tendersView, createTender, editTender, removeTender } from "@/modules/tendering/tenders";
import { approveBid } from "@/modules/tendering/bid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: tenderingContext, body: true, name: "tendering-register" };

// PERMISSION IS ENFORCED IN THE SERVICE, not here — every function below calls
// requirePermission before touching a row. A route can be added and forgotten;
// the function that does the work cannot be reached around. This layer decides
// HTTP shape and nothing else.
// AND THE BODY IS NOT COMPOSED HERE ANY MORE. `tendersView` owns it, because the
// studio page renders the same payload on the server and two copies of it would
// be free to disagree — with only this one pinned by a golden. See the note on
// tendersView in modules/tendering/tenders.ts.
//
// The response body is UNCHANGED by that move, which is the whole point: no
// golden was re-recorded for it, and if one had moved the refactor was wrong.
export const GET = route({ ...spec, body: false }, tendersView);

export const POST = route(spec, async (tendering) => {
  const result = await createTender(tendering, tendering.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, tender: result.tender } };
});

export const PUT = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const id = String(tendering.body.id);

  // SIGNING IS ITS OWN VERB, not a field on the edit — the same decision the
  // pack made about superseding, and here it is load-bearing rather than tidy.
  // `editTender` opens on `tendering.tenders.edit`; a signature must NOT, or
  // whoever priced the bid could sign it by sending one more key.
  if (tendering.body.approve) {
    const signed = await approveBid(tendering, id);
    if (refused(signed)) return signed;
    return { ok: true, tender: signed.tender, approved: signed.approved, signed: signed.signed, required: signed.required };
  }

  const result = await editTender(tendering, id, tendering.body);
  if (refused(result)) return result;
  return { ok: true, tender: result.tender };
});

// DELETE IS FOR A MISTAKE, not for a decision — and the service, not this
// route, is what refuses one whose bid has already gone in. Declining a tender
// after submission is `Withdrawn`, which is a different claim from never having
// been there at all.
export const DELETE = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const result = await removeTender(tendering, String(tendering.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
