import { route } from "@/platform/http/route";
import { getStudioById, updateStudio } from "@/modules/main/studios";
import { getCatalogSettings, listCatalog } from "@/lib/data/catalog";
import { getSubscription, recordEvent } from "@/lib/data/subscriptions";
import { accessFor, billingDay, ladderDates, subscriptionStatus, BILLING_PERIODS, LADDER, type BillingEvent } from "@/shared/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE STUDIO'S SUBSCRIPTION, for the console: what it is, what it may do today,
// and every event that made it so — and the hand-driven events an admin may
// record until a payment provider records them itself.
//
// THE EVENT ID COMES FROM THE CALLER, minted once per submission, so a button
// pressed twice or a request retried after a timeout is ONE event: the second
// is recognised by its id and changes nothing (shared/subscription). An action
// without one is refused rather than given a fresh id here, which would make
// every retry a second payment.
const spec = { auth: "super", name: "super/subscriptions/[studioId]" };

const ACTIONS = ["paid", "reversed", "failed", "comp", "trial-extended", "cancel", "resume", "plan-changed"] as const;

export const GET = route(spec, async ({ params }) => {
  const studio = await getStudioById(params.studioId);
  if (!studio) return { error: "notfound" };
  const [doc, settings] = await Promise.all([getSubscription(studio.id), getCatalogSettings()]);
  const today = billingDay();
  const status = subscriptionStatus(doc.subscription, today);
  return {
    subscription: doc.subscription,
    // Newest first: the question is almost always "what happened last".
    history: [...doc.history].reverse(),
    status,
    access: accessFor(status),
    today,
    // Every step of the ladder as it stands, so the console can say exactly
    // when this studio closes, shuts down and is deleted if nothing is paid.
    dates: ladderDates(doc.subscription),
    ladder: LADDER,
    trialMonths: settings.trialMonths,
    // WHAT THE OWNER ASKED TO PAY FOR (the upgrade button, 24/09/2026): the
    // package, band, tier, cycle and the price quoted in their region, locked on
    // the request. The panel shows it and fills the payment form from it.
    upgradeRequest: studio.upgradeRequest || null,
  };
});

export const POST = route({ ...spec, body: true }, async ({ params, body, admin }) => {
  const studio = await getStudioById(params.studioId);
  if (!studio) return { error: "notfound" };

  const type = String(body.type || "");
  if (!(ACTIONS as readonly string[]).includes(type)) return { error: "unknown-event" };
  const id = String(body.eventId || "").trim().slice(0, 80);
  if (!id) return { error: "missing-id" };

  // THE BODY IS NARROWED FIELD BY FIELD. An event is what moves a customer's
  // paid-until date, so nothing the request carries reaches it unnamed.
  const text = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
  let event: BillingEvent;
  switch (type) {
    case "paid": {
      // THE PACKAGE THIS MONEY IS FOR, validated against the catalogue: a
      // package applies to the studio it was paid for, once paid (24/09/2026).
      const packageId = text(body.packageId, 80);
      const tierId = text(body.tierId, 80);
      if (packageId && !(await listCatalog("packages")).some((p) => p.id === packageId)) return { error: "unknown-package" };
      if (tierId && !(await listCatalog("tiers")).some((t) => t.id === tierId)) return { error: "unknown-tier" };
      event = {
        id, type, periods: Number(body.periods),
        amount: Number(body.amount) || 0, currency: text(body.currency, 3).toUpperCase(),
        method: text(body.method, 40) || "bank-transfer", reference: text(body.reference),
        ...(packageId ? { packageId } : {}), ...(tierId ? { tierId } : {}),
        ...(body.seats !== undefined && body.seats !== "" ? { seats: Number(body.seats) } : {}),
        ...(BILLING_PERIODS.includes(body.period) ? { period: body.period } : {}),
      };
      break;
    }
    case "reversed": event = { id, type, periods: Number(body.periods), reason: text(body.reason, 300) }; break;
    case "failed": event = { id, type, reason: text(body.reason, 300) }; break;
    case "comp": event = { id, type, on: Boolean(body.on) }; break;
    case "trial-extended": event = { id, type, until: text(body.until, 10) }; break;
    case "cancel": event = { id, type }; break;
    case "resume": event = { id, type }; break;
    default:
      event = {
        id, type: "plan-changed",
        ...(body.seats !== undefined ? { seats: Number(body.seats) } : {}),
        ...(BILLING_PERIODS.includes(body.period) ? { period: body.period } : {}),
      };
  }

  const out = await recordEvent(studio.id, event, `super:${admin.id}`);
  if (out.problem) return { error: out.problem };
  // THE PAID-FOR PACKAGE TAKES EFFECT ONLY ONCE THE PAYMENT HAS BEEN APPLIED —
  // and only the first time: a repeated event id changed nothing, so it moves
  // nothing on the studio either.
  if (out.changed && event.type === "paid" && (event.packageId || event.tierId)) {
    await updateStudio(studio.id, {
      ...(event.packageId ? { packageId: event.packageId } : {}),
      ...(event.tierId ? { tierId: event.tierId } : {}),
      // THE REQUEST IS ANSWERED once a payment moves the studio onto a package:
      // leaving it would keep the owner's dialog saying "you asked for this".
      upgradeRequest: null,
    });
  }
  return { ok: true, changed: out.changed, subscription: out.subscription };
});
