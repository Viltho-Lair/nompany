// A STUDIO'S SUBSCRIPTION TO NOMPANY — what it has paid for, until when, and
// what it may do because of that. Pure: no store, no clock. The caller passes
// "today" in, so every rule here is asserted without waiting a month.
//
// DATES ARE STORED, THE STATUS IS NOT (23/09/2026, agreed with the owner). The
// one date that matters is `paidUntil`, the first day NOT covered, and the
// status is worked out from it on every read. A stored "active" flag has to be
// flipped by a job, and the night the job fails a studio either keeps working
// unpaid or is locked a day late; a date cannot be forgotten. Jobs send
// reminders and take renewals; they never decide what a studio may do.
//
// ONLY A PAYMENT EVENT MOVES `paidUntil` FORWARD, and only a reversal (a bounced
// transfer, a chargeback) moves it back. A refused payment moves nothing:
// money that never arrived cannot take away days already paid for. Every event
// carries an id and an id is applied once, so a webhook delivered twice extends
// a subscription once.
//
// WHICH DAY IT IS, IS AMMAN'S — nompany's own clock, not the studio's. "Expires
// on the 14th" has to mean one moment for every customer, and it is the day the
// invoice is declared on.
//
// THE OWNER'S NUMBERS (23/09/2026): a new studio is on trial for three months;
// an unpaid one keeps working for three months of grace, then goes read-only;
// studios that existed before subscriptions are complimentary. Trial and grace
// are catalogue settings, passed in here, not constants.

import { dayIn } from "./timezone";

export const BILLING_TIMEZONE = "Asia/Amman";

/** Today, or any instant, as nompany's billing day (YYYY-MM-DD). */
export const billingDay = (at: string | Date = new Date()) => dayIn(at, BILLING_TIMEZONE);

export type BillingPeriod = "monthly" | "yearly";
export const BILLING_PERIODS: readonly BillingPeriod[] = ["monthly", "yearly"];
export const periodMonths = (p: BillingPeriod) => (p === "yearly" ? 12 : 1);

export type SubscriptionKind = "trial" | "paid" | "comp";

