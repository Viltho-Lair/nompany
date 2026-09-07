// DAILY SITE REPORTS, PURELY. No store, no routes.
//
// THE DEFECT THESE ASSERTIONS GUARD is a diary that cannot be relied on. A site
// report earns its keep in one argument — an extension of time — and it earns
// it by being contemporaneous, complete and honest about where it is not. So:
// one report per day (or "what happened on the fourth" has two answers), a
// submitted one does not edit (or it is not contemporaneous), and the gaps are
// COMPUTED rather than left for somebody to notice when it is too late.
//
// AND IT MUST NOT QUIETLY BECOME A SECOND TIMESHEET. Observed headcount and
// booked hours are different facts; where they disagree the disagreement is the
// finding, and neither is corrected by the other.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/projects/siteReportModel");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const report = (over) => ({
  id: "r1", projectId: "p1", reportDate: "2031-06-04", status: "Draft",
  labour: [], plant: [], delays: [], photos: [], ...over,
});

console.log("\n== what a day adds up to ==\n");

const busy = report({
  labour: [{ trade: "Joiners", headcount: 8 }, { trade: "Labourers", headcount: 4 }],
  plant: [{ description: "Excavator", count: 2, idle: 1 }],
  delays: [
    { description: "Rain from 14:00", hoursLost: 3, cause: "weather" },
    { description: "Waiting on rebar drawings", hoursLost: 2, cause: "information" },
  ],
  photos: ["m1", "m2"],
});
const t = M.reportTotals(busy);
ok("headcount sums across trades", t.headcount === 12, String(t.headcount));
ok("...and the trades are counted", t.trades === 2);
ok("plant and idle plant are separate", t.plant === 2 && t.plantIdle === 1);
ok("hours lost sum across delays", t.hoursLost === 5, String(t.hoursLost));
// THE FIGURE AN EXTENSION OF TIME TURNS ON, kept apart from every other cause.
ok("WEATHER HOURS ARE COUNTED SEPARATELY", t.weatherHoursLost === 3, String(t.weatherHoursLost));
ok("photos are counted", t.photos === 2);
ok("...and the day is flagged as having delays", t.hasDelays === true);

// A row nobody filled in is not a row.
const empty = M.reportTotals(report({
  labour: [{ trade: "", headcount: 5 }, { trade: "Joiners", headcount: 0 }],
  plant: [{ description: "", count: 3 }],
  delays: [{ description: "   ", hoursLost: 9 }],
}));
ok("a trade with no name is dropped", empty.headcount === 0 && empty.trades === 0);
ok("plant with no description is dropped", empty.plant === 0);
// The back-charge rule: an unexplained number against somebody's programme is
// one nobody can answer, and this one may reach an adjudicator.
ok("A DELAY WITH NO DESCRIPTION IS DROPPED", empty.hoursLost === 0, String(empty.hoursLost));

console.log("\n== observed against booked ==\n");

const sheets = [{
  projectId: "p1",
  entries: [
    { collaboratorId: "c1", date: "2031-06-04", normalHours: 8, overtimeHours: 0 },
    { collaboratorId: "c2", date: "2031-06-04", normalHours: 4, overtimeHours: 0 },
    // THE SAME PERSON TWICE ON ONE DAY is one person, not two.
    { collaboratorId: "c2", date: "2031-06-04", normalHours: 4, overtimeHours: 0 },
    { collaboratorId: "c3", date: "2031-06-05", normalHours: 8, overtimeHours: 0 },
  ],
}];
const check = M.labourCheck(report({ labour: [{ trade: "Joiners", headcount: 3 }] }), sheets);
ok("timesheets are counted as DISTINCT PEOPLE, not hours",
  check.onTimesheets === 2, String(check.onTimesheets));
ok("...against what was observed", check.observed === 3);
ok("...and the gap is reported rather than resolved", check.difference === 1);
ok("...so it does not agree", check.agrees === false);

const matching = M.labourCheck(report({ labour: [{ trade: "Joiners", headcount: 2 }] }), sheets);
ok("equal counts agree", matching.agrees === true && matching.difference === 0);

// NULL RATHER THAN NOUGHT. "Nobody has submitted a timesheet yet" and "nobody
// worked" are opposite facts and only the second is a finding.
const noSheets = M.labourCheck(report({ labour: [{ trade: "Joiners", headcount: 3 }] }), []);
ok("NO TIMESHEET FOR THE DAY IS NULL, NOT NOUGHT",
  noSheets.onTimesheets === null, String(noSheets.onTimesheets));
ok("...and there is no difference to report", noSheets.difference === null);
ok("...and it does not count as agreeing", noSheets.agrees === false);

