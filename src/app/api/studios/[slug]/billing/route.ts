import { route } from "@/platform/http/route";
import {
  claimTransfer, ownerBillingView, requestRefund, saveBillingProfile, withdrawClaim,
} from "@/lib/data/customerBilling";
import { changeSeats, seatView } from "@/lib/data/seatBilling";
import { getSubscription } from "@/lib/data/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A STUDIO'S BILLING WITH NOMPANY, for its owner (26/09/2026): what it is on
// and until when, how to pay (the bank details from /super → Payments), the
// transfers they said they sent and what nompany answered, their invoices and
// credit notes, refund requests, and their own billing details.
//
// OWNER ONLY, and OPEN WHATEVER THE SUBSCRIPTION SAYS (shared/subscription's
// ALWAYS_OPEN): a closed or shut-down studio's owner is exactly the one who
// needs to pay and say so. API keys are refused — this is a person's page.
//
// SEATS ARE CHANGED HERE TOO (12/10/2026), by the owner and nobody else: more
// at once, billed on the next renewal; fewer from the renewal. The change
// itself refuses a studio that is not open (lib/data/seatBilling), so being on
// the always-open list does not let a closed studio buy credit.
const spec = { auth: "studio", name: "studio/billing", keys: false } as const;

type Owned = {
  studio: Record<string, unknown> & { id: string };
  collaborator: { role?: unknown };
  user: { id?: unknown };
};

const ownerOnly = (c: Owned) => (c.collaborator?.role === "owner" ? null : { error: "owner-only" });

export const GET = route(spec, async (c) => {
  const ctx = c as unknown as Owned & { request: Request };
  const refusal = ownerOnly(ctx);
  if (refusal) return refusal;
  const [view, doc] = await Promise.all([ownerBillingView(ctx.studio), getSubscription(ctx.studio.id)]);
  return { ...view, seats: await seatView(ctx.studio, doc, ctx.request.headers.get("x-vercel-ip-country")) };
});


export const POST = route({ ...spec, body: true }, async (c) => {
  const ctx = c as unknown as Owned & { body: Record<string, unknown> };
  const refusal = ownerOnly(ctx);
  if (refusal) return refusal;
  const { studio, body } = ctx;
  const userId = String(ctx.user?.id || "");
  switch (String(body.action || "")) {
    case "claim-transfer": {
      const out = await claimTransfer(studio, userId, body);
      return "error" in out ? out : { status: 201, body: out };
    }
    case "withdraw-claim": return withdrawClaim(studio.id, String(body.claimId || "").slice(0, 80));
    case "request-refund": {
      const out = await requestRefund(studio, userId, body);
      return "error" in out ? out : { status: 201, body: out };
    }
    case "save-profile": return saveBillingProfile(studio.id, body);
    case "change-seats": return changeSeats(studio, body);
    default: return { error: "unknown-action" };
  }
});
