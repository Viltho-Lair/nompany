// LEAVE BALANCES, PURELY (tier 6).
//
// THE DEFECT THESE GUARD is that there was no balance at all: a request, an
// approval, and nothing that subtracted a day from anything — so nobody could be
// told how much leave they had left, which every labour law in the region
// assumes somebody can.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const L = await import("@/modules/hr/leaveBalance");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== counting days");
ok("calendar days are inclusive", L.countLeaveDays("2026-09-01", "2026-09-07", null) === 7);
// 1 Sep 2026 is a Tuesday; a Sunday-to-Thursday week works five of those seven.
const sunThu = L.openWeekdays({ sun: { open: true }, mon: { open: true }, tue: { open: true }, wed: { open: true }, thu: { open: true }, fri: { open: false }, sat: { open: false } });
ok("the open days are read off working hours", JSON.stringify(sunThu) === "[0,1,2,3,4]");
ok("working days skip the weekend", L.countLeaveDays("2026-09-01", "2026-09-07", sunThu) === 5);
ok("a weekend-only request is no working days", L.countLeaveDays("2026-09-04", "2026-09-05", sunThu) === 0);
ok("hours never set count calendar days, not none", L.openWeekdays({}) === null);
ok("backwards is nothing", L.countLeaveDays("2026-09-07", "2026-09-01", null) === 0);

console.log("\n== service and the allowance");
ok("five completed years by January", L.serviceYearsAt("2020-03-15", "2026-01-01") === 5);
ok("not yet five", L.serviceYearsAt("2021-03-15", "2026-01-01") === 4);
const tiered = { days: 14, afterYears: 5, daysAfter: 21, carryOver: 0 };
ok("the longer-service figure after the years", L.allowanceFor(tiered, "2020-03-15", 2026) === 21);
ok("the base figure before them", L.allowanceFor(tiered, "2022-01-10", 2026) === 14);
ok("the joining year is pro-rated from the month joined", L.allowanceFor(tiered, "2026-07-01", 2026) === 7);
ok("a person's own allowance replaces the rule", L.allowanceFor(tiered, "2020-03-15", 2026, 30) === 30);
ok("nothing before they joined", L.allowanceFor(tiered, "2027-02-01", 2026) === 0);

console.log("\n== the balance");
const rules = { leave: { Annual: { days: 21, afterYears: 0, daysAfter: 0, carryOver: 5 } }, workingDays: false };
const rows = [
  { collaboratorId: "p1", type: "Annual", status: "Approved", from: "2025-03-01", to: "2025-03-10", days: 10 },
  { collaboratorId: "p1", type: "Annual", status: "Approved", from: "2026-02-01", to: "2026-02-03", days: 3 },
  { collaboratorId: "p1", type: "Annual", status: "Pending", from: "2026-05-01", to: "2026-05-02", days: 2 },
  { collaboratorId: "p1", type: "Annual", status: "Declined", from: "2026-06-01", to: "2026-06-20", days: 20 },
  { collaboratorId: "p2", type: "Annual", status: "Approved", from: "2026-02-01", to: "2026-02-28", days: 28 },
];
const [b] = L.leaveBalances({ rules, person: { id: "p1", dateOfJoin: "2024-01-01" }, vacations: rows, year: 2026, open: null });
ok("unused leave carries, capped", b.carried === 5, JSON.stringify(b));
ok("approved leave is taken", b.taken === 3);
ok("pending is shown apart", b.pending === 2);
ok("declined leave counts for nothing, and nobody else's does", b.remaining === 23 && b.afterPending === 21);
const [late] = L.leaveBalances({ rules, person: { id: "p9", dateOfJoin: "" }, vacations: [], year: 2026, open: null });
ok("no join date means no carry and a full year", late.carried === 0 && late.allowance === 21);
const span = [{ collaboratorId: "p1", type: "Annual", status: "Approved", from: "2025-12-30", to: "2026-01-02", days: 4 }];
const [s] = L.leaveBalances({ rules, person: { id: "p1", dateOfJoin: "2025-01-01" }, vacations: span, year: 2026, open: null });
ok("leave across New Year is split between the years", s.taken === 2 && s.carried === 5, JSON.stringify(s));
ok("a type with no rule keeps no balance",
  L.leaveBalances({ rules, person: { id: "p1" }, vacations: [], year: 2026, open: null }).every((x) => x.type === "Annual"));

console.log("\n== what a studio may store");
const types = ["Annual", "Sick", "Unpaid"];
ok("a good set is kept", "rules" in L.cleanEmploymentRules({ leave: { Annual: { days: "14", afterYears: "5", daysAfter: "21", carryOver: "7" } }, workingDays: true }, types));
ok("blank days drops the type rather than refusing",
  Object.keys(L.cleanEmploymentRules({ leave: { Annual: { days: "" } } }, types).rules.leave).length === 0);
ok("a type the studio does not admit is refused", L.employmentRuleProblems({ leave: { Study: { days: 5 } } }, types)[0]?.field === "type");
ok("days that are not a number are refused", L.employmentRuleProblems({ leave: { Annual: { days: "abc" } } }, types)[0]?.field === "days");
ok("after years with no new figure is refused", L.employmentRuleProblems({ leave: { Annual: { days: 14, afterYears: 5 } } }, types)[0]?.field === "daysAfter");
ok("a new figure that never starts is refused", L.employmentRuleProblems({ leave: { Annual: { days: 14, daysAfter: 21 } } }, types)[0]?.field === "afterYears");
ok("a person's allowances keep only ruled types", JSON.stringify(L.cleanAllowances({ Annual: "30", Sick: "10", Unpaid: "" }, ["Annual", "Sick"])) === JSON.stringify({ Annual: 30, Sick: 10 }));

console.log(fails ? `\n${fails} failed` : "\nall passed");
process.exitCode = fails ? 1 : 0;
