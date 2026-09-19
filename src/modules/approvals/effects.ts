// WHAT DECIDING AN APPROVAL DOES TO ITS RECORD — one entry per type that moves
// anything. A type with no entry moves nothing: its record reads its approval
// (./reads) and that is the whole story, as for a quotation.
//
// THREE QUESTIONS PER TYPE, all optional:
//   ready     — asked BEFORE the yes that would finish the approval lands. The
//               approver is refused with the record's own reason (the drawer is
//               closed, the units went back already) while their answer can still
//               be not given, rather than after it is on the record.
//   approved  — the record's write once the last yes has landed.
//   rejected  — the record's write once somebody said no.
//
// EACH RUNS WITH THE STUDIO'S AUTHORITY, not the approver's — being named on the
// step IS the authority (the owner, 19/09/2026), and the person answering may
// hold no right over the record at all. The department's own context is built
// through `asApprover` (modules/context), which names the approver so what the
// record writes still says who. Never reachable from a route: only
// ./approvals calls these, and only on a decided approval.
//
// IMPORTED WHEN NEEDED. Every department that owns one of these records also
// reads approvals, and a module-level import would make each pair load the other.

import { getSectionByKey } from "@/platform/db/sections";
import { CLIENT_PO_APPROVAL } from "./reads";
import type { Approval } from "./schema";
import type { StudioRef } from "../context";

export type Refusal = { error: string; [detail: string]: unknown };
export type FinishOutcome = "none" | "done" | { error: string };

type Handler = {
  ready?: (studio: StudioRef, approval: Approval, byCollaboratorId: string) => Promise<Refusal | null>;
  approved?: (studio: StudioRef, approval: Approval, byCollaboratorId: string) => Promise<"done" | Refusal>;
  rejected?: (studio: StudioRef, approval: Approval, byCollaboratorId: string, reason: string) => Promise<"done" | Refusal>;
};

const HANDLERS: Record<string, () => Promise<Handler>> = {
  // A CLIENT'S PO, APPROVED, ISSUES THE PROJECT NUMBER it will be billed under —
  // what Finance's signature on the old board did. Idempotent: the project may
  // not be open yet, and then there is nothing to number.
  [CLIENT_PO_APPROVAL]: async () => ({
    approved: async (studio, approval) => {
      const listSection = (await getSectionByKey(studio.id, "projects-list")) || (await getSectionByKey(studio.id, "projects"));
      if (listSection) {
        const { issueProjectNumber } = await import("@/modules/projects/projects");
        await issueProjectNumber({ studio, listSection }, approval.source.recordId);
      }
      return "done";
    },
  }),
  "pos-return": async () => (await import("@/modules/sales/posReturns")).returnApproval,
  adjustment: async () => (await import("@/modules/inventory/adjustmentApproval")).adjustmentApproval,
  bill: async () => (await import("@/modules/finance/payables")).billApproval,
  bid: async () => (await import("@/modules/tendering/bid")).bidApproval,
};

const handlerFor = async (type: string): Promise<Handler | null> => (HANDLERS[type] ? HANDLERS[type]() : null);

/** Why the yes that would finish this approval cannot be given now, or null. */
export async function readyToFinish(studio: StudioRef, approval: Approval, byCollaboratorId: string): Promise<Refusal | null> {
  const h = await handlerFor(approval.type);
  return h?.ready ? h.ready(studio, approval, byCollaboratorId) : null;
}

const outcome = (r: "done" | Refusal): FinishOutcome => (r === "done" ? "done" : { error: String(r.error).slice(0, 80) });

export async function finishApproved(studio: StudioRef, approval: Approval, byCollaboratorId: string): Promise<FinishOutcome> {
  const h = await handlerFor(approval.type);
  return h?.approved ? outcome(await h.approved(studio, approval, byCollaboratorId)) : "none";
}

export async function finishRejected(studio: StudioRef, approval: Approval, byCollaboratorId: string): Promise<FinishOutcome> {
  const h = await handlerFor(approval.type);
  if (!h?.rejected) return "none";
  // THE NO'S OWN WORDS travel to the record, so whoever reads the record learns
  // why without opening the Approvals page.
  const no = approval.decisions.find((d) => d.verdict === "Rejected");
  return outcome(await h.rejected(studio, approval, byCollaboratorId, no?.note || ""));
}
