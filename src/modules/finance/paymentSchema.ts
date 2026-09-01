// WHAT A PAYMENT STORES — money that actually moved.
//
// Blueprint §2.4: "Receipts against invoices and payments against bills.
// `direction` field. Money that moved survives its deal."
//
// IT IS THE ONE STAGE THAT SEPARATES TWO PROPERTIES THE OTHERS CONFLATE. Every
// other `onDelete: "keep"` type — task, expense, bill, asset — is also
// `unassignable`: it can be created with no deal, so its survival follows from
// never having belonged to one. A payment is the opposite. It cannot be created
// without a deal (it settles THIS deal's invoice) and it still survives one,
// because deleting a deal must not delete the record that money changed hands.
// That is Law 6, and it is why the registry entry is `keep` while
// `unassignable` is false.
//
// AN ISSUED PAYMENT NEVER MUTATES. There is deliberately no update function in
// ./payments — see the header there. A correction is a REVERSAL: a new,
// opposing record naming the one it undoes. Both stand afterwards, which is the
// only arrangement in which "what did we actually receive in March" has an
// answer that does not depend on when you asked.
//
// NAMED `PaymentRecord`, NOT `Payment`, and the name is doing work. Finance
// already exports a `Payment` from ./schema: the line inside an invoice's
// `payments[]` array, written by `recordPayment`. That one is a nested entry on
// somebody else's document; this is a row of its own in the `payments`
// collection, with a deal, a direction and an identity. Two different things
// with one name in one module is how a later reader imports the wrong one.
import { z } from "zod";

/**
 * WHICH WAY THE MONEY WENT — from the STUDIO's point of view, always.
 *
 *   in   a receipt: a client settled an invoice
 *   out  a disbursement: the studio paid a supplier's bill
 *
 * Stated from one point of view on purpose. "Payment" is ambiguous the moment
 * two parties are in the room, and a sign convention that flips depending on
 * whose screen you are reading is how a cash report comes out backwards.
 */
export const PAYMENT_DIRECTIONS = ["in", "out"] as const;

export const PaymentRecordSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),

  /** Blank until issued, exactly as a contract's number is. */
  reference: z.string(),

  /**
   * THE DEAL THIS SETTLES. Not optional: a payment settles this deal's invoice
   * or bill, which is why `payment` is absent from the unassigned pen's list of
   * types even though it survives its deal's deletion.
   */
  dealId: z.string(),

  direction: z.enum(PAYMENT_DIRECTIONS),

  /**
   * HOW MUCH MOVED. ALWAYS POSITIVE — the direction carries the sign, and a
   * negative amount would be a second way of saying the same thing, free to
   * disagree with the first. A reversal is not a negative receipt; it is a
   * disbursement (see `reversalOfPaymentId`).
   *
   * NUMERIC in the store's terms and never a float at rest: money is
   * `NUMERIC(19,4)` when it reaches a column of its own.
   */
  amount: z.number(),
  currency: z.string().max(8),

  /**
   * THE VALUE DATE — when the money moved in the world, which is not when the
   * row was written. `createdAt` records the second; a bank transfer entered on
   * Monday for a Friday value date is the ordinary case, not an edge one.
   */
  date: z.string(),
  method: z.string().max(60),

  /**
   * WHAT IT SETTLES, and both may be empty. A receipt names an invoice, a
   * disbursement names a bill, and an on-account payment — money received
   * before anybody raised the invoice for it — names neither. Two explicit
   * fields rather than one `settlesId` plus a type discriminator, because the
   * discriminator would be a third thing able to disagree with `direction`.
   */
  invoiceId: z.string(),
  billId: z.string(),

  /**
   * THE COUNTERPARTY — a REF to the client or supplier record, never a name
   * (Law 4). It is stored here rather than read off the deal because on an
   * OUTBOUND payment the payee is a supplier, and a supplier is not one of the
   * deal's nine shared facts: the deal knows its client, and nothing about it
   * knows who the studio paid.
   */
  partyId: z.string(),

  /**
   * THE REVERSAL PAIR. `reversalOfPaymentId` is set on the correcting record;
   * `reversedByPaymentId` is stamped back on the original so it cannot be
   * reversed twice. The stamp is the only write either row ever takes after
   * creation, and it records a LATER EVENT about this payment rather than
   * revising what this payment says — which is why "never mutates" and this
   * field are not in conflict.
   */
  reversalOfPaymentId: z.string(),
  reversedByPaymentId: z.string(),

  note: z.string().max(500),

  /** Who entered it — a CollaboratorID, never a UserID (invariant 6). */
  recordedByCollaboratorId: z.string(),
  createdAt: z.string(),

  // NO `updatedAt`, deliberately. Nothing about a payment is ever revised, so a
  // "last modified" would only ever hold the time somebody reversed it — which
  // `reversedByPaymentId` already says, and says better.
});

export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;
