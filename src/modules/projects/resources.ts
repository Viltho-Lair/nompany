// RESOURCE PLANNING — who is committed to what, across every plan at once.
//
// PURE, AND NO IMPORTS, so the screen and the server answer identically. That is
// the same reason `modules/sales/orderStatus` and `modules/projects/earnedValue`
// are pure, and it matters more here than usual: a person reading "Sara is on
// three jobs that week" has to be able to trust it against what the planner
// shows them when they open one.
//
// WHAT WAS ALREADY THERE, because this is a join rather than new data. A planner
// task has carried `assigneeIds` since the planner was built, a plan carries its
// `resources` with a `capacity` on each, and the schedule engine already writes
// `start` and `end` onto every row. What did not exist was anything that read
// more than ONE plan: the planner is per-project by construction, so "is this
// person over-committed" could not be asked at all — you could only open three
// schedules and hold them in your head.
//
// A DAY IS THE UNIT. Not an hour: a task records how long it lasts and who is on
// it, and nothing anywhere records what FRACTION of somebody's day it wants. So
// an assignment fills a day, and two assignments on one day is a conflict rather
// than "80% plus 40%". That is stated in the functionality file's "Not built
// yet" rather than hidden behind an arithmetic that would look more precise than
// the data underneath it.

export type PlannedTask = {
  id?: unknown;
  name?: unknown;
  assigneeIds?: unknown;
  start?: unknown;
  end?: unknown;
  isSummary?: unknown;
  isMilestone?: unknown;
};

export type PlanForLoad = {
  id?: unknown;
  name?: unknown;
  projectId?: unknown;
  projectTitle?: unknown;
  tasks?: unknown;
};

export type ResourceDecl = {
  id?: unknown;
  name?: unknown;
  /** Percent of a full-time equivalent. Absent is UNKNOWN, never nought. */
  capacity?: unknown;
};

export type PersonLoad = {
  id: string;
  name: string;
  /** null when the plans never said. Nought would mean "cannot work at all". */
  capacity: number | null;
  /** Distinct days this person is committed on, across every plan. */
  committedDays: number;
  /** Total assignment-days. Higher than committedDays exactly when doubled up. */
  assignmentDays: number;
  /** Days carrying more assignments than the capacity allows. */
  conflictDays: number;
  /** The first day a conflict happens, so a reader is sent somewhere. */
  firstConflict: string | null;
  work: { planId: string; planName: string; projectId: string; projectTitle: string; days: number }[];
};

export type LoadReport = {
  from: string;
  to: string;
  people: PersonLoad[];
  /**
   * Days of work carrying no assignee at all. Reported in its own right rather
   * than dropped: work nobody is on is the other half of the question this
   * screen exists to answer, and silently ignoring it would make a studio with
   * nothing assigned look perfectly resourced.
   */
  unassignedDays: number;
};

const text = (v: unknown) => String(v ?? "").trim();
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []) as T[];

