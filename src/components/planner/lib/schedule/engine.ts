import type {
  ComputedTask,
  Dependency,
  Resource,
  Task,
  WorkCalendar,
} from '@/components/planner/lib/types';
import {
  addWorkingMinutes,
  applyLag,
  dayOpen,
  durationToMinutes,
  minutesToDuration,
  parseISO,
  snapForward,
  subWorkingMinutes,
  workingMinutesBetween,
} from './calendar';
import { buildTreeIndex, type TreeIndex } from './tree';

/* ------------------------------------------------------------------ *
 * The scheduling engine.
 *
 * One pure function turns the stored task list into everything both
 * panes need. Order of operations:
 *
 *   1. index the tree (WBS codes, depth, child lists)
 *   2. build a DAG:  predecessor -> successor  AND  child -> parent
 *      (children must be scheduled before the parent that wraps them)
 *   3. topologically sort it; anything left over is a circular link
 *   4. forward pass - leaves get dates from their links, summary rows
 *      roll up to min(child start) / max(child end)
 *   5. backward pass - late finish, total float, critical path
 *
 * Because parent edges live in the same DAG as dependency edges, a
 * summary row can itself be a predecessor and it still resolves in the
 * right order.
 * ------------------------------------------------------------------ */

export interface ScheduleIssue {
  taskId: string;
  message: string;
}

export interface ScheduleResult {
  /** every task, in display order, hidden ones included */
  tasks: ComputedTask[];
  /** display order with collapsed subtrees removed */
  visible: ComputedTask[];
  byId: Map<string, ComputedTask>;
  projectStart: Date;
  projectEnd: Date;
  issues: ScheduleIssue[];
  stats: {
    total: number;
    complete: number;
    inProgress: number;
    late: number;
    milestones: number;
    percentComplete: number;
    durationDays: number;
    cost: number;
    effortHours: number;
  };
}

interface Span {
  start: Date;
  end: Date;
  minutes: number;
}

function taskMinutes(t: Task, cal: WorkCalendar): number {
  if (t.milestone) return 0;
  return Math.max(0, durationToMinutes(t.duration, t.durationUnit, cal));
}

/**
 * Earliest start this dependency permits, given how long the successor
 * runs (needed for the finish-anchored link types).
 */
function constraintStart(
  dep: Dependency,
  pred: Span,
  successorMinutes: number,
  cal: WorkCalendar,
): Date {
  const unit = cal.granularity;
  switch (dep.type) {
    case 'SS':
      return applyLag(pred.start, dep.lag, unit, cal);
    case 'FF': {
      const finish = applyLag(pred.end, dep.lag, unit, cal);
      return subWorkingMinutes(finish, successorMinutes, cal);
    }
    case 'SF': {
      const finish = applyLag(pred.start, dep.lag, unit, cal);
      return subWorkingMinutes(finish, successorMinutes, cal);
    }
    case 'FS':
    default:
      return applyLag(pred.end, dep.lag, unit, cal);
  }
}

/** Latest finish this dependency permits on the predecessor. */
function reverseConstraintFinish(
  dep: Dependency,
  succLateFinish: Date,
  succMinutes: number,
  predMinutes: number,
  cal: WorkCalendar,
): Date {
  const unit = cal.granularity;
  const succLateStart = subWorkingMinutes(succLateFinish, succMinutes, cal);
  switch (dep.type) {
    case 'SS': {
      const predLateStart = applyLag(succLateStart, -dep.lag, unit, cal);
      return addWorkingMinutes(predLateStart, predMinutes, cal);
    }
    case 'FF':
      return applyLag(succLateFinish, -dep.lag, unit, cal);
    case 'SF': {
      const predLateStart = applyLag(succLateFinish, -dep.lag, unit, cal);
      return addWorkingMinutes(predLateStart, predMinutes, cal);
    }
    case 'FS':
    default:
      return applyLag(succLateStart, -dep.lag, unit, cal);
  }
}

/** Kahn topological sort. Returns the order plus any nodes stuck in a cycle. */
function topoSort(
  ids: string[],
  edges: Map<string, string[]>,
): { order: string[]; cyclic: Set<string> } {
  const indegree = new Map<string, number>();
  ids.forEach((id) => indegree.set(id, 0));
  edges.forEach((tos) => {
    tos.forEach((to) => indegree.set(to, (indegree.get(to) ?? 0) + 1));
  });

  const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];

  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const to of edges.get(id) ?? []) {
      const next = (indegree.get(to) ?? 0) - 1;
      indegree.set(to, next);
      if (next === 0) queue.push(to);
    }
  }

  const placed = new Set(order);
  const cyclic = new Set(ids.filter((id) => !placed.has(id)));
  return { order, cyclic };
}

