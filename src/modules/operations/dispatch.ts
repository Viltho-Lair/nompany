// THE DISPATCH BOARD — one day, every crew, and the jobs nobody is on.
//
// THE SCHEDULE ALREADY DRAWS THE JOBS, so this is not a second copy of it. A
// schedule answers "when is this job"; a dispatch board answers "who is free,
// who is double-booked, and what is still on nobody" — three questions about
// the PEOPLE rather than about the work, and none of them can be read off a
// calendar without counting by hand.
//
// THE THREE IT ADDS, and each exists because the calendar cannot show it:
//
//  - THE UNASSIGNED PEN. A job with an empty `assignedToCollaboratorIds` is
//    scheduled and staffed by nobody. On a calendar it looks identical to a job
//    with a full crew, so the one thing a dispatcher must not miss is the one
//    thing the existing screen cannot show them.
//  - CLASHES. `assignedToCollaboratorIds` is an array and nothing has ever
//    checked whether the same person appears on two jobs at the same time. That
//    is not a validation gap to close at the write — a dispatcher deliberately
//    overlaps a five-minute handover — it is something to SHOW.
//  - LOAD. Hours booked per person, so "who can take this" has an answer.
//
// PURE. No imports, no store, and the day comes in as an argument: a board that
// read its own clock would give a different answer on every call and could not
// be asserted.

/** A job, in the only shape this file needs. */
export type DispatchJob = {
  id: string;
  title?: string;
  status?: string;
  kind?: string;
  location?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  assignedToCollaboratorIds?: string[];
};

export type Lane = {
  collaboratorId: string;
  alias: string;
  jobs: DispatchJob[];
  /** Hours booked on this day, to one decimal. */
  hours: number;
  /** Pairs of this person's jobs that overlap in time. */
  clashes: { a: string; b: string }[];
};

const ms = (v: unknown): number => {
  const t = Date.parse(String(v ?? ""));
  return Number.isFinite(t) ? t : NaN;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The calendar day an instant falls on, in the same UTC the records use. */
export const dayOf = (v: unknown): string => {
  const t = ms(v);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : "";
};

/**
 * IS THIS JOB ON THIS DAY? A job that starts the night before and runs into the
 * morning is on BOTH days, because the crew is unavailable on both — asking
 * only about `scheduledStart` would show a dispatcher an empty morning that is
 * already spoken for.
 */
export function onDay(job: DispatchJob, day: string): boolean {
  const start = dayOf(job.scheduledStart);
  const end = dayOf(job.scheduledEnd) || start;
  if (!start) return false;
  return start <= day && day <= end;
}

/** Do these two jobs overlap in time? Touching ends do not. */
export function overlaps(a: DispatchJob, b: DispatchJob): boolean {
  const [aStart, aEnd, bStart, bEnd] = [
    ms(a.scheduledStart), ms(a.scheduledEnd), ms(b.scheduledStart), ms(b.scheduledEnd)];
  // A JOB WITH NO END CANNOT CLASH. Its duration is unknown, and treating an
  // unknown as "the rest of the day" would report a clash the dispatcher cannot
  // act on and cannot clear — every open-ended job would clash with everything
  // after it, and the panel would be noise within a week.
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
  return aStart < bEnd && bStart < aEnd;
}

/** Hours between a job's two ends, or 0 when either is missing. */
export function hoursOf(job: DispatchJob): number {
  const start = ms(job.scheduledStart);
  const end = ms(job.scheduledEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return round1((end - start) / 3600000);
}

/**
 * THE BOARD FOR ONE DAY.
 *
 * A LANE PER PERSON, INCLUDING THE EMPTY ONES. Somebody with nothing on is the
 * answer to "who can take this", so a board that listed only busy people would
 * hide the one row a dispatcher is looking for.
 *
 * CANCELLED JOBS ARE NOT ON THE BOARD. A cancelled job books nobody and clashes
 * with nothing; leaving it in would inflate every load figure and manufacture
 * clashes against work that is not happening.
 */
export function dispatchBoard(
  jobs: DispatchJob[],
  people: { id: string; alias?: string }[],
  day: string,
): { day: string; lanes: Lane[]; unassigned: DispatchJob[]; totalHours: number } {
  const today = jobs.filter((j) => j.status !== "cancelled" && onDay(j, day));

  const lanes: Lane[] = people.map((p) => {
    const mine = today
      .filter((j) => (j.assignedToCollaboratorIds || []).includes(p.id))
      .sort((a, b) => String(a.scheduledStart || "").localeCompare(String(b.scheduledStart || "")));

    const clashes: { a: string; b: string }[] = [];
    for (let i = 0; i < mine.length; i++) {
      for (let k = i + 1; k < mine.length; k++) {
        if (overlaps(mine[i], mine[k])) clashes.push({ a: mine[i].id, b: mine[k].id });
      }
    }

    return {
      collaboratorId: p.id,
      alias: String(p.alias || "").trim() || "Unnamed",
      jobs: mine,
      hours: round1(mine.reduce((sum, j) => sum + hoursOf(j), 0)),
      clashes,
    };
  })
    // BUSIEST FIRST, then by name. A dispatcher scans down for the first row
    // with room, so the rows with room belong at the bottom where they are
    // found by scrolling to the end rather than hunted for in the middle.
    .sort((a, b) => b.hours - a.hours || a.alias.localeCompare(b.alias));

  const unassigned = today
    .filter((j) => (j.assignedToCollaboratorIds || []).length === 0)
    .sort((a, b) => String(a.scheduledStart || "").localeCompare(String(b.scheduledStart || "")));

  return {
    day,
    lanes,
    unassigned,
    // The day's booked hours across every crew — what the branch has sold, and
    // the number that says whether an extra job fits at all.
    totalHours: round1(lanes.reduce((sum, l) => sum + l.hours, 0)),
  };
}

/**
 * JOBS THAT ARE SCHEDULED, UNSTAFFED AND ALREADY BEHIND.
 *
 * SEPARATE FROM THE DAY'S BOARD because a dispatcher's worst case is not
 * today's gap: it is the job scheduled for last Tuesday that nobody was ever
 * put on and nobody has looked at since. It is invisible on any day view,
 * because the day it is invisible on is one nobody opens any more.
 */
export function strandedJobs(jobs: DispatchJob[], asOf: string): DispatchJob[] {
  return jobs
    .filter((j) =>
      j.status === "scheduled"
      && (j.assignedToCollaboratorIds || []).length === 0
      && dayOf(j.scheduledStart) !== ""
      && dayOf(j.scheduledStart) < asOf)
    .sort((a, b) => String(a.scheduledStart || "").localeCompare(String(b.scheduledStart || "")));
}

/**
 * WHO IS FREE FOR THIS SLOT — every lane holding nothing that overlaps it.
 *
 * IT ANSWERS WITH PEOPLE, NOT WITH A BOOLEAN, because "is anyone free" is not
 * the question a dispatcher asks; "who" is. A lane already clashing with itself
 * is still offered: the person is a legitimate choice and the board says
 * elsewhere that they are double-booked.
 */
export function freeFor(board: { lanes: Lane[] }, slot: DispatchJob): Lane[] {
  return board.lanes.filter((lane) => !lane.jobs.some((j) => j.id !== slot.id && overlaps(j, slot)));
}
