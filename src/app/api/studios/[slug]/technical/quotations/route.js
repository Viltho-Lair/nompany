import { currentUser } from "@/lib/identity";
import { technicalContext, convertRfq, createQuotation, updateQuotation, removeQuotation } from "@/lib/technical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every quotation write is a Technical action and needs Technical:manage.
async function guard(paramsPromise) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const tech = await technicalContext(user, slug);
  if (tech.error) {
    const status = tech.error === "notfound" || tech.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: tech.error }, { status }) };
  }
  if (!tech.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return tech;
}
const body = async (r) => { try { return await r.json(); } catch { return {}; } };

// Two ways a quotation is born, distinguished by whether an rfqId is given:
// converting an RFQ (the hand-back to Sales), or creating one straight from the
// Quotations screen, which is Internal and needs number/description/handledBy.
export async function POST(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;

  const b = await body(request);
  const result = b.rfqId ? await convertRfq(g, b) : await createQuotation(g, b);
  if (result.error) {
    const status = result.error === "already" || result.error === "duplicate" ? 409
      : result.error === "notfound" ? 404 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, quotation: result.quotation }, { status: 201 });
}

// Edit lines, VAT or status. Totals are always recomputed server-side.
export async function PUT(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await updateQuotation(g, b.id, b);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : 400 });
  return Response.json({ ok: true, quotation: result.quotation });
}

export async function DELETE(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await removeQuotation(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
