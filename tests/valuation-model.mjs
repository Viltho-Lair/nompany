// WHAT STOCK ON HAND IS WORTH, under each method.
//
// Pure, so it needs no database. The case that matters most is the one where
// the two methods DISAGREE — if a test only ever used a single cost, both would
// pass and neither would be being tested.

import {
  valueItem, valueStock, VALUATION_METHODS, isValuationMethod, DEFAULT_METHOD,
} from "../src/modules/inventory/valuation.ts";

let fails = 0;
const ok = (msg, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(` FAIL  ${msg}${detail ? `  — ${detail}` : ""}`); }
  else console.log(`  ok   ${msg}`);
};

const inQ = (qty, unitCost, at) => ({ itemId: "i1", qty, unitCost, at });
const out = (qty, at) => ({ itemId: "i1", qty: -qty, at });

console.log("\n== the methods");

ok("there are two", VALUATION_METHODS.length === 2);
ok("the default is one of them", isValuationMethod(DEFAULT_METHOD));
ok("a made-up method is not one", !isValuationMethod("lifo"));

console.log("\n== the case where the two genuinely disagree");

// Five at 100 then five at 200, issue five. FIFO consumes the cheap batch, so
// what is LEFT is the dear one: 5 x 200 = 1000. Weighted average holds one cost
// of 150, so what is left is 5 x 150 = 750. A test using a single cost would
// pass under both and be testing nothing.
const mixed = [inQ(5, 100, "2026-01-01"), inQ(5, 200, "2026-02-01"), out(5, "2026-03-01")];

const fifo = valueItem(mixed, "fifo");
ok("FIFO leaves the later, dearer batch", fifo.value === 1000, String(fifo.value));
ok("...with the same count either way", fifo.qty === 5);
ok("...and a unit value that follows", fifo.unitValue === 200, String(fifo.unitValue));

const avg = valueItem(mixed, "average");
ok("AVERAGE leaves the blended cost", avg.value === 750, String(avg.value));
ok("...same count", avg.qty === 5);
ok("...and unit value", avg.unitValue === 150, String(avg.unitValue));

// THE PROPERTY THAT DEFINES THE METHOD: an issue must not disturb the running
// cost. Issue first, then receive dearer stock — the average of what remains
// has to reflect only the receipts, not the order they were consumed in.
const avgOrder = valueItem([
  inQ(10, 100, "2026-01-01"), out(5, "2026-01-15"), inQ(5, 200, "2026-02-01"),
], "average");
ok("an issue leaves the running cost alone", avgOrder.qty === 10 && avgOrder.value === 1500,
  JSON.stringify({ qty: avgOrder.qty, value: avgOrder.value }));

console.log("\n== order is by time, not by the order they were handed over");

// Movements arrive from the store in whatever order it returns them; FIFO is
// meaningless if it consumes in that order rather than in time order.
const shuffled = valueItem([
  out(5, "2026-03-01"), inQ(5, 200, "2026-02-01"), inQ(5, 100, "2026-01-01"),
], "fifo");
ok("FIFO sorts by time before consuming", shuffled.value === 1000, String(shuffled.value));

console.log("\n== the ragged states a real ledger has");

// STOCK THAT WENT OUT AND WAS NEVER RECEIVED. A ledger nobody has back-filled
// really does contain this, and it must not make the queue negative — a
// negative queue would value the next receipt against a debt.
const oversold = valueItem([inQ(2, 100, "2026-01-01"), out(5, "2026-02-01")], "fifo");
ok("issuing more than was received leaves nothing, not a negative",
  oversold.qty === 0 && oversold.value === 0, JSON.stringify(oversold));
const oversoldAvg = valueItem([inQ(2, 100, "2026-01-01"), out(5, "2026-02-01")], "average");
ok("...under average too", oversoldAvg.qty === 0 && oversoldAvg.value === 0,
  JSON.stringify(oversoldAvg));

// NOTHING ON HAND IS NOT A DIVISION BY NOUGHT. "0.00 each" and "we hold none"
// are different facts.
ok("no stock means no unit value rather than a division by nought",
  oversold.unitValue === null);

// AN UNCOSTED RECEIPT VALUES AT NOUGHT AND SAYS SO. A studio whose receipts
// predate cost tracking gets a total that is honestly too low rather than a
// confident wrong one.
const partly = valueItem([inQ(5, 100, "2026-01-01"), inQ(5, 0, "2026-02-01")], "fifo");
ok("an uncosted receipt values at nothing", partly.value === 500, String(partly.value));
ok("...and is reported as uncosted units", partly.uncosted === 5, String(partly.uncosted));
ok("...never more than is on hand", partly.uncosted <= partly.qty);

console.log("\n== the whole stock");

const all = valueStock([
  { itemId: "a", qty: 10, unitCost: 5, at: "2026-01-01" },
  { itemId: "b", qty: 4, unitCost: 100, at: "2026-01-01" },
  { itemId: "c", qty: 3, unitCost: 10, at: "2026-01-01" },
  { itemId: "c", qty: -3, at: "2026-02-01" },
], "average");

ok("only what is on hand appears", all.items.map((i) => i.itemId).join(",") === "b,a",
  all.items.map((i) => i.itemId).join(","));
// AN ITEM BACK TO NOUGHT IS NOT A VALUATION LINE: that is a fact about its
// history, not about what the company holds today.
ok("...so an item that came back to nought is absent",
  !all.items.some((i) => i.itemId === "c"));
ok("most valuable first", all.items[0].itemId === "b");
ok("the total adds up", all.total === 450, String(all.total));
ok("the method travels with the answer", all.method === "average");

ok("no movements is an empty valuation, not a throw",
  valueStock([], "fifo").total === 0 && valueStock([], "fifo").items.length === 0);

console.log(fails ? `\nvaluation model: ${fails} FAILURES\n` : "\nvaluation model: all passed\n");
process.exit(fails ? 1 : 0);
