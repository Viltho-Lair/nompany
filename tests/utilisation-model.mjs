// PLANT CHARGED TO JOBS — the day count, the rate that applies, and the clash.
//
// Pure, so it needs no database. Two rules here decide whether a studio's job
// costs are real: an inclusive day count (a single-day hire must cost a day)
// and a double-booking refusal (one machine cannot be charged to two jobs at
// once).

import {
  daysOf, utilisation, allocationProblem,
} from "../src/modules/assets/utilisation.ts";

let fails = 0;
const ok = (msg, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(` FAIL  ${msg}${detail ? `  — ${detail}` : ""}`); }
  else console.log(`  ok   ${msg}`);
};

const SEP = { from: "2026-09-01", to: "2026-09-30" };
const alloc = (o) => ({ id: o.id || "a1", assetId: o.assetId || "ex1", dealId: o.dealId || "d1", ...o });

console.log("\n== days are inclusive of both ends");

// A MACHINE OUT AND BACK ON THE SAME DAY WAS ON THAT JOB FOR A DAY. An
// exclusive count makes it nought, and single-day hires cost nothing.
ok("one day out is one day",
  daysOf(alloc({ from: "2026-09-10", to: "2026-09-10" }), SEP, "2026-09-30") === 1);
ok("the 10th to the 12th is three days",
  daysOf(alloc({ from: "2026-09-10", to: "2026-09-12" }), SEP, "2026-09-30") === 3);

console.log("\n== the window clips, and an open end is the caller's");

ok("an allocation starting before the window is clipped to it",
  daysOf(alloc({ from: "2026-08-25", to: "2026-09-03" }), SEP, "2026-09-30") === 3);
ok("...and one ending after it too",
  daysOf(alloc({ from: "2026-09-28", to: "2026-10-15" }), SEP, "2026-09-30") === 3);
ok("one wholly outside is nothing",
  daysOf(alloc({ from: "2026-07-01", to: "2026-07-05" }), SEP, "2026-09-30") === 0);

// STILL OUT RUNS TO THE END OF THE PERIOD BEING ASKED ABOUT, not to today.
// Asking about last month must not charge an open hire up to the present.
ok("an open-ended hire runs to the window's end",
  daysOf(alloc({ from: "2026-09-20", to: "" }), SEP, "2026-09-30") === 11);
ok("...and asking about an earlier window charges only that window",
  daysOf(alloc({ from: "2026-09-01", to: "" }), { from: "2026-09-01", to: "2026-09-05" }, "2026-09-05") === 5);

ok("a missing start is no days", daysOf(alloc({ from: "", to: "2026-09-10" }), SEP, "2026-09-30") === 0);
ok("a backwards allocation is no days",
  daysOf(alloc({ from: "2026-09-20", to: "2026-09-10" }), SEP, "2026-09-30") === 0);

console.log("\n== what a deal was charged");

const rates = { ex1: 500, cr1: 800, old: 0 };
const rateFor = (id) => rates[id] ?? 0;

const report = utilisation([
  alloc({ id: "1", assetId: "ex1", dealId: "d1", from: "2026-09-01", to: "2026-09-10" }), // 10 days
  alloc({ id: "2", assetId: "cr1", dealId: "d1", from: "2026-09-05", to: "2026-09-09" }), //  5 days
  alloc({ id: "3", assetId: "ex1", dealId: "d2", from: "2026-09-11", to: "2026-09-15" }), //  5 days
], SEP, rateFor, "2026-09-30");

ok("each deal is costed", report.deals.length === 2);
const d1 = report.deals.find((d) => d.dealId === "d1");
ok("the excavator and the crane both land on the deal", d1.assets.length === 2);
ok("...at rate times days", d1.cost === 10 * 500 + 5 * 800, String(d1.cost));
ok("...with the days summed", d1.days === 15, String(d1.days));
ok("dearest deal first", report.deals[0].dealId === "d1");
ok("the fleet view sums a machine across deals",
  report.byAsset.find((a) => a.assetId === "ex1").days === 15);
