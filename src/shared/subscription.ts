// A STUDIO'S SUBSCRIPTION TO NOMPANY — what it has paid for, until when, and
// what it may do because of that. Pure: no store, no clock. The caller passes
// "today" in, so every rule here is asserted without waiting a year.
//
// DATES ARE STORED, THE STATUS IS NOT (23/09/2026, agreed with the owner). The
// one date that matters is `paidUntil`, the first day NOT covered, and the
// status is worked out from it on every read. A stored "closed" flag has to be
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
// WHICH DAY IT IS, IS AMMAN'S — nompany's own clock, not the studio's. "Due on
// the 14th" has to mean one moment for every customer, and it is the day the
// invoice is declared on.
//
// THE OWNER'S RULES (24/09/2026), which replaced a trial for every studio and a
// three-month grace (23/09):
//
//  - ONLY STANDARD HAS A FREE PERIOD — three months, per studio, and optional:
//    paying at any time ends it and starts the paid package that day. A paid
//    package has no trial and applies only once it is paid. Nothing puts a
//    studio back on a free period once it has left one.
//  - THE UNPAID LADDER, counted in days from the date payment was due (the
//    invoice is issued at the START of the period, day 0):
//        day 0   invoice issued — still fully working        `due`
//        day 20  CLOSED — everything viewable, nothing new   `closed`
//        day 90  SHUT DOWN — members locked out; the owner    `shut_down`
//                sees only pay and download-everything
//        day 365 deleted, through cron/studio-deletions       `expired`
//    Paying at any point before deletion restores the studio at once.
//  - A STANDARD STUDIO AT THE END OF ITS THREE MONTHS takes the same ladder,
//    CLOSED THAT DAY — there is no invoice it was late with. A cancellation
//    that has taken effect is read the same way.

import { dayIn } from "./timezone";

export const BILLING_TIMEZONE = "Asia/Amman";

/** Today, or any instant, as nompany's billing day (YYYY-MM-DD). */
export const billingDay = (at: string | Date = new Date()) => dayIn(at, BILLING_TIMEZONE);

export type BillingPeriod = "monthly" | "yearly";
export const BILLING_PERIODS: readonly BillingPeriod[] = ["monthly", "yearly"];
export const periodMonths = (p: BillingPeriod) => (p === "yearly" ? 12 : 1);

/** The owner's ladder, in days after payment fell due (24/09/2026). */
export const LADDER = Object.freeze({ closedAtDay: 20, shutDownAtDay: 90, deletedAtDay: 365 });

export type SubscriptionKind = "trial" | "paid" | "comp";

