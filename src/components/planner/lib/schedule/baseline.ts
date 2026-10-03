/* ------------------------------------------------------------------
 * THE BASELINE — the plan as it was agreed, frozen, so the plan as it
 * is now can be read against it (the owner, 03/10/2026: how does a
 * planner "differentiate between an initial plan and actual plan").
 *
 * THREE LINES, AND ONLY ONE IS NEW:
 *   - the CURRENT plan is what the engine computes every render;
 *   - the ACTUAL is each task's own % complete, rolled up as it always was;
 *   - the BASELINE is a snapshot of the current plan's computed dates at
 *     the moment somebody set it. Task dates are never stored — the engine
 *     derives them from durations and links — so a baseline HAS to be a
 *     snapshot: re-deriving it later would re-derive today's plan.
 *
 * WHAT THE BASELINE ANSWERS:
 *   - planned % by a date: how much of the baselined work should be done,
 *     each task weighted by its baseline length (the same weighting the
 *     engine's % complete uses), linear inside a task;
 *   - schedule index: actual ÷ planned — below 1 is behind, the projects'
 *     SPI arithmetic applied to a plan;
 *   - slip: how far a task's (or the plan's) finish has moved since.
 *
 * PURE, NO STORE, NO DATES READ FROM THE CLOCK: `asOf` is always passed
 * in, so the same answer is computed in the browser and in a test.
 * ------------------------------------------------------------------ */

import type { ComputedTask } from '../types';

export interface BaselineTask {
  /** ISO start and finish the engine computed when the baseline was set. */
  start: string;
  end: string;
  /** Weight in the planned % — working hours, 0 for summaries and milestones. */
  weight: number;
}

export interface Baseline {
  setAt: string;
  /** The CollaboratorID who set it ('' when unknown). */
  setBy: string;
  projectStart: string;
  projectEnd: string;
  tasks: Record<string, BaselineTask>;
}

const DAY = 86_400_000;

/** Hours a leaf weighs — the engine's rule: duration in hours, a floor so a zero-length task still counts. */
function weightOf(t: Pick<ComputedTask, 'duration' | 'durationUnit' | 'milestone'>): number {
  if (t.milestone) return 0;
  const raw = Number(t.duration);
  const hours = t.durationUnit === 'hours' ? raw : raw * 8;
  return Math.max(Number.isFinite(hours) ? hours : 0, 0.25);
}

/**
 * FREEZE THE CURRENT PLAN. Summaries carry their dates (to draw them) but no
 * weight — they roll up their children, and counting both would double them.
 */
export function takeBaseline(
  tasks: readonly ComputedTask[],
  projectStart: Date,
  projectEnd: Date,
  setAt: string,
  setBy = '',
): Baseline {
  const out: Record<string, BaselineTask> = {};
  for (const t of tasks) {
    out[t.id] = {
      start: t.startDate.toISOString(),
      end: t.endDate.toISOString(),
      weight: t.isSummary ? 0 : weightOf(t),
    };
  }
  return { setAt, setBy, projectStart: projectStart.toISOString(), projectEnd: projectEnd.toISOString(), tasks: out };
}

/**
 * A STORED BASELINE, cleaned: whatever was saved is whatever some version of
 * the planner wrote, so nothing in it is trusted. Null when there is none.
 */
export function cleanBaseline(raw: unknown): Baseline | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const tasks: Record<string, BaselineTask> = {};
  const src = (r.tasks && typeof r.tasks === 'object' ? r.tasks : {}) as Record<string, unknown>;
  for (const [id, v] of Object.entries(src)) {
    const x = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const start = String(x.start || '');
    const end = String(x.end || '');
    if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) continue;
    const w = Number(x.weight);
    tasks[id] = { start, end, weight: Number.isFinite(w) && w > 0 ? w : 0 };
  }
  const setAt = String(r.setAt || '');
  if (!Object.keys(tasks).length || Number.isNaN(Date.parse(setAt))) return null;
  return {
    setAt,
    setBy: String(r.setBy || ''),
    projectStart: String(r.projectStart || ''),
    projectEnd: String(r.projectEnd || ''),
    tasks,
  };
}

/**
 * HOW MUCH OF THE BASELINED WORK SHOULD BE DONE BY `asOf`, 0–100. Each weighted
 * task counts the share of its baseline span that has passed. Null when nothing
 * in the baseline carries weight — "no plan to measure against", not 0%.
 */
export function plannedPercent(baseline: Baseline, asOf: Date): number | null {
  const at = asOf.getTime();
  let weight = 0;
  let done = 0;
  for (const t of Object.values(baseline.tasks)) {
    if (!t.weight) continue;
    const s = Date.parse(t.start);
    const e = Date.parse(t.end);
    const share = at <= s ? 0 : at >= e || e <= s ? 1 : (at - s) / (e - s);
    weight += t.weight;
    done += t.weight * share;
  }
  return weight ? Math.round((done / weight) * 1000) / 10 : null;
}

/** Whole calendar days a date moved — positive is later. Null when either side is missing. */
export function slipDays(baselineIso: string | undefined, current: Date | undefined): number | null {
  if (!baselineIso || !current) return null;
  const b = Date.parse(baselineIso);
  if (Number.isNaN(b)) return null;
  return Math.round((current.getTime() - b) / DAY);
}

export type BaselineReading = {
  planned: number | null;
  actual: number;
  /** actual ÷ planned; null before anything was planned to start (no division by nought). */
  index: number | null;
  /** 'ahead' | 'on-plan' | 'behind' | null when the index is null. */
  verdict: 'ahead' | 'on-plan' | 'behind' | null;
  finishSlipDays: number | null;
  /** Tasks in the plan now that the baseline does not know (added since). */
  added: number;
};

/**
 * THE PLAN READ AGAINST ITS BASELINE. Within two percentage points of the plan
 * counts as on plan — a plan read to the decimal calls every project behind or
 * ahead on any given morning.
 */
export function readBaseline(
  baseline: Baseline,
  tasks: readonly ComputedTask[],
  actualPercent: number,
  projectEnd: Date,
  asOf: Date,
): BaselineReading {
  const planned = plannedPercent(baseline, asOf);
  const actual = Math.round(actualPercent * 10) / 10;
  const index = planned ? Math.round((actual / planned) * 100) / 100 : null;
  const verdict = planned === null || planned === 0
    ? null
    : Math.abs(actual - planned) <= 2 ? 'on-plan' : actual > planned ? 'ahead' : 'behind';
  return {
    planned,
    actual,
    index,
    verdict,
    finishSlipDays: slipDays(baseline.projectEnd, projectEnd),
    added: tasks.filter((t) => !baseline.tasks[t.id]).length,
  };
}
