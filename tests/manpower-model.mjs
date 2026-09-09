// MANPOWER PLANNING, asserted without a database.
//
// A plan is a DEMAND, not an assignment. What is worth asserting is what it
// refuses to decide on the planner's behalf.
import {
  manpowerProblems, cleanManpower, liveOn, manpowerGaps, shortDays,
} from "../src/modules/hr/manpower.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const base = { projectId: "p1", roleId: "r1", needed: 4, fromDay: "2026-03-01", toDay: "2026-06-30" };

// ---- what a plan line must have ---------------------------------------------
ok("a line belongs to a project", manpowerProblems({ ...base, projectId: "" }).length === 1);
// A LINE WITH NO ROLE asks for "four people", which cannot be compared against
// anything: supply is counted by role.
ok("A LINE NEEDS A ROLE", manpowerProblems({ ...base, roleId: "" }).length === 1);
ok("a line needs at least one person", manpowerProblems({ ...base, needed: 0 }).length === 1);
ok("half a person is refused", manpowerProblems({ ...base, needed: 2.5 }).length === 1);
ok("a line needs both dates", manpowerProblems({ ...base, fromDay: "", toDay: "" }).length === 2);
// A LINE ENDING BEFORE IT STARTS is demand on no day at all, and would silently
// never appear.
ok("A LINE CANNOT END BEFORE IT STARTS",
  manpowerProblems({ ...base, fromDay: "2026-06-01", toDay: "2026-03-01" })
    .some((p) => /end before it starts/.test(p)));
ok("a good line passes", manpowerProblems(base).length === 0);
ok("cleaning rounds the headcount", cleanManpower({ ...base, needed: 3.7 }).needed === 4);

// ---- when a line is live -----------------------------------------------------
const plan = { id: "m1", ...base, notes: "" };
ok("a line is live inside its window", liveOn(plan, "2026-04-01"));
ok("...on its first day", liveOn(plan, "2026-03-01"));
ok("...and its last", liveOn(plan, "2026-06-30"));
ok("a line is not live before it starts", liveOn(plan, "2026-02-28") === false);
ok("...or after it ends", liveOn(plan, "2026-07-01") === false);

// ---- the gap ------------------------------------------------------------------
const ROLES = [{ id: "r1", name: "Site Engineer" }, { id: "r2", name: "Foreman" }];
const PEOPLE = [
  { roleIds: ["r1"] }, { roleIds: ["r1"] },        // two site engineers
  { roleIds: ["r2", "r1"] },                        // one who is both
  { roleIds: [] },
];
const PLANS = [
  plan,                                                                     // r1 x4
  { id: "m2", projectId: "p2", roleId: "r1", needed: 2, fromDay: "2026-04-01", toDay: "2026-05-01", notes: "" },
  { id: "m3", projectId: "p1", roleId: "r2", needed: 1, fromDay: "2026-03-01", toDay: "2026-06-30", notes: "" },
  { id: "m4", projectId: "p3", roleId: "gone", needed: 1, fromDay: "2026-03-01", toDay: "2026-06-30", notes: "" },
];

const march = manpowerGaps(PLANS, ROLES, PEOPLE, "2026-03-15");
const of = (id) => march.find((g) => g.roleId === id);
ok("demand is what the live lines ask for", of("r1").needed === 4);
// A PERSON HOLDING TWO ROLES COUNTS IN BOTH, because they are qualified for
// both — which of the two they actually do is the planner's decision.
ok("supply counts everybody holding the role", of("r1").have === 3);
// SHORT AND SPARE ARE TWO FIELDS, not one signed number: one is a hiring
// decision and the other a reassignment, and a minus sign makes the reader
// parse to tell which.
ok("SHORT IS THE GAP AND IS NEVER NEGATIVE", of("r1").short === 1 && of("r1").spare === 0);
ok("SPARE IS THE SURPLUS AND IS NEVER NEGATIVE", of("r2").spare === 0 && of("r2").short === 0,
  JSON.stringify(of("r2")));
ok("a role with more people than demand shows spare",
  manpowerGaps([{ ...plan, needed: 1 }], ROLES, PEOPLE, "2026-03-15")[0].spare === 2);
// A ROLE THAT HAS BEEN DELETED still has demand written against it, and saying
// so beats dropping the line: somebody planned for it.
ok("A DELETED ROLE IS NAMED, NOT DROPPED", of("gone").roleName === "(removed role)");
ok("...and its demand still counts", of("gone").needed === 1);
ok("the shortest-staffed role comes first", march[0].roleId === "r1");
ok("a line shows which projects asked", of("r1").projects.length === 1);

// SUPPLY IS NOT REDUCED BY OTHER PROJECTS: which of two overlapping jobs gets
// somebody is a decision a planner makes, and a model that quietly assigned
// them would be answering it in silence.
const april = manpowerGaps(PLANS, ROLES, PEOPLE, "2026-04-15");
ok("two overlapping projects add their demand", april.find((g) => g.roleId === "r1").needed === 6);
ok("...against the same supply", april.find((g) => g.roleId === "r1").have === 3);
ok("...so the shortfall is the sum", april.find((g) => g.roleId === "r1").short === 3);
ok("both projects are listed", april.find((g) => g.roleId === "r1").projects.length === 2);

// ---- when the gap starts ------------------------------------------------------
// A GAP ON ONE DAY IS NOT A PLANNING PROBLEM; one that lasts six weeks is.
const window = shortDays(PLANS, ROLES, PEOPLE, { from: "2026-02-25", to: "2026-03-05" });
ok("no shortfall before the plan starts", !window.some((d) => d.day < "2026-03-01"));
ok("a shortfall from the first day it exists",
  window[0]?.day === "2026-03-01", JSON.stringify(window[0]));
ok("a role with no shortfall is not listed", !window.some((d) => d.roleId === "r2"));
ok("a backwards window is empty",
  shortDays(PLANS, ROLES, PEOPLE, { from: "2026-06-01", to: "2026-03-01" }).length === 0);
// FOUR MONTHS IS A PLAN AND FOUR YEARS IS A SPREADSHEET.
ok("the walk is capped",
  shortDays(PLANS, ROLES, PEOPLE, { from: "2026-03-01", to: "2030-01-01", limit: 3 })
    .every((d) => d.day <= "2026-03-03"));

console.log(fails ? `\nmanpower model: ${fails} FAILURES\n` : "\nmanpower model: all passed\n");
process.exit(fails ? 1 : 0);
