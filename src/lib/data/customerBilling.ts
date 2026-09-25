// A CUSTOMER'S BILLING WITH NOMPANY — the transfer they say they sent, the
// refund they ask for, nompany's answers, and the invoices and credit notes it
// issues. Stored in the studio's subscription document (lib/data/subscriptions),
// beside the subscription and its history, so one act — confirming a transfer —
// records the payment, answers the claim and issues the invoice together.
//
// This is nompany billing ITS customers for packages and tiers. It is not a
// studio's own Finance.
//
// THE CUSTOMER'S WORDS AND DETAILS ARE SEALED (the owner, 26/09/2026): the
// payer's name, the bank's reference, a refund's reason and the customer's
// billing details on an invoice are encrypted (platform/auth/fieldCrypto) and
// opened only for the console and the studio's owner.
//
// EVERY ACT IS IDEMPOTENT BY AN ID THE CALLER MINTED — a claim id from the
// owner's form, an event id from the console's — so a button pressed twice or a
// request retried after a timeout is one claim, one payment, one invoice.

import { editJSON, getJSON, bumpCounter } from "@/platform/db/store";
import { BILLING } from "@/platform/db/keys";
import { encryptField, decryptField } from "@/platform/auth/fieldCrypto";
import { getUserById } from "@/platform/auth/users";
import { sendEmail } from "@/platform/notify/email";
import { billingNoticeEmail } from "@/platform/notify/emailTemplates";
import { notifySuper, NOTIFY } from "@/platform/notify/notifications";
import { getStudioById, updateStudio } from "@/modules/main/studios";
import { listCatalog } from "@/lib/data/catalog";
import { SITE_URL } from "@/lib/seo";
import { studioLocale } from "@/shared/locale";
import { getSubscription, recordEvent, effectiveAccess, type SubscriptionDoc } from "./subscriptions";
import { getPaymentSettings, paymentOptionsFor } from "./paymentSettings";
import {
  addDays, addMonths, billingDay, ladderDates, periodMonths, BILLING_PERIODS,
  type BillingEvent, type BillingPeriod,
} from "@/shared/subscription";
import {
  openTransfer, transferProblem, transferReference,
  type Answer, type Claim, type ClaimedPlan, type RefundRequest, type TransferClaim,
} from "@/shared/billingClaims";
import {
  creditFigures, creditedAgainst, documentNumber, invoiceFigures, sellerProblem, PAYMENT_MEANS,
  type InvoiceParty, type NompanyInvoice,
} from "@/shared/nompanyInvoice";

type Studio = Record<string, unknown> & { id: string };
const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const seal = (v: object) => encryptField(JSON.stringify(v));
function unseal<T>(v: unknown, fallback: T): T {
  try { return { ...fallback, ...JSON.parse(decryptField(v) || "{}") }; } catch { return fallback; }
}
const docKey = (studioId: string) => BILLING.subscription(studioId);

// ---- what people are shown ---------------------------------------------------

export type BillingProfile = { name: string; address: string; country: string; taxNumber: string; email: string };
const EMPTY_PROFILE: BillingProfile = { name: "", address: "", country: "", taxNumber: "", email: "" };

/** A claim with its sealed half opened — for the console and the studio's owner only. */
function openClaim(c: Claim) {
  const { sealed, ...rest } = c;
  return c.kind === "transfer"
    ? { ...rest, ...unseal(sealed, { payerName: "", bankReference: "", note: "" }) }
    : { ...rest, ...unseal(sealed, { reason: "" }) };
}

/** An invoice's summary line — the list, without the parties. */
const summary = (d: NompanyInvoice) => ({
  number: d.number, kind: d.kind, issuedOn: d.issuedOn, currency: d.currency,
  subtotal: d.subtotal, tax: d.tax, total: d.total, creditsInvoice: d.creditsInvoice || "",
  claimId: d.claimId || "", eventId: d.eventId || "",
});

