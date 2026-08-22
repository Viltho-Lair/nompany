// WHAT TASKS STORES, transcribed from the coercion that already writes it.
//
// TRANSCRIBED, NOT DESIGNED. Every field here appears because `createTask`
// writes it or `updateTask` patches it, with the same optionality: a field the
// creator always sets is required, one only some rows carry is optional. That
// is the whole method — the record already had a shape, it just had nowhere to
// be written down.
//
// NO SCHEMA LIBRARY, and that is a decision rather than an omission. The plan
// names Zod or Valibot for this file, which is a new dependency, and adopting
// one is `researcher`'s call under the rule that binds every agent here. Until
// that decision is made these are types, the hand-rolled coercion above stays
// exactly where it is, and nothing pretends to validate at runtime that does
// not. Swapping in `z.infer<>` later changes this file and nothing else.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

/** One checklist item. `id` is minted; `done` is what a tick writes. */
export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

/**
 * A task on the board.
 *
 * `type` DISTINGUISHES TWO DIFFERENT THINGS wearing one record. An empty type
 * is a to-do somebody wrote. A non-empty one is a decision the product raised —
 * "approve quotation Q-0042" — which is why `approvals`, `subjectId` and
 * `authority` only ever appear on those, and why updateTask refuses to retitle
 * one.
 */
export type Task = {
  id: string;
  studioId: string;
  sectionId: string;
  title: string;
  type: string;
  description: string;
  status: string;
  priority: string;
  assigneeCollaboratorId: string;
  projectId: string;
  dueDate: string;
  checklist: ChecklistItem[];
  createdByCollaboratorId: string;
  createdAt: string;
  completedAt: string;

  // ---- typed tasks only ----------------------------------------------------
  /** CollaboratorID → their decision. Absent on an ordinary to-do. */
  approvals?: Record<string, unknown>;
  approvalWithdrawnAt?: string;
  /** The record this decision is about — a quotation, an RFQ, a document. */
  subjectId?: string;
  subjectRef?: string;
  // NAMED SEPARATELY FROM subjectId, because one consequence hangs off it:
  // Finance signing a "po" task issues the project number, and it finds the
  // project through this. A generic subjectId would not have told the reader
  // that decideTask reaches into Projects on exactly this field.
  quotationId?: string;

  // ---- derived, never stored ------------------------------------------------
  /** Ticked items over total. Computed on the way out, so it is optional here. */
  progress?: number;
};

/** The board's own settings row: which authority answers which task type. */
export type TaskSettings = {
  routing?: Record<string, unknown>;
  [field: string]: unknown;
};

// ---- this department's context ---------------------------------------------
//
// `ModuleContext` carries an index signature, because the factory NAMES its
// fields from the spec — `cashSection`, `canViewTickets` — so the key set is a
// property of each call rather than of the factory. The cost is that
// destructuring one yields `unknown`, which is correct and useless.
//
// So each department declares what its own call produces. The names come
// straight off the spec in the service file: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`, and
// whatever `extend` adds is listed last. A SUB-SECTION FALLS BACK TO THE ROOT
// and is therefore always present; a FOREIGN one never does, so it is nullable —
// "this studio has no Technical section" is a real answer the screens handle.
export type TasksContext = ModuleContext & {
  settingsSection: Section;
  projectsListSection: Section | null;
  canViewSettings: boolean;
  canManageSettings: boolean;
  taskAssignees: unknown;
};
