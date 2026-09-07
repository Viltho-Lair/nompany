// SUPPLIER QUALIFICATION AND RATING, PURELY. No store, no routes.
//
// THE DEFECT THE ON-TIME ASSERTIONS GUARD is a supplier scoring a hundred per
// cent by moving the date. `expediting.ts` kept the original promise out of
// reach of a re-promise for exactly this, and if anything here ever measures
// against `promisedAt` the rating silently inverts: the worst suppliers, the
// ones who re-promise most, come out best.
//
// THE DEFECT THE QUALIFICATION ASSERTIONS GUARD is a studio that cannot buy
// anything on the morning this ships. Every supplier in an existing register is
// unassessed, so unassessed MUST be usable; only a decision somebody actually
// made, or a document that actually lapsed, is allowed to stop an order.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/procurement/supplierModel");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const TODAY = "2031-06-15";
const sup = (over) => ({ id: "v1", name: "Acme", documents: [], ...over });
const doc = (over) => ({ kind: "Trade licence", ...over });

console.log("\n== qualification is derived at asOf, never stored ==\n");

// THE ROLLOUT ASSERTION. An existing register is entirely unassessed, and a
// feature that stopped those studios buying would be switched off the same day.
const fresh = M.supplierQualification(sup({}), TODAY);
ok("a supplier nobody has assessed is unassessed", fresh.state === "unassessed", fresh.state);
ok("...AND IS STILL USABLE", fresh.usable === true);
ok("...saying so by name", fresh.reason === "never-assessed", fresh.reason);

// A PERSON'S DECISION BLOCKS regardless of how good the paperwork is.
const susp = M.supplierQualification(
  sup({ approvalStatus: "Suspended", approvalReason: "Site incident", documents: [doc({ expiresAt: "2035-01-01" })] }),
  TODAY);
ok("a suspended supplier is blocked", susp.state === "blocked" && susp.usable === false, susp.state);
ok("...even with every document in date", susp.expired.length === 0);
ok("...carrying the reason somebody wrote", susp.note === "Site incident", susp.note);
ok("a rejected supplier is blocked too",
  M.supplierQualification(sup({ approvalStatus: "Rejected" }), TODAY).reason === "rejected");

// AN APPROVAL DOES NOT OUTLIVE THE DOCUMENT IT WAS BASED ON.
const lapsed = M.supplierQualification(
  sup({ approvalStatus: "Approved", documents: [doc({ expiresAt: "2031-03-01" })] }), TODAY);
ok("AN APPROVAL DOES NOT OUTLIVE A LAPSED DOCUMENT",
  lapsed.state === "lapsed" && lapsed.usable === false, lapsed.state);
ok("...naming the expired one", lapsed.expired.length === 1);

// EXPIRING WARNS AND DOES NOT STOP. Refusing here halts purchasing over
// paperwork that is still valid today.
const soon = M.supplierQualification(
  sup({ approvalStatus: "Approved", documents: [doc({ expiresAt: "2031-06-30" })] }), TODAY);
ok("a document expiring inside the window warns", soon.state === "expiring", soon.state);
ok("...AND DOES NOT STOP AN ORDER", soon.usable === true);
ok("...and is not counted as expired", soon.expired.length === 0 && soon.expiring.length === 1);

const good = M.supplierQualification(
  sup({ approvalStatus: "Approved", documents: [doc({ expiresAt: "2032-01-01" })] }), TODAY);
ok("an approved supplier in date is qualified", good.state === "qualified" && good.usable === true);
ok("...and the next expiry is reported for chasing",
  good.nextExpiryAt === "2032-01-01" && good.nextExpiryDays === 200, String(good.nextExpiryDays));

// A BLANK EXPIRY DOES NOT EXPIRE. Treating one as lapsed would disqualify every
// supplier in the register on day one, which is not a safety feature.
const undated = M.supplierQualification(
  sup({ approvalStatus: "Approved", documents: [doc({})] }), TODAY);
