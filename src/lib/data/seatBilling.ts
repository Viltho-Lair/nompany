// SEATS AN OWNER BUYS, AND WHAT THEY ARE BILLED FOR THEM — the owner,
// 12/10/2026: the system runs by itself; an owner chooses how many users they
// need and is billed for exactly those, changes are theirs to make, and the
// bill follows without nompany stepping in.
//
// THE RULES, decided with the owner the same day:
//  - BUYING a plan (from Standard, or onto a package the studio is not on)
//    issues a PURCHASE request for the first period, in full. It applies once
//    paid, like every package (24/09/2026).
//  - ADDING seats raises the limit AT ONCE. What the days left in the period
//    cost is recorded, locked that day, and billed on the NEXT renewal — the
//    owner: "seats billed on next renewal". No payment is needed there and
//    then, which a bank transfer could not give anyway.
//  - REDUCING seats waits for the renewal and refunds nothing. Never below the
//    members the studio has: the owner removes people first.
//  - ON THE DAY A PERIOD STARTS the daily job issues a RENEWAL request: the
//    seats for the new period plus the seats added during the last one. That
//    day is day 0 of the unpaid ladder, exactly as before.
//  - A REQUEST IS NOT A TAX INVOICE (shared/paymentRequests says why). The
//    invoice is still issued when the money arrives, with the request's lines.
//
// This is nompany billing ITS customers. It is not a studio's own Finance.

import { editJSON, readArr } from "@/platform/db/store";
import { BILLING, REG } from "@/platform/db/keys";
import { listCollaborators } from "@/platform/auth/collaborators";
import { updateStudio } from "@/modules/main/studios";
import { buildPricing } from "@/modules/marketing/pricing";
import { getSubscription, recordEvent, effectiveAccess, subscriptionDocs, type SubscriptionDoc } from "./subscriptions";
import { tellNompany, tellOwner } from "./customerBilling";
import { billingDay, periodMonths, type SeatCharge } from "@/shared/subscription";
import { roundMoney } from "@/shared/money";
import { periodAround, periodPrice, priceSeats, prorate, seatBands } from "@/shared/seatPricing";
import { quoteSeats, upgradablePackages, type Cycle, type PriceList } from "@/shared/upgradeQuote";
import { buildRequest, openRequest, renewalDue, renewalId, type PaymentRequest } from "@/shared/paymentRequests";
import { openTransfer } from "@/shared/billingClaims";

type Studio = Record<string, unknown> & { id: string };

/** The price list an owner is quoted from: their region's, the packages they may buy, the tiers. */
export async function priceListFor(country: string | null | undefined) {
  const pricing = await buildPricing(country);
  return {
    currency: pricing.currency,
    taxPercent: pricing.taxPercent,
    yearlyDiscountPct: pricing.yearlyDiscountPct,
    region: pricing.region,
    cards: upgradablePackages(pricing),
    tiers: pricing.tiers || [],
  } satisfies PriceList & Record<string, unknown>;
}
type List = Awaited<ReturnType<typeof priceListFor>>;

const country = (v: unknown) => String(v || "").trim().slice(0, 2).toUpperCase();
const names = (list: List, packageId: string, tierId: string) => ({
  packageName: String(list.cards.find((c) => String(c.id) === packageId)?.name || ""),
  tierName: String(list.tiers.find((t) => String(t.id) === tierId)?.name || ""),
});

/** A seat plan: paid, with a seat count bought. Complimentary, free and fixed-size studios are not on one. */
const onSeatPlan = (doc: SubscriptionDoc) => doc.subscription.kind === "paid" && doc.subscription.seats > 0;

// ---- what the owner sees ---------------------------------------------------------

/**
 * THE SEATS PANEL ON THE OWNER'S BILLING PAGE: what they have, what is used,
 * what waits for the renewal, what has been added and not billed, and what the
 * next renewal will ask for as things stand — so nobody is surprised by it.
 */
