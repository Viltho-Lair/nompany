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
