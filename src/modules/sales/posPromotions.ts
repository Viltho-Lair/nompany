// THE OFFERS A TILL PRICES WITH — Point of Sale → Promotions (22/09/2026).
// `docs/functionality/promotions.md` is the file.
//
// WHAT IS HERE AND WHAT IS NOT. This file is the doors: who may read an offer,
// who may write one, and what is stored. The arithmetic — which offers a basket
// earns and what each takes off — is `./posPromotionsModel`, pure, so the till
// and the server run the same function and cannot disagree about a price, the
// way `posModel.priceBasket` already works for the cashier's own discount.
//
// AN OFFER IS NEVER READ BACK BY A RETURN. What a promotion took off a sale is
// frozen onto the receipt when the sale is made; editing or ending an offer
// afterwards moves nothing already sold.

import { requirePermission, can } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import type { PosContext } from "./types";

/** An offer, as stored. The full shape arrives with the engine; this is its spine. */
export type PosPromotion = {
  id: string;
  /** Internal, and what reports call it by: PRM-0001. */
  code: string;
  name: string;
  /** The studio's own Arabic name, when it has one — the receipt prints in the reader's language. */
  nameAr?: string;
  description?: string;
  status: "draft" | "active" | "paused" | "ended" | "archived";
  createdAt: string;
  createdByCollaboratorId: string;
};

const Promotions = repo<PosPromotion>("posPromotions");
const scope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.promotionsSection });

/** Every offer, newest first, with what this reader may do about them. */
export async function promotionsView(ctx: PosContext) {
  const denied = requirePermission(ctx.access, "pos.promotions.view");
  if (denied) return denied;

  const rows = await Promotions.find(scope(ctx));
  return {
    promotions: [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    can: {
      create: can(ctx.access, "pos.promotions.create"),
      edit: can(ctx.access, "pos.promotions.edit"),
    },
    asOf: new Date().toISOString(),
  };
}
