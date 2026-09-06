// THE DEPARTMENT TREE, as pure arithmetic over rows already in hand.
//
// WHY IT IS ITS OWN FILE, AND PURE. `subtreeIds` is what the `department`
// access scope resolves against — see modules/hr — so it decides whose employee
// records and whose leave a manager may read. A function with that job has to
// be testable without a studio, a session or a store, and has to be readable by
// the SCREEN as well, which draws the same tree it is scoped by. Two copies of
// "who is under me" would be two copies free to disagree about a manager's
// reach, which is the kind of disagreement nobody notices until it is a leak.
//
// EVERY FUNCTION HERE SURVIVES MALFORMED DATA, and that is not defensive
// habit. A department can be deleted while somebody still points at it, a
// migration can half-run, and a cycle can in principle reach the store despite
// the guard at the door. The alternative to tolerating those is an infinite
// walk inside a permission check — a hang, on the read path, in the function
// that decides what a person may see. So: a dangling parent reads as top
// level, and every walk carries a visited set.

/** The shape these functions need. The stored record has more; this is all they read. */
export type DepartmentNode = { id: string; parentId?: string };

const indexByParent = <T extends DepartmentNode>(rows: readonly T[]) => {
  const children = new Map<string, T[]>();
  const ids = new Set(rows.map((r) => r.id));
  for (const row of rows) {
    // A PARENT THAT NO LONGER EXISTS IS NO PARENT. Anything else would drop the
    // row out of every walk — invisible rather than merely unplaced — and a
    // department nobody can see is a department nobody can fix.
    const parent = row.parentId && ids.has(row.parentId) ? row.parentId : "";
    const list = children.get(parent);
    if (list) list.push(row);
    else children.set(parent, [row]);
  }
  return children;
};

/**
 * A department and everything under it.
 *
 * THIS IS THE SCOPE. `scope === "department"` used to mean "the same
 * departmentId", which on the old model meant "the same SECTION" — so an
 * Operations Manager with three teams under them could see none of the three.
 * Returning the subtree is what makes a hierarchy worth storing.
 *
 * An id that names nothing returns an empty set rather than everything: the
 * failure mode of a wrong answer here is showing somebody records they may not
 * read, so the direction of the mistake is chosen deliberately.
 */
export function subtreeIds<T extends DepartmentNode>(
  rows: readonly T[],
  rootId: string,
): Set<string> {
  const out = new Set<string>();
  if (!rootId || !rows.some((r) => r.id === rootId)) return out;

  const children = indexByParent(rows);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift() as string;
    if (out.has(id)) continue;
    out.add(id);
    for (const child of children.get(id) || []) queue.push(child.id);
  }
  return out;
}

/**
 * Would making `parentId` the parent of `id` close a loop?
 *
 * Refused at the door rather than detected afterwards by a walk that has to
 * guess which link to break — the same argument the tender document chain
 * makes about A←B←C←A. Naming yourself is the shortest cycle and is caught by
 * the first comparison.
 */
export function wouldCycle<T extends DepartmentNode>(
  rows: readonly T[],
  id: string,
  parentId: string,
): boolean {
  if (!parentId) return false;
  if (parentId === id) return true;

  const byId = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set<string>();
  let cursor: string | undefined = parentId;
  while (cursor && !seen.has(cursor)) {
    if (cursor === id) return true;
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId || "";
  }
  return false;
}

/**
 * How deep a department sits, counting itself: a top-level department is 1.
 *
 * The cap exists so the tree stays legible on screen and bounded in the scope
 * walk. A row whose ancestry is already circular returns the depth walked so
 * far rather than looping.
 */
export function depthOf<T extends DepartmentNode>(rows: readonly T[], id: string): number {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set<string>();
  let depth = 0;
  let cursor: string | undefined = id;
  while (cursor && byId.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    depth += 1;
    cursor = byId.get(cursor)?.parentId || "";
  }
  return depth;
}

/** How many levels a register may have. Four covers every org chart in the research. */
export const MAX_DEPARTMENT_DEPTH = 4;

/**
 * Rows in tree order — parents before their children, siblings by name — each
 * carrying the depth the screen indents by.
 *
 * ORPHANS ARE LISTED, at the end and at the top level. A row whose parent was
 * deleted is exactly the row somebody needs to re-file, so hiding it until the
 * data is tidy is backwards.
 */
export function orderedTree<T extends DepartmentNode & { name?: string }>(
  rows: readonly T[],
): Array<T & { depth: number }> {
  const children = indexByParent(rows);
  const out: Array<T & { depth: number }> = [];
  const seen = new Set<string>();

  const walk = (parent: string, depth: number) => {
    const kids = [...(children.get(parent) || [])]
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    for (const kid of kids) {
      if (seen.has(kid.id)) continue;
      seen.add(kid.id);
      out.push({ ...kid, depth });
      walk(kid.id, depth + 1);
    }
  };
  walk("", 0);

  // Anything the walk could not reach — only possible through a stored cycle,
  // which the door refuses but a half-run migration could still leave behind.
  for (const row of rows) if (!seen.has(row.id)) out.push({ ...row, depth: 0 });
  return out;
}
