// AWAITING YOU — the one cross-module executive widget that is new logic, not
// just a chart: the approvals and quotations waiting on THIS collaborator
// (invariant 6: addressed by CollaboratorID). It shares `approvalQueueFrom`
// with main.ts's awaitingMe COUNT, so the list and the count agree by
// construction. A section the viewer cannot see is never read.

import { repo } from "@/platform/db/repo";
import type { MainContext } from "./main";
import { waitingOn } from "@/modules/approvals/model";
import type { Approval } from "@/modules/approvals/schema";
import type { Row } from "@/platform/db/store";

// A NARROW LOCAL TYPE, not `any`: quotations are not yet a typed module, so
// the fields this reader actually
// touches are named here — the same move executive.ts documents for a row that
// only needs a few fields recognised.
type QuotationRow = Row & { status?: string; number?: string; createdAt?: string };

export type QueueItem = {
  kind: "approval" | "quotation" | "rfq";
  section: string;
  id: string;
  label: string;
  at: string;
};

/** Oldest-waiting first (a queue drains from the front). Pure. */
export function rankQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/**
 * THE APPROVALS WAITING ON ME — the open step names me and I have not answered.
 * The same `waitingOn` the Approvals page lists with, so the home page and the
 * page cannot disagree about what is mine.
 */
export function approvalQueueFrom(approvals: readonly Approval[], meId: string): QueueItem[] {
  return approvals
    .filter((a) => waitingOn(a).includes(meId))
    .map((a) => ({
      kind: "approval" as const,
      section: "approvals",
      id: String(a.id),
      label: a.source?.ref || a.source?.title || "",
      at: a.requestedAt || "",
    }));
}

/**
 * DOES THIS APPROVAL CONCERN ME: I asked for it, or I am named on one of its
 * steps. The line the Approvals page draws for somebody who may not see every
 * approval, restated nowhere else.
 */
export function concernsMe(approval: Approval, meId: string): boolean {
  return approval.requestedByCollaboratorId === meId
    || approval.steps.some((s) => s.approverIds.includes(meId));
}

export async function awaitingQueue(ctx: MainContext): Promise<QueueItem[]> {
  const meId = ctx.collaborator.id;
  const out: QueueItem[] = [];

  // Approvals waiting on me — every member may open Approvals, so this is read
  // for everybody who has the section at all.
  const approvalsSection = ctx.seen("approvals", null);
  if (approvalsSection) {
    const approvals = await repo<Approval>("approvals").find({ studio: ctx.studio, section: approvalsSection });
    out.push(...approvalQueueFrom(approvals, meId));
  }

  // Quotations awaiting the viewer's action (Draft/Sent handled by Technical).
  // Fallback is crm-sales, not engineering-docs — quotations moved WITH the
  // section (restructure.ts's SECTION_KEY_MAP: technical-quotations ->
  // crm-sales-quotations), so an unprovisioned sub-section falls back to its
  // real parent, CRM & Sales, not the RFQ's home.
  const quotesSection = ctx.seen("crm-sales-quotations", "crm-sales", "quotations-register");
  if (quotesSection) {
    const quotations = await repo<QuotationRow>("quotations").find({ studio: ctx.studio, section: quotesSection });
    for (const q of quotations) {
      if (q.status === "Draft" || q.status === "Sent") {
        out.push({ kind: "quotation", section: "quotations-register", id: String(q.id), label: String(q.number || q.id), at: String(q.createdAt || "") });
      }
    }
  }

  return rankQueue(out);
}
