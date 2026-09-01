// WHAT A CONTRACT STORES — the binding promise, and the deal's value baseline.
//
// Blueprint §2.4: "The binding promise: signed contract, confirmed sales order,
// engagement letter, AMC. Carries fee basis and, in G, the visit schedule. Its
// value is the deal's contract value."
//
// ONE PER DEAL, and that is the whole reason this type exists separately from a
// quotation. A quotation is an OFFER and there may be many — versions, revisions,
// one per bidder. A contract is what was agreed, and a second one is not a
// revision of the first: it is a different deal, or a `change_order` against
// this one. The registry pins that cardinality and attachRecord enforces it.
//
// IT HEADS A DEAL IN B, C AND G, and cannot in A. In contracting, a contract is
// what a won quotation produces; in manufacturing, trading and recurring work it
// IS the starting point — a confirmed sales order or an AMC arrives without
// anyone having raised a ticket. Same record, different position in the flow,
// which is exactly what templates are for.
import { z } from "zod";

/**
 * HOW THE MONEY IS AGREED. The word is the contract's, not a calculation:
 * these change what a progress claim MEANS, and getting the basis wrong is how
 * an invoice argues with a contract months later.
 *
 *   lump-sum      one price for the whole scope
 *   remeasured    priced per unit, quantities measured as built (BOQ contracts)
 *   cost-plus     actual cost plus an agreed margin
 *   rate          an agreed rate card, billed as consumed
 *   retainer      a fixed periodic fee (Template G's usual shape)
 */
export const FEE_BASES = ["lump-sum", "remeasured", "cost-plus", "rate", "retainer"] as const;

export const ContractSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),

  /**
   * The reference a person quotes on the phone. Blank until issued, exactly as
   * a project's number is — a contract drafted before Finance assigns one is a
   * normal state rather than a missing value, and inventing a placeholder would
   * make it indistinguishable from a real reference.
   */
  number: z.string(),
  title: z.string().max(200),

  /**
   * THE DEAL THIS BINDS. Not optional and not derived: a contract with no deal
   * is a contract to nothing, which is why `contract` is not in the unassigned
   * pen's list of types.
   */
  dealId: z.string(),

  /**
   * The quotation it was won from, when there was one. Empty in B, C and G,
   * where the contract heads the deal and no offer preceded it — which is a
   * real state, not a gap.
   */
  quotationId: z.string(),

  /**
   * A POINTER, NEVER A COPY (Law 4). The client's NAME lives on the deal's
   * shared context; this names the party record. `clientName` is deliberately
   * absent here — a second copy is what drifts.
   */
  clientId: z.string(),

  /**
   * THE DEAL'S CONTRACT VALUE. NUMERIC in the store's terms and never a float
   * at rest: money is `NUMERIC(19,4)` when it reaches a column of its own, and
   * the rule is stated at every money field so it is not relearned per column.
   */
  value: z.number(),
  currency: z.string().max(8),

  feeBasis: z.enum(FEE_BASES),

  signedDate: z.string(),
  startDate: z.string(),
  /** Empty for an open-ended contract — a retainer with no agreed end. */
  endDate: z.string(),

  /**
   * TEMPLATE G'S VISIT SCHEDULE, and empty everywhere else. A recurring
   * contract generates its execution children from a calendar (Law 8), so the
   * cadence belongs to the contract rather than to each job it produces.
   * Stored as a plain string rather than a parsed rule because nothing consumes
   * it yet, and a half-implemented recurrence format is worse than a note.
   */
  visitSchedule: z.string().max(200),

  notes: z.string().max(4000),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Contract = z.infer<typeof ContractSchema>;
