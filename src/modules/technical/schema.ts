// WHAT TECHNICAL STORES, as a schema rather than a description.
//
// Transcribed from the coercion that already writes it, and not parsing
// anything yet — see modules/tasks/schema.ts.

import { z } from "zod";

/**
 * A REQUEST FOR PRICING, raised against a sales ticket. `reference` is derived
 * from the ticket's own — RFQ-ACME-001 — and made unique against what already
 * exists rather than counted, for the reason in the sales schema.
 */
export const RfqSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  ticketId: z.string(),
  description: z.string().max(4000),
  status: z.string(),
  handledByCollaboratorId: z.string(),
  requestedByCollaboratorId: z.string(),
  createdAt: z.string(),

  // ---- written when it is converted ----------------------------------------
  quotationId: z.string().optional(),
  convertedAt: z.string().optional(),
});

/**
 * A QUOTATION, and the record with the most rules attached to it.
 *
 * `locked` is the one nothing else may flip: locking says the document is
 * finished and a client is holding it, so unlocking is a separate right from
 * locking rather than a bigger edit. `revision` and `revisionOf` are how a
 * reissue keeps its number while being a different document — the number is
 * what a client quotes back, so it survives the revision.
 *
 * `completedAt` is nullable rather than "": it is the moment the quotation
 * became the thing a project can be opened from, and null means it has not.
 */
export const QuotationSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  number: z.string(),
  revision: z.number(),
  revisionOf: z.string().optional(),
  description: z.string(),
  title: z.string().max(200),
  handledBy: z.string().optional(),
  handledByCollaboratorId: z.string().optional(),
  status: z.string(),
  tables: z.array(z.unknown()),
  items: z.array(z.unknown()),
  vatRate: z.number(),
  comments: z.array(z.unknown()),
  locked: z.boolean(),
  lead: z.string(),
  completedAt: z.string().nullable(),
  preparedByCollaboratorId: z.string(),
  createdAt: z.string(),

  // ---- the chain's keys, carried downstream --------------------------------
  rfqId: z.string().optional(),
  ticketId: z.string().optional(),

  // ---- computed by the pricer, stored so the document is stable ------------
  // A quotation a client holds must not change its own totals because a cost
  // moved underneath it, so these are written rather than derived on read.
  subtotal: z.number().optional(),
  vat: z.number().optional(),
  total: z.number().optional(),
  effectiveDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
});

export type Rfq = z.infer<typeof RfqSchema>;
export type Quotation = z.infer<typeof QuotationSchema>;
