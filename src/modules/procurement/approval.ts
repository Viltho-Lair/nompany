// WHO SAYS YES TO A SPEND, AND ABOVE WHAT AMOUNT — P2's engine's THIRD document
// type, not a third engine.
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
import { requirePermission, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { approvalChainsFor } from "@/platform/approval/store";
import {
  resolveApprovalPlan, firstUnsignedStep, planSatisfied,
  type ApprovalSignature, type PlanRefusal, type ResolvedPlan,
} from "@/platform/approval/resolve";
import type { ApprovalStep } from "@/platform/approval/chains";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { requisitionTotals } from "./model";
import type { Requisition } from "./schema";
import type { ProcurementContext } from "./types";

const Requisitions = repo<Requisition>("requisitions");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * WHICH SIGNATURES THIS REQUEST NEEDS.
 *
 * The FX read is made only when the requisition is in a currency other than the
 * studio's — `resolveApprovalPlan` is handed a table rather than fetching one,
 * so a request already in the studio's currency costs no round trip. Hop counts
 * are part of this repo's contract.
 *
 * A requisition has no currency of its own today: its estimates are typed in
 * whatever the studio works in, so the amount is already in base and the
 * snapshot is fetched only because the resolver's contract asks for one. The
 * field exists on bills because a supplier invoices in their own money; when a
 * requisition grows one, this is where it plugs in.
 */
async function requisitionPlan(
  ctx: ProcurementContext, amount: number,
): Promise<ResolvedPlan | PlanRefusal> {
  const chains = approvalChainsFor(ctx.studio);
  const snapshot = await getExchangeSnapshot();
  return resolveApprovalPlan({
    chain: chains.requisition,
    amount,
    currency: String(ctx.studio.currency || ""),
    studioCurrency: String(ctx.studio.currency || ""),
    rates: snapshot,
  });
}

/** The step this viewer could sign right now, or null. */
function availableApproval(
  req: Requisition,
  plan: ResolvedPlan | PlanRefusal | null,
  holds: (permission: string) => boolean,
  actorCollaboratorId: string,
): ApprovalStep | null {
  if (!plan || plan.ok !== true) return null;
  if (String(req.status || "Draft") !== "Submitted") return null;
  if (req.createdByCollaboratorId === actorCollaboratorId) return null;
  if ((req.approvals || []).some((s) => s.byCollaboratorId === actorCollaboratorId)) return null;
  const step = firstUnsignedStep(plan, req.approvals || []);
  return step && holds(step.permission) ? step : null;
}

/**
 * THE REQUEST AS A SCREEN NEEDS TO DRAW IT: what it is worth, how it was routed,
 * how far it has got, and the step this viewer could sign.
 */
export async function requisitionReview(ctx: ProcurementContext, req: Requisition) {
  const totals = requisitionTotals(req.lines);
  const plan = await requisitionPlan(ctx, totals.estimated);
  const holds = (permission: string) => !requirePermission(ctx.access, permission as PermissionKey);
  return {
    totals,
    plan: plan.ok ? plan : null,
    // A TOKEN, NOT THE SENTENCE. `resolveApprovalPlan` writes English and the
    // studio is bilingual; refusals translate on display, keyed by what was
    // stored, exactly as statuses do.
    blocked: plan.ok ? (totals.complete ? null : "estimate-incomplete") : plan.reason,
    signed: (req.approvals || []).length,
    required: plan.ok ? plan.steps.length : 0,
    approved: planSatisfied(plan, req.approvals || []),
    next: availableApproval(req, plan, holds, ctx.collaborator.id),
    // WHY THERE IS NO BUTTON, when the reason is worth saying out loud: somebody
    // who raised a request and holds the right will otherwise look for a control
    // that is absent on purpose.
    mine: req.createdByCollaboratorId === ctx.collaborator.id,
  };
}

/**
 * SIGN ONE STEP, OR REFUSE THE REQUEST OUTRIGHT.
 *
 * The walk is payables' walk and the bid's walk: resolve the plan, find the
 * first step still outstanding, require THAT step's permission, record the
 * signature. Access is still resolved once (invariant 3) — this asks a
 * different question of the set that was already resolved.
 */
export async function answerRequisition(
  ctx: ProcurementContext, id: string, approve: boolean, reason = "",
) {
  // NO BLANKET GUARD FIRST, deliberately. The right that opens this door is the
  // STEP's, chosen at runtime below — a `procurement.requisitions.edit` check
  // here would let whoever raised the request sign it, which is the exact
  // separation the feature exists for.
  const { studio, requisitionsSection, collaborator } = ctx;
  const req = await Requisitions.byId({ studio, section: requisitionsSection }, id);
  if (!req) return { error: "notfound" };

  // NOTHING TO ANSWER UNTIL IT IS ASKED, and nothing to answer twice.
  if (String(req.status || "Draft") !== "Submitted") return { error: "not-submitted" };

  // INVARIANT 7, FIRST HALF: the person who raised it never answers it.
  if (req.createdByCollaboratorId === collaborator.id) return { error: "same-signer" };

  const totals = requisitionTotals(req.lines);
  const plan = await requisitionPlan(ctx, totals.estimated);
  // Passed through with its reason: "your studio has no currency" is fixed in
  // Studio settings and "this pair is not quoted today" is not.
  if (!plan.ok) return { error: plan.reason, detail: plan.detail };

  const signatures: ApprovalSignature[] = req.approvals || [];
  // INVARIANT 7, SECOND HALF, AND A DIFFERENT RULE: somebody who signed an
  // earlier step may not sign a later one. Holding both rights stays
  // legitimate; a second step the first signer can clear is not a second step.
  if (signatures.some((s) => s.byCollaboratorId === collaborator.id)) return { error: "same-signer" };

  const step = firstUnsignedStep(plan, signatures);
  if (!step) return { error: "already-approved" };

  const denied = requirePermission(ctx.access, step.permission as PermissionKey);
  if (denied) return denied;

  // CAPTURED ONCE. This may be re-invoked — a CAS retry, or once per store
  // under NOMPANY_DB=parity — and a fresh `new Date()` inside would disagree
  // between invocations (invariant 8).
  const at = new Date().toISOString();

  // A REFUSAL ENDS IT AT ANY STEP, and needs no chain to be completed: one no
  // is the answer, whoever is left. It is stamped like an approval, because
  // "nobody answered" and "this person said no" are different states and a
  // rejection with no signatory is the first wearing the second's status.
  if (!approve) {
    const rejected = await Requisitions.update({ studio, section: requisitionsSection }, id, {
      status: "Rejected",
      answeredByCollaboratorId: collaborator.id,
      answeredAt: at,
      rejectedReason: str(reason, 1000),
      approvalPlan: plan,
      updatedAt: at,
    });
    return rejected ? { requisition: rejected, approved: false } : { error: "notfound" };
  }

  const next: ApprovalSignature[] = [...signatures, {
    permission: step.permission,
    byCollaboratorId: collaborator.id,
    byAlias: collaborator.alias || "",
    at,
  }];
  const done = planSatisfied(plan, next);

  const updated = await Requisitions.update({ studio, section: requisitionsSection }, id, () => ({
    approvals: next,
    // THE PLAN IS FROZEN ONTO THE RECORD, so the rate that routed this request
    // is recorded with it and a rate moving overnight cannot re-route one
    // already mid-chain. Same field name, same reasoning, as a bill's.
    approvalPlan: plan,
    // APPROVED IS WRITTEN ONLY ON THE LAST STEP. A half-signed request is still
    // Submitted, which is why REQUISITION_STATUSES gained no intermediate
    // value — the same decision BILL_STATUSES made.
    ...(done ? { status: "Approved", answeredByCollaboratorId: collaborator.id, answeredAt: at } : {}),
    updatedAt: at,
  }));

  return updated
    ? { requisition: updated, approved: done, signed: next.length, required: plan.steps.length }
    : { error: "notfound" };
}