export async function seatView(studio: Studio, doc: SubscriptionDoc, visitorCountry: string | null | undefined) {
  const sub = doc.subscription;
  const members = (await listCollaborators(studio.id)).length;
  const base = { members, seats: sub.seats, seatsNext: sub.seatsNext || 0, onPlan: onSeatPlan(doc), accrued: sub.accrued || [] };
  if (!base.onPlan) return { ...base, next: null, range: null, perSeat: [] as { label: string; rate: number }[], currency: "" };
  const list = await priceListFor(sub.priceCountry || visitorCountry);
  const card = list.cards.find((c) => String(c.id) === String(studio.packageId || ""));
  const bands = seatBands(card);
  const seats = Math.max(base.seatsNext || sub.seats, members);
  const quote = quoteSeats(list, { packageId: String(studio.packageId || ""), seats, tierId: String(studio.tierId || ""), cycle: sub.period });
  const charges = (sub.accrued || []).filter((c) => c.currency === list.currency);
  const next = "error" in quote ? null : {
    on: sub.paidUntil, seats, currency: quote.currency,
    amount: roundMoney(quote.amount + charges.reduce((s, c) => s + c.amount, 0), quote.currency),
    taxPercent: quote.taxPercent,
  };
  return {
    ...base, next, currency: list.currency,
    range: bands.length ? { min: bands[0].min, max: bands.some((b) => b.max === 0) ? 0 : bands[bands.length - 1].max } : null,
    perSeat: bands.map((b) => ({ label: b.label, rate: b.rate })),
  };
}

// ---- the owner's acts ------------------------------------------------------------

/**
 * THE OWNER CHOOSES A PLAN — a package, a seat count, a tier, a cycle. Stored
 * as a PURCHASE request with its quote locked, and mirrored on the studio as
 * `upgradeRequest` for the console's panel, which fills "record payment" from it.
 *
 * ONE OPEN REQUEST AT A TIME: a new choice replaces an open purchase request,
 * but not a renewal (that is a bill for time already used), and not while a
 * transfer the owner said they sent is waiting — the money could be for it.
 */
export async function buyPlan(studio: Studio, collaboratorId: string, body: Record<string, unknown>, visitorCountry: string | null | undefined) {
  const list = await priceListFor(visitorCountry);
  const quote = quoteSeats(list, {
    packageId: String(body.packageId || ""),
    seats: Number(body.seats),
    tierId: String(body.tierId || ""),
    cycle: (body.cycle === "yearly" ? "yearly" : "monthly") as Cycle,
  });
  if ("error" in quote) return quote;
  const members = (await listCollaborators(studio.id)).length;
  if (quote.seats < members) return { error: "fewer-than-members", members };

  const doc = await getSubscription(studio.id);
  if (openTransfer(doc.claims)) return { error: "claim-open" };
  const open = openRequest(doc.requests);
  if (open?.kind === "renewal") return { error: "renewal-open" };

  const at = new Date().toISOString();
  const today = billingDay(at);
  const priceCountry = country(visitorCountry);
  const request = buildRequest({
    id: `purchase:${at}`, kind: "purchase", quote, at, today, from: today, priceCountry,
    ...names(list, quote.packageId, quote.tierId),
  });
  await editJSON<SubscriptionDoc, void>(BILLING.subscription(studio.id), (cur) => {
    if (!cur?.subscription) return { result: undefined };
    const requests = (cur.requests || []).map((r) => (r.status === "open" && r.kind === "purchase" ? { ...r, status: "void" as const } : r));
    return { next: { ...cur, requests: [...requests, request].slice(-120) }, result: undefined };
  });

  const upgradeRequest = {
    ...quote, requestId: request.id, priceCountry,
    region: list.region?.name || "", requestedAt: at, requestedBy: collaboratorId,
  };
  await updateStudio(studio.id, { upgradeRequest });
  const pkg = list.cards.find((p) => String(p.id) === quote.packageId);
  await tellNompany(
    "Plan requested",
    `${String(studio.name || "")} (sittaerp.com/${String(studio.slug || "")}) asked for ${String(pkg?.name || quote.packageId)}, ${quote.seats} seats, ${quote.cycle}: ${quote.total} ${quote.currency} with tax.`,
    "info",
  );
  return { ok: true, request: upgradeRequest };
}

