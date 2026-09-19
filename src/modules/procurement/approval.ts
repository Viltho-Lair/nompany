// WHO SAYS YES TO A SPEND, AND ABOVE WHAT AMOUNT.
//
// THE GAP THIS CLOSES, and it is the one the whole section opens with: a
// purchase order appears with nobody having asked for it. `materialOrders`
// records a vendor, a project, lines and a cost code, and nothing about who
// needed the goods or who authorised the money. So the only control a studio
// had over what it bought was who held `inventory.stock.create` — a right that
// cannot express a limit, so "the FD sees the big ones" meant withholding
// ordering from everybody who handles the small ones.
//
// A REQUISITION IS THE FIRST DOCUMENT THAT CAN BE REFUSED CHEAPLY. A bill asks
// "we owe this, may I pay it" and a bid asks "may we promise this" — both after
// the commitment exists. This asks before there is one, which is the only point
// at which no costs nothing but a conversation inside the company.
//
// ANSWERED ON THE APPROVALS PAGE since 19/09/2026 (the owner: the request stays
// where it is made, the answer moves to Approvals). SUBMITTING IS THE REQUEST —
// it always was the act of asking — and files a `requisition` approval; the
// people who answer, and the amount each step starts at, are Approvals
// settings'. Until a studio saves the type they are whoever could sign one
// before — `procurement.requisitions.approve` from 0 and `.approveHigh` from
// 10,000, or the studio's own limits — plus the owner and Admins. The last yes
// makes it Approved; a no makes it Rejected with the reason.
import { repo } from "@/platform/db/repo";
import { approvalPreflight, approvalRows, requestApproval, type RequestOutcome } from "@/modules/approvals/approvals";
import { approvalSummary } from "@/modules/approvals/reads";
import type { Refusal } from "@/modules/approvals/effects";
import type { Approval } from "@/modules/approvals/schema";
import type { StudioRef } from "@/modules/context";
import { requisitionTotals } from "./model";
import type { Requisition } from "./schema";
import type { ProcurementContext } from "./types";

const Requisitions = repo<Requisition>("requisitions");

/** The approval type a requisition asks for. Its key is stored — see modules/approvals/registry. */
export const REQUISITION_APPROVAL = "requisition";

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * WHAT THE REQUEST IS WORTH, for its approval — or null while any line is
 * unestimated.
 *
 * NULL WALKS EVERY STEP, and that is the fix for the audit's gap 9: blank
 * prices summed as nought, so an incomplete estimate routed LOW and skipped the
 * step above the limit. An amount nobody knows cannot be under a limit.
 * No currency of its own: a requisition's estimates are typed in the money the
 * studio works in, so nothing is ever converted.
 */
function amountOf(studio: StudioRef, req: Pick<Requisition, "lines">) {
  const totals = requisitionTotals(req.lines, studio.currency);
  return totals.complete ? { value: totals.estimated, currency: String(studio.currency || "") } : null;
}

type Requester = { studio: StudioRef; collaborator: ProcurementContext["collaborator"]; roles: ProcurementContext["roles"] };

/** May this request be submitted — is there somebody to ask, and does it need asking at all? */
export async function submitPreflight(requester: Requester, req: Pick<Requisition, "lines">) {
  return approvalPreflight(requester, { type: REQUISITION_APPROVAL, amount: amountOf(requester.studio, req) });
}

/** File the request's approval. `carried` is the old engine's signatures, for one part-signed before. */
export function askForRequisition(
  requester: Requester, req: Requisition, carried: { collaboratorId: string; at: string }[] = [],
): Promise<RequestOutcome> {
  return requestApproval(requester, {
    type: REQUISITION_APPROVAL,
    source: {
      sectionKey: "procurement-requisitions", recordId: req.id, ref: String(req.reference || ""),
      title: `${req.reference || ""} · ${req.title || ""}`, path: "procurement-requisitions",
    },
    note: str(req.justification, 4000),
    amount: amountOf(requester.studio, req),
    carried,
  });
}

