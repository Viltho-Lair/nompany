'use client';

import { create } from 'zustand';
import type {
  ColorBy,
  Dependency,
  DependencyType,
  Granularity,
  ProjectMeta,
  Resource,
  Task,
  WorkCalendar,
  ZoomLevel,
} from '@/components/planner/lib/types';
import { DEFAULT_CALENDAR, snapForward } from '@/components/planner/lib/schedule/calendar';
import {
  buildTreeIndex,
  descendantsOf,
  normalizeOrder,
  wouldCreateCycle,
} from '@/components/planner/lib/schedule/tree';
import {
  TEMPLATES,
  blankTask,
  instantiateTemplate,
  newId,
} from '@/components/planner/lib/templates';

/*
  NOMPANY PERSISTENCE SEAM.

  The original app persisted the whole store through zustand's `persist`
  middleware into localStorage. In nompany a plan is one Redis-backed JSON
  document per plan, so the middleware is gone and the store is a plain
  `create(fn)`. EVERY action, selector and helper below is byte-for-byte the
  original; only three things change at the seam:

    - the initial state is an EMPTY plan (blank meta, no tasks) rather than the
      demo software-delivery seed. A real plan's contents always arrive from
      Redis via hydratePlan(); seeding a project's plan with sample tasks is the
      one behaviour the seam must not keep.
    - `hydratePlan(doc)` — load a PlanDoc, MERGING a partial doc over the store's
      own defaults. A plan created from a project is seeded server-side with only
      `{ meta, tasks: [] }`; every scheduling default (calendar, resources, zoom,
      colorBy, visibleColumns, the show* flags) is absent and must be filled in
      from the store, never duplicated on the server. When `doc` is null the whole
      plan defaults with a blank meta and no tasks.
    - `planDoc(state)` — the persisted payload the screen PUTs back. Exactly the
      old `partialize` shape: history (past/future) and transient selection are
      deliberately excluded, so they never travel to Redis.
*/

export type GridColumn =
  | 'wbs'
  | 'name'
  | 'assignee'
  | 'start'
  | 'duration'
  | 'end'
  | 'dependencies'
  | 'status'
  | 'progress'
  | 'priority'
  | 'effort';

export const ALL_COLUMNS: { key: GridColumn; label: string; width: number }[] = [
  { key: 'wbs', label: 'WBS', width: 64 },
  { key: 'name', label: 'Task name', width: 300 },
  { key: 'assignee', label: 'Assignee', width: 132 },
  { key: 'start', label: 'Start', width: 128 },
  { key: 'duration', label: 'Duration', width: 104 },
  { key: 'end', label: 'End', width: 128 },
  { key: 'dependencies', label: 'Predecessors', width: 128 },
  { key: 'status', label: 'Status', width: 128 },
  { key: 'progress', label: '% Done', width: 104 },
  { key: 'priority', label: 'Priority', width: 96 },
  { key: 'effort', label: 'Effort (h)', width: 88 },
];

const DEFAULT_COLUMNS: GridColumn[] = [
  'wbs',
  'name',
  'assignee',
  'start',
  'duration',
  'end',
  'dependencies',
  'status',
  'progress',
];

interface HistoryEntry {
  tasks: Task[];
}

interface PlannerState {
  meta: ProjectMeta;
  tasks: Task[];
  calendar: WorkCalendar;
  resources: Resource[];

  /* view state */
  zoom: ZoomLevel;
  colorBy: ColorBy;
  visibleColumns: GridColumn[];
  selectedId: string | null;
  showCriticalPath: boolean;
  showDependencies: boolean;
  inspectorOpen: boolean;
  // Trim the waterfall's timeline to the work itself — one day before the first
  // task starts to one day after the last task ends — instead of the padded
  // project window. A view filter, so it is transient (never persisted).
  trimTimeline: boolean;

  past: HistoryEntry[];
  future: HistoryEntry[];

  /* nompany seam */
  hydratePlan: (doc: PlanDoc | null) => void;
  // The plan's people, set from the studio's live collaborators by the screen
  // after it hydrates. Not part of PlanDoc, so it never saves and never undoes.
  setResources: (resources: Resource[]) => void;

  /* project-level */
  setMeta: (patch: Partial<ProjectMeta>) => void;
  loadTemplate: (templateId: string, startDate?: Date) => void;
  resetProject: () => void;
  importTasks: (tasks: Task[]) => void;

  /* calendar */
  setCalendar: (patch: Partial<WorkCalendar>) => void;
  setGranularity: (g: Granularity) => void;

