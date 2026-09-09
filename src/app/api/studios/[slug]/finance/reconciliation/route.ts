import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  reconciliation, addStatementLines, matchLine, removeStatementLine,
} from "@/modules/finance/reconciliationService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT THE BANK SAYS, AGAINST WHAT THE BOOKS SAY.
//
// NO PERMISSION KEY OF ITS OWN: reading is `finance.ledger.view` and matching
// is `.post`, because confirming a pair is a statement about what the books
// mean and the person who may not put an entry in them has no business
// declaring one settled.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/reconciliation" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await reconciliation(c as FinanceContext);
  return refused(result) ? result : { ok: true, ...result };
});

// THE ACT IS NAMED IN THE BODY. Adding lines and confirming a pair are two
// different things on one screen, and a generic PUT is the shape that let a
// rejected change order approve itself.
export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const action = String(c.body?.action ?? "");
  const result = action === "match"
    ? await matchLine(ctx, String(c.body?.lineId ?? ""), String(c.body?.entryId ?? ""))
    : action === "add" ? await addStatementLines(ctx, c.body)
      : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});

export const DELETE = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await removeStatementLine(c as FinanceContext, id);
  return refused(result) ? result : result;
});