/**
 * THE REQUESTS' APPROVALS, for the list — each summarised from its approval,
 * never a copy.
 *
 * A REQUEST SUBMITTED BEFORE 19/09/2026 was already asking, so it is given its
 * approval here, in the name of whoever submitted it, carrying the signatures
 * it had so nobody signs twice. Once: a filed one is found on the next read.
 */
export async function requisitionApprovals(ctx: ProcurementContext, reqs: readonly Requisition[], people: unknown[]) {
  const rows = await approvalRows(ctx.studio, ctx.approvalsSection);
  const stranded = reqs.filter((r) => String(r.status || "") === "Submitted" && !approvalSummary(rows, REQUISITION_APPROVAL, r.id));
  if (stranded.length && ctx.approvalsSection) {
    const byId = new Map((people as { id?: unknown }[]).map((c) => [String(c.id), c]));
    for (const r of stranded) {
      const who = byId.get(String(r.submittedByCollaboratorId || r.createdByCollaboratorId || ""));
      if (!who) continue;
      const asked = await askForRequisition(
        { studio: ctx.studio, collaborator: who as ProcurementContext["collaborator"], roles: ctx.roles }, r,
        (r.approvals || []).map((x) => ({ collaboratorId: x.byCollaboratorId, at: x.at })),
      );
      if (asked.approval) rows.push(asked.approval);
    }
  }
  return new Map(reqs.map((r) => [r.id, approvalSummary(rows, REQUISITION_APPROVAL, r.id)] as const));
}

/** The request an approval names, in a context carrying the studio's authority. */
async function requisitionFor(studio: StudioRef, approval: Approval, byCollaboratorId: string) {
  // IMPORTED WHEN NEEDED: ./requisitions imports this file.
  const { procurementContext } = await import("./requisitions");
  const ctx = await procurementContext.asApprover(studio.id, byCollaboratorId);
  if (ctx.error) return { error: ctx.error } as Refusal;
  const req = await Requisitions.byId({ studio: ctx.studio, section: ctx.requisitionsSection }, approval.source.recordId);
  return req ? { ctx, req } : ({ error: "notfound" } as Refusal);
}

/**
 * WHAT DECIDING A `requisition` APPROVAL DOES — see modules/approvals/effects.
 * Approved or Rejected, once, and only from Submitted: a request cancelled while
 * its approval waited is not brought back by a late yes.
 */
export const requisitionApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await requisitionFor(studio, approval, by);
    if ("error" in found) return found;
    return String(found.req.status || "") === "Submitted" ? null : ({ error: "already-decided", status: found.req.status } as Refusal);
  },
  approved: async (studio: StudioRef, approval: Approval, by: string) => answer(studio, approval, by, true, ""),
  rejected: async (studio: StudioRef, approval: Approval, by: string, reason: string) => answer(studio, approval, by, false, reason),
};

async function answer(studio: StudioRef, approval: Approval, by: string, approve: boolean, reason: string) {
  const found = await requisitionFor(studio, approval, by);
  if ("error" in found) return found;
  const { ctx, req } = found;
  if (String(req.status || "") !== "Submitted") return approve ? ({ error: "already-decided" } as Refusal) : ("done" as const);
  const at = new Date().toISOString();
  const updated = await Requisitions.update({ studio: ctx.studio, section: ctx.requisitionsSection }, req.id, (cur) => (
    String((cur as Requisition).status || "") !== "Submitted" ? cur : {
      ...cur,
      status: approve ? "Approved" : "Rejected",
      answeredByCollaboratorId: by,
      answeredAt: at,
      ...(approve ? {} : { rejectedReason: str(reason, 1000) }),
      updatedAt: at,
    }));
  return updated && (updated as Requisition & { answeredAt?: string }).answeredAt === at ? ("done" as const) : ({ error: "already-decided" } as Refusal);
}
