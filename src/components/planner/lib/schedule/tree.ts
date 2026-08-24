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
export function normalizeOrder(tasks: Task[]): Task[] {
  const index = buildTreeIndex(tasks);
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