export type Subscription = {
  studioId: string;
  /** trial: Standard's free months; paid: covered by payments; comp: nompany gives it. */
  kind: SubscriptionKind;
  period: BillingPeriod;
  /** The day of the month it renews on. 31 renews on the last day of short months and comes back to 31. */
  anchorDay: number;
  /** The first day NOT covered (YYYY-MM-DD). For a trial, the day the free months end. */
  paidUntil: string;
  /** Members paid for. 0 means the package's own ceiling decides. */
  seats: number;
  /** "" or the day it stops (YYYY-MM-DD). Set by a cancellation; cleared by resuming or paying. */
  cancelAt: string;
  /** The last event ids applied, so one delivered twice is applied once. */
  seenEventIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionStatus =
  | "trial" | "active" | "complimentary"
  | "due" | "closed" | "cancelled" | "shut_down" | "expired";

/**
 * WHAT A STATUS LETS PEOPLE DO, which is the only question a route asks:
 *   full        everybody works as normal;
 *   view        everything is readable and exportable, nothing is created or changed;
 *   owner-only  members are locked out; the owner may pay and download everything.
 */
export type StudioAccess = "full" | "view" | "owner-only";

export function accessFor(status: SubscriptionStatus): StudioAccess {
  if (status === "closed" || status === "cancelled") return "view";
  if (status === "shut_down" || status === "expired") return "owner-only";
  return "full";
}

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

/** `n` calendar days on from a day. */
export function addDays(day: string, n: number): string {
  if (!DAY.test(day)) return day;
  const t = Date.parse(`${day}T00:00:00Z`) + Math.trunc(n) * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  if (!DAY.test(from) || !DAY.test(to)) return 0;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const dayOf = (day: string) => Number(day.slice(8, 10)) || 1;

/**
 * THE DAY THE LADDER COUNTS FROM, and whether it skips the open 20 days. A paid
 * studio counts from the day payment fell due; a finished free period or a
 * cancellation that has taken effect counts from that day and is closed at
 * once, because no invoice was issued for it to be late with.
 */
function ladderStart(sub: Pick<Subscription, "kind" | "paidUntil" | "cancelAt">): { from: string; closedAtOnce: boolean } {
  if (sub.cancelAt) return { from: sub.cancelAt, closedAtOnce: true };
  return { from: sub.paidUntil, closedAtOnce: sub.kind === "trial" };
}

/**
 * THE DATES EACH STEP OF THE LADDER FALLS ON for this subscription, as it
 * stands — what the console shows and the warning emails count down to.
 */
export function ladderDates(sub: Pick<Subscription, "kind" | "paidUntil" | "cancelAt">) {
  const { from, closedAtOnce } = ladderStart(sub);
  return {
    dueOn: from,
    closesOn: closedAtOnce ? from : addDays(from, LADDER.closedAtDay),
    shutsDownOn: addDays(from, LADDER.shutDownAtDay),
    deletedOn: addDays(from, LADDER.deletedAtDay),
  };
}

/**
 * WHAT THIS STUDIO MAY DO TODAY, worked out rather than stored. Read in this
 * order, and the order is the rule:
 *
 *  1. complimentary — nompany gives it, nothing lapses;
 *  2. Standard's free months, still running;
 *  3. paid up (or cancelled, but not yet at the end of what was paid for);
 *  4. otherwise the ladder, from the day it fell due.
 *
 * Nothing here deletes anything: `expired` is only what cron/studio-deletions
 * reads to know a studio's year is up.
 */
export function subscriptionStatus(
  sub: Pick<Subscription, "kind" | "paidUntil" | "cancelAt">,
  today: string,
): SubscriptionStatus {
  if (sub.kind === "comp") return "complimentary";
  if (sub.kind === "trial" && !sub.cancelAt && today < sub.paidUntil) return "trial";
  const ends = sub.cancelAt || sub.paidUntil;
  if (today < ends) return sub.kind === "trial" ? "trial" : "active";

  const { from, closedAtOnce } = ladderStart(sub);
  const d = daysBetween(from, today);
  if (d >= LADDER.deletedAtDay) return "expired";
  if (d >= LADDER.shutDownAtDay) return "shut_down";
  if (!closedAtOnce && d < LADDER.closedAtDay) return "due";
  return sub.cancelAt ? "cancelled" : "closed";
}

/** A NEW STANDARD STUDIO: its free months from today, renewing on today's day of the month. */
export function newTrial(input: { studioId: string; today: string; trialMonths: number; seats?: number; at: string }): Subscription {
  const anchorDay = dayOf(input.today);
  return {
    studioId: input.studioId, kind: "trial", period: "monthly", anchorDay,
    paidUntil: addMonths(input.today, Math.max(0, input.trialMonths), anchorDay),
    seats: Math.max(0, Math.trunc(input.seats || 0)), cancelAt: "",
    seenEventIds: [], createdAt: input.at, updatedAt: input.at,
  };
}

/**
 * A STUDIO THAT EXISTED BEFORE SUBSCRIPTIONS: complimentary, on the owner's
 * instruction (23/09/2026), so nobody is suddenly on the ladder for a bill
 * nobody ever sent them. `paidUntil` is today so that, the day somebody takes
 * the complimentary mark off, the studio is due that day rather than years back.
 */
export function complimentary(input: { studioId: string; today: string; at: string }): Subscription {
  return {
    studioId: input.studioId, kind: "comp", period: "monthly", anchorDay: dayOf(input.today),
    paidUntil: input.today, seats: 0, cancelAt: "",
    seenEventIds: [], createdAt: input.at, updatedAt: input.at,
  };
}

export type BillingEvent = { id: string } & (
  /**
   * Money arrived for `periods` periods — for the package and tier named here,
   * which the studio moves to once this is applied: a package applies to the
   * studio it was paid for, once paid.
   */
  | { type: "paid"; periods: number; amount?: number; currency?: string; method?: string; reference?: string; packageId?: string; categoryId?: string; tierId?: string; seats?: number; period?: BillingPeriod }
  /** A payment that was counted came back — a bounced transfer, a chargeback. */
  | { type: "reversed"; periods: number; reason?: string }
  /**
   * MONEY NOMPANY GAVE BACK (26/09/2026). Recorded so the history says what was
   * returned and why. It takes back paid time only when `periods` says so — a
   * goodwill refund of part of a month leaves the studio where it is, while
   * refunding a whole year it will not use takes the year back.
   */
  | { type: "refunded"; periods: number; amount?: number; currency?: string; reference?: string; reason?: string; invoiceNo?: string; creditNoteNo?: string }
  /** A charge was refused. Recorded for the history; it moves no date. */
  | { type: "failed"; reason?: string }
  | { type: "comp"; on: boolean }
  | { type: "trial-extended"; until: string }
  | { type: "cancel" }
  | { type: "resume" }
  | { type: "plan-changed"; seats?: number; period?: BillingPeriod }
);

const SEEN_KEEP = 200;

/**
 * ONE EVENT APPLIED. Returns the subscription after it, whether anything
 * changed, and a problem ("" when there is none) — a refused event changes
 * nothing, and the problem names why so the console can say it.
 *
 * WHEN MONEY ARRIVES (`paid`):
 *  - during Standard's free months, the paid package starts TODAY — paying early
 *    is choosing the bigger package now, not queuing it behind the free months;
 *  - on time, or late but still inside the open 20 days, the new period runs
 *    from `paidUntil`: the studio worked through those days;
 *  - once it has been closed or shut down, it starts again from the day it
 *    paid, with that day as its new anchor — it could not work, so it is not
 *    charged for the locked days.
 */
export function applyEvent(
  sub: Subscription,
  event: BillingEvent,
  today: string,
  at: string,
): { sub: Subscription; changed: boolean; problem: string } {
  const same = { sub, changed: false, problem: "" };
  if (!event.id) return { ...same, problem: "missing-id" };
  if (sub.seenEventIds.includes(event.id)) return same;

  const refuse = (problem: string) => ({ sub, changed: false, problem });
  // A PAYMENT MAY SAY WHICH PERIOD IT PAID FOR — a yearly upgrade recorded as
  // "one period" must buy a year, not whatever period the studio was on before.
  const period = event.type === "paid" && event.period && BILLING_PERIODS.includes(event.period) ? event.period : sub.period;
  const months = periodMonths(period);
  let next: Subscription = { ...sub };

  switch (event.type) {
    case "paid": {
      const periods = Math.trunc(Number(event.periods));
      if (!(periods >= 1 && periods <= 36)) return refuse("bad-periods");
      // Money is not taken for what nompany gives away; the mark comes off first.
      if (sub.kind === "comp") return refuse("complimentary");
      const locked = accessFor(subscriptionStatus(sub, today)) !== "full";
      const restart = sub.kind === "trial" || locked;
      const start = restart ? today : sub.paidUntil;
      const anchorDay = restart ? dayOf(today) : sub.anchorDay;
      next = { ...next, kind: "paid", period, anchorDay, paidUntil: addMonths(start, periods * months, anchorDay), cancelAt: "" };
      if (event.seats !== undefined) next.seats = Math.max(0, Math.trunc(Number(event.seats) || 0));
      break;
    }
    case "reversed": {
      const periods = Math.trunc(Number(event.periods));
      if (!(periods >= 1 && periods <= 36)) return refuse("bad-periods");
      next = { ...next, paidUntil: addMonths(sub.paidUntil, -periods * months, sub.anchorDay) };
      break;
    }
    case "refunded": {
      const periods = Math.trunc(Number(event.periods) || 0);
      if (!(periods >= 0 && periods <= 36)) return refuse("bad-periods");
      if (!(Number(event.amount) > 0)) return refuse("bad-amount");
      if (periods) next = { ...next, paidUntil: addMonths(sub.paidUntil, -periods * months, sub.anchorDay) };
      break;
    }
    case "failed":
      break;
    case "comp":
      if (event.on === (sub.kind === "comp")) return same;
      // OFF MEANS DUE TODAY: the ladder starts now, not years ago.
      next = event.on ? { ...next, kind: "comp", cancelAt: "" } : { ...next, kind: "paid", paidUntil: today, anchorDay: dayOf(today) };
      break;
    case "trial-extended":
      // The free months can be lengthened by nompany; nothing starts them again.
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
      if (event.period && BILLING_PERIODS.includes(event.period)) next.period = event.period;
      break;
    default:
      return refuse("unknown-event");
  }

  next.seenEventIds = [...sub.seenEventIds, event.id].slice(-SEEN_KEEP);
  next.updatedAt = at;
  return { sub: next, changed: true, problem: "" };
}

// ---- what a request may do -------------------------------------------------

/**
 * STUDIO PATHS THAT STAY OPEN WHATEVER THE SUBSCRIPTION SAYS — each of them a
 * read or a courtesy that changes no business record: marking a notification
 * read, asking which rights one holds, the live stream the shell listens on —
 * and asking to UPGRADE, which is how a closed or shut-down studio's owner asks
 * to pay (that route is owner-only). Everything else under
 * /api/studios/<slug>/ answers to the ladder.
 */
// `sandbox-clock` is here so a rehearsal can move a shut-down studio back; the
// route answers 404 everywhere but the sandbox (lib/sandbox).
// `billing` is here for the same reason as `upgrade`: it is where an owner says
// they have paid, and where they read their invoices (owner-only, 26/09/2026).
const ALWAYS_OPEN = /^\/api\/studios\/[^/]+\/(notifications|access-check|stream|upgrade|billing|sandbox-clock)(\/|$)/;

const READS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * WHETHER THIS REQUEST MAY GO AHEAD, or the refusal that says why. "" lets it
 * through. The one decision the route wrapper and the routes outside it share,
 * so the ladder cannot mean one thing in one door and another in the next.
 *
 *  - full        everything goes;
 *  - view        reads go, changes are refused `studio-closed`;
 *  - owner-only  members are refused everything `studio-shut-down`; the owner
 *                may still read (downloading everything is reading) and change
 *                nothing.
 */
export function gateRequest(
  access: StudioAccess,
  input: { method: string; path: string; isOwner: boolean },
): "" | "studio-closed" | "studio-shut-down" {
  if (access === "full" || ALWAYS_OPEN.test(input.path)) return "";
  const read = READS.has(String(input.method).toUpperCase());
  if (access === "owner-only") return input.isOwner && read ? "" : "studio-shut-down";
  return read ? "" : "studio-closed";
}

// ---- the warnings the Terms promise ----------------------------------------

/** Days before shut-down and before deletion that the owner is warned (Terms 1.4 §5). */
export const WARNING_DAYS = Object.freeze([30, 7, 1]);

export type NoticeKind = "shut-down" | "deletion";
export type Notice = { key: string; kind: NoticeKind; days: number; on: string; daysLeft: number };

/**
 * THE WARNINGS DUE TODAY, and the keys to mark sent. For each coming step —
 * shut-down, and deletion — the most urgent threshold that has been reached
 * and not yet sent. ONE email per step per run, never three: a job that missed
 * a week and wakes up six days before shut-down sends the seven-day warning,
 * and marks the thirty-day one sent with it rather than sending it late.
 *
 * Keyed by the step's DATE as well as its threshold, so a studio that pays,
 * lapses again and faces a new shut-down date is warned afresh. A studio not on
 * the ladder — paid up, on a free period, complimentary — gets nothing.
 */
export function noticesDue(
  sub: Pick<Subscription, "kind" | "paidUntil" | "cancelAt">,
  today: string,
  sent: readonly string[],
): { send: Notice[]; markSent: string[] } {
  const status = subscriptionStatus(sub, today);
  const dates = ladderDates(sub);
  const steps: { kind: NoticeKind; on: string; applies: boolean }[] = [
    { kind: "shut-down", on: dates.shutsDownOn, applies: ["due", "closed", "cancelled"].includes(status) },
    { kind: "deletion", on: dates.deletedOn, applies: status === "shut_down" },
  ];
  const send: Notice[] = [];
  const markSent: string[] = [];
  for (const step of steps) {
    if (!step.applies) continue;
    const daysLeft = daysBetween(today, step.on);
    if (daysLeft <= 0) continue;
    const reached = WARNING_DAYS.filter((d) => daysLeft <= d);
    if (!reached.length) continue;
    const urgent = Math.min(...reached);
    const key = (d: number) => `${step.kind}:${d}:${step.on}`;
    if (sent.includes(key(urgent))) continue;
    send.push({ key: key(urgent), kind: step.kind, days: urgent, on: step.on, daysLeft });
    for (const d of reached) markSent.push(key(d));
  }
  return { send, markSent };
}

/**
 * MAY AN UNPAID STUDIO BE DELETED TODAY? Only when its year is up (`expired`)
 * AND the last warning before deletion — the one-day one — was sent. The Terms
 * promise warnings before deletion; a studio whose warnings never went out,
 * because email was down or disabled, is kept rather than deleted unwarned.
 */
export function unpaidDeletionDue(
  sub: Pick<Subscription, "kind" | "paidUntil" | "cancelAt">,
  today: string,
  sent: readonly string[],
): "" | "not-expired" | "not-warned" {
  if (subscriptionStatus(sub, today) !== "expired") return "not-expired";
  const lastWarning = `deletion:${Math.min(...WARNING_DAYS)}:${ladderDates(sub).deletedOn}`;
  return sent.includes(lastWarning) ? "" : "not-warned";
}

// ---- what is coming, for the console's billing watch -----------------------

export type NextStep = "free-period-ends" | "closes" | "shuts-down" | "deleted";

/**
 * THE NEXT THING THAT HAPPENS TO THIS STUDIO IF NOBODY PAYS, and when — or null
 * when nothing is coming (paid up beyond the watch window, complimentary). The
 * console's billing watch lists every studio with one, soonest first; the
 * warnings the owner has been sent are shown beside it.
 *
 * `withinDays` bounds only the healthy statuses: a free period or a paid period
 * ending soon is worth watching, one ending in eleven months is not. Anything
 * already on the ladder is always listed.
 */
export function nextStep(
  sub: Pick<Subscription, "kind" | "paidUntil" | "cancelAt">,
  today: string,
  withinDays = 30,
): { status: SubscriptionStatus; step: NextStep; on: string; daysLeft: number } | null {
  const status = subscriptionStatus(sub, today);
  const d = ladderDates(sub);
  const at = (step: NextStep, on: string) => ({ status, step, on, daysLeft: daysBetween(today, on) });
  if (status === "complimentary") return null;
  if (status === "trial" || status === "active") {
    const ends = sub.cancelAt || sub.paidUntil;
    if (daysBetween(today, ends) > withinDays) return null;
    return at(status === "trial" ? "free-period-ends" : "closes", status === "trial" ? ends : d.closesOn);
  }
  if (status === "due") return at("closes", d.closesOn);
  if (status === "closed" || status === "cancelled") return at("shuts-down", d.shutsDownOn);
  return at("deleted", d.deletedOn);
}
