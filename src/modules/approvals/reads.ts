// WHAT A RECORD KNOWS ABOUT ITS APPROVAL — asked of the approval, never of a
// copy on the record (the owner, 19/09/2026: "a status carry, not a copy").
//
// PURE and client-safe: every module that shows a record's approval asks through
// here, so a quotation cannot read as approved on its ticket and not approved
// in Technical's list. The store half — reading the rows — is ./approvals.

import { latestFor, stepStates } from "./model";
import type { Approval } from "./schema";

/** The approval types a quotation asks for. Keys are stored, see ./registry. */
export const QUOTATION_APPROVAL = "quotation";
export const CLIENT_PO_APPROVAL = "client-po";

type Rows = readonly Approval[] | null | undefined;

/**
 * THE RECORD'S LATEST APPROVAL OF ONE TYPE, summarised for the screen that shows
 * it — or null when nobody has asked. `granted` of `required` counts STEPS, the
 * unit an approval moves by.
 */
export function approvalSummary(rows: Rows, type: string, recordId: string | null | undefined) {
  if (!recordId) return null;
  const a = latestFor(rows || [], type, recordId);
  if (!a) return null;
  return {
    approvalId: a.id,
    status: a.status,
    approved: a.status === "Approved",
    rejected: a.status === "Rejected",
    required: a.steps.length,
    granted: stepStates(a).filter((s) => s.state === "Approved").length,
    at: a.decidedAt || "",
    requestedAt: a.requestedAt,
    note: a.note || "",
    // WHY IT WAS TURNED DOWN, in the approver's words — the record shows it so
    // whoever asked knows what to fix without opening the Approvals page.
    reason: a.decisions.find((d) => d.verdict === "Rejected")?.note || "",
    attachment: a.attachment || null,
  };
}

export type ApprovalCarry = NonNullable<ReturnType<typeof approvalSummary>>;

type QuotationLike = { id?: unknown; status?: unknown; completedAt?: unknown } | null | undefined;

/**
 * IS THIS QUOTATION APPROVED — by its newest quotation approval.
 *
 * A STORED `Approved` STILL COUNTS, and only for the quotations that already
 * carry it: before Approvals, a quotation could be marked Approved by editing
 * its status, and those decisions are on file in live studios. Nothing can
 * write that status by hand any more (technical's updateQuotation refuses it),
 * so this reads history rather than leaving a door open.
 */
export function quotationApproved(quotation: QuotationLike, rows: Rows): boolean {
  if (!quotation) return false;
  if (quotation.status === "Approved") return true;
  return approvalSummary(rows, QUOTATION_APPROVAL, String(quotation.id || ""))?.approved === true;
}

/**
 * WHEN IT WAS APPROVED: the hand-set stamp on a quotation that carries one, else
 * the moment its approval was decided. The date the dashboard measures
 * turnaround from and the viewer prints.
 */
export function quotationApprovedAt(quotation: QuotationLike, rows: Rows): string {
  if (!quotation) return "";
  if (quotation.completedAt) return String(quotation.completedAt);
  const carry = approvalSummary(rows, QUOTATION_APPROVAL, String(quotation.id || ""));
  return carry?.approved ? carry.at : "";
}
