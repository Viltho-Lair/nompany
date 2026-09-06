// EXPEDITING, PURELY. No store, no routes, no fixtures.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a supplier's slippage disappearing
// the moment they re-promise. If a revised date overwrites the original, an
// order that was promised in March, re-promised in April and delivered in May
// is indistinguishable from one delivered exactly when it was promised — and
// the difference is the whole input to supplier rating, which is this section's
// next bullet but one.
//
// So `expectedAt` is never written again after the order is placed, `promisedAt`
// carries the current promise, and `slippedDays` is the arithmetic between them.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/procurement/expediting");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const TODAY = "2031-03-20";
const order = (over) => ({
  id: "o1", reference: "PO-0001", vendorId: "v1", status: "Ordered",
  lines: [{ qty: 10, received: 0 }],
  ...over,
});

console.log("\n== days, counted in UTC");

ok("a week apart is seven", M.daysBetween("2031-03-01", "2031-03-08") === 7);
ok("...and backwards is minus seven", M.daysBetween("2031-03-08", "2031-03-01") === -7);
ok("the same day is nought", M.daysBetween("2031-03-01", "2031-03-01") === 0);
// A MISSING DATE IS NOT DAY ZERO. Null, so nothing downstream reads "no date"
// as "due today".
ok("a missing date is null, not zero", M.daysBetween("", "2031-03-01") === null);
ok("...from either side", M.daysBetween("2031-03-01", null) === null);
// ACROSS A MONTH BOUNDARY, which is where a naive implementation drifts.
ok("month boundaries are counted correctly",
  M.daysBetween("2031-02-25", "2031-03-04") === 7, String(M.daysBetween("2031-02-25", "2031-03-04")));

console.log("\n== the original promise survives the second one");

// THE ASSERTION THIS FILE EXISTS FOR. Promised the 1st, re-promised the 15th.
const slipped = M.expediteOrders(
  [order({ expectedAt: "2031-03-01", promisedAt: "2031-03-15" })], TODAY);
const s = slipped.orders[0];
ok("the original promise is still readable", s.expectedAt === "2031-03-01", s.expectedAt);
ok("...the current one is what it is due against", s.dueAt === "2031-03-15", s.dueAt);
ok("...AND THE SLIP IS VISIBLE", s.slippedDays === 14, String(s.slippedDays));
// Late is measured against the CURRENT promise, not the original — a supplier
// who re-promised and then met it is five days late, not nineteen.
ok("lateness is measured against the promise in force", s.lateDays === 5, String(s.lateDays));

// NULL WHEN IT HAS NOT MOVED, never 0: a supplier who never re-promised and one
// who re-promised by nothing are different, and only the first is silence.
const steady = M.expediteOrders([order({ expectedAt: "2031-03-01" })], TODAY).orders[0];
ok("an order never re-promised has no slip, not a slip of zero",
  steady.slippedDays === null, String(steady.slippedDays));
ok("...and is due against its original date", steady.dueAt === "2031-03-01");

console.log("\n== buckets");

const mixed = M.expediteOrders([
  order({ id: "late", expectedAt: "2031-03-01" }),                       // 19 days late
  order({ id: "soon", expectedAt: "2031-03-24" }),                       // due in 4
  order({ id: "far", expectedAt: "2031-06-01" }),                        // months away
  order({ id: "none", expectedAt: "" }),                                 // no date at all
], TODAY);
const by = Object.fromEntries(mixed.orders.map((o) => [o.id, o]));
ok("an overdue order is late", by.late.bucket === "late", by.late.bucket);
ok("...one inside the week is due soon", by.soon.bucket === "due-soon", by.soon.bucket);
ok("...one beyond it is on track", by.far.bucket === "on-track", by.far.bucket);
// AN ORDER WITH NO DATE IS NOT ON TRACK. Nobody promised anything, which is a
// different problem from a promise being kept, and it needs its own bucket or
// it hides in the healthy column.
ok("...and one with no date is undated, not on track", by.none.bucket === "undated", by.none.bucket);
ok("...with null rather than a fabricated lateness", by.none.lateDays === null);
ok("the counts add up", mixed.late === 1 && mixed.dueSoon === 1 && mixed.undated === 1,
  JSON.stringify({ late: mixed.late, soon: mixed.dueSoon, undated: mixed.undated }));