/** One document in full, the buyer opened — what the printable page draws. */
export async function getDocument(studioId: string, number: string) {
  const doc = await getJSON<SubscriptionDoc>(docKey(studioId));
  const d = (doc?.documents || []).find((x) => x.number === number);
  if (!d) return null;
  const { buyerSealed, ...rest } = d;
  return { ...rest, buyer: unseal<InvoiceParty>(buyerSealed, { ...EMPTY_PROFILE }) };
}

async function planNames() {
  const [packages, tiers] = await Promise.all([listCatalog("packages"), listCatalog("tiers")]);
  return { packages, tiers };
}

/** WHAT THE OWNER'S BILLING PAGE SHOWS — everything about paying for this one studio. */
export async function ownerBillingView(studio: Studio) {
  const [doc, settings] = await Promise.all([getSubscription(studio.id), getPaymentSettings()]);
  const today = billingDay();
  const { status, access, holdUntil } = await effectiveAccess(doc, today);
  const request = (studio.upgradeRequest || null) as (ClaimedPlan & { requestedAt?: string }) | null;
  const { packages, tiers } = await planNames();
  const lastPaid = [...doc.history].reverse().find((h) => h.type === "paid");
  const currency = request?.currency || String(lastPaid?.detail?.currency || "");
  return {
    status, access, holdUntil, today,
    subscription: { kind: doc.subscription.kind, period: doc.subscription.period, paidUntil: doc.subscription.paidUntil, cancelAt: doc.subscription.cancelAt },
    dates: ladderDates(doc.subscription),
    plan: {
      packageId: String(studio.packageId || ""), tierId: String(studio.tierId || ""),
      packageName: String(packages.find((p) => p.id === studio.packageId)?.name || ""),
      tierName: String(tiers.find((t) => t.id === studio.tierId)?.name || ""),
    },
    request: request ? { ...request, packageName: String(packages.find((p) => p.id === request.packageId)?.name || "") } : null,
    reference: transferReference(String(studio.slug || ""), String(request?.requestedAt || "")),
    pay: paymentOptionsFor(settings, currency),
    holdHours: settings.claimHoldHours,
    claims: [...(doc.claims || [])].reverse().map(openClaim),
    documents: [...(doc.documents || [])].reverse().map(summary),
    profile: unseal(doc.billingProfile, { ...EMPTY_PROFILE }),
  };
}

/** WHAT THE CONSOLE'S SUBSCRIPTION PANEL ADDS — claims opened, documents listed, the hold. */
export async function consoleBillingView(doc: SubscriptionDoc) {
  const { holdUntil } = await effectiveAccess(doc);
  const credited = (no: string) => creditedAgainst(doc.documents || [], no);
  return {
    holdUntil,
    claims: [...(doc.claims || [])].reverse().map(openClaim),
    documents: [...(doc.documents || [])].reverse().map((d) => ({ ...summary(d), credited: d.kind === "invoice" ? credited(d.number) : 0 })),
    profile: unseal(doc.billingProfile, { ...EMPTY_PROFILE }),
    // Payments with no invoice yet — the console may issue one for each.
    uninvoiced: doc.history.filter((h) => h.type === "paid" && !(doc.documents || []).some((d) => d.eventId === h.id))
      .map((h) => ({ eventId: h.id, at: h.at, amount: Number(h.detail.amount) || 0, currency: String(h.detail.currency || "") })),
  };
}

// ---- the owner's acts ----------------------------------------------------------

async function ownerEmail(studio: Studio) {
  const owner = studio.ownerUserId ? await getUserById(String(studio.ownerUserId)) : null;
  return owner?.email || "";
}

/** Tells nompany, by the bell and — where an address is set — by email. */
async function tellNompany(title: string, body: string, tone: "info" | "warning" = "warning") {
  await notifySuper({ type: NOTIFY.system, title, body, href: "/super/studios", tone });
  const { notifyEmail } = await getPaymentSettings();
  if (!notifyEmail) return;
  const mail = billingNoticeEmail({ locale: "en", subject: title, lines: [body, "Open the console to see the details and answer it."], cta: "Open the console", url: `${SITE_URL}/super/studios` });
  await sendEmail({ to: notifyEmail, ...mail });
}

