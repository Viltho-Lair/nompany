// GOODS RECEIPTS AND THE THREE-WAY MATCH, PURELY. No store, no routes.
//
// THE DEFECT THESE ASSERTIONS GUARD is a studio paying for goods that never
// arrived. Two of the three legs were already recorded and nothing compared
// them: an order knew what it asked for, a bill knew what it was charging, and
// the only record of what turned up was a running total nobody could walk back.
//
// THE SHARPEST ONE is the received leg. It is summed from the RECEIPTS, never
// read off `line.received` — reading the order's own total would make the match
// blind to exactly the drift it exists to catch, and every assertion below
// would still pass.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/procurement/receivingModel");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// Ten widgets at 100, so every figure below is legible: ordered 1000.
const order = {
  id: "o1", reference: "PO-0001", vendorId: "v1", status: "Ordered",
  lines: [{ itemId: "i1", description: "Widget", qty: 10, unitPrice: 100 }],
};
const grn = (over) => ({ orderId: "o1", receivedAt: "2031-05-01", ...over });
// A BILL IS SUMMED FROM ITS LINES, never from `total` — that field is derived
// on the way out and never stored, so a bill read back from the repository has
// none. An earlier draft of this fixture passed `total` directly and every
// assertion below still passed while the real path summed `undefined` as
// nought; Gate A found it. The helper takes a VALUE and shapes a line.
const bill = (value, over) => ({
  orderId: "o1", status: "Received",
  lines: [{ description: "Cement", qty: 1, unitPrice: value }],
  ...over,
});

console.log("\n== the three legs ==\n");

const none = M.threeWayMatch(order, [], []);
ok("an order with nothing against it is ordered only",
  none.orderedValue === 1000 && none.receivedValue === 0, String(none.orderedValue));
// NULL, NOT NOUGHT. "Nothing has been invoiced" and "invoiced for nought" are
// different facts and only the second is a mistake.
ok("BILLED IS NULL WITH NO BILL, NOT NOUGHT", none.billedValue === null, String(none.billedValue));
ok("...and variance is null with it", none.variance === null);
ok("...flagged as awaiting a bill", none.flags.includes("no-bill"));
ok("...and not flagged as over-billed", !none.flags.includes("over-billed"));
ok("...and not matched: an order with no bill is unfinished, not agreed", none.matched === false);

console.log("\n== received is summed from the receipts ==\n");

// TWO receipts, four then six. If anything read `line.received` off the order —
// which this fixture deliberately leaves at a WRONG value — the totals below
// would follow the order instead of the events.
const twoDrops = [
  grn({ id: "g1", lines: [{ itemId: "i1", qty: 4 }] }),
  grn({ id: "g2", lines: [{ itemId: "i1", qty: 6 }] }),
];
const lying = { ...order, lines: [{ ...order.lines[0], received: 999 }] };
const summed = M.threeWayMatch(lying, twoDrops, []);
ok("RECEIVED IS SUMMED FROM THE RECEIPTS, NOT READ OFF THE ORDER",
  summed.lines[0].receivedQty === 10, String(summed.lines[0].receivedQty));
ok("...valued at the order's own price", summed.receivedValue === 1000);
ok("...and the order counts as fully received", summed.fullyReceived === true);
ok("...with nothing outstanding", summed.lines[0].outstandingQty === 0);

const partial = M.threeWayMatch(order, [grn({ lines: [{ itemId: "i1", qty: 4 }] })], []);
ok("a part delivery is valued at what arrived", partial.receivedValue === 400);
ok("...with the remainder outstanding", partial.lines[0].outstandingQty === 6);
ok("...and flagged as part delivered", partial.flags.includes("part-delivered"));
ok("...and as received but not billed", partial.flags.includes("received-not-billed"));

console.log("\n== rejected goods are not received goods ==\n");

// Ten turned up, three were damaged and turned away at the gate.
const rejected = M.threeWayMatch(
  order, [grn({ lines: [{ itemId: "i1", qty: 7, rejected: 3, note: "Crushed" }] })], []);
ok("REJECTED IS EXCLUDED FROM THE RECEIVED VALUE",
  rejected.receivedValue === 700, String(rejected.receivedValue));
ok("...and reported in its own right", rejected.rejectedQty === 3);
// An invoice covering rejected goods is over-billing; a match that counted them
// as received would say the paperwork was fine.
const rejectedBilled = M.threeWayMatch(
  order,
  [grn({ lines: [{ itemId: "i1", qty: 7, rejected: 3 }] })],
  [bill(1000)]);
ok("...so billing for them is over-billing",
  rejectedBilled.flags.includes("over-billed") && rejectedBilled.variance === 300,
  String(rejectedBilled.variance));

console.log("\n== the flag the control exists for ==\n");

const overBilled = M.threeWayMatch(order, [grn({ lines: [{ itemId: "i1", qty: 4 }] })],
  [bill(1000)]);
ok("BILLED FOR MORE THAN TURNED UP IS FLAGGED", overBilled.flags.includes("over-billed"));
ok("...with the excess stated", overBilled.variance === 600, String(overBilled.variance));