ok("A BLANK EXPIRY DOES NOT EXPIRE", undated.state === "qualified", undated.state);
ok("...but is shown as undated rather than valid",
  undated.documents[0].state === "undated", undated.documents[0].state);

// The window is a parameter, not a constant, so the screen widens it without a
// second copy of the arithmetic reaching the client.
ok("the expiring window is a parameter",
  M.supplierQualification(sup({ approvalStatus: "Approved", documents: [doc({ expiresAt: "2031-08-01" })] }),
    TODAY, 90).state === "expiring");

console.log("\n== on-time is measured against the ORIGINAL promise ==\n");

// The order was promised for the 1st, re-promised to the 20th, and arrived on
// the 20th. Against the revised promise that is perfect; against the original
// it is nineteen days late, and the original is what a rating must use.
const rePromised = [{
  vendorId: "v1", status: "Received",
  expectedAt: "2031-05-01", promisedAt: "2031-05-20", receivedAt: "2031-05-20",
}];
const rp = M.supplierOnTime(rePromised, "v1");
ok("AN ORDER THAT ARRIVED ON ITS REVISED DATE IS STILL LATE",
  rp.onTime === 0 && rp.percent === 0, String(rp.percent));
ok("...late by the slip against the ORIGINAL promise",
  rp.averageDaysLate === 19, String(rp.averageDaysLate));
ok("...and the re-promise is reported beside it, not folded in", rp.rePromised === 1);

const mixed = [
  { vendorId: "v1", status: "Received", expectedAt: "2031-05-01", receivedAt: "2031-04-28" },
  { vendorId: "v1", status: "Received", expectedAt: "2031-05-01", receivedAt: "2031-05-01" },
  { vendorId: "v1", status: "Received", expectedAt: "2031-05-01", receivedAt: "2031-05-11" },
  { vendorId: "v2", status: "Received", expectedAt: "2031-05-01", receivedAt: "2031-09-01" },
];
const mx = M.supplierOnTime(mixed, "v1");
ok("early and exactly on the day both count as on time", mx.onTime === 2 && mx.judged === 3);
ok("...as a percentage", mx.percent === 67, String(mx.percent));
ok("...averaged over every judged order, not only the late ones",
  mx.averageDaysLate === 3.3, String(mx.averageDaysLate));
ok("...with the worst kept separately", mx.worstDaysLate === 10, String(mx.worstDaysLate));
ok("another supplier's orders are not counted", mx.judged === 3);

// NULL RATHER THAN NOUGHT: "nothing has landed yet" and "everything was late"
// are opposite facts that read identically as a 0% bar.
const none = M.supplierOnTime([{ vendorId: "v1", status: "Ordered", expectedAt: "2031-05-01" }], "v1");
ok("NOTHING JUDGEABLE IS NULL, NOT NOUGHT", none.percent === null, String(none.percent));
ok("...and the open order is counted as outstanding", none.outstanding === 1);

ok("a draft is not outstanding and not judged",
  M.supplierOnTime([{ vendorId: "v1", status: "Draft", expectedAt: "2031-05-01" }], "v1").outstanding === 0);
ok("a cancelled order is neither",
  M.supplierOnTime([{ vendorId: "v1", status: "Cancelled", expectedAt: "2031-05-01", receivedAt: "2031-09-01" }], "v1").judged === 0);
// Nobody promised anything, so there is nothing to have missed.
ok("AN ORDER WITH NO ORIGINAL DATE IS NOT COUNTED AS LATE",
  M.supplierOnTime([{ vendorId: "v1", status: "Received", receivedAt: "2031-09-01" }], "v1").judged === 0);

console.log("\n== scores keep the average and the latest apart ==\n");

