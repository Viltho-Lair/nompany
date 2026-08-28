import type { Task } from '@/components/planner/lib/types';
import { snapForward, toISODate } from '@/components/planner/lib/schedule/calendar';
import { DEFAULT_CALENDAR } from '@/components/planner/lib/schedule/calendar';

/* ------------------------------------------------------------------ *
 * A plan's rows.
 *
 * THE SIX BUILT-IN PRESETS WERE REMOVED, and the eight invented people
 * with hourly rates that came with them. They were the planner's demo
 * data: six industry-specific plans — a software delivery, a
 * construction fit-out, a marketing campaign — seeded into every studio
 * on first read whatever business it is in. Industry templates are
 * coming back as their own feature and will live here; until then this
 * file is what a single row is made of.
 *
 * The resolver that turned a preset's relative skeleton (refs, working
 * -day offsets, `after: ['design:SS+2']` links) into dated tasks went
 * with them rather than sitting here uncalled and riding into the
 * planner's chunk. It is worth reading back out of this commit when the
 * industry set is written.
 * ------------------------------------------------------------------ */

export const PHASE_COLORS = [
  '#4573D2', '#F06A6A', '#5DA283', '#F1BD6C',
  '#A87CE0', '#4ECBC4', '#F2A0C0', '#6E7FDB',
];

let counter = 0;
export function newId(prefix = 't'): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${counter}-${rand}`;
}

/** A single empty row, used by "Add task". */
export function blankTask(overrides: Partial<Task> = {}): Task {
  const start = snapForward(new Date(), DEFAULT_CALENDAR);
  return {
    id: newId(),
    parentId: null,
    name: 'New task',
    notes: '',
    assigneeIds: [],
    start: start.toISOString(),
    end: start.toISOString(),
    duration: 1,
    durationUnit: 'days',
    dependencies: [],
    status: 'not_started',
    percentComplete: 0,
    priority: 'medium',
    scheduleMode: 'auto',
    milestone: false,
    collapsed: false,
    effortHours: 8,
    phaseColor: PHASE_COLORS[0],
    ...overrides,
  };
}

export { toISODate };
