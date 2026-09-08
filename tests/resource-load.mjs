// RESOURCE LOAD, PURELY. A person's commitment is arithmetic over spans, so
// none of this needs a store, a route or a plan document — it runs in
// milliseconds beside tests/planner-schedule.mjs.
//
// ONE ASSERTION PER RULE THE REPORT DEPENDS ON, and the first two are the ones
// that would make the whole screen lie rather than merely be wrong in a corner:
// a summary row counted as work doubles every parent's load, and a milestone
// counted as work occupies somebody for a day that has no duration at all.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const R = await import("@/modules/projects/resources");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const sara = { id: "res_sara", name: "Sara", capacity: 100 };
const omar = { id: "res_omar", name: "Omar", capacity: 200 };

const plan = (id, projectTitle, tasks) => ({
  id, name: `${projectTitle} plan`, projectId: `prj_${id}`, projectTitle, tasks,
});

console.log("\n== a day somebody is on ==\n");

const one = R.resourceLoad(
  [plan("p1", "Tower fit-out", [
    { id: "t1", name: "First fix", assigneeIds: ["res_sara"], start: "2031-03-02", end: "2031-03-04" },
  ])],
  [sara], {},
);
ok("the person appears", one.people.length === 1, String(one.people.length));
// 2nd, 3rd, 4th — inclusive at both ends, because a task that starts and ends on
// the same day is one day of work, not nought.
ok("a three-day span is three days", one.people[0].committedDays === 3,
  String(one.people[0].committedDays));
ok("...and no conflict on its own", one.people[0].conflictDays === 0);
ok("...and it names the job it is for", one.people[0].work[0].projectTitle === "Tower fit-out");

const sameDay = R.resourceLoad(
  [plan("p1", "Tower", [{ assigneeIds: ["res_sara"], start: "2031-03-02", end: "2031-03-02" }])],
  [sara], {},
);
ok("a one-day task is one day, not nought", sameDay.people[0].committedDays === 1,
  String(sameDay.people[0].committedDays));

console.log("\n== the two rows that are not work ==\n");

// A SUMMARY ROW'S SPAN IS ITS CHILDREN'S. Counting both is the single easiest
// way to make this screen lie: every parent would double its own subtree.
const withSummary = R.resourceLoad(
  [plan("p1", "Tower", [
    { name: "Phase 1", isSummary: true, assigneeIds: ["res_sara"], start: "2031-03-02", end: "2031-03-10" },
    { name: "First fix", assigneeIds: ["res_sara"], start: "2031-03-02", end: "2031-03-04" },
  ])],
  [sara], {},
);
ok("A SUMMARY ROW IS NOT WORK", withSummary.people[0].committedDays === 3,
  String(withSummary.people[0].committedDays));

// A MILESTONE IS A MOMENT. Somebody named on one is not occupied by it.
const withMilestone = R.resourceLoad(
  [plan("p1", "Tower", [
    { name: "Handover", isMilestone: true, assigneeIds: ["res_sara"], start: "2031-03-09", end: "2031-03-09" },
  ])],
  [sara], {},
);
ok("A MILESTONE IS NOT WORK", withMilestone.people.length === 0, String(withMilestone.people.length));

console.log("\n== over-committed, which is the question ==\n");

// THE CASE THAT COULD NOT BE ASKED BEFORE: two plans, one person, one week.
const across = R.resourceLoad(
  [
    plan("p1", "Tower", [{ assigneeIds: ["res_sara"], start: "2031-03-02", end: "2031-03-04" }]),
    plan("p2", "Depot", [{ assigneeIds: ["res_sara"], start: "2031-03-03", end: "2031-03-05" }]),
  ],
  [sara], {},
);
ok("committed days count each day once", across.people[0].committedDays === 4,
  String(across.people[0].committedDays));
ok("...while assignment days count the doubling", across.people[0].assignmentDays === 6,
  String(across.people[0].assignmentDays));
ok("TWO JOBS ON ONE DAY IS A CONFLICT", across.people[0].conflictDays === 2,
  String(across.people[0].conflictDays));
ok("...and it says which day to look at", across.people[0].firstConflict === "2031-03-03",
  String(across.people[0].firstConflict));
ok("...and both jobs are named", across.people[0].work.length === 2);

