// RECORDING WHAT A SHIPMENT COST TO LAND, and letting stock know.
//
// The arithmetic is `./landedCost`, pure. This file is the doors, and the
// resolver that stock valuation reads: a landed cost that never reaches the
// valuation is a calculator, not a feature.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { moduleContext } from "@/modules/context";
import {
  landedCost, chargeProblem, isBasis, DEFAULT_BASIS,
  type Charge, type CostLine, type Basis,
} from "./landedCost";
import type { Section } from "@/platform/db/sections";
import type { ModuleContext, StudioRef } from "@/modules/context";

const Landed = repo("landedCosts");
const Orders = repo("materialOrders");
// THE REGISTERED ITEMS, READ ONLY, to put a name on a line. `landedCost` itself
// stays id-only and pure — naming is presentation, the same split
// `stockValuation` makes when it decorates a valuation row.
const Items = repo("inventoryItems");

export type LogisticsContext = ModuleContext & {
  /**
   * The Logistics root, under the name this file's readers use. It IS
   * `section` — the factory's own root — and the alias is kept because every
   * function below already reads `logisticsSection`, the same courtesy Projects
   * extends with `projectsList`.
   */
  logisticsSection: Section;
};

/**
 * FROM THE FACTORY, like every other department's.
 *
 * It was hand-rolled, and what it hand-rolled was the factory's own body: read
 * the studio context, find the root section, refuse `no-section` without it. A
 * copy of that is a second place for the resolution to drift — which is the
 * whole reason `moduleContext` exists and why `tests/access.test.mjs` refuses
 * an exported `*Context` function.
 */
export const logisticsContext = moduleContext<LogisticsContext>({
  root: "logistics",
  sub: { logistics: "logistics" },
});

const scope = (ctx: LogisticsContext) => ({ studio: ctx.studio, section: ctx.logisticsSection });

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const money = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * THE ORDER'S LINES, READ DIRECTLY.
 *
 * Purchase orders live under `inventory-sheets` — Logistics needs to COST them,
 * which is not the same act as opening the orders screen, so this is the
 * cross-section read Finance's `ownerOf` already establishes, with the same
 * fallback to the parent for a studio predating the sub-section model.
 */
async function orderFor(ctx: LogisticsContext, orderId: string) {
  const owner = (await getSectionByKey(ctx.studio.id, "inventory-sheets"))
    || (await getSectionByKey(ctx.studio.id, "inventory"));
  if (!owner) return null;
  const orders = await Orders.find({ studio: ctx.studio, section: owner });
  return orders.find((o) => o.id === orderId) || null;
}

/**
 * ITEM ID → ITS NAME AND SKU.
 *
 * A LINE SHOWED A RAW ID TO A HUMAN — `inv_mtyrj1…` in the column headed Lines,
 * which is the id of something nobody can look up from there. The items are a
 * different sub-section again (`inventory-items`), read with the same fallback
 * to the parent the order read uses, and an absent section is an empty map
 * rather than an error: a studio without the register still has orders to cost,
 * and the lines fall back to the id they always showed.
 */
async function itemNames(ctx: LogisticsContext): Promise<Map<string, { name: string; sku: string }>> {
  const owner = (await getSectionByKey(ctx.studio.id, "inventory-items"))
    || (await getSectionByKey(ctx.studio.id, "inventory"));
  if (!owner) return new Map();
  const items = await Items.find({ studio: ctx.studio, section: owner });
  return new Map(items.map((i) => [
    String(i.id),
    { name: String((i as { name?: unknown }).name ?? ""), sku: String((i as { sku?: unknown }).sku ?? "") },
  ]));
}

const linesOf = (order: Record<string, unknown> | null): CostLine[] =>
  ((order?.lines || []) as Record<string, unknown>[]).map((l, i) => ({
    id: String(l?.itemId ?? i),
    itemId: String(l?.itemId ?? ""),
    qty: Number(l?.qty) || 0,
    unitPrice: Number(l?.unitPrice) || 0,
  }));

