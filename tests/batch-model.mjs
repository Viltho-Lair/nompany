// BATCHES, EXPIRY AND SERIAL STATE, asserted without a database.
//
// The arithmetic is shared with bins on purpose, so the assertions here are
// about the half that is NOT shared: what a date means, what gets picked next,
// and what a state is allowed to say.
// The loader preamble is access.test.mjs's: it is what lets a .mjs test import
// a .ts module that imports a SIBLING without an extension, which Node's own
// ESM resolver refuses. `batches` shares its ledger split with `./bins` rather
// than copying it, so it has such an import and a bare relative load fails.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const {
  batchProblems, cleanBatch, batchBalances, batchView, daysUntil,
  fefoSuggestion, expiryAlerts, serialStates, serialGap,
} = await import("@/modules/inventory/batches");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const ITEMS = [{ id: "i1" }, { id: "i2" }];
const EXISTING = [
  { id: "b1", itemId: "i1", lot: "LOT-A", expiresOn: "2026-10-01", receivedOn: "2026-01-01" },
];

// ---- what a batch must have ------------------------------------------------
ok("a batch needs a lot number", batchProblems({ itemId: "i1" }, { items: ITEMS, existing: [] }).length === 1);
// A LOT NUMBER IS MEANINGLESS WITHOUT THE THING IT IS A LOT OF.
ok("a batch needs an item", batchProblems({ lot: "LOT-A" }, { items: ITEMS, existing: [] }).length === 1);
ok("an item that does not exist is refused",
  batchProblems({ lot: "L", itemId: "nope" }, { items: ITEMS, existing: [] })
    .some((p) => /does not exist/.test(p)));
ok("a good batch passes",
  batchProblems({ lot: "LOT-B", itemId: "i1" }, { items: ITEMS, existing: EXISTING }).length === 0);
ok("a lot with a space is refused",
  batchProblems({ lot: "LOT A", itemId: "i1" }, { items: ITEMS, existing: [] }).length === 1);
// REFUSED, NOT TRUNCATED — see binProblems for the incident this comes from.
ok("a lot longer than 24 is refused",
  batchProblems({ lot: "L".repeat(25), itemId: "i1" }, { items: ITEMS, existing: [] }).length === 1);
ok("a non-date expiry is refused",
  batchProblems({ lot: "L", itemId: "i1", expiresOn: "soon" }, { items: ITEMS, existing: [] }).length === 1);
// A TYPO SOMEBODY WANTS TO HEAR ABOUT: it would sort first under FEFO and send
// a picker to a drum that was never usable.
ok("expiring before it arrived is refused",
  batchProblems({ lot: "L", itemId: "i1", receivedOn: "2026-05-01", expiresOn: "2026-04-01" },
    { items: ITEMS, existing: [] }).some((p) => /before it was received/.test(p)));

// UNIQUE PER ITEM, not across the studio: two suppliers' lot numbers collide
// routinely, and global uniqueness would make a studio rename a printed label.
ok("the same lot twice on one item is refused",
  batchProblems({ lot: "LOT-A", itemId: "i1" }, { items: ITEMS, existing: EXISTING }).length === 1);
ok("...case-insensitively",
  batchProblems({ lot: "lot-a", itemId: "i1" }, { items: ITEMS, existing: EXISTING }).length === 1);
ok("THE SAME LOT ON ANOTHER ITEM IS FINE",
  batchProblems({ lot: "LOT-A", itemId: "i2" }, { items: ITEMS, existing: EXISTING }).length === 0);

// BOTH DATES ARE OPTIONAL: plenty of stock is batch-tracked for traceability
// and never expires, and an invented expiry is worse than none.
ok("a batch with no dates is legal",
  batchProblems({ lot: "LOT-C", itemId: "i1" }, { items: ITEMS, existing: EXISTING }).length === 0);
ok("a rubbish date is dropped rather than stored",
  cleanBatch({ lot: "L", itemId: "i1", expiresOn: "whenever" }).expiresOn === "");

// ---- the split, which must not contradict the total ------------------------
const MOVES = [
  { itemId: "i1", kind: "in", qty: 10, batchId: "b1" },
  { itemId: "i1", kind: "out", qty: 4, batchId: "b1" },
  { itemId: "i1", kind: "in", qty: 6, batchId: "b2" },
  { itemId: "i2", kind: "in", qty: 3 },
];
const { byBatch, untracked } = batchBalances(MOVES, new Set(["b1", "b2"]));
ok("a batch holds what arrived less what left", byBatch.b1.i1 === 6);
ok("stock in no batch is a first-class total", untracked.i2 === 3);
const split = Object.values(byBatch).reduce((s, held) => s + (held.i1 || 0), 0) + (untracked.i1 || 0);
ok("THE SPLIT SUMS TO THE COMPANY TOTAL", split === 12, String(split));

