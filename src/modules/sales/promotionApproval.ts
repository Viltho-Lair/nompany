// WHO SAYS YES TO AN OFFER, AND ABOVE WHAT IT COULD COST.
//
// ACTIVATION IS THE ACT THAT SPENDS MONEY. Writing an offer costs nothing —
// a draft prices no basket — so the signature belongs on the move to `active`
// and nowhere else. Editing a live one is already impossible (it is paused
// first), which is what keeps this from being a gate somebody walks round by
// activating something harmless and then rewriting it.
//
// WHAT AN OFFER IS WORTH IS WHAT IT COULD COST, AT MOST — the per-sale cap
// times the number of times it may be used. BOTH have to be set for that to be
// a number at all, and an offer that caps neither could cost the shop any
// amount whatever. That is NULL, and null walks every step: an amount nobody
// knows cannot be under a limit. The same rule a requisition with an
// unestimated line follows, for the same reason.
//
// THE THRESHOLD IS THE STUDIO'S, and it is not a new setting: it is the `from`
// on each step of the `promotion` type in Approvals settings, the one place
// every other approvable record's limits are already kept.

import { repo } from "@/platform/db/repo";
import { approvalPreflight, requestApproval, type RequestOutcome } from "@/modules/approvals/approvals";
import type { Refusal } from "@/modules/approvals/effects";
import type { Approval } from "@/modules/approvals/schema";
import type { StudioRef } from "@/modules/context";
import type { PosPromotion } from "./posPromotions";
import type { PosContext } from "./types";

const Promotions = repo<PosPromotion>("posPromotions");

/** The approval type activating an offer asks for. Its key is stored — see modules/approvals/registry. */
export const PROMOTION_APPROVAL = "promotion";

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * THE MOST THIS OFFER COULD EVER COST — or null when it is unbounded.
 *
 * No currency conversion: an offer's caps are typed in the money the studio
 * works in, the way a requisition's estimates are, so nothing is converted and
 * a rate moving overnight cannot re-route an offer already mid-chain.
 */
export function promotionExposure(p: Pick<PosPromotion, "maxDiscountAmount" | "maxUsesTotal">, studio: StudioRef) {
  const perSale = p.maxDiscountAmount;
  const uses = p.maxUsesTotal;
  if (perSale == null || uses == null) return null;
  return { value: num(perSale) * num(uses), currency: String(studio.currency || "") };
}

type Requester = { studio: StudioRef; collaborator: PosContext["collaborator"]; roles: PosContext["roles"] };

/** Does activating this offer need asking, and is there anybody to ask? */
export function activationPreflight(requester: Requester, p: PosPromotion) {
  return approvalPreflight(requester, {
    type: PROMOTION_APPROVAL,
    amount: promotionExposure(p, requester.studio),
  });
}

/** File the request. The offer stays where it is until somebody answers. */
export function askToActivate(requester: Requester, p: PosPromotion): Promise<RequestOutcome> {
  return requestApproval(requester, {
    type: PROMOTION_APPROVAL,
    source: {
      sectionKey: "pos-promotions", recordId: p.id, ref: p.code,
      title: `${p.code} · ${p.name}`, path: "pos-promotions",
    },
    note: String(p.description || "").slice(0, 4000),
    amount: promotionExposure(p, requester.studio),
  });
}

/** The offer an approval names, with the studio's authority behind the read. */
async function promotionFor(studio: StudioRef, approval: Approval, byCollaboratorId: string) {
  // IMPORTED WHEN NEEDED: ./posPromotions imports this file.
  const { posContext } = await import("./pos");
  const ctx = await posContext.asApprover(studio.id, byCollaboratorId);
  if (ctx.error) return { error: ctx.error } as Refusal;
  const scope = { studio: ctx.studio, section: ctx.promotionsSection };
  const promotion = await Promotions.byId(scope, approval.source.recordId);
  return promotion ? { scope, promotion } : ({ error: "notfound" } as Refusal);
}

/**
 * WHAT DECIDING A `promotion` APPROVAL DOES — see modules/approvals/effects.
 *
 * A YES ACTIVATES IT; A NO LEAVES IT EXACTLY WHERE IT WAS. There is no
 * "rejected" state for an offer, deliberately: a refused offer is a draft
 * somebody may rewrite and ask about again, and a status meaning "somebody said
 * no once" would be a dead end nothing could leave.
 */
export const promotionApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await promotionFor(studio, approval, by);
    if ("error" in found) return found;
    return found.promotion.status === "active"
      ? ({ error: "already-decided", status: "active" } as Refusal)
      : null;
  },
  approved: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await promotionFor(studio, approval, by);
    if ("error" in found) return found;
    const at = new Date().toISOString();
    // A FUNCTION PATCH, because "flip this field" has to stay a flip under
    // contention (invariant 8) — two people answering at once must not write
    // one another's whole row back.
    await Promotions.update(found.scope, found.promotion.id, (row) => (
      row.status === "archived" || row.status === "ended" ? row : {
        ...row, status: "active", updatedAt: at, updatedByCollaboratorId: by,
      }));
    return "done" as const;
  },
  rejected: async () => "done" as const,
};
