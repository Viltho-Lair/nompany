import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  allocationsView, saveAllocationRule, removeAllocationRule, runAllocations,
} from "@/modules/finance/allocationService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ALLOCATIONS (modules/finance/allocations): shared costs spread across the
// projects, deals, cost codes or departments that used them. Read on
// `finance.ledger.view`; rules and runs post, on `finance.ledger.post`.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/allocations" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await allocationsView(c as FinanceContext);
  return refused(result) ? result : { ok: true, ...result };
});

export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const action = String(c.body?.action ?? "");
  const result = action === "save" ? await saveAllocationRule(ctx, c.body)
    : action === "remove" ? await removeAllocationRule(ctx, String(c.body?.id ?? ""))
      : action === "run" ? await runAllocations(ctx, c.body)
        : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
