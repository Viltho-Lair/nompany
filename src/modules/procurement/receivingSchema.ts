// WHAT A GOODS RECEIVED NOTE STORES.
//
// IT LIVES UNDER `inventory-sheets`, BESIDE THE ORDERS IT ANSWERS, and not
// under the Procurement section whose screen reads it. The same argument the
// requisition slice made about purchase orders: a sub-section falls back to its
// root, so rows written before a move stay under the section they were written
// to, where nothing reads them — not deleted, not corrupted, invisible. A
// receipt is written by `receiveOrder`, which is Inventory's, so it is written
// where Inventory already writes.
//
// NOTHING ABOUT THE MATCH IS STORED. Whether an order's three legs agree is
// computed on every read by ./receivingModel, because a stored verdict goes
// stale the moment a credit note lands.
import { z } from "zod";

export const ReceiptLineSchema = z.object({
  itemId: z.string().max(60),
  /** Accepted into stock. Negative only on a correction. */
  qty: z.number(),
  /**
   * TURNED AWAY AT THE GATE — damaged, wrong item, short-dated. Recorded on the
   * receipt and never added to stock, because something rejected was never
   * accepted: an invoice covering it is over-billing, and a match that counted
   * it would report the paperwork as fine.
   */
  rejected: z.number(),
  note: z.string().max(400),
});

export const GoodsReceiptSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** GRN-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  orderId: z.string().max(60),
  /** The supplier's own delivery-note number, so the two can be reconciled. */
  supplierRef: z.string().max(120),
  /**
   * THE DAY THE GOODS ARRIVED, which is not the day somebody typed this in.
   * A note entered on Monday for a Friday delivery is ordinary, and dating it
   * Monday would misreport every supplier's punctuality.
   */
  receivedAt: z.string(),
  receivedByCollaboratorId: z.string().max(60),
  lines: z.array(ReceiptLineSchema),
  notes: z.string().max(2000),
  /**
   * THE RECEIPT THIS ONE WALKS BACK, where it is a correction. Its quantities
   * are negative, and it must name what it corrects — a bare negative line is
   * indistinguishable from a typo, and being unable to walk a running total
   * back is the gap this whole record was added to close.
   */
  correctionOf: z.string().max(60).optional(),
  createdAt: z.string(),
});

export type ReceiptLine = z.infer<typeof ReceiptLineSchema>;
export type GoodsReceipt = z.infer<typeof GoodsReceiptSchema>;
