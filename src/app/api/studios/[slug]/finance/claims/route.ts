import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  claimsView, saveClaim, removeClaim, moveClaim, payClaim, giveAdvance, returnAdvance,
} from "@/modules/finance/claimsService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EXPENSE CLAIMS AND STAFF ADVANCES (modules/finance/claims). Each act checks
// its own right in the service — raising your own claim, deciding somebody
// else's, paying — so the route only names which act was asked for.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/claims" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await claimsView(c as FinanceContext);
  return refused(result) ? result : { ok: true, ...result };
});

export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const b = c.body || {};
  const id = String(b.id ?? "");
  const action = String(b.action ?? "");
  const result = action === "save" ? await saveClaim(ctx, b)
    : action === "remove" ? await removeClaim(ctx, id)
      : action === "move" ? await moveClaim(ctx, id, String(b.to ?? ""), b.reason)
        : action === "pay" ? await payClaim(ctx, id, b)
          : action === "advance" ? await giveAdvance(ctx, b)
            : action === "advance-return" ? await returnAdvance(ctx, id, b)
              : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
