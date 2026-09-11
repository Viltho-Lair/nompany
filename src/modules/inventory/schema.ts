// WHAT INVENTORY STORES, as a schema rather than a description.
//
// Transcribed from the coercion that already writes it, and not parsing
// anything yet — see modules/tasks/schema.ts.

import { z } from "zod";

/** A supplier, and the kinds of thing they supply. */
export const VendorSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  name: z.string().max(160),
  contactName: z.string().max(120),
  email: z.string().max(160),
  phone: z.string().max(40),
  notes: z.string().max(1000),
  // What the vendor supplies, and how long each kind takes to arrive. `weeks`
  // is "" when nobody said — a blank lead time and a lead time of zero are
  // different answers, which is why it is not a plain number. (This said
  // `z.array(z.string())` and had done since the field was added; nothing
  // parses this schema, so the lie type-checked. cleanItemTypes has always
  // produced the shape below.)
  itemTypes: z.array(z.object({ type: z.string().max(80), weeks: z.union([z.number(), z.literal("")]) })),
  createdAt: z.string(),

  // ---- qualification, added by Procurement's supplier register -------------
  // DECLARED HERE, ON THE RECORD, rather than in a second supplier shape of
  // Procurement's own. A vendor and a supplier are the same row — the one a
  // purchase order names — and two schemas over it would be two answers to what
  // a supplier is. The rules that read these live in
  // modules/procurement/supplierModel; only the DECISION is stored.
  /** Unassessed / Approved / Suspended / Rejected. Absent reads as Unassessed. */
  approvalStatus: z.string().max(20).optional(),
  /** Why they were suspended or rejected. Required for either — see `assessmentProblem`. */
  approvalReason: z.string().max(1000).optional(),
  approvedAt: z.string().optional(),
  approvedByCollaboratorId: z.string().max(60).optional(),
  /**
   * Trade licence, insurance, ISO certificates. ON the record and not a
   * collection: a handful per supplier that stop arriving, the way an order
   * carries its chases. A blank `expiresAt` does not expire, deliberately —
   * see `documentState`.
   */
  documents: z.array(z.object({
    kind: z.string().max(80),
    reference: z.string().max(120),
    issuedAt: z.string(),
    expiresAt: z.string(),
    mediaId: z.string().max(120),
  })).optional(),
});

/**
 * A REGISTERED ITEM — the catalogue entry, not a quantity. How many there are
 * is the movement ledger's answer, never a field here, which is why nothing on
 * this record can be edited into a stock level.
 *
 * `scope` is which of the STUDIO's own service actions this item needs once it
 * lands — chosen from `studio.serviceActions`, not a fixed pair. A studio with
 * no service actions defined has no scope to choose from, and an item saved
 * before this field existed simply reads as an empty scope until re-saved: it
 * is not migrated, because there is nothing correct to migrate a bare boolean
 * into once the vocabulary is studio-defined.
 */
export const ItemSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  sku: z.string(),
  name: z.string().max(200),
  modelNumber: z.string().max(80),
  unit: z.string(),
  vendorId: z.string().max(60),
  itemType: z.string().max(80),
  deliveryWeeks: z.number(),
  scope: z.array(z.string()).optional(),
  createdAt: z.string().optional(),

  // ---- added by an edit or a costing, never by the create ------------------
  /** Individual unit identifiers, entered as they arrive. */
  serials: z.array(z.string()).optional(),
  /** The level at which the stock screen starts warning. */
  reorderLevel: z.number().optional(),
  currency: z.string().optional(),
  shippingCharges: z.number().optional(),
  customsCharges: z.number().optional(),

  // ---- what it costs, and what it sells for --------------------------------
  /**
   * WHAT THE STUDIO PAID. Declared here at last: `createItem` has written it
   * and `stockValue` and `landedUnitCost` have read it from the beginning, and
   * it was never on this schema — so `Item` did not have the field, and every
   * reader declared its own inline shape to get at it. The same undeclared
   * shape as `notes` and `image` below.
   */
  unitCost: z.number().optional(),
  /**
   * WHAT THE STUDIO SELLS IT FOR, and the field whose absence meant a studio
   * quoted its work at cost.
   *
   * `catalogueItems` copied landed COST onto a quotation line and said so in a
   * comment: "unitCost is the only price Registered Items holds — if the studio
   * needs to quote above cost, that margin belongs on the item." It does now.
   * Blank rather than zero when unset: an item nobody has priced is not an item
   * priced at nothing (shared/pricing.ts, `basis: "none"`).
   */
  sellPrice: z.number().optional(),
  /** Free text on the item. Written by editItem, never declared until now. */
  notes: z.string().max(1000).optional(),
  /** A stored data URI. Read by the quotation builder, never declared until now. */
  image: z.string().optional(),
});

