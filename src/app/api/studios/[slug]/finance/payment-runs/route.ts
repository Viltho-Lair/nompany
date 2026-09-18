import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { paymentRunView, executeRun } from "@/modules/finance/paymentRunService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A PAYMENT RUN (modules/finance/paymentRun): the approved bills due by a
// date, and paying the chosen ones together. Read on `finance.payables.view`,
// paid on `finance.payables.pay` — the same right a single payment needs,
// because a run IS single payments, each through the bill's own door.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/payment-runs" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const dueBy = new URL(c.request.url).searchParams.get("dueBy") || "";
  const result = await paymentRunView(c as FinanceContext, dueBy);
  return refused(result) ? result : { ok: true, ...result };
});

export const POST = route(spec, async (c) => {
  const result = await executeRun(c as FinanceContext, c.body);
  return refused(result) ? result : { ok: true, ...result };
});
