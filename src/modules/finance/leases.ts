// LEASES ON THE BALANCE SHEET — IFRS 16, the lessee's side.
//
// PURE. The store half is ./leaseService; asserted in tests/leases-model.mjs.
//
// A LEASE WAS RENT, AND UNDER IFRS 16 IT IS A LOAN AND AN ASSET. On the day it
// starts, the studio recognises the RIGHT TO USE the thing (1600) and the
// LIABILITY to pay for it (2500), both at the present value of the payments.
// Each month after that three things happen, posted as one entry:
//   - the right-of-use asset wears out, straight line over the term
//       Dr 5410 Right-of-Use Depreciation   Cr 1610 Accumulated Depreciation — ROU
//   - the liability accrues interest at the lease's rate
//       Dr 5810 Lease Interest              Cr 2500 Lease Liabilities
//   - the month's payment reduces it
//       Dr 2500 Lease Liabilities           Cr the money account it was paid from
// Over the term the liability runs to exactly nought and the asset is fully
// depreciated: the last month's interest takes the rounding, so nothing is left
// sitting in either account after the lease is over.
//
// EVERYTHING IS WORKED IN THE CURRENCY'S MINOR UNITS, the lesson the deferral
// schedules taught: per-month figures rounded one at a time by the ledger would
// otherwise leave the liability a few fils short of nought for ever.
//
// PAYMENTS IN ADVANCE OR IN ARREARS, because leases are written both ways and
// the present value differs: paid at the start of each month, the first
// payment is not discounted at all.

import { toMinor, fromMinor } from "@/shared/money";

export type LeaseTiming = "advance" | "arrears";
export type Lease = {
  id?: string;
  name: string;
  lessor: string;
  /** The day the lease starts; its first month is this day's month. */
  start: string;
  termMonths: number;
  /** The payment each month, in the studio's currency. */
  payment: number;
  timing: LeaseTiming;
  /** The discount rate — the rate implicit in the lease, or the studio's borrowing rate — % a year. */
  annualRate: number;
  /** Where the monthly payment leaves from; empty is 1010 Bank. */
  accountId?: string;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

export function cleanLease(body: Record<string, unknown>): { lease: Lease } | { problems: string[] } {
  const problems: string[] = [];
  const name = text(body?.name);
  if (!name) problems.push("a lease needs a name — what is leased");
  const start = text(body?.start, 10);
  if (!DAY_RE.test(start)) problems.push("a lease needs a start date");
  const termMonths = Math.floor(Number(body?.termMonths) || 0);
  // TWELVE MONTHS OR LESS IS THE SHORT-TERM EXEMPTION: IFRS 16 lets such a
  // lease stay an ordinary expense, which is what a studio records it as.
  if (termMonths <= 12 || termMonths > 600) problems.push("a lease on the balance sheet runs for 13 to 600 months — a shorter one is an ordinary expense");
  const payment = Number(body?.payment) || 0;
  if (!(payment > 0)) problems.push("a lease needs a monthly payment above nought");
  const annualRate = Number(body?.annualRate);
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 50) problems.push("the discount rate is a yearly percentage from 0 to 50");
  if (problems.length) return { problems };
  return {
    lease: {
      name, lessor: text(body?.lessor), start, termMonths, payment,
      timing: body?.timing === "advance" ? "advance" : "arrears", annualRate,
      ...(text(body?.accountId, 60) ? { accountId: text(body?.accountId, 60) } : {}),
    },
  };
}

/** The `YYYY-MM` of each month of the lease, first to last. */
export function leaseMonths(lease: Pick<Lease, "start" | "termMonths">): string[] {
  const [y, m] = lease.start.split("-").map(Number);
  return Array.from({ length: lease.termMonths }, (_, i) => new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7));
}

/** The present value of the payments, in MINOR units. */
export function presentValueMinor(lease: Pick<Lease, "payment" | "termMonths" | "timing" | "annualRate">, currency?: unknown): number {
  const p = toMinor(lease.payment, currency);
  const n = lease.termMonths;
  const r = lease.annualRate / 100 / 12;
  if (!r) return p * n;
  const annuity = (1 - Math.pow(1 + r, -n)) / r;
  return Math.round(p * annuity * (lease.timing === "advance" ? 1 + r : 1));
}

export type LeaseMonth = {
  period: string;
  opening: number;
  interest: number;
  payment: number;
  closing: number;
  depreciation: number;
};

/**
 * THE WHOLE TERM, month by month, in the currency's units: the liability's
 * opening, the interest, the payment and the closing, and the month's
 * depreciation. The last month's interest absorbs the rounding so the closing
 * liability is exactly nought; the last month's depreciation, likewise.
 */
export function leaseSchedule(lease: Lease, currency?: unknown): { initial: number; months: LeaseMonth[] } {
  const pv = presentValueMinor(lease, currency);
  const pay = toMinor(lease.payment, currency);
  const r = lease.annualRate / 100 / 12;
  const n = lease.termMonths;
  const depEach = Math.floor(pv / n);
  const periods = leaseMonths(lease);
  let balance = pv;
  const out: LeaseMonth[] = [];
  for (let i = 0; i < n; i++) {
    const opening = balance;
    const last = i === n - 1;
    let interest: number;
    if (lease.timing === "advance") {
      const afterPay = opening - pay;
      interest = last ? -afterPay : Math.round(afterPay * r);
      balance = afterPay + interest;
    } else {
      interest = last ? pay - opening : Math.round(opening * r);
      balance = opening + interest - pay;
    }
    out.push({
      period: periods[i],
      opening: fromMinor(opening, currency),
      interest: fromMinor(interest, currency),
      payment: lease.payment,
      closing: fromMinor(balance, currency),
      depreciation: fromMinor(last ? pv - depEach * (n - 1) : depEach, currency),
    });
  }
  return { initial: fromMinor(pv, currency), months: out };
}

/** The month's entry lines, given the account ids. Interest can round to nought in a cheap lease; a nought line is left out. */
export function leaseMonthLines(
  m: LeaseMonth,
  ids: { depreciation: string; accumulated: string; interest: string; liability: string; money: string },
) {
  const lines: { accountId: string; debit?: number; credit?: number }[] = [
    { accountId: ids.depreciation, debit: m.depreciation }, { accountId: ids.accumulated, credit: m.depreciation },
    { accountId: ids.liability, debit: m.payment }, { accountId: ids.money, credit: m.payment },
  ];
  if (m.interest > 0) lines.push({ accountId: ids.interest, debit: m.interest }, { accountId: ids.liability, credit: m.interest });
  if (m.interest < 0) lines.push({ accountId: ids.liability, debit: -m.interest }, { accountId: ids.interest, credit: -m.interest });
  return lines.filter((l) => (l.debit || 0) > 0 || (l.credit || 0) > 0);
}
