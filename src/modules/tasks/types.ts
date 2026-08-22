// TASKS' TYPES — the records inferred from `schema.ts`, plus what only this
// module's screens need.
//
// TWO FILES, and the split is the plan's: `schema.ts` is the stored record and
// is checkable at runtime; this is where a shape that is never stored lives —
// a context, a view model — because putting one in the schema would be claiming
// something could be parsed that is only ever assembled.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Task, ChecklistItem, TaskSettings } from "./schema";

import type { Task } from "./schema";

/**
 * WHO HOLDS EACH AUTHORITY RIGHT NOW — authority code to CollaboratorIDs, never
 * UserIDs (invariant 6). Read from Task settings on every request rather than
 * copied onto the row, so appointing somebody hands them the open tasks too.
 */
// KEYED BY STRING, NOT BY AuthorityCode. What is read back arrives off a stored
// settings blob and what indexes it arrives off a request body, so a union here
// would only be a cast at every use. The union does its work in
// TASK_TYPE_AUTHORITIES, where the codes are WRITTEN and a typo is catchable.
export type TaskAssignees = Record<string, string[]>;

/** One authority's decision, as it is stored on the task. */
export type Approval = {
  approved?: boolean;
  byCollaboratorId?: string;
  at?: string;
};

/**
 * A TASK WITH ITS ROUTING RESOLVED. Never stored — every field below is derived
 * from the task's type and the current settings, which is the whole point: a
 * stored copy would freeze at the moment it was written.
 */
export type EnrichedTask = Task & {
  authorities: string[];
  byAuthority: TaskAssignees;
  assigneeIds: string[];
  approvals: Record<string, Approval | undefined>;
  approvalState: { required: number; approved: number; complete: boolean } | null;
  /** Which of the authorities the VIEWER holds. Empty means not theirs to decide. */
  myAuthorities: string[];
};

/** One authority as the board draws it — ids resolved to names. */
export type AuthorityState = {
  code: string;
  label: string;
  holders: string[];
  approved: boolean;
  byAlias: string;
  at: string;
  /** Nobody appointed. The task can never complete; only settings unstick it. */
  orphaned: boolean;
};

/** One row of the board: the enriched task plus everything the screen shows. */
export type BoardTask = EnrichedTask & {
  assigneeAlias: string;
  createdByAlias: string;
  projectNumber: string;
  progress: number | null;
  overdue: boolean;
  mine: boolean;
  authorityStates: AuthorityState[];
};

// ---- this department's context ---------------------------------------------
//
// `ModuleContext` carries an index signature, because the factory NAMES its
// fields from the spec — `settingsSection`, `canViewSettings` — so the key set
// is a property of each call rather than of the factory. The cost is that
// destructuring one yields `unknown`, which is correct and useless.
//
// So each department declares what its own call produces. The names come
// straight off the spec in the service file: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`, and
// whatever `extend` adds is listed last. A SUB-SECTION FALLS BACK TO THE ROOT
// and is therefore always present; a FOREIGN one never does, so it is nullable —
// "this studio has no Projects section" is a real answer the screens handle.
export type TasksContext = ModuleContext & {
  settingsSection: Section;
  projectsListSection: Section | null;
  canViewSettings: boolean;
  canManageSettings: boolean;
  taskAssignees: TaskAssignees;
};