/** Tells the owner, in the studio's language. */
async function tellOwner(studio: Studio, subject: { en: string; ar: string }, lines: { en: string[]; ar: string[] }) {
  const to = await ownerEmail(studio);
  if (!to) return;
  const locale = studioLocale(studio);
  const ar = locale === "ar";
  const mail = billingNoticeEmail({
    locale, subject: ar ? subject.ar : subject.en, lines: ar ? lines.ar : lines.en,
    cta: ar ? "افتح صفحة الفوترة" : "Open billing", url: `${SITE_URL}/${locale}/account?view=billing`,
  });
  await sendEmail({ to, ...mail });
}

const money = (n: number, c: string) => `${n} ${c}`;

/**
 * "I HAVE SENT THE TRANSFER." One open at a time; the plan it pays for is the
 * upgrade request as it stands, locked on the claim like the quote was.
 */
export async function claimTransfer(studio: Studio, userId: string, body: Record<string, unknown>) {
  const id = text(body.claimId, 80);
  if (!id) return { error: "missing-id" as const };
  const today = billingDay();
  const input = {
    amount: Number(body.amount), currency: text(body.currency, 3).toUpperCase(),
    sentOn: text(body.sentOn, 10), bankReference: text(body.bankReference, 80),
  };
  const problem = transferProblem(input, today);
  if (problem) return { error: problem };

  const req = studio.upgradeRequest as ClaimedPlan | null | undefined;
  const plan: ClaimedPlan | null = req?.packageId ? {
    packageId: req.packageId, categoryId: req.categoryId || "", tierId: req.tierId || "", cycle: req.cycle === "yearly" ? "yearly" : "monthly",
    seats: Number(req.seats) || 0, amount: Number(req.amount) || 0, taxPercent: Number(req.taxPercent) || 0,
    tax: Number(req.tax) || 0, total: Number(req.total) || 0, currency: String(req.currency || ""),
  } : null;

  await getSubscription(studio.id);
  const at = new Date().toISOString();
  const out = await editJSON<SubscriptionDoc, { claim?: TransferClaim; error?: string; fresh?: boolean }>(docKey(studio.id), (cur) => {
    if (!cur?.subscription) return { result: { error: "notfound" } };
    const claims = cur.claims || [];
    const same = claims.find((c) => c.id === id);
    if (same) return { result: { claim: same as TransferClaim } };
    if (openTransfer(claims)) return { result: { error: "claim-open" } };
    const claim: TransferClaim = {
      id, kind: "transfer", at, by: userId, status: "pending",
      amount: input.amount, currency: input.currency, sentOn: input.sentOn, plan,
      sealed: seal({ payerName: text(body.payerName, 160), bankReference: input.bankReference, note: text(body.note, 500) }),
    };
    return { next: { ...cur, claims: [...claims, claim].slice(-200) }, result: { claim, fresh: true } };
  });
  if (out.error) return { error: out.error };
  if (out.fresh) {
    await tellNompany(
      "Payment claimed",
      `${String(studio.name || "")} (nompany.com/${String(studio.slug || "")}) says they sent ${money(input.amount, input.currency)} by bank transfer on ${input.sentOn.split("-").reverse().join("/")}. Check the bank and confirm or reject it.`,
    );
  }
  return { ok: true, claim: out.claim ? openClaim(out.claim) : null };
}

/** An owner takes back a claim nobody has answered — a typo, a transfer that never left. */
export async function withdrawClaim(studioId: string, claimId: string) {
  return editJSON<SubscriptionDoc, { ok?: true; error?: string }>(docKey(studioId), (cur) => {
    const c = (cur?.claims || []).find((x) => x.id === claimId);
    if (!cur || !c) return { result: { error: "notfound" } };
    if (c.status !== "pending") return { result: { error: "answered" } };
    const claims = (cur.claims || []).map((x) => (x.id === claimId ? { ...x, status: "withdrawn" as const } : x));
    return { next: { ...cur, claims }, result: { ok: true } };
  });
}