// SORTED BY HOW LATE, latest first, with undated last — `lateDays` is signed so
// one comparison does it.
ok("the latest is first", mixed.orders[0].id === "late", mixed.orders[0].id);
ok("...and the undated is last", mixed.orders[mixed.orders.length - 1].id === "none");

console.log("\n== nobody is waiting for these");

for (const status of ["Draft", "Cancelled", "Received"]) {
  ok(`a ${status.toLowerCase()} order is not chased`,
    M.expediteOrders([order({ status, expectedAt: "2031-03-01" })], TODAY).orders.length === 0);
}
ok("...and an outstanding one is",
  M.expediteOrders([order({ status: "Partly received", expectedAt: "2031-03-01" })], TODAY)
    .orders.length === 1);

console.log("\n== partly delivered is a different problem from untouched");

const part = M.expediteOrders([order({
  id: "p", expectedAt: "2031-03-01", lines: [{ qty: 10, received: 9 }],
})], TODAY).orders[0];
ok("a mostly-delivered order is marked partly", part.partly === true);
ok("...with what is left stated", Math.abs(part.outstandingFraction - 0.1) < 1e-9,
  String(part.outstandingFraction));
const untouched = M.expediteOrders([order({ id: "u", expectedAt: "2031-03-01" })], TODAY).orders[0];
ok("an untouched one is not", untouched.partly === false);
ok("...with all of it outstanding", untouched.outstandingFraction === 1);
// OVER-DELIVERY IS NOT NEGATIVE OUTSTANDING. It is a stock question, not an
// expediting one, so the fraction floors at nought.
const over = M.expediteOrders([order({ lines: [{ qty: 10, received: 14 }], expectedAt: "2031-03-01" })], TODAY).orders[0];
ok("over-delivery floors at nothing outstanding", over.outstandingFraction === 0,
  String(over.outstandingFraction));
ok("an order with no lines has no fraction, not zero",
  M.expediteOrders([order({ lines: [], expectedAt: "2031-03-01" })], TODAY).orders[0]
    .outstandingFraction === null);

console.log("\n== who has been chased");

const chased = M.expediteOrders([order({
  expectedAt: "2031-03-01",
  chases: [
    { at: "2031-03-05", note: "left a message" },
    { at: "2031-03-12", note: "spoke to the yard", promisedAt: "2031-03-15" },
  ],
})], TODAY).orders[0];
ok("chases are counted", chased.chases === 2, String(chased.chases));
// THE LATEST, not the last in the array — a chase typed in out of order must
// not make the record look staler than it is.
ok("...and the LATEST is the last chased date", chased.lastChasedAt === "2031-03-12",
  chased.lastChasedAt);

// THE NUMBER THE SCREEN EXISTS TO MAKE SMALL. Late and never chased is the case
// where the studio is the problem rather than the supplier.
const unchased = M.expediteOrders([
  order({ id: "a", expectedAt: "2031-03-01" }),
  order({ id: "b", expectedAt: "2031-03-01", chases: [{ at: "2031-03-10" }] }),
  order({ id: "c", expectedAt: "2031-06-01" }),
], TODAY);
ok("late and never chased is counted", unchased.unchased === 1, String(unchased.unchased));
// NOT "not chased recently": a studio that has rung once about a three-week
// delay has done something, and lumping it with one that has rung about
// nothing would make the number unusable.
ok("...and a late order chased once is not in it",
  unchased.orders.find((o) => o.id === "b").chases === 1);

console.log("\n== survivable inputs");

ok("a non-array is empty", M.expediteOrders(null, TODAY).orders.length === 0);
ok("no clock still returns rows", M.expediteOrders([order({ expectedAt: "2031-03-01" })], "").orders.length === 1);
ok("...with lateness null rather than guessed",
  M.expediteOrders([order({ expectedAt: "2031-03-01" })], "").orders[0].lateDays === null);

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
