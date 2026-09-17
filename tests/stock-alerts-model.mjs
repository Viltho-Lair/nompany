// STOCK AT ITS REORDER LEVEL, PURELY (17/09/2026) — modules/inventory/stockLevels.
//
// THE DEFECTS THESE GUARD: an item AT its level is low (the level is where you
// reorder, not one past it); an item with no level is never low, because
// nothing says when it would be; a fall is announced once — a later sale of an
// item already low is not a new fall; and the list puts what is out first.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const L = await import("@/modules/inventory/stockLevels");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== where an item stands");
ok("at its level is low", L.stockState(10, 10) === "below");
ok("under it is low", L.stockState(3, 10) === "below");
ok("out of stock is low", L.stockState(0, 10) === "below" && L.stockState(-2, 10) === "below");
ok("within 20% above is close", L.stockState(12, 10) === "near" && L.stockState(10.5, 10) === "near");
ok("past that is fine", L.stockState(12.1, 10) === "ok");
ok("no level is never low", L.stockState(0, 0) === "ok" && L.stockState(0, undefined) === "ok");
ok("the margin is 20%", L.NEAR_MARGIN === 0.2);

console.log("\n== a fall");
ok("from above to the level is a fall", L.fellToLevel(11, 10, 10));
ok("from above to under is a fall", L.fellToLevel(15, 4, 10));
ok("already low and lower is not a new fall", !L.fellToLevel(8, 5, 10));
ok("staying above is not a fall", !L.fellToLevel(20, 11, 10));
ok("no level, no fall", !L.fellToLevel(5, 0, 0));

console.log("\n== the list");
const items = [
  { id: "a", name: "Cable", sku: "C1", unit: "m", reorderLevel: 10 },
  { id: "b", name: "Bolts", sku: "B1", unit: "pcs", reorderLevel: 100 },
  { id: "c", name: "Tape", sku: "T1", unit: "roll", reorderLevel: 5 },
  { id: "d", name: "Glue", sku: "G1", unit: "tube", reorderLevel: 0 },
  { id: "e", name: "Paint", sku: "P1", unit: "l", reorderLevel: 10 },
];
const rows = L.reorderList(items, { a: 11, b: 20, c: 0, d: 0, e: 50 });
ok("fine and unlevelled items are left out", rows.map((r) => r.itemId).join() === "c,b,a", rows.map((r) => r.itemId).join());
ok("low comes before close, emptiest first", rows[0].state === "below" && rows[1].state === "below" && rows[2].state === "near");
ok("each row carries what the screen shows", rows[2].onHand === 11 && rows[2].reorderLevel === 10 && rows[2].unit === "m");

console.log(fails ? `\nstock alerts model: ${fails} FAILURES\n` : "\nstock alerts model: all passed\n");
process.exitCode = fails ? 1 : 0;
