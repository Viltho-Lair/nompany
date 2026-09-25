import { route } from "@/platform/http/route";
import {
  claimTransfer, ownerBillingView, requestRefund, saveBillingProfile, withdrawClaim,
} from "@/lib/data/customerBilling";

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
const spec = { auth: "studio", name: "studio/billing", keys: false } as const;

type Owned = {
  studio: Record<string, unknown> & { id: string };
  collaborator: { role?: unknown };
  user: { id?: unknown };
};

const ownerOnly = (c: Owned) => (c.collaborator?.role === "owner" ? null : { error: "owner-only" });

export const GET = route(spec, async (c) => {
  const ctx = c as unknown as Owned;
  return ownerOnly(ctx) || ownerBillingView(ctx.studio);
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
    default: return { error: "unknown-action" };
  }
});
