"use client";

import { create } from "zustand";
import {
  ACCENT_ORDER,
  PRIORITY_RANK,
  type Column,
  type ColumnAccent,
  type Member,
  type Priority,
  type SortKey,
  type Subtask,
  type Task,
} from "@/components/kanban/lib/types";

/*
  NOMPANY PERSISTENCE SEAM.

  The original app persisted the whole store through zustand's `persist`
  middleware into localStorage. In nompany a board is one Redis-backed JSON
  document per project, so the middleware is gone and the store is a plain
  `create(fn)`. EVERY action, selector and helper below is byte-for-byte the
  original; only three things are added at the seam:

    - `emptySeed()` — the "fresh empty copy" a brand-new board starts from: the
      SAME four columns as the demo seed (titles, accents, WIP), but with no
      tasks and no members. Members arrive from the project's collaborators via
      the API, never from a demo list.
    - `hydrate(doc, members)` — loads a persisted BoardDoc (or emptySeed() when
      the project has never saved one) plus the collaborator-derived members.
    - `boardDoc(state)` — the persisted payload the profile PUTs back. Exactly
      the old `partialize` shape: { boardName, columnOrder, columns, tasks,
      members, memberOrder }.

  The demo `buildSeed()` (Product Roadmap sample data) is deliberately dropped:
  seeding a real project's board with sample tasks or fictional members is the
  one behaviour the seam must not keep. `resetBoard` now clears to an empty
  board while preserving the real members.
*/

/* -------------------------------------------------------------------------- */
/*                                    ids                                     */
/* -------------------------------------------------------------------------- */

let counter = 0;
/** Client-only id factory. Seed data uses hard-coded ids so SSR stays stable. */
const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

/* -------------------------------------------------------------------------- */
/*                                    state                                   */
/* -------------------------------------------------------------------------- */

export interface BoardState {
  boardName: string;
  /** Column order is the source of truth for horizontal layout. */
  columnOrder: string[];
  columns: Record<string, Column>;
  /** Tasks are normalised; membership + order live on `column.taskIds`. */
  tasks: Record<string, Task>;
  members: Record<string, Member>;
  memberOrder: string[];

  /** UI-only bits, kept in the store so every surface reads the same filter. */
  query: string;
  priorityFilter: Priority | "all";
}

/** The persisted document — the store slice that travels to Redis and back. */
export interface BoardDoc {
  boardName: string;
  columnOrder: string[];
  columns: Record<string, Column>;
  tasks: Record<string, Task>;
  members: Record<string, Member>;
  memberOrder: string[];
}

export interface BoardActions {
  renameBoard: (name: string, fallback?: string) => void;

  /* nompany seam */
  hydrate: (doc: BoardDoc | null, members: Member[], seedWords?: SeedWords) => void;

  /* columns */
  addColumn: (title?: string) => string;
  renameColumn: (columnId: string, title: string) => void;
  setColumnAccent: (columnId: string, accent: ColumnAccent) => void;
  setColumnWipLimit: (columnId: string, limit: number | null) => void;
  deleteColumn: (columnId: string) => void;
  duplicateColumn: (columnId: string) => void;
  clearColumn: (columnId: string) => void;
  sortColumn: (columnId: string, key: Exclude<SortKey, "manual">) => void;
  /** Reorders columns by id — used by the dnd-kit column sortable context. */
  moveColumn: (activeId: string, overId: string) => void;
  /**
   * Nudges a column one slot left/right. Pointer dragging covers reordering for
   * mouse users, but dnd-kit's keyboard coordinate getter does not resolve a
   * target for this horizontal list, so this is the keyboard-reachable path.
   */
  moveColumnBy: (columnId: string, delta: number) => void;

  /* tasks */
  addTask: (
    columnId: string,
    input: Partial<Omit<Task, "id" | "columnId">> & { title: string },
    index?: number,
    fallbackTitle?: string,
  ) => string;
  updateTask: (taskId: string, patch: Partial<Omit<Task, "id">>) => void;
  deleteTask: (taskId: string) => void;
  duplicateTask: (taskId: string) => void;
  /**
   * The single entry point every drag ends in.
   * Moves a task to `toColumnId` at `toIndex` (appended when omitted).
   */
  moveTask: (taskId: string, toColumnId: string, toIndex?: number) => void;

