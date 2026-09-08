// WHAT THE FACTORY NEEDS TO BUY, AND WHETHER IT CAN MAKE IT IN TIME.
//
// MANUFACTURING SHIPPED AS FOUR ENGINE REGISTERS AND NOTHING JOINED THEM. Work
// orders, bills of materials, work stations and production batches each held
// their own rows and no two of them met: a BOM's components were ONE LONG TEXT
// FIELD, so nothing could explode a demand out of it, and a work order's
// `station` was a string nothing compared against a station's own
// `capacityPerDay`. The section rendered and answered no question a factory
// asks — which is what "an engine register is not a feature" means in practice.
//
// TWO JOINS, AND THEY ARE THE WHOLE OF THIS FILE:
//
//  - EXPLOSION. A work order for 40 pumps against a BOM whose lines name real
//    Registered Items becomes demand in the stock ledger's own units, netted
//    against what is on hand and what is already on order. That is MRP, and at
//    this scale it is arithmetic rather than an algorithm.
//  - CAPACITY. A station's day has a size, and the orders pointed at it either
//    fit or do not. Load against capacity, per station, per day.
//
// THE JOIN KEY IS THE PRODUCT NAME, and that is a real limitation stated rather
// than hidden. A work order names its product as TEXT and so does a BOM,
// because both are engine records whose fields are studio-defined; there is no
// id between them. Matched case-insensitively and trimmed, and **an order whose
// product matches no BOM is REPORTED** (`noBom`) rather than skipped — a
// requirement nobody can see is worse than a requirement nobody has, because
// the buyer believes the list is complete.
//
// PURE. No imports, no store: the screen shows exactly what the server computed.

export type BomLine = { bomId: string; itemId: string; qtyPer: number };
export type Bom = { id: string; product?: string; revision?: string };
export type WorkOrder = {
  id: string; title?: string; product?: string; quantity?: number;
  dueOn?: string; station?: string; status?: string;
};
export type Station = { id: string; name?: string; capacityPerDay?: number };

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round = (n: number) => Math.round(n * 1000) / 1000;
const key = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** A work order that is still going to consume material. */
export const isOpen = (o: WorkOrder): boolean =>
  key(o.status) !== "done" && key(o.status) !== "cancelled" && key(o.status) !== "completed";

/**
 * WHAT EVERY OPEN WORK ORDER ADDS UP TO, per Registered Item.
 *
 * A QUANTITY OF NOUGHT IS NOT DEMAND and is not an error either — a work order
 * raised before anybody typed how many is a real row in a real register. It
 * contributes nothing and is listed in `noQuantity`, because a buyer reading a
 * short list needs to know which orders were not counted.
 */
export function explode(
  orders: WorkOrder[],
  boms: Bom[],
  lines: BomLine[],
): {
  gross: Record<string, number>;
  noBom: WorkOrder[];
  noQuantity: WorkOrder[];
  perOrder: { orderId: string; bomId: string; items: Record<string, number> }[];
} {
  const byProduct = new Map<string, Bom>();
  // FIRST BOM WINS FOR A PRODUCT, and a second is not silently blended in. Two
  // BOMs for one product name is a revision the studio has not retired; adding
  // both would double every requirement, which is the one arithmetic error a
  // buyer cannot spot by looking at the answer.
  for (const bom of boms) {
    const k = key(bom.product);
    if (k && !byProduct.has(k)) byProduct.set(k, bom);
  }

  const linesOf = new Map<string, BomLine[]>();
  for (const line of lines) {
    if (!line.itemId) continue;
    (linesOf.get(line.bomId) ?? linesOf.set(line.bomId, []).get(line.bomId)!).push(line);
  }

  const gross: Record<string, number> = {};
  const noBom: WorkOrder[] = [];
  const noQuantity: WorkOrder[] = [];
  const perOrder: { orderId: string; bomId: string; items: Record<string, number> }[] = [];

  for (const order of orders) {
    if (!isOpen(order)) continue;
    const bom = byProduct.get(key(order.product));
    if (!bom) { noBom.push(order); continue; }

    const qty = num(order.quantity);
    if (qty <= 0) { noQuantity.push(order); continue; }

    const items: Record<string, number> = {};
    for (const line of linesOf.get(bom.id) || []) {
      const need = round(qty * num(line.qtyPer));
      if (!need) continue;
      items[line.itemId] = round((items[line.itemId] || 0) + need);
      gross[line.itemId] = round((gross[line.itemId] || 0) + need);
    }
    perOrder.push({ orderId: order.id, bomId: bom.id, items });
  }

  return { gross, noBom, noQuantity, perOrder };
}

