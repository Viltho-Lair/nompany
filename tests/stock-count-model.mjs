// A STOCK COUNT, asserted without a database.
//
// The property that matters is that a count adjusts exactly what was counted
// and differs — never a line nobody looked at, and never a line that matched.
import {
  countedValue, cleanCountLines, countDifferences, countedLines, postProblem,
} from "../src/modules/inventory/stockCounts.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- blank is not nought ---------------------------------------------------
// THE WHOLE HONESTY OF A COUNT: "did not look" and "looked and found nothing"
// are opposite answers, and coercing the blank to 0 would write a shelf off.
ok("a blank count stays blank", countedValue("") === "" && countedValue(undefined) === "" && countedValue(null) === "");
ok("nought is a count", countedValue("0") === 0 && countedValue(0) === 0);
ok("a negative count is not a count", countedValue(-2) === "");
ok("a count keeps three places", countedValue("2.12345") === 2.123);

// ---- the stored lines ------------------------------------------------------
const known = new Set(["i1", "i2", "i3"]);
const lines = cleanCountLines([
  { itemId: "i1", counted: "5" },
  { itemId: "i1", counted: "9" }, // a second line for one item is a mistake
  { itemId: "gone", counted: "3" }, // an item deleted since the count began
  { itemId: "i2", counted: "" },
  { itemId: "i3", counted: 0 },
], known);
ok("one line per item, the first kept", lines.filter((l) => l.itemId === "i1").length === 1 && lines[0].counted === 5);
ok("an unknown item drops out", !lines.some((l) => l.itemId === "gone"));
ok("progress counts counted lines only", countedLines(lines) === 2);

// ---- what posting writes ---------------------------------------------------
const diffs = countDifferences(lines, { i1: 7, i2: 4, i3: 6 });
ok("a shortfall is a negative adjustment", diffs.some((d) => d.itemId === "i1" && d.difference === -2));
// A LINE NOBODY COUNTED IS LEFT ALONE, however far the books say it is.
ok("an uncounted line writes nothing", !diffs.some((d) => d.itemId === "i2"));
ok("an empty shelf writes the whole balance off", diffs.some((d) => d.itemId === "i3" && d.difference === -6));
ok("a line that matches writes nothing", countDifferences([{ itemId: "i1", counted: 7 }], { i1: 7 }).length === 0);
ok("a surplus is a positive adjustment", countDifferences([{ itemId: "i1", counted: 10 }], { i1: 7 })[0]?.difference === 3);
ok("an item the books have never seen counts from nought", countDifferences([{ itemId: "i9", counted: 2 }], {})[0]?.difference === 2);
// FLOATS: 0.1 + 0.2 must not leave a 0.0000001 adjustment behind.
ok("no float crumb becomes an adjustment", countDifferences([{ itemId: "i1", counted: 0.3 }], { i1: 0.1 + 0.2 }).length === 0);

// ---- when it may post ------------------------------------------------------
ok("a count with nothing counted is refused", postProblem({ status: "Counting", lines: [{ itemId: "i1", counted: "" }] }) === "nothing-counted");
ok("a posted count does not post again", postProblem({ status: "Posted", lines }) === "not-counting");
ok("a count being posted does not post again", postProblem({ status: "Posting", lines }) === "not-counting");
ok("a counted, open count may post", postProblem({ status: "Counting", lines }) === "");

console.log(fails ? `\nstock count model: ${fails} FAILURES\n` : "\nstock count model: all passed\n");
process.exit(fails ? 1 : 0);
