import type { WorkCalendar } from '@/components/planner/lib/types';

/* ------------------------------------------------------------------ *
 * Working-time calendar.
 *
 * Everything below reduces to one primitive: a working day is a window
 * [dayStartHour, dayEndHour) minus `lunchHours`, on a weekday that is in
 * `workingWeekdays` and not in `holidays`. All duration maths walks that
 * window, so weekends and holidays are skipped for free.
 *
 * The "days" vs "hours" granularity toggle changes two things only:
 *   1. how a duration number is converted to minutes (durationToMinutes)
 *   2. whether starts are snapped to the top of the working day
 * The underlying walk is identical, which keeps the two modes consistent.
 * ------------------------------------------------------------------ */

export const MS_PER_MINUTE = 60_000;

export const DEFAULT_CALENDAR: WorkCalendar = {
  granularity: 'days',
  workingWeekdays: [1, 2, 3, 4, 5],
  dayStartHour: 9,
  dayEndHour: 17,
  lunchHours: 0,
  holidays: [],
};

/** Net working hours available in one full working day. */
export function hoursPerDay(cal: WorkCalendar): number {
  const gross = cal.dayEndHour - cal.dayStartHour;
  return Math.max(0.25, gross - cal.lunchHours);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isWorkingDay(d: Date, cal: WorkCalendar): boolean {
  if (!cal.workingWeekdays.includes(d.getDay())) return false;
  return !cal.holidays.includes(toISODate(d));
}

/** Non-working day - used by the timeline to shade weekend columns. */
export function isNonWorkingDay(d: Date, cal: WorkCalendar): boolean {
  return !isWorkingDay(d, cal);
}

function atHour(d: Date, hour: number): Date {
  const out = new Date(d);
  const h = Math.floor(hour);
  out.setHours(h, Math.round((hour - h) * 60), 0, 0);
  return out;
}

export function dayOpen(d: Date, cal: WorkCalendar): Date {
  return atHour(d, cal.dayStartHour);
}

export function dayClose(d: Date, cal: WorkCalendar): Date {
  return atHour(d, cal.dayEndHour);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Move an instant forward to the next moment work can actually happen.
 * Already-working instants are returned untouched.
 */
export function snapForward(date: Date, cal: WorkCalendar): Date {
  let cur = new Date(date);
  for (let guard = 0; guard < 4000; guard++) {
    if (!isWorkingDay(cur, cal)) {
      cur = dayOpen(addDays(cur, 1), cal);
      continue;
    }
    const open = dayOpen(cur, cal);
    const close = dayClose(cur, cal);
    if (cur < open) return open;
    if (cur >= close) {
      cur = dayOpen(addDays(cur, 1), cal);
      continue;
    }
    return cur;
  }
  return cur;
}

/**
 * Move an instant backward to the last moment work could have happened.
 * Used when scheduling from a finish date (FF / SF links).
 */
export function snapBackward(date: Date, cal: WorkCalendar): Date {
  let cur = new Date(date);
  for (let guard = 0; guard < 4000; guard++) {
    if (!isWorkingDay(cur, cal)) {
      cur = dayClose(addDays(cur, -1), cal);
      continue;
    }
    const open = dayOpen(cur, cal);
    const close = dayClose(cur, cal);
    if (cur > close) return close;
    if (cur <= open) {
      cur = dayClose(addDays(cur, -1), cal);
      continue;
    }
    return cur;
  }
  return cur;
}

/** Convert a duration expressed in `unit` into working minutes. */
export function durationToMinutes(
  duration: number,
  unit: 'days' | 'hours',
  cal: WorkCalendar,
): number {
  if (unit === 'hours') return Math.round(duration * 60);
  return Math.round(duration * hoursPerDay(cal) * 60);
}

export function minutesToDuration(
  minutes: number,
  unit: 'days' | 'hours',
  cal: WorkCalendar,
): number {
  if (unit === 'hours') return round2(minutes / 60);
  return round2(minutes / 60 / hoursPerDay(cal));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Add `minutes` of working time to `start`.
 *
 * Walks working windows day by day, so weekends, holidays and the
 * after-hours gap are all skipped. A zero-length duration (milestone)
 * returns the snapped start unchanged.
 */
export function addWorkingMinutes(
  start: Date,
  minutes: number,
  cal: WorkCalendar,
): Date {
  let cur = snapForward(start, cal);
  if (minutes <= 0) return cur;

  let remaining = minutes;
  for (let guard = 0; guard < 20_000 && remaining > 0; guard++) {
    const close = dayClose(cur, cal);
    const available = (close.getTime() - cur.getTime()) / MS_PER_MINUTE;

    if (available >= remaining) {
      return new Date(cur.getTime() + remaining * MS_PER_MINUTE);
    }
    remaining -= available;
    cur = snapForward(dayOpen(addDays(cur, 1), cal), cal);
  }
  return cur;
}

/** Subtract `minutes` of working time from `end`. Mirror of the above. */
export function subWorkingMinutes(
  end: Date,
  minutes: number,
  cal: WorkCalendar,
): Date {
  let cur = snapBackward(end, cal);
  if (minutes <= 0) return cur;

  let remaining = minutes;
  for (let guard = 0; guard < 20_000 && remaining > 0; guard++) {
    const open = dayOpen(cur, cal);
    const available = (cur.getTime() - open.getTime()) / MS_PER_MINUTE;

    if (available >= remaining) {
      return new Date(cur.getTime() - remaining * MS_PER_MINUTE);
    }
    remaining -= available;
    cur = snapBackward(dayClose(addDays(cur, -1), cal), cal);
  }
  return cur;
}

/**
 * Net working minutes between two instants. Returns 0 when b <= a.
 * This is what lets the grid show a real duration after a user drags an
 * end date across a weekend.
 */
export function workingMinutesBetween(
  a: Date,
  b: Date,
  cal: WorkCalendar,
): number {
  if (b <= a) return 0;
  let cur = snapForward(a, cal);
  const target = snapBackward(b, cal);
  if (target <= cur) return 0;

  let total = 0;
  for (let guard = 0; guard < 20_000; guard++) {
    const close = dayClose(cur, cal);
    if (target <= close) {
      total += (target.getTime() - cur.getTime()) / MS_PER_MINUTE;
      break;
    }
    total += (close.getTime() - cur.getTime()) / MS_PER_MINUTE;
    cur = snapForward(dayOpen(addDays(cur, 1), cal), cal);
    if (cur > target) break;
  }
  return Math.max(0, Math.round(total));
}

/**
 * Apply a lead/lag. Lag is counted in working time in the active unit, so
 * "+2d" on a Thursday finish lands on Monday, not Saturday.
 */
export function applyLag(
  date: Date,
  lag: number,
  unit: 'days' | 'hours',
  cal: WorkCalendar,
): Date {
  if (!lag) return date;
  const minutes = Math.abs(durationToMinutes(lag, unit, cal));
  return lag > 0
    ? addWorkingMinutes(date, minutes, cal)
    : subWorkingMinutes(date, minutes, cal);
}

/**
 * Position helper for the Gantt: fractional calendar days between two
 * instants. Deliberately calendar time, not working time - the chart draws
 * real elapsed days so weekends stay visible as gaps.
 */
export function calendarDaysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 86_400_000;
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function addCalendarDays(d: Date, n: number): Date {
  return addDays(d, n);
}

export function startOfWeek(d: Date, weekStartsOn = 1): Date {
  const out = startOfDay(d);
  const diff = (out.getDay() - weekStartsOn + 7) % 7;
  return addDays(out, -diff);
}

export function startOfMonth(d: Date): Date {
  const out = startOfDay(d);
  out.setDate(1);
  return out;
}

export function parseISO(value: string): Date {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
