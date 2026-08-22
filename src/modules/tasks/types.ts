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
  taskAssignees: unknown;
};
