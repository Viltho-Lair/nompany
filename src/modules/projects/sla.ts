// Pure date helpers for Projects — the warranty window, and the day arithmetic
// Sales and Tendering borrow. Safe on client & server.
//
// THE SERVICE-CONTRACT VISIT MATHS LEFT THIS FILE on 11/09/2026, with the
// screen: an SLA is a preventive maintenance contract, and its schedule is
// modules/maintenance/contracts now, where the visits become work orders. The
// file keeps its name because three modules import `daysUntil` from it.
import type { Project } from "./types";

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
