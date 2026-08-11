import { financeGuard, createInvoice, editInvoice, recordPayment, removeInvoice } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await financeGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createInvoice(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, invoice: result.invoice }, { status: 201 });
}

// Editing an invoice, or recording a payment against it. Payments go through
// their own service call because they are append-only history, not an edit.
export async function PUT(request, ctx) {
  const g = await financeGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = b.payment ? await recordPayment(g, b.id, b.payment) : await editInvoice(g, b.id, b);

  if (result.error) {
    const status = result.error === "notfound" ? 404
      : result.error === "issued" || result.error === "has-payments" || result.error === "overpayment" ? 409
      : 400;
    return Response.json({ error: result.error, outstanding: result.outstanding }, { status });
  }
  return Response.json({ ok: true, invoice: result.invoice });
}

export async function DELETE(request, ctx) {
  const g = await financeGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeInvoice(g, b.id);
  if (result.error) {
    // An issued invoice is part of the record — cancel it rather than erasing
    // what a client was told they owed.
    return Response.json({ error: result.error }, { status: result.error === "issued" ? 409 : 404 });
  }
  return Response.json({ ok: true });
}