export type Requirement = {
  itemId: string;
  gross: number;
  onHand: number;
  onOrder: number;
  /** What still has to be bought. Never negative — see below. */
  shortfall: number;
};

/**
 * WHAT IS ACTUALLY SHORT — gross demand less what is held and what is coming.
 *
 * SHORTFALL IS FLOORED AT NOUGHT, and the surplus is not reported as a negative
 * shortfall. "We are 40 short" and "we have 40 spare" are different facts and a
 * signed number makes a buyer read one as the other at a glance; the surplus is
 * visible as `onHand` exceeding `gross` for anybody who wants it.
 *
 * ON-ORDER COUNTS, which is what stops this ordering the same thing twice. A
 * purchase order placed yesterday for exactly this shortage would otherwise be
 * invisible, and MRP run daily would raise a fresh requisition every morning
 * until the goods turned up.
 */
export function netRequirements(
  gross: Record<string, number>,
  onHand: Record<string, number>,
  onOrder: Record<string, number> = {},
): Requirement[] {
  return Object.entries(gross)
    .map(([itemId, need]) => {
      const held = num(onHand[itemId]);
      const coming = num(onOrder[itemId]);
      return {
        itemId,
        gross: round(need),
        onHand: round(held),
        onOrder: round(coming),
        shortfall: round(Math.max(0, need - held - coming)),
      };
    })
    // SHORT FIRST, then by size. A buyer opens this to find what to order, and
    // items that are covered are context rather than work.
    .sort((a, b) => b.shortfall - a.shortfall || b.gross - a.gross);
}

export type StationLoad = {
  stationId: string;
  name: string;
  capacityPerDay: number;
  /** Units of work pointed at this station by open orders. */
  load: number;
  /** Days of work at the station's own rate, or null when it has no rate. */
  days: number | null;
  over: boolean;
  orders: WorkOrder[];
};

/**
 * HOW MUCH WORK IS POINTED AT EACH STATION, and whether it fits.
 *
 * `days` IS NULL RATHER THAN ZERO when a station has no `capacityPerDay`. A
 * station nobody has rated is not a station with infinite capacity and not one
 * with none; "we do not know how long this takes" is a third answer, and
 * dividing by nought to avoid saying so would print Infinity on a shop-floor
 * screen. `over` is false in that case for the same reason — an unrated station
 * cannot be over a limit it does not have.
 *
 * MATCHED BY NAME, like the BOM join, and orders naming a station the studio
 * does not have are returned in `unstationed` rather than dropped: work with
 * nowhere to happen is exactly what a capacity view exists to surface.
 */
export function capacityLoad(
  orders: WorkOrder[],
  stations: Station[],
): { stations: StationLoad[]; unstationed: WorkOrder[] } {
  const open = orders.filter(isOpen);
  const byName = new Map(stations.map((s) => [key(s.name), s]));

  const lanes: StationLoad[] = stations.map((s) => {
    const mine = open.filter((o) => key(o.station) === key(s.name));
    const load = round(mine.reduce((sum, o) => sum + num(o.quantity), 0));
    const capacity = num(s.capacityPerDay);
    return {
      stationId: s.id,
      name: String(s.name || "").trim(),
      capacityPerDay: capacity,
      load,
      days: capacity > 0 ? round(load / capacity) : null,
      over: capacity > 0 && load > capacity,
      orders: mine,
    };
  }).sort((a, b) => (b.days ?? -1) - (a.days ?? -1) || a.name.localeCompare(b.name));

  // AN ORDER WITH NO STATION AT ALL is not unstationed — it has not been
  // planned yet, which is a different problem from being pointed at a station
  // that does not exist. Only the second is a mistake somebody made.
  const unstationed = open.filter((o) => {
    const k = key(o.station);
    return k !== "" && !byName.has(k);
  });

  return { stations: lanes, unstationed };
}