/**
 * ONE MOVEMENT, APPENDED AND NEVER EDITED. Stock is the sum of these rather
 * than a number somebody keeps — a level that can be typed is a level that can
 * disagree with what actually happened.
 *
 * `sourceType`/`sourceId` say WHY: a receipt against a purchase order, a
 * delivery note, or a hand adjustment with a reason.
 */
export const MovementSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  itemId: z.string(),
  kind: z.string(),
  qty: z.number(),
  reason: z.string().max(300),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  /**
   * WHAT A UNIT COST WHEN IT MOVED — written only where a movement is charged
   * to something: a part issued to a Maintenance work order, at the item's
   * recorded cost that day, and a part returned, at what it was issued at. So a
   * repricing later re-prices nothing already used. Absent everywhere else;
   * valuation still reads its costs from receipts, not from here.
   */
  unitCost: z.number().optional(),
  byCollaboratorId: z.string(),
  at: z.string(),
});

/** A line on an order or a delivery note. */
export const OrderLineSchema = z.looseObject({
  // NONE OF THESE ARE OPTIONAL. `cleanLines` is the only thing that writes an
  // order or delivery line, it writes all four on every one, and it drops any
  // line without a known item or a positive quantity — so a stored line always
  // has them. They were optional here, which made every consumer defend against
  // a shape the writer cannot produce.
  itemId: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  /** How much of this line has actually arrived. Written by a receipt, never typed. */
  received: z.number(),
});

/** A purchase order. `reference` comes from the counter, never from a count. */
export const OrderSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  vendorId: z.string().max(60),
  projectId: z.string().max(60),
  /**
   * WHICH PART OF THE PROJECT'S BUDGET THIS COMMITMENT BELONGS TO.
   *
   * The half a spend report cannot see: money the studio has promised a
   * supplier and has not yet been asked for. Without it there was no committed
   * column and therefore no forecast — a projection from invoices alone reads
   * as complete while ignoring every order already placed.
   *
   * OPTIONAL, and an uncoded order is not an error: `projectCosting` reports it
   * as `uncommitted` rather than dropping it. A BILL ANSWERING THIS ORDER
   * INHERITS THIS CODE when it carries none of its own, so coding the order
   * once carries through to every invoice against it.
   */
  costCodeId: z.string().max(60).optional(),
  /**
   * THE REQUISITION THIS ORDER ANSWERS, when it answers one.
   *
   * OPTIONAL, and blank is the common case: every order raised before
   * Procurement existed has none, and buying stock for the shelf never needed a
   * request. What it buys is the other direction — Procurement derives whether
   * a requisition has been ordered from THIS field rather than writing a flag
   * back onto the request, so deleting the order frees the request again. Same
   * rule, same reason, as one-project-per-tender.
   */
  requisitionId: z.string().max(60).optional(),
  /**
   * THE PROMISE IN FORCE NOW, where the supplier has moved it.
   *
   * `expectedAt` above is what was promised when the order was PLACED and is
   * never written again. Overwriting it when a supplier re-promises would erase
   * the fact that they slipped, and that fact is the entire input to supplier
   * rating — a supplier who has re-promised four times would become
   * indistinguishable from one who was always on time.
   *
   * Blank means the promise has not moved, which is not the same as a slip of
   * zero days.
   */
  promisedAt: z.string().optional(),
  /**
   * EVERY TIME SOMEBODY CHASED, appended and never rewritten.
   *
   * A small bounded array on the record rather than a collection of its own —
   * the shape a bill's `approvals` takes, and for the same reason: it is only
   * ever read with the order it belongs to, and it is bounded by how many times
   * a human being picks up a telephone.
   */
  chases: z.array(z.object({
    at: z.string(),
    byCollaboratorId: z.string(),
    note: z.string().max(1000),
    /** What they promised this time, if anything. Blank when they did not say. */
    promisedAt: z.string(),
  })).optional(),
  lines: z.array(OrderLineSchema),
  status: z.string(),
  expectedAt: z.string(),
  notes: z.string().max(2000),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  /** Stamped when the goods actually arrive, which is what moves the stock. */
  receivedAt: z.string().optional(),
});