  /* subtasks */
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  renameSubtask: (taskId: string, subtaskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  reorderSubtasks: (taskId: string, from: number, to: number) => void;

  /* assignees */
  toggleAssignee: (taskId: string, memberId: string) => void;

  /* filters */
  setQuery: (query: string) => void;
  setPriorityFilter: (p: Priority | "all") => void;

  resetBoard: (seedWords?: SeedWords) => void;
}

export type BoardStore = BoardState & BoardActions;

/* -------------------------------------------------------------------------- */
/*                                 pure helpers                               */
/* -------------------------------------------------------------------------- */

/** Immutable array move that tolerates out-of-range indices. */
export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

export function subtaskProgress(task: Task) {
  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.done).length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

/** The persisted payload — the old `partialize`, now the PUT body's `board`. */
export function boardDoc(state: BoardState): BoardDoc {
  return {
    boardName: state.boardName,
    columnOrder: state.columnOrder,
    columns: state.columns,
    tasks: state.tasks,
    members: state.members,
    memberOrder: state.memberOrder,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  empty seed                                */
/* -------------------------------------------------------------------------- */

/**
 * The fresh-empty default for a project that has never saved a board: the SAME
 * four columns as the original demo seed — same titles, same accents, same WIP
 * limit — but with empty `taskIds`, no tasks and no members.
 */
// Just the five words the seed needs, not the whole dictionary — the store is
// plain state and has no business importing a locale module.
export type SeedWords = {
  seedBoardName: string;
  seedBacklog: string;
  seedInProgress: string;
  seedInReview: string;
  seedDone: string;
};

// THE WORDS COME IN. A seeded title is stored and then renamed by whoever owns
// the board, so it cannot be translated on display without overwriting that
// rename — it takes the language of the person who created the board instead.
// The fallback keeps the store usable from a context that has no dictionary.
export function emptySeed(w?: SeedWords): BoardState {
  const columns: Column[] = [
    { id: "c1", title: w?.seedBacklog ?? "Backlog", accent: "slate", taskIds: [], wipLimit: null },
    { id: "c2", title: w?.seedInProgress ?? "In Progress", accent: "violet", taskIds: [], wipLimit: 3 },
    { id: "c3", title: w?.seedInReview ?? "In Review", accent: "amber", taskIds: [], wipLimit: null },
    { id: "c4", title: w?.seedDone ?? "Done", accent: "emerald", taskIds: [], wipLimit: null },
  ];

  return {
    boardName: w?.seedBoardName ?? "Project board",
    columnOrder: columns.map((c) => c.id),
    columns: Object.fromEntries(columns.map((c) => [c.id, c])),
    tasks: {},
    members: {},
    memberOrder: [],
    query: "",
    priorityFilter: "all",
  };
}

/* -------------------------------------------------------------------------- */
/*                                   store                                    */
/* -------------------------------------------------------------------------- */

export const useBoardStore = create<BoardStore>()((set) => ({
  ...emptySeed(),

  renameBoard: (name, fallback) => set({ boardName: name.trim() || fallback || "Untitled board" }),

  /* ------------------------------ nompany seam ------------------------------ */

  // Members come from the project's collaborators and are authoritative, so they
  // replace whatever member list a previously-saved doc carried. Everything else
  // is taken from the doc (or the empty seed when the project has none yet).
  hydrate: (doc, members, seedWords) =>
    set(() => {
      const base = doc ?? emptySeed(seedWords);
      return {
        boardName: base.boardName,
        columnOrder: base.columnOrder,
        columns: base.columns,
        tasks: base.tasks,
        members: Object.fromEntries((members ?? []).map((m) => [m.id, m])),
        memberOrder: (members ?? []).map((m) => m.id),
        query: "",
        priorityFilter: "all",
      };
    }),

  /* ------------------------------ columns ----------------------------- */

  addColumn: (title) => {
    const id = uid("col");
    set((s) => {
      const accent =
        ACCENT_ORDER[s.columnOrder.length % ACCENT_ORDER.length] ?? "violet";
      return {
        columnOrder: [...s.columnOrder, id],
        columns: {
          ...s.columns,
          [id]: {
            id,
            title: (title ?? "").trim() || "New Column",
            accent,
            taskIds: [],
            wipLimit: null,
          },
        },
      };
    });
    return id;
  },

  renameColumn: (columnId, title) =>
    set((s) => {
      const col = s.columns[columnId];
      if (!col) return s;
      return {
        columns: {
          ...s.columns,
          [columnId]: { ...col, title: title.trim() || col.title },
        },
      };
    }),

  setColumnAccent: (columnId, accent) =>
    set((s) => {
      const col = s.columns[columnId];
      if (!col) return s;
      return { columns: { ...s.columns, [columnId]: { ...col, accent } } };
    }),

  setColumnWipLimit: (columnId, limit) =>
    set((s) => {
      const col = s.columns[columnId];
      if (!col) return s;
      return {
        columns: {
          ...s.columns,
          [columnId]: { ...col, wipLimit: limit && limit > 0 ? limit : null },
        },
      };
    }),

  deleteColumn: (columnId) =>
    set((s) => {
      const col = s.columns[columnId];
      if (!col) return s;
      const tasks = { ...s.tasks };
      col.taskIds.forEach((id) => delete tasks[id]);
      const columns = { ...s.columns };
      delete columns[columnId];
      return {
        columns,
        tasks,
        columnOrder: s.columnOrder.filter((id) => id !== columnId),
      };
    }),

  duplicateColumn: (columnId) =>
    set((s) => {
      const col = s.columns[columnId];
      if (!col) return s;
      const newColId = uid("col");
      const tasks = { ...s.tasks };
      const taskIds = col.taskIds.flatMap((tid) => {
        const src = s.tasks[tid];
        if (!src) return [];
        const nid = uid("task");
        tasks[nid] = {
          ...src,
          id: nid,
          columnId: newColId,
          subtasks: src.subtasks.map((st) => ({ ...st, id: uid("sub") })),
          createdAt: Date.now(),
        };
        return [nid];
      });
      const columnOrder = s.columnOrder.slice();
      columnOrder.splice(s.columnOrder.indexOf(columnId) + 1, 0, newColId);
      return {
        columnOrder,
        tasks,
        columns: {
          ...s.columns,
          [newColId]: { ...col, id: newColId, title: `${col.title} copy`, taskIds },
        },
      };
    }),

  clearColumn: (columnId) =>
    set((s) => {
      const col = s.columns[columnId];
      if (!col) return s;
      const tasks = { ...s.tasks };
      col.taskIds.forEach((id) => delete tasks[id]);
      return {
        tasks,
        columns: { ...s.columns, [columnId]: { ...col, taskIds: [] } },
      };
    }),

  sortColumn: (columnId, key) =>
    set((s) => {
      const col = s.columns[columnId];
      if (!col) return s;
      const sorted = col.taskIds.slice().sort((a, b) => {
        const ta = s.tasks[a];
        const tb = s.tasks[b];
        if (!ta || !tb) return 0;
        if (key === "priority")
          return PRIORITY_RANK[ta.priority] - PRIORITY_RANK[tb.priority];
        if (key === "created") return tb.createdAt - ta.createdAt;
        return ta.title.localeCompare(tb.title);
      });
      return { columns: { ...s.columns, [columnId]: { ...col, taskIds: sorted } } };
    }),

  moveColumn: (activeId, overId) =>
    set((s) => {
      const from = s.columnOrder.indexOf(activeId);
      const to = s.columnOrder.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return s;
      return { columnOrder: arrayMove(s.columnOrder, from, to) };
    }),

  moveColumnBy: (columnId, delta) =>
    set((s) => {
      const from = s.columnOrder.indexOf(columnId);
      if (from === -1) return s;
      const to = from + delta;
      if (to < 0 || to >= s.columnOrder.length) return s;
      return { columnOrder: arrayMove(s.columnOrder, from, to) };
    }),

  /* ------------------------------- tasks ------------------------------ */

  addTask: (columnId, input, index, fallbackTitle) => {
    const id = uid("task");
    set((s) => {
      const col = s.columns[columnId];
      if (!col) return s;
      const task: Task = {
        id,
        columnId,
        title: input.title.trim() || fallbackTitle || "Untitled task",
        description: input.description ?? "",
        priority: input.priority ?? "medium",
        tags: input.tags ?? [],
        assigneeIds: input.assigneeIds ?? [],
        subtasks: input.subtasks ?? [],
        dueDate: input.dueDate ?? null,
        createdAt: Date.now(),
      };
      const taskIds = col.taskIds.slice();
      taskIds.splice(index ?? taskIds.length, 0, id);
      return {
        tasks: { ...s.tasks, [id]: task },
        columns: { ...s.columns, [columnId]: { ...col, taskIds } },
      };
    });
    return id;
  },

  updateTask: (taskId, patch) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      // `columnId` is derived from column membership - never patch it here.
      const { columnId: _ignored, ...safe } = patch;
      return { tasks: { ...s.tasks, [taskId]: { ...task, ...safe } } };
    }),

  deleteTask: (taskId) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      const col = s.columns[task.columnId];
      const tasks = { ...s.tasks };
      delete tasks[taskId];
      return {
        tasks,
        columns: col
          ? {
              ...s.columns,
              [col.id]: {
                ...col,
                taskIds: col.taskIds.filter((id) => id !== taskId),
              },
            }
          : s.columns,
      };
    }),

  duplicateTask: (taskId) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      const col = s.columns[task.columnId];
      if (!col) return s;
      const nid = uid("task");
      const copy: Task = {
        ...task,
        id: nid,
        title: `${task.title} copy`,
        subtasks: task.subtasks.map((st) => ({ ...st, id: uid("sub") })),
        createdAt: Date.now(),
      };
      const taskIds = col.taskIds.slice();
      taskIds.splice(col.taskIds.indexOf(taskId) + 1, 0, nid);
      return {
        tasks: { ...s.tasks, [nid]: copy },
        columns: { ...s.columns, [col.id]: { ...col, taskIds } },
      };
    }),

  moveTask: (taskId, toColumnId, toIndex) =>
    set((s) => {
      const task = s.tasks[taskId];
      const target = s.columns[toColumnId];
      if (!task || !target) return s;
      const source = s.columns[task.columnId];
      if (!source) return s;

      // Same column: a plain reorder.
      if (source.id === target.id) {
        const from = source.taskIds.indexOf(taskId);
        if (from === -1) return s;
        const to = toIndex ?? source.taskIds.length - 1;
        if (from === to) return s;
        return {
          columns: {
            ...s.columns,
            [source.id]: { ...source, taskIds: arrayMove(source.taskIds, from, to) },
          },
        };
      }

      // Cross column: splice out of source, splice into target.
      const sourceIds = source.taskIds.filter((id) => id !== taskId);
      const targetIds = target.taskIds.filter((id) => id !== taskId);
      targetIds.splice(
        Math.max(0, Math.min(toIndex ?? targetIds.length, targetIds.length)),
        0,
        taskId,
      );

      return {
        tasks: { ...s.tasks, [taskId]: { ...task, columnId: target.id } },
        columns: {
          ...s.columns,
          [source.id]: { ...source, taskIds: sourceIds },
          [target.id]: { ...target, taskIds: targetIds },
        },
      };
    }),

  /* ----------------------------- subtasks ----------------------------- */

  addSubtask: (taskId, title) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task || !title.trim()) return s;
      const sub: Subtask = { id: uid("sub"), title: title.trim(), done: false };
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, subtasks: [...task.subtasks, sub] },
        },
      };
    }),

  toggleSubtask: (taskId, subtaskId) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...task,
            subtasks: task.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, done: !st.done } : st,
            ),
          },
        },
      };
    }),

  renameSubtask: (taskId, subtaskId, title) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...task,
            subtasks: task.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, title: title.trim() || st.title } : st,
            ),
          },
        },
      };
    }),

  deleteSubtask: (taskId, subtaskId) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...task,
            subtasks: task.subtasks.filter((st) => st.id !== subtaskId),
          },
        },
      };
    }),

  reorderSubtasks: (taskId, from, to) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, subtasks: arrayMove(task.subtasks, from, to) },
        },
      };
    }),

  /* ---------------------------- assignees ----------------------------- */

  toggleAssignee: (taskId, memberId) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      const has = task.assigneeIds.includes(memberId);
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...task,
            assigneeIds: has
              ? task.assigneeIds.filter((id) => id !== memberId)
              : [...task.assigneeIds, memberId],
          },
        },
      };
    }),

  /* ------------------------------ filters ----------------------------- */

  setQuery: (query) => set({ query }),
  setPriorityFilter: (priorityFilter) => set({ priorityFilter }),

  // Clear the board to its empty four columns, keeping the real members. (The
  // original reset restored demo tasks + fictional members; that behaviour is
  // deliberately not carried into a real project's board.)
  resetBoard: (seedWords) =>
    set((s) => {
      const seed = emptySeed(seedWords);
      return {
        boardName: seed.boardName,
        columnOrder: seed.columnOrder,
        columns: seed.columns,
        tasks: seed.tasks,
        members: s.members,
        memberOrder: s.memberOrder,
        query: "",
        priorityFilter: "all",
      };
    }),
}));

/* -------------------------------------------------------------------------- */
/*                               selector helpers                             */
/* -------------------------------------------------------------------------- */

export const useColumnOrder = () => useBoardStore((s) => s.columnOrder);
export const useColumn = (id: string) => useBoardStore((s) => s.columns[id]);
export const useTask = (id: string) => useBoardStore((s) => s.tasks[id]);

/** Does a task survive the current search + priority filter? */
export function matchesFilter(
  task: Task,
  query: string,
  priority: Priority | "all",
): boolean {
  if (priority !== "all" && task.priority !== priority) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    task.title.toLowerCase().includes(q) ||
    task.description.toLowerCase().includes(q) ||
    task.tags.some((t) => t.toLowerCase().includes(q)) ||
    task.subtasks.some((st) => st.title.toLowerCase().includes(q))
  );
}