/** "PLEASE REFUND THIS INVOICE." Only an invoice of this studio, not already refunded in full, one request open per invoice. */
export async function requestRefund(studio: Studio, userId: string, body: Record<string, unknown>) {
  const id = text(body.claimId, 80);
  const invoiceNo = text(body.invoiceNo, 40);
  const reason = text(body.reason, 1000);
  if (!id) return { error: "missing-id" as const };
  if (reason.length < 3) return { error: "missing-reason" as const };
  await getSubscription(studio.id);
  const at = new Date().toISOString();
  const out = await editJSON<SubscriptionDoc, { claim?: RefundRequest; error?: string; fresh?: boolean }>(docKey(studio.id), (cur) => {
    if (!cur?.subscription) return { result: { error: "notfound" } };
    const claims = cur.claims || [];
    const same = claims.find((c) => c.id === id);
    if (same) return { result: { claim: same as RefundRequest } };
    const inv = (cur.documents || []).find((d) => d.kind === "invoice" && d.number === invoiceNo);
    if (!inv) return { result: { error: "unknown-invoice" } };
    if (creditedAgainst(cur.documents || [], invoiceNo) >= inv.total) return { result: { error: "already-refunded" } };
    if (claims.some((c) => c.kind === "refund" && c.status === "pending" && c.invoiceNo === invoiceNo)) return { result: { error: "claim-open" } };
    const claim: RefundRequest = { id, kind: "refund", at, by: userId, status: "pending", invoiceNo, sealed: seal({ reason }) };
    return { next: { ...cur, claims: [...claims, claim].slice(-200) }, result: { claim, fresh: true } };
  });
  if (out.error) return { error: out.error };
  if (out.fresh) {
    await tellNompany("Refund requested", `${String(studio.name || "")} (nompany.com/${String(studio.slug || "")}) asked for a refund of invoice ${invoiceNo}.`);
  }
  return { ok: true, claim: out.claim ? openClaim(out.claim) : null };
}

/** The customer's own billing details, printed on the invoices issued from now on. Sealed. */
export async function saveBillingProfile(studioId: string, body: Record<string, unknown>) {
  const profile: BillingProfile = {
    name: text(body.name, 160), address: text(body.address, 400), country: text(body.country, 2).toUpperCase(),
    taxNumber: text(body.taxNumber, 40), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(body.email)) ? text(body.email) : "",
  };
  await getSubscription(studioId);
  await editJSON<SubscriptionDoc, void>(docKey(studioId), (cur) => {
    if (!cur?.subscription) return { result: undefined };
    return { next: { ...cur, billingProfile: seal(profile) }, result: undefined };
  });
  return { ok: true, profile };
}

// ---- the console's acts ----------------------------------------------------------

/**
 * A PAYMENT, NARROWED FIELD BY FIELD from what the console sent, with the
 * package, band and tier checked against the catalogue: a package applies to
 * the studio it was paid for, once paid (24/09/2026). Shared by "record a
 * payment" and "confirm a transfer", so the two cannot accept different things.
 */
export async function parsePaidEvent(id: string, body: Record<string, unknown>): Promise<BillingEvent | { error: string }> {
  const packageId = text(body.packageId, 80);
  const categoryId = text(body.categoryId, 40);
  const tierId = text(body.tierId, 80);
  const pkg = packageId ? (await listCatalog("packages")).find((p) => p.id === packageId) : null;
  if (packageId && !pkg) return { error: "unknown-package" };
  // THE BAND THE MONEY IS FOR (24/09/2026): stored with the package, so the
  // studio's seats — and the next invoice's price — come from that band.
  if (categoryId && !(Array.isArray(pkg?.categories) && (pkg.categories as { id?: unknown }[]).some((c) => String(c?.id) === categoryId))) return { error: "unknown-band" };
  if (tierId && !(await listCatalog("tiers")).some((t) => t.id === tierId)) return { error: "unknown-tier" };
  return {
    id, type: "paid", periods: Number(body.periods),
    amount: Number(body.amount) || 0, currency: text(body.currency, 3).toUpperCase(),
    method: text(body.method, 40) || "bank-transfer", reference: text(body.reference, 120),
    ...(packageId ? { packageId } : {}), ...(categoryId ? { categoryId } : {}), ...(tierId ? { tierId } : {}),
    ...(body.seats !== undefined && body.seats !== "" ? { seats: Number(body.seats) } : {}),
    ...(BILLING_PERIODS.includes(body.period as BillingPeriod) ? { period: body.period as BillingPeriod } : {}),
  };
}

