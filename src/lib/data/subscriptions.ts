// A STUDIO'S SUBSCRIPTION, STORED. The rules are `shared/subscription` (pure);
// this file keeps one document per studio — the subscription and its history —
// and is the ONLY writer of either.
//
// THE HISTORY IS APPEND-ONLY AND LIVES IN THE SAME DOCUMENT, so applying an
// event and recording it are one compare-and-set (invariant 8). Two documents
// would be two writes, and a crash between them leaves a payment that moved
// `paidUntil` and appears nowhere, or a history line for a payment that did not.
//
// A STUDIO WITH NO DOCUMENT PREDATES SUBSCRIPTIONS and is planted
// COMPLIMENTARY on first read (the owner, 23/09/2026) — every studio catches up
// by itself rather than through a script. A studio created from now on gets its
// trial at creation (`startTrial`), so a missing document can only ever mean an
// old studio.

import { getJSON, getJSONMany, editJSON } from "@/platform/db/store";
import { BILLING } from "@/platform/db/keys";
import { getCatalogSettings } from "@/lib/data/catalog";
import {
  accessFor, addDays, applyEvent, billingDay, complimentary, daysBetween, ladderDates, newTrial, subscriptionStatus,
  type BillingEvent, type StudioAccess, type Subscription, type SubscriptionStatus,
} from "@/shared/subscription";

export type HistoryEntry = {
  id: string;
  /**
   * A billing event, or one of two things that change no date but belong in the
   * record: a warning email that WENT (`warning-sent`), and a sandbox clock
   * move (`sandbox-clock`, never in production — lib/sandbox).
   */
  type: BillingEvent["type"] | "warning-sent" | "sandbox-clock";
  at: string;
  /** Who did it: a console user's id, "system", or "provider". */
  by: string;
  /** What the event carried, minus its id and type. */
  detail: Record<string, unknown>;
  before: Pick<Subscription, "kind" | "paidUntil" | "cancelAt" | "seats">;
  after: Pick<Subscription, "kind" | "paidUntil" | "cancelAt" | "seats">;
};

/**
 * `sentNotices` — the warning emails already sent (shared/subscription's
 * noticesDue keys), kept in the same document so a warning and the record of it
 * cannot part company. Absent on every document written before 24/09/2026.
 */
type Doc = { subscription: Subscription; history: HistoryEntry[]; sentNotices?: string[] };

const snap = (s: Subscription) => ({ kind: s.kind, paidUntil: s.paidUntil, cancelAt: s.cancelAt, seats: s.seats });

/** The subscription and its history, planting the complimentary one an old studio is owed. */
export async function getSubscription(studioId: string): Promise<Doc> {
  const stored = await getJSON<Doc>(BILLING.subscription(studioId));
  if (stored?.subscription) return stored;
  return editJSON<Doc, Doc>(BILLING.subscription(studioId), (cur) => {
    if (cur?.subscription) return { result: cur };
    const at = new Date().toISOString();
    const doc: Doc = { subscription: complimentary({ studioId, today: billingDay(at), at }), history: [] };
    return { next: doc, result: doc };
  });
}

/**
 * A NEW STUDIO'S SUBSCRIPTION, written at creation. Never overwrites: a document
 * already there wins, so a retried creation cannot restart somebody's months.
 *
 * ONLY STANDARD HAS A FREE PERIOD (the owner, 24/09/2026). A studio created on
 * a package that costs nothing gets its free months — as long as the package's
 * own Duration, the figure its pricing card states, or the catalogue's trial
 * setting when the package has none. A studio created on anything else is DUE
 * TODAY: a paid package has no trial and applies once paid.
 */
