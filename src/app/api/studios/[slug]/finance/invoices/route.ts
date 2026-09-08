import { route, refused } from "@/platform/http/route";
import { financeContext, createInvoice, editInvoice, recordPayment, removeInvoice } from "@/modules/finance/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: financeContext, body: true, name: "finance/invoices" };
const manageable = (fin: { canManage: boolean }) => (fin.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (fin) => {
  const refusal = manageable(fin);
  if (refusal) return refusal;

  const result = await createInvoice(fin, fin.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, invoice: result.invoice } };
});

// Editing an invoice, or recording a payment against it. Payments go through
// their own service call because they are append-only history, not an edit.
//
// An overpayment refusal carries the outstanding balance with it. This route
// forwarded that field by hand — it was the only one in Finance that did — and
// the wrapper now carries every refusal's context the same way, so the other
// refusals here stopped being bare names too.
export const PUT = route(spec, async (fin) => {
  const refusal = manageable(fin);
  if (refusal) return refusal;
  if (!fin.body.id) return { error: "missing" };

  const result = fin.body.payment
    ? await recordPayment(fin, fin.body.id, fin.body.payment)
    : await editInvoice(fin, fin.body.id, fin.body);

  if (refused(result)) return result;
  // THE POSTING TRAVELS WITH THE INVOICE. Issuing one books it, and that can
  // refuse for reasons the issuer can do nothing about — a chart missing an
  // account, an entry already there. The document write is not undone by it, so
  // the only honest thing is to hand back both answers and let the screen say
  // "issued, but not posted" rather than let the studio find out months later
  // that its books are an entry short.
  const posting = (result as { posting?: unknown }).posting;
  return { ok: true, invoice: result.invoice, ...(posting ? { posting } : {}) };
});

// An issued invoice is part of the record — cancel it rather than erasing what
// a client was told they owed.
export const DELETE = route(spec, async (fin) => {
  const refusal = manageable(fin);
  if (refusal) return refusal;
  if (!fin.body.id) return { error: "missing" };

  const result = await removeInvoice(fin, fin.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