/**
 * THE PAID-FOR PACKAGE TAKES EFFECT ONLY ONCE THE PAYMENT HAS BEEN APPLIED —
 * and only the first time: a repeated event id changed nothing, so it moves
 * nothing on the studio either.
 */
export async function applyPaidPlan(studioId: string, changed: boolean, event: BillingEvent) {
  if (!changed || event.type !== "paid" || !(event.packageId || event.tierId)) return;
  await updateStudio(studioId, {
    // The band goes with the package: a package paid for without one clears
    // any band left from the package before.
    ...(event.packageId ? { packageId: event.packageId, categoryId: event.categoryId || "" } : {}),
    ...(event.tierId ? { tierId: event.tierId } : {}),
    // THE REQUEST IS ANSWERED once a payment moves the studio onto a package:
    // leaving it would keep the owner's dialog saying "you asked for this".
    upgradeRequest: null,
  });
}

function setClaim(cur: SubscriptionDoc, claimId: string, status: Claim["status"], answer: Answer): SubscriptionDoc {
  return { ...cur, claims: (cur.claims || []).map((c) => (c.id === claimId ? { ...c, status, answer } : c)) };
}

/** What the invoice's one line says it was for. */
async function describe(event: Extract<BillingEvent, { type: "paid" }>, studio: Studio, periodFrom: string, periodTo: string) {
  const { packages, tiers } = await planNames();
  const pkgId = event.packageId || String(studio.packageId || "");
  const pkg = packages.find((p) => p.id === pkgId);
  const band = event.categoryId && Array.isArray(pkg?.categories)
    ? (pkg.categories as { id?: unknown; label?: unknown; minEmployees?: unknown; maxEmployees?: unknown }[]).find((b) => String(b.id) === event.categoryId)
    : null;
  const tier = tiers.find((t) => t.id === (event.tierId || studio.tierId));
  const name = [
    String(pkg?.name || "nompany"),
    band ? String(band.label || `${band.minEmployees}–${band.maxEmployees}`) : "",
  ].filter(Boolean).join(" · ") + (tier ? ` + ${String(tier.name)}` : "");
  const day = (d: string) => d.split("-").reverse().join("/");
  return `${name} — ${event.period === "yearly" ? "yearly" : "monthly"} subscription for ${String(studio.name || "")}, ${day(periodFrom)} to ${day(addDays(periodTo, -1))}`;
}

/**
 * ISSUES AN INVOICE FOR A PAYMENT ALREADY RECORDED, once. The number is taken
 * only when nothing has been issued for that payment yet; the seller is
 * nompany's details as they are today, frozen on the paper.
 */
