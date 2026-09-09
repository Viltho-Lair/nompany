import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  treasury, saveCheque, moveCheque, saveGuarantee, releaseGuarantee,
} from "@/modules/finance/treasuryService";
import type { FinanceContext } from "@/modules/finance/types";
import type { ChequeStatus } from "@/modules/finance/treasury";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CASH THAT HAS NOT MOVED YET — post-dated cheques, the forecast they feed, and
// the guarantees holding a studio's money at the bank.
//
// NO PERMISSION KEY OF ITS OWN: reading is `finance.cash.view`, because the
// forecast is made of receivables and payables the reader can already open, and
// writing is `.edit`.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/treasury" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const url = new URL(c.request.url);
  // TODAY IS READ ON THE SERVER: a forecast that opened on the viewer's clock
  // would start a day out either side of midnight, and its first bucket sweeps
  // up everything overdue.
  const asked = url.searchParams.get("from") || "";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : new Date().toISOString().slice(0, 10);
  const weeks = Math.min(52, Math.max(1, Number(url.searchParams.get("weeks")) || 12));

  const result = await treasury(c as FinanceContext, { from, weeks });
  return refused(result) ? result : { ok: true, ...result };
});

// EVERY ACT IS NAMED IN THE BODY. A cheque's status is a TRANSITION with its
// own ladder, not a field an edit sets — the rule every state machine in this
// product follows since a rejected change order approved itself.
export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const action = String(c.body?.action ?? "");
  const result = action === "cheque" ? await saveCheque(ctx, c.body)
    : action === "move"
      ? await moveCheque(ctx, String(c.body?.id ?? ""), String(c.body?.status ?? "") as ChequeStatus)
      : action === "guarantee" ? await saveGuarantee(ctx, c.body)
        : action === "release" ? await releaseGuarantee(ctx, String(c.body?.id ?? ""))
          : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
