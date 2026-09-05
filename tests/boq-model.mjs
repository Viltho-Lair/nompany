// A BILL OF QUANTITIES, PURELY. No store, no routes, no fixtures.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS IS ONE MISTAKE: presenting the total
// of a part-priced bill as the bid. Forty lines with thirty-eight rates has a
// total; it is not what the studio would charge, and a figure carried into a
// submission on that basis is how work is won below cost. So `complete` is
// asserted everywhere a total is.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const B = await import("@/modules/tendering/boq");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const line = (qty, rate, group = "") => ({ qty, rate, group });

console.log("\n== what counts as priced");

// PRICED TURNS ON THE RATE, NEVER ON THE EXTENSION. A provisional item with no
// measured quantity is a real, priced line — the client asked for a rate
// against it — and calling it unpriced would put a false warning on the bill.
ok("a rate with no quantity is still priced", B.isPriced(line(0, 50)));
ok("...and extends to nothing, which is correct", B.extension(line(0, 50)) === 0);
ok("a quantity with no rate is NOT priced", !B.isPriced(line(10, 0)));
ok("...nor is a negative rate", !B.isPriced(line(10, -5)));
ok("nonsense is not priced", !B.isPriced(line("x", "y")) && !B.isPriced({}));

console.log("\n== the extension");

ok("quantity times rate", B.extension(line(12, 25)) === 300);
ok("...rounded to the money the product uses", B.extension(line(3, 33.333)) === 100);
ok("...and never NaN", B.extension(line("x", 10)) === 0 && B.extension({}) === 0);

console.log("\n== the total, and whether it is the bid");

const part = [line(10, 5), line(4, 0), line(2, 100)];
const t = B.boqTotals(part);
ok("the total counts only priced lines", t.total === 250, String(t.total));
ok("...and says how many are not", t.unpriced === 1 && t.priced === 2, JSON.stringify(t));
// THE ASSERTION THIS FILE EXISTS FOR.
ok("a part-priced bill is NOT complete", t.complete === false);

const whole = B.boqTotals([line(10, 5), line(2, 100)]);
ok("a fully priced bill is complete", whole.complete === true && whole.unpriced === 0);

// AN EMPTY BILL IS NOT A COMPLETE ONE. A tender with no lines has not been
// estimated, and reporting it as fully priced is the same lie the other way up.
const none = B.boqTotals([]);
ok("an empty bill is not complete", none.complete === false && none.lines === 0);
ok("...and totals nothing rather than throwing", none.total === 0);
ok("nonsense totals to an empty bill", B.boqTotals(null).lines === 0 && B.boqTotals("x").lines === 0);

console.log("\n== grouped in the document's order");

const bill = [
  line(1, 10, "Preliminaries"),
  line(2, 20, "Substructure"),
  line(3, 30, "Preliminaries"),
  line(4, 0, "Frame"),
];
const groups = B.boqGroups(bill);

// ALPHABETICAL WOULD BE WRONG. A bill is issued in an order and checked against
// the client's own document line by line; re-sorting destroys that check.
// Alphabetically these would read Frame, Preliminaries, Substructure.
ok("groups keep the order they first appear in",
  JSON.stringify(groups.map((g) => g.group)) === '["Preliminaries","Substructure","Frame"]',
  JSON.stringify(groups.map((g) => g.group)));

ok("a group gathers its own lines wherever they sit",
  groups[0].lines.length === 2, String(groups[0].lines.length));
ok("...and totals them", groups[0].totals.total === 100, String(groups[0].totals.total));
ok("...with its own completeness", groups[0].totals.complete === true);
// The unpriced line is in ONE group, and only that group is incomplete — a
// warning on the whole bill tells an estimator nothing about where to look.
ok("an unpriced line makes only its own group incomplete",
  groups[2].totals.complete === false && groups[1].totals.complete === true);

const ungrouped = B.boqGroups([line(1, 10), line(2, 20)]);
ok("lines with no section are one group, not none",
  ungrouped.length === 1 && ungrouped[0].group === "", JSON.stringify(ungrouped.map((g) => g.group)));

console.log("\n== what the tender is worth");

// A tender carries a typed estimate from the day it is noticed. Once a bill
// exists the two disagree, and the bill is the one built from evidence.
ok("a bill supersedes the typed estimate", B.valueFromBoq(B.boqTotals(part)) === 250);
// Null, not zero: no bill means keep showing the typed figure, and a zero
// would overwrite a real first guess with a false precision.
ok("no bill defers to the typed estimate", B.valueFromBoq(B.boqTotals([])) === null);
ok("a bill priced at nothing is still a bill",
  B.valueFromBoq(B.boqTotals([line(1, 0)])) === 0);

console.log("\n== the file stays pure");

const { readFileSync } = await import("node:fs");
const src = readFileSync(new URL("../src/modules/tendering/boq.ts", import.meta.url), "utf8");
ok("modules/tendering/boq imports nothing",
  [...src.matchAll(/from\s+"([^"]+)"/g)].length === 0);

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
