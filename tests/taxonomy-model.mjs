// THE CLASSIFICATION LISTS, asserted without a database.
//
// Six lists that no studio could change. What matters is what a studio may NOT
// do to a list its own records already name.
import {
  TAXONOMIES, AXIS_KEYS, MAX_PER_AXIS, axisProblems, taxonomyProblems,
  cleanTaxonomies, valuesFor, admits, resolveValue, taxonomyView,
} from "../src/modules/administration/taxonomy.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// THE DEFAULTS ARE THE LISTS THIS REPLACED, VERBATIM. Typing a plausible list
// instead of copying the real one renames a value on every existing studio at
// deploy — the trap the numbering catalogue nearly shipped.
const byKey = Object.fromEntries(TAXONOMIES.map((a) => [a.key, a.defaults]));
ok("the six axes are the six hard-coded lists",
  AXIS_KEYS.join("|") === "clientIndustries|expenseCategories|paymentMethods|leaveTypes|locationKinds|permitTypes",
  AXIS_KEYS.join("|"));
ok("leave types are the five HR shipped",
  byKey.leaveTypes.join("|") === "Annual|Sick|Unpaid|Parental|Compassionate");
ok("location kinds are the four Operations shipped",
  byKey.locationKinds.join("|") === "Site|Office|Warehouse|Client premises");
ok("payment methods are the five Finance shipped",
  byKey.paymentMethods.join("|") === "Bank transfer|Cash|Card|Cheque|Other");
ok("expense categories are the eleven Finance shipped", byKey.expenseCategories.length === 11);
ok("client industries are the thirty-four Sales shipped", byKey.clientIndustries.length === 34);
ok("permit types are the seven Operations shipped", byKey.permitTypes.length === 7);

// ---- what a studio may add --------------------------------------------------
ok("a good addition passes", axisProblems("leaveTypes", ["Study", "Hajj"]).length === 0);
ok("a blank entry is refused", axisProblems("leaveTypes", [""]).length === 1);
// NO COMMAS OR QUOTES: every one of these lists is a candidate CSV column.
ok("a comma is refused", axisProblems("leaveTypes", ["Study, unpaid"]).length === 1);
// INTERNAL SPACES ARE THE POINT — two shipped values already have them.
ok("an internal space is fine", axisProblems("permitTypes", ["Diving operations"]).length === 0);
// THE SHIPPED VALUES COUNT AS TAKEN: admitting "Annual" as an addition would
// put the same word in the dropdown twice.
ok("A SHIPPED VALUE CANNOT BE ADDED AGAIN",
  axisProblems("leaveTypes", ["annual"]).some((p) => /already in leaveTypes/.test(p)));
ok("...nor can one addition be listed twice",
  axisProblems("leaveTypes", ["Study", "study"]).length === 1);
ok("too many is refused",
  axisProblems("leaveTypes", Array.from({ length: MAX_PER_AXIS + 1 }, (_, i) => `L${i}`))
    .some((p) => /no more than/.test(p)));
// AN AXIS NOTHING READS is a vocabulary nobody can exercise — invariant 16 one
// layer down, so it is named rather than ignored.
ok("AN UNDECLARED AXIS IS NAMED, NOT IGNORED",
  axisProblems("favouriteColours", ["Blue"]).length === 1);
ok("a list that is not a list is refused", axisProblems("leaveTypes", "Annual").length === 1);
ok("every axis is checked in one save",
  taxonomyProblems({ leaveTypes: [""], permitTypes: ["a,b"] }).length === 2);
ok("nothing stored is nothing wrong", taxonomyProblems(undefined).length === 0);
ok("an array is not a taxonomy map", taxonomyProblems(["Annual"]).length === 1);

// ---- cleaning ---------------------------------------------------------------
const STORED = { leaveTypes: [" Study ", "Annual", "Study", "bad,value"], nonsense: ["x"] };
const clean = cleanTaxonomies(STORED);
ok("cleaning trims and drops what is already shipped or listed twice",
  clean.leaveTypes.join("|") === "Study", JSON.stringify(clean));
// AN UNKNOWN AXIS IS DROPPED: a key nothing reads is a list a studio maintains
// and never sees used.
ok("AN UNKNOWN AXIS IS DROPPED", !("nonsense" in clean));
ok("an axis with nothing left is absent rather than empty",
  !("permitTypes" in cleanTaxonomies({ permitTypes: ["Hot work"] })));

// ---- what a studio may choose -----------------------------------------------
const CHOICES = valuesFor("leaveTypes", STORED);
// SHIPPED FIRST, because several services take [0] as their fallback and a
// dropdown whose first entry moved would quietly re-default every form.
ok("SHIPPED VALUES COME FIRST AND THE STUDIO'S FOLLOW",
  CHOICES.join("|") === "Annual|Sick|Unpaid|Parental|Compassionate|Study", CHOICES.join("|"));
ok("a studio with no additions gets exactly what shipped",
  valuesFor("leaveTypes", null).join("|") === byKey.leaveTypes.join("|"));
ok("an undeclared axis offers nothing", valuesFor("favouriteColours", STORED).length === 0);

ok("a shipped value is admitted", admits("leaveTypes", STORED, "Sick"));
ok("the studio's own is admitted", admits("leaveTypes", STORED, "Study"));
ok("...case-insensitively", admits("leaveTypes", STORED, "study"));
ok("anything else is not", !admits("leaveTypes", STORED, "Sabbatical"));

// THE PRODUCT'S SPELLING, NOT THE CALLER'S. These values are what every
// grouping and every report counts by, so one list splitting into two on case
// alone is the whole failure.
ok("RESOLVING RETURNS THE PRODUCT'S SPELLING",
  resolveValue("leaveTypes", STORED, "annual") === "Annual");
ok("...and the studio's own spelling for its own",
  resolveValue("leaveTypes", STORED, "STUDY") === "Study");
// THE FALLBACK IS WHAT THE SERVICE ALREADY DID, kept so this is a widening
// rather than a behaviour change: the record still saves.
ok("an unrecognised value falls back rather than throwing",
  resolveValue("leaveTypes", STORED, "Sabbatical", "Annual") === "Annual");
ok("...and to nothing when the caller names no fallback",
  resolveValue("leaveTypes", STORED, "Sabbatical") === "");

// ---- the screen's shape -----------------------------------------------------
const view = taxonomyView(STORED);
ok("every axis is rendered whether the studio touched it or not", view.length === TAXONOMIES.length);
ok("an untouched axis has no additions",
  view.find((a) => a.key === "permitTypes").own.length === 0);
ok("a touched one carries only the studio's",
  view.find((a) => a.key === "leaveTypes").own.join("|") === "Study");

console.log(fails ? `\ntaxonomy model: ${fails} FAILURES\n` : "\ntaxonomy model: all passed\n");
process.exit(fails ? 1 : 0);
