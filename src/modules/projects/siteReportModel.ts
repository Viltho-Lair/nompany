// THE DAILY SITE REPORT — what one day on one site actually was.
//
// IT IS THE PRIMARY EVIDENCE IN A DELAY CLAIM, which is the only reason its
// shape matters. A contractor arguing for an extension of time is arguing from
// a contemporaneous diary: who was on site, what plant stood idle, when it
// rained, what stopped and for how long. A report written a fortnight later
// from memory is worth nothing, and a diary with holes in it is worth less than
// one that admits them — which is why `gaps` is computed and reported rather
// than left for somebody to notice.
//
// IT IS NOT A SECOND TIMESHEET, and the distinction is load-bearing. A
// timesheet is the PAYROLL record: whose hours, at what rate, approved by whom.
// A report records what a supervisor OBSERVED at a point in the day — twelve
// joiners on site, two excavators, rain from two o'clock. They are different
// facts about the same day and both are true.
//
// SO NEITHER IS DERIVED FROM THE OTHER, AND BOTH ARE SHOWN. Where they
// disagree the disagreement is the finding — the same posture `threeWayMatch`
// takes with an order's running total against its receipts. Picking one and
// hiding the other is how a site ends up unable to explain its own numbers.
//
// NO IMPORTS, deliberately, and asserted by a test.

export type LabourLine = {
  /** The studio's own word for the trade. Never a fixed vocabulary. */
  trade?: unknown;
  headcount?: unknown;
};

export type PlantLine = {
  description?: unknown;
  count?: unknown;
  /** On site and not working. An idle excavator is a claim line. */
  idle?: unknown;
};

export type DelayLine = {
  description?: unknown;
  hoursLost?: unknown;
  /** weather / access / information / materials / labour / other. */
  cause?: unknown;
};

export type SiteReportLike = {
  id?: unknown;
  reference?: unknown;
  projectId?: unknown;
  /** The DAY this reports on, never the day it was typed. */
  reportDate?: unknown;
  status?: unknown;
  weather?: unknown;
  workStopped?: unknown;
  labour?: unknown;
  plant?: unknown;
  delays?: unknown;
  progress?: unknown;
  visitors?: unknown;
  photos?: unknown;
  submittedByCollaboratorId?: unknown;
  submittedAt?: unknown;
};

export const REPORT_STATUSES = ["Draft", "Submitted"] as const;

export const DELAY_CAUSES = [
  "weather", "access", "information", "materials", "labour", "other",
] as const;

const text = (v: unknown) => String(v ?? "");
const day = (v: unknown) => text(v).slice(0, 10);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []) as T[];

/** A line nobody filled in. Dropped rather than stored as an empty row. */
export const labourIsReal = (l: LabourLine | null | undefined): boolean =>
  Boolean(text(l?.trade).trim()) && num(l?.headcount) > 0;
export const plantIsReal = (p: PlantLine | null | undefined): boolean =>
  Boolean(text(p?.description).trim()) && num(p?.count) > 0;
/**
 * A DELAY WITH NO DESCRIPTION IS NOT ONE. The same rule a back-charge carries:
 * an unexplained number against somebody's programme is a number nobody can
 * answer, and this one may end up in front of an adjudicator.
 */
export const delayIsReal = (d: DelayLine | null | undefined): boolean =>
  Boolean(text(d?.description).trim());

/**
 * WHOLE DAYS BETWEEN TWO ISO DATES. UTC-midnight parse, the same reason every
 * other model in this product gives: a studio in Amman and a server in Iowa
 * must agree about which day a report covers.
 */
export function daysBetween(from: unknown, to: unknown): number | null {
  const a = day(from);
  const b = day(to);
  if (!a || !b) return null;
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 86400000);
}

export type ReportTotals = {
  /** People observed on site, across every trade. */
  headcount: number;
  trades: number;
  plant: number;
  plantIdle: number;
  hoursLost: number;
  /** Hours lost to weather alone — the figure an extension of time turns on. */
  weatherHoursLost: number;
  photos: number;
  hasDelays: boolean;
};

export function reportTotals(report: SiteReportLike | null | undefined): ReportTotals {
  const labour = list<LabourLine>(report?.labour).filter(labourIsReal);
  const plant = list<PlantLine>(report?.plant).filter(plantIsReal);
  const delays = list<DelayLine>(report?.delays).filter(delayIsReal);
  return {
    headcount: labour.reduce((s, l) => s + num(l.headcount), 0),
    trades: labour.length,
    plant: plant.reduce((s, p) => s + num(p.count), 0),
    plantIdle: plant.reduce((s, p) => s + num(p.idle), 0),
    hoursLost: round1(delays.reduce((s, d) => s + num(d.hoursLost), 0)),
    weatherHoursLost: round1(delays
      .filter((d) => text(d.cause) === "weather")
      .reduce((s, d) => s + num(d.hoursLost), 0)),
    photos: list<unknown>(report?.photos).length,
    hasDelays: delays.length > 0,
  };
}

export type LabourCheck = {
  observed: number;
  /**
   * People with hours booked to this project on this date. NULL when no
   * timesheet covers the day at all — "nobody has submitted yet" and "nobody
   * worked" are opposite facts, and only the second is a finding.
   */
  onTimesheets: number | null;
  /** observed − timesheets, null when there is nothing to compare against. */
  difference: number | null;
  agrees: boolean;
};

