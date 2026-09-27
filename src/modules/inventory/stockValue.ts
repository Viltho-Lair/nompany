// WHAT EACH INBOUND MOVEMENT COST — the join `valuation.ts` cannot make.
//
// The valuation itself is pure and knows nothing about where a cost came from;
// this is the half that reads the store. Kept apart for the reason every pure
// half in this codebase is: the arithmetic that decides what a company's stock
// is worth should be assertable without a database.
//
// THE COST IS ON THE ORDER, NOT THE MOVEMENT. A movement records that stock
// arrived and why (`sourceType: "order"`, `sourceId`), and the purchase order's
// line for that item holds what was paid. So the cost of a receipt is resolved
// by following that link — which is what makes FIFO and weighted average give
// genuinely different answers, because two receipts of the same item against
// two orders really did cost different amounts.
//
// WITHOUT THAT LINK THE TWO METHODS WOULD AGREE ON EVERYTHING. An item carries
// one `unitCost`, so valuing every receipt at it would make the method a
// setting that changed no number — a choice offered and not honoured, which is
// worse than not offering it.

import { repo } from "@/platform/db/repo";
import { valueStock, costLedger, type ValuationMethod } from "./valuation";
import { landedUnitCosts } from "@/modules/logistics/landedCostService";
import type { InventoryContext } from "./types";

const Movements = repo("inventoryStock");
const Orders = repo("materialOrders");
const Items = repo("inventoryItems");

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * VALUE THIS STUDIO'S STOCK.
 *
 * @param method - the studio's chosen policy; the caller resolves it so this
 *   never reads a setting and can be asked for either answer.
 */
export async function stockValuation(ctx: InventoryContext, method: ValuationMethod) {
  const [movements, orders, items] = await Promise.all([
    Movements.find({ studio: ctx.studio, section: ctx.stockSection }),
    // ORDERS LIVE IN ANOTHER SUB-SECTION and are read directly, the way Finance
    // reads a project: valuing stock is not the same act as opening the orders
    // screen, and the link to one stays permission-gated where it is drawn.
    Orders.find({ studio: ctx.studio, section: ctx.sheetsSection }),
    Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
  ]);

  // itemId -> unitPrice, per order. Built once rather than searched per
  // movement: a busy studio has thousands of movements and hundreds of orders,
  // and the naive nested scan is the shape that makes a valuation screen time
  // out on exactly the studios that most need one.
  const costOnOrder = new Map<string, number>();
  for (const o of orders) {
    for (const l of (o.lines || []) as { itemId?: unknown; unitPrice?: unknown }[]) {
      costOnOrder.set(`${o.id}:${String(l?.itemId ?? "")}`, num(l?.unitPrice));
    }
  }

  // THE LANDED COST WINS OVER THE SUPPLIER'S PRICE, where a studio has recorded
  // one. Freight, duty and handling are paid to other people on other invoices
  // and belong to the same goods; valuing stock at the order price alone
  // understates what the company holds — for an importing contractor, routinely
  // by a fifth. `landedUnitCosts` returns the same `orderId:itemId` key this map
  // uses, so the two overlay without either knowing about the other's shape.
  const landed = await landedUnitCosts(
    ctx.studio,
    ctx.sections.find((x) => x.key === "logistics"),
    orders as Record<string, unknown>[],
  );
  const itemCost = new Map(items.map((i) => [String(i.id), num(i.unitCost)]));

  // WHAT EACH MOVEMENT COST is decided by `costLedger` (./valuation, pure), so
  // the precedence — order, then what the movement itself carries, then the
  // item — and the netting of bin and batch moves are asserted without a
  // database (tests/valuation-model.mjs).
  const costed = costLedger(movements, {
    orderCost: (orderId, itemId) => landed.get(`${orderId}:${itemId}`) ?? costOnOrder.get(`${orderId}:${itemId}`),
    itemCost: (itemId) => itemCost.get(itemId),
  });

  const valued = valueStock(costed, method, ctx.studio.currency);

  // THE ITEM'S NAME AND SKU, so the screen does not have to join it back. The
  // valuation itself stays pure and id-only; naming is presentation.
  const byId = new Map(items.map((i) => [String(i.id), i]));
  return {
    ...valued,
    items: valued.items.map((v) => ({
      ...v,
      name: String(byId.get(v.itemId)?.name || ""),
      sku: String(byId.get(v.itemId)?.sku || ""),
    })),
  };
}
