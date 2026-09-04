// OPERATIONS' TYPES — the records inferred from `schema.ts`, plus the context.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Location, Permit, Position, Shift } from "./schema";

import type { Permit, Shift } from "./schema";

// ---- what the screens receive ------------------------------------------------
// Both are the stored row plus names resolved from ids and a state computed
// from the dates. Derived on every read: a stored `state` would be wrong the
// morning after a permit expired, and nothing would have written to it.

/** A permit with its location, project and holders named, and its validity read. */
export type PermitView = Permit & {
  locationName: string;
  projectNumber: string;
  holderAliases: string[];
  state: string;
  /** Days until it expires, or null when it has no end date. */
  daysLeft: number | null;
};

/** A shift with its location and person named, and its length computed. */
export type ShiftView = Shift & {
  locationName: string;
  alias: string;
  hours: number;
};

// ---- this department's context ---------------------------------------------
// Generated from the spec in operations.ts — see the note in
// modules/tasks/types.ts. `hrSection` is foreign and therefore nullable: a
// studio without HR still runs Operations, and the leave check is what silently
// stops being asked.
export type OperationsContext = ModuleContext & {
  trackingSection: Section;
  settingsSection: Section;
  hrSection: Section | null;
  projectsListSection: Section | null;
  /** Administration's Master data, where locations live. Nullable like every foreign section. */
  masterSection: Section | null;
  canViewTracking: boolean;
  canManageTracking: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  settings: Record<string, unknown>;
};

// The planner resolves on its own sub-section key, so its context is the bare
// module context plus the new-plan presets kept on that section's `settings`.
export type PlannerContext = ModuleContext & {
  presets: Record<string, unknown>;
};

// The Schedule sub-section resolves on its own grant (operations.schedule). The
// rota lives under the operations ROOT section, reached here as the foreign
// `operationsMainSection`; HR is foreign for the leave check. It owns one
// collection of its own — `jobs`, read through the base context's `section` —
// because a job is dispatched from this screen rather than being coverage the
// whole department reads.
export type ScheduleContext = ModuleContext & {
  operationsMainSection: Section;
  settingsSection: Section | null;
  hrSection: Section | null;
  projectsListSection: Section | null;
  /** Administration's Master data, where locations live. */
  masterSection: Section | null;
};