const cards = [
  { vendorId: "v1", periodEnd: "2031-01-31", workmanship: 2, hse: 2, responsiveness: 3 },
  { vendorId: "v1", periodEnd: "2031-06-30", workmanship: 5, hse: 4, responsiveness: 5 },
  { vendorId: "v2", periodEnd: "2031-06-30", workmanship: 1, hse: 1, responsiveness: 1 },
];
const sc = M.supplierScores(cards, "v1");
ok("scores average per axis", sc.average.workmanship === 3.5 && sc.average.hse === 3, String(sc.average.workmanship));
// AN AVERAGE CANNOT SAY A SUPPLIER FIXED ITSELF IN JUNE.
ok("THE LATEST IS REPORTED BESIDE THE AVERAGE", sc.latest.workmanship === 5, String(sc.latest.workmanship));
ok("...from the most recent period, not the last row given",
  sc.latestPeriodEnd === "2031-06-30", sc.latestPeriodEnd);
ok("overall is the mean of the scored axes", sc.overall === 3.5, String(sc.overall));
ok("another supplier's cards are not counted", sc.count === 2);

const partial = M.supplierScores([{ vendorId: "v1", periodEnd: "2031-06-30", workmanship: 4 }], "v1");
ok("an axis nobody scored is null, not nought",
  partial.average.hse === null && partial.average.workmanship === 4, String(partial.average.hse));
ok("...and overall ignores it rather than dragging it down", partial.overall === 4, String(partial.overall));
ok("no scorecards at all is null throughout",
  M.supplierScores([], "v1").overall === null);

console.log("\n== the position is two columns and never one number ==\n");

const pos = M.supplierPosition(sup({ approvalStatus: "Approved" }), mixed, cards, TODAY);
ok("a position carries qualification, on-time and scores",
  pos.qualification.state === "qualified" && pos.onTime.percent === 67 && pos.scores.overall === 3.5);
// DELIBERATELY ABSENT. Blending "how often they turned up" with "what somebody
// thought of the work" produces a figure whose meaning depends on which half
// moved — the same objection this codebase records against showing
// costing.forecast and earned.eac under one label.
ok("AND NO BLENDED SCORE EXISTS", !("rating" in pos) && !("score" in pos));

console.log("\n== what the server refuses ==\n");

ok("an unknown status is refused", M.assessmentProblem("Maybe", "") === "status");
// The same rule a losing deal carries: a supplier blocked for reasons nobody
// wrote down is one nobody can argue with once that person has left.
ok("A REJECTION MUST SAY WHY", M.assessmentProblem("Rejected", "  ") === "reason");
ok("...and a suspension too", M.assessmentProblem("Suspended", "") === "reason");
ok("...while an approval needs no reason", M.assessmentProblem("Approved", "") === null);
ok("unassessed is a status like any other", M.assessmentProblem("Unassessed", "") === null);

ok("a document with no kind is refused", M.documentProblem({ kind: " " }) === "kind");
ok("an expiry before the issue date is refused",
  M.documentProblem({ kind: "Insurance", issuedAt: "2031-05-01", expiresAt: "2031-04-01" }) === "expiry-before-issue");
ok("...and the same dates are allowed",
  M.documentProblem({ kind: "Insurance", issuedAt: "2031-05-01", expiresAt: "2031-05-01" }) === null);
ok("a document with no expiry is allowed", M.documentProblem({ kind: "Insurance" }) === null);

ok("a scorecard with no period is refused", M.scorecardProblem({ workmanship: 3 }) === "period");
// A scorecard that scores nothing is a note, and there is a field for that.
ok("A SCORECARD THAT SCORES NOTHING IS REFUSED",
  M.scorecardProblem({ periodEnd: "2031-06-30", note: "fine" }) === "no-scores");
ok("a score outside 1-5 is refused",
  M.scorecardProblem({ periodEnd: "2031-06-30", workmanship: 6 }) === "range");
ok("...and a fractional one",
  M.scorecardProblem({ periodEnd: "2031-06-30", workmanship: 3.5 }) === "range");
ok("one axis is enough", M.scorecardProblem({ periodEnd: "2031-06-30", hse: 5 }) === null);

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
