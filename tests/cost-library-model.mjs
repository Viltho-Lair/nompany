// THE STUDIO'S STANDARD COST CODES, asserted without a database.
//
// The library exists so codes MATCH across projects, which is a string
// comparison — so every rule that protects the string is the feature.
import {
  libraryProblems, cleanLibraryCode, libraryGroups, libraryView, offerable,
  codeDrift, sameCode,
} from "../src/modules/administration/costCodes.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- the code format --------------------------------------------------------
const C = { code: "05.10", name: "Formwork", group: "Concrete" };
ok("a good code passes", libraryProblems(C).length === 0);
ok("a cost code needs a code", libraryProblems({ ...C, code: "" }).length === 1);
// A CODE NOBODY CAN RECOGNISE cannot be chosen from a picker: "05.10" means
// something to whoever wrote it and to nobody else.
ok("A COST CODE NEEDS A NAME", libraryProblems({ ...C, name: "" }).length === 1);
ok("dots, hyphens, slashes and underscores are codes",
  ["05.10", "CIV-100", "PLANT/HIRE", "sub_con"].every((code) => libraryProblems({ ...C, code }).length === 0));
// NO SPACES, and this is the rule doing the work: a code is matched across
// projects as a string, so "PLANT " and "PLANT" would be two rows in every
// report, identical on screen, adding up to nothing.
ok("A CODE WITH A SPACE IS REFUSED", libraryProblems({ ...C, code: "PLANT HIRE" }).length === 1);
ok("...and so is one with a comma", libraryProblems({ ...C, code: "A,B" }).length === 1);
// VALIDATED BEFORE IT IS CAPPED. Reading a longer window than the writer
// stores would call an over-long code legal and then truncate it silently —
// the defect `binProblems` shipped with.
ok("AN OVER-LONG CODE IS REFUSED RATHER THAN TRUNCATED",
  libraryProblems({ ...C, code: "X".repeat(30) }).length === 1);
ok("24 characters is still a code", libraryProblems({ ...C, code: "X".repeat(24) }).length === 0);

// ---- uniqueness -------------------------------------------------------------
const LIB = [
  { id: "a", code: "05.10", name: "Formwork", group: "Concrete", sortOrder: 1 },
  { id: "b", code: "05.20", name: "Rebar", group: "Concrete", sortOrder: 0 },
  { id: "c", code: "PLANT", name: "Plant hire", group: "", sortOrder: 0 },
  { id: "d", code: "PRELIM", name: "Preliminaries", group: "Overheads", sortOrder: 0, archived: true },
];
ok("a duplicate code is refused",
  libraryProblems({ code: "05.10", name: "Something else" }, LIB).length === 1);
// CASE-INSENSITIVELY, because the roll-up compares that way: two spellings of
// one code is the exact failure a shared vocabulary cannot survive.
ok("A DUPLICATE IS REFUSED CASE-INSENSITIVELY",
  libraryProblems({ code: "plant", name: "Plant" }, LIB).length === 1);
ok("...and a row does not collide with itself",
  libraryProblems({ id: "a", code: "05.10", name: "Formwork renamed" }, LIB).length === 0);
ok("sameCode ignores case and surrounding space", sameCode(" EW ", "ew"));

// ---- cleaning ---------------------------------------------------------------
const clean = cleanLibraryCode({ code: " 05.10 ", name: " Formwork ", group: " Concrete ", sortOrder: "3.7" });
ok("cleaning trims", clean.code === "05.10" && clean.name === "Formwork" && clean.group === "Concrete");
ok("sortOrder is a whole number", clean.sortOrder === 3);
ok("rubbish sortOrder is nought", cleanLibraryCode({ code: "A", name: "A", sortOrder: "soon" }).sortOrder === 0);
ok("a new code is not archived", clean.archived === false);

// ---- reading order ----------------------------------------------------------
ok("groups come out in the order the library first meets them",
  libraryGroups(LIB).join("|") === "Concrete|Overheads");
const view = libraryView(LIB);
ok("rows are grouped, then by sortOrder, then by code",
  view.map((r) => r.code).join("|") === "05.20|05.10|PRELIM|PLANT",
  view.map((r) => r.code).join("|"));
// UNGROUPED ROWS COME LAST rather than first: they are the ones nobody has
// filed yet, not the headline of the list.
ok("AN UNFILED CODE SORTS LAST", view[view.length - 1].code === "PLANT");
// A RETIRED CODE IS NOT OFFERED and is not gone: fifty projects still name it.
ok("A RETIRED CODE IS NOT OFFERED ON A NEW PROJECT",
  offerable(LIB).map((r) => r.code).join("|") === "05.20|05.10|PLANT");

// ---- drift ------------------------------------------------------------------
const USED = [
  { code: "05.10", projectId: "p1" },
  { code: "05.10", projectId: "p2" },
  { code: "EARTH", projectId: "p1" },
  { code: "EARTH", projectId: "p2" },
  { code: "EARTH", projectId: "p3" },
  // The same private code on forty lines of ONE job is one project's decision.
  { code: "SCAFF", projectId: "p4" },
  { code: "SCAFF", projectId: "p4" },
  { code: "SCAFF", projectId: "p4" },
  { code: "prelim", projectId: "p5" },
  { code: "", projectId: "p6" },
];
const drift = codeDrift(LIB, USED);
ok("a code the library has never heard of is off-standard",
  drift.offStandard.map((d) => d.code).join("|") === "EARTH|SCAFF",
  JSON.stringify(drift.offStandard));
// COUNTED BY PROJECT, NOT BY ROW: ranking by rows would put one detailed
// project's private code above one that three projects independently reached
// for, which inverts the only question the report answers.
ok("OFF-STANDARD CODES RANK BY HOW MANY PROJECTS REACHED FOR THEM",
  drift.offStandard[0].projects === 3 && drift.offStandard[1].projects === 1);
// AN ARCHIVED CODE IS STILL KNOWN. A project running since before it was
// retired has not drifted from anything.
ok("A RETIRED CODE IS NOT DRIFT", !drift.offStandard.some((d) => sameCode(d.code, "PRELIM")));
ok("a blank code is nobody's drift", !drift.offStandard.some((d) => d.code === ""));
ok("a library code no project took is unused, not a fault",
  drift.unused.join("|") === "05.20|PLANT", drift.unused.join("|"));
// A CODE ALREADY RETIRED IS NOT A CANDIDATE TO RETIRE: it is out of the picker
// already, so listing it would be an action nobody can take.
ok("A RETIRED CODE IS NOT SUGGESTED FOR RETIREMENT",
  codeDrift(LIB, []).unused.join("|") === "05.10|05.20|PLANT",
  codeDrift(LIB, []).unused.join("|"));
ok("the count is of distinct codes in use", drift.inUse === 4, String(drift.inUse));
// AN EMPTY LIBRARY MAKES EVERYTHING OFF-STANDARD, which is the truthful answer
// on day one: the studio has no standard, so nothing conforms to it.
ok("an empty library reports every code as off-standard",
  codeDrift([], USED).offStandard.length === 4);

console.log(fails ? `\ncost library model: ${fails} FAILURES\n` : "\ncost library model: all passed\n");
process.exit(fails ? 1 : 0);