export async function startSubscription(studioId: string, input: { free: boolean; months?: number }) {
  const settings = await getCatalogSettings();
  const trialMonths = Number(input.months) > 0 ? Math.trunc(Number(input.months)) : settings.trialMonths;
  const at = new Date().toISOString();
  const today = billingDay(at);
  return editJSON<Doc, Doc>(BILLING.subscription(studioId), (cur) => {
    if (cur?.subscription) return { result: cur };
    const subscription = input.free
      ? newTrial({ studioId, today, trialMonths, at })
      : { ...newTrial({ studioId, today, trialMonths: 0, at }), kind: "paid" as const };
    const doc: Doc = { subscription, history: [] };
    return { next: doc, result: doc };
  });
}

/**
 * WHAT THIS STUDIO MAY DO RIGHT NOW — the one question every write route asks
 * (platform/http/route and the handful of routes outside it). Read, never
 * written: a studio with no document predates subscriptions and is
 * complimentary, which is exactly what `getSubscription` would plant, so
 * answering "full" here without planting it is the same answer one write sooner.
 */
export async function studioAccess(studioId: string): Promise<{ status: SubscriptionStatus; access: StudioAccess }> {
  const stored = await getJSON<Doc>(BILLING.subscription(studioId));
  if (!stored?.subscription) return { status: "complimentary", access: "full" };
  const status = subscriptionStatus(stored.subscription, billingDay());
  return { status, access: accessFor(status) };
}

/**
 * ONE EVENT, APPLIED AND RECORDED TOGETHER. An event whose id was already
 * applied changes nothing and adds no line — a webhook delivered twice, or a
 * button pressed twice, is one payment.
 */
export async function recordEvent(studioId: string, event: BillingEvent, by: string) {
  await getSubscription(studioId);
  const at = new Date().toISOString(); // outside the closure: editJSON re-runs it per CAS round.
  const today = billingDay(at);
  return editJSON<Doc, { subscription: Subscription; changed: boolean; problem: string }>(
    BILLING.subscription(studioId),
    (cur) => {
      const doc = cur?.subscription ? cur : null;
      if (!doc) return { result: { subscription: null as unknown as Subscription, changed: false, problem: "notfound" } };
      const out = applyEvent(doc.subscription, event, today, at);
      if (!out.changed) return { result: { subscription: doc.subscription, changed: false, problem: out.problem } };
      const { id, type, ...detail } = event;
      const entry: HistoryEntry = { id, type, at, by, detail, before: snap(doc.subscription), after: snap(out.sub) };
      return { next: { subscription: out.sub, history: [...doc.history, entry] }, result: { subscription: out.sub, changed: true, problem: "" } };
    },
  );
}

/**
 * EVERY STUDIO'S SUBSCRIPTION IN ONE READ, for the console's table. A studio
 * with no document is SHOWN complimentary without being written here — a list
 * page planting a document per row would be a burst of writes on a read — and
 * becomes one for real the first time its own subscription is read.
 */
export async function listSubscriptions(studioIds: string[]) {
  const docs = await getJSONMany<Doc>(studioIds.map((id) => BILLING.subscription(id)));
  const at = new Date().toISOString();
  const today = billingDay(at);
  return studioIds.map((studioId, i) => {
    const sub = docs[i]?.subscription || complimentary({ studioId, today, at });
    return { studioId, subscription: sub, status: subscriptionStatus(sub, today), dates: ladderDates(sub), sentNotices: docs[i]?.sentNotices || [], today };
  });
}

/**
 * WHAT THE STUDIO'S OWN SCREENS SAY ABOUT ITS SUBSCRIPTION — the status, what
 * it allows, and the ladder's dates — for the shell's banner and the shut-down
 * screen. Read-only, like `studioAccess`, and for the same reason.
 */
export async function studioBilling(studioId: string) {
  const stored = await getJSON<Doc>(BILLING.subscription(studioId));
  const today = billingDay();
  if (!stored?.subscription) return { status: "complimentary" as SubscriptionStatus, access: "full" as StudioAccess, kind: "comp", paidUntil: today, daysLeft: 0, dates: null };
  const sub = stored.subscription;
  const status = subscriptionStatus(sub, today);
  // Days until what is paid (or free) runs out — worked out here, on the
  // server's clock in Amman time, so a screen never reads its own.
  return { status, access: accessFor(status), kind: sub.kind, paidUntil: sub.paidUntil, daysLeft: daysBetween(today, sub.paidUntil), dates: ladderDates(sub) };
}

