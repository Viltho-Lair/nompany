// Pure helpers for the projects dashboard + SLA system. Safe on client & server.
import type { Sla, Project, EmergencyVisit } from "./types";

export function addDays(dateStr: string | number | Date, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.round(days));
  return d;
}

// Whole days from today (midnight) until `date`. Negative = in the past.
export function daysUntil(date: string | number | Date | null | undefined) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

// Visit schedule derived from the contract start, duration and visit count.
// Visits are spread evenly across the duration (interval = duration / visits),
// so visit k falls on start + k*interval and the last lands on start+duration.
// `completedVisits` on the SLA is an array of visit indexes marked done.
/**
 * ONE VISIT ON THE SCHEDULE. Derived from the SLA's duration and visit count
 * rather than stored: a plan that is written down goes stale the moment either
 * number is edited, and the dates are wholly a function of the two.
 *
 * `daysRemaining` is null for a date that has already passed — which is
 * different from zero, and is what the dashboard sorts on.
 */
export type SlaVisit = {
  index: number;
  date: Date;
  daysRemaining: number | null;
  completed: boolean;
};

/**
 * A CALL-OUT AS THE DASHBOARD READS IT — the stored record plus the same
 * `daysRemaining` a planned visit carries, so `allVisits` can sort the two
 * kinds together. `emergency` is the discriminant the screen renders on.
 */
export type EmergencyVisitView = EmergencyVisit & {
  daysRemaining: number | null;
  emergency: true;
};

/** Either kind of visit, which is what the "closest visits" list holds. */
export type AnyVisit =
  | (SlaVisit & { emergency: false })
  | EmergencyVisitView;

export function slaVisits(sla: Sla) {
  const start = sla?.startDate;
  if (!start) return [];
  const duration = Number(sla.durationDays) || 365;
  const n = Math.max(1, Math.round(Number(sla.visits) || 1));
  const interval = duration / n;
  const done = new Set(Array.isArray(sla.completedVisits) ? sla.completedVisits : []);
  const out: SlaVisit[] = [];
  for (let k = 1; k <= n; k++) {
    const date = addDays(start, k * interval);
    out.push({ index: k, date, daysRemaining: daysUntil(date), completed: done.has(k) });
  }
  return out;
}

// Ad-hoc emergency visits recorded on the contract (stored, not derived).
// Each item: { id, date, completed }.
export function emergencyVisits(sla: Sla) {
  const list = Array.isArray(sla?.emergencyVisitsList) ? sla.emergencyVisitsList : [];
  return list.map((e): EmergencyVisitView => ({
    ...e, daysRemaining: daysUntil(e.date), emergency: true,
  }));
}

// Contract end date (last day covered by the SLA). Null when the start date
// isn't set yet, so callers can decide how to handle that.
export function contractEndDate(sla: Sla) {
  const start = sla?.startDate;
  if (!start) return null;
  const duration = Number(sla.durationDays) || 365;
  return addDays(start, duration);
}

// Every visit on the SLA — planned + emergency — sorted by date ascending. Used
// by the dashboard so both kinds show up in "closest visits".
export function allVisits(sla: Sla): AnyVisit[] {
  const regular = slaVisits(sla).map((v) => ({ ...v, emergency: false as const }));
  return [...regular, ...emergencyVisits(sla)]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// The soonest visit (planned or emergency) that hasn't passed yet and isn't
// completed, or null.
export function nextVisit(sla: Sla) {
  const upcoming = allVisits(sla).filter((v) => !v.completed && (v.daysRemaining ?? -1) >= 0);
  return upcoming.length ? upcoming[0] : null;
}

// Complementary support window: from the project end date for supportPeriodDays.
export function supportStatus(project: Project | null | undefined) {
  if (!project?.endDate) return { known: false, inSupport: false };
  const days = Number(project.supportPeriodDays ?? 365) || 365;
  const supportEnd = addDays(project.endDate, days);
  const daysRemaining = daysUntil(supportEnd);
  // `daysUntil` returns null for a date it cannot read, and the support window
  // is computed from a project's end date — which is blank until the project
  // has one. A null here means "no end date yet", and out of support is the
  // safe reading of that.
  return { known: true, supportEnd, daysRemaining, inSupport: (daysRemaining ?? -1) >= 0 };
}

export function fmtDate(date: unknown) {
  if (!date) return "—";
  try {
    return new Date(date as string | number | Date).toLocaleDateString("en-GB"); // dd/mm/yyyy everywhere
  } catch {
    return String(date);
  }
}
