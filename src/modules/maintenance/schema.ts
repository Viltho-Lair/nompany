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
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkOrder = z.infer<typeof WorkOrderSchema>;