export type Subscription = {
  studioId: string;
  /** trial: not paid yet; paid: covered by payments; comp: nompany gives it. */
  kind: SubscriptionKind;
  period: BillingPeriod;
  /** The day of the month it renews on. 31 renews on the last day of short months and comes back to 31. */
  anchorDay: number;
  /** The first day NOT covered (YYYY-MM-DD). For a trial, the day the trial ends. */
  paidUntil: string;
  /** Members paid for. 0 means the package's own ceiling decides. */
  seats: number;
  /**
   * The plan costs nothing — the Free package. Its trial IS the product: when
   * it ends the studio goes read-only at once, with no grace, unless it has
   * picked a paid package (the owner, 23/09/2026).
   */
  free: boolean;
  /** "" or the day it stops (YYYY-MM-DD). Set by a cancellation; cleared by resuming or paying. */
  cancelAt: string;
  /** The last event ids applied, so one delivered twice is applied once. */
  seenEventIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionStatus = "trial" | "active" | "complimentary" | "past_due" | "read_only" | "cancelled";

/** The statuses in which a studio may create and change things. The others can read and export. */
export const WRITABLE_STATUSES: readonly SubscriptionStatus[] = ["trial", "active", "complimentary", "past_due"];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * `n` MONTHS ON FROM A DAY, landing on the anchor day where the month has one.
 * 31 January + 1 is 28 or 29 February, and + 2 is 31 March again — the anchor
 * is remembered, so a subscription started on the 31st does not drift to the
 * 28th for ever after its first February. Negative `n` walks back the same way.
 */
export function addMonths(day: string, n: number, anchorDay?: number): string {
  if (!DAY.test(day)) return day;
  const [y, m, d] = day.split("-").map(Number);
  const total = y * 12 + (m - 1) + Math.trunc(n);
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const want = anchorDay && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : d;
  const dd = Math.min(want, daysInMonth(year, month));
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

const dayOf = (day: string) => Number(day.slice(8, 10)) || 1;

/** The last day an unpaid studio may still write: `graceMonths` after `paidUntil`. */
export function graceEnds(sub: Pick<Subscription, "paidUntil">, graceMonths: number): string {
  return addMonths(sub.paidUntil, Math.max(0, graceMonths));
}

/**
 * WHAT THIS STUDIO MAY DO TODAY, worked out rather than stored. Read in this
 * order, and the order is the rule:
 *
 *  1. a cancellation that has taken effect — nothing renews any more;
 *  2. complimentary — nompany gives it, nothing lapses;
 *  3. a trial still running;
 *  4. a FREE plan whose time is up — read-only at once. Grace is for a paying
 *     customer who is late, and the Free package has nothing to be late with:
 *     it lasts three months and then the studio picks a paid package (the
 *     owner, 23/09/2026: "Free package ends after 3 months unless the studio
 *     picks a paid package");
 *  5. paid up;
 *  6. unpaid but inside the grace months — still fully working, being reminded;
 *  7. otherwise read-only — everything visible and exportable, nothing new.
 *
 * Nothing here deletes anything, at any status.
 */
export function subscriptionStatus(
  sub: Pick<Subscription, "kind" | "paidUntil" | "free" | "cancelAt">,
  today: string,
  graceMonths: number,
): SubscriptionStatus {
  if (sub.cancelAt && today >= sub.cancelAt) return "cancelled";
  if (sub.kind === "comp") return "complimentary";
  if (sub.kind === "trial" && today < sub.paidUntil) return "trial";
  if (sub.free) return today < sub.paidUntil ? "active" : "read_only";
  if (today < sub.paidUntil) return "active";
  if (today < graceEnds(sub, graceMonths)) return "past_due";
  return "read_only";
}

export const canWrite = (status: SubscriptionStatus) => WRITABLE_STATUSES.includes(status);

/** A NEW STUDIO: on trial from today for `trialMonths`, renewing on today's day of the month. */
export function newTrial(input: { studioId: string; today: string; trialMonths: number; free: boolean; seats?: number; at: string }): Subscription {
  const anchorDay = dayOf(input.today);
  return {
    studioId: input.studioId, kind: "trial", period: "monthly", anchorDay,
    paidUntil: addMonths(input.today, Math.max(0, input.trialMonths), anchorDay),
    seats: Math.max(0, Math.trunc(input.seats || 0)), free: input.free, cancelAt: "",
    seenEventIds: [], createdAt: input.at, updatedAt: input.at,
  };
}

/**
 * A STUDIO THAT EXISTED BEFORE SUBSCRIPTIONS: complimentary, on the owner's
 * instruction (23/09/2026), so nobody is suddenly past due for a bill nobody
 * ever sent them. `paidUntil` is today so that, the day somebody takes the
 * complimentary mark off, the studio is due that day rather than years back.
 */
export function complimentary(input: { studioId: string; today: string; at: string; free?: boolean }): Subscription {
  return {
    studioId: input.studioId, kind: "comp", period: "monthly", anchorDay: dayOf(input.today),
    paidUntil: input.today, seats: 0, free: Boolean(input.free), cancelAt: "",
    seenEventIds: [], createdAt: input.at, updatedAt: input.at,
  };
}

export type BillingEvent = { id: string } & (
  /** Money arrived for `periods` periods. */
  | { type: "paid"; periods: number; amount?: number; currency?: string; method?: string; reference?: string }
  /** A payment that was counted came back — a bounced transfer, a chargeback. */
  | { type: "reversed"; periods: number; reason?: string }
  /** A charge was refused. Recorded for the history; it moves no date. */
  | { type: "failed"; reason?: string }
  | { type: "comp"; on: boolean }
  | { type: "trial-extended"; until: string }
  | { type: "cancel" }
  | { type: "resume" }
  | { type: "plan-changed"; seats?: number; free?: boolean; period?: BillingPeriod }
);

const SEEN_KEEP = 200;

/**
 * ONE EVENT APPLIED. Returns the subscription after it, whether anything
 * changed, and a problem ("" when there is none) — a refused event changes
 * nothing, and the problem names why so the console can say it.
 *
 * WHEN MONEY ARRIVES (`paid`) the new period runs from `paidUntil`, whether the
 * payment was early, on time or inside the grace months: a studio that kept
 * working through grace used those days and they are what it is paying for.
 * ONLY A STUDIO THAT HAD GONE READ-ONLY starts again from the day it paid, with
 * that day as its new anchor — it could not work while locked, so it is not
 * charged for the locked days.
 */
export function applyEvent(
  sub: Subscription,
  event: BillingEvent,
  today: string,
  graceMonths: number,
  at: string,
): { sub: Subscription; changed: boolean; problem: string } {
  const same = { sub, changed: false, problem: "" };
  if (!event.id) return { ...same, problem: "missing-id" };
  if (sub.seenEventIds.includes(event.id)) return same;

  const refuse = (problem: string) => ({ sub, changed: false, problem });
  const months = periodMonths(sub.period);
  let next: Subscription = { ...sub };

  switch (event.type) {
    case "paid": {
      const periods = Math.trunc(Number(event.periods));
      if (!(periods >= 1 && periods <= 36)) return refuse("bad-periods");
      // Money is not taken for what nompany gives away; the mark comes off first.
      if (sub.kind === "comp") return refuse("complimentary");
      const lapsed = subscriptionStatus({ ...sub, cancelAt: "" }, today, graceMonths) === "read_only";
      const start = lapsed ? today : sub.paidUntil;
      const anchorDay = lapsed ? dayOf(today) : sub.anchorDay;
      next = { ...next, kind: "paid", anchorDay, paidUntil: addMonths(start, periods * months, anchorDay), cancelAt: "" };
      break;
    }
    case "reversed": {
      const periods = Math.trunc(Number(event.periods));
      if (!(periods >= 1 && periods <= 36)) return refuse("bad-periods");
      next = { ...next, paidUntil: addMonths(sub.paidUntil, -periods * months, sub.anchorDay) };
      break;
    }
    case "failed":
      break;
    case "comp":
      if (event.on === (sub.kind === "comp")) return same;
      // OFF MEANS DUE TODAY: the grace months start now, not years ago.
      next = event.on ? { ...next, kind: "comp", cancelAt: "" } : { ...next, kind: "paid", paidUntil: today, anchorDay: dayOf(today) };
      break;
    case "trial-extended":
      if (sub.kind !== "trial") return refuse("not-trial");
      if (!DAY.test(event.until) || event.until <= sub.paidUntil) return refuse("bad-date");
      next = { ...next, paidUntil: event.until };
      break;
    case "cancel":
      if (sub.cancelAt) return same;
      // At the end of what is paid for — or now, for what nobody paid for.
      next = { ...next, cancelAt: sub.kind === "comp" || sub.paidUntil < today ? today : sub.paidUntil };
      break;
    case "resume":
      if (!sub.cancelAt) return same;
      next = { ...next, cancelAt: "" };
      break;
    case "plan-changed":
      if (event.seats !== undefined) next.seats = Math.max(0, Math.trunc(Number(event.seats) || 0));
      if (event.free !== undefined) next.free = Boolean(event.free);
      if (event.period && BILLING_PERIODS.includes(event.period)) next.period = event.period;
      break;
    default:
      return refuse("unknown-event");
  }

  next.seenEventIds = [...sub.seenEventIds, event.id].slice(-SEEN_KEEP);
  next.updatedAt = at;
  return { sub: next, changed: true, problem: "" };
}
