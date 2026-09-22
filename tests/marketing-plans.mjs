// THE PLAN FOR A PERIOD — its dates, what refuses it, and what it adds up.
//
// THE DEFECTS THESE GUARD: a campaign counted in two quarters at once (the
// reason membership is named rather than inferred); a sub-campaign's budget
// counted both in its own right and inside its parent's; a plan with no budget
// reporting a share used of nought or Infinity; a month taken from the 12th, so
// two plans called March disagree about when March is; and a plan deleted out
// from under the campaigns that name it.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const P = await import("@/modules/marketing/plans");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the period a kind means");
const q = P.planPeriod("quarter", "2027-02-11");
ok("a quarter is whole, from any day inside it", q.startOn === "2027-01-01" && q.endOn === "2027-03-31", JSON.stringify(q));
ok("...and the fourth ends on the 31st", P.planPeriod("quarter", "2027-11-02").endOn === "2027-12-31");
const m = P.planPeriod("month", "2027-02-12");
ok("a month is whole, never from the 12th", m.startOn === "2027-02-01" && m.endOn === "2027-02-28", JSON.stringify(m));
ok("...and a leap February ends on the 29th", P.planPeriod("month", "2028-02-01").endOn === "2028-02-29");
ok("a half year is six months", P.planPeriod("half", "2027-09-30").startOn === "2027-07-01");
ok("a year is twelve", P.planPeriod("year", "2027-09-30").endOn === "2027-12-31");
ok("custom takes the day as given", P.planPeriod("custom", "2027-03-05").startOn === "2027-03-05");
ok("nonsense builds no period", P.planPeriod("quarter", "soon").startOn === "");

console.log("\n== what it is called");
ok("a quarter", JSON.stringify(P.periodLabel("quarter", "2027-04-01")) === JSON.stringify({ token: "quarter", n: 2, year: 2027 }));
ok("a half", P.periodLabel("half", "2027-07-01").n === 2);
ok("a custom range has no name of its own", P.periodLabel("custom", "2027-03-05") === null);

console.log("\n== what refuses a plan");
ok("a plan needs a name", P.planProblem({ name: " ", periodKind: "month", startOn: "2027-01-01", endOn: "2027-01-31" }) === "name");
ok("...and a period it recognises", P.planProblem({ name: "Q1", periodKind: "fortnight", startOn: "2027-01-01", endOn: "2027-01-31" }) === "period");
ok("...and dates", P.planProblem({ name: "Q1", periodKind: "custom", startOn: "", endOn: "" }) === "dates");
ok("...that end on or after they start", P.planProblem({ name: "Q1", periodKind: "custom", startOn: "2027-02-02", endOn: "2027-02-01" }) === "dates");
ok("a one-day plan is fine", P.planProblem({ name: "Launch day", periodKind: "custom", startOn: "2027-02-01", endOn: "2027-02-01" }) === "");

console.log("\n== deleting");
ok("a plan with campaigns does not delete", P.planDeletable(true) === "has-campaigns");
ok("an empty one does", P.planDeletable(false) === "");

console.log("\n== what a plan holds");
// A parent and its sub-campaign BOTH filed under this plan: the sub-campaign
// spends the parent's money, so counting both would double the allocation.
const mine = [
  { id: "p", parentId: "", planId: "PL", status: "Active", budget: 10000, startOn: "2027-01-05", endOn: "2027-02-05" },
  { id: "k", parentId: "p", planId: "PL", status: "Active", budget: 3000, startOn: "2027-01-05", endOn: "2027-02-05" },
  { id: "x", parentId: "", planId: "PL", status: "Planned", budget: 2000, startOn: "2027-02-01", endOn: "2027-03-01" },
  { id: "c", parentId: "", planId: "PL", status: "Cancelled", budget: 5000, startOn: "2027-01-05", endOn: "2027-02-05" },
  { id: "n", parentId: "", planId: "PL", status: "Draft", budget: null, startOn: "", endOn: "" },
];
const spent = new Map([["p", 4000], ["k", 1500], ["x", 0]]);
const r = P.planRollup(15000, mine, spent);
ok("a sub-campaign is counted inside its parent, not twice", r.allocated === 12000, String(r.allocated));
ok("a cancelled campaign hands nothing out", r.allocated === 12000);
ok("what is not yet handed out", r.left === 3000, String(r.left));
ok("spend is each campaign's OWN, so a sub-campaign is not counted twice", r.spent === 5500, String(r.spent));
ok("remaining is the budget less what went, not less what was promised", r.remaining === 9500, String(r.remaining));
ok("campaigns are counted, and the ones with no budget said separately", r.campaigns === 5 && r.unbudgeted === 1);
ok("inside its envelope", r.over === false);

// A SUB-CAMPAIGN WHOSE PARENT IS IN ANOTHER PLAN is this plan's money: the
// parent's budget is not in this total to contain it.
const orphan = P.planRollup(1000, [{ id: "k", parentId: "p", planId: "PL", status: "Active", budget: 300 }], new Map());
ok("a sub-campaign whose parent is elsewhere counts here", orphan.allocated === 300, String(orphan.allocated));

console.log("\n== null rather than zero");
const none = P.planRollup(null, mine, spent);
ok("no budget leaves nothing to be left", none.left === null && none.remaining === null);
ok("...and no share used", none.used === null);
ok("...but what went out is still known", none.spent === 5500);
ok("a budget of nought does not divide", P.planRollup(0, mine, spent).used === null);
ok("a real budget gives a real share", Math.round(P.planRollup(11000, mine, spent).used * 100) === 50);
ok("handing out more than the plan holds is over", P.planRollup(10000, mine, spent).over === true);
ok("...and what is left goes negative rather than to nought", P.planRollup(10000, mine, spent).left === -2000);

console.log("\n== the campaigns nobody filed");
const all = [
  ...mine,
  { id: "u1", parentId: "", planId: "", status: "Active", budget: 800, startOn: "2027-01-20", endOn: "2027-02-20" },
  { id: "u2", parentId: "", planId: "", status: "Cancelled", budget: 900, startOn: "2027-01-20", endOn: "2027-02-20" },
  { id: "u3", parentId: "", planId: "", status: "Planned", budget: 700, startOn: "2027-06-01", endOn: "2027-07-01" },
  { id: "u4", parentId: "", planId: "", status: "Planned", budget: 600, startOn: "", endOn: "" },
];
const gap = P.unplanned("2027-01-01", "2027-03-31", all).map((c) => c.id);
ok("a live campaign in the period with no plan is named", gap.includes("u1"));
ok("a cancelled one is not — it is not running", !gap.includes("u2"));
ok("one running outside the period is not", !gap.includes("u3"));
ok("one with no dates cannot be placed in a period at all", !gap.includes("u4"));
ok("a campaign that IS filed is not a gap", !gap.some((id) => ["p", "k", "x"].includes(id)), gap.join());
// THE BOUNDARY CASE THE WHOLE DESIGN TURNS ON: a campaign crossing from one
// quarter into the next falls inside BOTH windows, which is why membership is
// named and not inferred — it is a gap in both until somebody files it once.
const crosser = [{ id: "z", parentId: "", planId: "", status: "Active", budget: 500, startOn: "2027-03-20", endOn: "2027-04-10" }];
ok("a campaign crossing a quarter boundary is in both windows",
  P.unplanned("2027-01-01", "2027-03-31", crosser).length === 1
  && P.unplanned("2027-04-01", "2027-06-30", crosser).length === 1);
ok("...and once filed it belongs to exactly one",
  P.unplanned("2027-01-01", "2027-03-31", [{ ...crosser[0], planId: "PL" }]).length === 0);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