  /* task CRUD */
  updateTask: (id: string, patch: Partial<Task>) => void;
  addTaskBelow: (id: string | null) => string;
  addSubtask: (parentId: string) => string;
  addMilestone: (id: string | null) => string;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;

  /* structure */
  indent: (id: string) => void;
  outdent: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  toggleCollapse: (id: string) => void;
  setAllCollapsed: (collapsed: boolean) => void;

  /* links */
  addDependency: (
    successorId: string,
    predecessorId: string,
    type?: DependencyType,
    lag?: number,
  ) => void;
  updateDependency: (
    successorId: string,
    predecessorId: string,
    patch: Partial<Dependency>,
  ) => void;
  removeDependency: (successorId: string, predecessorId: string) => void;
  setDependenciesFromWbs: (successorId: string, expression: string) => void;

  /* view */
  setZoom: (z: ZoomLevel) => void;
  setColorBy: (c: ColorBy) => void;
  toggleColumn: (c: GridColumn) => void;
  select: (id: string | null) => void;
  setShowCriticalPath: (v: boolean) => void;
  setTrimTimeline: (v: boolean) => void;
  setShowDependencies: (v: boolean) => void;
  setInspectorOpen: (v: boolean) => void;

  undo: () => void;
  redo: () => void;
}

/**
 * The persisted document — the store slice that travels to Redis and back.
 * Exactly the old `partialize` shape.
 */
export interface PlanDoc {
  meta: ProjectMeta;
  tasks: Task[];
  // Neither `calendar` nor `resources` is persisted here: the working week is the
  // STUDIO's (studio.workingHours, applied via setCalendar) and the people are
  // the studio's live collaborators (setResources) — both fed from the plan
  // door's payload each load, never copied into the document, so they can never
  // go stale or describe a different week from the studio's.
  zoom: ZoomLevel;
  colorBy: ColorBy;
  visibleColumns: GridColumn[];
  showCriticalPath: boolean;
  showDependencies: boolean;
}

const HISTORY_LIMIT = 60;

/** A blank project header for an empty plan (nothing carried from a project). */
function emptyMeta(): ProjectMeta {
  return {
    name: '',
    status: 'on_track',
    owner: '',
    startDate: new Date().toISOString(),
    description: '',
  };
}

/**
 * The store's own scheduling/view defaults. These live ONLY here — a plan
 * created from a project is seeded with just `{ meta, tasks }`, so hydratePlan
 * fills the rest in from this base. Never restated on the server.
 */
function defaultPlan(): Omit<PlanDoc, 'meta' | 'tasks'> {
  return {
    zoom: 'week',
    colorBy: 'phase',
    visibleColumns: DEFAULT_COLUMNS,
    showCriticalPath: false,
    showDependencies: true,
  };
}

/** The persisted payload — the old `partialize`, now the PUT body's `plan`. */
export function planDoc(state: PlannerState): PlanDoc {
  return {
    meta: state.meta,
    tasks: state.tasks,
    zoom: state.zoom,
    colorBy: state.colorBy,
    visibleColumns: state.visibleColumns,
    showCriticalPath: state.showCriticalPath,
    showDependencies: state.showDependencies,
  };
}

/** Wrap a mutation so it pushes onto the undo stack and re-normalises order. */
function mutate(
  set: (fn: (state: PlannerState) => Partial<PlannerState>) => void,
  producer: (tasks: Task[], state: PlannerState) => Task[],
) {
  set((state) => {
    const next = normalizeOrder(producer(state.tasks, state));
    return {
      tasks: next,
      past: [...state.past, { tasks: state.tasks }].slice(-HISTORY_LIMIT),
      future: [],
    };
  });
}

/** The task plus every descendant, as a contiguous slice of the flat array. */
function blockOf(tasks: Task[], id: string): Set<string> {
  const index = buildTreeIndex(tasks);
  return new Set([id, ...descendantsOf(id, index)]);
}

