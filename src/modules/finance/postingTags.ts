// THE DIMENSIONS A DOCUMENT'S LEDGER ENTRY CARRIES — pure, so the rule is
// asserted without a database (tests/budgets-model.mjs).
//
// THE DEFECT THIS CLOSES: invoices, bills and expenses posted their entries
// with no project and no cost code on any line, although every one of those
// documents already named them. Only allocations, fixed assets and expense
// claims tagged their lines — so a budget cut by project, and the budget
// screen's "Which" picker (which offers the values the ledger has actually
// posted), saw almost nothing of a studio's real revenue and spend.
//
// THE TAGS GO ON THE P&L LINE ONLY — the revenue an invoice earns, the cost a
// bill or an expense incurs — which is the line a project or cost-code budget
// is read against, and the same choice `postClaim` and the asset postings made.
// A receivable, a payable or a bank line belongs to the studio, not to a job.
//
// DEPARTMENT IS NOT HERE because none of the three documents has one: an
// invoice, a bill and an expense record a project and (a bill) a cost code, and
// inventing a department for them would be a guess nobody could see happening.
import { isPlaced, type CostedOrder } from "@/modules/projects/costing";

export type PostingTags = { projectId?: string; costCodeId?: string };

type Tagged = { projectId?: unknown; costCodeId?: unknown; orderId?: unknown };

const text = (v: unknown) => String(v ?? "").trim().slice(0, 60);

/**
 * WHAT THE DOCUMENT'S P&L LINE IS TAGGED WITH. Absent rather than empty, as
 * `cleanLines` stores them — a line naming no project carries no key.
 *
 * A BILL ANSWERING A PURCHASE ORDER INHERITS THE ORDER'S CODE when it carries
 * none of its own — exactly the rule `projectCosting` applies, and only from a
 * PLACED order for its reason. Two answers to "which code is this bill's" would
 * let the ledger and the project's cost breakdown disagree about the same money.
 * The bill's own code wins: it is the later and more specific decision.
 */
export function documentTags(doc: Tagged | null | undefined, orders: readonly CostedOrder[] = []): PostingTags {
  const projectId = text(doc?.projectId);
  const orderId = text(doc?.orderId);
  const order = orderId ? orders.find((o) => text(o?.id) === orderId && isPlaced(o)) : undefined;
  const costCodeId = text(doc?.costCodeId) || text(order?.costCodeId);
  return {
    ...(projectId ? { projectId } : {}),
    ...(costCodeId ? { costCodeId } : {}),
  };
}
