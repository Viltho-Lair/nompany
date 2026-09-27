// MRP AND CAPACITY, asserted without a database.
//
// The arithmetic is simple; what is worth asserting is everything this
// deliberately REPORTS rather than silently drops, because a requirement nobody
// can see is worse than a requirement nobody has.
import {
  explode, netRequirements, capacityLoad, isOpen, flatRecord, isPlannable,
} from "../src/modules/manufacturing/mrp.ts";

let fails = 0;
const BOMS_REL = () => [{ id: "bom1", product: "Pump A", status: "Released" }];
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const BOMS = [
  { id: "bom1", product: "Pump A", revision: "1", status: "Released" },
  { id: "bom2", product: "Valve B", status: "Released" },
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
ok("the register's own Completed is closed", isOpen({ status: "Completed" }) === false);
ok("the register's own Cancelled is closed", isOpen({ status: "Cancelled" }) === false);

// PLANNING COUNTED CLOSED ORDERS. The planner flattened each engine record to
// its id and its values, and the status is a column of the RECORD, not a value
// — so every order arrived with no status, `isOpen` answered true for all of
// them, and Completed and Cancelled work orders drove MRP and station load.
// `flatRecord` is the flattening both the planner and the terminal use.
const closedRow = flatRecord({ id: "w9", status: "Completed", values: { product: "Pump A", quantity: 50 } });
ok("FLATTENING AN ENGINE RECORD KEEPS ITS STATUS", closedRow.status === "Completed", closedRow.status);
ok("...so a Completed work order read off the register is not open", isOpen(closedRow) === false);
ok("...and a studio value called status cannot stand in for the record's",
  flatRecord({ id: "w8", status: "Cancelled", values: { status: "Released" } }).status === "Cancelled");
const closedBlown = explode(
  [closedRow, flatRecord({ id: "w10", status: "Cancelled", values: { product: "Pump A", quantity: 7 } })],
  BOMS_REL(), [{ bomId: "bom1", itemId: "impeller", qtyPer: 1 }],
);
ok("A CLOSED ORDER READ OFF THE REGISTER ADDS NO DEMAND", !closedBlown.gross.impeller, String(closedBlown.gross.impeller));

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

// PLANNING USED THE NEWEST BOM WHATEVER ITS STATUS, so starting revision 2 as a
// Draft silently moved every open order's demand onto a bill nobody had
// agreed. Only a Released bill is planned from; the planner hands them newest
// first, and the first Released one wins.
ok("a Draft bill is not plannable", isPlannable({ id: "d", status: "Draft" }) === false);
ok("a Superseded bill is not plannable", isPlannable({ id: "s", status: "Superseded" }) === false);
const draftFirst = explode(
  [{ id: "x", product: "Pump A", quantity: 10 }],
  [{ id: "rev2", product: "Pump A", status: "Draft" }, { id: "rev1", product: "Pump A", status: "Released" }],
  [{ bomId: "rev2", itemId: "impeller", qtyPer: 3 }, { bomId: "rev1", itemId: "impeller", qtyPer: 1 }],
);
ok("A NEWER DRAFT BILL DOES NOT REPLACE THE RELEASED ONE", draftFirst.gross.impeller === 10,
  String(draftFirst.gross.impeller));
const onlyDraft = explode([{ id: "y", product: "Pump A", quantity: 4 }],
  [{ id: "rev2", product: "Pump A", status: "Draft" }], []);
ok("an order whose only bill is a Draft is reported as having none", onlyDraft.noBom.length === 1);

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

// RETIRED AND DOWN STATIONS COUNTED AS AVAILABLE — the status never reached
// this. A retired machine is not a lane and its work has nowhere to happen; a
// down one keeps its lane and is over with anything on it.
const statusCap = capacityLoad(
  [{ id: "r1", product: "P", quantity: 3, station: "Old press" }, { id: "d1", product: "P", quantity: 2, station: "Lathe" }],
  [{ id: "sr", name: "Old press", capacityPerDay: 10, status: "Retired" },
    { id: "sd", name: "Lathe", capacityPerDay: 10, status: "Down" }],
);
ok("A RETIRED STATION IS NOT A LANE", !statusCap.stations.some((s) => s.name === "Old press"));
ok("...and work sent to it is reported", statusCap.unstationed.some((o) => o.id === "r1"));
const lathe = statusCap.stations.find((s) => s.name === "Lathe");
ok("A DOWN STATION WITH WORK ON IT IS OVER", lathe.down === true && lathe.over === true && lathe.days === null);

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
ok("the planner names some types at all", new Set(asked).size === 3, String(new Set(asked).size));
for (const key of asked) {
  ok(`the planner reads a type that exists: ${key}`, builtins.includes(`key: "${key}"`));
}

console.log(fails ? `\nmrp model: ${fails} FAILURES\n` : "\nmrp model: all passed\n");
process.exit(fails ? 1 : 0);
