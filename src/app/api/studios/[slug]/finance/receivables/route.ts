import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { receivablesView, saveCredit, removeCredit, recordDunning } from "@/modules/finance/creditService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RECEIVABLES' OWN ROWS — customers' credit limits and the reminders sent
// (modules/finance/credit). The invoices themselves stay on `/finance/invoices`.
// Read on `finance.receivables.view`, written on `.edit`, each checked in the
// service.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/receivables" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await receivablesView(c as FinanceContext);
  return refused(result) ? result : { ok: true, ...result };
});

// THE ACT IS NAMED IN THE BODY: a credit row saved or removed, or reminders
// recorded as sent.
export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const action = String(c.body?.action ?? "");
  const result = action === "credit" ? await saveCredit(ctx, c.body)
    : action === "credit-remove" ? await removeCredit(ctx, String(c.body?.id ?? ""))
      : action === "dunning" ? await recordDunning(ctx, c.body)
        : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