async function issueInvoice(studio: Studio, eventId: string, by: string, claimId = "") {
  const doc = await getSubscription(studio.id);
  const existing = (doc.documents || []).find((d) => d.eventId === eventId);
  if (existing) return { number: existing.number };
  const entry = doc.history.find((h) => h.id === eventId && h.type === "paid");
  if (!entry) return { error: "unknown-payment" };
  const settings = await getPaymentSettings();
  const bad = sellerProblem(settings.seller);
  if (bad) return { error: bad };

  const event = { id: eventId, type: "paid" as const, periods: Number(entry.detail.periods) || 1, ...(entry.detail as object) } as Extract<BillingEvent, { type: "paid" }>;
  const currency = String(event.currency || "").toUpperCase();
  const total = Number(event.amount) || 0;
  if (!(total > 0) || !currency) return { error: "bad-amount" };
  const period = (event.period || doc.subscription.period) as BillingPeriod;
  const periodTo = entry.after.paidUntil;
  const periodFrom = addMonths(periodTo, -event.periods * periodMonths(period), doc.subscription.anchorDay);
  // THE TAX RATE THE CUSTOMER WAS QUOTED, when the payment answers a claim that
  // locked one; otherwise the rate nompany charges (Jordan's, 23/09/2026).
  const claim = (doc.claims || []).find((c) => c.id === claimId) as TransferClaim | undefined;
  const taxPercent = claim?.plan?.taxPercent ?? 16;
  const figures = invoiceFigures({ total, currency, taxPercent, description: await describe(event, studio, periodFrom, periodTo), periods: event.periods });

  const profile = unseal(doc.billingProfile, { ...EMPTY_PROFILE });
  const buyer: InvoiceParty = {
    name: profile.name || String(studio.name || ""), address: profile.address, country: profile.country || String(studio.country || ""),
    taxNumber: profile.taxNumber, email: profile.email || await ownerEmail(studio),
  };
  const at = new Date().toISOString();
  const issuedOn = billingDay(at);
  const year = Number(issuedOn.slice(0, 4));
  const n = await bumpCounter(BILLING.documentCounter, `invoice-${year}`);
  const { invoicePrefix, nameAr: _nameAr, ...seller } = settings.seller;
  void _nameAr;
  const invoice: NompanyInvoice = {
    number: documentNumber(invoicePrefix, "invoice", year, n), kind: "invoice",
    issuedOn, issuedAt: at, issuedBy: by, studioId: studio.id, currency, ...figures,
    paymentMeans: PAYMENT_MEANS.bankTransfer, paidOn: billingDay(entry.at), seller,
    buyerSealed: seal(buyer), eventId, ...(claimId ? { claimId } : {}),
  };
  const out = await editJSON<SubscriptionDoc, { number: string }>(docKey(studio.id), (cur) => {
    const docs = cur?.documents || [];
    const already = docs.find((d) => d.eventId === eventId);
    if (!cur || already) return { result: { number: already?.number || "" } };
    return { next: { ...cur, documents: [...docs, invoice] }, result: { number: invoice.number } };
  });
  return out;
}

/** The console issues an invoice for a payment recorded without one. */
export async function issueInvoiceForPayment(studioId: string, eventId: string, by: string) {
  const studio = await getStudioById(studioId);
  if (!studio) return { error: "notfound" };
  return issueInvoice(studio as Studio, eventId, by);
}

/**
 * THE MONEY ARRIVED. Records the payment (the claim's own id makes the event id,
 * so confirming twice is one payment), moves the studio onto the plan it paid
 * for, answers the claim, and — unless the console says not to — issues the
 * invoice. The owner is emailed.
 */
export async function confirmTransfer(studioId: string, claimId: string, by: string, body: Record<string, unknown>) {
  const studio = await getStudioById(studioId);
  if (!studio) return { error: "notfound" };
  const doc = await getSubscription(studioId);
  const claim = (doc.claims || []).find((c) => c.id === claimId);
  if (!claim || claim.kind !== "transfer") return { error: "notfound" };
  if (claim.status !== "pending" && claim.status !== "confirmed") return { error: "answered" };

  const eventId = `claim:${claimId}`;
  const event = await parsePaidEvent(eventId, body);
  if ("error" in event) return event;
  const out = await recordEvent(studioId, event, `super:${by}`);
  if (out.problem) return { error: out.problem };
  await applyPaidPlan(studioId, out.changed, event);

  let documentNo = "";
  let invoiceProblem = "";
  if (body.issueInvoice !== false) {
    const inv = await issueInvoice(studio as Studio, eventId, by, claimId);
    if ("error" in inv && inv.error) invoiceProblem = inv.error;
    else documentNo = (inv as { number: string }).number;
  }
  const amount = event.type === "paid" ? Number(event.amount) || 0 : 0;
  const currency = event.type === "paid" ? String(event.currency || "") : "";
  const at = new Date().toISOString();
  await editJSON<SubscriptionDoc, void>(docKey(studioId), (cur) => {
    if (!cur) return { result: undefined };
    return { next: setClaim(cur, claimId, "confirmed", { at, by, eventId, amount, currency, ...(documentNo ? { documentNo } : {}) }), result: undefined };
  });
  if (claim.status === "pending") {
    await tellOwner(studio as Studio,
      { en: `Payment received for ${String(studio.name || "")}`, ar: `استلمنا الدفعة لـ ${String(studio.name || "")}` },
      {
        en: [`We received your transfer of ${money(amount, currency)}. ${String(studio.name || "")} is paid until ${out.subscription.paidUntil.split("-").reverse().join("/")}.`, documentNo ? `Your invoice ${documentNo} is on your billing page.` : ""].filter(Boolean),
        ar: [`استلمنا حوالتك بقيمة ${money(amount, currency)}. ${String(studio.name || "")} مدفوعة حتى ${out.subscription.paidUntil.split("-").reverse().join("/")}.`, documentNo ? `فاتورتك ${documentNo} في صفحة الفوترة.` : ""].filter(Boolean),
      });
  }
  return { ok: true, documentNo, invoiceProblem };
}

