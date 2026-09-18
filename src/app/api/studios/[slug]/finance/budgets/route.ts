import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { budgetsView, saveBudget, removeBudget } from "@/modules/finance/budgetService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BUDGETS (modules/finance/budgets): each budget with its variance against the
// ledger. Read on `finance.budgets.view`; saved and removed on the area's own
// write verbs, each checked in the service.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/budgets" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await budgetsView(c as FinanceContext);
  return refused(result) ? result : { ok: true, ...result };
});

export const POST = route(spec, async (c) => {
  const result = await saveBudget(c as FinanceContext, c.body);
  return refused(result) ? result : { ok: true, ...result };
});

export const DELETE = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await removeBudget(c as FinanceContext, id);
  return refused(result) ? result : { ok: true, ...result };
});
