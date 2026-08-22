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
  itemTypes: z.array(z.string()),
  createdAt: z.string(),
});

/**
 * A REGISTERED ITEM — the catalogue entry, not a quantity. How many there are
 * is the movement ledger's answer, never a field here, which is why nothing on
 * this record can be edited into a stock level.
 *
 * `needsInstallation` and `needsProgramming` are what Sales' per-service opt-out
 * is checked against, so they belong to the item rather than to any one order.
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
  needsInstallation: z.boolean(),
  needsProgramming: z.boolean(),
  createdAt: z.string().optional(),

  // ---- added by an edit or a costing, never by the create ------------------
  /** Individual unit identifiers, entered as they arrive. */
  serials: z.array(z.string()).optional(),
  /** The level at which the stock screen starts warning. */
  reorderLevel: z.number().optional(),
  currency: z.string().optional(),
  shippingCharges: z.number().optional(),
  customsCharges: z.number().optional(),
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
  byCollaboratorId: z.string(),
  at: z.string(),
});

/** A line on an order or a delivery note. */
export const OrderLineSchema = z.looseObject({
  itemId: z.string().optional(),
  qty: z.number().optional(),
  unitPrice: z.number().optional(),
  /** How much of this line has actually arrived. Written by a receipt, never typed. */
  received: z.number().optional(),
});

/** A purchase order. `reference` comes from the counter, never from a count. */
export const OrderSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  vendorId: z.string().max(60),
  projectId: z.string().max(60),
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
