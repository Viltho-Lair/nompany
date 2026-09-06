// SUPPLIER RFQs AND QUOTE COMPARISON, PURELY. No store, no routes, no fixtures.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a recommendation drawn from a quote
// that is not an offer. A supplier who priced three lines of five has not said
// what the job costs; a supplier whose price lapsed last week is not holding it.
// Ranking either first recommends the wrong company for a reason nobody would
// endorse if it were stated out loud — and it would be stated nowhere, because
// a total is a number and looks like every other number.
//
// So `complete` travels with every total, expiry is computed against a clock
// passed IN rather than read here, and only complete unexpired quotes are
// ranked at all.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/procurement/rfqModel");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// Two lines: 10 of one, 4 of the other.
const lines = [
  { id: "l1", description: "Scaffold hire", unit: "week", qty: 10 },
  { id: "l2", description: "Edge protection", unit: "m", qty: 4 },
];

const full = (id, vendorId, p1, p2, extra = {}) => ({
  id, vendorId,
  lines: [
    { rfqLineId: "l1", unitPrice: p1 },
    { rfqLineId: "l2", unitPrice: p2 },
  ],
  ...extra,
});

console.log("\n== what each supplier is offering");

const cmp = M.compareQuotes(lines, [
  full("q1", "v1", 100, 50),   // 1000 + 200 = 1200
  full("q2", "v2", 90, 60),    //  900 + 240 = 1140
], "2031-01-01");

ok("a quote totals its own lines", cmp.quotes[0].total === 1200, String(cmp.quotes[0].total));
ok("...and the other its own", cmp.quotes[1].total === 1140, String(cmp.quotes[1].total));
ok("both are complete", cmp.quotes.every((q) => q.complete));
ok("the cheapest COMPLETE quote is recommended", cmp.cheapestId === "q2", String(cmp.cheapestId));
ok("nothing is blocked when there is something to compare", cmp.blocked === null);
ok("and both are comparable", cmp.comparable === 2, String(cmp.comparable));

console.log("\n== a quote that is not an offer");

// THE ASSERTION THIS FILE EXISTS FOR. q3 prices ONE line at a keen rate, so its
// total is the lowest number on the screen and it is not the cheapest quote.
const partial = M.compareQuotes(lines, [
  full("q1", "v1", 100, 50),
  { id: "q3", vendorId: "v3", lines: [{ rfqLineId: "l1", unitPrice: 10 }] },
], "2031-01-01");

const q3 = partial.quotes.find((q) => q.id === "q3");
ok("a part-priced quote says so", q3.complete === false && q3.priced === 1,
  JSON.stringify({ complete: q3.complete, priced: q3.priced }));
ok("...its total is the lowest number on screen", q3.total === 100 && q3.total < 1200,
  String(q3.total));
ok("...AND IT IS NOT RECOMMENDED", partial.cheapestId === "q1", String(partial.cheapestId));
// A BLANK IS NOT NOUGHT: the unpriced line is null, so the screen can show a
// dash rather than 0.00, which is a price.
ok("the unpriced line is null, not zero",
  q3.lines.find((l) => l.rfqLineId === "l2").unitPrice === null);
ok("...and its line total is null too",
  q3.lines.find((l) => l.rfqLineId === "l2").total === null);
// NOUGHT IS A PRICE. A supplier genuinely offering a line free has priced it.
const freebie = M.compareQuotes(lines, [full("q4", "v4", 100, 0)], "2031-01-01");
ok("a line priced at zero is still priced", freebie.quotes[0].complete === true);

console.log("\n== a price nobody is holding");

const stale = M.compareQuotes(lines, [
  full("q1", "v1", 100, 50, { validUntil: "2030-12-01" }),   // lapsed
  full("q2", "v2", 200, 100, { validUntil: "2031-06-01" }),  // dearer, live
], "2031-01-01");
ok("a lapsed quote is marked expired",
  stale.quotes.find((q) => q.id === "q1").expired === true);