const nothingIn = M.threeWayMatch(order, [], [bill(1000)]);
ok("billed with nothing received at all is its own flag",
  nothingIn.flags.includes("billed-not-received"), nothingIn.flags.join(","));

// A CANCELLED BILL IS NOT BILLED MONEY, and neither is a draft one.
const dead = M.threeWayMatch(order, twoDrops,
  [bill(1000, { status: "Cancelled" }), bill(500, { status: "Draft" })]);
ok("cancelled and draft bills are not counted", dead.billedValue === null, String(dead.billedValue));

const twoBills = M.threeWayMatch(order, twoDrops,
  [bill(600), bill(400)]);
ok("several bills against one order are summed", twoBills.billedValue === 1000);
ok("...and counted", twoBills.billCount === 2);
ok("...and that is a clean three-way match", twoBills.matched === true);
ok("...with no flags", twoBills.flags.length === 0, twoBills.flags.join(","));

// A bill for LESS than arrived is not an error — the rest is still coming.
const underBilled = M.threeWayMatch(order, twoDrops, [bill(400)]);
ok("billed for less than arrived is not flagged",
  !underBilled.flags.includes("over-billed"), underBilled.flags.join(","));
ok("...and the variance is negative", underBilled.variance === -600, String(underBilled.variance));
ok("...but it is not a match either", underBilled.matched === false);

console.log("\n== over-receipt is recorded, not refused ==\n");

// Eleven of ten. `receiveOrder` refuses this outright, which leaves the
// eleventh in the warehouse and nowhere else.
const over = M.threeWayMatch(order, [grn({ lines: [{ itemId: "i1", qty: 11 }] })], []);
ok("OVER-RECEIPT IS RECORDED AND FLAGGED", over.flags.includes("over-received"));
ok("...with the excess stated", over.lines[0].overReceivedQty === 1);
ok("...and nothing outstanding", over.lines[0].outstandingQty === 0);
ok("...valued at what actually arrived", over.receivedValue === 1100);

ok("remainingOn offers what is left", M.remainingOn(order, twoDrops, "i1") === 0);
ok("...and the screen and server agree on a part delivery",
  M.remainingOn(order, [grn({ lines: [{ itemId: "i1", qty: 4 }] })], "i1") === 6);
ok("...and an unknown line has nothing left", M.remainingOn(order, [], "nope") === 0);

console.log("\n== corrections ==\n");

// The whole reason the receipt is a record: a mistyped ten can be walked back.
const corrected = M.threeWayMatch(order, [
  grn({ id: "g1", lines: [{ itemId: "i1", qty: 10 }] }),
  grn({ id: "g2", correctionOf: "g1", lines: [{ itemId: "i1", qty: -6 }] }),
], []);
ok("A CORRECTION WALKS THE RECEIPT BACK", corrected.lines[0].receivedQty === 4,
  String(corrected.lines[0].receivedQty));
ok("...and the value follows it", corrected.receivedValue === 400);

console.log("\n== what the server refuses ==\n");

ok("a receipt against no order is refused",
  M.receiptProblem(grn({ lines: [{ itemId: "i1", qty: 1 }] }), null) === "notfound");
ok("...against a draft order too",
  M.receiptProblem(grn({ lines: [{ itemId: "i1", qty: 1 }] }), { ...order, status: "Draft" }) === "not-ordered");
ok("...and a cancelled one",
  M.receiptProblem(grn({ lines: [{ itemId: "i1", qty: 1 }] }), { ...order, status: "Cancelled" }) === "cancelled");
ok("a receipt of nothing is refused",
  M.receiptProblem(grn({ lines: [{ itemId: "i1", qty: 0 }] }), order) === "nothing");
// A bare negative is indistinguishable from a typo, and walking the total back
// is the entire reason this record exists.
ok("A NEGATIVE LINE OUTSIDE A CORRECTION IS REFUSED",
  M.receiptProblem(grn({ lines: [{ itemId: "i1", qty: -5 }] }), order) === "negative");
ok("...and a positive one INSIDE a correction",
  M.receiptProblem(grn({ correctionOf: "g1", lines: [{ itemId: "i1", qty: 5 }] }), order) === "correction-positive");
ok("a correction may be negative",
  M.receiptProblem(grn({ correctionOf: "g1", lines: [{ itemId: "i1", qty: -5 }] }), order) === null);
ok("a receipt with no date is refused",
  M.receiptProblem({ orderId: "o1", lines: [{ itemId: "i1", qty: 1 }] }, order) === "date");
ok("an ordinary receipt is allowed",
  M.receiptProblem(grn({ lines: [{ itemId: "i1", qty: 1 }] }), order) === null);
// Rejecting everything is still a receipt: a lorry that turned up and was sent
// away is exactly what this record is for.
ok("a receipt that only rejects is allowed",
  M.receiptProblem(grn({ lines: [{ itemId: "i1", qty: 0, rejected: 3 }] }), order) === null);

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
