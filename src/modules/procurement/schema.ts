// WHAT A REQUISITION STORES — the request that stands before a purchase order.
//
// Its rules live in ./model, which is pure, so the screen refuses what the
// server refuses. This file is only the shape on disk.
import { z } from "zod";

export const RequisitionLineSchema = z.object({
  /** What is wanted. The one field that makes a line real. */
  description: z.string().max(400),
  unit: z.string().max(40),
  qty: z.number(),
  /**
   * WHAT THE REQUESTER EXPECTS IT TO COST, and it is an estimate rather than a
   * price. Nobody has quoted anything at this point — that is the supplier RFQ,
   * a later bullet of this section — so calling it `unitPrice` would invite it
   * to be read as agreed.
   */
  estUnitCost: z.number(),
  /** A Registered Item, when the request names one. Frequently blank. */
  itemId: z.string().max(60),
});

export const RequisitionSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** PR-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  title: z.string().max(200),
  /** Why it is needed. The half a purchase order has never recorded. */
  justification: z.string().max(4000),
  /** The project it is for, when it is for one. Studio-level requests exist. */
  projectId: z.string().max(60),
  /**
   * Which part of that project's budget it belongs to, carried onto the order
   * at conversion so the commitment lands in the right place without anybody
   * coding it twice. Optional, and an uncoded request is not an error.
   */
  costCodeId: z.string().max(60).optional(),
  /** Who the requester expects to buy from, if they have a view. Never binding. */
  vendorId: z.string().max(60),
  neededBy: z.string(),
  lines: z.array(RequisitionLineSchema),
  status: z.string(),
  notes: z.string().max(2000),

  /**
   * THE SIGNATURES, and the plan that routed them — the same two fields a bill
   * and a bid carry, holding the same shapes, because this is P2's engine's
   * third document type rather than a third engine.
   *
   * Optional, because every requisition predating the chain has neither.
   */
  approvals: z.array(z.object({
    permission: z.string(),
    byCollaboratorId: z.string(),
    byAlias: z.string(),
    at: z.string(),
  })).optional(),
  approvalPlan: z.unknown().optional(),

  /** Stamped when somebody answers. A rejection is stamped like an approval. */
  answeredByCollaboratorId: z.string().optional(),
  answeredAt: z.string().optional(),
  /** Why it was refused. A rejection with no reason teaches the requester nothing. */
  rejectedReason: z.string().max(1000).optional(),

  submittedByCollaboratorId: z.string().optional(),
  submittedAt: z.string().optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RequisitionLine = z.infer<typeof RequisitionLineSchema>;
export type Requisition = z.infer<typeof RequisitionSchema>;
