// WHAT TASKS STORES, as a schema rather than a description.
//
// TRANSCRIBED FROM THE COERCION THAT ALREADY WRITES IT. Every field is here
// because `createTask` writes it or `updateTask` patches it, with the same
// optionality and the same limits: `.max(200)` on the title is the `str(v, 200)`
// three files over, written down where it can be checked.
//
// THE SCHEMA DEFINES THE TYPE, not the other way round. `types.ts` infers from
// this, so a field added here reaches every consumer and a field renamed here
// breaks the ones that read it — which is the whole reason the schema is the
// artefact rather than a hand-written type beside the coercion.
//
// IT DOES NOT PARSE ANYTHING YET, deliberately. The hand-rolled coercion in
// tasks.ts stays exactly where it is: replacing it is a behaviour change, the
// golden responses pin every field it produces, and the plan makes it the step
// AFTER this one for that reason. What this buys today is one place that says
// what a task is; what it buys next is deleting the coercion in its own commit,
// against the goldens.

import { z } from "zod";

/** One checklist item. `id` is minted; `done` is what a tick writes. */
export const ChecklistItemSchema = z.object({
  id: z.string().max(20),
  text: z.string().max(300),
  done: z.boolean(),
});

/**
 * A task on the board.
 *
 * `type` DISTINGUISHES TWO DIFFERENT THINGS wearing one record. An empty type
 * is a to-do somebody wrote. A non-empty one is a decision the product raised —
 * "approve quotation Q-0042" — which is why `approvals` and `quotationId` only
 * ever appear on those, and why updateTask refuses to retitle one: some of the
 * approvers may already have signed.
 */
export const TaskSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  title: z.string().max(200),
  type: z.string(),
  description: z.string().max(4000),
  status: z.string(),
  priority: z.string(),
  assigneeCollaboratorId: z.string().max(60),
  projectId: z.string().max(60),
  dueDate: z.string(),
  checklist: z.array(ChecklistItemSchema),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  completedAt: z.string(),

  // ---- typed tasks only ----------------------------------------------------
  /** CollaboratorID → their decision. Absent on an ordinary to-do. */
  approvals: z.record(z.string(), z.unknown()).optional(),
  approvalWithdrawnAt: z.string().optional(),
  /** The record this decision is about — a quotation, an RFQ, a document. */
  subjectId: z.string().optional(),
  subjectRef: z.string().optional(),
  // NAMED SEPARATELY FROM subjectId, because one consequence hangs off it:
  // Finance signing a "po" task issues the project number, and it finds the
  // project through this. A generic subjectId would not have told the reader
  // that decideTask reaches into Projects on exactly this field.
  quotationId: z.string().optional(),

  // ---- derived, never stored ------------------------------------------------
  /** Ticked items over total. Computed on the way out, so it is optional here. */
  progress: z.number().optional(),
});

/** The board's own settings row: which authority answers which task type. */
export const TaskSettingsSchema = z.looseObject({
  routing: z.record(z.string(), z.unknown()).optional(),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskSettings = z.infer<typeof TaskSettingsSchema>;
