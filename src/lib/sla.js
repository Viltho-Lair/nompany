// Pure helpers for the projects dashboard + SLA system. Safe on client & server.

export function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.round(days));
  return d;
}

// Whole days from today (midnight) until `date`. Negative = in the past.
export function daysUntil(date) {
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
export function slaVisits(sla) {
  const start = sla?.startDate;
  if (!start) return [];
  const duration = Number(sla.durationDays) || 365;
  const n = Math.max(1, Math.round(Number(sla.visits) || 1));
  const interval = duration / n;
  const done = new Set(Array.isArray(sla.completedVisits) ? sla.completedVisits : []);
  const out = [];
  for (let k = 1; k <= n; k++) {
    const date = addDays(start, k * interval);
    out.push({ index: k, date, daysRemaining: daysUntil(date), completed: done.has(k) });
  }
  return out;
}

// Ad-hoc emergency visits recorded on the contract (stored, not derived).
// Each item: { id, date, completed }.
export function emergencyVisits(sla) {
  const list = Array.isArray(sla?.emergencyVisitsList) ? sla.emergencyVisitsList : [];
  return list.map((e) => ({ ...e, daysRemaining: daysUntil(e.date), emergency: true }));
}

// Contract end date (last day covered by the SLA). Null when the start date
// isn't set yet, so callers can decide how to handle that.
export function contractEndDate(sla) {
  const start = sla?.startDate;
  if (!start) return null;
  const duration = Number(sla.durationDays) || 365;
  return addDays(start, duration);
}

// Every visit on the SLA — planned + emergency — sorted by date ascending. Used
// by the dashboard so both kinds show up in "closest visits".
export function allVisits(sla) {
  const regular = slaVisits(sla).map((v) => ({ ...v, emergency: false }));
  return [...regular, ...emergencyVisits(sla)].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// The soonest visit (planned or emergency) that hasn't passed yet and isn't
// completed, or null.
export function nextVisit(sla) {
  const upcoming = allVisits(sla).filter((v) => !v.completed && v.daysRemaining >= 0);
  return upcoming.length ? upcoming[0] : null;
}

// Complementary support window: from the project end date for supportPeriodDays.
export function supportStatus(project) {
  if (!project?.endDate) return { known: false, inSupport: false };
  const days = Number(project.supportPeriodDays ?? 365) || 365;
  const supportEnd = addDays(project.endDate, days);
  const daysRemaining = daysUntil(supportEnd);
  return { known: true, supportEnd, daysRemaining, inSupport: daysRemaining >= 0 };
}

export function fmtDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-GB"); // dd/mm/yyyy everywhere
  } catch {
    return String(date);
  }
}
