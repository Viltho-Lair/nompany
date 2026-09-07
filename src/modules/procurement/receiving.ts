// RECEIVING — the goods received register and the three-way match.
//
// GUARDED BY `procurement.receiving`, VIEW ALONE — the same shape as the
// pipeline board. Booking goods in moves stock and answers to
// `inventory.stock.edit` at the one door that does; a create verb here would
// be a right nothing exercises. And a receipt is never edited or deleted at
// all: it records what turned up on a day, and a mistake is walked back by a
// CORRECTION, which is another receipt.
//
// THE WRITE IS NOT HERE. `receiveOrder` in modules/inventory is the one door
// that moves stock, updates the order and writes the note, and this file
// deliberately does not grow a second one — the same argument `createOrder`
// makes about a second create path being a second place the engagement attach
// can be forgotten. This module READS.
//
// THE INVOICE LEG IS GATED SEPARATELY. A storekeeper booking in a pallet has no
// business seeing what the supplier charged for it, so `billedValue` and the
// variance are computed only for a reader who also holds `finance.payables.
// view` — and where they may not see it, the bills are NEVER READ, so the block
// costs no round trip either. The same shape as customer 360.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { threeWayMatch } from "./receivingModel";
import type { GoodsReceipt } from "./receivingSchema";
import type { ProcurementContext } from "./types";
import type { Order, Vendor, Item } from "@/modules/inventory/schema";
import type { Bill } from "@/modules/finance/schema";

const Receipts = repo<GoodsReceipt>("goodsReceipts");
const Orders = repo<Order>("materialOrders");
const Bills = repo<Bill>("bills");
const Vendors = repo<Vendor>("inventoryVendors");
const Items = repo<Item>("inventoryItems");

/** An order nobody is waiting on and nobody will receive against. */
const NOT_RECEIVABLE = new Set(["Draft", "Cancelled"]);

export async function listReceiving(ctx: ProcurementContext) {
  const denied = requirePermission(ctx.access, "procurement.receiving.view");
  if (denied) return denied;

  const { studio, ordersSection, suppliersSection, billsSection, itemsSection } = ctx;

  // WHETHER THE THIRD LEG IS EVEN FETCHED depends on the reader. A block
  // somebody may not see is not read, so it costs nothing — and a figure
  // derived from records they cannot open would leak exactly what the gate is
  // for.
  const canSeeBills = !requirePermission(ctx.access, "finance.payables.view");

  const [orders, receipts, bills, vendors, people, items] = await Promise.all([
    ordersSection ? Orders.find({ studio, section: ordersSection }) : Promise.resolve([]),
    ordersSection ? Receipts.find({ studio, section: ordersSection }) : Promise.resolve([]),
    canSeeBills && billsSection
      ? Bills.find({ studio, section: billsSection })
      : Promise.resolve([] as Bill[]),
    Vendors.find({ studio, section: suppliersSection }),
    listCollaborators(studio.id),
    // THE ITEM NAMES. An order line stores an `itemId` and nothing else — the
    // name lives on the Registered Item — so without this the booking-in dialog
    // asks somebody to count `inv_mtqkn9g6y2ehhq`. A raw id where a name belongs
    // is the same defect this codebase has already fixed once, on a
    // collaborator id in the requisitions register.
    itemsSection ? Items.find({ studio, section: itemsSection }) : Promise.resolve([] as Item[]),
  ]);

  const aliasOf = new Map(
    (people as { id?: unknown; alias?: unknown }[])
      .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const),
  );
  const vendorName = new Map(vendors.map((v) => [v.id, v.name] as const));
  const itemName = new Map(items.map((i) => [i.id, i.name] as const));

  const receivable = orders.filter((o) => !NOT_RECEIVABLE.has(String(o.status || "")));

  const rows = receivable
    .map((o) => {
      const match = threeWayMatch(o, receipts, bills);
      // NAMED HERE RATHER THAN IN THE MODEL, which is pure and knows nothing
      // about a Registered Item. `description` is what the model already
      // carries per line, so filling it costs the screen no second lookup.
      match.lines = match.lines.map((l) => ({
        ...l,
        description: l.description || itemName.get(l.itemId) || l.itemId,
      }));
      return {
        id: o.id,
        reference: o.reference,
        vendorId: o.vendorId,
        vendorName: vendorName.get(o.vendorId) || "",
        projectId: o.projectId || "",
        status: o.status,
        expectedAt: o.expectedAt || "",
        match: canSeeBills ? match : {
          ...match,
          // NULLED RATHER THAN OMITTED, so the screen reads one shape and shows
          // the column as withheld instead of as "nothing invoiced" — which is
          // a fact, and a different one.
          billedValue: null,
          variance: null,
          billCount: 0,
          matched: false,
          flags: match.flags.filter((f) => f !== "over-billed" && f !== "billed-not-received"),
        },
        receipts: receipts
          .filter((r) => r.orderId === o.id)
          .sort((a, b) => String(b.receivedAt || "").localeCompare(String(a.receivedAt || "")))
          .map((r) => ({
            ...r,
            receivedByAlias: aliasOf.get(String(r.receivedByCollaboratorId || "")) || "",
          })),
      };
    })
    // WHAT NEEDS LOOKING AT FIRST. An order whose legs disagree is the only row
    // anybody has to act on, and a register in reference order buries it.
    .sort((a, b) => {
      const rank = (n: number) => (n > 0 ? 0 : 1);
      const d = rank(a.match.flags.length) - rank(b.match.flags.length);
      return d || String(b.reference || "").localeCompare(String(a.reference || ""));
    });

  return {
    orders: rows,
    // WHEN THIS ANSWER WAS TRUE, travelling with it as everywhere else.
    asOf: new Date().toISOString(),
    canSeeBills,
    // WHETHER THIS READER MAY BOOK GOODS IN, asked of the right that actually
    // moves stock rather than of a verb minted here to mirror it.
    canReceive: !requirePermission(ctx.access, "inventory.stock.edit"),
    // The number the screen exists to make small.
    needsAttention: rows.filter((r) => r.match.flags.some(
      (f) => f === "over-billed" || f === "billed-not-received" || f === "over-received")).length,
  };
}
