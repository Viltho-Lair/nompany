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
/**
 * ONE LINE ON A QUOTATION TABLE, exactly as `cleanQuotationTables` writes it.
 *
 * `itemId` and `image` sit BESIDE the text rather than instead of it, and
 * `unitPrice` is copied at the moment the line is picked: a quotation is a
 * document somebody was given, so re-reading it from today's catalogue would
 * rewrite what was quoted last month.
 */
export const QuotationLineSchema = z.object({
  id: z.string().max(40),
  itemId: z.string().max(60),
  image: z.string().max(500),
  description: z.string().max(300),
  unit: z.string().max(30),
  qty: z.number(),
  unitPrice: z.number(),
  /** A PERCENTAGE off the unit price, clamped 0–100 — see netUnitPrice. */
  discount: z.number(),
});

/**
 * A TABLE ON A QUOTATION. The same item under "Ground floor" and again under
 * "First floor" is two pieces of work, which is what tables are for — so the
 * one-row-per-item rule applies per table, not per document.
 */
export const QuotationTableSchema = z.object({
  id: z.string().max(40),
  title: z.string().max(120),
  rows: z.array(QuotationLineSchema),
});

/**
 * THE FLAT PRICED LIST, derived from the tables rather than stored beside them.
 * `unitPrice` here is the NET price — the discount is already taken off, so
 * nothing downstream has to know discounts exist.
 */
export const QuotationItemSchema = z.object({
  description: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
});

/** One remark on the document, appended and never edited. */
export const QuotationCommentSchema = z.object({
  id: z.string(),
  text: z.string(),
  byCollaboratorId: z.string(),
  createdAt: z.string(),
});

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
  tables: z.array(QuotationTableSchema),
  items: z.array(QuotationItemSchema),
  vatRate: z.number(),
  comments: z.array(QuotationCommentSchema),
  locked: z.boolean(),
  lead: z.string(),
  completedAt: z.string().nullable(),
  preparedByCollaboratorId: z.string(),
  createdAt: z.string(),

  // ---- the chain's keys, carried downstream --------------------------------
  rfqId: z.string().optional(),
  ticketId: z.string().optional(),

  // ---- INTERNAL quotations only — no ticketId behind them -------------------
  // clientId NAMES a real Sales client, resolved live off that record the way
  // ticketFacts resolves a ticket's — never copied here. createQuotation runs
  // the whole client block (name/id, contact, site) through resolveClientFor
  // (see salesClients.ts), the same find-or-create a ticket uses, so a client
  // is ALWAYS a real row now: the free-text-only branch that used to write
  // clientName instead of resolving an id is gone — that branch is exactly
  // what left a project with no client at all (Project Home Invasion). New
  // writes leave clientName blank; it survives only as a READ fallback in
  // listQuotations for quotations created before this fix, which have a name
  // and no id because nothing ever turned their text into a Client record.
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  industry: z.string().optional(),
  deadline: z.string().optional(),

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
export type QuotationLine = z.infer<typeof QuotationLineSchema>;
export type QuotationTable = z.infer<typeof QuotationTableSchema>;
export type QuotationItem = z.infer<typeof QuotationItemSchema>;
export type QuotationComment = z.infer<typeof QuotationCommentSchema>;