/** The money did not arrive, or not as claimed. The owner is told why. */
export async function rejectTransfer(studioId: string, claimId: string, by: string, reasonIn: unknown) {
  const studio = await getStudioById(studioId);
  if (!studio) return { error: "notfound" };
  const reason = text(reasonIn, 500);
  if (reason.length < 3) return { error: "missing-reason" };
  const at = new Date().toISOString();
  const out = await editJSON<SubscriptionDoc, { ok?: true; error?: string }>(docKey(studioId), (cur) => {
    const c = (cur?.claims || []).find((x) => x.id === claimId);
    if (!cur || !c || c.kind !== "transfer") return { result: { error: "notfound" } };
    if (c.status !== "pending") return { result: { error: "answered" } };
    return { next: setClaim(cur, claimId, "rejected", { at, by, reason }), result: { ok: true } };
  });
  if (out.error) return out;
  await tellOwner(studio as Studio,
    { en: `We couldn't match your transfer for ${String(studio.name || "")}`, ar: `لم نتمكن من مطابقة حوالتك لـ ${String(studio.name || "")}` },
    { en: [reason, "Check the details on your billing page, or reply to this email."], ar: [reason, "راجع التفاصيل في صفحة الفوترة، أو رد على هذه الرسالة."] });
  return out;
}

/**
 * MONEY GIVEN BACK — asked for by the customer (a refund request) or decided by
 * nompany. Records a `refunded` event (which takes back paid time only when
 * `periods` says so), issues a credit note against the invoice when there is
 * one, answers the request, and tells the owner.
 */
