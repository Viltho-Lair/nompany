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
const r = C.projectCosting(codes, spent, 400000);

ok("each code sums its own bills", r.codes[0].actual === 25000, String(r.codes[0].actual));
ok("...and drafts are not among them", r.codes[0].actual === 25000);
ok("remaining is what is left of the allowance", r.codes[0].remaining === 25000);
ok("...and goes NEGATIVE rather than clamping", r.codes[1].remaining === -10000,
  String(r.codes[1].remaining));
ok("a code past its allowance says so", r.codes[1].over === true && r.codes[0].over === false);
ok("used is a fraction of the budget", r.codes[0].used === 0.5, String(r.codes[0].used));

// NULL, NOT ZERO. Nought spent against nought allowed is not "0% used" — it is
// a code nobody has budgeted, and an empty progress bar says the opposite.
const unbudgeted = C.projectCosting([code("x", 0)], [], 0);
ok("a code with no budget has no percentage", unbudgeted.codes[0].used === null);
// And it is over the moment anything is spent on it: the money went somewhere
// nobody allowed for.
const unbudgetedSpent = C.projectCosting([code("x", 0)], [bill("x", 1)], 0);
ok("...and is over as soon as anything is spent on it", unbudgetedSpent.codes[0].over === true);

console.log("\n== money nobody filed properly");

// THE ASSERTION THIS FILE EXISTS FOR, first half: a bill on the project naming
// no code is real money.
const withUncoded = C.projectCosting(codes, [...spent, bill("", 7000)], 400000);
ok("an uncoded bill is not dropped", withUncoded.uncoded === 7000, String(withUncoded.uncoded));
ok("...and reaches the project's actual", withUncoded.actual === 162000, String(withUncoded.actual));
ok("...without landing on any code", withUncoded.codes.reduce((n, c) => n + c.actual, 0) === 155000);

// Second half, and it is the subtler one: a code DELETED after bills were filed
// against it would otherwise take their money out of the report entirely — the
// total would drop and nothing would say why.
const orphaned = C.projectCosting(codes, [...spent, bill("deleted-code", 3000)], 400000);
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
const overAllocated = C.projectCosting([code("a", 500)], [], 100);
ok("...and goes negative when more is budgeted than the job is worth",
  overAllocated.unallocated === -400, String(overAllocated.unallocated));

ok("a project inside every allowance with nothing uncoded is clean",
  C.projectCosting([code("a", 100)], [bill("a", 50)], 100).clean === true);
ok("...one uncoded bill is enough to make it not",
  C.projectCosting([code("a", 100)], [bill("", 1)], 100).clean === false);
ok("...and so is one code over", r.clean === false);

ok("nothing at all totals to nothing rather than throwing",
  C.projectCosting([], [], 0).actual === 0 && C.projectCosting(null, null).budget === 0);

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

console.log("\n== the file stays pure");

const { readFileSync } = await import("node:fs");
const src = readFileSync(new URL("../src/modules/projects/costing.ts", import.meta.url), "utf8");
ok("modules/projects/costing imports nothing",
  [...src.matchAll(/from\s+"([^"]+)"/g)].length === 0);

// THERE IS NO FORECAST COLUMN, and its absence is deliberate rather than
// pending. A forecast that ignored committed cost would read as a full
// projection while silently missing every order already placed — most wrong
// exactly when a project has ordered heavily and invoiced little, which is
// every project at its start.
ok("nothing here claims to forecast", !/forecast/i.test(JSON.stringify(r)));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