export const usePlannerStore = create<PlannerState>()((set, get) => ({
  meta: emptyMeta(),
  tasks: [],
  calendar: DEFAULT_CALENDAR,
  // Filled from the studio's collaborators on hydrate (setResources); empty
  // until then so an unhydrated plan shows no phantom people.
  resources: [],

  zoom: 'week',
  colorBy: 'phase',
  visibleColumns: DEFAULT_COLUMNS,
  selectedId: null,
  showCriticalPath: false,
  showDependencies: true,
  inspectorOpen: false,
  trimTimeline: false,

  past: [],
  future: [],

  /* ------------------------------ nompany seam ------------------------------ */

  // Merge a partial doc over the store's defaults so scheduling defaults live
  // only here. hydratePlan() notifies subscribers synchronously; the screen's
  // hydratedRef guard makes sure this initial notification never triggers a PUT.
  hydratePlan: (doc) =>
    set(() => {
      const base = { meta: emptyMeta(), tasks: [] as Task[], ...defaultPlan() };
      const merged = doc ? { ...base, ...doc } : base;
      return {
        ...merged,
        tasks: normalizeOrder(merged.tasks),
        // Transient selection + history never survive a (re)hydrate.
        selectedId: null,
        inspectorOpen: false,
        past: [],
        future: [],
      };
    }),

  setResources: (resources) => set({ resources }),

  setMeta: (patch) => set((s) => ({ meta: { ...s.meta, ...patch } })),

  loadTemplate: (templateId, startDate) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const anchor = startDate ?? new Date();
    const tasks = template.rows.length
      ? normalizeOrder(instantiateTemplate(template, anchor))
      : [];
    set((s) => ({
      tasks,
      meta: {
        ...s.meta,
        name:
          template.id === 'blank' ? 'Untitled project' : template.name,
        startDate: anchor.toISOString(),
      },
      selectedId: null,
      past: [...s.past, { tasks: s.tasks }].slice(-HISTORY_LIMIT),
      future: [],
    }));
  },

  resetProject: () =>
    set((s) => ({
      tasks: [],
      selectedId: null,
      past: [...s.past, { tasks: s.tasks }].slice(-HISTORY_LIMIT),
      future: [],
    })),

  importTasks: (tasks) => mutate(set, () => tasks),

  setCalendar: (patch) =>
    set((s) => ({ calendar: { ...s.calendar, ...patch } })),

  setGranularity: (granularity) =>
    set((s) => ({ calendar: { ...s.calendar, granularity } })),

  updateTask: (id, patch) =>
    mutate(set, (tasks) =>
      tasks.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        // Keep the two "is this done?" signals from drifting apart.
        if (patch.percentComplete !== undefined) {
          next.percentComplete = Math.min(
            100,
            Math.max(0, patch.percentComplete),
          );
          if (next.percentComplete === 100) next.status = 'complete';
          else if (next.percentComplete > 0 && next.status === 'not_started')
            next.status = 'in_progress';
          else if (next.percentComplete === 0 && next.status === 'complete')
            next.status = 'in_progress';
        }
        if (patch.status !== undefined) {
          if (patch.status === 'complete') next.percentComplete = 100;
          else if (
            patch.status === 'not_started' &&
            t.status === 'complete'
          )
            next.percentComplete = 0;
        }
        if (patch.milestone) next.duration = 0;
        if (patch.duration !== undefined) {
          next.duration = Math.max(0, patch.duration);
          if (next.duration > 0) next.milestone = false;
        }
        // Editing a date by hand means the user wants it pinned.
        if (patch.start !== undefined && patch.scheduleMode === undefined) {
          next.scheduleMode = t.dependencies.length ? 'manual' : t.scheduleMode;
        }
        return next;
      }),
    ),

  addTaskBelow: (id) => {
    const created = blankTask();
    mutate(set, (tasks) => {
      if (!tasks.length) return [created];
      if (!id) return [...tasks, created];
      const anchor = tasks.find((t) => t.id === id);
      if (!anchor) return [...tasks, created];
      const block = blockOf(tasks, id);
      const lastIdx = tasks.reduce(
        (acc, t, i) => (block.has(t.id) ? i : acc),
        0,
      );
      const copy = [...tasks];
      copy.splice(lastIdx + 1, 0, {
        ...created,
        parentId: anchor.parentId,
        phaseColor: anchor.phaseColor,
        start: anchor.start,
      });
      return copy;
    });
    return created.id;
  },

  addSubtask: (parentId) => {
    const created = blankTask();
    mutate(set, (tasks) => {
      const parent = tasks.find((t) => t.id === parentId);
      if (!parent) return [...tasks, created];
      const block = blockOf(tasks, parentId);
      const lastIdx = tasks.reduce(
        (acc, t, i) => (block.has(t.id) ? i : acc),
        0,
      );
      const copy = [...tasks];
      copy.splice(lastIdx + 1, 0, {
        ...created,
        parentId,
        phaseColor: parent.phaseColor,
        start: parent.start,
      });
      // A row that just gained a child must be expanded to show it.
      return copy.map((t) =>
        t.id === parentId ? { ...t, collapsed: false } : t,
      );
    });
    return created.id;
  },

  addMilestone: (id) => {
    const created = blankTask({
      name: 'New milestone',
      milestone: true,
      duration: 0,
      effortHours: 0,
    });
    mutate(set, (tasks) => {
      if (!id) return [...tasks, created];
      const anchor = tasks.find((t) => t.id === id);
      if (!anchor) return [...tasks, created];
      const block = blockOf(tasks, id);
      const lastIdx = tasks.reduce(
        (acc, t, i) => (block.has(t.id) ? i : acc),
        0,
      );
      const copy = [...tasks];
      copy.splice(lastIdx + 1, 0, {
        ...created,
        parentId: anchor.parentId,
        phaseColor: anchor.phaseColor,
      });
      return copy;
    });
    return created.id;
  },

  deleteTask: (id) => {
    mutate(set, (tasks) => {
      const block = blockOf(tasks, id);
      return tasks
        .filter((t) => !block.has(t.id))
        .map((t) =>
          t.dependencies.some((d) => block.has(d.predecessorId))
            ? {
                ...t,
                dependencies: t.dependencies.filter(
                  (d) => !block.has(d.predecessorId),
                ),
              }
            : t,
        );
    });
    if (get().selectedId === id) set({ selectedId: null });
  },

  duplicateTask: (id) =>
    mutate(set, (tasks) => {
      const block = blockOf(tasks, id);
      const slice = tasks.filter((t) => block.has(t.id));
      const idMap = new Map(slice.map((t) => [t.id, newId()]));
      const clones = slice.map((t) => ({
        ...t,
        id: idMap.get(t.id)!,
        name: t.id === id ? `${t.name} (copy)` : t.name,
        parentId: t.parentId
          ? idMap.get(t.parentId) ?? t.parentId
          : t.parentId,
        // Links inside the copied block are rewired; links pointing out
        // of it are preserved as-is.
        dependencies: t.dependencies.map((d) => ({
          ...d,
          predecessorId: idMap.get(d.predecessorId) ?? d.predecessorId,
        })),
      }));
      const lastIdx = tasks.reduce(
        (acc, t, i) => (block.has(t.id) ? i : acc),
        0,
      );
      const copy = [...tasks];
      copy.splice(lastIdx + 1, 0, ...clones);
      return copy;
    }),

  indent: (id) =>
    mutate(set, (tasks) => {
      const index = buildTreeIndex(tasks);
      const task = index.byId.get(id);
      if (!task) return tasks;
      const siblings = index.childIds.get(task.parentId ?? null) ?? [];
      const pos = siblings.indexOf(id);
      if (pos <= 0) return tasks; // nothing to become a child of
      const newParent = siblings[pos - 1];
      if (wouldCreateCycle(id, newParent, index)) return tasks;
      return tasks.map((t) =>
        t.id === id
          ? { ...t, parentId: newParent }
          : t.id === newParent
            ? { ...t, collapsed: false }
            : t,
      );
    }),

  outdent: (id) =>
    mutate(set, (tasks) => {
      const index = buildTreeIndex(tasks);
      const task = index.byId.get(id);
      if (!task?.parentId) return tasks;
      const parent = index.byId.get(task.parentId);
      const grandparent = parent?.parentId ?? null;
      // Array position already sits after the old parent's block, so the
      // depth-first normalise lands it right after its former parent.
      return tasks.map((t) =>
        t.id === id ? { ...t, parentId: grandparent } : t,
      );
    }),

  moveUp: (id) =>
    mutate(set, (tasks) => moveSibling(tasks, id, -1)),

  moveDown: (id) =>
    mutate(set, (tasks) => moveSibling(tasks, id, 1)),

  toggleCollapse: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, collapsed: !t.collapsed } : t,
      ),
    })),

  setAllCollapsed: (collapsed) =>
    set((s) => ({
      tasks: s.tasks.map((t) => ({ ...t, collapsed })),
    })),

  addDependency: (successorId, predecessorId, type = 'FS', lag = 0) =>
    mutate(set, (tasks) => {
      if (successorId === predecessorId) return tasks;
      return tasks.map((t) =>
        t.id === successorId
          ? {
              ...t,
              scheduleMode: 'auto',
              dependencies: t.dependencies.some(
                (d) => d.predecessorId === predecessorId,
              )
                ? t.dependencies
                : [...t.dependencies, { predecessorId, type, lag }],
            }
          : t,
      );
    }),

  updateDependency: (successorId, predecessorId, patch) =>
    mutate(set, (tasks) =>
      tasks.map((t) =>
        t.id === successorId
          ? {
              ...t,
              dependencies: t.dependencies.map((d) =>
                d.predecessorId === predecessorId ? { ...d, ...patch } : d,
              ),
            }
          : t,
      ),
    ),

  removeDependency: (successorId, predecessorId) =>
    mutate(set, (tasks) =>
      tasks.map((t) =>
        t.id === successorId
          ? {
              ...t,
              dependencies: t.dependencies.filter(
                (d) => d.predecessorId !== predecessorId,
              ),
            }
          : t,
      ),
    ),

  /**
   * Accepts the MS Project shorthand a planner would actually type:
   * "3", "3FS+2", "1.2SS", "4, 5FF-1".
   */
  setDependenciesFromWbs: (successorId, expression) =>
    mutate(set, (tasks) => {
      const index = buildTreeIndex(tasks);
      const idByWbs = new Map<string, string>();
      index.wbs.forEach((code, id) => idByWbs.set(code, id));

      const parsed = expression
        .split(/[,;]/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .flatMap((chunk) => {
          const m = /^([\d.]+)\s*(FS|SS|FF|SF)?\s*([+-]\s*[\d.]+)?$/i.exec(
            chunk,
          );
          if (!m) return [];
          const predecessorId = idByWbs.get(m[1]);
          if (!predecessorId || predecessorId === successorId) return [];
          return [
            {
              predecessorId,
              type: (m[2]?.toUpperCase() as DependencyType) ?? 'FS',
              lag: m[3] ? Number(m[3].replace(/\s+/g, '')) : 0,
            },
          ];
        });

      return tasks.map((t) =>
        t.id === successorId
          ? {
              ...t,
              dependencies: parsed,
              scheduleMode: parsed.length ? 'auto' : t.scheduleMode,
            }
          : t,
      );
    }),

  setZoom: (zoom) => set({ zoom }),
  setColorBy: (colorBy) => set({ colorBy }),
  toggleColumn: (column) =>
    set((s) => ({
      visibleColumns: s.visibleColumns.includes(column)
        ? s.visibleColumns.filter((c) => c !== column)
        : ALL_COLUMNS.map((c) => c.key).filter(
            (c) => s.visibleColumns.includes(c) || c === column,
          ),
    })),
  select: (selectedId) => set({ selectedId }),
  setShowCriticalPath: (showCriticalPath) => set({ showCriticalPath }),
  setTrimTimeline: (trimTimeline) => set({ trimTimeline }),
  setShowDependencies: (showDependencies) => set({ showDependencies }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return {};
      return {
        tasks: prev.tasks,
        past: s.past.slice(0, -1),
        future: [{ tasks: s.tasks }, ...s.future].slice(0, HISTORY_LIMIT),
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return {};
      return {
        tasks: next.tasks,
        past: [...s.past, { tasks: s.tasks }].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
      };
    }),
}));

