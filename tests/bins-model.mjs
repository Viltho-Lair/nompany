// WHERE THE STOCK IS, asserted without a database.
//
// One assertion per thing that would go wrong. The interesting half is not the
// validation — it is that a bin split must never contradict the company total,
// which is the one property this feature can break invisibly.
import {
  binProblems, cleanBin, binBalances, negativeBins, binView, whereIs,
} from "../src/modules/inventory/bins.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const LOCATIONS = [{ id: "loc1", name: "Amman yard" }, { id: "loc2", name: "Zarqa store" }];
const EXISTING = [
  { id: "b1", code: "A-01", name: "", locationId: "loc1" },
  { id: "b2", code: "A-02", name: "Racking", locationId: "loc1" },
];

// ---- what a bin must have --------------------------------------------------
ok("a bin needs a code", binProblems({ locationId: "loc1" }, { locations: LOCATIONS, existing: [] }).length === 1);
// A BIN WITH NO LOCATION IS A BIN NOBODY CAN WALK TO — the whole question this
// answers is "where".
ok("a bin needs a location", binProblems({ code: "A-01" }, { locations: LOCATIONS, existing: [] }).length === 1);
ok("a location that does not exist is refused",
  binProblems({ code: "A-01", locationId: "nope" }, { locations: LOCATIONS, existing: [] })
    .some((p) => /does not exist/.test(p)));
ok("a good bin passes",
  binProblems({ code: "A-01", locationId: "loc1" }, { locations: LOCATIONS, existing: [] }).length === 0);
ok("rack punctuation is allowed",
  binProblems({ code: "YARD/2.B-3", locationId: "loc1" }, { locations: LOCATIONS, existing: [] }).length === 0);
// A CODE IS SCANNED AND TYPED, so a space makes two bins that look identical.
ok("a code with a space is refused",
  binProblems({ code: "A 01", locationId: "loc1" }, { locations: LOCATIONS, existing: [] }).length === 1);
ok("a code longer than sixteen is refused",
  binProblems({ code: "A".repeat(17), locationId: "loc1" }, { locations: LOCATIONS, existing: [] }).length === 1);

// ---- unique within a location, not across the studio -----------------------
// Every warehouse has an A-01; site-wide uniqueness would make the second site
// invent codes nobody uses on the floor.
ok("the same code twice in one location is refused",
  binProblems({ code: "A-01", locationId: "loc1" }, { locations: LOCATIONS, existing: EXISTING }).length === 1);
ok("...case-insensitively",
  binProblems({ code: "a-01", locationId: "loc1" }, { locations: LOCATIONS, existing: EXISTING }).length === 1);
ok("THE SAME CODE IN ANOTHER LOCATION IS FINE",
  binProblems({ code: "A-01", locationId: "loc2" }, { locations: LOCATIONS, existing: EXISTING }).length === 0);
ok("a bin does not collide with itself when edited",
  binProblems({ code: "A-01", locationId: "loc1" }, { locations: LOCATIONS, existing: EXISTING, selfId: "b1" }).length === 0);

ok("cleaning trims and keeps the three fields",
  JSON.stringify(cleanBin({ code: " A-01 ", name: " Racking ", locationId: "loc1", junk: 1 }))
    === JSON.stringify({ code: "A-01", name: "Racking", locationId: "loc1" }));

// ---- the split, and the total it must never contradict ---------------------
const MOVES = [
  { itemId: "i1", kind: "in", qty: 10, binId: "b1" },
  { itemId: "i1", kind: "out", qty: 3, binId: "b1" },
  { itemId: "i1", kind: "in", qty: 5, binId: "b2" },
  { itemId: "i2", kind: "in", qty: 4 },                    // never put away
];
const known = new Set(["b1", "b2"]);
const { byBin, unbinned } = binBalances(MOVES, known);
ok("a bin holds what arrived less what left", byBin.b1.i1 === 7, String(byBin.b1?.i1));
ok("a second bin is counted separately", byBin.b2.i1 === 5);
// A MOVEMENT NAMING NO BIN IS THE NORMAL CASE, not an error: everything written
// before bins existed names none.
ok("stock in no bin is a first-class total", unbinned.i2 === 4);

// THE PROPERTY THAT MATTERS: the split must sum to the company total, or one of
// the two numbers is wrong and nothing says which.
const companyTotal = (itemId) => MOVES
  .filter((m) => m.itemId === itemId)
  .reduce((sum, m) => sum + (m.kind === "out" ? -Math.abs(m.qty) : m.kind === "adjust" ? m.qty : Math.abs(m.qty)), 0);
