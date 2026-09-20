// WHAT CHANGED IN A PLAN, AND WHO CHANGED IT.
//
// `savePlan` writes the plan document WHOLE and kept nothing of what it
// replaced, so a plan could be reorganised overnight with no record that it had
// been: the planner's undo lives in the browser and dies with the page. This is
// the record — computed on the server by comparing the document being saved
// with the one already stored, so nothing depends on the browser reporting its
// own edits honestly.
//
// THE PLANNER AUTOSAVES EVERY 600ms, which is what shapes everything here. A
// row entered letter by letter is a dozen saves; recorded one for one, the
// history would be unreadable within a minute and would bury the one change
// somebody is looking for. So consecutive saves BY THE SAME PERSON inside
// COALESCE_MS are merged into one entry, and merging keeps the FIRST value seen
// and the LAST — "Foundations → Substructure", not the eleven keystrokes
// between them. A task added and then removed inside one session leaves
// nothing, because nothing is what happened.
//
// PURE. No store, no clock: the time and the person come in as arguments, so
// this is asserted without a database.

/** The fields worth naming. Everything else on a task is derived or cosmetic. */
export const TRACKED = [
  "name", "start", "duration", "durationUnit", "percentComplete", "status", "priority",
  "milestone", "parentId", "assigneeIds", "dependencies", "effortHours", "notes",
] as const;
export type TrackedField = (typeof TRACKED)[number];

export type PlanChange =
  | { kind: "added"; taskId: string; name: string }
  | { kind: "removed"; taskId: string; name: string }
  | { kind: "field"; taskId: string; name: string; field: TrackedField; from: string; to: string }
  | { kind: "meta"; field: "name" | "status"; from: string; to: string };

export type PlanHistoryEntry = {
  id: string;
  at: string;
  byCollaboratorId: string;
  changes: PlanChange[];
  /** How many changes the entry actually holds, before the cap below dropped any. */
  changeCount: number;
  /** The plan's task count after this save — the shape of the plan at that moment. */
  taskCount: number;
};

/** Saves by one person inside this window are one entry. */
export const COALESCE_MS = 10 * 60 * 1000;
/** Entries kept per plan. Older ones fall off the end. */
export const HISTORY_MAX = 200;
/** Changes kept per entry; `changeCount` still reports the true number. */
export const CHANGES_MAX = 200;

type Task = Record<string, unknown> & { id?: unknown };

const text = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(text).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

// A DEPENDENCY READS AS WHAT IT LINKS TO, not as its stored object: a change
// from `[{"id":"d1","predecessorId":"t3","type":"FS","lag":0}]` to the same with
// a lag of 2 has to be legible to somebody reading it a week later.
const depText = (v: unknown): string => (Array.isArray(v) ? v : [])
  .map((d) => {
    const dep = (d || {}) as Record<string, unknown>;
    const lag = Number(dep.lag) || 0;
    return `${text(dep.predecessorId || dep.taskId)}${dep.type ? ` ${text(dep.type)}` : ""}${lag ? ` ${lag > 0 ? "+" : ""}${lag}` : ""}`;
  })
  .join(", ");

const valueOf = (task: Task, field: TrackedField): string =>
  (field === "dependencies" ? depText(task[field]) : text(task[field]));

const taskName = (task: Task): string => String(task?.name ?? "").slice(0, 120);

/**
 * WHAT ONE SAVE DID. Tasks are matched BY ID, never by position: a row dragged
 * up the list moved, it was not deleted and re-added, and a history that said
 * otherwise would be worse than none.
 */
export function planChanges(before: unknown, after: unknown): PlanChange[] {
  const out: PlanChange[] = [];
  const beforeDoc = (before || {}) as Record<string, unknown>;
  const afterDoc = (after || {}) as Record<string, unknown>;

  const metaBefore = (beforeDoc.meta || {}) as Record<string, unknown>;
  const metaAfter = (afterDoc.meta || {}) as Record<string, unknown>;
  for (const field of ["name", "status"] as const) {
    const from = text(metaBefore[field]);
    const to = text(metaAfter[field]);
    if (from !== to) out.push({ kind: "meta", field, from, to });
  }

  const olds = (Array.isArray(beforeDoc.tasks) ? beforeDoc.tasks : []) as Task[];
  const news = (Array.isArray(afterDoc.tasks) ? afterDoc.tasks : []) as Task[];
  const oldById = new Map(olds.filter((t) => t?.id).map((t) => [String(t.id), t]));
  const newById = new Map(news.filter((t) => t?.id).map((t) => [String(t.id), t]));

  for (const task of news) {
    const id = String(task?.id ?? "");
    if (!id) continue;
    const old = oldById.get(id);
    if (!old) { out.push({ kind: "added", taskId: id, name: taskName(task) }); continue; }
    for (const field of TRACKED) {
      const from = valueOf(old, field);
      const to = valueOf(task, field);
      if (from !== to) out.push({ kind: "field", taskId: id, name: taskName(task), field, from, to });
    }
  }
  for (const task of olds) {
    const id = String(task?.id ?? "");
    if (id && !newById.has(id)) out.push({ kind: "removed", taskId: id, name: taskName(task) });
  }
  return out;
}

