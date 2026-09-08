// FREIGHT, DUTY AND HANDLING SPREAD OVER THE GOODS THEY CAME WITH.
//
// Pure, so it needs no database. The assertion that matters most is the one
// about rounding: if the allocated shares do not sum to the charge exactly, a
// studio's landed total is a penny short of what it paid on every shipment,
// forever, and nobody ever finds out why.

import {
  landedCost, chargeProblem, BASES, isBasis, DEFAULT_BASIS,
} from "../src/modules/logistics/landedCost.ts";

let fails = 0;
const ok = (msg, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(` FAIL  ${msg}${detail ? `  — ${detail}` : ""}`); }
  else console.log(`  ok   ${msg}`);
};

const line = (id, qty, unitPrice, itemId = id) => ({ id, itemId, qty, unitPrice });
const charge = (id, kind, amount) => ({ id, kind, amount });

console.log("\n== the bases");

ok("there are two", BASES.length === 2);
ok("the default is one of them", isBasis(DEFAULT_BASIS));
// WEIGHT IS DELIBERATELY ABSENT. A freight invoice is priced on weight and no
// line in this product carries one; offering the basis and approximating it by
// value is what every ERP that stores two and offers three ends up doing.
ok("weight is not offered", !isBasis("weight"));

console.log("\n== spreading by value");

// 1,000 of goods (one line 800, one 200) and 100 of freight: 80 / 20.
const byValue = landedCost(
  [line("a", 8, 100), line("b", 2, 100)],
  [charge("f", "Freight", 100)],
  "value",
);
ok("each line takes its share of the value", byValue.lines[0].charges === 80 && byValue.lines[1].charges === 20,
  JSON.stringify(byValue.lines.map((l) => l.charges)));
ok("the goods are unchanged", byValue.goods === 1000);
ok("the landed total is goods plus charges", byValue.landed === 1100);
ok("a unit landed cost follows", byValue.lines[0].unitLanded === 110, String(byValue.lines[0].unitLanded));

console.log("\n== spreading by quantity");

// The SAME shipment by quantity: 10 units, so 10 each, and the dear line no
// longer carries more. This is the case that proves the basis is honoured
// rather than ignored.
const byQty = landedCost(
  [line("a", 8, 100), line("b", 2, 100)],
  [charge("f", "Freight", 100)],
  "quantity",
);
ok("units carry the charge, not value", byQty.lines[0].charges === 80 && byQty.lines[1].charges === 20,
  JSON.stringify(byQty.lines.map((l) => l.charges)));

// ...and where value and quantity genuinely differ, they give different answers.
const cheapBulk = [line("a", 1, 900), line("b", 9, 10)];
const v = landedCost(cheapBulk, [charge("f", "Freight", 100)], "value");
const q = landedCost(cheapBulk, [charge("f", "Freight", 100)], "quantity");
ok("value loads the expensive line", v.lines[0].charges === 90.91, String(v.lines[0].charges));
ok("quantity loads the bulky one", q.lines[0].charges === 10, String(q.lines[0].charges));
ok("...so the two bases really do differ", v.lines[0].charges !== q.lines[0].charges);

console.log("\n== the parts add to the whole, always");

// THE ROUNDING CASE. Three equal lines splitting 100 gives 33.33 three times =
// 99.99. The last line takes the remainder so the total is exact.
const thirds = landedCost(
  [line("a", 1, 100), line("b", 1, 100), line("c", 1, 100)],
  [charge("f", "Freight", 100)],
);
ok("three-way split still sums to the charge", thirds.charges === 100,
  JSON.stringify(thirds.lines.map((l) => l.charges)));
ok("...and the last line carries the odd cent",
  thirds.lines[2].charges === 33.34, String(thirds.lines[2].charges));
ok("...nothing is left over", thirds.unallocated === 0);

// Several charges, awkward numbers, still exact.
const many = landedCost(
  [line("a", 3, 33.33), line("b", 7, 11.11), line("c", 1, 0.01)],
  [charge("f", "Freight", 77.77), charge("d", "Duty", 12.34), charge("h", "Handling", 5)],
);
ok("several charges still sum exactly", many.charges === round2(77.77 + 12.34 + 5),
  `${many.charges}`);
ok("...and the landed total is goods plus charges",
  many.landed === round2(many.goods + many.charges));
function round2(n) { return Math.round(n * 100) / 100; }

console.log("\n== money that has nothing to land on");

// A FREE-OF-CHARGE SHIPMENT still cost freight, and that is real money. There is
// no value to allocate ON, so it comes back reported rather than vanishing or
// being divided by nought.
const foc = landedCost([line("a", 5, 0)], [charge("f", "Freight", 50)], "value");
ok("charges with no value to spread over are reported", foc.unallocated === 50, String(foc.unallocated));
ok("...and nothing is invented on the line", foc.lines[0].charges === 0);
// ...but by QUANTITY the same shipment allocates fine, because there ARE units.
const focQty = landedCost([line("a", 5, 0)], [charge("f", "Freight", 50)], "quantity");
ok("the same shipment allocates by quantity", focQty.lines[0].charges === 50 && focQty.unallocated === 0);

ok("no lines at all leaves the charge unallocated",
  landedCost([], [charge("f", "Freight", 25)]).unallocated === 25);
ok("no charges is a shipment at cost",
  landedCost([line("a", 2, 50)], []).landed === 100);
ok("neither is an empty result, not a throw",
  landedCost([], []).landed === 0);

console.log("\n== the ragged edges");

const zeroQty = landedCost([line("a", 0, 100), line("b", 4, 100)], [charge("f", "Freight", 40)], "quantity");
ok("a line with no units carries no charge", zeroQty.lines[0].charges === 0);
// NEVER A DIVISION BY NOUGHT: no units means no unit cost, and "0.00 each"
// would be a different and wrong claim.
ok("...and reports no unit cost rather than nought", zeroQty.lines[0].unitLanded === null);

const negatives = landedCost([line("a", -5, -10)], [charge("f", "Freight", -20)]);
ok("negative quantities, prices and charges are floored at nothing",
  negatives.goods === 0 && negatives.charges === 0, JSON.stringify(negatives));

console.log("\n== what is not a charge");

ok("a charge needs a kind", chargeProblem({ kind: "", amount: 10 }) === "kind");
ok("a charge needs an amount", chargeProblem({ kind: "Freight", amount: 0 }) === "amount");
ok("a negative is not an amount", chargeProblem({ kind: "Freight", amount: -5 }) === "amount");
ok("a good one passes", chargeProblem({ kind: "Freight", amount: 10 }) === "");

console.log(fails ? `\nlanded cost model: ${fails} FAILURES\n` : "\nlanded cost model: all passed\n");
process.exit(fails ? 1 : 0);