// ---- dates ------------------------------------------------------------------
ok("days until counts forward", daysUntil("2026-09-20", "2026-09-09") === 11);
ok("...and is negative once it has expired", daysUntil("2026-09-01", "2026-09-09") === -8);
ok("no date is null rather than zero", daysUntil("", "2026-09-09") === null);

// ---- the register -----------------------------------------------------------
const BATCHES = [
  { id: "past", itemId: "i1", lot: "OLD", expiresOn: "2026-08-01", receivedOn: "" },
  { id: "soon", itemId: "i1", lot: "SOON", expiresOn: "2026-09-20", receivedOn: "" },
  { id: "far", itemId: "i1", lot: "FAR", expiresOn: "2027-01-01", receivedOn: "" },
  { id: "undated", itemId: "i1", lot: "NODATE", expiresOn: "", receivedOn: "" },
  { id: "used", itemId: "i1", lot: "USED", expiresOn: "2026-08-01", receivedOn: "" },
];
const STOCK = [
  { itemId: "i1", kind: "in", qty: 5, batchId: "past" },
  { itemId: "i1", kind: "in", qty: 5, batchId: "soon" },
  { itemId: "i1", kind: "in", qty: 5, batchId: "far" },
  { itemId: "i1", kind: "in", qty: 5, batchId: "undated" },
  { itemId: "i1", kind: "in", qty: 5, batchId: "used" },
  { itemId: "i1", kind: "out", qty: 5, batchId: "used" },
];
const rows = batchView(BATCHES, STOCK, "2026-09-09");
const state = Object.fromEntries(rows.map((r) => [r.id, r.state]));
ok("a batch past its date is expired", state.past === "expired");
ok("a batch inside the window is expiring", state.soon === "expiring");
ok("a batch beyond it is ok", state.far === "ok");
ok("a batch with no date says so rather than pretending", state.undated === "no-date");
// A BATCH WITH NOTHING LEFT IS `empty`, NOT `expired`: a drum that went out of
// date after it was all used is not a problem anybody has, and colouring it red
// buries the ones still on a shelf.
ok("A USED-UP BATCH IS EMPTY, NOT EXPIRED", state.used === "empty");
ok("...and stays on the register anyway", rows.length === 5);
ok("soonest to expire comes first", rows[0].id === "past");
// AN UNDATED ROW SORTS LAST, not first: it is not urgent, and putting undated
// rows at the top would hide every date that matters.
ok("an undated batch sorts after the dated ones",
  rows.findIndex((r) => r.id === "undated") > rows.findIndex((r) => r.id === "far"));
ok("an empty batch sorts last of all", rows[rows.length - 1].id === "used");

// ---- what to pick ----------------------------------------------------------
// FEFO: the oldest USABLE stock is the one about to stop being usable.
const pick = fefoSuggestion("i1", rows);
ok("FEFO suggests the soonest to expire that is still usable", pick?.id === "soon", pick?.id);
// AN EXPIRED BATCH IS NOT SUGGESTED — it is still on the register with a
// quantity; what it has lost is a claim to being picked next.
ok("...never an expired one", pick?.state !== "expired");
ok("an item with no batches suggests nothing", fefoSuggestion("i2", rows) === null);

ok("the alerts are the expired and the expiring", expiryAlerts(rows).length === 2);
ok("...and nothing that is merely empty",
  expiryAlerts(rows).every((r) => r.state !== "empty"));

// ---- serials ---------------------------------------------------------------
const states = serialStates(["SN1", "SN2", "SN3"], new Set(["SN2"]));
ok("a free serial is held", states.find((s) => s.serial === "SN1").state === "held");
ok("a serial on a sheet is allocated", states.find((s) => s.serial === "SN2").state === "allocated");
// THREE STATES AND NO MORE: a state nothing writes is a state that lies about
// being supported.
ok("nothing invents a fourth state",
  new Set(states.map((s) => s.state)).size <= 3);
const withHistory = serialStates(["SN1"], new Set(), ["SN1", "SN9"]);
ok("a serial that was held and is not any more is gone",
  withHistory.find((s) => s.serial === "SN9").state === "gone");

// THE LEDGER AND THE LIST DISAGREEING is worth saying out loud: the gap is the
// number of units nobody can trace.
ok("the gap is what the ledger holds beyond the serials", serialGap(["a", "b"], 5) === 3);
ok("...and negative when more serials are listed than held", serialGap(["a", "b"], 1) === -1);
ok("an item that is not serial-tracked has no gap", serialGap([], 11) === 0);

console.log(fails ? `\nbatch model: ${fails} FAILURES\n` : "\nbatch model: all passed\n");
process.exit(fails ? 1 : 0);
