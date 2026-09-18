// FILING AND SETTLING THE VAT RETURN.
//
// THE RETURN WAS A VIEW AND NOTHING ELSE. `taxReturnView` has computed a
// period's VAT from the documents since it shipped, and nothing could say "this
// one was filed": no record of the filing, no reference the authority gave, no
// lock against filing the same months twice, and no entry moving the tax out of
// VAT Payable — so the balance sheet showed every VAT ever charged as still owed.
//
// A FILED RETURN IS A SNAPSHOT. The figures are copied at the moment of filing,
// because that is what was declared; the documents can change afterwards (a bill
// corrected, a credit note issued late), and the screen then shows the live
// figure BESIDE the filed one rather than quietly rewriting what was declared.
//
// THE SETTLEMENT READS THE LEDGER, NOT THE DOCUMENTS. It moves the period's
// actual movements on VAT Payable (2100) and VAT Recoverable (1400) into VAT Due
// (2160) — which is what clears the balance sheet, and what comes out right for
// the months before input VAT had its own account, when bills netted it on 2100.
// Where the two disagree (an unposted document, one in a foreign currency), the
// difference is shown, never absorbed.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { taxReturnView } from "./taxReturn";
import { vatMovement } from "./ledger";
import { autoPost } from "./posting";
import { moneyAccountProblem } from "./ledger";
import type { FinanceContext } from "./types";

export type TaxReturnRecord = {
  id: string;
  from: string;
  to: string;
  /** What the documents said, as declared — output, credits, input and payable. */
  declared: { output: number; credits: number; input: number; payable: number };
  /** What the ledger moved into VAT Due: positive is owed, negative is a refund. */
  due: number;
  status: "filed" | "paid";
  filedOn: string;
  authorityReference: string;
  filedByCollaboratorId: string;
  paidOn?: string;
  accountId?: string;
};

const Returns = repo<TaxReturnRecord>("taxReturns");
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.taxSection });

/** The returns filed, newest period first. Read with the tax right. */
export async function listTaxReturns(ctx: FinanceContext): Promise<TaxReturnRecord[]> {
  return [...await Returns.find(scope(ctx))].sort((a, b) => b.from.localeCompare(a.from));
}

/**
 * FILE A PERIOD'S RETURN — its own right (\`finance.tax.file\`), because declaring
 * a figure to the authority is not reading one.
 *
 * NO TWO FILED RETURNS MAY COVER THE SAME DAY. A day in two returns is VAT
 * declared twice, and the settlement would move it out of VAT Payable twice.
 */
export async function fileTaxReturn(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.tax.file");
  if (denied) return denied;
  const from = text(body?.from, 10);
  const to = text(body?.to, 10);
  if (!ISO.test(from) || !ISO.test(to) || from > to) return { error: "period" };

  const filed = await Returns.find(scope(ctx));
  const overlap = filed.find((r) => r.from <= to && from <= r.to);
  if (overlap) return { error: "overlap", from: overlap.from, to: overlap.to };

  const view = await taxReturnView(ctx, { from, to });
  if ("error" in view && view.error) return view;
  if (!("enabled" in view) || !view.enabled) return { error: "no-vat" };
  const v = view as unknown as { output: { vat: number }; credits: { vat: number }; input: { vat: number }; payable: number };

  const record = await Returns.create(scope(ctx), {
    from, to,
    declared: { output: v.output.vat, credits: v.credits.vat, input: v.input.vat, payable: v.payable },
    due: (await vatMovement(ctx, from, to)).due,
    status: "filed",
    filedOn: ISO.test(text(body?.filedOn, 10)) ? text(body?.filedOn, 10) : new Date().toISOString().slice(0, 10),
    authorityReference: text(body?.authorityReference),
    filedByCollaboratorId: ctx.collaborator.id,
  } as Omit<TaxReturnRecord, "id">);
  // THE SETTLEMENT FOLLOWS THE FILING, under the studio's authority like every
  // document's entry, and a refusal (a closed month) travels back beside it.
  const posting = await autoPost(ctx, "tax-return", record.id);
  return { taxReturn: record, posting };
}

/** PAY WHAT A FILED RETURN SAYS IS DUE (or take the refund) through a money account. */
export async function payTaxReturn(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.tax.file");
  if (denied) return denied;
  const current = (await Returns.find(scope(ctx))).find((r) => r.id === id);
  if (!current) return { error: "notfound" };
  if (current.status === "paid") return { error: "already-paid" };
  const accountId = text(body?.accountId, 60);
  const wrong = await moneyAccountProblem(ctx, accountId);
  if (wrong) return { error: wrong };

  const paidOn = ISO.test(text(body?.paidOn, 10)) ? text(body?.paidOn, 10) : new Date().toISOString().slice(0, 10);
  const updated = await Returns.update(scope(ctx), id, () => ({ status: "paid", paidOn, ...(accountId ? { accountId } : {}) }));
  if (!updated) return { error: "notfound" };
  const posting = await autoPost(ctx, "tax-payment", id);
  return { taxReturn: updated, posting };
}