/** Every studio's stored document, for the daily warning job. Missing ones are complimentary and warned of nothing. */
export async function subscriptionDocs(studioIds: string[]) {
  const docs = await getJSONMany<Doc>(studioIds.map((id) => BILLING.subscription(id)));
  return studioIds.map((studioId, i) => ({ studioId, doc: docs[i]?.subscription ? docs[i] : null }));
}

/**
 * RECORDS WARNINGS AS SENT — only after the email went, so a failed send is
 * tried again on the next run rather than counted. Kept to the last 50 keys: a
 * key names a date, and one from a ladder long since paid off is never asked
 * about again.
 *
 * EACH EMAIL THAT WENT IS ALSO A LINE IN THE STUDIO'S HISTORY, so the console
 * shows when the owner was warned and of what — the question somebody asks the
 * day a studio shuts down and its owner says nobody told them.
 */
export async function markNoticesSent(
  studioId: string,
  keys: readonly string[],
  emailed: readonly { key: string; kind: string; days: number; on: string; to: string }[] = [],
) {
  if (!keys.length) return;
  const at = new Date().toISOString();
  await editJSON<Doc, void>(BILLING.subscription(studioId), (cur) => {
    if (!cur?.subscription) return { result: undefined };
    const sent = [...new Set([...(cur.sentNotices || []), ...keys])].slice(-50);
    const snapNow = snap(cur.subscription);
    const lines: HistoryEntry[] = emailed.map((n) => ({
      id: `warning:${n.key}`, type: "warning-sent", at, by: "system",
      detail: { kind: n.kind, days: n.days, on: n.on, to: n.to }, before: snapNow, after: snapNow,
    }));
    return { next: { ...cur, sentNotices: sent, history: [...cur.history, ...lines] }, result: undefined };
  });
}

/**
 * THE SANDBOX CLOCK — moves one studio to a chosen day of the unpaid ladder so
 * the closed banner, the shut-down screen and the warning emails can be seen
 * without waiting months. REFUSES OUTSIDE THE SANDBOX (lib/sandbox), whatever
 * the caller: this rewrites a subscription's dates, which on live data would be
 * nompany giving away or taking away paid time.
 *
 *   day N          paid, due N days ago (0 due, 20 closed, 90 shut down, 365 expired)
 *   "free-ended"   Standard's free months ended today (closed at once)
 *   "reset"        complimentary again
 *
 * Recorded in the history as `sandbox-clock`; clears sent warnings so the
 * warning job can be watched afresh.
 */
export async function sandboxSetClock(studioId: string, to: number | "free-ended" | "reset") {
  const { isSandbox } = await import("@/lib/sandbox");
  if (!isSandbox()) return { error: "notfound" as const };
  await getSubscription(studioId);
  const at = new Date().toISOString();
  const today = billingDay(at);
  return editJSON<Doc, { ok: true }>(BILLING.subscription(studioId), (cur) => {
    const doc = cur as Doc;
    const before = doc.subscription;
    const base = { ...before, cancelAt: "", updatedAt: at };
    const next: Subscription = to === "reset"
      ? { ...base, kind: "comp", paidUntil: today }
      : to === "free-ended"
        ? { ...base, kind: "trial", paidUntil: today }
        : { ...base, kind: "paid", paidUntil: addDays(today, -Math.trunc(to)) };
    const entry: HistoryEntry = {
      id: `clock:${at}`, type: "sandbox-clock", at, by: "sandbox",
      detail: { day: to }, before: snap(before), after: snap(next),
    };
    return { next: { ...doc, subscription: next, sentNotices: [], history: [...doc.history, entry] }, result: { ok: true } };
  });
}
