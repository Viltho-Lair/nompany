import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { leasesView, createLease, runLeases, removeLease } from "@/modules/finance/leaseService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// LEASES (IFRS 16, modules/finance/leases), under Fixed assets and its rights:
// view reads, create registers and recognises, edit runs a month and removes a
// lease no month has run for — each checked in the service.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/leases" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await leasesView(c as FinanceContext);
  return refused(result) ? result : { ok: true, ...result };
});

export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const action = String(c.body?.action ?? "");
  const result = action === "create" ? await createLease(ctx, c.body)
    : action === "run" ? await runLeases(ctx, c.body)
      : action === "remove" ? await removeLease(ctx, String(c.body?.id ?? ""))
        : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