/** The owner takes back a plan they asked for and have not paid. */
export async function withdrawPlan(studio: Studio) {
  await editJSON<SubscriptionDoc, void>(BILLING.subscription(studio.id), (cur) => {
    if (!cur?.subscription) return { result: undefined };
    const requests = (cur.requests || []).map((r) => (r.status === "open" && r.kind === "purchase" ? { ...r, status: "void" as const } : r));
    return { next: { ...cur, requests }, result: undefined };
  });
  await updateStudio(studio.id, { upgradeRequest: null });
  return { ok: true };
}

/**
 * THE OWNER CHANGES HOW MANY SEATS THEY HAVE. More takes effect now and is
 * billed on the next renewal; fewer takes effect at the renewal.
 *
 * ONLY ON A SEAT PLAN THAT IS OPEN. A studio on Standard buys a plan first; a
 * closed studio pays first — adding seats to a studio that is not paying would
 * be credit nobody decided to give.
 */
export async function changeSeats(studio: Studio, body: Record<string, unknown>) {
  const want = Math.trunc(Number(body.seats) || 0);
  const doc = await getSubscription(studio.id);
  if (!onSeatPlan(doc)) return { error: "no-seat-plan" };
  const { access } = await effectiveAccess(doc);
  if (access !== "full") return { error: "studio-closed" };
  const sub = doc.subscription;

  const list = await priceListFor(sub.priceCountry);
  const card = list.cards.find((c) => String(c.id) === String(studio.packageId || ""));
  if (!card) return { error: "package-not-on-sale" };
  const bands = seatBands(card);
  const priced = priceSeats(bands, want, list.currency);
  if ("error" in priced) return priced;
  const members = (await listCollaborators(studio.id)).length;

  const at = new Date().toISOString();
  const today = billingDay(at);
  const id = `seats:${String(body.changeId || at).slice(0, 80)}`;

  if (want > sub.seats) {
    // WHAT THE DAYS LEFT COST: the period's price with the new count less its
    // price with the old, for the share of the period still to run.
    const before = priceSeats(bands, sub.seats, list.currency);
    const months = periodMonths(sub.period);
    const { to } = periodAround(sub.paidUntil, months, sub.anchorDay, today);
    const discount = list.yearlyDiscountPct;
    const whole = (m: number) => periodPrice(m, sub.period, discount, list.currency);
    // A count below what the package sells today (bands moved since it was
    // bought) has no price of its own; the new count is then charged in full.
    const beforeAmount = "error" in before ? 0 : whole(before.monthly);
    const { amount } = prorate({ before: beforeAmount, after: whole(priced.monthly), from: today, to, today, currency: list.currency });
    const charge: SeatCharge = { id, at, from: today, to, seatsBefore: sub.seats, seatsAfter: want, amount, currency: list.currency };
    const out = await recordEvent(studio.id, { id, type: "seats-added", seats: want, charge }, `owner:${String(studio.ownerUserId || "")}`);
    if (out.problem) return { error: out.problem };
    return { ok: true, seats: want, charge };
  }

  if (want === sub.seats && !sub.seatsNext) return { error: "no-change" };
  if (want < members) return { error: "fewer-than-members", members };
  const out = await recordEvent(studio.id, { id, type: "seats-reduced", seats: want }, `owner:${String(studio.ownerUserId || "")}`);
  if (out.problem) return { error: out.problem };
  return { ok: true, seats: sub.seats, seatsNext: out.subscription.seatsNext || 0, from: sub.paidUntil };
}

