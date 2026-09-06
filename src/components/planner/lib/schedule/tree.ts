import type { Task } from '@/components/planner/lib/types';

/* ------------------------------------------------------------------ *
 * Tree helpers.
 *
 * Tasks are stored as ONE ordered flat array. Sibling order is array
 * order; hierarchy is `parentId`. That keeps grid operations (insert
 * below, move up/down) trivial while still supporting indent/outdent.
 * ------------------------------------------------------------------ */

export interface TreeIndex {
  byId: Map<string, Task>;
  childIds: Map<string | null, string[]>;
  depth: Map<string, number>;
  wbs: Map<string, string>;
  /** display order after a depth-first walk of the whole tree */
  order: string[];
}

export function buildTreeIndex(tasks: Task[]): TreeIndex {
  const byId = new Map<string, Task>();
  const childIds = new Map<string | null, string[]>();

  for (const t of tasks) byId.set(t.id, t);

  // Reparent orphans to root so a broken parentId can never hide a row.
  for (const t of tasks) {
    const parent = t.parentId && byId.has(t.parentId) ? t.parentId : null;
    const bucket = childIds.get(parent);
    if (bucket) bucket.push(t.id);
    else childIds.set(parent, [t.id]);
  }

  const depth = new Map<string, number>();
  const wbs = new Map<string, string>();
  const order: string[] = [];

  const walk = (parentId: string | null, level: number, prefix: string) => {
    const kids = childIds.get(parentId) ?? [];
    kids.forEach((id, i) => {
      const code = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      depth.set(id, level);
      wbs.set(id, code);
      order.push(id);
      walk(id, level + 1, code);
    });
  };
  walk(null, 0, '');

  return { byId, childIds, depth, wbs, order };
}

export function isSummary(id: string, index: TreeIndex): boolean {
  return (index.childIds.get(id) ?? []).length > 0;
}

/** All descendant ids of `id`, depth-first. */
export function descendantsOf(id: string, index: TreeIndex): string[] {
  const out: string[] = [];
  const stack = [...(index.childIds.get(id) ?? [])];
  while (stack.length) {
    const cur = stack.shift()!;
    out.push(cur);
    stack.unshift(...(index.childIds.get(cur) ?? []));
  }
  return out;
}

export function ancestorsOf(id: string, index: TreeIndex): string[] {
  const out: string[] = [];
  let cur = index.byId.get(id)?.parentId ?? null;
  while (cur) {
    out.push(cur);
    cur = index.byId.get(cur)?.parentId ?? null;
  }
  return out;
}

/**
 * Reorder the flat array so it matches the depth-first display order.
 * Called after every structural mutation so that "the array order is the
 * visible order" stays an invariant the rest of the app can rely on.
 */
/* ------------------------------------------------------------------ *
 * A STORED TASK IS NOT A `Task`, whatever the type says.
 *
 * `savePlan` writes the plan document whole: it checks that the body is
 * an object, that the plan exists and that it is under the byte cap, and
 * validates nothing inside it. So `tasks` is whatever was PUT, and the
 * `Task[]` the store hands the engine is an assertion rather than a
 * guarantee. A document with `[{ id: 't1' }]` in it is accepted by the
 * API today.
 *
 * That was not theoretical: it white-screened the whole planner with
 * `t.dependencies is not iterable` on the engine's first loop, and it is
 * invisible to every guard we have — `tsc` believes the assertion, and
 * no suite renders the planner. Only opening it showed it.
 *
 * The server half already reads these tasks defensively: `planProgress`
 * in modules/operations/planner coerces every field it touches, because
 * the projects list must not fall over on one bad plan. This is the
 * client half of the same posture, and it belongs beside the orphan
 * reparenting below for the same reason — a broken row should render
 * wrong, never take the screen with it.
 *
 * WHAT IT DOES NOT DO IS GUESS. A task with no `name` gets `''`, not a
 * name invented from some other field: an empty title is the truth about
 * that row, and a rename inferred from a neighbouring key would be a
 * migration nobody asked for and nobody could see happening.
 * ------------------------------------------------------------------ */
const STATUSES = new Set([
  'not_started', 'in_progress', 'on_track', 'at_risk', 'blocked', 'complete',
]);
const PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);

const str = (v: unknown, fallback = '') =>
  (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function normalizeTask(raw: unknown): Task {
  const t = (raw ?? {}) as Partial<Task> & Record<string, unknown>;
  // Dependencies are the field that actually crashed, and each ENTRY is
  // trusted by the engine too — a dep with no `predecessorId` reads as a
  // missing predecessor and is reported, which is already handled.
  const deps = Array.isArray(t.dependencies) ? t.dependencies : [];
  return {
    ...t,
    id: str(t.id),
    parentId: typeof t.parentId === 'string' ? t.parentId : null,
    name: str(t.name),
    notes: str(t.notes),
    assigneeIds: Array.isArray(t.assigneeIds) ? t.assigneeIds : [],
    start: str(t.start),
    end: str(t.end),
    duration: num(t.duration),
    durationUnit: t.durationUnit === 'hours' ? 'hours' : 'days',
    dependencies: deps,
    status: STATUSES.has(String(t.status)) ? t.status! : 'not_started',
    // Clamped, because a stored number is a number somebody typed: the
    // engine weights roll-ups by it and 400% would carry a parent past
    // complete.
    percentComplete: Math.min(100, Math.max(0, num(t.percentComplete))),
    priority: PRIORITIES.has(String(t.priority)) ? t.priority! : 'medium',
    scheduleMode: t.scheduleMode === 'manual' ? 'manual' : 'auto',
    milestone: Boolean(t.milestone),
    collapsed: Boolean(t.collapsed),
    effortHours: num(t.effortHours),
  };
}

export function normalizeOrder(tasks: Task[]): Task[] {
  // Normalised BEFORE the index is built: buildTreeIndex keys by `t.id`,
  // so a row with no id would otherwise land under `undefined` and take
  // any other id-less row with it.
  const clean = (Array.isArray(tasks) ? tasks : []).map(normalizeTask);
  const index = buildTreeIndex(clean);
  return index.order.map((id) => index.byId.get(id)!);
}

/** Would making `candidateParent` the parent of `id` create a cycle? */
export function wouldCreateCycle(
  id: string,
  candidateParent: string | null,
  index: TreeIndex,
): boolean {
  if (!candidateParent) return false;
  if (candidateParent === id) return true;
  return ancestorsOf(candidateParent, index).includes(id);
}
