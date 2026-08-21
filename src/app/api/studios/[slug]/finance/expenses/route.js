import { route } from "@/lib/route";
import { financeContext, createExpense, editExpense, removeExpense } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: financeContext, body: true, name: "finance/expenses" };
const manageable = (fin) => (fin.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (fin) => {
  const refusal = manageable(fin);
  if (refusal) return refusal;

  const result = await createExpense(fin, fin.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, expense: result.expense } };
});

export const PUT = route(spec, async (fin) => {
  const refusal = manageable(fin);
  if (refusal) return refusal;
  if (!fin.body.id) return { error: "missing" };

  const result = await editExpense(fin, fin.body.id, fin.body);
  if (result.error) return result;
  return { ok: true, expense: result.expense };
});

export const DELETE = route(spec, async (fin) => {
  const refusal = manageable(fin);
  if (refusal) return refusal;
  if (!fin.body.id) return { error: "missing" };

  const result = await removeExpense(fin, fin.body.id);
  if (result.error) return result;
  return { ok: true };
});
