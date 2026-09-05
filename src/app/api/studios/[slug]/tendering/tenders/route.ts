import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { tenderingContext, listTenders, createTender, editTender, removeTender } from "@/modules/tendering/tenders";
import { approveBid } from "@/modules/tendering/bid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: tenderingContext, body: true, name: "tendering-register" };

// PERMISSION IS ENFORCED IN THE SERVICE, not here — every function below calls
// requirePermission before touching a row. A route can be added and forgotten;
// the function that does the work cannot be reached around. This layer decides
// HTTP shape and nothing else.
export const GET = route({ ...spec, body: false }, async (tendering) => {
  const result = await listTenders(tendering);
  if (refused(result)) return result;
  // THE RIGHTS TRAVEL WITH THE LIST, so the register draws a control only where
  // the service would accept the request behind it.
  return {
    ok: true,
    // THE CLOCK TRAVELS WITH THE ANSWER. Every "days left" on the register is
    // measured from this one instant and the screen never reads its own — so
    // leaving it behind here left `nowMs` at zero and made every deadline read
    // as missed by twenty thousand days. The list is unusable without it, which
    // is why it is asserted rather than only pinned in a golden.
    asOf: result.asOf,
    tenders: result.tenders,
    canCreate: !requirePermission(tendering.access, "tendering.tenders.create"),
    canEdit: !requirePermission(tendering.access, "tendering.tenders.edit"),
    canDelete: !requirePermission(tendering.access, "tendering.tenders.delete"),
  };
});

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
