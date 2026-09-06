// WHAT A SUPPLIER RFQ AND ITS QUOTES STORE.
//
// Two collections rather than quotes nested on the request. The migration
// design already names nested line arrays "the arrays that grow without bound",
// and a quote is worse than a line: it is another party's document, arrives at
// its own time, and is written by whoever opens the envelope. A quote that is
// its own row can be recorded, corrected and read without touching the request
// every other supplier is also quoting against.
//
// Its rules live in ./rfqModel, which is pure.
import { z } from "zod";

export const RfqLineSchema = z.object({
  /**
   * STABLE, AND MINTED WHEN THE LINE IS WRITTEN. Every quote references lines
   * by this id, so it cannot be an array index — inserting a line in the middle
   * would silently re-point every price already recorded against it.
   */
  id: z.string().max(40),
  description: z.string().max(400),
  unit: z.string().max(40),
  qty: z.number(),
  /** A Registered Item, when the request names one. Frequently blank. */
  itemId: z.string().max(60),
});

export const RfqSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /**
   * SRQ-0001, and the prefix matters. `engineeringDocs.rfq` is the request
   * coming IN from Sales; this goes OUT to suppliers. Two records both reading
   * "RFQ-0001" in one product is a confusion nobody would forgive.
   */
  reference: z.string(),
  title: z.string().max(200),
  /** The requisition this was raised to price, when there is one. */
  requisitionId: z.string().max(60),
  projectId: z.string().max(60),
  /** Who it went to. Not a foreign-key guarantee — a vendor may be deleted later. */
  vendorIds: z.array(z.string().max(60)),
  lines: z.array(RfqLineSchema),
  status: z.string(),
  /** When quotes are wanted back. */
  dueBy: z.string(),
  notes: z.string().max(2000),

  sentByCollaboratorId: z.string().optional(),
  sentAt: z.string().optional(),

  /**
   * THE DECISION. `awardedQuoteId` names a row in `supplierQuotes`, and the
   * reason is stored beside it because the interesting award is the one that is
   * NOT the cheapest — a studio that chose on lead time or on a relationship
   * has a reason, and six months later the reason is the whole record.
   */
  awardedQuoteId: z.string().max(60).optional(),
  awardedByCollaboratorId: z.string().optional(),
  awardedAt: z.string().optional(),
  awardReason: z.string().max(1000).optional(),

  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const QuoteLineSchema = z.object({
  rfqLineId: z.string().max(40),
  /**
   * WHAT THEY QUOTED, or "" where they did not price the line at all.
   *
   * A UNION RATHER THAN A NUMBER, deliberately: nought is a price and a blank
   * is a silence, and `compareQuotes` ranks on exactly that distinction. A
   * schema that coerced the blank to 0 would make an incomplete quote look like
   * a generous one, which is the defect the whole comparison exists to avoid.
   */
  unitPrice: z.union([z.number(), z.literal("")]),
  leadWeeks: z.union([z.number(), z.literal("")]),
});

export const SupplierQuoteSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  rfqId: z.string().max(60),
  vendorId: z.string().max(60),
  lines: z.array(QuoteLineSchema),
  /** The whole quote's lead time, where the supplier gives one figure. */
  leadWeeks: z.union([z.number(), z.literal("")]),
  /** After this the price is not being held. Blank means they did not say. */
  validUntil: z.string(),
  notes: z.string().max(2000),
  /** When it arrived — not when somebody got round to typing it in. */
  receivedAt: z.string(),
  recordedByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RfqLine = z.infer<typeof RfqLineSchema>;
export type Rfq = z.infer<typeof RfqSchema>;
export type QuoteLine = z.infer<typeof QuoteLineSchema>;
export type SupplierQuote = z.infer<typeof SupplierQuoteSchema>;
