import type { WorkCalendar, ZoomLevel } from '@/components/planner/lib/types';
import {
  addCalendarDays,
  calendarDaysBetween,
  isNonWorkingDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/components/planner/lib/schedule/calendar';
import { formatShortDate } from '@/components/planner/lib/utils';

/* ------------------------------------------------------------------ *
 * Timeline geometry.
 *
 * The chart is laid out in *calendar* days so that weekends stay
 * visible as physical gaps - that is the whole point of a waterfall
 * view. Working-time maths lives in the engine; this file only turns
 * instants into pixels.
 * ------------------------------------------------------------------ */

export const ROW_HEIGHT = 36;
export const HEADER_HEIGHT = 56;

export interface ZoomPreset {
  id: ZoomLevel;
  labelKey: string;
  pxPerDay: number;
  /** how the lower header band is chunked */
  lower: 'hour' | 'day' | 'week' | 'month';
  upper: 'day' | 'week' | 'month' | 'quarter';
  /** draw one shaded cell per calendar day (too noisy when zoomed far out) */
  dayCells: boolean;
}

export const ZOOM_PRESETS: ZoomPreset[] = [
  { id: 'hour',    labelKey: 'zoomHours',    pxPerDay: 960, lower: 'hour',  upper: 'day',     dayCells: true },
  { id: 'day',     labelKey: 'zoomDays',     pxPerDay: 150, lower: 'day',   upper: 'week',    dayCells: true },
  { id: 'week',    labelKey: 'zoomWeeks',    pxPerDay: 40,  lower: 'day',   upper: 'month',   dayCells: true },
  { id: 'month',   labelKey: 'zoomMonths',   pxPerDay: 11,  lower: 'week',  upper: 'month',   dayCells: false },
  { id: 'quarter', labelKey: 'zoomQuarters', pxPerDay: 3.6, lower: 'month', upper: 'quarter', dayCells: false },
];

export function zoomPreset(zoom: ZoomLevel): ZoomPreset {
  return ZOOM_PRESETS.find((z) => z.id === zoom) ?? ZOOM_PRESETS[2];
}

export interface Tick {
  key: string;
  label: string;
  x: number;
  width: number;
  emphasis?: boolean;
}

export interface DayCell {
  key: string;
  x: number;
  width: number;
  nonWorking: boolean;
  date: Date;
}

export interface Timeline {
  origin: Date;
  end: Date;
  pxPerDay: number;
  width: number;
  upper: Tick[];
  lower: Tick[];
  dayCells: DayCell[];
  /** x position of "now", or null when it falls outside the window */
  todayX: number | null;
  /** the full calendar-day column that contains "now", for column highlight */
  todayColumn: { x: number; width: number } | null;
  preset: ZoomPreset;
  x: (date: Date) => number;
  dateAt: (x: number) => Date;
}

/** Left/right breathing room, in calendar days, scaled to the zoom. */
function padDays(preset: ZoomPreset): number {
  switch (preset.id) {
    case 'hour':
      return 1;
    case 'day':
      return 3;
    case 'week':
      return 7;
    case 'month':
      return 21;
    default:
      return 60;
  }
}

function alignOrigin(d: Date, preset: ZoomPreset): Date {
  switch (preset.upper) {
    case 'month':
      return startOfMonth(d);
    case 'quarter': {
      const out = startOfMonth(d);
      out.setMonth(Math.floor(out.getMonth() / 3) * 3);
      return out;
    }
    case 'week':
      return startOfWeek(d);
    default:
      return startOfDay(d);
  }
}

// THE HEADER IS DATES AND TWO WORDS. A pure function has no dictionary, so
// both come in — the same shape the board's seed takes.
export type TimelineWords = { weekOf: string; quarterPrefix: string };

export function buildTimeline(
  projectStart: Date,
  projectEnd: Date,
  zoom: ZoomLevel,
  cal: WorkCalendar,
  fit = false,
  locale = 'en',
  words: TimelineWords = { weekOf: 'Week of', quarterPrefix: 'Q' },
): Timeline {
  const preset = zoomPreset(zoom);
  // "Fit to tasks" means EXACTLY the window the caller asked for — one day either
  // side of the work. The three comforts below (breathing-room padding, aligning
  // the origin to a week/month boundary, and a minimum screenful) each widen the
  // window, so together they were quietly re-adding the days the trim removed.
  // In fit mode all three are off and the caller's range is honoured to the day.
  const pad = fit ? 0 : padDays(preset);

  const origin = fit
    ? startOfDay(projectStart)
    : alignOrigin(addCalendarDays(projectStart, -pad), preset);
  const rawEnd = fit ? startOfDay(projectEnd) : addCalendarDays(projectEnd, pad);
  // Always render at least a couple of screens worth of timeline — except in fit
  // mode, where a short plan is meant to look short.
  const minDays = fit ? 1 : Math.ceil(1400 / preset.pxPerDay);
  const spanDays = Math.max(
    minDays,
    Math.ceil(calendarDaysBetween(origin, rawEnd)) + 1,
  );
  const end = addCalendarDays(origin, spanDays);
  const width = spanDays * preset.pxPerDay;

  const x = (date: Date) =>
    calendarDaysBetween(origin, date) * preset.pxPerDay;
  const dateAt = (px: number) =>
    new Date(origin.getTime() + (px / preset.pxPerDay) * 86_400_000);

  /* ---- day cells (weekend shading) ---- */
  const dayCells: DayCell[] = [];
  if (preset.dayCells) {
    for (let i = 0; i < spanDays; i++) {
      const date = addCalendarDays(origin, i);
      dayCells.push({
        key: `d${i}`,
        x: i * preset.pxPerDay,
        width: preset.pxPerDay,
        nonWorking: isNonWorkingDay(date, cal),
        date,
      });
    }
  }

  /* ---- lower band ---- */
  const lower: Tick[] = [];
  if (preset.lower === 'hour') {
    const step = 2;
    for (let i = 0; i < spanDays; i++) {
      const day = addCalendarDays(origin, i);
      for (let h = 0; h < 24; h += step) {
        const at = new Date(day);
        at.setHours(h, 0, 0, 0);
        const inWindow = h >= cal.dayStartHour && h < cal.dayEndHour;
        lower.push({
          key: `h${i}-${h}`,
          label: inWindow ? `${((h + 11) % 12) + 1}${h < 12 ? 'a' : 'p'}` : '',
          x: x(at),
          width: (step / 24) * preset.pxPerDay,
          emphasis: inWindow,
        });
      }
    }
  } else if (preset.lower === 'day') {
    for (let i = 0; i < spanDays; i++) {
      const date = addCalendarDays(origin, i);
      lower.push({
        key: `l${i}`,
        label: `${date.getDate()}`,
        x: i * preset.pxPerDay,
        width: preset.pxPerDay,
        emphasis: !isNonWorkingDay(date, cal),
      });
    }
  } else if (preset.lower === 'week') {
    let cursor = startOfWeek(origin);
    while (cursor < end) {
      lower.push({
        key: `w${cursor.getTime()}`,
        label: formatShortDate(cursor, locale),
        x: x(cursor),
        width: 7 * preset.pxPerDay,
      });
      cursor = addCalendarDays(cursor, 7);
    }
  } else {
    let cursor = startOfMonth(origin);
    while (cursor < end) {
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 1);
      lower.push({
        key: `m${cursor.getTime()}`,
        label: cursor.toLocaleString(locale === 'ar' ? 'ar' : 'en-GB', { month: 'short' }),
        x: x(cursor),
        width: x(next) - x(cursor),
      });
      cursor = next;
    }
  }

  /* ---- upper band ---- */
  const upper: Tick[] = [];
  if (preset.upper === 'day') {
    for (let i = 0; i < spanDays; i++) {
      const date = addCalendarDays(origin, i);
      upper.push({
        key: `u${i}`,
        label: date.toLocaleString(locale === 'ar' ? 'ar' : 'en-GB', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        x: i * preset.pxPerDay,
        width: preset.pxPerDay,
      });
    }
  } else if (preset.upper === 'week') {
    let cursor = startOfWeek(origin);
    while (cursor < end) {
      upper.push({
        key: `uw${cursor.getTime()}`,
        label: `${words.weekOf} ${formatShortDate(cursor, locale)}`,
        x: x(cursor),
        width: 7 * preset.pxPerDay,
      });
      cursor = addCalendarDays(cursor, 7);
    }
  } else if (preset.upper === 'month') {
    let cursor = startOfMonth(origin);
    while (cursor < end) {
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 1);
      upper.push({
        key: `um${cursor.getTime()}`,
        label: cursor.toLocaleString(locale === 'ar' ? 'ar' : 'en-GB', {
          month: 'long',
          year: 'numeric',
        }),
        x: x(cursor),
        width: x(next) - x(cursor),
      });
      cursor = next;
    }
  } else {
    let cursor = startOfMonth(origin);
    cursor.setMonth(Math.floor(cursor.getMonth() / 3) * 3);
    while (cursor < end) {
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 3);
      upper.push({
        key: `uq${cursor.getTime()}`,
        label: `${words.quarterPrefix}${Math.floor(cursor.getMonth() / 3) + 1} ${cursor.getFullYear()}`,
        x: x(cursor),
        width: x(next) - x(cursor),
      });
      cursor = next;
    }
  }

  const now = new Date();
  const todayX = now >= origin && now <= end ? x(now) : null;
  // The whole day-cell that "now" sits in, so the chart can shade a column rather
  // than draw a hairline the eye slides off. Null when today is out of window.
  const todayStart = startOfDay(now);
  const todayColumn =
    todayStart >= origin && todayStart < end
      ? { x: x(todayStart), width: preset.pxPerDay }
      : null;

  return {
    origin,
    end,
    pxPerDay: preset.pxPerDay,
    width,
    upper,
    lower,
    dayCells,
    todayX,
    todayColumn,
    preset,
    x,
    dateAt,
  };
}
