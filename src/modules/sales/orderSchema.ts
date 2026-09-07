// A SALES ORDER — what the customer actually asked for, on a date.
//
// The status rules are in ./orderStatus, which is pure and shared with the
// screen. This file is the record's shape and the reasoning behind each field.
import { z } from "zod";
import { ORDER_STATUSES } from "./orderStatus";

/**
 * ONE LINE. The SAME three fields a quotation line has, deliberately: an order
 * raised from a quotation copies its lines across, and a second shape would
 * mean a conversion that can lose or invent a field. `computeTotals` in
 * `modules/technical` reads exactly this and is what both records total with,
 * so an order and the quotation it came from cannot disagree about arithmetic.
 */
export const OrderLineSchema = z.object({
  description: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
});

export const SalesOrderSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),

  /** SO-0001. Minted once and never reissued, even if the order is cancelled. */
  number: z.string(),
  title: z.string().max(200),

  /**
   * THE DEAL THIS BELONGS TO. Required, exactly as a contract's is: an order to
   * nobody is not an order, and every reader of an engagement expects its
   * commitments to be on it.
   */
  dealId: z.string(),

  /**
   * WHERE IT CAME FROM, and both are optional because there are three real
   * origins and only one of them has both.
   *
   *   - from a quotation the customer accepted — `quotationId` set;
   *   - a CALL-OFF against a framework contract, where there is no new
   *     quotation at all — `contractId` set, and this is the case the product
   *     could not record before;
   *   - straight from the customer, with neither.
   *
   * Neither is derived from the other. A call-off under a contract that was
   * itself won from a quotation must not claim that quotation as its origin —
   * it would attribute one order's lines to an offer about something else.
   */
  quotationId: z.string(),
  contractId: z.string(),

  clientId: z.string(),

  status: z.enum(ORDER_STATUSES),
  lines: z.array(OrderLineSchema),

  /**
   * STORED, NOT DERIVED ON READ — the same choice a quotation makes. What a
   * customer was told the order came to is a fact about the day they were told
   * it; recomputing on every read would silently re-price a confirmed order the
   * day a VAT rate changes. `lines` and these move together, in one write.
   */
  currency: z.string().max(8),
  vatRate: z.number(),
  subtotal: z.number(),
  vat: z.number(),
  total: z.number(),

  /** The day the customer placed it, which is theirs and not the studio's. */
  orderedOn: z.string(),
  /** When they need it. Blank is a real answer — plenty of orders have no date. */
  requiredBy: z.string(),

  notes: z.string().max(4000),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OrderLine = z.infer<typeof OrderLineSchema>;
export type SalesOrder = z.infer<typeof SalesOrderSchema>;
