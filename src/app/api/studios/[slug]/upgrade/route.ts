import { route } from "@/platform/http/route";
import { updateStudio } from "@/modules/main/studios";
import { buildPricing } from "@/modules/marketing/pricing";
import { notifySuper, NOTIFY } from "@/platform/notify/notifications";
import { quoteUpgrade, upgradablePackages, type Cycle } from "@/shared/upgradeQuote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE UPGRADE BUTTON'S DOOR — the owner choosing the package they want to pay
// for (the owner, 24/09/2026: an upgrade button in the studio header for
// Standard studios and on /account's owned studios).
//
// IT IS A REQUEST, NOT A GRANT. A package applies once paid and there is no
// checkout yet, so this stores the choice WITH ITS QUOTE on the studio as
// `upgradeRequest` and tells nompany; the console records the transfer against
// that package, which is what moves the studio (super/subscriptions). The quote
// is priced from the same regional price list the pricing page shows this
// owner, and locked on the request.
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

async function priceList(request: Request) {
  const pricing = await buildPricing(request.headers.get("x-vercel-ip-country"));
  return {
    currency: pricing.currency,
    taxPercent: pricing.taxPercent,
    region: pricing.region,
    cards: upgradablePackages(pricing),
    tiers: pricing.tiers || [],
  };
}

export const GET = route(spec, async (c) => {
  const ctx = c as unknown as Owned & { request: Request };
  const refusal = ownerOnly(ctx);
  if (refusal) return refusal;
  const { studio } = ctx;
  return {
    current: { packageId: String(studio.packageId || ""), tierId: String(studio.tierId || "") },
    requested: studio.requestedPlan || null,
    request: studio.upgradeRequest || null,
    list: await priceList(ctx.request),
  };
});

export const POST = route({ ...spec, body: true }, async (c) => {
  const ctx = c as unknown as Owned & { request: Request; body: Record<string, unknown> };
  const refusal = ownerOnly(ctx);
  if (refusal) return refusal;
  const { studio, collaborator, body } = ctx;

  const list = await priceList(ctx.request);
  const quote = quoteUpgrade(list, {
    packageId: String(body.packageId || ""),
    categoryId: String(body.categoryId || ""),
    tierId: String(body.tierId || ""),
    cycle: (body.cycle === "yearly" ? "yearly" : "monthly") as Cycle,
  });
  if ("error" in quote) return quote;

  const upgradeRequest = {
    ...quote,
    region: list.region?.name || "",
    requestedAt: new Date().toISOString(),
    requestedBy: collaborator.id,
  };
  const updated = await updateStudio(studio.id, { upgradeRequest });
  if (!updated) return { error: "notfound" };

  const pkg = list.cards.find((p) => String(p.id) === quote.packageId);
  await notifySuper({
    type: NOTIFY.system,
    title: "Upgrade requested",
    body: `${String(studio.name || "")} (nompany.com/${String(studio.slug || "")}) asked for ${String(pkg?.name || quote.packageId)}, ${quote.cycle}: ${quote.total} ${quote.currency} with tax.`,
    href: "/super/studios",
    tone: "info",
  });
  return { status: 201, body: { ok: true, request: upgradeRequest } };
});

/** Withdraws a request that has not been paid. */
export const DELETE = route(spec, async (c) => {
  const ctx = c as unknown as Owned;
  const refusal = ownerOnly(ctx);
  if (refusal) return refusal;
  const updated = await updateStudio(ctx.studio.id, { upgradeRequest: null });
  if (!updated) return { error: "notfound" };
  return { ok: true };
});
