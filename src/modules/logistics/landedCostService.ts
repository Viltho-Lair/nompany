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

const linesOf = (order: Record<string, unknown> | null): CostLine[] =>
  ((order?.lines || []) as Record<string, unknown>[]).map((l, i) => ({
    id: String(l?.itemId ?? i),
    itemId: String(l?.itemId ?? ""),
    qty: Number(l?.qty) || 0,
    unitPrice: Number(l?.unitPrice) || 0,
  }));

export async function listLandedCosts(ctx: LogisticsContext) {
  const denied = requirePermission(ctx.access, "logistics.landedCost.view");
  if (denied) return denied;
  return { landedCosts: await Landed.find(scope(ctx)) };
}

/** One order costed: its lines, its charges, and what each unit really cost. */
export async function landedCostFor(ctx: LogisticsContext, orderId: string) {
  const denied = requirePermission(ctx.access, "logistics.landedCost.view");
  if (denied) return denied;

  const [order, records] = await Promise.all([orderFor(ctx, orderId), Landed.find(scope(ctx))]);
  if (!order) return { error: "notfound" };

  const record = records.find((r) => r.orderId === orderId);
  const basis: Basis = isBasis(record?.basis) ? record.basis as Basis : DEFAULT_BASIS;
  const charges = ((record?.charges || []) as Charge[]);

  // `landedCost` returns a `charges` TOTAL, so the charge ROWS are named
  // separately — spreading both would silently let one win.
  return {
    orderId,
    reference: String(order.reference || ""),
    chargeRows: charges,
    ...landedCost(linesOf(order), charges, basis),
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