ok("and the report totals", report.cost === 9000 + 2500 && report.days === 20,
  JSON.stringify({ cost: report.cost, days: report.days }));

console.log("\n== the rate that applies is the one copied when it went out");

// RE-PRICING A FINISHED HIRE because somebody edited the register three months
// later would change a cost already reported on a job — the BOQ rate rule.
const copied = utilisation(
  [alloc({ from: "2026-09-01", to: "2026-09-05", dailyRate: 100 })],
  SEP, () => 999, "2026-09-30",
);
ok("the allocation's own rate wins over the register's", copied.cost === 500, String(copied.cost));

const fallback = utilisation(
  [alloc({ from: "2026-09-01", to: "2026-09-05" })],
  SEP, () => 200, "2026-09-30",
);
ok("...and the register's is the fallback when none was copied",
  fallback.cost === 1000, String(fallback.cost));

// AN ASSET WITH NO RATE COSTS NOTHING AND IS COUNTED. A studio sees utilisation
// it is not billing for rather than a total that quietly omits it.
const unrated = utilisation(
  [alloc({ assetId: "old", from: "2026-09-01", to: "2026-09-05" })],
  SEP, rateFor, "2026-09-30",
);
ok("an unrated asset costs nothing", unrated.cost === 0);
ok("...and its days are reported as unrated", unrated.unratedDays === 5, String(unrated.unratedDays));

ok("no allocations is an empty report, not a throw",
  utilisation([], SEP, rateFor, "2026-09-30").cost === 0);

console.log("\n== a machine cannot be on two jobs at once");

const held = [alloc({ id: "held", assetId: "ex1", dealId: "d1", from: "2026-09-10", to: "2026-09-20" })];

ok("an overlapping booking is refused",
  allocationProblem(alloc({ id: "n", from: "2026-09-15", to: "2026-09-25" }), held) === "clash");
// INCLUSIVE AT BOTH ENDS, matching the day count: a machine returning on the
// 20th is not available to another job on the 20th.
ok("...touching on the last day is still a clash",
  allocationProblem(alloc({ id: "n", from: "2026-09-20", to: "2026-09-22" }), held) === "clash");
ok("the day after is free",
  allocationProblem(alloc({ id: "n", from: "2026-09-21", to: "2026-09-25" }), held) === "");
ok("before it is free",
  allocationProblem(alloc({ id: "n", from: "2026-09-01", to: "2026-09-09" }), held) === "");
ok("a different machine is free",
  allocationProblem(alloc({ id: "n", assetId: "cr1", from: "2026-09-15", to: "2026-09-25" }), held) === "");

// AN OPEN-ENDED ALLOCATION OVERLAPS EVERYTHING AFTER IT. A machine booked out
// indefinitely is not available next week either.
const openHeld = [alloc({ id: "open", assetId: "ex1", from: "2026-09-10", to: "" })];
ok("an open-ended hire blocks a later booking",
  allocationProblem(alloc({ id: "n", from: "2027-01-01", to: "2027-01-05" }), openHeld) === "clash");

// EDITING ITSELF IS NOT A CLASH WITH ITSELF.
ok("an allocation does not clash with its own row",
  allocationProblem(alloc({ id: "held", assetId: "ex1", from: "2026-09-11", to: "2026-09-19" }), held) === "");

ok("no start date is refused", allocationProblem(alloc({ id: "n", from: "" }), []) === "from");
ok("a backwards range is refused",
  allocationProblem(alloc({ id: "n", from: "2026-09-20", to: "2026-09-10" }), []) === "order");
ok("no asset is refused", allocationProblem({ id: "n", assetId: "", dealId: "d", from: "2026-09-01" }, []) === "asset");
ok("no deal is refused", allocationProblem({ id: "n", assetId: "a", dealId: "", from: "2026-09-01" }, []) === "deal");

console.log(fails ? `\nutilisation model: ${fails} FAILURES\n` : "\nutilisation model: all passed\n");
process.exit(fails ? 1 : 0);
