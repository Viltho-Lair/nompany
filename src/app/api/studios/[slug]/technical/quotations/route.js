import { route } from "@/lib/route";
import { technicalContext, convertRfq, createQuotation, updateQuotation, removeQuotation } from "@/lib/technical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every quotation write is a Technical action and needs Technical:manage.
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
// All three now map through src/lib/httpStatus.js, so `forbidden` is 403,
// `locked` is 409 and `notfound` is 404 here exactly as everywhere else.
const spec = { auth: "studio", context: technicalContext, body: true, name: "technical/quotations" };

// The one check the services cannot make for themselves: they guard the WRITE,
// this guards the door. Kept as it was rather than folded into the wrapper —
// permission lives next to the thing it protects.
const manageable = (tech) => (tech.canManage ? null : { error: "read-only" });

// Two ways a quotation is born, distinguished by whether an rfqId is given:
// converting an RFQ (the hand-back to Sales), or creating one straight from the
// Quotations screen, which is Internal and needs number/description/handledBy.
export const POST = route(spec, async (ctx) => {
  const refusal = manageable(ctx);
  if (refusal) return refusal;

  const result = ctx.body.rfqId ? await convertRfq(ctx, ctx.body) : await createQuotation(ctx, ctx.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, quotation: result.quotation } };
});

// Edit lines, VAT or status. Totals are always recomputed server-side.
export const PUT = route(spec, async (ctx) => {
  const refusal = manageable(ctx);
  if (refusal) return refusal;
  if (!ctx.body.id) return { error: "missing" };

  const result = await updateQuotation(ctx, ctx.body.id, ctx.body);
  if (result.error) return result;
  return { ok: true, quotation: result.quotation };
});

export const DELETE = route(spec, async (ctx) => {
  const refusal = manageable(ctx);
  if (refusal) return refusal;
  if (!ctx.body.id) return { error: "missing" };

  const result = await removeQuotation(ctx, ctx.body.id);
  if (result.error) return result;
  return { ok: true };
});
