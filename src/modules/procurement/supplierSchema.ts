// WHAT A SUPPLIER'S ASSESSMENT AND ITS SCORECARDS STORE.
//
// THE SUPPLIER RECORD ITSELF IS NOT HERE. It is `VendorSchema` in
// modules/inventory/schema, has been since before Procurement was a section,
// and is the same row a purchase order names — so the fields this slice adds
// are declared THERE, on the record they belong to, rather than shadowed by a
// second supplier shape that would immediately be free to disagree about who a
// supplier is. What is here is the scorecard, which is a document of its own.
//
// ONLY WHAT A PERSON DECIDED IS STORED. Whether a supplier may be used TODAY is
// never written down: it is derived at `asOf` by `supplierQualification`,
// because a trade licence expires on its own and no business event fires when
// it does. See ./supplierModel.
import { z } from "zod";

/**
 * A PERIODIC OPINION, as opposed to a fact the orders already record.
 *
 * Its own collection rather than an array on the supplier: one lands every
 * period for as long as the studio buys from them, which is the shape the
 * migration design names as the one never to nest.
 */
export const SupplierScorecardSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  vendorId: z.string().max(60),
  /** The period being scored, not the day somebody typed it. */
  periodEnd: z.string(),
  /**
   * 1-5 each, or "" where nobody scored that axis — a blank and a one are
   * different answers, which is why these are not plain numbers defaulting to
   * nought. `supplierScores` averages only the axes that were actually scored.
   */
  workmanship: z.union([z.number(), z.literal("")]),
  hse: z.union([z.number(), z.literal("")]),
  responsiveness: z.union([z.number(), z.literal("")]),
  note: z.string().max(2000),
  /** Which job it is about, where it is about one. */
  projectId: z.string().max(60).optional(),
  byCollaboratorId: z.string().max(60),
  createdAt: z.string(),
});

export type SupplierScorecard = z.infer<typeof SupplierScorecardSchema>;
