// THE STORE HALF OF `./mrp` — reading four registers that had never met.
//
// A BOM'S LINES ARE THE BOM'S CONTENT, so they answer to `engine.bom.*` and
// mint nothing: a second right over one act would be free to disagree with the
// first about who works on a bill of materials. The PLANNING VIEW is its own
// right (`manufacturing.planning.view`) because it spans registers — work
// orders, BOMs, the stock ledger and the purchase orders — and somebody who may
// run a work station has no business reading what the company is short of.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listRecords } from "@/platform/engine/records";
import type { EngineCallerContext } from "@/platform/engine/records";
import { explode, netRequirements, capacityLoad } from "./mrp";
import type { BomLine, Bom, WorkOrder, Station } from "./mrp";
import type { Section } from "@/platform/db/sections";

const Lines = repo<BomLine & { id: string; notes?: string }>("bomLines");
const Stock = repo<{ itemId: string; kind: string; qty: number }>("inventoryStock");
const Items = repo<{ id: string; sku?: string; name?: string; unit?: string }>("inventoryItems");
const Orders = repo<{ status?: string; lines?: { itemId: string; qty: number; received: number }[] }>("materialOrders");

/** What Manufacturing needs beyond the engine's own context. */
export type PlanningContext = EngineCallerContext & {
  section: Section;
  /** Inventory's registers. Foreign and therefore nullable. */
  itemsSection: Section | null;
  stockSection: Section | null;
  sheetsSection: Section | null;
};

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round = (n: number) => Math.round(n * 1000) / 1000;

const scope = (ctx: PlanningContext) => ({ studio: ctx.studio, section: ctx.section });

/** The engine's rows for one type, as plain records. */
async function rowsOf(ctx: PlanningContext, typeKey: string): Promise<Record<string, unknown>[]> {
  const result = await listRecords(ctx, typeKey);
  // A STUDIO THAT NEVER RAN THE BUILT-IN SEED HAS NO SUCH TYPE, and a caller
  // holding no engine right is refused it. Neither is an error for planning: it
  // means there is nothing of that kind to plan with, and the view says so by
  // reporting an empty register rather than failing whole.
  if ("error" in result || !("records" in result)) return [];
  return (result.records as Record<string, unknown>[]) || [];
}

/** An engine record's declared fields, flattened onto the row. */
const flat = (r: Record<string, unknown>) => ({
  id: String(r.id ?? ""), ...((r.values as Record<string, unknown>) || {}),
});

/**
 * WHAT THE FACTORY NEEDS TO BUY, AND WHETHER THE SHOP CAN TAKE THE WORK.
 *
 * FOUR READS THAT HAD NEVER BEEN MADE TOGETHER. The registers each held their
 * rows and no two of them met; this is the join, and the join is the feature.
 */
