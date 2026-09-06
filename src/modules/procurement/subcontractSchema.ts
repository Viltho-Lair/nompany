// WHAT A SUBCONTRACT AND ITS PAYMENT CERTIFICATES STORE.
//
// Two collections. A certificate is a periodic document with its own number,
// its own status and its own back-charges; nesting them on the subcontract
// would make writing one period a write to the record every other period is
// also being valued against, and the migration design already names nested
// arrays that grow with time as the shape to avoid.
//
// Its rules live in ./subcontractModel, which reuses `retentionOn` from
// modules/projects/billing rather than restating what a percentage means.
import { z } from "zod";

export const SubcontractSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** SC-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  title: z.string().max(200),
  /** The trade package: groundworks, M&E, drylining. */
  scope: z.string().max(4000),
  /** Who is doing it. A vendor id, on the same terms an order names one. */
  vendorId: z.string().max(60),
  /** The project it is on. A subcontract with no project is a studio-level agreement. */
  projectId: z.string().max(60),
  /**
   * Which part of the project's budget it belongs to, so a certified valuation
   * lands in the right place without anybody coding each certificate.
   */
  costCodeId: z.string().max(60).optional(),
  /** The agreed value of the package. */
  value: z.number(),
  /**
   * RETENTION — the percentage withheld from every valuation, and the date the
   * last of it becomes payable.
   *
   * The same two fields a project carries for the CLIENT side, holding the same
   * meanings, read by the same `retentionOn`. What differs is only who is
   * holding whose money.
   */
  retentionPercent: z.number(),
  retentionReleaseDate: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  notes: z.string().max(2000),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const BackChargeSchema = z.object({
  /** What is being deducted and why. A deduction nobody can answer is not one. */
  description: z.string().max(400),
  amount: z.number(),
});

export const PaymentCertificateSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  subcontractId: z.string().max(60),
  /** The studio's own sequence for this subcontract: 1, 2, 3. */
  number: z.string().max(40),
  periodEnd: z.string(),
  /**
   * WORK VALUED TO DATE, CUMULATIVE — never the amount for this period.
   *
   * Storing the increment would let a mistake in one period ride through every
   * later one, because nothing would ever restate the total. Cumulative is
   * self-correcting: get period three wrong and period four puts it right, and
   * `thisPeriod` is derived rather than stored so the two can never disagree.
   */
  cumulativeValue: z.number(),
  backCharges: z.array(BackChargeSchema),
  status: z.string(),
  notes: z.string().max(2000),
  certifiedByCollaboratorId: z.string().optional(),
  certifiedAt: z.string().optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Subcontract = z.infer<typeof SubcontractSchema>;
export type BackCharge = z.infer<typeof BackChargeSchema>;
export type PaymentCertificate = z.infer<typeof PaymentCertificateSchema>;
