import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  claimsView, saveClaim, removeClaim, moveExpenseClaim, payClaim, giveAdvance, returnAdvance, postClaimAgain,
} from "@/modules/finance/claimsService";
import type { FinanceContext } from "@/modules/finance/types";
import { referencePickers } from "@/modules/procurement/pickers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EXPENSE CLAIMS AND STAFF ADVANCES (modules/finance/claims). Each act checks
// its own right in the service — raising your own claim, deciding somebody
// else's, paying — so the route only names which act was asked for.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/claims" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = c as FinanceContext;
  const result = await claimsView(ctx);
  if (refused(result)) return result;
  // THE PROJECTS A CLAIM MAY NAME — the same reader the bill form uses. The
  // service took a `projectId` and tagged the claim's ledger lines with it, and
  // the form had no way to send one, so every claim posted untagged. Only for
  // somebody who may raise a claim: a picker is for the form.
  const pickers = result.canCreate
    ? await referencePickers(ctx.studio, { projects: ctx.projectsListSection }, { projects: true })
    : {};
  return { ok: true, ...result, pickers };
});

export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const b = c.body || {};
  const id = String(b.id ?? "");
  const action = String(b.action ?? "");
  const result = action === "save" ? await saveClaim(ctx, b)
    : action === "remove" ? await removeClaim(ctx, id)
      : action === "move" ? await moveExpenseClaim(ctx, id, String(b.to ?? ""))
        : action === "pay" ? await payClaim(ctx, id, b)
          : action === "advance" ? await giveAdvance(ctx, b)
            : action === "advance-return" ? await returnAdvance(ctx, id, b)
              : action === "post-again" ? await postClaimAgain(ctx, id)
              : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