/**
 * THE ORDERS THIS STUDIO COULD COST, costed or not.
 *
 * IT USED TO RETURN ONLY THE RECORDS THAT ALREADY HAD CHARGES, which made the
 * screen impossible to start from: a reconciliation begins with an order nobody
 * has touched, and there was no way to name one. The list is the ORDERS now,
 * each carrying whatever has been recorded against it.
 *
 * THE ORDERS ARE READ WHERE THEY LIVE — `inventory-sheets`, through the same
 * cross-section read `orderFor` already makes, with the same fallback to the
 * parent for a studio predating the sub-section model. Costing an order is not
 * the same act as opening the orders screen, so this asks the landed-cost right
 * and not Inventory's: a forwarder's clerk reconciling duty has no business in
 * the warehouse, and needing both rights would have meant nobody could do the
 * job without being given the other one.
 */
export async function listLandedCosts(ctx: LogisticsContext) {
  const denied = requirePermission(ctx.access, "logistics.landedCost.view");
  if (denied) return denied;

  const owner = (await getSectionByKey(ctx.studio.id, "inventory-sheets"))
    || (await getSectionByKey(ctx.studio.id, "inventory"));
  const [records, orders] = await Promise.all([
    Landed.find(scope(ctx)),
    owner ? Orders.find({ studio: ctx.studio, section: owner }) : Promise.resolve([] as Record<string, unknown>[]),
  ]);
  const byOrder = new Map(records.map((r) => [String(r.orderId), r]));

  const costable = orders.map((o) => {
    const record = byOrder.get(String(o.id));
    const basis: Basis = isBasis(record?.basis) ? record.basis as Basis : DEFAULT_BASIS;
    const charges = ((record?.charges || []) as Charge[]);
    // THE TOTALS COME FROM THE SAME FUNCTION THE SINGLE-ORDER ANSWER USES, so a
    // row in the list and the order opened from it can never disagree about
    // what it came to.
    const costed = landedCost(linesOf(o as Record<string, unknown>), charges, basis);
    return {
      orderId: String(o.id),
      reference: String(o.reference || ""),
      vendorId: String(o.vendorId || ""),
      status: String(o.status || ""),
      expectedAt: String(o.expectedAt || ""),
      lines: ((o.lines || []) as unknown[]).length,
      goods: costed.goods,
      charges: costed.charges,
      landed: costed.landed,
      // NOT "HAS CHARGES" — a record with an empty charge list is a studio that
      // opened the order and recorded nothing, which is a different state from
      // never having looked at it.
      costed: Boolean(record),
      chargeCount: charges.length,
    };
  }).sort((a, b) => Number(b.costed) - Number(a.costed) || a.reference.localeCompare(b.reference));

  return { landedCosts: records, orders: costable, canManage: !requirePermission(ctx.access, "logistics.landedCost.edit") };
}

/** One order costed: its lines, its charges, and what each unit really cost. */
export async function landedCostFor(ctx: LogisticsContext, orderId: string) {
  const denied = requirePermission(ctx.access, "logistics.landedCost.view");
  if (denied) return denied;

  const [order, records, names] = await Promise.all([
    orderFor(ctx, orderId), Landed.find(scope(ctx)), itemNames(ctx),
  ]);
  if (!order) return { error: "notfound" };

  const record = records.find((r) => r.orderId === orderId);
  const basis: Basis = isBasis(record?.basis) ? record.basis as Basis : DEFAULT_BASIS;
  const charges = ((record?.charges || []) as Charge[]);

  // `landedCost` returns a `charges` TOTAL, so the charge ROWS are named
  // separately — spreading both would silently let one win.
  const costed = landedCost(linesOf(order), charges, basis);
  return {
    orderId,
    reference: String(order.reference || ""),
    chargeRows: charges,
    ...costed,
    // NAMED AFTER THE ARITHMETIC, never inside it. The distribution is computed
    // from ids alone and the labels are added on the way out, so a rename can
    // never move a number.
    lines: costed.lines.map((l) => ({
      ...l,
      name: names.get(l.itemId)?.name || "",
      sku: names.get(l.itemId)?.sku || "",
    })),
  };
}

