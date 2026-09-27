// WHAT STOCK ON HAND IS WORTH, under each method.
//
// Pure, so it needs no database. The case that matters most is the one where
// the two methods DISAGREE — if a test only ever used a single cost, both would
// pass and neither would be being tested.

// THE ALIAS LOADER, because the module imports `@/shared/money` and plain
// Node does not know the `@/` alias (tests/loader.mjs resolves it).
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const {
  valueItem, valueStock, VALUATION_METHODS, isValuationMethod, DEFAULT_METHOD, costLedger,
} = await import("../src/modules/inventory/valuation.ts");

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

console.log("\n== a move between bins or batches changes where, never what it is worth");
// THE DEFECT: a put-away is a -q/+q pair of `adjust` rows. The -q half consumed
// FIFO or average cost and the +q half came back in at the item's CURRENT
// price-list cost, so every put-away silently replaced order and landed cost.
{
  const ledger = [
    { itemId: "i1", kind: "in", qty: 10, sourceType: "order", sourceId: "po1", at: "2026-01-01" },
    { itemId: "i1", kind: "adjust", qty: -10, sourceType: "bin-move", sourceId: "b1", at: "2026-02-01" },
    { itemId: "i1", kind: "adjust", qty: 10, sourceType: "bin-move", sourceId: "", at: "2026-02-01" },
  ];
  const lookups = { orderCost: () => 100, itemCost: () => 150 };
  for (const method of ["fifo", "average"]) {
    const v = valueItem(costLedger(ledger, lookups), method);
    ok(`a put-away keeps the order cost (${method})`, v.qty === 10 && v.value === 1000, JSON.stringify(v));
  }
  // FIFO ORDER SURVIVES A MOVE: the oldest layer is still the one an issue eats.
  const layered = [
    { itemId: "i1", kind: "in", qty: 5, sourceType: "order", sourceId: "cheap", at: "2026-01-01" },
    { itemId: "i1", kind: "in", qty: 5, sourceType: "order", sourceId: "dear", at: "2026-01-02" },
    { itemId: "i1", kind: "adjust", qty: -5, sourceType: "batch-move", at: "2026-01-03" },
    { itemId: "i1", kind: "adjust", qty: 5, sourceType: "batch-move", at: "2026-01-03" },
    { itemId: "i1", kind: "out", qty: 5, at: "2026-01-04" },
  ];
  const cost = { orderCost: (o) => (o === "cheap" ? 100 : 200), itemCost: () => 999 };
  const fifo = valueItem(costLedger(layered, cost), "fifo");
  ok("a batch move does not send the oldest layer to the back of the FIFO queue",
    fifo.qty === 5 && fifo.value === 1000, JSON.stringify(fifo));
  // A HALF-WRITTEN MOVE (the out landed, the in did not) still takes the units
  // out, because the ledger says they are gone.
  const half = valueItem(costLedger(ledger.slice(0, 2), lookups), "average");
  ok("a move whose second half never landed still takes the units out", half.qty === 0, JSON.stringify(half));
  ok("both halves of the pair are marked as a transfer",
    costLedger(ledger, lookups).filter((m) => m.transfer).length === 2);
}

console.log("\n== a work-order return is valued at what the order was charged");
// THE DEFECT: a return stores the unitCost the order was charged, and valuation
// ignored it for the item's price TODAY.
{
  const ledger = [
    { itemId: "i1", kind: "in", qty: 4, sourceType: "order", sourceId: "po1", at: "2026-01-01" },
    { itemId: "i1", kind: "out", qty: 2, sourceType: "workorder", sourceId: "wo1", unitCost: 50, at: "2026-01-02" },
    { itemId: "i1", kind: "in", qty: 2, sourceType: "workorder", sourceId: "wo1", unitCost: 50, at: "2026-01-03" },
  ];
  const costed = costLedger(ledger, { orderCost: () => 50, itemCost: () => 80 });
  ok("the return carries its stored cost, not today's price", costed[2].unitCost === 50, String(costed[2].unitCost));
  ok("...so the shelf is worth what it cost", valueItem(costed, "average").value === 200);
  ok("an adjustment with no stored cost still falls back to the item",
    costLedger([{ itemId: "i1", kind: "adjust", qty: 3 }], { orderCost: () => undefined, itemCost: () => 7 })[0].unitCost === 7);
  ok("an order receipt still prefers the order over a stored cost",
    costLedger([{ itemId: "i1", kind: "in", qty: 1, sourceType: "order", sourceId: "p", unitCost: 1 }],
      { orderCost: () => 9, itemCost: () => 7 })[0].unitCost === 9);
  ok("an out is signed negative",
    costLedger([{ itemId: "i1", kind: "out", qty: 3 }], { orderCost: () => 0, itemCost: () => 0 })[0].qty === -3);
}

console.log(fails ? `\nvaluation model: ${fails} FAILURES\n` : "\nvaluation model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