export async function productionPlan(ctx: PlanningContext) {
  const denied = requirePermission(ctx.access, "manufacturing.planning.view");
  if (denied) return denied;

  const [orderRows, bomRows, stationRows, lines] = await Promise.all([
    // THE KEYS ARE READ OFF `platform/engine/builtins`, not guessed. A first
    // draft asked for "workOrder" where the type is declared `workorder`, and
    // `rowsOf` answers an unknown type with an empty list by design — so the
    // planning view rendered, reported no requirements at all, and looked like
    // a factory with nothing to buy. Exactly the numbering catalogue's near
    // miss, where "RFQ" was written for a product that mints "SRQ".
    rowsOf(ctx, "workorder"),
    rowsOf(ctx, "bom"),
    rowsOf(ctx, "station"),
    Lines.find(scope(ctx)),
  ]);

  const orders = orderRows.map(flat) as unknown as WorkOrder[];
  const boms = bomRows.map(flat) as unknown as Bom[];
  const stations = stationRows.map(flat) as unknown as Station[];

  const blown = explode(orders, boms, lines);

  // ---- what the studio already holds and has already bought ---------------
  // BOTH ARE OPTIONAL. A studio that has not opened Inventory can still plan
  // its shop floor; it simply has no stock to net against, which makes every
  // requirement a shortfall — true, and better than pretending to net.
  const onHand: Record<string, number> = {};
  if (ctx.stockSection) {
    for (const m of await Stock.find({ studio: ctx.studio, section: ctx.stockSection })) {
      const delta = m.kind === "out" ? -Math.abs(m.qty) : m.kind === "adjust" ? m.qty : Math.abs(m.qty);
      onHand[m.itemId] = round((onHand[m.itemId] || 0) + delta);
    }
  }

  const onOrder: Record<string, number> = {};
  if (ctx.sheetsSection) {
    for (const po of await Orders.find({ studio: ctx.studio, section: ctx.sheetsSection })) {
      // ONLY WHAT IS STILL COMING. A line already received IS the stock counted
      // above, and netting it in both places would cover every requirement
      // twice — the same double-count `costing` avoids by netting an invoiced
      // order out of what is committed.
      if (po.status === "Cancelled" || po.status === "Draft") continue;
      for (const line of po.lines || []) {
        const outstanding = Math.max(0, num(line.qty) - num(line.received));
        if (outstanding) onOrder[line.itemId] = round((onOrder[line.itemId] || 0) + outstanding);
      }
    }
  }

  const items = ctx.itemsSection
    ? await Items.find({ studio: ctx.studio, section: ctx.itemsSection })
    : [];
  const label = Object.fromEntries(items.map((i) => [i.id, `${i.sku || ""} · ${i.name || ""}`.trim()]));
  const unitOf = Object.fromEntries(items.map((i) => [i.id, String(i.unit || "")]));

  const capacity = capacityLoad(orders, stations);

  return {
    requirements: netRequirements(blown.gross, onHand, onOrder).map((r) => ({
      ...r,
      itemLabel: label[r.itemId] || "(removed item)",
      unit: unitOf[r.itemId] || "",
    })),
    // REPORTED, NOT SKIPPED. A requirement nobody can see is worse than a
    // requirement nobody has, because the buyer believes the list is complete.
    noBom: blown.noBom.map((o) => ({ id: o.id, title: o.title, product: o.product })),
    noQuantity: blown.noQuantity.map((o) => ({ id: o.id, title: o.title, product: o.product })),
    stations: capacity.stations.map((s) => ({ ...s, orders: s.orders.map((o) => o.id) })),
    unstationed: capacity.unstationed.map((o) => ({ id: o.id, title: o.title, station: o.station })),
    // What a line can be put against, so the BOM editor offers exactly what the
    // server will accept.
    items: items.map((i) => ({ id: i.id, label: label[i.id], unit: unitOf[i.id] })),
    boms: boms.map((b) => ({ id: b.id, product: String(b.product || ""), revision: String(b.revision || "") })),
    lines,
  };
}

/** Add a line to a bill of materials. Guarded by the BOM's own right. */
export async function addBomLine(ctx: PlanningContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "engine.bom.edit");
  if (denied) return denied;

  const bomId = String(body?.bomId ?? "").trim();
  const itemId = String(body?.itemId ?? "").trim();
  const qtyPer = num(body?.qtyPer);
  if (!bomId) return { error: "bom" };
  // A LINE NAMING NO REGISTERED ITEM CANNOT EXPLODE INTO ANYTHING, which is the
  // whole reason this collection exists rather than the longtext it replaces.
  if (!itemId) return { error: "item" };
  if (qtyPer <= 0) return { error: "qty" };

  const existing = await Lines.find(scope(ctx));
  // ONE LINE PER ITEM PER BOM. Two lines for one component is a quantity
  // somebody meant to change, and summing them silently would make the second
  // edit look like it had worked while doubling the requirement.
  if (existing.some((l) => l.bomId === bomId && l.itemId === itemId)) return { error: "duplicate" };

  return {
    line: await Lines.create(scope(ctx), {
      bomId, itemId, qtyPer: round(qtyPer),
      notes: String(body?.notes ?? "").slice(0, 300),
    }),
  };
}

export async function editBomLine(ctx: PlanningContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "engine.bom.edit");
  if (denied) return denied;
  const qtyPer = num(body?.qtyPer);
  if (qtyPer <= 0) return { error: "qty" };
  const updated = await Lines.update(scope(ctx), id, { qtyPer: round(qtyPer) });
  return updated ? { line: updated } : { error: "notfound" };
}

/**
 * REMOVE A LINE. It cascades nothing, and there is nothing to cascade: a line
 * is an input to arithmetic rather than a record anything points at. The
 * requirement it produced simply stops being produced.
 */
export async function removeBomLine(ctx: PlanningContext, id: string) {
  const denied = requirePermission(ctx.access, "engine.bom.edit");
  if (denied) return denied;
  const rows = await Lines.find(scope(ctx));
  if (!rows.some((l) => l.id === id)) return { error: "notfound" };
  await Lines.remove(scope(ctx), id);
  return { ok: true };
}
