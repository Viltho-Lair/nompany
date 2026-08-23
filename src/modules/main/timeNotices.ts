// TIME-DRIVEN NOTICES — what the passage of time makes worth telling someone.
//
// An invoice nobody chased, a permit about to lapse, an ID that expires next
// week: none of these is caused by a click, so no request produces the notice.
// A daily cron does, by scanning every studio and asking these PURE functions
// "as of today, what crosses a line worth a notification?".
//
// STATELESS BY DESIGN. The cron runs every day, so a naive "it is overdue"
// would fire the same notice every morning forever. Instead a notice fires only
// on fixed day-MILESTONES — the day it becomes overdue, then a week later, then
// a fortnight, and so on — so each is announced once as it passes, with nothing
// stored to remember it by. A record sitting between milestones produces
// nothing that day. This is the whole reason there is no "already notified"
// flag anywhere: the milestone IS the dedupe.
//
// Pure and testable to the day: given rows and a date, they return descriptors.
// The cron turns a descriptor into a notification and decides who hears it.

import { invoiceTotals } from "@/modules/finance/finance";
import { expiringDocuments } from "@/modules/hr/hr";

// Overdue is chased harder early, then at widening intervals. Expiring is warned
// about from a month out, tightening as the day nears (0 = expires today).
export const OVERDUE_MILESTONES = [1, 7, 14, 30, 60, 90];
export const EXPIRING_MILESTONES = [30, 14, 7, 3, 1, 0];

// Whole days between two ISO dates, positive when `to` is the later. Date-only
// values compared at UTC midnight — the same day math the aging reports use, so
// "overdue" here and on the dashboard mean the same thing.
function daysBetween(fromISO: string, toISO: string): number | null {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

export type OverdueNotice = {
  recordId: string;
  reference: string;
  name: string;        // client or vendor, snapshotted on the record
  daysOverdue: number;
  outstanding: number;
};

// The rows an invoice/bill list holds — enough to total and to age. Both an
// invoice and a bill satisfy it, which is why one function shape serves both.
type Owing = {
  id?: string;
  reference?: string;
  status?: string;
  dueDate?: string;
  lines?: unknown;
  vatRate?: unknown;
  payments?: unknown;
};

function overdueNotices(rows: Owing[], nameOf: (r: Owing) => string, todayISO: string): OverdueNotice[] {
  const out: OverdueNotice[] = [];
  for (const r of rows) {
    // A draft or cancelled document is not yet an obligation; a paid one is
    // settled. Only a live, unpaid claim can be overdue.
    if (r.status === "Draft" || r.status === "Cancelled" || r.status === "Paid") continue;
    if (!r.dueDate) continue;
    const { outstanding } = invoiceTotals(r);
    if (outstanding <= 0) continue;
    const days = daysBetween(r.dueDate, todayISO);
    if (days === null || !OVERDUE_MILESTONES.includes(days)) continue;
    out.push({
      recordId: String(r.id || ""),
      reference: String(r.reference || ""),
      name: nameOf(r),
      daysOverdue: days,
      outstanding,
    });
  }
  return out;
}

/** Invoices that crossed an overdue milestone today (money owed TO the studio). */
export function overdueInvoiceNotices(invoices: (Owing & { clientName?: string })[], todayISO: string): OverdueNotice[] {
  return overdueNotices(invoices, (r) => String((r as { clientName?: string }).clientName || "—"), todayISO);
}

/** Bills that crossed an overdue milestone today (money the studio OWES). */
export function overdueBillNotices(bills: (Owing & { vendorName?: string })[], todayISO: string): OverdueNotice[] {
  return overdueNotices(bills, (r) => String((r as { vendorName?: string }).vendorName || "—"), todayISO);
}

export type ExpiringNotice = {
  recordId: string;
  reference: string;
  name: string;
  kind: string;        // what is expiring — "ID", "Passport", a permit type
  date: string;
  daysLeft: number;    // 0 = expires today; negative would be lapsed
};

/**
 * HR documents (ID / passport) that cross an expiry milestone today. Built on
 * hr's own `expiringDocuments`, filtered to the milestones so it fires once as
 * each threshold is passed rather than every day inside the window.
 */
export function expiringDocumentNotices(employees: Record<string, unknown>[], today: Date): ExpiringNotice[] {
  return expiringDocuments(employees, today)
    .filter((d) => EXPIRING_MILESTONES.includes(d.daysLeft))
    .map((d) => ({
      recordId: d.collaboratorId,
      reference: "",
      name: d.alias,
      kind: d.kind,
      date: d.date,
      daysLeft: d.daysLeft,
    }));
}

type PermitRow = { id?: string; reference?: string; label?: string; type?: string; validTo?: string };

/**
 * Permits crossing an expiry milestone today. A permit's `validTo` is its last
 * valid day; the notice warns before it lapses so it can be renewed in time.
 */
export function expiringPermitNotices(permits: PermitRow[], todayISO: string): ExpiringNotice[] {
  const out: ExpiringNotice[] = [];
  for (const p of permits) {
    if (!p.validTo) continue;
    const days = daysBetween(todayISO, p.validTo);
    if (days === null || !EXPIRING_MILESTONES.includes(days)) continue;
    out.push({
      recordId: String(p.id || ""),
      reference: String(p.reference || ""),
      name: String(p.label || p.type || "Permit"),
      kind: String(p.type || "Permit"),
      date: p.validTo,
      daysLeft: days,
    });
  }
  return out;
}
