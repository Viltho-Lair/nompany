// WHO WAS THERE.
//
// ATTENDANCE IS DELIBERATELY NOT AN ENGINE REGISTER, and `progress.md` said so
// before this was built: it is a daily, high-volume record — one row per person
// per day, so a studio of forty people writes eight hundred rows a month — and
// the engine's shape (a form per record, a status ladder, a screen listing
// them) is wrong for something taken in one sweep at the start of a shift.
//
// ONE ROW PER PERSON PER DAY, and that uniqueness is the whole integrity story.
// Two rows for one person on one day is two answers to "were they in", and
// every figure downstream — days worked, overtime, the unpaid deduction on a
// payslip — picks whichever it happens to read first.
//
// A STATUS, NOT A CLOCK. `present`, `absent`, `leave`, `holiday`, `remote`, and
// hours BESIDE the status rather than derived from a pair of timestamps. A
// product that only stored in/out could not record a public holiday, an
// approved absence or a day somebody worked from home — and those are most of
// what an attendance sheet is actually used to say.
//
// PURE. No imports, no store, no clock.

export const ATTENDANCE_STATUSES = ["present", "remote", "absent", "leave", "holiday"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Statuses where somebody was working, whatever else was true of the day. */
export const WORKED: readonly AttendanceStatus[] = ["present", "remote"];

export type AttendanceRow = {
  id: string;
  collaboratorId: string;
  /** `YYYY-MM-DD`. */
  day: string;
  status: AttendanceStatus;
  /** Hours worked. Nought for a day nobody worked. */
  hours: number;
  notes: string;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** What is wrong with this attendance row, or an empty array. */
export function attendanceProblems(input: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!str(input.collaboratorId, 60)) problems.push("attendance belongs to somebody");
  if (!DAY_RE.test(str(input.day, 10))) problems.push("a day is needed");
  const status = str(input.status, 20);
  if (!(ATTENDANCE_STATUSES as readonly string[]).includes(status)) problems.push("pick a status");

  const hours = num(input.hours);
  if (hours < 0) problems.push("hours cannot be negative");
  // TWENTY-FOUR IS THE CAP AND IT IS NOT PEDANTRY. A typo of 80 for 8 sails
  // through every downstream sum and turns up as a month of overtime nobody
  // worked; a real double shift is under 24, so the cap costs nothing true.
  if (hours > 24) problems.push("a day has 24 hours");
  // HOURS ON A DAY NOBODY WORKED is a contradiction, not a rounding matter: a
  // sheet saying somebody was absent for eight hours cannot be read either way.
  if (hours > 0 && status && !(WORKED as readonly string[]).includes(status)) {
    problems.push(`hours cannot be recorded on a day marked "${status}"`);
  }
  return problems;
}

export function cleanAttendance(input: Record<string, unknown>): Omit<AttendanceRow, "id"> {
  const status = str(input.status, 20) as AttendanceStatus;
  return {
    collaboratorId: str(input.collaboratorId, 60),
    day: str(input.day, 10),
    status,
    hours: (WORKED as readonly string[]).includes(status) ? round1(Math.max(0, num(input.hours))) : 0,
    notes: str(input.notes, 300),
  };
}

/** Is this day inside this `YYYY-MM` period? */
export const inPeriod = (day: string, period: string): boolean =>
  PERIOD_RE.test(period) && DAY_RE.test(day) && day.slice(0, 7) === period;

export type MonthSummary = {
  collaboratorId: string;
  worked: number;
  absent: number;
  leave: number;
  holiday: number;
  hours: number;
  /** Days in the period with no row at all. */
  unrecorded: number;
};

/**
 * ONE PERSON'S MONTH.
 *
 * `unrecorded` IS COUNTED AND IS NOT `absent`. A day nobody marked is a day
 * nobody marked — the sheet was not taken, the person may well have been there
 * — and treating it as an absence would dock pay for a supervisor's paperwork.
 * It is the number a studio watches fall as the habit takes hold, and the one a
 * payroll clerk checks before running a month.
 */
export function monthSummary(
  rows: AttendanceRow[],
  collaboratorId: string,
  period: string,
  daysInMonth: number,
): MonthSummary {
  const mine = rows.filter((r) => r.collaboratorId === collaboratorId && inPeriod(r.day, period));
  const count = (s: AttendanceStatus) => mine.filter((r) => r.status === s).length;
  const worked = mine.filter((r) => (WORKED as readonly string[]).includes(r.status)).length;
  return {
    collaboratorId,
    worked,
    absent: count("absent"),
    leave: count("leave"),
    holiday: count("holiday"),
    hours: round1(mine.reduce((sum, r) => sum + num(r.hours), 0)),
    unrecorded: Math.max(0, daysInMonth - mine.length),
  };
}

/**
 * A DAY'S SHEET — everybody, with whatever was recorded for them.
 *
 * EVERYBODY APPEARS, including the unmarked. An attendance screen that listed
 * only the rows already written would hide exactly the people a supervisor
 * opened it to mark, which is every one of them at the start of a shift.
 */
export function daySheet<T extends { id: string; alias?: string }>(
  people: T[],
  rows: AttendanceRow[],
  day: string,
): { collaboratorId: string; alias: string; status: AttendanceStatus | null; hours: number; notes: string }[] {
  const byPerson = new Map(rows.filter((r) => r.day === day).map((r) => [r.collaboratorId, r]));
  return people.map((p) => {
    const row = byPerson.get(String(p.id));
    return {
      collaboratorId: String(p.id),
      alias: String(p.alias || "Unnamed"),
      // NULL, NOT `absent`. Nothing has been said about this person today.
      status: row?.status ?? null,
      hours: row?.hours ?? 0,
      notes: row?.notes ?? "",
    };
  });
}