function blendedRate(assigneeIds: string[], resources: Resource[]): number {
  if (!assigneeIds.length) return 0;
  const rates = assigneeIds.map(
    (id) => resources.find((r) => r.id === id)?.rate ?? 0,
  );
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

export function computeSchedule(
  tasks: Task[],
  cal: WorkCalendar,
  resources: Resource[] = [],
): ScheduleResult {
  const index: TreeIndex = buildTreeIndex(tasks);
  const ids = tasks.map((t) => t.id);
  const issues: ScheduleIssue[] = [];
  const perTaskIssues = new Map<string, string[]>();

  const addIssue = (taskId: string, message: string) => {
    issues.push({ taskId, message });
    const bucket = perTaskIssues.get(taskId);
    if (bucket) bucket.push(message);
    else perTaskIssues.set(taskId, [message]);
  };

  /* ---------- 2. build the DAG ---------- */
  const edges = new Map<string, string[]>();
  const pushEdge = (from: string, to: string) => {
    const bucket = edges.get(from);
    if (bucket) bucket.push(to);
    else edges.set(from, [to]);
  };

  const successorIds = new Map<string, string[]>();

  for (const t of tasks) {
    for (const dep of t.dependencies) {
      if (!index.byId.has(dep.predecessorId)) {
        addIssue(t.id, `Predecessor ${dep.predecessorId} no longer exists`);
        continue;
      }
      if (dep.predecessorId === t.id) {
        addIssue(t.id, 'A task cannot depend on itself');
        continue;
      }
      pushEdge(dep.predecessorId, t.id);
      const bucket = successorIds.get(dep.predecessorId);
      if (bucket) bucket.push(t.id);
      else successorIds.set(dep.predecessorId, [t.id]);
    }
    // A summary row can only be sized once its children are placed.
    if (t.parentId && index.byId.has(t.parentId)) pushEdge(t.id, t.parentId);
  }

  /* ---------- 3. topological order ---------- */
  const { order, cyclic } = topoSort(ids, edges);
  cyclic.forEach((id) =>
    addIssue(id, 'Circular dependency - this link was ignored'),
  );
  // Cyclic nodes still need dates; append them so they schedule standalone.
  const processOrder = [...order, ...Array.from(cyclic)];

  /* ---------- 4. forward pass ---------- */
  const spans = new Map<string, Span>();

  for (const id of processOrder) {
    const t = index.byId.get(id)!;
    const kids = index.childIds.get(id) ?? [];

    if (kids.length) {
      // Summary row: the bracket wraps its children.
      const kidSpans = kids.map((k) => spans.get(k)).filter(Boolean) as Span[];
      if (!kidSpans.length) {
        const start = snapForward(parseISO(t.start), cal);
        spans.set(id, { start, end: start, minutes: 0 });
        continue;
      }
      const start = new Date(
        Math.min(...kidSpans.map((s) => s.start.getTime())),
      );
      const end = new Date(Math.max(...kidSpans.map((s) => s.end.getTime())));
      spans.set(id, {
        start,
        end,
        minutes: workingMinutesBetween(start, end, cal),
      });
      continue;
    }

    // Leaf row.
    const minutes = taskMinutes(t, cal);
    const usableDeps = cyclic.has(id)
      ? []
      : t.dependencies.filter(
          (d) => spans.has(d.predecessorId) && d.predecessorId !== id,
        );

    let start: Date;
    if (t.scheduleMode === 'auto' && usableDeps.length) {
      const candidates = usableDeps.map((d) =>
        constraintStart(d, spans.get(d.predecessorId)!, minutes, cal),
      );
      start = new Date(Math.max(...candidates.map((c) => c.getTime())));
    } else {
      start = parseISO(t.start);
      if (t.scheduleMode === 'manual' && usableDeps.length) {
        // Flag a pinned date that violates its own links.
        const earliest = Math.max(
          ...usableDeps.map((d) =>
            constraintStart(d, spans.get(d.predecessorId)!, minutes, cal).getTime(),
          ),
        );
        if (start.getTime() < earliest) {
          addIssue(id, 'Pinned start is earlier than its predecessors allow');
        }
      }
    }

    // Order matters. Snap into working time FIRST: a predecessor that
    // finishes at 17:00 has to push its successor to the next morning, and
    // only then can "working days" mode round down to the top of that day.
    // Doing it the other way round would rewind an FS successor to 09:00 on
    // the day its predecessor finished.
    start = snapForward(start, cal);
    if (cal.granularity === 'days') start = snapForward(dayOpen(start, cal), cal);

    const end = addWorkingMinutes(start, minutes, cal);
    spans.set(id, { start, end, minutes });
  }

  /* ---------- 5. backward pass: late finish, float, critical path ---------- */
  const allEnds = Array.from(spans.values()).map((s) => s.end.getTime());
  const allStarts = Array.from(spans.values()).map((s) => s.start.getTime());
  const projectStart = new Date(
    allStarts.length ? Math.min(...allStarts) : Date.now(),
  );
  const projectEnd = new Date(
    allEnds.length ? Math.max(...allEnds) : Date.now(),
  );

  const lateFinish = new Map<string, Date>();
  for (const id of [...processOrder].reverse()) {
    const t = index.byId.get(id)!;
    const span = spans.get(id)!;
    const succs = (successorIds.get(id) ?? []).filter((s) => lateFinish.has(s));

    if (!succs.length) {
      lateFinish.set(id, projectEnd);
      continue;
    }
    const limits = succs.map((sid) => {
      const succ = index.byId.get(sid)!;
      const dep = succ.dependencies.find((d) => d.predecessorId === id)!;
      return reverseConstraintFinish(
        dep,
        lateFinish.get(sid)!,
        spans.get(sid)!.minutes,
        span.minutes,
        cal,
      ).getTime();
    });
    lateFinish.set(id, new Date(Math.min(...limits, projectEnd.getTime())));
  }

  /* ---------- assemble ---------- */
  const rolledPercent = new Map<string, number>();
  const rolledEffort = new Map<string, number>();
  const rolledCost = new Map<string, number>();

  // Bottom-up: processOrder already has children before parents.
  for (const id of processOrder) {
    const t = index.byId.get(id)!;
    const kids = index.childIds.get(id) ?? [];
    if (!kids.length) {
      rolledPercent.set(id, clamp(t.percentComplete, 0, 100));
      rolledEffort.set(id, t.effortHours);
      rolledCost.set(id, t.effortHours * blendedRate(t.assigneeIds, resources));
      continue;
    }
    // Duration-weighted roll-up, the MS Project convention.
    let weight = 0;
    let weighted = 0;
    let effort = 0;
    let cost = 0;
    for (const k of kids) {
      const w = Math.max(spans.get(k)?.minutes ?? 0, 1);
      weight += w;
      weighted += w * (rolledPercent.get(k) ?? 0);
      effort += rolledEffort.get(k) ?? 0;
      cost += rolledCost.get(k) ?? 0;
    }
    rolledPercent.set(id, weight ? Math.round(weighted / weight) : 0);
    rolledEffort.set(id, effort);
    rolledCost.set(id, cost);
  }

  const hiddenIds = new Set<string>();
  for (const t of tasks) {
    if (!t.collapsed) continue;
    const stack = [...(index.childIds.get(t.id) ?? [])];
    while (stack.length) {
      const cur = stack.pop()!;
      hiddenIds.add(cur);
      stack.push(...(index.childIds.get(cur) ?? []));
    }
  }

  const floatTolerance = cal.granularity === 'hours' ? 30 : 60;

  const computed: ComputedTask[] = index.order.map((id, i) => {
    const t = index.byId.get(id)!;
    const span = spans.get(id)!;
    const kids = index.childIds.get(id) ?? [];
    const lf = lateFinish.get(id) ?? projectEnd;
    const floatMinutes = workingMinutesBetween(span.end, lf, cal);

    return {
      ...t,
      wbs: index.wbs.get(id) ?? `${i + 1}`,
      depth: index.depth.get(id) ?? 0,
      childIds: kids,
      isSummary: kids.length > 0,
      index: i,
      hidden: hiddenIds.has(id),
      startDate: span.start,
      endDate: span.end,
      computedDuration: minutesToDuration(
        span.minutes,
        cal.granularity,
        cal,
      ),
      rolledPercentComplete: rolledPercent.get(id) ?? 0,
      rolledEffortHours: rolledEffort.get(id) ?? 0,
      rolledCost: rolledCost.get(id) ?? 0,
      successorIds: successorIds.get(id) ?? [],
      issues: perTaskIssues.get(id) ?? [],
      critical: kids.length === 0 && floatMinutes <= floatTolerance,
      totalFloat: minutesToDuration(floatMinutes, cal.granularity, cal),
    };
  });

  const byId = new Map(computed.map((c) => [c.id, c]));
  const visible = computed.filter((c) => !c.hidden);
  const leaves = computed.filter((c) => !c.isSummary);
  const now = new Date();

  return {
    tasks: computed,
    visible,
    byId,
    projectStart,
    projectEnd,
    issues,
    stats: {
      total: leaves.length,
      complete: leaves.filter((t) => t.rolledPercentComplete >= 100).length,
      inProgress: leaves.filter(
        (t) => t.rolledPercentComplete > 0 && t.rolledPercentComplete < 100,
      ).length,
      late: leaves.filter(
        (t) => t.endDate < now && t.rolledPercentComplete < 100,
      ).length,
      milestones: leaves.filter((t) => t.milestone).length,
      percentComplete: weightedPercent(leaves),
      durationDays: Math.max(
        1,
        Math.ceil(
          (projectEnd.getTime() - projectStart.getTime()) / 86_400_000,
        ),
      ),
      cost: computed
        .filter((t) => !t.isSummary)
        .reduce((sum, t) => sum + t.rolledCost, 0),
      effortHours: leaves.reduce((sum, t) => sum + t.effortHours, 0),
    },
  };
}

function weightedPercent(leaves: ComputedTask[]): number {
  if (!leaves.length) return 0;
  let weight = 0;
  let weighted = 0;
  for (const t of leaves) {
    const w = Math.max(t.computedDuration, 0.25);
    weight += w;
    weighted += w * t.rolledPercentComplete;
  }
  return weight ? Math.round(weighted / weight) : 0;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
