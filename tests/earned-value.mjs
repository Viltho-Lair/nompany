// EARNED VALUE, PURELY. No store, no routes, no fixtures.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is an index that reads as a verdict
// when it is really an absence. Each of these figures has a state where it is
// genuinely undefined — no budget, no plan, no dates, nothing spent — and zero
// is a real answer to all four questions and the wrong one. "0% complete" and
// "we do not know how complete" look identical on a progress bar and mean
// opposite things; an infinite CPI on a project whose invoices have not arrived
// reads as a triumph. So every null below is asserted as a null.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const E = await import("@/modules/projects/earnedValue");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// A project budgeted at 100,000, running March to May.
const base = { bac: 100000, startDate: "2026-03-01", endDate: "2026-05-01" };

console.log("\n== how much of the schedule has gone");

ok("halfway through the calendar is a half",
  E.elapsedFraction("2026-03-01", "2026-05-01", "2026-04-01") > 0.49
  && E.elapsedFraction("2026-03-01", "2026-05-01", "2026-04-01") < 0.52,
  String(E.elapsedFraction("2026-03-01", "2026-05-01", "2026-04-01")));

// CLAMPED AT BOTH ENDS. Before the start nothing was planned; after the end
// everything was, so an overrunning project goes on accruing schedule variance
// rather than quietly stopping.
ok("before the start, none of it has", E.elapsedFraction("2026-03-01", "2026-05-01", "2026-01-01") === 0);
ok("after the end, all of it has", E.elapsedFraction("2026-03-01", "2026-05-01", "2026-09-01") === 1);
ok("on the last day, all of it has", E.elapsedFraction("2026-03-01", "2026-05-01", "2026-05-01") === 1);

// A one-day project has no fraction, and dividing by nought would be an
// Infinity nobody asked for.
ok("a project that starts and ends on one day is 0 before it",
  E.elapsedFraction("2026-03-01", "2026-03-01", "2026-02-28") === 0);
ok("...and 1 on the day", E.elapsedFraction("2026-03-01", "2026-03-01", "2026-03-01") === 1);
ok("a missing date is null, not zero", E.elapsedFraction("", "2026-05-01", "2026-04-01") === null);
ok("...and so is nonsense", E.elapsedFraction("not-a-date", "2026-05-01", "2026-04-01") === null);

console.log("\n== the three ways the answer is partial");

// NO BUDGET, NO EARNED VALUE: EV is a fraction OF the budget, and reporting 0
// would say the work is worth nothing rather than that nobody has said what it
// is worth.
const noBudget = E.earnedValue({ ...base, bac: 0, ac: 5000, percentComplete: 40, asOf: "2026-04-01" });
ok("no budget blocks the whole calculation", noBudget.blocked === "no-budget");
ok("...and every figure is null, not zero",
  noBudget.ev === null && noBudget.pv === null && noBudget.cpi === null && noBudget.spi === null);
// AC is still reported: money was spent whatever nobody budgeted.
ok("...but what was spent is still said", noBudget.ac === 5000);

// NO PLAN, NO MEASURE OF THE WORK.
const noPlan = E.earnedValue({ ...base, ac: 5000, percentComplete: null, asOf: "2026-04-01" });
ok("no plan blocks it too", noPlan.blocked === "no-plan" && noPlan.ev === null);
// THE DISTINCTION THIS TURNS ON: a plan nobody has started is a real 0 and
// earns nothing, which is nothing like having no plan at all.
const notStarted = E.earnedValue({ ...base, ac: 5000, percentComplete: 0, asOf: "2026-04-01" });
ok("a plan nobody has started earns nothing, which is not the same",
  notStarted.blocked === null && notStarted.ev === 0, JSON.stringify(notStarted.blocked));

// NO DATES: a cost story with no schedule story. Withholding both halves
// because one is missing would be the wrong trade.
const noDates = E.earnedValue({ bac: 100000, ac: 25000, percentComplete: 40 });
ok("no dates blocks only the planned half", noDates.blocked === "no-dates");
ok("...EV still answers", noDates.ev === 40000, String(noDates.ev));
ok("...and so does the cost index", noDates.cpi === 1.6, String(noDates.cpi));
ok("...while the schedule half stays null", noDates.pv === null && noDates.spi === null);

console.log("\n== the figures themselves");

// 40% of a 100,000 budget earned, 25,000 spent, halfway through the calendar.
const r = E.earnedValue({ ...base, ac: 25000, percentComplete: 40, asOf: "2026-04-01" });
ok("EV is the budget times the work done", r.ev === 40000, String(r.ev));
ok("PV is the budget times the schedule gone", r.pv > 49000 && r.pv < 51000, String(r.pv));
ok("CV is EV less what it cost", r.cv === 15000, String(r.cv));
ok("SV is EV less what was planned", r.sv < 0 && r.sv > -11000, String(r.sv));
ok("CPI is EV over AC", r.cpi === 1.6, String(r.cpi));
ok("SPI is EV over PV", r.spi > 0.78 && r.spi < 0.82, String(r.spi));
// EAC IS A PERFORMANCE FORECAST — what the whole job finishes at if it goes on
// costing what it has. Deliberately NOT the cost report's ledger forecast.
ok("EAC is the budget at the rate it is going", r.eac === 62500, String(r.eac));
ok("...and VAC is what that leaves", r.vac === 37500, String(r.vac));

// Behind on schedule and under on cost at once is the ordinary case, and the
// two indices must not be conflated: this project is cheap and late.
ok("a project can be under cost and behind schedule at once",
  r.cpi > 1 && r.spi < 1);

console.log("\n== nothing divides by nought");

// NOTHING SPENT IS NOT INFINITE EFFICIENCY. A project that has earned something
// and been billed for nothing is one whose invoices have not arrived.
const unspent = E.earnedValue({ ...base, ac: 0, percentComplete: 40, asOf: "2026-04-01" });
ok("with nothing spent there is no cost index", unspent.cpi === null);
ok("...and therefore no EAC", unspent.eac === null && unspent.vac === null);
ok("...but EV and CV still answer", unspent.ev === 40000 && unspent.cv === 40000);

// BEFORE THE START DATE nothing was planned, so a schedule index is undefined
// rather than infinite — the same rule CPI follows.
const early = E.earnedValue({ ...base, ac: 1000, percentComplete: 5, asOf: "2026-01-01" });
ok("before the start there is no schedule index", early.spi === null, String(early.spi));
ok("...and PV is nought, which is a real planned value", early.pv === 0);

ok("no index is ever Infinity",
  [r, unspent, early, noDates].every((x) => [x.spi, x.cpi, x.eac, x.vac]
    .every((n) => n === null || Number.isFinite(n))));

console.log("\n== the edges");

// Completion is clamped: a plan reporting 120% has not earned more than the
// budget, and one reporting -5 has not un-earned anything.
ok("a plan over 100% earns the budget and no more",
  E.earnedValue({ ...base, ac: 1, percentComplete: 120, asOf: "2026-04-01" }).ev === 100000);
ok("...and a negative one earns nothing",
  E.earnedValue({ ...base, ac: 1, percentComplete: -5, asOf: "2026-04-01" }).ev === 0);
ok("nonsense does not throw", E.earnedValue({}).blocked === "no-budget");
ok("...nor does nothing at all", E.earnedValue(null).bac === 0);

console.log("\n== the file stays pure");

const { readFileSync } = await import("node:fs");
const src = readFileSync(new URL("../src/modules/projects/earnedValue.ts", import.meta.url), "utf8");
ok("modules/projects/earnedValue imports nothing",
  [...src.matchAll(/from\s+"([^"]+)"/g)].length === 0);

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
