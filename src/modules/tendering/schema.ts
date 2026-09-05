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

  // ---- the bid review (P2's engine, second document type) ------------------
  //
  // BOTH OPTIONAL, because every tender already in the database predates them,
  // and a tender with no plan resolves one on its next approval attempt rather
  // than being migrated — a plan is cheap to derive and a backfill over live
  // rows is not. The same shape a bill carries, deliberately: two shapes for
  // one engine would be two things to keep in step.
  //
  // `status` is NOT extended for this. A signed bid is still Preparing until
  // somebody submits it — approval is a PRECONDITION of that move, not a stage
  // of its own — so TENDER_STAGES gains no value and every reader deriving
  // from status keeps reading what it reads today.
  approvals: z.array(z.object({
    permission: z.string(),
    byCollaboratorId: z.string(),
    byAlias: z.string(),
    at: z.string(),
  })).optional(),
  approvalPlan: z.object({
    steps: z.array(z.object({ permission: z.string(), from: z.number(), label: z.string() })),
    amountInBase: z.number(),
    rate: z.number().nullable(),
    updatedAt: z.number(),
    stale: z.boolean(),
  }).nullable().optional(),
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

/**
 * A DOCUMENT IN THE TENDER PACK — what we were given, what changed, what we sent.
 *
 * THE FILE ITSELF IS NOT HERE. `url` is a media record's URL, uploaded private
 * and served by `/api/media/<id>` after the same membership check every other
 * upload in the product takes; the record keeps a couple of hundred bytes. A
 * document with no file is legitimate — a pack listed before it arrives, or a
 * transmittal recorded from an email.
 *
 * `supersededById` IS WHAT MAKES THIS A REGISTER RATHER THAN A FOLDER. A
 * reissued document does not overwrite the one before it: the old revision is
 * marked as replaced and stays, because "what did we price against" has to be
 * answerable after the fact. The rules live in ./documents, pure, so the screen
 * refuses exactly what the server does.
 */
export const TenderDocumentSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  tenderId: z.string().max(60),
  /** `received` | `addendum` | `submitted` — the role, never the trade. */
  kind: z.string().max(20),
  title: z.string().max(200),
  /** The issuer's own document number, where the pack carries one. */
  reference: z.string().max(80),
  revision: z.string().max(40),
  /** The date the issuer put on it, as typed. NOT the clock staleness uses. */
  issuedOn: z.string().max(10),
  /** The media record's URL. Empty when the document is recorded without a file. */
  url: z.string().max(500),
  filename: z.string().max(200),
  /** Bytes, as the upload reported them — shown, never trusted for a limit. */
  size: z.number(),
  notes: z.string().max(2000),
  /** The document that replaced this one. Empty means this is the current one. */
  supersededById: z.string().max(60),
  supersededAt: z.string().max(40),
  uploadedByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * A QUESTION PUT TO THE ISSUER, AND WHAT CAME BACK.
 *
 * ITS OWN RECORD RATHER THAN A NOTE ON THE TENDER, because the unanswered ones
 * are the point. A studio that submits with three questions outstanding has
 * priced three assumptions, and a register that only kept the answers could
 * never say so.
 *
 * `affectsPrice` IS THE ESTIMATOR'S JUDGEMENT, not a derivation. Whether an
 * answer moves the bid is a reading of the answer; nothing here can compute it,
 * and pretending otherwise would be worse than asking.
 */
export const TenderClarificationSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  tenderId: z.string().max(60),
  /** Per tender, from the count — a display order, never a stored reference. */
  seq: z.number(),
  question: z.string().max(4000),
  askedOn: z.string().max(10),
  askedByCollaboratorId: z.string(),
  answer: z.string().max(4000),
  /** Set the moment an answer is recorded. Empty means still outstanding. */
  answeredAt: z.string().max(40),
  answeredByCollaboratorId: z.string(),
  affectsPrice: z.boolean(),
  /** The addendum that carried the answer, when one did. */
  documentId: z.string().max(60),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TenderDocument = z.infer<typeof TenderDocumentSchema>;
export type TenderClarification = z.infer<typeof TenderClarificationSchema>;
