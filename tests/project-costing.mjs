// A PROJECT'S COST REPORT, PURELY. No store, no routes, no fixtures.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a cost report that understates a
// project. Money that nobody filed properly — an uncoded bill, a bill coded to
// a code somebody has since deleted — is still money the project spent, and a
// report that quietly dropped it would say a job was inside its budget for
// exactly as long as its paperwork was behind. Every total below is asserted
// against that.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const C = await import("@/modules/projects/costing");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const code = (id, budget, over = {}) => ({ id, code: id.toUpperCase(), name: id, budget, ...over });
const bill = (costCodeId, total, status = "Received") => ({ costCodeId, total, status });

console.log("\n== what counts as spend");

// A COST IS INCURRED WHEN THE SUPPLIER INVOICES, not when Finance signs.
// Approval authorises PAYMENT; a report that waited for it would say a project
// was under budget for exactly as long as its paperwork was behind.
ok("a received but unapproved bill is spend", C.isSpend(bill("a", 10, "Received")));
ok("an approved one is", C.isSpend(bill("a", 10, "Approved")));
ok("a paid one is", C.isSpend(bill("a", 10, "Paid")));
ok("a disputed one still is — the invoice exists", C.isSpend(bill("a", 10, "Disputed")));
// NEITHER OF THESE IS MONEY ANYBODY OWES.
ok("a draft is not", !C.isSpend(bill("a", 10, "Draft")));
ok("a cancelled one is not", !C.isSpend(bill("a", 10, "Cancelled")));

console.log("\n== the roll-up");

const codes = [code("earth", 50000), code("frame", 120000)];
const spent = [
  bill("earth", 20000), bill("earth", 5000),
  bill("frame", 130000),
  bill("earth", 999, "Draft"),
];
const r = C.projectCosting(codes, spent, [], 400000);

ok("each code sums its own bills", r.codes[0].actual === 25000, String(r.codes[0].actual));
ok("...and drafts are not among them", r.codes[0].actual === 25000);
ok("remaining is what is left of the allowance", r.codes[0].remaining === 25000);
ok("...and goes NEGATIVE rather than clamping", r.codes[1].remaining === -10000,
  String(r.codes[1].remaining));
ok("a code past its allowance says so", r.codes[1].over === true && r.codes[0].over === false);
ok("used is a fraction of the budget", r.codes[0].used === 0.5, String(r.codes[0].used));

// NULL, NOT ZERO. Nought spent against nought allowed is not "0% used" — it is
// a code nobody has budgeted, and an empty progress bar says the opposite.
const unbudgeted = C.projectCosting([code("x", 0)], [], [], 0);
ok("a code with no budget has no percentage", unbudgeted.codes[0].used === null);
// And it is over the moment anything is spent on it: the money went somewhere
// nobody allowed for.
const unbudgetedSpent = C.projectCosting([code("x", 0)], [bill("x", 1)], [], 0);
ok("...and is over as soon as anything is spent on it", unbudgetedSpent.codes[0].over === true);

console.log("\n== money nobody filed properly");

// THE ASSERTION THIS FILE EXISTS FOR, first half: a bill on the project naming
// no code is real money.
const withUncoded = C.projectCosting(codes, [...spent, bill("", 7000)], [], 400000);
ok("an uncoded bill is not dropped", withUncoded.uncoded === 7000, String(withUncoded.uncoded));
ok("...and reaches the project's actual", withUncoded.actual === 162000, String(withUncoded.actual));
ok("...without landing on any code", withUncoded.codes.reduce((n, c) => n + c.actual, 0) === 155000);

// Second half, and it is the subtler one: a code DELETED after bills were filed
// against it would otherwise take their money out of the report entirely — the
// total would drop and nothing would say why.
const orphaned = C.projectCosting(codes, [...spent, bill("deleted-code", 3000)], [], 400000);
ok("spend coded to a code that no longer exists is still spend",
  orphaned.uncoded === 3000, String(orphaned.uncoded));
ok("...and the project's total does not quietly fall", orphaned.actual === 158000,
  String(orphaned.actual));

console.log("\n== the project's own totals");

ok("budget is the sum of the allowances", r.budget === 170000, String(r.budget));
ok("actual is every coded bill plus the uncoded", r.actual === 155000, String(r.actual));
ok("remaining is budget less actual", r.remaining === 15000, String(r.remaining));

// UNALLOCATED IS THE PROJECT'S VALUE LESS WHAT HAS BEEN BUDGETED. Positive
// means the breakdown does not yet account for the whole job.
ok("unallocated is what the breakdown has not accounted for",
  r.unallocated === 230000, String(r.unallocated));
