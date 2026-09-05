import { z } from "zod";

/** One stage a tender has been in, and who put it there. */
export const TenderStageEntrySchema = z.object({
  status: z.string(),
  at: z.string(),
  /** A CollaboratorID (invariant 6). Empty for a move the system made. */
  byCollaboratorId: z.string(),
});

/**
 * A TENDER — an invitation to bid, and what the studio did about it.
 *
 * IT IS NOT A DEAL, and the difference is the reason this section exists. A
 * sales ticket is work a client has asked this studio for; a tender is work
 * being competed for, usually against a fixed date, and most of them end in a
 * decision NOT to bid or in somebody else winning. Recording only the ones that
 * turn into deals is how a studio loses the ability to answer "what are we
 * bidding, and what do we keep losing".
 *
 * `issuer` IS FREE TEXT AND `clientId` IS OPTIONAL, deliberately. The body
 * issuing a tender is frequently not a client yet — that is the point of
 * bidding — so requiring a client record first would mean inventing one for
 * every authority whose portal the studio watches. When it IS a client, the
 * pointer is there and the name is resolved live off that record (Law 4).
 */
export const TenderSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /**
   * From the COUNTER, never from a count — references only move forward
   * (invariant 10). A tender can be deleted before it is submitted, so the
   * count-based helper would reissue a number the moment one was.
   */
  ref: z.string(),
  title: z.string().max(200),
  /** Who is asking for bids, as typed. */
  issuer: z.string().max(160),
  /** The Sales client this issuer is, when it is one. */
  clientId: z.string().max(60),
  /** Where it came from: a portal, an invitation, a public notice. */
  source: z.string().max(120),
  issueDate: z.string().max(10),
  /** THE DATE THE REGISTER IS FOR. Everything else can be filled in later. */
  submissionDeadline: z.string().max(10),
  /** What the studio thinks the work is worth, before any estimate exists. */
  estimatedValue: z.number(),
  currency: z.string().max(8),
  status: z.string(),
  notes: z.string().max(4000),
  assignedToCollaboratorId: z.string(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  // ---- written by the stage transition, never by the form ------------------
  /** When the bid actually went in. Stamped by the move, not typed. */
  submittedAt: z.string().optional(),
  decidedAt: z.string().optional(),
  /** Why it was lost, declined or withdrawn. Empty on a win. */
  decisionReason: z.string().optional(),
  stageHistory: z.array(TenderStageEntrySchema).optional(),
});

export type Tender = z.infer<typeof TenderSchema>;
export type TenderStageEntry = z.infer<typeof TenderStageEntrySchema>;

/**
 * A LINE OF THE BILL OF QUANTITIES, priced or waiting to be.
 *
 * ITS OWN COLLECTION, not an array on the tender. Quotation lines, invoice
 * lines and sheet rows are all nested arrays today, and the migration design
 * calls them out as "the arrays that grow without bound" — the three it plans
 * to promote to child tables. A bill of quantities is the largest of that shape
 * anybody will produce here (hundreds of lines on one tender), so it starts
 * where those are going rather than repeating what they are being moved out of.
 *
 * `sortOrder` IS THE DOCUMENT'S ORDER, not a sort key the screen picks. A bill
 * is issued in an order — preliminaries, substructure, frame — and an estimator
 * checks it against the client's document line by line. Re-sorting it
 * alphabetically would be losing the only thing that makes that check possible.
 */
export const BoqItemSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** The tender this line prices. */
  tenderId: z.string().max(60),
  /** The trade or bill section it sits under, as the document words it. */
  group: z.string().max(120),
  /** The client's own item reference, where the document carries one. */
  code: z.string().max(40),
  description: z.string().max(1000),
  unit: z.string().max(24),
  qty: z.number(),
  /**
   * ZERO MEANS UNPRICED, not free. `boq.ts` turns on this being positive to
   * decide whether a bill is complete, and a total that silently counted
   * unpriced lines as nought is how a studio bids work it has not costed.
   */
  rate: z.number(),
  /**
   * The library rate this was taken from, when it was taken rather than typed.
   * A POINTER FOR PROVENANCE ONLY: the `rate` above is copied at the moment it
   * is applied, because a bill is a document somebody was given and re-reading
   * it from today's library would rewrite what was quoted last month — the same
   * rule a quotation line follows.
   */
  rateId: z.string().max(60),
  notes: z.string().max(1000),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * ONE RATE IN THE STUDIO'S LIBRARY — what it charges for a unit of work.
 *
 * The library is the studio's own, not a tender's: the point of keeping one is
 * that the next bid does not re-invent a number somebody already worked out.
 * A rate is COPIED onto a BOQ line when applied, never referenced live.
 */
export const TenderRateSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** The studio's own reference for it. Unique, case-insensitively. */
  code: z.string().max(40),
  description: z.string().max(500),
  unit: z.string().max(24),
  rate: z.number(),
  /** Trade or discipline, so a long library can be found in. */
  category: z.string().max(120),
  notes: z.string().max(1000),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type BoqItem = z.infer<typeof BoqItemSchema>;
export type TenderRate = z.infer<typeof TenderRateSchema>;
