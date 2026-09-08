// WHAT A STUDIO'S DOCUMENTS ARE CALLED, and the rules that keep a rename safe.
//
// Pure, so it needs no database. The interesting assertions here are the ones
// about invariant 10: a prefix is what `bumpCounter` is keyed on, so a valid
// prefix is the difference between a fresh sequence and a reissued number.

import {
  SERIES, numberingProblems, cleanNumbering, seriesSetting, numberingView,
  cleanPrefix, DEFAULT_PAD, DEFAULT_START, isSeriesKey,
} from "../src/modules/administration/numbering.ts";

let fails = 0;
const ok = (msg, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(` FAIL  ${msg}${detail ? `  — ${detail}` : ""}`); }
  else console.log(`  ok   ${msg}`);
};

console.log("\n== the catalogue");

ok("there are series to rename", SERIES.length > 10, String(SERIES.length));
// A KEY IS STABLE AND A PREFIX IS NOT. The override is stored under the key, so
// two series sharing one would collapse two settings into one.
ok("every key is unique", new Set(SERIES.map((s) => s.key)).size === SERIES.length);
// AND THE SHIPPED DEFAULTS MUST NOT COLLIDE EITHER, or a studio that changes
// nothing already has two documents numbering off one counter.
ok("no two series ship the same default prefix",
  new Set(SERIES.map((s) => s.prefix)).size === SERIES.length,
  SERIES.map((s) => s.prefix).join(","));
ok("every series names a group and a label",
  SERIES.every((s) => s.group && s.label));
ok("a made-up key is not a series", !isSeriesKey("nonsense") && isSeriesKey("invoice"));

console.log("\n== a prefix is what bumpCounter is keyed on, so it is strict");

ok("a prefix is upper-cased and stripped", cleanPrefix("  si nv ") === "SINV");

// A HYPHEN IS THE ONE THAT MATTERS. `nextReference` joins prefix and number
// with a hyphen, so "INV-2" would produce "INV-2-0007" — and `highestIssued`
// would parse the number as NaN, read every existing reference as nought and
// reissue from the start. Invariant 10 broken by a punctuation mark.
ok("a prefix with a hyphen is refused",
  numberingProblems({ invoice: { prefix: "INV-2" } }).length === 1,
  JSON.stringify(numberingProblems({ invoice: { prefix: "INV-2" } })));
ok("a one-character prefix is refused", numberingProblems({ invoice: { prefix: "I" } }).length === 1);
ok("a nine-character prefix is refused", numberingProblems({ invoice: { prefix: "ABCDEFGHI" } }).length === 1);
ok("a prefix starting with a digit is refused", numberingProblems({ invoice: { prefix: "1INV" } }).length === 1);
ok("an empty prefix is refused", numberingProblems({ invoice: { prefix: "" } }).length === 1);
ok("a good prefix passes", numberingProblems({ invoice: { prefix: "SI" } }).length === 0);
ok("digits after the first letter are fine", numberingProblems({ invoice: { prefix: "S2026" } }).length === 0);

console.log("\n== two series may not share a prefix");

// They would share a COUNTER, which is safe — bumpCounter is keyed on the
// prefix so nothing is reissued — and would interleave two documents so a
// studio's invoices read INV-1, INV-3, INV-7. Correct numbers nobody can use.
const clash = numberingProblems({ invoice: { prefix: "DOC" }, bill: { prefix: "DOC" } });
ok("a duplicate prefix is refused", clash.length === 1, JSON.stringify(clash));
ok("...and it names both sides", /invoice|bill/.test(clash[0]) && clash[0].includes("DOC"), clash[0]);
ok("the same prefix on one series is fine",
  numberingProblems({ invoice: { prefix: "DOC" } }).length === 0);
// CASE IS NOT A DIFFERENCE. "doc" and "DOC" are one prefix once cleaned, and
// letting them through would be the duplicate this refuses, spelled quietly.
ok("case does not make two prefixes different",
  numberingProblems({ invoice: { prefix: "doc" }, bill: { prefix: "DOC" } }).length === 1);

console.log("\n== padding and the first number");

ok("padding below two is refused", numberingProblems({ invoice: { prefix: "SI", pad: 1 } }).length === 1);
ok("padding above eight is refused", numberingProblems({ invoice: { prefix: "SI", pad: 9 } }).length === 1);
ok("a fractional padding is refused", numberingProblems({ invoice: { prefix: "SI", pad: 4.5 } }).length === 1);
ok("padding in range passes", numberingProblems({ invoice: { prefix: "SI", pad: 6 } }).length === 0);
ok("a first number below one is refused", numberingProblems({ invoice: { prefix: "SI", startAt: 0 } }).length === 1);
ok("an absurd first number is refused", numberingProblems({ invoice: { prefix: "SI", startAt: 9e9 } }).length === 1);

console.log("\n== an unknown key is named rather than ignored");

// SILENTLY DROPPING IT would let a screen save a setting that never applied,
// which looks exactly like the feature not working.
ok("validation names an unknown series", numberingProblems({ nonsense: { prefix: "XX" } }).length === 1);
// ...but CLEANING drops it, because what is stored must only ever be things
// the product recognises. The two do different jobs on purpose.
ok("cleaning drops what validation refused",
  Object.keys(cleanNumbering({ nonsense: { prefix: "XX" }, invoice: { prefix: "SI" } })).join() === "invoice");

console.log("\n== what is in force");

const stored = { invoice: { prefix: "SI", pad: 6, startAt: 500 } };
const inv = seriesSetting("invoice", stored);
ok("a studio's own setting wins", inv.prefix === "SI" && inv.pad === 6 && inv.startAt === 500,
  JSON.stringify(inv));

const bill = seriesSetting("bill", stored);
ok("an unset series falls back to the shipped default",
  bill.prefix === "BILL" && bill.pad === DEFAULT_PAD && bill.startAt === DEFAULT_START,
  JSON.stringify(bill));

// GARBAGE IN THE STORE MUST NOT BREAK A CREATE. `nextReference` is on the path
// of every document this product makes; a malformed setting has to degrade to
// the default rather than throw or produce "undefined-0001".
for (const junk of [null, undefined, "nonsense", 42, [], { invoice: null }, { invoice: { prefix: "!!" } }]) {
  const got = seriesSetting("invoice", junk);
  if (got.prefix !== "INV") { ok(`junk setting ${JSON.stringify(junk)} falls back`, false, JSON.stringify(got)); break; }
}
ok("every malformed setting falls back to the default rather than throwing", true);

ok("an unknown series still returns something usable",
  seriesSetting("nope", stored).prefix === "REF");

console.log("\n== the editor's view");

const view = numberingView(stored);
ok("every series is offered", view.length === SERIES.length);
ok("...with the setting in force", view.find((v) => v.key === "invoice").prefix === "SI");
// SO THE SCREEN CAN SAY "default" rather than presenting fourteen identical
// rows as though somebody had chosen every one of them.
ok("...and says which are the studio's own choice",
  view.find((v) => v.key === "invoice").custom === true
  && view.find((v) => v.key === "bill").custom === false);

console.log(fails ? `\nnumbering model: ${fails} FAILURES\n` : "\nnumbering model: all passed\n");
process.exit(fails ? 1 : 0);