export async function recordRefund(studioId: string, by: string, body: Record<string, unknown>) {
  const studio = await getStudioById(studioId);
  if (!studio) return { error: "notfound" };
  const eventId = text(body.eventId, 80);
  if (!eventId) return { error: "missing-id" };
  const requestId = text(body.requestId, 80);
  const doc = await getSubscription(studioId);
  const request = requestId ? (doc.claims || []).find((c) => c.id === requestId && c.kind === "refund") as RefundRequest | undefined : undefined;
  if (requestId && !request) return { error: "notfound" };
  if (request && request.status !== "pending") return { error: "answered" };
  const invoiceNo = request?.invoiceNo || text(body.invoiceNo, 40);
  const invoice = invoiceNo ? (doc.documents || []).find((d) => d.kind === "invoice" && d.number === invoiceNo) : undefined;
  if (invoiceNo && !invoice) return { error: "unknown-invoice" };

  const amount = Number(body.amount);
  const currency = invoice?.currency || text(body.currency, 3).toUpperCase();
  const reason = text(body.reason, 500);
  let credit: ReturnType<typeof creditFigures> | null = null;
  if (invoice) {
    credit = creditFigures(invoice, amount, creditedAgainst(doc.documents || [], invoice.number));
    if ("error" in credit) return { error: credit.error };
  }

  const event: BillingEvent = {
    id: `refund:${eventId}`, type: "refunded", periods: Math.trunc(Number(body.periods) || 0), amount, currency,
    reference: text(body.reference, 120), reason, ...(invoiceNo ? { invoiceNo } : {}),
  };
  const out = await recordEvent(studioId, event, `super:${by}`);
  if (out.problem) return { error: out.problem };

  let documentNo = "";
  const existing = (doc.documents || []).find((d) => d.eventId === event.id);
  if (existing) documentNo = existing.number;
  else if (invoice && credit && !("error" in credit) && body.creditNote !== false) {
    const settings = await getPaymentSettings();
    const at = new Date().toISOString();
    const issuedOn = billingDay(at);
    const year = Number(issuedOn.slice(0, 4));
    const n = await bumpCounter(BILLING.documentCounter, `credit-note-${year}`);
    const { invoicePrefix, nameAr: _nameAr, ...seller } = settings.seller;
    void _nameAr;
    const note: NompanyInvoice = {
      number: documentNumber(invoicePrefix, "credit-note", year, n), kind: "credit-note",
      issuedOn, issuedAt: at, issuedBy: by, studioId, currency: invoice.currency,
      lines: credit.lines, subtotal: credit.subtotal, taxPercent: credit.taxPercent, tax: credit.tax, total: credit.total,
      paymentMeans: PAYMENT_MEANS.bankTransfer, paidOn: issuedOn,
      // The seller as it is today; the buyer AS THE INVOICE HAD THEM, because a
      // credit note has to name the same customer as the paper it corrects.
      seller: sellerProblem(settings.seller) ? invoice.seller : seller, buyerSealed: invoice.buyerSealed,
      eventId: event.id, creditsInvoice: invoice.number, reason,
    };
    documentNo = await editJSON<SubscriptionDoc, string>(docKey(studioId), (cur) => {
      const docs = cur?.documents || [];
      const already = docs.find((d) => d.eventId === event.id);
      if (!cur || already) return { result: already?.number || "" };
      return { next: { ...cur, documents: [...docs, note] }, result: note.number };
    });
  }

  if (request) {
    const at = new Date().toISOString();
    await editJSON<SubscriptionDoc, void>(docKey(studioId), (cur) => {
      if (!cur) return { result: undefined };
      return { next: setClaim(cur, request.id, "refunded", { at, by, eventId: event.id, amount, currency, reason, ...(documentNo ? { documentNo } : {}) }), result: undefined };
    });
  }
  if (out.changed) {
    await tellOwner(studio as Studio,
      { en: `Refund sent for ${String(studio.name || "")}`, ar: `تم إرسال استرداد لـ ${String(studio.name || "")}` },
      {
        en: [`We refunded ${money(amount, currency)}${invoiceNo ? ` against invoice ${invoiceNo}` : ""}. It can take a few days to reach your account.`, documentNo ? `The credit note ${documentNo} is on your billing page.` : ""].filter(Boolean),
        ar: [`أعدنا لك ${money(amount, currency)}${invoiceNo ? ` عن الفاتورة ${invoiceNo}` : ""}. قد يستغرق وصوله إلى حسابك بضعة أيام.`, documentNo ? `إشعار الدائن ${documentNo} في صفحة الفوترة.` : ""].filter(Boolean),
      });
  }
  return { ok: true, documentNo, subscription: out.subscription };
}

/** A refund request turned down, with the reason the owner is sent. */
export async function declineRefund(studioId: string, requestId: string, by: string, reasonIn: unknown) {
  const studio = await getStudioById(studioId);
  if (!studio) return { error: "notfound" };
  const reason = text(reasonIn, 500);
  if (reason.length < 3) return { error: "missing-reason" };
  const at = new Date().toISOString();
  const out = await editJSON<SubscriptionDoc, { ok?: true; error?: string; invoiceNo?: string }>(docKey(studioId), (cur) => {
    const c = (cur?.claims || []).find((x) => x.id === requestId);
    if (!cur || !c || c.kind !== "refund") return { result: { error: "notfound" } };
    if (c.status !== "pending") return { result: { error: "answered" } };
    return { next: setClaim(cur, requestId, "declined", { at, by, reason }), result: { ok: true, invoiceNo: c.invoiceNo } };
  });
  if (out.error) return out;
  await tellOwner(studio as Studio,
    { en: `About your refund request for ${String(studio.name || "")}`, ar: `بخصوص طلب الاسترداد لـ ${String(studio.name || "")}` },
    { en: [`We can't refund invoice ${out.invoiceNo}.`, reason], ar: [`لا يمكننا استرداد الفاتورة ${out.invoiceNo}.`, reason] });
  return { ok: true };
}
