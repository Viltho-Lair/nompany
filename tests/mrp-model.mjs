// MRP AND CAPACITY, asserted without a database.
//
// The arithmetic is simple; what is worth asserting is everything this
// deliberately REPORTS rather than silently drops, because a requirement nobody
// can see is worse than a requirement nobody has.
import {
  explode, netRequirements, capacityLoad, isOpen,
} from "../src/modules/manufacturing/mrp.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const BOMS = [
  { id: "bom1", product: "Pump A", revision: "1" },
  { id: "bom2", product: "Valve B" },
];
const LINES = [
  { bomId: "bom1", itemId: "impeller", qtyPer: 1 },
  { bomId: "bom1", itemId: "seal", qtyPer: 2 },
  { bomId: "bom2", itemId: "seal", qtyPer: 4 },
];
const ORDERS = [
  { id: "o1", product: "Pump A", quantity: 10, station: "Line 1" },
  { id: "o2", product: "pump a", quantity: 5, station: "Line 1" },   // case-insensitive
  { id: "o3", product: "Valve B", quantity: 3, station: "Bench" },
  { id: "done", product: "Pump A", quantity: 100, status: "done" },
  { id: "nobom", product: "Gasket Z", quantity: 7 },
  { id: "noqty", product: "Pump A", quantity: 0 },
];

// ---- what is open ----------------------------------------------------------
ok("a finished order consumes nothing", isOpen({ status: "done" }) === false);
ok("a cancelled order consumes nothing", isOpen({ status: "cancelled" }) === false);
ok("an order with no status is open", isOpen({}) === true);

// ---- the explosion ----------------------------------------------------------
const blown = explode(ORDERS, BOMS, LINES);
// 15 pumps x 1 impeller
ok("demand is quantity times what the line calls for", blown.gross.impeller === 15,
  String(blown.gross.impeller));
// 15 pumps x 2 seals + 3 valves x 4 seals = 42
ok("one item is summed across every BOM that calls for it", blown.gross.seal === 42,
  String(blown.gross.seal));
ok("the product name is matched case-insensitively",
  blown.perOrder.some((p) => p.orderId === "o2" && p.bomId === "bom1"));
ok("a finished order adds no demand",
  !blown.perOrder.some((p) => p.orderId === "done"));

// A REQUIREMENT NOBODY CAN SEE IS WORSE THAN ONE NOBODY HAS, because the buyer
// believes the list is complete.
ok("AN ORDER WITH NO BOM IS REPORTED, NOT SKIPPED",
  blown.noBom.length === 1 && blown.noBom[0].id === "nobom");
ok("an order with no quantity is reported too",
  blown.noQuantity.length === 1 && blown.noQuantity[0].id === "noqty");
ok("...and adds nothing", blown.gross.impeller === 15);

// TWO BOMS FOR ONE PRODUCT IS A REVISION NOBODY RETIRED. Blending both would
// double every requirement, which is the one arithmetic error a buyer cannot
// spot by looking at the answer.
const twoRevs = explode(
  [{ id: "x", product: "Pump A", quantity: 10 }],
  [...BOMS, { id: "bom1b", product: "Pump A", revision: "2" }],
  [...LINES, { bomId: "bom1b", itemId: "impeller", qtyPer: 1 }],
);
ok("A SECOND BOM FOR ONE PRODUCT IS NOT BLENDED IN", twoRevs.gross.impeller === 10,
  String(twoRevs.gross.impeller));

// ---- what is actually short -------------------------------------------------
const need = netRequirements(blown.gross, { impeller: 4, seal: 50 }, { impeller: 2 });
const of = (id) => need.find((r) => r.itemId === id);
ok("shortfall is demand less stock less what is on order", of("impeller").shortfall === 9,
  String(of("impeller").shortfall));
// ON-ORDER COUNTS, which is what stops MRP raising a fresh requisition every
// morning for goods already bought.
ok("...so an order already placed is not ordered twice", of("impeller").onOrder === 2);
// "WE ARE 40 SHORT" AND "WE HAVE 40 SPARE" ARE DIFFERENT FACTS, and a signed
// number makes a buyer read one as the other at a glance.
ok("A SURPLUS IS NOT A NEGATIVE SHORTFALL", of("seal").shortfall === 0,
  String(of("seal").shortfall));
ok("...and the surplus is still visible", of("seal").onHand === 50 && of("seal").gross === 42);
ok("what is short comes first", need[0].itemId === "impeller");
ok("an item nothing needs is not a row", need.length === 2);

// ---- capacity ---------------------------------------------------------------
const STATIONS = [
  { id: "s1", name: "Line 1", capacityPerDay: 10 },
  { id: "s2", name: "Bench", capacityPerDay: 5 },
  { id: "s3", name: "Unrated" },
  { id: "s4", name: "Idle", capacityPerDay: 8 },
];
const cap = capacityLoad([...ORDERS, { id: "ghost", product: "X", quantity: 2, station: "Nowhere" }], STATIONS);
const lane = (name) => cap.stations.find((s) => s.name === name);
ok("a station's load is what is pointed at it", lane("Line 1").load === 15, String(lane("Line 1").load));
ok("...in days at its own rate", lane("Line 1").days === 1.5);
ok("...and it is over when it does not fit", lane("Line 1").over === true);
ok("a station that fits is not over", lane("Bench").over === false);
// AN UNRATED STATION IS NOT INFINITE AND NOT NOUGHT: "we do not know how long
// this takes" is a third answer, and dividing by nought would print Infinity.
ok("AN UNRATED STATION SAYS NULL, NOT ZERO", lane("Unrated").days === null);
ok("...and is never reported over", lane("Unrated").over === false);
ok("an idle station is still a lane", Boolean(lane("Idle")) && lane("Idle").load === 0);
ok("the fullest station comes first", cap.stations[0].name === "Line 1");

// WORK WITH NOWHERE TO HAPPEN is exactly what a capacity view exists to
// surface — but an order with NO station has not been planned yet, which is a
// different problem from being sent to a station that does not exist.
ok("an order sent to a station that does not exist is reported",
  cap.unstationed.length === 1 && cap.unstationed[0].id === "ghost",
  cap.unstationed.map((o) => o.id).join(","));
ok("an order with no station at all is not 'unstationed'",
  !cap.unstationed.some((o) => o.id === "nobom"));

// ---- the type keys the planner reads --------------------------------------
// `rowsOf` answers an unknown type with an EMPTY LIST by design, so a mistyped
// key does not fail — it reports a factory with nothing to buy. A first draft
// asked for "workOrder" where the type is declared `workorder`, which is the
// numbering catalogue's near miss ("RFQ" for a product that mints "SRQ") in a
// second place. Read off the declaration rather than the prose about it.
const { readFileSync } = await import("node:fs");
const planning = readFileSync("src/modules/manufacturing/planning.ts", "utf8");
const builtins = readFileSync("src/platform/engine/builtins.ts", "utf8");
const asked = [...planning.matchAll(/rowsOf\(ctx, "([a-zA-Z]+)"\)/g)].map((m) => m[1]);
ok("the planner names some types at all", asked.length === 3, String(asked.length));
for (const key of asked) {
  ok(`the planner reads a type that exists: ${key}`, builtins.includes(`key: "${key}"`));
}

console.log(fails ? `\nmrp model: ${fails} FAILURES\n` : "\nmrp model: all passed\n");
process.exit(fails ? 1 : 0);
