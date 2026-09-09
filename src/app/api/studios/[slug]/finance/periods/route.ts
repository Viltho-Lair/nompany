import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { periods, closePeriod, reopenPeriod } from "@/modules/finance/periodService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A MONTH THAT IS FINISHED WITH.
//
// `finance.ledger.close` is its own right: posting is the daily act, closing
// says a month is finished and nothing else may land in it, and the person who
// decides that is usually not the person keying the entries.
//
// THE LOCK IS NOT ENFORCED HERE. It lives in `postEntry`, the one door every
// entry passes through — a check in each of the seven posting functions would
// be seven chances to add an eighth without it.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/periods" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const period = new URL(c.request.url).searchParams.get("period") || "";
  const result = await periods(c as FinanceContext, period);
  return refused(result) ? result : { ok: true, ...result };
});

// CLOSING AND REOPENING ARE NAMED IN THE BODY rather than split across verbs:
// they are two answers to one question about one month, and a generic PUT is
// the shape that let a rejected change order approve itself.
export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const period = String(c.body?.period ?? "").trim();
  const action = String(c.body?.action ?? "");
  const result = action === "close" ? await closePeriod(ctx, period)
    : action === "reopen" ? await reopenPeriod(ctx, period, c.body?.reason)
      : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