/**
 * WHAT THE SUPERVISOR SAW AGAINST WHAT PAYROLL WAS TOLD.
 *
 * Counted as DISTINCT PEOPLE with hours on the day, not as hours: a report says
 * twelve joiners were on site, and twelve people booking four hours each is the
 * same twelve people. Comparing headcount to hours would manufacture a
 * disagreement out of a half day.
 *
 * NEITHER NUMBER IS CORRECTED BY THE OTHER. This reports the gap and stops —
 * the report is what somebody observed and the timesheet is what somebody
 * claimed, and deciding between them is a conversation rather than a rounding
 * rule.
 */
export function labourCheck(
  report: SiteReportLike | null | undefined,
  timesheets: unknown,
): LabourCheck {
  const projectId = text(report?.projectId);
  const date = day(report?.reportDate);
  const observed = reportTotals(report).headcount;

  const people = new Set<string>();
  let covered = false;
  for (const sheet of list<{ projectId?: unknown; entries?: unknown }>(timesheets)) {
    if (text(sheet.projectId) !== projectId) continue;
    for (const e of list<{ collaboratorId?: unknown; date?: unknown; normalHours?: unknown; overtimeHours?: unknown }>(sheet.entries)) {
      if (day(e.date) !== date) continue;
      covered = true;
      if (num(e.normalHours) + num(e.overtimeHours) > 0) people.add(text(e.collaboratorId));
    }
  }

  const onTimesheets = covered ? people.size : null;
  return {
    observed,
    onTimesheets,
    difference: onTimesheets === null ? null : observed - onTimesheets,
    agrees: onTimesheets !== null && observed === onTimesheets,
  };
}

export type DiaryGap = { from: string; to: string; days: number };

export type DiaryView = {
  reports: number;
  submitted: number;
  /** The most recent day reported on, which is not the most recent day worked. */
  lastReportDate: string;
  /** Days since that one, as at `asOf`. Null when nothing has been reported. */
  daysSinceLast: number | null;
  /**
   * RUNS OF MISSING DAYS between reports, weekends included — this model does
   * not know a studio's working week and guessing one would invent gaps for a
   * site that works Sundays and hide them for one that does not.
   */
  gaps: DiaryGap[];
  totalHoursLost: number;
  weatherHoursLost: number;
  daysWorkStopped: number;
};

/**
 * THE DIARY AS A WHOLE, and specifically WHERE IT IS MISSING.
 *
 * A gap is the finding. A contemporaneous record with a fortnight absent from
 * the middle stops being contemporaneous, and the moment that matters is the
 * moment somebody is relying on it — by which time the days cannot be
 * reconstructed. Reporting gaps while they are still recent is the only useful
 * time to report them.
 */
export function diaryView(reports: unknown, asOf: unknown): DiaryView {
  const rows = list<SiteReportLike>(reports)
    .filter((r) => day(r.reportDate))
    .slice()
    .sort((a, b) => day(a.reportDate).localeCompare(day(b.reportDate)));

  const gaps: DiaryGap[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const prev = day(rows[i - 1].reportDate);
    const here = day(rows[i].reportDate);
    const apart = daysBetween(prev, here);
    if (apart !== null && apart > 1) gaps.push({ from: prev, to: here, days: apart - 1 });
  }

  const totals = rows.map(reportTotals);
  const last = rows.length ? day(rows[rows.length - 1].reportDate) : "";
  return {
    reports: rows.length,
    submitted: rows.filter((r) => text(r.status) === "Submitted").length,
    lastReportDate: last,
    daysSinceLast: last ? daysBetween(last, asOf) : null,
    gaps,
    totalHoursLost: round1(totals.reduce((s, t) => s + t.hoursLost, 0)),
    weatherHoursLost: round1(totals.reduce((s, t) => s + t.weatherHoursLost, 0)),
    daysWorkStopped: rows.filter((r) => Boolean(r.workStopped)).length,
  };
}

/**
 * WHAT THE SERVER REFUSES, so the screen refuses the same things.
 *
 * `existing` is every report already on this project, so the one-per-day rule
 * can be checked without a second read.
 */
export function reportProblem(
  report: SiteReportLike,
  existing: unknown,
  editingId = "",
): string | null {
  const date = day(report?.reportDate);
  if (!date) return "date";
  if (!text(report?.projectId)) return "project";

  // ONE REPORT PER PROJECT PER DAY. A second is an EDIT of the first, not
  // another document: with two, "what happened on the fourth" has two answers
  // and the diary stops being a diary.
  const clash = list<SiteReportLike>(existing).some(
    (r) => text(r.projectId) === text(report.projectId)
      && day(r.reportDate) === date
      && text(r.id) !== text(editingId),
  );
  if (clash) return "duplicate";

  for (const d of list<DelayLine>(report?.delays).filter(delayIsReal)) {
    if (num(d.hoursLost) < 0) return "negative-hours";
    if (text(d.cause) && !(DELAY_CAUSES as readonly string[]).includes(text(d.cause))) {
      return "cause";
    }
  }
  for (const p of list<PlantLine>(report?.plant).filter(plantIsReal)) {
    // Idle plant is a subset of plant on site, not a separate machine.
    if (num(p.idle) > num(p.count)) return "idle-exceeds";
  }
  return null;
}

/**
 * A SUBMITTED REPORT DOES NOT EDIT, and that is the whole of its evidential
 * value: a contemporaneous record somebody can revise after the argument starts
 * is not contemporaneous. Correcting one is an addendum, which this does not
 * build yet — see the functionality file.
 */
export const reportEditable = (report: SiteReportLike | null | undefined): boolean =>
  text(report?.status) !== "Submitted";