/**
 * ONE SESSION'S CHANGES, folded together. The rules are what make a merged
 * entry read like a summary of the session rather than a transcript of it:
 *
 *   - a field changed twice keeps the FIRST `from` and the LAST `to`
 *   - a field changed back to what it was leaves nothing behind
 *   - a task added and then edited stays "added" (its edits are part of adding it)
 *   - a task added and then removed leaves nothing; it never existed for anybody else
 *   - a task removed and then re-added under the same id is neither
 */
export function mergeChanges(existing: readonly PlanChange[], incoming: readonly PlanChange[]): PlanChange[] {
  const out: PlanChange[] = [...existing];
  const indexOfField = (taskId: string, field: string) =>
    out.findIndex((c) => c.kind === "field" && c.taskId === taskId && c.field === field);
  const indexOfKind = (kind: "added" | "removed", taskId: string) =>
    out.findIndex((c) => c.kind === kind && c.taskId === taskId);
  const indexOfMeta = (field: string) => out.findIndex((c) => c.kind === "meta" && c.field === field);

  for (const change of incoming) {
    if (change.kind === "meta") {
      const at = indexOfMeta(change.field);
      if (at < 0) { out.push(change); continue; }
      const first = out[at] as Extract<PlanChange, { kind: "meta" }>;
      if (first.from === change.to) out.splice(at, 1);
      else out[at] = { ...first, to: change.to };
      continue;
    }

    if (change.kind === "added") {
      const removedAt = indexOfKind("removed", change.taskId);
      // Removed and added again under one id: the plan holds it, as it did before.
      if (removedAt >= 0) { out.splice(removedAt, 1); continue; }
      if (indexOfKind("added", change.taskId) < 0) out.push(change);
      continue;
    }

    if (change.kind === "removed") {
      const addedAt = indexOfKind("added", change.taskId);
      if (addedAt >= 0) {
        // Added and removed in one session: drop the add and everything about it.
        out.splice(addedAt, 1);
        for (let i = out.length - 1; i >= 0; i -= 1) {
          const c = out[i];
          if (c.kind === "field" && c.taskId === change.taskId) out.splice(i, 1);
        }
        continue;
      }
      // Its edits are moot now; what happened to it is that it went.
      for (let i = out.length - 1; i >= 0; i -= 1) {
        const c = out[i];
        if (c.kind === "field" && c.taskId === change.taskId) out.splice(i, 1);
      }
      if (indexOfKind("removed", change.taskId) < 0) out.push(change);
      continue;
    }

    // A field on a task this session ADDED is part of the add, not a change.
    if (indexOfKind("added", change.taskId) >= 0) continue;
    const at = indexOfField(change.taskId, change.field);
    if (at < 0) { out.push(change); continue; }
    const first = out[at] as Extract<PlanChange, { kind: "field" }>;
    if (first.from === change.to) out.splice(at, 1);
    else out[at] = { ...first, name: change.name, to: change.to };
  }
  return out;
}

/**
 * THE HISTORY AFTER THIS SAVE. Returns the list unchanged when the save changed
 * nothing this records — the planner PUTs on a zoom change and a column toggle
 * too, and an entry saying nobody did anything is noise with a name on it.
 */
export function appendHistory(
  history: readonly PlanHistoryEntry[],
  entry: { id: string; at: string; byCollaboratorId: string; changes: PlanChange[]; taskCount: number },
): PlanHistoryEntry[] {
  if (!entry.changes.length) return [...history];
  // Newest first, which is the order the panel reads in.
  const [latest, ...rest] = history;
  const within = latest
    && latest.byCollaboratorId === entry.byCollaboratorId
    && Date.parse(entry.at) - Date.parse(latest.at) < COALESCE_MS
    && Date.parse(entry.at) >= Date.parse(latest.at);

  if (within) {
    const merged = mergeChanges(latest.changes, entry.changes);
    // The session undid itself — everything it had done is back as it was.
    if (!merged.length) return rest;
    return [{
      ...latest,
      at: entry.at,
      changes: merged.slice(0, CHANGES_MAX),
      changeCount: merged.length,
      taskCount: entry.taskCount,
    }, ...rest];
  }

  return [{
    id: entry.id,
    at: entry.at,
    byCollaboratorId: entry.byCollaboratorId,
    changes: entry.changes.slice(0, CHANGES_MAX),
    changeCount: entry.changes.length,
    taskCount: entry.taskCount,
  }, ...history].slice(0, HISTORY_MAX);
}
