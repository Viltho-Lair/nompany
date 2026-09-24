import { route, refused } from "@/platform/http/route";
import { technicalContext, convertRfq, createQuotation, updateQuotation, closeQuotation, assignQuotation, isLockOnly } from "@/modules/technical/technical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every quotation write but one passes the manage door below, then the exact
// right in its service (crmSales.quotations.create / .edit).
//
// THIS ROUTE IS WHY THE STATUS TABLE EXISTS. Before the wrapper it wrote three
// separate error ladders and none of them agreed with the rest of the product:
// POST sent everything except `already`, `duplicate` and `notfound` as 400, so a
// permission refusal arrived telling the caller they had sent nonsense; PUT did
// the same; and DELETE mapped EVERY error to 404, so being refused for lack of
// permission was indistinguishable from the quotation not existing — the one
// answer that tells a client to stop asking rather than to ask someone for
// access.
//
// All three now map through src/platform/http/httpStatus.js, so `forbidden` is 403,
// `locked` is 409 and `notfound` is 404 here exactly as everywhere else.
const spec = { auth: "studio", context: technicalContext, body: true, name: "crm-sales-quotations" };

// The one check the services cannot make for themselves: they guard the WRITE,
// this guards the door. Kept as it was rather than folded into the wrapper —
// permission lives next to the thing it protects.
const manageable = (tech: { canManage: boolean }) => (tech.canManage ? null : { error: "read-only" });

// Two ways a quotation is born, distinguished by whether an rfqId is given:
// converting an RFQ (the hand-back to Sales), or creating one straight from the
// Quotations screen, which is Internal and needs a sequence, client, title,
// industry, deadline and description.
export const POST = route(spec, async (ctx) => {
  // CONVERTING IS ITS OWN RIGHT (engineeringDocs.rfq.convert), asked by
  // convertRfq — so it skips this door, which a holder of Convert alone would
  // otherwise fail for want of a create, edit or delete somewhere (24/09/2026).
  const refusal = ctx.body.rfqId ? null : manageable(ctx);
  if (refusal) return refusal;

  const result = ctx.body.rfqId ? await convertRfq(ctx, ctx.body) : await createQuotation(ctx, ctx.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, quotation: result.quotation } };
});

// Edit lines, VAT or status. Totals are always recomputed server-side.
//
// A LOCK-ONLY OR UNLOCK-ONLY REQUEST SKIPS THE MANAGE DOOR (24/09/2026): each is
// its own right, asked by updateQuotation, and a holder of Unlock may hold no
// right to create, edit or delete anything.
export const PUT = route(spec, async (ctx) => {
  const refusal = isLockOnly(ctx.body) ? null : manageable(ctx);
  if (refusal) return refusal;
  if (!ctx.body.id) return { error: "missing" };

  const result = await updateQuotation(ctx, ctx.body.id, ctx.body);
  if (refused(result)) return result;
  return { ok: true, quotation: result.quotation };
});

// NO DELETE (24/09/2026): a quotation is closed, never deleted — see
// closeQuotation. A DELETE here now answers 405 from the framework.

// THE TWO ACTS THAT ARE NOT EDITS (24/09/2026): handing a quotation to
// somebody else (`action: "assign"`, the default) and closing it
// (`action: "close"`). Neither passes the manage door — each is its own right,
// held by people who may hold no right to price the document — and each service
// asks for that right itself before anything is read.
export const PATCH = route(spec, async (ctx) => {
  if (!ctx.body.id) return { error: "missing" };
  const result = ctx.body.action === "close"
    ? await closeQuotation(ctx, ctx.body.id, ctx.body)
    : await assignQuotation(ctx, ctx.body.id, ctx.body);
  if (refused(result)) return result;
  return { ok: true, quotation: result.quotation };
});