/** yyyy-mm-dd, or "" for anything that is not a date. Time of day is dropped. */
const day = (v: unknown): string => {
  const s = text(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

const addDays = (d: string, n: number): string => {
  const t = Date.parse(`${d}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t + n * 86400000).toISOString().slice(0, 10) : d;
};

/**
 * Every day from `from` to `to` inclusive, capped so one wrong date in one plan
 * cannot spin this into a million-iteration loop. A task spanning more than
 * three years is a data error, and truncating it is a better answer than hanging.
 */
const MAX_SPAN_DAYS = 1100;
function daysBetween(from: string, to: string): string[] {
  if (!from) return [];
  const out: string[] = [];
  let cursor = from;
  const last = to && to >= from ? to : from;
  for (let i = 0; i < MAX_SPAN_DAYS && cursor <= last; i += 1) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/**
 * WHAT COUNTS AS WORK SOMEBODY IS ON.
 *
 * A SUMMARY ROW IS NOT WORK. Its span is its children's, so counting both puts
 * every day in twice and reports a person at double their real load — the single
 * easiest way to make this whole screen lie. The planner marks them, and they
 * are dropped here.
 *
 * A MILESTONE IS NOT WORK EITHER. It is a moment, has no duration, and somebody
 * named on one is not occupied by it.
 */
const isWork = (t: PlannedTask): boolean => !t?.isSummary && !t?.isMilestone;

export function resourceLoad(
  plans: PlanForLoad[],
  resources: ResourceDecl[],
  window: { from?: unknown; to?: unknown } = {},
): LoadReport {
  const from = day(window.from);
  const to = day(window.to);
  const inWindow = (d: string) => (!from || d >= from) && (!to || d <= to);

  const named = new Map<string, { name: string; capacity: number | null }>();
  for (const r of list<ResourceDecl>(resources)) {
    const id = text(r?.id);
    if (!id || named.has(id)) continue;
    const cap = Number(r?.capacity);
    named.set(id, {
      name: text(r?.name) || id,
      // NULL RATHER THAN A DEFAULT OF 100. "Nobody said" and "one full-time
      // person" are different facts, and a screen that shows the second when it
      // means the first is inventing a capacity somebody will plan against.
      capacity: Number.isFinite(cap) && cap > 0 ? cap : null,
    });
  }

  // personId → day → how many assignments land on it.
  const byDay = new Map<string, Map<string, number>>();
  // personId → planId → days, for the breakdown.
  const byPlan = new Map<string, Map<string, number>>();
  const planMeta = new Map<string, { planName: string; projectId: string; projectTitle: string }>();
  let unassignedDays = 0;

  for (const plan of list<PlanForLoad>(plans)) {
    const planId = text(plan?.id);
    planMeta.set(planId, {
      planName: text(plan?.name),
      projectId: text(plan?.projectId),
      projectTitle: text(plan?.projectTitle),
    });

    for (const task of list<PlannedTask>(plan?.tasks)) {
      if (!isWork(task)) continue;
      const start = day(task?.start);
      if (!start) continue;
      const span = daysBetween(start, day(task?.end)).filter(inWindow);
      if (!span.length) continue;

      const who = list<unknown>(task?.assigneeIds).map(text).filter(Boolean);
      if (!who.length) { unassignedDays += span.length; continue; }

      for (const personId of who) {
        if (!byDay.has(personId)) byDay.set(personId, new Map());
        if (!byPlan.has(personId)) byPlan.set(personId, new Map());
        const days = byDay.get(personId)!;
        const plans_ = byPlan.get(personId)!;
        for (const d of span) days.set(d, (days.get(d) || 0) + 1);
        plans_.set(planId, (plans_.get(planId) || 0) + span.length);
      }
    }
  }

  const people: PersonLoad[] = [];
  for (const [id, days] of byDay) {
    const decl = named.get(id);
    const capacity = decl?.capacity ?? null;
    // HOW MANY CONCURRENT ASSIGNMENTS A DAY WILL TAKE. Capacity is a percent of
    // a full-time equivalent and an assignment fills a day, so 100 buys one and
    // 200 buys two. An unknown capacity is read as one — the cautious reading,
    // because reporting no conflict for somebody nobody sized would hide exactly
    // the person most likely to be over-committed.
    const allowed = Math.max(1, Math.floor((capacity ?? 100) / 100));

    let committedDays = 0;
    let assignmentDays = 0;
    let conflictDays = 0;
    let firstConflict: string | null = null;
    for (const [d, n] of days) {
      committedDays += 1;
      assignmentDays += n;
      if (n > allowed) {
        conflictDays += 1;
        if (!firstConflict || d < firstConflict) firstConflict = d;
      }
    }

    const work = [...(byPlan.get(id) || new Map<string, number>())].map(([planId, d]) => ({
      planId,
      planName: planMeta.get(planId)?.planName || "",
      projectId: planMeta.get(planId)?.projectId || "",
      projectTitle: planMeta.get(planId)?.projectTitle || "",
      days: d,
    })).sort((a, b) => b.days - a.days);

    people.push({
      id,
      // A PERSON ON A TASK BUT IN NOBODY'S RESOURCE LIST still appears, under
      // their id. Dropping them would make a plan that assigns somebody the
      // studio never declared look like a plan with nothing assigned.
      name: decl?.name || id,
      capacity,
      committedDays,
      assignmentDays,
      conflictDays,
      firstConflict,
      work,
    });
  }

  // The most over-committed first, then the busiest: this list is read to find
  // trouble, so trouble goes at the top.
  people.sort((a, b) =>
    b.conflictDays - a.conflictDays || b.assignmentDays - a.assignmentDays
    || a.name.localeCompare(b.name));

  return { from, to, people, unassignedDays };
}