/**
 * A DELIVERY NOTE. Same shape as an order minus the vendor and the date —
 * `issuedByCollaboratorId` is the difference: somebody handed the goods over,
 * and the note records who.
 */
export const DeliverySchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  projectId: z.string().max(60),
  lines: z.array(OrderLineSchema),
  status: z.string(),
  notes: z.string().max(2000),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  /** Who handed the goods over. Stamped when the note is issued. */
  issuedByCollaboratorId: z.string().optional(),
});

/**
 * A PROJECT SHEET — inventory's own columns against a quotation's rows.
 *
 * `lines` is keyed by quotation line id and holds only what INVENTORY writes:
 * serials, material status, quantity ordered. Projects' columns on the same row
 * are a different record answering to projects.list.edit, which is why this one
 * is open per line rather than a fixed shape.
 */
export const SheetSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  projectId: z.string(),
  quotationId: z.string(),
  rfqId: z.string(),
  ticketId: z.string(),
  kind: z.string(),
  lines: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

/**
 * AN AIRLINE, for air waybill tracking. `prefix` is the three-digit code every
 * waybill starts with, and is how a shipment finds its carrier.
 *
 * `trackUrlTemplate` is the carrier's own tracking page with {AWB}, {PREFIX}
 * and {SERIAL} placeholders — published by the airline rather than guessed,
 * which is why a carrier without one simply gets no link.
 */
export const AirlineSchema = z.looseObject({
  id: z.string(),
  name: z.string().optional(),
  iata: z.string().optional(),
  prefix: z.string().optional(),
  trackUrlTemplate: z.string().optional(),
});

/**
 * ONE MILESTONE ON A WAYBILL, appended and never replaced. Two people logging
 * an event at once must not overwrite each other, and who recorded it comes
 * from the session rather than the payload.
 */
export const AwbMovementSchema = z.object({
  id: z.string(),
  code: z.string().max(8),
  /** An event carrying no time is being logged as it happens. */
  at: z.string().max(40),
  station: z.string().max(8),
  flightNo: z.string().max(16),
  note: z.string().max(300),
  byCollaboratorId: z.string(),
});

/** One tracked shipment. `prefix` is the airline's, and is how one is found. */
export const ShipmentSchema = z.looseObject({
  id: z.string(),
  studioId: z.string().optional(),
  sectionId: z.string().optional(),
  awb: z.string().optional(),
  prefix: z.string().optional(),
  status: z.string().optional(),
  movements: z.array(AwbMovementSchema).optional(),
  createdAt: z.string().optional(),
});

export type Vendor = z.infer<typeof VendorSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Movement = z.infer<typeof MovementSchema>;
export type OrderLine = z.infer<typeof OrderLineSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Delivery = z.infer<typeof DeliverySchema>;
export type Sheet = z.infer<typeof SheetSchema>;
export type Airline = z.infer<typeof AirlineSchema>;
export type AwbMovement = z.infer<typeof AwbMovementSchema>;
export type Shipment = z.infer<typeof ShipmentSchema>;
