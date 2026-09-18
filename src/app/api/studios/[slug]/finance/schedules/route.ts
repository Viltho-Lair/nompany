import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { schedulesView, createSchedule, runSchedules, cancelSchedule } from "@/modules/finance/scheduleService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DEFERRAL SCHEDULES (modules/finance/schedules): revenue earned over time and
// prepaid costs. Read on `finance.ledger.view`; every write is a posting and
// answers to `finance.ledger.post`, checked in the service.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/schedules" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await schedulesView(c as FinanceContext);
  return refused(result) ? result : { ok: true, ...result };
});

export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const action = String(c.body?.action ?? "");
  const result = action === "create" ? await createSchedule(ctx, c.body)
    : action === "run" ? await runSchedules(ctx, c.body)
      : action === "cancel" ? await cancelSchedule(ctx, String(c.body?.id ?? ""))
        : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
