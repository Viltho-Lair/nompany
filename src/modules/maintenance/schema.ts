// WHAT MAINTENANCE STORES, as a schema rather than a description.
//
// Transcribed from the coercion in ./maintenance that writes it. The rules that
// decide which values are allowed live in ./model, pure, so the screen refuses
// exactly what the server refuses.

import { z } from "zod";

/**
 * A FAULT REPORT — anybody's word that something is wrong. It is not work yet:
 * somebody holding `maintenance.orders.create` accepts it (which raises a work
 * order naming it) or declines it with a reason.
 *
 * ONLY `Declined` IS STORED as a status. Accepted is derived from the work
 * order that names the request (see `requestState`), so `status` here is
 * "Open" or "Declined" and nothing else.
 */
export const WorkRequestSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** WR-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  title: z.string().max(200),
  description: z.string().max(4000),
  priority: z.string(),
  /** An engine `equipment` record's id, or "". */
  assetId: z.string().max(60),
  /** A Master-data location's id, or "". */
  locationId: z.string().max(60),
  /** `/api/media/<id>` paths — private, served only after a membership check. */
  photos: z.array(z.string().max(120)),
  status: z.string(),
  declineReason: z.string().max(1000).optional(),
  decidedByCollaboratorId: z.string().optional(),
  decidedAt: z.string().optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkRequest = z.infer<typeof WorkRequestSchema>;

/** One step on the ladder, as it happened. Appended under a function patch. */
export const OrderStepSchema = z.object({
  status: z.string(),
  at: z.string(),
  byCollaboratorId: z.string(),
  /** A hold's reason token, when the step was a hold. */
  note: z.string().optional(),
});

/**
 * WORK SOMEBODY AUTHORISED, planned and assigned.
 *
 * The timestamps are what the reliability figures are made of — `startedAt` is
 * the FIRST start (a resume after a hold does not move it), `completedAt` the
 * technician's word, `closedAt` the reviewer's. Every one is stamped by a move
 * (`moveStamps` in ./model), never typed.
 */
export const WorkOrderSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** WO-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  title: z.string().max(200),
  description: z.string().max(4000),
  type: z.string(),
  priority: z.string(),
  status: z.string(),
  assetId: z.string().max(60),
  locationId: z.string().max(60),
  /** The request this answers, or "" for work raised directly. */
  requestId: z.string().max(60),
  /** CollaboratorIDs (invariant 6), checked against the studio on write. */
  assignedToCollaboratorIds: z.array(z.string()),
  dueOn: z.string().max(10),
  estimatedHours: z.number().nullable(),
  photos: z.array(z.string().max(120)),
  holdReason: z.string().optional(),
  /** What was done. Required to complete (`orderMoveProblem`). */
  resolution: z.string().max(4000).optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  closedAt: z.string().optional(),
  cancelledAt: z.string().optional(),
  history: z.array(OrderStepSchema).optional(),
  /** The preventive plan that raised this, or "" for work raised by a person. */
  pmPlanId: z.string().max(60).optional(),
  /**
   * THE OCCURRENCE IT ANSWERS — the plan's due date when it was raised. What
   * PM compliance is measured against, and what makes the daily run
   * idempotent (a second run finds the order for this date and raises none).
   */
  pmDueOn: z.string().max(10).optional(),
  /** The plan's checklist, copied at raising, one tick per step. */
  checklist: z.array(z.object({ id: z.string(), label: z.string().max(200), done: z.boolean() })).optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkOrder = z.infer<typeof WorkOrderSchema>;

/**
 * A PREVENTIVE PLAN — work that comes round on a calendar. The daily run
 * raises a work order from it when `nextDue` arrives (less `leadDays`), one
 * open order at a time; see ./schedule for fixed against floating.
 */
export const PmPlanSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** PM-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  title: z.string().max(200),
  description: z.string().max(4000),
  /** preventive · inspection — a plan never raises corrective work. */
  type: z.string(),
  priority: z.string(),
  assetId: z.string().max(60),
  locationId: z.string().max(60),
  assignedToCollaboratorIds: z.array(z.string()),
  /** One of PLAN_FREQUENCIES — Field Service's list. */
  frequency: z.string(),
  /** fixed · floating. */
  scheduleMode: z.string(),
  nextDue: z.string().max(10),
  leadDays: z.number(),
  estimatedHours: z.number().nullable(),
  /** Step labels. Each order gets its own ticked copy. */
  checklist: z.array(z.string().max(200)),
  /** Active · Paused · Retired. */
  status: z.string(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PmPlan = z.infer<typeof PmPlanSchema>;

/**
 * TIME BOOKED AGAINST A WORK ORDER — its own collection rather than an array on
 * the order, because the migration design refuses nested arrays that grow
 * without bound, and a long repair collects an entry per person per day.
 *
 * HOURS ONLY. What an hour costs is Phase 3's, with parts — a rate needs a
 * source, and the one timesheets use is copied per entry off a deal.
 */
export const LabourEntrySchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  workOrderId: z.string(),
  /** Who did the work (invariant 6) — not necessarily who booked it. */
  collaboratorId: z.string(),
  workedOn: z.string().max(10),
  /** In quarters of an hour, 0.25 – 24. */
  hours: z.number(),
  /** work · travel · wait — see LABOUR_KINDS. */
  kind: z.string(),
  note: z.string().max(500),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
});
export type LabourEntry = z.infer<typeof LabourEntrySchema>;
