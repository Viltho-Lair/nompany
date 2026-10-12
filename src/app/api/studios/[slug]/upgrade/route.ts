import { route } from "@/platform/http/route";
import { listCollaborators } from "@/platform/auth/collaborators";
import { buyPlan, priceListFor, withdrawPlan } from "@/lib/data/seatBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE UPGRADE BUTTON'S DOOR — the owner choosing the plan they want to pay
// for (the owner, 24/09/2026: an upgrade button in the studio header for
// Standard studios and on /account's owned studios).
//
// THE OWNER CHOOSES A SEAT COUNT (12/10/2026), not a band: they pay for exactly
// the seats they ask for (shared/seatPricing).
//
// IT IS A REQUEST, NOT A GRANT. A package applies once paid, so this stores a
// PURCHASE payment request with its quote locked (lib/data/seatBilling) and
// tells nompany; the transfer confirmed against it is what moves the studio.
// The quote is priced from the same regional price list the pricing page shows
// this owner.
//
// OWNER ONLY, and OPEN WHATEVER THE SUBSCRIPTION SAYS (shared/subscription's
// ALWAYS_OPEN): a closed or shut-down studio is exactly the one whose owner
// most needs to ask to pay.
//
// THE PACKAGE THEY PICKED WHEN SIGNING UP rides along as `requested`
// (studio.requestedPlan, lib/studioCompany), so the dialog opens on it. Studios
// created before that existed have none and open on a plain choice.
const spec = { auth: "studio", name: "studio/upgrade", keys: false } as const;

type Owned = { studio: Record<string, unknown> & { id: string; name?: unknown; slug?: unknown }; collaborator: { id: string; role?: unknown } };

const ownerOnly = (c: Owned) => (c.collaborator?.role === "owner" ? null : { error: "owner-only" });
const visitor = (request: Request) => request.headers.get("x-vercel-ip-country");

export const GET = route(spec, async (c) => {
  const ctx = c as unknown as Owned & { request: Request };
  const refusal = ownerOnly(ctx);
  if (refusal) return refusal;
  const { studio } = ctx;
  return {
    current: { packageId: String(studio.packageId || ""), tierId: String(studio.tierId || "") },
    requested: studio.requestedPlan || null,
    request: studio.upgradeRequest || null,
    // The seat field cannot go below the people already in the studio.
    members: (await listCollaborators(studio.id)).length,
    list: await priceListFor(visitor(ctx.request)),
  };
});

export const POST = route({ ...spec, body: true }, async (c) => {
  const ctx = c as unknown as Owned & { request: Request; body: Record<string, unknown> };
  const refusal = ownerOnly(ctx);
  if (refusal) return refusal;
  const out = await buyPlan(ctx.studio, ctx.collaborator.id, ctx.body, visitor(ctx.request));
  return "error" in out ? out : { status: 201, body: out };
});

/** Withdraws a request that has not been paid. */
export const DELETE = route(spec, async (c) => {
  const ctx = c as unknown as Owned;
  const refusal = ownerOnly(ctx);
  if (refusal) return refusal;
  return withdrawPlan(ctx.studio);
});
