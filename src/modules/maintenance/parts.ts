// PARTS ON A WORK ORDER, purely — read off the stock ledger. No store and no
// clock: every window is measured against a `now` the caller passes in.
//
// THIS SAID "NO IMPORTS" AND NOW IMPORTS ONE SIBLING. `./window` holds the
// rolling-window arithmetic `costByAsset` used to spell out by hand, and which
// `reliabilityByAsset` spelled out differently. Pure here has never meant
// importless — `reliability.ts` has always imported `orderOpen` from `./model`
// — it means no store, no clock and no I/O, which importing a pure sibling does
// not cost. Corrected rather than left standing: a header that describes the
// file it used to be is the kind of claim this codebase keeps finding stale.
//
// THE LEDGER IS THE RECORD. A part used on a work order is an `out` movement
// in Inventory's ledger naming the order (`sourceType: "workorder"`), and a
// part brought back is an `in` movement naming it too. Nothing is copied into a
// second collection, because a second record of "what did this repair use" is
// a second answer free to disagree with the stock count.
//
// THE COST TRAVELS ON THE MOVEMENT. The ledger carried no cost at all; an issue
// to a work order now snapshots the item's recorded unit cost, so repricing an
// item later re-prices nothing already used — the BOQ rate rule, for its
// reason. It is the item's RECORDED cost, not the valuation method's: FIFO and
// average cost what is left on the shelf, and a studio using either should read
// this as the price list's figure, not the books'.

import { windowOf, within } from "./window";

export const WORKORDER_SOURCE = "workorder";

type Move = {
  itemId?: unknown; kind?: unknown; qty?: unknown; unitCost?: unknown;
  sourceType?: unknown; sourceId?: unknown; at?: unknown;
};

const text = (v: unknown) => String(v ?? "").trim();
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const qty3 = (n: number) => Math.round(n * 1000) / 1000;
const money = (n: number) => Math.round(n * 100) / 100;

const onOrder = (m: Move, workOrderId: string) =>
  text(m.sourceType) === WORKORDER_SOURCE && text(m.sourceId) === workOrderId;

export type PartLine = { itemId: string; issued: number; returned: number; net: number; cost: number };

/**
 * WHAT THIS ORDER USED, per item: issued, brought back, kept, and what the
 * kept part cost. A return is costed at what the issue was, so bringing a part
 * back takes off exactly what issuing it put on.
 */
export function partsOnOrder(moves: readonly Move[], workOrderId: string): PartLine[] {
  const byItem = new Map<string, { issued: number; returned: number; costOut: number; costIn: number }>();
  for (const m of moves) {
    if (!onOrder(m, workOrderId)) continue;
    const id = text(m.itemId);
    const row = byItem.get(id) || { issued: 0, returned: 0, costOut: 0, costIn: 0 };
    const q = Math.abs(num(m.qty));
    const c = q * num(m.unitCost);
    if (text(m.kind) === "out") { row.issued += q; row.costOut += c; }
    else if (text(m.kind) === "in") { row.returned += q; row.costIn += c; }
    byItem.set(id, row);
  }
  return [...byItem.entries()].map(([itemId, r]) => ({
    itemId,
    issued: qty3(r.issued),
    returned: qty3(r.returned),
    net: qty3(r.issued - r.returned),
    cost: money(r.costOut - r.costIn),
  }));
}

/** The unit cost this order was charged for an item — what a return is valued at. */
export function averageIssuedCost(moves: readonly Move[], workOrderId: string, itemId: string): number {
  let issued = 0;
  let cost = 0;
  for (const m of moves) {
    if (!onOrder(m, workOrderId) || text(m.itemId) !== itemId || text(m.kind) !== "out") continue;
    const q = Math.abs(num(m.qty));
    issued += q;
    cost += q * num(m.unitCost);
  }
  return issued ? Math.round((cost / issued) * 10000) / 10000 : 0;
}

/**
 * WHY THIS RETURN IS REFUSED — or null. A work order cannot give back more
 * than it was given: that would put stock on the shelf that nobody bought.
 */
export function returnProblem(moves: readonly Move[], workOrderId: string, itemId: string, qty: number): string | null {
  const line = partsOnOrder(moves, workOrderId).find((l) => l.itemId === itemId);
  if (!line || qty > line.net + 1e-9) return "over-return";
  return null;
}

/** Parts cost per work order, for every order the ledger names. */
export function partsCostByOrder(moves: readonly Move[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of moves) {
    if (text(m.sourceType) !== WORKORDER_SOURCE) continue;
    const id = text(m.sourceId);
    const c = Math.abs(num(m.qty)) * num(m.unitCost);
    const kind = text(m.kind);
    const delta = kind === "out" ? c : kind === "in" ? -c : 0;
    out.set(id, money((out.get(id) || 0) + delta));
  }
  return out;
}

/**
 * WHAT EACH MACHINE COST TO KEEP RUNNING over the window: parts (by when the
 * movement happened) and hours booked (by the day worked), through the work
 * orders that name the machine. Hours stay hours — what an hour costs has no
 * source yet, and multiplying by a guessed rate would be a figure nobody chose.
 */
export function costByAsset(
  orders: readonly { id?: unknown; assetId?: unknown }[],
  moves: readonly Move[],
  labour: readonly { workOrderId?: unknown; hours?: unknown; workedOn?: unknown }[],
  now: string,
  windowDays = 365,
): Map<string, { partsCost: number; labourHours: number }> {
  const w = windowOf(now, windowDays);
  const assetOf = new Map(orders.map((o) => [text(o.id), text(o.assetId)]));
  const out = new Map<string, { partsCost: number; labourHours: number }>();
  const bucket = (asset: string) => {
    const row = out.get(asset) || { partsCost: 0, labourHours: 0 };
    out.set(asset, row);
    return row;
  };
  for (const m of moves) {
    if (text(m.sourceType) !== WORKORDER_SOURCE) continue;
    const asset = assetOf.get(text(m.sourceId));
    if (!asset || !within(w, Date.parse(text(m.at)))) continue;
    const c = Math.abs(num(m.qty)) * num(m.unitCost);
    const kind = text(m.kind);
    const row = bucket(asset);
    row.partsCost = money(row.partsCost + (kind === "out" ? c : kind === "in" ? -c : 0));
  }
  for (const e of labour) {
    const asset = assetOf.get(text(e.workOrderId));
    if (!asset || !within(w, Date.parse(`${text(e.workedOn)}T00:00:00Z`))) continue;
    const row = bucket(asset);
    row.labourHours = Math.round((row.labourHours + num(e.hours)) * 100) / 100;
  }
  return out;
}