// NEGATIVE is a decision somebody should look at, not an error: more has been
// allowed for than the job is worth.
const overAllocated = C.projectCosting([code("a", 500)], [], [], 100);
ok("...and goes negative when more is budgeted than the job is worth",
  overAllocated.unallocated === -400, String(overAllocated.unallocated));

ok("a project inside every allowance with nothing uncoded is clean",
  C.projectCosting([code("a", 100)], [bill("a", 50)], [], 100).clean === true);
ok("...one uncoded bill is enough to make it not",
  C.projectCosting([code("a", 100)], [bill("", 1)], [], 100).clean === false);
ok("...and so is one code over", r.clean === false);

ok("nothing at all totals to nothing rather than throwing",
  C.projectCosting([], [], [], 0).actual === 0 && C.projectCosting(null, null).budget === 0);

console.log("\n== a breakdown proposed from a bill of quantities");

// THE BILL'S GROUPS ARE ALREADY A BREAKDOWN, priced by whoever worked out what
// the job was worth. Making a studio retype them would be asking for the same
// list twice.
const proposed = C.codesFromBill([
  { group: "Preliminaries", totals: { total: 25000 } },
  { group: "Finishes", totals: { total: 32400 } },
]);
ok("a code is proposed per bill group", proposed.length === 2);
ok("...named as the bill named it", proposed[0].name === "Preliminaries");
ok("...budgeted at what that group was sold for", proposed[0].budget === 25000);
// Numbered rather than named, so the reference sorts and cannot collide with a
// group somebody renames.
ok("...with a reference that sorts", proposed.map((p) => p.code).join() === "01,02",
  proposed.map((p) => p.code).join());
// An unnamed group is still a real section of the bill.
ok("an unnamed group still gets a row",
  C.codesFromBill([{ group: "", totals: { total: 1 } }])[0].name === "Section 1");
ok("nonsense proposes nothing", C.codesFromBill(null).length === 0);

console.log("\n== what has been promised but not yet invoiced");

const order = (id, costCodeId, total, status = "Ordered") => ({ id, costCodeId, total, status });
const billOn = (costCodeId, total, orderId, status = "Received") => ({ costCodeId, total, orderId, status });

// A DRAFT ORDER WAS NEVER PLACED WITH ANYBODY and a cancelled one was
// withdrawn. Neither is money the studio has promised.
ok("a placed order is a commitment", C.isPlaced(order("o", "a", 10)));
ok("...and one partly received still is", C.isPlaced(order("o", "a", 10, "Partly received")));
// RECEIVED IS STILL A COMMITMENT until it is INVOICED. An order stops being
// one when the supplier asks to be paid, not when the goods turn up.
ok("...as is one fully received but not yet invoiced", C.isPlaced(order("o", "a", 10, "Received")));
ok("a draft order is not", !C.isPlaced(order("o", "a", 10, "Draft")));
ok("a cancelled one is not", !C.isPlaced(order("o", "a", 10, "Cancelled")));

const c1 = [code("fit", 100000)];

// NOTHING INVOICED YET: the whole order is committed.
const openOrder = C.projectCosting(c1, [], [order("o1", "fit", 40000)], 200000);
ok("an order nobody has invoiced is committed in full",
  openOrder.codes[0].committed === 40000, String(openOrder.codes[0].committed));
ok("...and is not spend", openOrder.codes[0].actual === 0);

// THE ASSERTION THIS SLICE TURNS ON. An order stops being a commitment AS it
// is billed -- counting a fully invoiced order as still committed would double
// every cost the moment its goods arrived.
const halfBilled = C.projectCosting(c1, [billOn("fit", 15000, "o1")], [order("o1", "fit", 40000)], 200000);
ok("an order is netted against what has been invoiced on it",
  halfBilled.codes[0].committed === 25000, String(halfBilled.codes[0].committed));
ok("...and what was invoiced is spend", halfBilled.codes[0].actual === 15000);
ok("...so the two never double-count",
  halfBilled.codes[0].actual + halfBilled.codes[0].committed === 40000);

// OVER-INVOICING AN ORDER IS REAL, and it is not a negative commitment: the
// excess is already in `actual`, where it belongs.
const overBilled = C.projectCosting(c1, [billOn("fit", 55000, "o1")], [order("o1", "fit", 40000)], 200000);
ok("an over-invoiced order commits nothing further", overBilled.codes[0].committed === 0,
  String(overBilled.codes[0].committed));
ok("...and the excess is spend, not a credit", overBilled.codes[0].actual === 55000);

