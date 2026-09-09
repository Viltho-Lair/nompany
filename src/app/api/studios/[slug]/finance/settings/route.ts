import { route, refused } from "@/platform/http/route";
import { financeContext, saveFinanceSettings } from "@/modules/finance/finance";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// FINANCE'S OWN SETTINGS — the cash categories an expense is filed under, and
// the withholding rules a document is taxed by.
//
// `saveFinanceSettings` HAD NO CALLER. It has existed complete since the
// module was written — guarding `finance.settings.edit`, validating the
// approval chains it used to own, writing to the section's settings object —
// and nothing in the product invoked it, so a studio's cash categories were
// whatever the defaults said and could not be changed. The same defect the five
// posting functions carried, found the same way: by needing one of them.
//
// THE APPROVAL CHAINS ARE NOT WRITTEN HERE ANY MORE. They moved to the studio
// record (`platform/approval/store`), and `saveFinanceSettings` still accepts
// them for the studios that stored them before the move — see the note in that
// file about there never being a moment with two writers.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/settings" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = c as FinanceContext;
  return {
    ok: true,
    cashCategories: ctx.cashCategories,
    withholdingRules: ctx.withholdingRules,
    approvalChains: ctx.approvalChains,
    canManage: ctx.canManageSettings,
  };
});

export const PUT = route(spec, async (c) => {
  const result = await saveFinanceSettings(c as FinanceContext, c.body);
  return refused(result) ? result : { ok: true, ...result };
});