const splitTotal = (itemId) =>
  Object.values(byBin).reduce((sum, held) => sum + (held[itemId] || 0), 0) + (unbinned[itemId] || 0);
ok("THE SPLIT SUMS TO THE COMPANY TOTAL", splitTotal("i1") === companyTotal("i1"),
  `${splitTotal("i1")} vs ${companyTotal("i1")}`);
ok("...for stock that was never put away either", splitTotal("i2") === companyTotal("i2"));

// A MOVE IS TWO MOVEMENTS NETTING TO NOUGHT, so the item total cannot move.
const AFTER_MOVE = [...MOVES,
  { itemId: "i1", kind: "adjust", qty: -2, binId: "b1" },
  { itemId: "i1", kind: "adjust", qty: 2, binId: "b2" },
];
const moved = binBalances(AFTER_MOVE, known);
ok("a move takes from one bin", moved.byBin.b1.i1 === 5);
ok("...and gives to the other", moved.byBin.b2.i1 === 7);
ok("...AND CHANGES THE COMPANY TOTAL BY NOTHING",
  moved.byBin.b1.i1 + moved.byBin.b2.i1 === byBin.b1.i1 + byBin.b2.i1);

// PUT-AWAY IS A MOVE FROM NOWHERE — the same pair, sourced from `unbinned`.
const AFTER_PUTAWAY = [...MOVES,
  { itemId: "i2", kind: "adjust", qty: -4 },
  { itemId: "i2", kind: "adjust", qty: 4, binId: "b1" },
];
const away = binBalances(AFTER_PUTAWAY, known);
ok("putting stock away empties the unbinned figure", (away.unbinned.i2 || 0) === 0);
ok("...and fills the bin", away.byBin.b1.i2 === 4);

// A MOVEMENT POINTING AT A DELETED BIN IS UNBINNED, not a bin of its own: the
// units are still in the building, and a total that fell when somebody tidied a
// list would be a report that punishes housekeeping.
const orphaned = binBalances(MOVES, new Set(["b2"]));
ok("a deleted bin's stock becomes unbinned", orphaned.unbinned.i1 === 7, String(orphaned.unbinned?.i1));
ok("...and is not counted as a bin", orphaned.byBin.b1 === undefined);

// ---- negatives are reported, never refused ---------------------------------
const SHORT = [{ itemId: "i1", kind: "out", qty: 2, binId: "b1" }];
const neg = negativeBins(binBalances(SHORT, known).byBin);
ok("a bin holding less than nothing is reported", neg.length === 1 && neg[0].qty === -2,
  JSON.stringify(neg));
ok("a bin in balance is not", negativeBins(byBin).length === 0);

// ---- the register's rows ---------------------------------------------------
const view = binView(EXISTING, LOCATIONS, MOVES);
ok("every bin is a row", view.length === 2);
// AN EMPTY SHELF IS WHERE THE NEXT DELIVERY GOES, so it is still a row.
ok("a bin with nothing in it is still a row", binView(EXISTING, LOCATIONS, []).length === 2);
ok("a row carries its location's name", view[0].locationName === "Amman yard", view[0].locationName);
ok("a row totals what it holds", view.find((b) => b.id === "b1").units === 7);
// A LINE THAT NETS TO NOUGHT IS NOT IN THE BIN — showing "0" beside an item
// reads as "we have none of this, here", which is true of the whole catalogue.
const emptied = binView(EXISTING, LOCATIONS, [
  { itemId: "i1", kind: "in", qty: 3, binId: "b1" },
  { itemId: "i1", kind: "out", qty: 3, binId: "b1" },
]);
ok("an item that came and went is not a line", emptied.find((b) => b.id === "b1").lines.length === 0);

// ---- where is it? ----------------------------------------------------------
const where = whereIs("i1", EXISTING, MOVES);
ok("an item is found in every bin holding it", where.length === 2);
ok("...biggest holding first", where[0].qty === 7 && where[1].qty === 5);
ok("an item nobody has put away is found nowhere", whereIs("i2", EXISTING, MOVES).length === 0);

console.log(fails ? `\nbins model: ${fails} FAILURES\n` : "\nbins model: all passed\n");
process.exit(fails ? 1 : 0);
