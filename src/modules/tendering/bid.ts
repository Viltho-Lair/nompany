// BID REVIEW — who signs a bid, and above what value.
//
// THE GAP THIS CLOSES, stated in tendering.md since the register shipped: *"a
// bid going out at a price nobody senior signed"*. A tender could be moved to
// Submitted by anybody holding `tendering.tenders.edit` — the same right that
// types a line into the bill — so the person who priced the work was also the
// person who committed the company to it.
//
// IT IS ANSWERED ON THE APPROVALS PAGE since 19/09/2026 (the owner: the request
// stays where it is made, the answer moves to Approvals). The bill's screen asks
// for it (type `bid`); the people who answer, and the value each step starts at,
// are Approvals settings'. Until a studio saves the type they are whoever could
// sign a bid before — `tendering.tenders.approve` from 0 and `.approveHigh` from
// 500,000, or the studio's own limits — plus the owner and Admins.
//
// NOTHING IS WRITTEN ON THE TENDER WHEN IT IS APPROVED. Submitting is gated on
// its approval (`bidApproved`), read from the approval itself — and only while
// the approval is for the value the bid now has. A bill repriced after its yes
// is a different promise, and the yes does not stretch to it.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { approvalPreflight, approvalRows, requestApproval } from "@/modules/approvals/approvals";
import { approvalSummary, type ApprovalCarry } from "@/modules/approvals/reads";
import { latestFor } from "@/modules/approvals/model";
import type { Refusal } from "@/modules/approvals/effects";
import type { Approval } from "@/modules/approvals/schema";
import type { StudioRef } from "@/modules/context";
import { roundMoney } from "@/shared/money";
import { boqTotals, valueFromBoq } from "./boq";
import type { BoqItem, Tender } from "./schema";
import type { TenderingContext } from "./types";

const Items = repo<BoqItem>("boqItems");
const Tenders = repo<Tender>("tenders");

/** The approval type a bid asks for. Its key is stored — see modules/approvals/registry. */
export const BID_APPROVAL = "bid";

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

export function bidValue(tender: Tender, lines: readonly BoqItem[], studioCurrency?: unknown): BidValue {
  // Priced in the TENDER's currency, falling back to the studio's as the tender
  // does everywhere else — money follows its currency's decimals, and a dinar
  // has three.
  const totals = boqTotals(lines, String(tender?.currency || "") || studioCurrency);
  const fromBoq = valueFromBoq(totals);
  if (fromBoq === null) {
    // No bill at all. A studio may bid on a typed figure — plenty of tenders
    // are priced outside this product — and `complete` is true because there is
    // no part-priced bill to be wrong about, not because anything was checked.
    return { amount: Number(tender?.estimatedValue) || 0, basis: "estimate", complete: true, lines: 0 };
  }
  return { amount: fromBoq, basis: "boq", complete: totals.complete, lines: totals.lines };
}

/** What the approval is asked about: the bid's value, in the tender's own currency. */
const amountOf = (ctx: Pick<TenderingContext, "studio">, tender: Tender, value: BidValue) => ({
  value: value.amount,
  currency: String(tender.currency || ctx.studio.currency || ""),
});

/**
 * IS THIS APPROVAL FOR THE BID AS IT STANDS? Its frozen amount against the value
 * now, to the currency's own minor unit. A bill repriced after its approval was
 * asked for is a different promise.
 */
function coversValue(approval: Pick<Approval, "amount"> | null | undefined, value: BidValue, currency: unknown) {
  if (!approval?.amount) return false;
  return roundMoney(approval.amount.value, currency) === roundMoney(value.amount, currency);
}

/**
 * THE BID AS A SCREEN NEEDS TO DRAW IT: what it is worth, how far its approval
 * has got — read from the approval — whether that approval is still for this
 * value, and whether this reader may ask for one now.
 *
 * A BID PART-SIGNED BEFORE 19/09/2026 is given its approval here, in the name
 * of whoever raised the tender, carrying the signatures it had, so nobody signs
 * twice. Once: a filed one is found on the next read.
 *
 * Handed the lines it was already given rather than reading them again — the
 * bill's own route has them in hand.
 */
export async function bidReview(ctx: TenderingContext, tender: Tender, lines: readonly BoqItem[]) {
  const value = bidValue(tender, lines, ctx.studio.currency);
  const currency = tender.currency || ctx.studio.currency;
  const rows = await approvalRows(ctx.studio, ctx.approvalsSection);

  if (!tender.submittedAt && (tender.approvals || []).length && !latestFor(rows, BID_APPROVAL, tender.id) && ctx.approvalsSection) {
    const people = await listCollaborators(ctx.studio.id);
    const raiser = (people as { id?: unknown }[]).find((c) => String(c.id) === String(tender.createdByCollaboratorId || ""));
    if (raiser) {
      const asked = await askForBid(
        { studio: ctx.studio, collaborator: raiser as TenderingContext["collaborator"], roles: ctx.roles }, tender, value,
        (tender.approvals || []).map((x) => ({ collaboratorId: x.byCollaboratorId, at: x.at })),
      );
      if (asked.approval) rows.push(asked.approval);
    }
  }

  const latest = latestFor(rows, BID_APPROVAL, tender.id);
  const approval: ApprovalCarry | null = approvalSummary(rows, BID_APPROVAL, tender.id);
  const current = coversValue(latest, value, currency);
  return {
    value,
    approval,
    // THE APPROVAL IS FOR ANOTHER PRICE: the bill moved after it was asked for.
    stale: Boolean(latest) && !current,
    blocked: value.complete ? null : "bill-incomplete",
    approved: latest?.status === "Approved" && current,
    // ASKING: a bid not yet out, fully priced, with nothing waiting — or whose
    // last answer was a no, or a yes for a price it no longer has.
    canRequest: !tender.submittedAt && value.complete && !requirePermission(ctx.access, "tendering.tenders.edit")
      && (!latest || latest.status === "Rejected" || !current),
  };
}

