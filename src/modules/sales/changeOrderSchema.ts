// WHAT A CHANGE ORDER STORES — scope moving after signature.
//
// Blueprint §2.4: "Variation order (A), renewal/amendment (G). Adjusts contract
// value/scope/time with its own approval state."
//
// MANY PER DEAL, and that is the difference from the contract it amends. A
// contract is agreed once; a project accumulates variations, each one a separate
// negotiation with its own answer. This is also why an amendment is NOT a second
// contract — a second contract would be a second deal (see contractSchema), so
// everything that moves after signature has to land here.
//
// IT NEVER HEADS A DEAL. A variation with nothing to vary is not a deal opening,
// it is a record with no referent, which is why `change_order` is absent from
// every template's `heads` list and why `contractId` below is required.
import { z } from "zod";

/**
 * THE APPROVAL STATE, and it is the change order's OWN — the blueprint's words.
 * A variation is a claim until somebody with the authority answers it, and the
 * value it carries must not reach a cost report before that happens.
 *
 *   draft      being written; nobody has been asked yet
 *   submitted  put to the client / the approver, awaiting an answer
 *   approved   agreed. Only now does its value adjust the contract's.
 *   rejected   answered no. Kept, never deleted: a refused variation is part of
 *              the record of what was argued about.
 */
export const CHANGE_ORDER_STATUSES = ["draft", "submitted", "approved", "rejected"] as const;

export const ChangeOrderSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),

  /**
   * The reference a person quotes. Blank until issued, exactly as a contract's
   * number is — a variation drafted before anybody assigns one is a normal
   * state, and a placeholder would be indistinguishable from a real reference.
   */
  number: z.string(),

  /**
   * WHAT THIS VARIATION IS, in the variation's own words ("additional ductwork
   * to level 3"). Deliberately NOT contributed to the deal's `title`: the deal
   * is titled for the work as a whole, and overwriting that with the name of one
   * amendment would rename the deal after its smallest part.
   */
  title: z.string().max(200),

  /** THE DEAL THIS VARIES. Not optional: see the header. */
  dealId: z.string(),

  /**
   * THE AGREEMENT BEING AMENDED, and it is stored rather than read off the
   * deal's `contract` singleton slot on purpose. The slot says which contract
   * the deal has NOW; this says which one this variation was raised against.
   * They are the same today because a deal has one contract — and the moment
   * they are not, a variation that resolved its referent from the deal's current
   * state would silently re-target itself, which is the drift Law 4 exists to
   * stop, applied to a pointer rather than to a fact.
   */
  contractId: z.string(),

  /**
   * WHAT THIS DOES TO THE CONTRACT VALUE — SIGNED, because an omission is a
   * variation too and a negative delta is the only honest way to record one.
   * Never an absolute "new value": two variations approved out of order would
   * each claim to know the total, and the later one would erase the earlier.
   *
   * NUMERIC in the store's terms and never a float at rest: money is
   * `NUMERIC(19,4)` when it reaches a column of its own.
   */
  valueDelta: z.number(),
  currency: z.string().max(8),

  /**
   * WHAT THIS DOES TO THE TIME — signed, in days, for the same reason
   * `valueDelta` is. An extension of time is what a variation grants; the
   * contract's end date is what the contract says. Storing the resulting DATE
   * here as well would be two representations of one fact, free to disagree the
   * moment a second variation lands.
   */
  timeDeltaDays: z.number(),

  /** What changes in the work itself, free text — the "scope" of §2.4's triple. */
  scope: z.string().max(4000),

  status: z.enum(CHANGE_ORDER_STATUSES),

  /**
   * WHO ASKED AND WHO ANSWERED — CollaboratorIDs, never UserIDs (invariant 6).
   * Both are recorded because invariant 7 is enforced BETWEEN them: the person
   * who submitted a variation may not be the one who approves it.
   */
  submittedByCollaboratorId: z.string(),
  submittedAt: z.string(),
  approvedByCollaboratorId: z.string(),
  approvedAt: z.string(),

  notes: z.string().max(4000),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChangeOrder = z.infer<typeof ChangeOrderSchema>;