// CAPACITY IS A PERCENT OF AN FTE, so 200 buys two concurrent assignments and
// the identical overlap is not a conflict for Omar.
const roomy = R.resourceLoad(
  [
    plan("p1", "Tower", [{ assigneeIds: ["res_omar"], start: "2031-03-02", end: "2031-03-04" }]),
    plan("p2", "Depot", [{ assigneeIds: ["res_omar"], start: "2031-03-03", end: "2031-03-05" }]),
  ],
  [omar], {},
);
ok("A DOUBLE-CAPACITY PERSON CARRYING TWO JOBS IS NOT IN CONFLICT",
  roomy.people[0].conflictDays === 0, String(roomy.people[0].conflictDays));

// AN UNKNOWN CAPACITY READS AS ONE, which is the cautious way round: reporting
// no conflict for somebody nobody sized would hide the person most likely to be
// over-committed.
const unsized = R.resourceLoad(
  [
    plan("p1", "Tower", [{ assigneeIds: ["res_new"], start: "2031-03-02", end: "2031-03-02" }]),
    plan("p2", "Depot", [{ assigneeIds: ["res_new"], start: "2031-03-02", end: "2031-03-02" }]),
  ],
  [], {},
);
ok("capacity nobody set is null, not nought", unsized.people[0].capacity === null,
  String(unsized.people[0].capacity));
ok("...and is read as one, so the clash still shows", unsized.people[0].conflictDays === 1);
// A PERSON IN NO RESOURCE LIST STILL APPEARS. Dropping them would make a plan
// that assigns somebody undeclared look like a plan with nothing assigned.
ok("...and they are listed under their id", unsized.people[0].name === "res_new");

console.log("\n== work nobody is on ==\n");

const orphan = R.resourceLoad(
  [plan("p1", "Tower", [
    { name: "Second fix", assigneeIds: [], start: "2031-03-02", end: "2031-03-04" },
  ])],
  [sara], {},
);
ok("UNASSIGNED WORK IS REPORTED, not dropped", orphan.unassignedDays === 3,
  String(orphan.unassignedDays));
ok("...and nobody is invented to carry it", orphan.people.length === 0);

console.log("\n== the window ==\n");

const windowed = R.resourceLoad(
  [plan("p1", "Tower", [{ assigneeIds: ["res_sara"], start: "2031-03-01", end: "2031-03-10" }])],
  [sara], { from: "2031-03-04", to: "2031-03-06" },
);
ok("only the days inside the window count", windowed.people[0].committedDays === 3,
  String(windowed.people[0].committedDays));

const outside = R.resourceLoad(
  [plan("p1", "Tower", [{ assigneeIds: ["res_sara"], start: "2031-01-01", end: "2031-01-05" }])],
  [sara], { from: "2031-03-01", to: "2031-03-31" },
);
ok("...and work wholly outside it drops out", outside.people.length === 0);

console.log("\n== rubbish in ==\n");

ok("no plans is an empty report", R.resourceLoad([], [], {}).people.length === 0);
ok("a task with no start is skipped, not crashed",
  R.resourceLoad([plan("p1", "T", [{ assigneeIds: ["res_sara"] }])], [sara], {}).people.length === 0);
ok("a nonsense date is skipped too",
  R.resourceLoad([plan("p1", "T", [{ assigneeIds: ["res_sara"], start: "soon" }])], [sara], {}).people.length === 0);
// AN END BEFORE ITS START IS ONE DAY, not a negative span and not a hang.
ok("an end before its start is the start day alone",
  R.resourceLoad([plan("p1", "T", [
    { assigneeIds: ["res_sara"], start: "2031-03-04", end: "2031-03-01" },
  ])], [sara], {}).people[0].committedDays === 1);
// A RUNAWAY SPAN IS TRUNCATED RATHER THAN ITERATED. One wrong year in one plan
// must not hang the request that reads every plan in the studio.
const runaway = R.resourceLoad([plan("p1", "T", [
  { assigneeIds: ["res_sara"], start: "2031-03-01", end: "2999-01-01" },
])], [sara], {});
ok("a runaway span is capped", runaway.people[0].committedDays <= 1100,
  String(runaway.people[0].committedDays));

console.log("\n== ordering ==\n");

const many = R.resourceLoad(
  [
    plan("p1", "Tower", [
      { assigneeIds: ["res_omar"], start: "2031-03-02", end: "2031-03-20" },
      { assigneeIds: ["res_sara"], start: "2031-03-02", end: "2031-03-03" },
    ]),
    plan("p2", "Depot", [{ assigneeIds: ["res_sara"], start: "2031-03-02", end: "2031-03-03" }]),
  ],
  [sara, omar], {},
);
// TROUBLE AT THE TOP: this list is read to find it, so the person in conflict
// leads even though the other one is on far more days.
ok("the over-committed person sorts above the merely busy",
  many.people[0].id === "res_sara", many.people.map((p) => p.id).join(","));

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