ok("another project's timesheets are not counted",
  M.labourCheck(report({ labour: [{ trade: "J", headcount: 1 }] }),
    [{ projectId: "p2", entries: sheets[0].entries }]).onTimesheets === null);
ok("another date's entries are not counted",
  M.labourCheck(report({ reportDate: "2031-06-05", labour: [] }), sheets).onTimesheets === 1);

console.log("\n== the diary, and where it is missing ==\n");

const diary = M.diaryView([
  report({ id: "a", reportDate: "2031-06-01", status: "Submitted", delays: [{ description: "Rain", hoursLost: 4, cause: "weather" }], workStopped: true }),
  report({ id: "b", reportDate: "2031-06-02", status: "Submitted" }),
  // three days missing here
  report({ id: "c", reportDate: "2031-06-06", status: "Draft", delays: [{ description: "No access", hoursLost: 2, cause: "access" }] }),
], "2031-06-09");
ok("reports are counted", diary.reports === 3);
ok("...and submitted ones separately", diary.submitted === 2);
ok("the last reported day is the latest DATE, not the last row",
  diary.lastReportDate === "2031-06-06", diary.lastReportDate);
ok("...and how stale that is", diary.daysSinceLast === 3, String(diary.daysSinceLast));
// A DIARY WITH HOLES IN IT is worth less than one that admits them, and the
// only useful time to say so is while the days can still be reconstructed.
ok("A RUN OF MISSING DAYS IS REPORTED", diary.gaps.length === 1, JSON.stringify(diary.gaps));
ok("...with its length", diary.gaps[0].days === 3, String(diary.gaps[0].days));
ok("...and its ends", diary.gaps[0].from === "2031-06-02" && diary.gaps[0].to === "2031-06-06");
ok("hours lost roll up across the diary", diary.totalHoursLost === 6, String(diary.totalHoursLost));
ok("...with weather kept apart", diary.weatherHoursLost === 4, String(diary.weatherHoursLost));
ok("...and days work stopped counted", diary.daysWorkStopped === 1);

ok("consecutive days leave no gap",
  M.diaryView([report({ id: "a", reportDate: "2031-06-01" }), report({ id: "b", reportDate: "2031-06-02" })], "2031-06-02")
    .gaps.length === 0);
ok("an empty diary has no last date and no staleness",
  M.diaryView([], "2031-06-09").daysSinceLast === null);
// Reports arriving out of order are still a diary; the dates decide, not the rows.
ok("order of arrival does not matter",
  M.diaryView([report({ id: "b", reportDate: "2031-06-06" }), report({ id: "a", reportDate: "2031-06-01" })], "2031-06-06")
    .gaps[0].days === 4);

console.log("\n== what the server refuses ==\n");

ok("a report with no date is refused", M.reportProblem(report({ reportDate: "" }), []) === "date");
ok("...and one with no project", M.reportProblem(report({ projectId: "" }), []) === "project");
// ONE PER PROJECT PER DAY, or "what happened on the fourth" has two answers.
ok("A SECOND REPORT FOR THE SAME DAY IS REFUSED",
  M.reportProblem(report({ id: "" }), [report({ id: "other" })]) === "duplicate");
ok("...but editing the existing one is not",
  M.reportProblem(report({ id: "r1" }), [report({ id: "r1" })], "r1") === null);
ok("...and another project's report on the same day is fine",
  M.reportProblem(report({ id: "" }), [report({ id: "x", projectId: "p2" })]) === null);
ok("...and the same project on another day",
  M.reportProblem(report({ id: "" }), [report({ id: "x", reportDate: "2031-06-03" })]) === null);

ok("negative lost hours are refused",
  M.reportProblem(report({ delays: [{ description: "Rain", hoursLost: -2 }] }), []) === "negative-hours");
ok("an unknown cause is refused",
  M.reportProblem(report({ delays: [{ description: "Rain", hoursLost: 1, cause: "aliens" }] }), []) === "cause");
ok("...while a blank cause is allowed",
  M.reportProblem(report({ delays: [{ description: "Rain", hoursLost: 1 }] }), []) === null);
// Idle plant is a subset of the plant on site, not a separate machine.
ok("more idle plant than plant is refused",
  M.reportProblem(report({ plant: [{ description: "Crane", count: 1, idle: 2 }] }), []) === "idle-exceeds");

ok("a draft edits", M.reportEditable(report({})) === true);
// ITS WHOLE EVIDENTIAL VALUE: a record somebody can revise once the argument
// has started is not a contemporaneous record.
ok("A SUBMITTED REPORT DOES NOT EDIT",
  M.reportEditable(report({ status: "Submitted" })) === false);

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
