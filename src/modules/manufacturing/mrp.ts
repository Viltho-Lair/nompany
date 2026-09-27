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
export type Bom = { id: string; product?: string; revision?: string; status?: string };
export type WorkOrder = {
  id: string; title?: string; product?: string; quantity?: number;
  dueOn?: string; station?: string; status?: string;
};
export type Station = { id: string; name?: string; capacityPerDay?: number; status?: string };

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round = (n: number) => Math.round(n * 1000) / 1000;
const key = (v: unknown) => String(v ?? "").trim().toLowerCase();

/**
 * A work order that is still going to consume material.
 *
 * THE STATUS HAS TO BE HANDED IN, and for a long time it was not: the planner
 * flattened each engine record to its id and its values, and the status lives
 * on the record rather than in the values — so every order arrived with no
 * status, this answered true for all of them, and Completed and Cancelled work
 * orders drove the shortfall and the station load. `flatRecord` below now
 * carries it, and `tests/mrp-model.mjs` pins that. "done" is kept for a
 * studio-defined register that says it that way.
 */
export const isOpen = (o: Pick<WorkOrder, "status">): boolean =>
  key(o.status) !== "done" && key(o.status) !== "cancelled" && key(o.status) !== "completed";

/**
 * AN ENGINE RECORD AS THE PLANNER READS IT — its declared values, its id and
 * its STATUS. The status is a column of the record, not one of its values, so
 * a flattening that spread only `values` dropped it without a sound. The id and
 * status go LAST so a studio field that happens to be called `status` cannot
 * stand in for the record's real one.
 */
export function flatRecord(r: Record<string, unknown>): Record<string, unknown> & { id: string; status: string } {
  return {
    ...((r.values as Record<string, unknown>) || {}),
    id: String(r.id ?? ""),
    status: String(r.status ?? ""),
  };
}

/**
 * A BOM THE PLANNER MAY EXPLODE — Released, and nothing else.
 *
 * The register's ladder is Draft → Released → Superseded (engine builtins). A
 * DRAFT is a bill somebody is still writing, and buying against it orders
 * components for a product nobody has agreed how to make; a SUPERSEDED bill is
 * the one the next revision replaced, and exploding it orders last revision's
 * parts. Before this the newest BOM for a product won whatever its status, so
 * starting revision 2 as a draft silently moved every open order's demand onto
 * it. An order whose product has no Released bill is reported in `noBom`, which
 * is the truth: there is no bill it may be built to yet.
 */
export const isPlannable = (b: Bom): boolean => key(b.status) === "released";

/**
 * A RETIRED station is gone — work pointed at it has nowhere to happen and is
 * reported with the unstationed orders. A DOWN station will come back: it keeps
 * its lane, offers no capacity today, and any load on it is over.
 */
export const isRetired = (s: Station): boolean => key(s.status) === "retired";
export const isDown = (s: Station): boolean => key(s.status) === "down";

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
  // ONE BOM PER PRODUCT, and a second is not silently blended in. Only a
  // RELEASED bill is eligible (`isPlannable`); among those the FIRST IN THE
  // ORDER GIVEN wins, and the planner hands them NEWEST FIRST (the engine lists
  // records by `createdAt` descending), so it is the newest released revision.
  // Two released bills for one product name is a revision the studio has not
  // superseded; adding both would double every requirement, which is the one
  // arithmetic error a buyer cannot spot by looking at the answer.
  for (const bom of boms) {
    if (!isPlannable(bom)) continue;
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
  /** The station is Down: it offers no capacity today, so any load is over. */
  down: boolean;
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
  // A RETIRED STATION IS NOT A LANE. Its name still matches the orders that
  // point at it, and counting it as somewhere the work can happen is exactly
  // how a scrapped machine absorbed load on this screen.
  const live = stations.filter((s) => !isRetired(s));
  const byName = new Map(live.map((s) => [key(s.name), s]));

  const lanes: StationLoad[] = live.map((s) => {
    const mine = open.filter((o) => key(o.station) === key(s.name));
    const load = round(mine.reduce((sum, o) => sum + num(o.quantity), 0));
    const capacity = num(s.capacityPerDay);
    const down = isDown(s);
    return {
      stationId: s.id,
      name: String(s.name || "").trim(),
      capacityPerDay: capacity,
      down,
      load,
      // A DOWN STATION'S DAYS ARE NULL like an unrated one's — it will not
      // finish this work at any rate today — and it is OVER the moment
      // anything is pointed at it, because nothing it holds is being made.
      days: !down && capacity > 0 ? round(load / capacity) : null,
      over: down ? load > 0 : capacity > 0 && load > capacity,
      orders: mine,
    };
  }).sort((a, b) => (b.days ?? -1) - (a.days ?? -1) || a.name.localeCompare(b.name));

  // AN ORDER WITH NO STATION AT ALL is not unstationed — it has not been
  // planned yet, which is a different problem from being pointed at a station
  // that does not exist or has been retired. Only the second is a mistake
  // somebody made.
  const unstationed = open.filter((o) => {
    const k = key(o.station);
    return k !== "" && !byName.has(k);
  });

  return { stations: lanes, unstationed };
}