/** File the bid's approval. `carried` is the old engine's signatures, for a bid part-signed before. */
async function askForBid(
  requester: { studio: StudioRef; collaborator: TenderingContext["collaborator"]; roles: TenderingContext["roles"] },
  tender: Tender, value: BidValue, carried: { collaboratorId: string; at: string }[] = [],
) {
  return requestApproval(requester, {
    type: BID_APPROVAL,
    source: {
      sectionKey: "tendering-register", recordId: tender.id, ref: String(tender.ref || ""),
      title: `${tender.ref || ""} · ${tender.title || ""}`, path: `tendering-register/${tender.id}`,
    },
    note: value.basis === "boq" ? "Priced from the bill of quantities" : "Priced from the typed estimate",
    amount: amountOf(requester, tender, value),
    carried,
  });
}

/**
 * ASK FOR A BID'S APPROVAL — the Request approval button beside the bill.
 *
 * A PART-PRICED BILL CANNOT BE ASKED ABOUT: `boqTotals` returns `complete`
 * precisely because the total of a bill with unpriced lines is a number and NOT
 * the bid, and an approval given against it would authorise a figure that is
 * going to change.
 */
export async function requestBidApproval(ctx: TenderingContext, id: string) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;
  const { studio, registerSection } = ctx;
  const tender = await Tenders.byId({ studio, section: registerSection }, String(id));
  if (!tender) return { error: "notfound" };
  // A SUBMITTED BID HAS ALREADY GONE OUT; an approval now would be given after
  // the thing it authorises.
  if (tender.submittedAt) return { error: "already-submitted" };
  const lines = await Items.find({ studio, section: registerSection }, { where: { tenderId: tender.id } });
  const value = bidValue(tender, lines, studio.currency);
  if (!value.complete) return { error: "bill-incomplete" };
  const asked = await askForBid({ studio, collaborator: ctx.collaborator, roles: ctx.roles }, tender, value);
  if (asked.error) return { ...asked, error: asked.error };
  return { tender, approval: asked.approval ?? null, notNeeded: Boolean(asked.notNeeded) };
}

/**
 * MAY THIS TENDER BE SUBMITTED? Read by `editTender` before a stage move, from
 * the approval itself: the newest bid approval is Approved AND is for the value
 * the bid has now. Under every limit the studio set nothing needs asking, and
 * the bid may go.
 */
export async function bidApproved(ctx: TenderingContext, tender: Tender): Promise<boolean> {
  const { studio, registerSection } = ctx;
  const lines = await Items.find({ studio, section: registerSection }, { where: { tenderId: tender.id } });
  const value = bidValue(tender, lines, studio.currency);
  if (!value.complete) return false;
  const latest = latestFor(await approvalRows(studio, ctx.approvalsSection), BID_APPROVAL, tender.id);
  if (latest) return latest.status === "Approved" && coversValue(latest, value, tender.currency || studio.currency);
  // NOBODY ASKED: allowed only when asking would not have been needed at all.
  const preflight = await approvalPreflight({ studio, collaborator: ctx.collaborator, roles: ctx.roles },
    { type: BID_APPROVAL, amount: amountOf(ctx, tender, value) });
  return !("error" in preflight) && preflight.needed === false;
}

/** The tender an approval names, in a context carrying the studio's authority. */
async function tenderFor(studio: StudioRef, approval: Approval, byCollaboratorId: string) {
  // IMPORTED WHEN NEEDED: ./tenders imports this file.
  const { tenderingContext } = await import("./tenders");
  const ctx = await tenderingContext.asApprover(studio.id, byCollaboratorId);
  if (ctx.error) return { error: ctx.error } as Refusal;
  const tender = await Tenders.byId({ studio: ctx.studio, section: ctx.registerSection }, approval.source.recordId);
  return tender ? { ctx, tender } : ({ error: "notfound" } as Refusal);
}

/**
 * WHAT DECIDING A `bid` APPROVAL DOES — see modules/approvals/effects. Only the
 * check before the last yes: the tender moves nothing when approved (submitting
 * reads the approval), so the one thing worth refusing is a yes to a bid that
 * has already gone out or whose bill is no longer fully priced.
 */
export const bidApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await tenderFor(studio, approval, by);
    if ("error" in found) return found;
    if (found.tender.submittedAt) return { error: "already-submitted" } as Refusal;
    const lines = await Items.find({ studio: found.ctx.studio, section: found.ctx.registerSection }, { where: { tenderId: found.tender.id } });
    return bidValue(found.tender, lines, studio.currency).complete ? null : ({ error: "bill-incomplete" } as Refusal);
  },
};
