export type Priority = "urgent" | "high" | "medium" | "low";

export type ColumnAccent =
  | "violet"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Member {
  id: string;
  name: string;
  /** Two-letter fallback shown in the avatar. */
  initials: string;
  /** Tailwind-independent gradient pair used for the avatar ring. */
  from: string;
  to: string;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  tags: string[];
  assigneeIds: string[];
  subtasks: Subtask[];
  dueDate: string | null;
  createdAt: number;
}

export interface Column {
  id: string;
  title: string;
  accent: ColumnAccent;
  /** Ordered list of task ids. Order lives here, never on the task. */
  taskIds: string[];
  /** Optional soft cap that renders as a WIP warning. */
  wipLimit: number | null;
}

/** Sort-key helpers so the board can offer quick "tidy up" actions. */
export type SortKey = "manual" | "priority" | "created" | "title";

export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PRIORITY_META: Record<
  Priority,
  { labelKey: string; dot: string; chip: string; glow: string }
> = {
  urgent: {
    labelKey: "prUrgent",
    dot: "bg-rose-500",
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-300 ring-1 ring-inset ring-rose-500/25",
    glow: "shadow-[0_0_12px_-2px_rgba(244,63,94,0.55)]",
  },
  high: {
    labelKey: "prHigh",
    dot: "bg-amber-500",
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/25",
    glow: "shadow-[0_0_12px_-2px_rgba(245,158,11,0.5)]",
  },
  medium: {
    labelKey: "prMedium",
    dot: "bg-sky-500",
    chip: "bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/25",
    glow: "shadow-[0_0_12px_-2px_rgba(14,165,233,0.5)]",
  },
  low: {
    labelKey: "prLow",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/25",
    glow: "shadow-[0_0_12px_-2px_rgba(16,185,129,0.45)]",
  },
};

// NOMPANY SEAM: nompany's tailwind.config redefines `violet` and `cyan` as
// single landing-page colours, so the numeric shades `violet-500` / `cyan-400`
// no longer exist. The two affected stops are written as arbitrary hex values
// (the exact Tailwind violet-500 / cyan-400) so the accent bars render
// identically without depending on those scales.
export const ACCENT_META: Record<
  ColumnAccent,
  {
    labelKey: string;
    bar: string;
    text: string;
    ring: string;
    /** Legacy solid fill (kept for any blurred usage). */
    blob: string;
    /**
     * Radial falloff used for the column's corner bloom. Equivalent look to a
     * blurred disc, but paints in one pass with no filter layer.
     */
    bloom: string;
  }
> = {
  violet: {
    labelKey: "acViolet",
    bar: "from-[#8b5cf6] to-fuchsia-500",
    text: "text-[#8b5cf6]",
    ring: "ring-[#8b5cf6]/30",
    blob: "bg-[#8b5cf6]/20",
    bloom:
      "[background-image:radial-gradient(closest-side,rgba(139,92,246,0.30),rgba(139,92,246,0.10)_55%,transparent_80%)]",
  },
  sky: {
    labelKey: "acSky",
    bar: "from-sky-500 to-[#22d3ee]",
    text: "text-sky-500",
    ring: "ring-sky-500/30",
    blob: "bg-sky-500/20",
    bloom:
      "[background-image:radial-gradient(closest-side,rgba(14,165,233,0.30),rgba(14,165,233,0.10)_55%,transparent_80%)]",
  },
  emerald: {
    labelKey: "acEmerald",
    bar: "from-emerald-500 to-teal-400",
    text: "text-emerald-500",
    ring: "ring-emerald-500/30",
    blob: "bg-emerald-500/20",
    bloom:
      "[background-image:radial-gradient(closest-side,rgba(16,185,129,0.30),rgba(16,185,129,0.10)_55%,transparent_80%)]",
  },
  amber: {
    labelKey: "acAmber",
    bar: "from-amber-500 to-orange-400",
    text: "text-amber-500",
    ring: "ring-amber-500/30",
    blob: "bg-amber-500/20",
    bloom:
      "[background-image:radial-gradient(closest-side,rgba(245,158,11,0.30),rgba(245,158,11,0.10)_55%,transparent_80%)]",
  },
  rose: {
    labelKey: "acRose",
    bar: "from-rose-500 to-pink-500",
    text: "text-rose-500",
    ring: "ring-rose-500/30",
    blob: "bg-rose-500/20",
    bloom:
      "[background-image:radial-gradient(closest-side,rgba(244,63,94,0.30),rgba(244,63,94,0.10)_55%,transparent_80%)]",
  },
  slate: {
    labelKey: "acSlate",
    bar: "from-slate-400 to-slate-500",
    text: "text-slate-400",
    ring: "ring-slate-500/30",
    blob: "bg-slate-500/20",
    bloom:
      "[background-image:radial-gradient(closest-side,rgba(100,116,139,0.30),rgba(100,116,139,0.10)_55%,transparent_80%)]",
  },
};

export const ACCENT_ORDER: ColumnAccent[] = [
  "violet",
  "sky",
  "emerald",
  "amber",
  "rose",
  "slate",
];
