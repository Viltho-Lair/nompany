// DEFERRAL SCHEDULES — revenue earned over time (IFRS 15), and costs paid for
// months not yet had (prepayments). One mechanism for both, because they are
// the same act in two directions: money booked in one month belongs to several.
//
// PURE. The store half is ./scheduleService; asserted in tests/schedules-model.mjs.
//
// WHY A SEPARATE ENTRY AND NOT A DIFFERENT INVOICE POSTING. The invoice still
// posts exactly as it always has — AR, Revenue, VAT — because the invoice is
// true: the customer owes it. What IFRS 15 changes is WHEN the revenue counts,
// and that is said by a second entry beside it: on the day the schedule starts,
// the revenue moves out of the P&L into Deferred Revenue (2300); each month
// then moves its share back. A prepayment is the mirror: the cost moves into
// Prepaid Expenses (1450) and each month releases its share. Nothing about the
// document changes, and cancelling the schedule is reversing its own entries.
//
//   revenue, deferral:     Dr the revenue account   Cr 2300 Deferred Revenue
//   revenue, recognition:  Dr 2300                  Cr the revenue account
//   expense, deferral:     Dr 1450 Prepaid Expenses Cr the expense account
//   expense, recognition:  Dr the expense account   Cr 1450
//
// EACH MONTH'S SHARE IS ITS OWN ENTRY, dated that month's last day and posted
// once (`<scheduleId>:<YYYY-MM>`), so a closed month is never written into and a
// run can catch up on several months at once. The shares are an even spread of
// the amount, the rounding remainder in the last month, so they add up exactly.

import { toMinor, fromMinor } from "@/shared/money";

export const DEFERRED_REVENUE = "2300";
export const PREPAID_EXPENSES = "1450";

export type ScheduleKind = "revenue" | "expense";
export type Schedule = {
  id?: string;
  kind: ScheduleKind;
  /** The P&L account the amount belongs to — Revenue, Rent, Insurance… */
  accountId: string;
  amount: number;
  /** The first month recognised, `YYYY-MM`. */
  from: string;
  months: number;
  description: string;
  /** What it defers — an invoice or bill number, as typed. */
  reference: string;
  /** The day the amount leaves the P&L; the first of `from` unless said. */
  deferredOn: string;
  projectId?: string;
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const round = (n: number) => Math.round(n * 1000) / 1000;

export function monthsFrom(from: string, count: number): string[] {
  if (!MONTH_RE.test(from)) return [];
  const [y, m] = from.split("-").map(Number);
  return Array.from({ length: Math.max(0, count) }, (_, i) => new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7));
}

/**
 * AN AMOUNT OVER `count` MONTHS THAT ADDS UP EXACTLY, the remainder last —
 * split in the CURRENCY'S OWN MINOR UNITS. Split at three places, twelve shares
 * of 1,000 riyals were 83.333 each; the ledger rounds each posting to two, and
 * the year recognised 999.97 while 1,000 sat in Deferred Revenue for ever.
 */
export function evenShares(amount: number, count: number, currency?: unknown): number[] {
  if (count <= 0) return [];
  const total = toMinor(amount, currency);
  const each = Math.floor(total / count);
  return Array.from({ length: count }, (_, i) => fromMinor(i === count - 1 ? total - each * (count - 1) : each, currency));
}

export function cleanSchedule(
  body: Record<string, unknown>,
  accounts: { id?: unknown; type?: unknown; active?: unknown }[],
): { schedule: Schedule } | { problems: string[] } {
  const problems: string[] = [];
  const kind: ScheduleKind = body?.kind === "expense" ? "expense" : "revenue";
  const accountId = text(body?.accountId, 60);
  const account = accounts.find((a) => String(a.id) === accountId);
  // THE ACCOUNT IS OF THE SCHEDULE'S OWN KIND: deferring rent into revenue's
  // liability would move a cost onto the wrong side of the balance sheet.
  if (!account || account.active === false || account.type !== (kind === "revenue" ? "income" : "expense")) {
    problems.push(kind === "revenue" ? "a revenue schedule defers an income account" : "a prepayment defers an expense account");
  }
  const amount = round(Number(body?.amount) || 0);
  if (!(amount > 0)) problems.push("a schedule needs an amount above nought");
  const from = text(body?.from, 7);
  if (!MONTH_RE.test(from)) problems.push("a schedule starts in a month (YYYY-MM)");
  const months = Math.floor(Number(body?.months) || 0);
  // TWO TO A HUNDRED AND TWENTY MONTHS: one month is not a deferral, and ten
  // years is the far end of anything a studio prepays or bills in advance.
  if (months < 2 || months > 120) problems.push("a schedule runs for 2 to 120 months");
  const typedDay = text(body?.deferredOn, 10);
  const deferredOn = DAY_RE.test(typedDay) ? typedDay : `${from}-01`;
  if (MONTH_RE.test(from) && deferredOn.slice(0, 7) > from) problems.push("the amount is deferred on or before the first month it is recognised");
  if (problems.length) return { problems };
  return {
    schedule: {
      kind, accountId, amount, from, months, deferredOn,
      description: text(body?.description), reference: text(body?.reference, 60),
      ...(text(body?.projectId, 60) ? { projectId: text(body?.projectId, 60) } : {}),
    },
  };
}

type Line = { accountId: string; debit?: number; credit?: number; projectId?: string };
const withProject = (l: Line, s: Schedule): Line => (s.projectId && l.accountId === s.accountId ? { ...l, projectId: s.projectId } : l);

/** The day-one entry: the whole amount out of the P&L into the holding account. */
export function deferralLines(s: Schedule, holdingAccountId: string): Line[] {
  const lines: Line[] = s.kind === "revenue"
    ? [{ accountId: s.accountId, debit: s.amount }, { accountId: holdingAccountId, credit: s.amount }]
    : [{ accountId: holdingAccountId, debit: s.amount }, { accountId: s.accountId, credit: s.amount }];
  return lines.map((l) => withProject(l, s));
}

/** One month's share back into the P&L. */
export function recognitionLines(s: Schedule, share: number, holdingAccountId: string): Line[] {
  const lines: Line[] = s.kind === "revenue"
    ? [{ accountId: holdingAccountId, debit: share }, { accountId: s.accountId, credit: share }]
    : [{ accountId: s.accountId, debit: share }, { accountId: holdingAccountId, credit: share }];
  return lines.map((l) => withProject(l, s));
}

/**
 * THE MONTHS DUE BY THE END OF `through` AND NOT YET POSTED, oldest first, with
 * each one's share. A month already posted is never offered again.
 */
export function dueRecognitions(s: Schedule, posted: Set<string>, through: string, currency?: unknown): { period: string; share: number }[] {
  const months = monthsFrom(s.from, s.months);
  const shares = evenShares(s.amount, s.months, currency);
  return months
    .map((period, i) => ({ period, share: shares[i] }))
    .filter((m) => m.period <= through && !posted.has(m.period));
}

/** What has been recognised and what is still held, from the months posted. */
export function scheduleState(s: Schedule, posted: Set<string>, currency?: unknown) {
  const months = monthsFrom(s.from, s.months);
  const shares = evenShares(s.amount, s.months, currency);
  const recognised = round(months.reduce((sum, p, i) => sum + (posted.has(p) ? shares[i] : 0), 0));
  return { recognised, remaining: round(s.amount - recognised), monthsDone: months.filter((p) => posted.has(p)).length, to: months[months.length - 1] || "" };
}
