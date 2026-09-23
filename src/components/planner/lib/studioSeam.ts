import type { Resource, WorkCalendar } from '@/components/planner/lib/types';

// THE TWO THINGS A PLAN DOOR HANDS BACK BESIDE THE DOCUMENT — the studio's
// people and its working week — shaped into the planner's own types. They live
// here rather than in StudioPlanner because two screens read the same door: the
// editor and its print sheet. Importing them from the editor would put the whole
// editing shell (and the date pickers behind it) into the print tab for the sake
// of two small functions.

// A palette for the assignee chips — a person keeps the same colour every visit
// because it is picked by a stable hash of their collaborator id, not their
// position in the list.
const AVATAR_COLORS = [
  '#4573D2', '#5DA283', '#E8A33D', '#CD5B45', '#8B5CF6',
  '#0EA5E9', '#DB2777', '#65A30D', '#0D9488', '#F59E0B',
];

function hashInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsOf(name: string): string {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// The studio's working week (Sunday-first {on,from,to} per day) as the planner's
// calendar: which weekdays are worked, and the earliest-to-latest hour window
// across them. Fed from the studio, never edited in the plan, so a plan can
// never describe a different week from the studio's rota.
const DAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};
function hourOf(t: unknown, fallback: number): number {
  const n = parseInt(String(t || '').split(':')[0], 10);
  return Number.isFinite(n) ? n : fallback;
}

type WorkDay = { on?: boolean; from?: string; to?: string } | null | undefined;

export function calendarFromWorkWeek(
  workWeek: Record<string, WorkDay> | null | undefined,
): Pick<WorkCalendar, 'workingWeekdays' | 'dayStartHour' | 'dayEndHour'> | null {
  const open = Object.entries(workWeek || {}).filter(([, v]) => v?.on);
  if (!open.length) return null; // nothing configured — keep the store default
  const workingWeekdays = open
    .map(([name]) => DAY_INDEX[name])
    .filter((n) => n !== undefined)
    .sort((a, b) => a - b);
  const starts = open.map(([, v]) => hourOf(v?.from, 9));
  const ends = open.map(([, v]) => hourOf(v?.to, 17));
  const dayStartHour = Math.min(...starts);
  const dayEndHour = Math.max(Math.max(...ends), dayStartHour + 1);
  return { workingWeekdays, dayStartHour, dayEndHour };
}

// The studio's collaborators, shaped into the planner's Resource. A task stores
// only the collaborator id in assigneeIds; everything else here is presentation
// rebuilt each load, so renaming a person in the studio updates the plan.
export function peopleToResources(
  people: unknown,
  tr: { unnamed: string },
): Resource[] {
  const list = Array.isArray(people) ? (people as { id: string; name?: string; role?: string }[]) : [];
  return list.map((p) => ({
    id: p.id,
    name: p.name || tr.unnamed,
    initials: initialsOf(p.name || ''),
    role: p.role || 'member',
    color: AVATAR_COLORS[hashInt(String(p.id)) % AVATAR_COLORS.length],
    rate: 0,
    capacity: 100,
  }));
}
