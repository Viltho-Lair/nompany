// THE UNIT REGISTRY, asserted without a database.
//
// One assertion per thing that would go wrong, which for a list a studio edits
// is mostly about what it may NOT do to the list somebody's items already use.
import {
  DEFAULT_UNITS, unitProblems, cleanUnits, unitsFor, isUnit, unitsView,
} from "../src/modules/administration/units.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// THE DEFAULTS ARE THE LIST THIS REPLACED, verbatim. Typing a plausible list
// instead of copying the real one is how the numbering catalogue nearly shipped
// `RFQ` where the product mints `SRQ` — a rename nobody asked for, applied to
// every studio on deploy.
ok("the defaults are the eight units the product shipped",
  DEFAULT_UNITS.join("|") === "pcs|box|m|m²|kg|L|set|roll", DEFAULT_UNITS.join("|"));

// ---- what is refused -------------------------------------------------------
ok("a blank unit is refused", unitProblems([""]).length === 1);
ok("a unit that is only spaces is refused", unitProblems(["   "]).length === 1);
ok("a unit with a comma is refused", unitProblems(["m, run"]).length === 1);
ok("a unit with a quote is refused", unitProblems(['5"']).length === 1);
ok("a unit longer than twelve characters is refused",
  unitProblems(["thirteenchars"]).length === 1);
ok("twelve characters is allowed", unitProblems(["twelvechars!"]).length === 0);
// TRIMMED RATHER THAN REFUSED. A pasted " kg" is the kg it looks like, and
// refusing it would teach people to distrust their own clipboard.
ok("a padded unit is trimmed rather than refused", unitProblems([" bag "]).length === 0);
ok("...and stored trimmed", cleanUnits([" bag "]).join("|") === "bag");
ok("...so a padded default is still the default", cleanUnits([" kg "]).length === 0);
ok("a unit that is only spaces is still refused", unitProblems(["  "]).length === 1);
ok("an ordinary unit passes", unitProblems(["bag", "tonne", "m³"]).length === 0);
ok("something that is not a list is refused", unitProblems("bag").length === 1);
ok("more than sixty units is refused",
  unitProblems(Array.from({ length: 61 }, (_, i) => `u${i}`)).some((p) => /60/.test(p)));

// CASE-INSENSITIVE UNIQUENESS. Two spellings of one unit in a dropdown is a
// choice nobody can make correctly, and it then splits any grouping in half.
ok("the same unit twice is refused", unitProblems(["bag", "bag"]).length === 1);
ok("...differing only in case, too", unitProblems(["Bag", "bag"]).length === 1);

// ---- what is stored --------------------------------------------------------
ok("cleaning drops what validation refuses", cleanUnits(["bag", "", "a,b"]).join("|") === "bag");
// RE-ADDING A DEFAULT IS A NO-OP, not a duplicate: on screen there is one list,
// and somebody typing "kg" into it means the kg that is already there.
ok("a default typed again is not stored twice", cleanUnits(["kg", "bag"]).join("|") === "bag");
ok("...case-insensitively", cleanUnits(["KG", "bag"]).join("|") === "bag");
ok("storage is capped at sixty", cleanUnits(Array.from({ length: 80 }, (_, i) => `u${i}`)).length === 60);

// ---- the list in force -----------------------------------------------------
// DEFAULTS FIRST AND NEVER REMOVABLE. A studio that stops using rolls can leave
// the entry alone; taking it out would orphan every item measured in rolls, and
// an item whose unit is not offered cannot be edited without changing it.
const inForce = unitsFor(["bag"]);
ok("the defaults come first", inForce.slice(0, 8).join("|") === DEFAULT_UNITS.join("|"));
ok("...and the studio's own follow", inForce[8] === "bag");
ok("a studio that has set nothing still has the defaults",
  unitsFor(undefined).join("|") === DEFAULT_UNITS.join("|"));
ok("nonsense in storage does not empty the list",
  unitsFor({ nope: true }).join("|") === DEFAULT_UNITS.join("|"));

ok("a studio's own unit is a unit", isUnit("bag", ["bag"]));
ok("a default is a unit for everybody", isUnit("kg", undefined));
ok("another studio's unit is not this one's", isUnit("bag", undefined) === false);
ok("a unit is matched as stored, not case-folded", isUnit("Bag", ["bag"]) === false);

// ---- the editor's rows -----------------------------------------------------
const view = unitsView(["bag"]);
ok("every unit in force has a row", view.length === DEFAULT_UNITS.length + 1);
ok("a shipped default says so", view[0].builtin === true);
ok("the studio's own says it is not", view[view.length - 1].builtin === false,
  JSON.stringify(view[view.length - 1]));

console.log(fails ? `\nunits model: ${fails} FAILURES\n` : "\nunits model: all passed\n");
process.exit(fails ? 1 : 0);
