import { route, refused } from "@/platform/http/route";
import { financeContext, createExpense, editExpense, removeExpense } from "@/modules/finance/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: financeContext, body: true, name: "finance/expenses" };
const manageable = (fin: { canManage: boolean }) => (fin.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (fin) => {
  const refusal = manageable(fin);
  if (refusal) return refusal;

  const result = await createExpense(fin, fin.body);
  if (refused(result)) return result;
  // THE POSTING TRAVELS BACK, as the invoices route has always sent it: this
  // route dropped it, so a refusal (a closed month, a chart short an account)
  // left the books an entry short with the screen saying nothing.
  return { status: 201, body: { ok: true, expense: result.expense, ...(result.posting ? { posting: result.posting } : {}) } };
});

export const PUT = route(spec, async (fin) => {
  const refusal = manageable(fin);
  if (refusal) return refusal;
  if (!fin.body.id) return { error: "missing" };

  const result = await editExpense(fin, fin.body.id, fin.body);
  if (refused(result)) return result;
  const posting = (result as { posting?: unknown }).posting;
  return { ok: true, expense: result.expense, ...(posting ? { posting } : {}) };
});

export const DELETE = route(spec, async (fin) => {
  const refusal = manageable(fin);
  if (refusal) return refusal;
  if (!fin.body.id) return { error: "missing" };

  const result = await removeExpense(fin, fin.body.id);
  if (refused(result)) return result;
  const posting = (result as { posting?: unknown }).posting;
  return { ok: true, ...(posting ? { posting } : {}) };
});