/** Swap a task (with its whole subtree) with the sibling before/after it. */
function moveSibling(tasks: Task[], id: string, direction: -1 | 1): Task[] {
  const index = buildTreeIndex(tasks);
  const task = index.byId.get(id);
  if (!task) return tasks;
  const siblings = index.childIds.get(task.parentId ?? null) ?? [];
  const pos = siblings.indexOf(id);
  const targetPos = pos + direction;
  if (pos < 0 || targetPos < 0 || targetPos >= siblings.length) return tasks;

  const reordered = [...siblings];
  reordered.splice(pos, 1);
  reordered.splice(targetPos, 0, id);

  // Rebuild the flat array so sibling array-order matches the new sequence.
  const rank = new Map(reordered.map((sid, i) => [sid, i]));
  const blocks = new Map<string, Task[]>();
  for (const sid of siblings) {
    const block = new Set([sid, ...descendantsOf(sid, index)]);
    blocks.set(
      sid,
      tasks.filter((t) => block.has(t.id)),
    );
  }
  const movedIds = new Set(
    Array.from(blocks.values()).flatMap((b) => b.map((t) => t.id)),
  );
  const firstIdx = tasks.findIndex((t) => movedIds.has(t.id));
  const rest = tasks.filter((t) => !movedIds.has(t.id));
  const rebuilt = reordered
    .sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0))
    .flatMap((sid) => blocks.get(sid) ?? []);

  const out = [...rest];
  out.splice(Math.max(0, firstIdx), 0, ...rebuilt);
  return out;
}

/** Utility used by the toolbar to jump the timeline to a snapped "today". */
export function todayInCalendar(cal: WorkCalendar): Date {
  return snapForward(new Date(), cal);
}