// ---- the daily job -----------------------------------------------------------------

/**
 * EVERY RENEWAL DUE TODAY, ISSUED — or, unless `live`, only REPORTED. The
 * switch is `RENEWAL_REQUESTS=on` (cron/subscription-notices), because this is
 * the first thing that bills customers by itself, and the owner sees the report
 * before it runs on real studios.
 *
 * THE SEATS ARE THE NEW PERIOD'S: a scheduled reduction lands here, but never
 * below the members the studio has on the day — somebody added after the
 * reduction was asked for is in the studio, and is billed for.
 */
export async function issueRenewals(live: boolean) {
  const today = billingDay();
  const studios = await readArr<Record<string, unknown>>(REG.studios);
  const docs = await subscriptionDocs(studios.map((s) => String(s.id)));
  const byId = new Map(studios.map((s) => [String(s.id), s as Studio]));
  const lists = new Map<string, List>();
  const listFor = async (c: string) => {
    if (!lists.has(c)) lists.set(c, await priceListFor(c));
    return lists.get(c) as List;
  };

  const issued: { studio: string; total: number; currency: string; seats: number }[] = [];
  const problems: string[] = [];
  for (const { studioId, doc } of docs) {
    if (!doc) continue;
    const from = renewalDue(doc.subscription, doc.requests, today);
    if (!from) continue;
    const studio = byId.get(studioId);
    if (!studio) continue;
    const sub = doc.subscription;
    const list = await listFor(sub.priceCountry || "");
    const members = (await listCollaborators(studioId)).length;
    const seats = Math.max(sub.seatsNext || sub.seats, members);
    const quote = quoteSeats(list, { packageId: String(studio.packageId || ""), seats, tierId: String(studio.tierId || ""), cycle: sub.period as Cycle });
    if ("error" in quote) { problems.push(`${String(studio.name || studioId)}: ${quote.error}`); continue; }
    const request = buildRequest({
      id: renewalId(from), kind: "renewal", quote, at: new Date().toISOString(), today, from, anchorDay: sub.anchorDay,
      priceCountry: sub.priceCountry || "", charges: sub.accrued || [], ...names(list, quote.packageId, quote.tierId),
    });
    issued.push({ studio: String(studio.name || studioId), total: request.total, currency: request.currency, seats });
    if (!live) continue;

    const out = await recordEvent(
      studioId,
      { id: request.id, type: "renewal-requested", requestId: request.id, seats, chargeIds: request.chargeIds },
      "system",
      (cur) => ({ requests: [...(cur.requests || []), request].slice(-120) }),
    );
    if (out.problem) { problems.push(`${String(studio.name || studioId)}: ${out.problem}`); continue; }
    if (out.changed) await tellRenewal(studio, request);
  }
  return { today, live, issued, problems };
}

async function tellRenewal(studio: Studio, r: PaymentRequest) {
  const day = (d: string) => d.split("-").reverse().join("/");
  const money = `${r.total} ${r.currency}`;
  await tellOwner(studio,
    { en: `Your Sitta renewal for ${String(studio.name || "")}`, ar: `تجديد اشتراك ستة لـ ${String(studio.name || "")}` },
    {
      en: [`Your plan renews today for ${r.seats} seats: ${money} with tax, for ${day(r.periodFrom)} onwards.`, "Pay by bank transfer from your billing page within 20 days to keep everything open."],
      ar: [`يتجدد اشتراكك اليوم لـ ${r.seats} مقعدًا: ${money} شاملة الضريبة، ابتداءً من ${day(r.periodFrom)}.`, "ادفع بحوالة بنكية من صفحة الفوترة خلال 20 يومًا ليبقى كل شيء مفتوحًا."],
    });
}

/** What the billing page's seats panel reads — a type only, safe to import from a client file. */
export type SeatView = Awaited<ReturnType<typeof seatView>>;