/**
 * RECORD OR REPLACE THE CHARGES ON AN ORDER.
 *
 * ONE RECORD PER ORDER, replaced wholesale rather than appended to. A landed
 * cost is a reconciliation — "these are the invoices that belong to this
 * shipment" — and a studio correcting the duty figure is restating the set
 * rather than adding to it. Appending would leave the old figure in the total
 * with nothing saying which was right.
 */
export async function saveLandedCost(ctx: LogisticsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "logistics.landedCost.edit");
  if (denied) return denied;

  const orderId = str(body?.orderId, 60);
  if (!orderId) return { error: "order" };
  const order = await orderFor(ctx, orderId);
  // CHECKED, NOT TRUSTED. Charges against an order that does not exist would sit
  // in the collection contributing to nothing and be invisible to every screen.
  if (!order) return { error: "notfound" };

  const incoming = (Array.isArray(body?.charges) ? body.charges : []) as Record<string, unknown>[];
  const charges: Charge[] = [];
  for (const [i, c] of incoming.entries()) {
    const kind = str(c?.kind, 60);
    const amount = money(c?.amount);
    const problem = chargeProblem({ kind, amount });
    // THE INDEX TRAVELS WITH THE REFUSAL so a screen showing five charge rows
    // can mark the one that is wrong rather than the whole form.
    if (problem) return { error: problem, at: i };
    charges.push({ id: str(c?.id, 60) || `c${i + 1}`, kind, amount });
  }

  const basis: Basis = isBasis(body?.basis) ? body.basis as Basis : DEFAULT_BASIS;
  const existing = (await Landed.find(scope(ctx))).find((r) => r.orderId === orderId);

  const row = existing
    ? await Landed.update(scope(ctx), String(existing.id), { basis, charges })
    : await Landed.create(scope(ctx), {
      orderId,
      orderReference: String(order.reference || ""),
      basis,
      charges,
      createdByCollaboratorId: ctx.collaborator.id,
      createdAt: new Date().toISOString(),
    });
  if (!row) return { error: "notfound" };

  return { landedCost: row, ...landedCost(linesOf(order), charges, basis) };
}

export async function removeLandedCost(ctx: LogisticsContext, orderId: string) {
  const denied = requirePermission(ctx.access, "logistics.landedCost.delete");
  if (denied) return denied;
  const existing = (await Landed.find(scope(ctx))).find((r) => r.orderId === orderId);
  if (!existing) return { error: "notfound" };
  return (await Landed.remove(scope(ctx), String(existing.id))) ? { ok: true } : { error: "notfound" };
}

/**
 * WHAT STOCK VALUATION READS: `orderId:itemId` → the landed cost of one unit.
 *
 * NO PERMISSION CHECK, and that is deliberate rather than an oversight. This is
 * not a door — it is called by `stockValuation`, which has already asked
 * `inventory.stock.view` of the person doing the asking. Adding a second check
 * here would mean a studio's stock silently valued at bare order prices for
 * everyone who may see the warehouse but not the freight invoices, which is a
 * wrong number rather than a withheld one.
 *
 * The whole map is built in one pass: a valuation touches every movement, and
 * resolving each one by scanning the records is the shape that makes a
 * valuation screen time out on the studios that most need it.
 */
export async function landedUnitCosts(
  studio: StudioRef,
  logisticsSection: Section | undefined,
  orders: readonly Record<string, unknown>[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!logisticsSection) return out;

  const records = await Landed.find({ studio, section: logisticsSection });
  if (!records.length) return out;

  const byOrder = new Map(records.map((r) => [String(r.orderId), r]));
  for (const order of orders) {
    const record = byOrder.get(String(order.id));
    if (!record) continue;
    const basis: Basis = isBasis(record.basis) ? record.basis as Basis : DEFAULT_BASIS;
    const costed = landedCost(linesOf(order), (record.charges || []) as Charge[], basis);
    for (const l of costed.lines) {
      if (l.unitLanded !== null) out.set(`${String(order.id)}:${l.itemId}`, l.unitLanded);
    }
  }
  return out;
}
