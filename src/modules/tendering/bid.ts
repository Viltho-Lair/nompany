// BID REVIEW — who signs a bid, and above what value.
//
// THE GAP THIS CLOSES, stated in tendering.md since the register shipped: *"a
// bid going out at a price nobody senior signed"*. A tender could be moved to
// Submitted by anybody holding `tendering.tenders.edit` — the same right that
// types a line into the bill — so the person who priced the work was also the
// person who committed the company to it.
//
// IT REUSES P2'S ENGINE RATHER THAN GROWING A SECOND ONE. `platform/approval`
// already knows what a chain is, what an amount in a foreign currency is worth
// against a limit, and which step is outstanding. A bid is a different document
// asking the same question, and a second implementation of "at or above, in the
// studio's currency, in order, and never the same signer twice" would be a
// second set of answers free to disagree with Finance's.
import { requirePermission, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { approvalChainsFor } from "@/platform/approval/store";
import {
  resolveApprovalPlan, firstUnsignedStep, planSatisfied,
  type ApprovalSignature, type PlanRefusal, type ResolvedPlan,
} from "@/platform/approval/resolve";
import type { ApprovalStep } from "@/platform/approval/chains";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { boqTotals, valueFromBoq } from "./boq";
import type { BoqItem, Tender } from "./schema";
import type { TenderingContext } from "./types";

const Items = repo<BoqItem>("boqItems");
const Tenders = repo<Tender>("tenders");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * WHAT THE STUDIO IS ABOUT TO PROMISE, and which number it came from.
 *
 * THIS IS WHERE `valueFromBoq` FINALLY GETS CALLED. It has been written and
 * tested and reached by nothing since slice 2, which left a tender's typed
 * `estimatedValue` and its bill's total as two numbers for one tender with
 * nothing choosing between them. A signature has to be given against ONE of
 * them, so this is the place that chooses.
 *
 * THE BILL WINS WHERE THERE IS ONE, because the estimate is what somebody
 * guessed the day they heard about the tender and the bill is what the work was
 * actually costed at. `basis` travels with the number so a signature records
 * which it was given against — the two are the same digits on screen and mean
 * completely different things.
 *
 * `complete` TRAVELS TOO, and the approval refuses on it. See approveBid.
 */
export type BidValue = {
  amount: number;
  basis: "boq" | "estimate";
  /** False when the bill exists and some line still has no rate. */
  complete: boolean;
  lines: number;
};

export function bidValue(tender: Tender, lines: readonly BoqItem[]): BidValue {
  const totals = boqTotals(lines);
  const fromBoq = valueFromBoq(totals);
  if (fromBoq === null) {
    // No bill at all. A studio may bid on a typed figure — plenty of tenders
    // are priced outside this product — and `complete` is true because there is
    // no part-priced bill to be wrong about, not because anything was checked.
    return { amount: Number(tender?.estimatedValue) || 0, basis: "estimate", complete: true, lines: 0 };
  }
  return { amount: fromBoq, basis: "boq", complete: totals.complete, lines: totals.lines };
}

/** Today's rates, or the fact that none were needed — payables' `fxFor`, for one record. */
async function fxFor(ctx: TenderingContext, currency: string) {
  const studioCurrency = str(ctx.studio.currency, 8).toUpperCase();
  const from = str(currency, 8).toUpperCase();
  // A tender in the studio's own currency adds no round trip. Hop counts are
  // part of this repo's contract and a conversion nobody needs is a hop nobody
  // asked for — the same reasoning payables states for taking FX per LIST.
  if (!studioCurrency || !from || from === studioCurrency) {
    return { rates: null, updatedAt: 0, stale: false };
  }
  const snapshot = await getExchangeSnapshot();
  return { rates: snapshot.rates ?? null, updatedAt: Number(snapshot.updatedAt) || 0, stale: !!snapshot.stale };
}

/** The plan this bid is routed under, resolved from its own value. */
export async function bidPlan(
  ctx: TenderingContext, tender: Tender, value: BidValue,
): Promise<ResolvedPlan | PlanRefusal> {
  const studioCurrency = str(ctx.studio.currency, 8);
  const currency = (str(tender.currency, 8) || studioCurrency).toUpperCase();
  const fx = await fxFor(ctx, currency);
  return resolveApprovalPlan({
    // The studio's chains, seeds included — `tender` is seeded, so unlike a
    // type nobody configured this can never resolve to `no-chain`.
    chain: approvalChainsFor(ctx.studio).tender,
    amount: value.amount,
    currency,
    studioCurrency,
    rates: fx.rates,
    updatedAt: fx.updatedAt,
    stale: fx.stale,
  });
}

/**
 * Which step this person could sign right now, or null.
 *
 * Read by the screen so a button is drawn only where pressing it would succeed.
 * IT ASKS EVERY QUESTION approveBid ASKS, in the same order and for the same
 * reasons — payables' `availableApproval` states this at length and it holds
 * identically here: a screen checking fewer of them offers buttons that refuse,
 * and one checking them in a component is a second copy free to drift.
 */
export function availableBidApproval(
  tender: Tender,
  value: BidValue,
  plan: ResolvedPlan | PlanRefusal | null,
  holds: (permission: string) => boolean,
  actorCollaboratorId: string,
): ApprovalStep | null {
  if (!plan || plan.ok !== true) return null;
  if (!value.complete) return null;
  if (tender.createdByCollaboratorId === actorCollaboratorId) return null;
  if ((tender.approvals || []).some((s) => s.byCollaboratorId === actorCollaboratorId)) return null;
  const step = firstUnsignedStep(plan, tender.approvals || []);
  return step && holds(step.permission) ? step : null;
}

/**
 * THE BID AS A SCREEN NEEDS TO DRAW IT: what it is worth, how it was routed,
 * how far it has got, and the step this viewer could sign.
 *
 * Handed the lines it was already given rather than reading them again — the
 * bill's own route has them in hand, so the whole block costs at most one FX
 * read and never a second collection read.
 */
export async function bidReview(ctx: TenderingContext, tender: Tender, lines: readonly BoqItem[]) {
  const value = bidValue(tender, lines);
  const plan = await bidPlan(ctx, tender, value);
  const holds = (permission: string) => !requirePermission(ctx.access, permission as PermissionKey);
  return {
    value,
    plan: plan.ok ? plan : null,
    // A TOKEN, NOT THE SENTENCE. resolveApprovalPlan writes English and the
    // studio is bilingual; refusals translate on display, keyed by what was
    // stored, exactly as stages do. Sending prose the screen cannot translate
    // puts an English apology on an Arabic page.
    blocked: plan.ok ? (value.complete ? null : "bill-incomplete") : plan.reason,
    signed: (tender.approvals || []).length,
    required: plan.ok ? plan.steps.length : 0,
    approved: planSatisfied(plan, tender.approvals || []),
    next: availableBidApproval(tender, value, plan, holds, ctx.collaborator.id),
    // WHY THERE IS NO BUTTON, when the reason is the one worth saying out loud.
    // Somebody who raised a tender and holds the right will otherwise look for
    // a control that is absent on purpose. The other reasons — not holding the
    // step's right, having already signed — are not the screen's business to
    // explain, because they are about who this person is rather than about the
    // record.
    mine: tender.createdByCollaboratorId === ctx.collaborator.id,
  };
}

/**
 * SIGN ONE STEP OF A BID.
 *
 * The walk is payables' walk: resolve the plan, find the first step still
 * outstanding, require THAT step's permission, record the signature. Access is
 * still resolved once (invariant 3) — this only asks a different question of
 * the set that was already resolved.
 */
export async function approveBid(ctx: TenderingContext, id: string) {
  // NO BLANKET GUARD FIRST, deliberately, and this is not an omission. The
  // right that opens this door is the STEP's, chosen at runtime below — a
  // `tendering.tenders.edit` check here would let somebody who may price a bid
  // sign it, which is the exact separation the feature exists for.
  const { studio, registerSection, collaborator } = ctx;
  const tender = await Tenders.byId({ studio, section: registerSection }, id);
  if (!tender) return { error: "notfound" };

  // A DECIDED TENDER IS HISTORY and a submitted one has already gone out;
  // signing either would be a signature given after the thing it authorises.
  if (tender.submittedAt) return { error: "already-submitted" };

  // INVARIANT 7, FIRST HALF: the person who raised it never signs it. Priced by
  // one, reviewed by another, or the review is a formality.
  if (tender.createdByCollaboratorId === collaborator.id) return { error: "same-signer" };

  const lines = await Items.find({ studio, section: registerSection }, { where: { tenderId: id } });
  const value = bidValue(tender, lines);

  // A PART-PRICED BILL CANNOT BE SIGNED OFF, and this is the rule that joins
  // this slice to slice 2. `boqTotals` returns `complete` precisely because the
  // total of a bill with unpriced lines is a number and NOT the bid; a
  // signature given against it authorises a figure that is going to change.
  // The bill's own screen already refuses to call that total the bid — the
  // approval refuses to sign it.
  if (!value.complete) return { error: "bill-incomplete" };

  const plan = await bidPlan(ctx, tender, value);
  // Passed through with its reason: "your studio has no currency" is fixed in
  // Studio settings and "this pair is not quoted today" is not, so sending both
  // to the same place would send half of them to the wrong one.
  if (!plan.ok) return { error: plan.reason, detail: plan.detail };

  const signatures: ApprovalSignature[] = tender.approvals || [];
  // INVARIANT 7, SECOND HALF, AND IT IS A DIFFERENT RULE: somebody who signed
  // an earlier step may not sign a later one. The invariant is about the RECORD
  // rather than the pair of rights — holding both stays legitimate, and a
  // second step the first signer can clear is not a second step.
  if (signatures.some((s) => s.byCollaboratorId === collaborator.id)) return { error: "same-signer" };

  const step = firstUnsignedStep(plan, signatures);
  if (!step) return { error: "already-approved" };

  const denied = requirePermission(ctx.access, step.permission as PermissionKey);
  if (denied) return denied;

  // CAPTURED ONCE. This is a function patch (invariant 8), so `updateRow` may
  // invoke it more than once — a CAS retry, or once per store under
  // NOMPANY_DB=parity — and a fresh `new Date()` inside the closure would
  // disagree between those invocations.
  const at = new Date().toISOString();
  const next: ApprovalSignature[] = [...signatures, {
    permission: step.permission,
    byCollaboratorId: collaborator.id,
    byAlias: collaborator.alias || "",
    at,
  }];

  const updated = await Tenders.update({ studio, section: registerSection }, id, () => ({
    approvals: next,
    // THE PLAN IS FROZEN ONTO THE RECORD, so the rate that routed this bid is
    // recorded with it and a rate moving overnight cannot re-route one already
    // mid-chain. Same reasoning, same field name, as a bill's.
    approvalPlan: plan,
    updatedAt: at,
  }));

  // NO STATUS IS WRITTEN, on any step. `TENDER_STAGES` gains no value: a bid
  // that has been signed is still Preparing until somebody submits it, and
  // approval is a precondition of that move rather than a stage of its own.
  // Every reader deriving from status keeps reading what it reads today.
  return updated
    ? { tender: updated, approved: planSatisfied(plan, next), signed: next.length, required: plan.steps.length }
    : { error: "notfound" };
}

/**
 * MAY THIS TENDER BE SUBMITTED? Read by `editTender` before a stage move.
 *
 * Its own function rather than a branch inside the move, because the SCREEN has
 * to ask the same question to decide whether to offer the button, and the two
 * answers must come from one place.
 */
export async function bidApproved(ctx: TenderingContext, tender: Tender): Promise<boolean> {
  const { studio, registerSection } = ctx;
  const lines = await Items.find({ studio, section: registerSection }, { where: { tenderId: tender.id } });
  const value = bidValue(tender, lines);
  if (!value.complete) return false;
  return planSatisfied(await bidPlan(ctx, tender, value), tender.approvals || []);
}
