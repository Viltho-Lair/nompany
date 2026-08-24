/* ------------------------------------------------------------------ *
 * Domain model for the Project Planner.
 * Field set follows MS Project / Primavera P6 / Asana conventions.
 * ------------------------------------------------------------------ */

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/** A link from a predecessor task to this task. */
export interface Dependency {
  /** id of the predecessor task */
  predecessorId: string;
  /** Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish */
  type: DependencyType;
  /**
   * Lead/lag expressed in the *current* granularity unit
   * (working days when granularity = 'days', working hours when 'hours').
   * Negative values are leads.
   */
  lag: number;
}

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'on_track'
  | 'at_risk'
  | 'blocked'
  | 'complete';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

/**
 * 'auto'   – start date is driven by predecessors (MS Project "auto scheduled")
 * 'manual' – the user pinned the start date; predecessors are shown but ignored
 */
export type ScheduleMode = 'auto' | 'manual';

export interface Resource {
  id: string;
  name: string;
  initials: string;
  role: string;
  /** tailwind-ish hex used for the avatar chip */
  color: string;
  /** cost per hour, used for the rolled-up budget figure */
  rate: number;
  /** % of a full-time equivalent this person can give the project */
  capacity: number;
}

export interface Task {
  id: string;
  /** Ordering is by array position; hierarchy by parentId. WBS is derived. */
  parentId: string | null;

  name: string;
  notes: string;

  /** resource ids; the first one is treated as the primary owner */
  assigneeIds: string[];

  /**
   * Anchor start. For summary rows and auto-scheduled rows with predecessors
   * this is overwritten by the engine; it is still stored so that unlinking a
   * dependency leaves a sensible value behind.
   */
  start: string; // ISO
  /** Derived by the engine, never edited directly. */
  end: string; // ISO

  /**
   * Duration in the unit named by `durationUnit`. Ignored for summary rows,
   * which derive their span from children.
   */
  duration: number;
  durationUnit: 'days' | 'hours';

  dependencies: Dependency[];

  status: TaskStatus;
  /** 0..100 */
  percentComplete: number;
  priority: Priority;

  scheduleMode: ScheduleMode;
  /** zero-duration checkpoint, rendered as a diamond */
  milestone: boolean;
  collapsed: boolean;
  /** planned effort in hours, used for cost roll-up */
  effortHours: number;
  /** free-form grouping label, drives the swimlane bands + bar colour */
  phaseColor?: string;
}

/** A task decorated with everything the views need. Produced by the engine. */
export interface ComputedTask extends Task {
  /** '1', '1.2', '1.2.3' */
  wbs: string;
  depth: number;
  childIds: string[];
  isSummary: boolean;
  /** display order index across the flattened, expanded tree */
  index: number;
  /** true when an ancestor is collapsed */
  hidden: boolean;

  startDate: Date;
  endDate: Date;

  /** working time actually spanned, in the active unit */
  computedDuration: number;
  /** roll-up for summary rows, own value for leaves */
  rolledPercentComplete: number;
  rolledEffortHours: number;
  rolledCost: number;

  /** ids of tasks that list this one as a predecessor */
  successorIds: string[];
  /** engine problems: circular links, dangling refs, constraint conflicts */
  issues: string[];
  /** longest-path member */
  critical: boolean;
  /** working time between this task's finish and the project finish */
  totalFloat: number;
}

export type Granularity = 'days' | 'hours';

export interface WorkCalendar {
  granularity: Granularity;
  /** 0 = Sunday … 6 = Saturday */
  workingWeekdays: number[];
  /** local hour the working day opens, e.g. 9 */
  dayStartHour: number;
  /** local hour the working day closes, e.g. 17 */
  dayEndHour: number;
  /** unpaid break in hours removed from each working day */
  lunchHours: number;
  /** ISO yyyy-MM-dd strings that are never working days */
  holidays: string[];
}

export interface ProjectMeta {
  name: string;
  status: 'on_track' | 'at_risk' | 'off_track' | 'on_hold';
  owner: string;
  startDate: string;
  description: string;
}

export type ZoomLevel = 'hour' | 'day' | 'week' | 'month' | 'quarter';

export type ColorBy = 'phase' | 'status' | 'assignee' | 'priority';