// A BILL AGAINST AN ORDER INHERITS THE ORDER'S CODE. Somebody codes the
// purchase order once and every invoice answering it follows, which is what
// keeps `uncoded` down to what genuinely has not been filed.
const inherited = C.projectCosting(c1, [billOn("", 9000, "o1")], [order("o1", "fit", 40000)], 200000);
ok("an uncoded bill inherits the code of the order it answers",
  inherited.codes[0].actual === 9000 && inherited.uncoded === 0,
  JSON.stringify({ actual: inherited.codes[0].actual, uncoded: inherited.uncoded }));
// The invoice is the later and more specific decision, so its own code wins.
const ownCode = C.projectCosting(
  [code("fit", 100000), code("other", 100000)],
  [billOn("other", 9000, "o1")], [order("o1", "fit", 40000)], 200000);
ok("...but a bill with a code of its own keeps it",
  ownCode.codes[1].actual === 9000 && ownCode.codes[0].actual === 0);

// AN UNCODED ORDER IS KEPT APART FROM AN UNCODED BILL: the two are fixed in
// different places -- one is a bill Finance has not filed, the other a purchase
// order Procurement has not.
const looseOrder = C.projectCosting(c1, [], [order("o9", "", 7000)], 200000);
ok("an order coded to nothing is uncommitted, not dropped",
  looseOrder.uncommitted === 7000, String(looseOrder.uncommitted));
ok("...and does not land on any code", looseOrder.codes[0].committed === 0);
const orphanOrder = C.projectCosting(c1, [], [order("o9", "deleted", 7000)], 200000);
ok("an order coded to a code that no longer exists is uncommitted too",
  orphanOrder.uncommitted === 7000, String(orphanOrder.uncommitted));

console.log("\n== the forecast");

// UNDER ITS ALLOWANCE, THE BUDGET STANDS. The work is not done, and reporting
// the money not yet promised as a saving would show every project under budget
// on the day it opened.
const early = C.projectCosting(c1, [billOn("fit", 10000, "o1")], [order("o1", "fit", 40000)], 200000);
ok("a code inside its allowance forecasts at the budget",
  early.codes[0].forecast === 100000, String(early.codes[0].forecast));
ok("...with no variance", early.codes[0].variance === 0);
ok("...and is not flagged", early.codes[0].over === false && early.codes[0].willOverrun === false);

// PAST IT, THE SUMS ARE THE FORECAST: a code already over will not come back
// down.
const late = C.projectCosting(c1, [billOn("fit", 90000, "o1")], [order("o1", "fit", 120000)], 200000);
ok("a code heading past its allowance forecasts at what it has plus what it owes",
  late.codes[0].forecast === 120000, String(late.codes[0].forecast));
ok("...and says the overrun before it happens",
  late.codes[0].variance === -20000 && late.codes[0].willOverrun === true,
  JSON.stringify({ v: late.codes[0].variance, w: late.codes[0].willOverrun }));
// TWO DIFFERENT FLAGS, acted on differently: one is a number to explain, the
// other an order somebody could still stop.
ok("...but has not overspent yet", late.codes[0].over === false);
const spentOver = C.projectCosting(c1, [bill("fit", 110000)], [], 200000);
ok("a code already past its allowance is over, not merely heading there",
  spentOver.codes[0].over === true && spentOver.codes[0].willOverrun === false);

// THE PROJECT'S FORECAST IS THE SUM OF ITS CODES', not a maximum over the
// totals. Taking the maximum at the top would let a code running under its
// allowance cancel one running over, and the whole point of a breakdown is
// that those two do not cancel.
const mixed = C.projectCosting(
  [code("a", 100), code("b", 100)],
  [bill("b", 150)], [], 400);
ok("an under-running code does not cancel an over-running one",
  mixed.forecast === 250, String(mixed.forecast));
ok("...and the project's variance says so", mixed.variance === -50, String(mixed.variance));

// Unfiled money has no budget to be under, so it joins the forecast at face
// value rather than being absorbed by somebody else's allowance.
const unfiled = C.projectCosting([code("a", 100)], [bill("", 30)], [order("o", "", 20)], 400);
ok("unfiled spend and commitments join the forecast at face value",
  unfiled.forecast === 150, String(unfiled.forecast));
ok("a project with anything unfiled is not clean", unfiled.clean === false);
ok("...nor is one merely heading over",
  C.projectCosting(c1, [], [order("o", "fit", 200000)], 400).clean === false);

console.log("\n== the file stays pure");

const { readFileSync } = await import("node:fs");
const src = readFileSync(new URL("../src/modules/projects/costing.ts", import.meta.url), "utf8");
ok("modules/projects/costing imports nothing",
  [...src.matchAll(/from\s+"([^"]+)"/g)].length === 0);

// THERE IS A FORECAST NOW, and it is the reason purchase orders had to carry a
// code first. A projection that ignored committed cost would read as complete
// while silently missing every order already placed.
ok("the roll-up forecasts", typeof r.forecast === "number");

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
