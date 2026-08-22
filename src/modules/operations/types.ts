// OPERATIONS' TYPES — the records inferred from `schema.ts`, plus the context.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Location, Permit, Position, Shift } from "./schema";

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
  canViewTracking: boolean;
  canManageTracking: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  settings: Record<string, unknown>;
};
