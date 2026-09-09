// KPI TARGETS, asserted without a database.
//
// The comparisons are trivial. What is worth asserting is the third state —
// `unknown` — because collapsing it into either of the other two is the whole
// way a dashboard lies.
import {
  targetProblems, cleanTarget, targetState, progress, rankTargets, DIRECTIONS,
} from "../src/modules/reports/targets.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- what a target must have ------------------------------------------------
ok("a target needs a name",
  targetProblems({ reportId: "r1", direction: "atLeast", value: 10 }).length === 1);
// A TARGET WITHOUT A REPORT IS A LINE DRAWN ACROSS NO NUMBER.
ok("A TARGET NEEDS A REPORT TO MEASURE",
  targetProblems({ label: "Revenue", direction: "atLeast", value: 10 }).length === 1);
ok("a target needs a direction",
  targetProblems({ label: "R", reportId: "r1", value: 10 }).length === 1);
ok("a target needs a number",
  targetProblems({ label: "R", reportId: "r1", direction: "atLeast" }).length === 1);
ok("a warning point outside 0..1 is refused",
  targetProblems({ label: "R", reportId: "r1", direction: "atLeast", value: 10, warnAt: 2 }).length === 1);
ok("a good target passes",
  targetProblems({ label: "R", reportId: "r1", direction: "atLeast", value: 10 }).length === 0);
ok("the two directions are the whole ladder", DIRECTIONS.join("|") === "atLeast|atMost");
// A TARGET THAT ONLY SPEAKS ONCE IT IS MISSED is a post-mortem, not a control.
ok("the warning point defaults to nine tenths",
  cleanTarget({ label: "R", reportId: "r1", direction: "atLeast", value: 10 }).warnAt === 0.9);

const floor = { id: "t1", label: "Revenue", reportId: "r1", direction: "atLeast", value: 100, warnAt: 0.9 };
const ceiling = { id: "t2", label: "Overdue", reportId: "r2", direction: "atMost", value: 100, warnAt: 0.9 };

// ---- a floor ----------------------------------------------------------------
ok("a floor is met when it is reached", targetState(floor, 100) === "met");
ok("...and when it is passed", targetState(floor, 250) === "met");
// A FLOOR WARNS AS IT IS APPROACHED FROM ABOVE.
ok("a floor warns just below", targetState(floor, 92) === "warning");
ok("a floor is breached well below", targetState(floor, 40) === "breached");

// ---- a ceiling: same fraction, opposite side --------------------------------
ok("a ceiling is met well under", targetState(ceiling, 40) === "met");
ok("A CEILING WARNS AS IT IS APPROACHED FROM BELOW", targetState(ceiling, 92) === "warning");
ok("a ceiling is met exactly at the line", targetState(ceiling, 100) === "warning");
ok("a ceiling is breached above it", targetState(ceiling, 101) === "breached");

// ---- the state that matters -------------------------------------------------
// A REPORT THAT MEASURED NOTHING is a sales target with no closed deals yet, or
// a defect ceiling with nothing inspected. Calling that a BREACH raises an
// alarm about an absence of data; calling it MET is the same mistake in the
// more dangerous direction.
ok("NOTHING MEASURED IS `unknown`, NOT BREACHED", targetState(floor, null) === "unknown");
ok("...AND NOT MET", targetState(ceiling, null) === "unknown");

ok("progress is the fraction of the way there", progress(floor, 50) === 0.5);
ok("progress over a target of nought is null rather than infinite",
  progress({ ...floor, value: 0 }, 5) === null);
ok("progress of an unmeasured target is null", progress(floor, null) === null);
// A FLOOR OF NOUGHT IS MET BY ANYTHING and warns about nothing; the guard is
// what keeps the fraction from dividing by zero.
ok("a floor of nought is simply met", targetState({ ...floor, value: 0 }, 0) === "met");

// ---- what to put in front of somebody ---------------------------------------
const ranked = rankTargets([
  { id: "a", state: "met" }, { id: "b", state: "unknown" },
  { id: "c", state: "breached" }, { id: "d", state: "warning" },
]);
ok("breached comes first", ranked[0].id === "c");
ok("then warning", ranked[1].id === "d");
// A TARGET NOBODY CAN MEASURE IS A QUESTION TO ANSWER; one that is met is news
// that can wait.
ok("UNKNOWN OUTRANKS MET", ranked[2].id === "b" && ranked[3].id === "a");

console.log(fails ? `\ntargets model: ${fails} FAILURES\n` : "\ntargets model: all passed\n");
process.exit(fails ? 1 : 0);