ok("...and the live dearer one is recommended instead", stale.cheapestId === "q2",
  String(stale.cheapestId));
// A supplier who set no validity has not withdrawn their price.
ok("a quote with no validity never expires",
  M.compareQuotes(lines, [full("q5", "v5", 1, 1)], "2031-01-01").quotes[0].expired === false);

console.log("\n== cheapest is not fastest, and that is the point");

const speed = M.compareQuotes(lines, [
  full("q1", "v1", 100, 50, { leadWeeks: 8 }),
  full("q2", "v2", 120, 60, { leadWeeks: 2 }),
], "2031-01-01");
ok("the cheapest is one supplier", speed.cheapestId === "q1", String(speed.cheapestId));
ok("...and the fastest another", speed.fastestId === "q2", String(speed.fastestId));
// A SILENCE IS NOT SPEED. Ranking an unstated lead time first would recommend
// whoever answered least.
const quiet = M.compareQuotes(lines, [
  full("q1", "v1", 100, 50),                       // no lead time at all
  full("q2", "v2", 120, 60, { leadWeeks: 9 }),
], "2031-01-01");
ok("a supplier who stated no lead time is not the fastest",
  quiet.fastestId === "q2", String(quiet.fastestId));

console.log("\n== per line, including from quotes that cannot be ranked");

// A supplier who priced ONE line keenly is worth seeing even though their quote
// is not comparable as a whole — that is what a split award is made of.
ok("the per-line best can come from an incomplete quote",
  partial.cheapestByLine.l1 === "q3", JSON.stringify(partial.cheapestByLine));
ok("...and the line only they priced falls to the complete one",
  partial.cheapestByLine.l2 === "q1", JSON.stringify(partial.cheapestByLine));

console.log("\n== nothing to compare");

ok("no quotes at all says so",
  M.compareQuotes(lines, []).blocked === "no-quotes");
ok("...and no COMPARABLE quotes says something different",
  M.compareQuotes(lines, [{ id: "q6", vendorId: "v6", lines: [] }]).blocked === "none-comparable");
ok("...with no recommendation in either case",
  M.compareQuotes(lines, []).cheapestId === null
  && M.compareQuotes(lines, [{ id: "q6", vendorId: "v6", lines: [] }]).cheapestId === null);
ok("a non-array survives", M.compareQuotes(null, null).quotes.length === 0);

console.log("\n== what may happen to a request");

const draft = { status: "Draft", lines };
ok("a draft with lines may be sent", M.rfqProblem(draft, "Sent") === null);
ok("an empty one may not",
  M.rfqProblem({ status: "Draft", lines: [] }, "Sent") === "no-lines");
// AWARDING NAMES A QUOTE, so it cannot be a status assignment — a status edit
// reaching `Awarded` would record a decision with nothing decided.
ok("AWARDED IS NOT A STATUS MOVE", M.rfqProblem(draft, "Awarded") === "not-awardable");
ok("a decided request is decided",
  M.rfqProblem({ status: "Awarded", lines }, "Cancelled") === "decided");
ok("nothing returns to draft",
  M.rfqProblem({ status: "Sent", lines }, "Draft") === "no-return");
ok("a sent request may still be cancelled",
  M.rfqProblem({ status: "Sent", lines }, "Cancelled") === null);

// THE LINES FREEZE WHEN IT GOES OUT: a supplier quoting three lines must not
// find a fourth appearing afterwards.
ok("only a draft edits", M.rfqEditable(draft) === true);
ok("...a sent one does not", M.rfqEditable({ status: "Sent" }) === false);
// AND A DRAFT HAS BEEN SENT TO NOBODY, so a quote against it came from nowhere.
ok("quotes are accepted only once it has gone out",
  M.quotesAccepted({ status: "Sent" }) === true
  && M.quotesAccepted(draft) === false
  && M.quotesAccepted({ status: "Awarded" }) === false);

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
