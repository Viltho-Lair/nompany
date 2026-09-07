// CLOSING A PROJECT, PURELY. No store, no routes.
//
// THE DEFECT THESE ASSERTIONS GUARD is a job closed over work nobody has done.
// A punch list is the only place the remaining defects are written down, so
// closing a project while snags are open deletes that list from the one screen
// anybody would look at.
//
// AND THE WARRANTY CLOCK, which runs from HANDOVER on the period
// `supportPeriodDays` already stored and nothing ever read. Where handover is
// missing the end date is NULL: the clock has not started, which is not the
// same as having run out, and defaulting to today-plus-a-year would invent a
// date nobody agreed.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/projects/closureModel");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const TODAY = "2031-06-15";
const snag = (over) => ({ projectId: "p1", kind: "snag", result: "pending", ...over });

console.log("\n== the punch list is the inspections, not a new record ==\n");

const snags = [
  snag({ id: "s1", scheduledDate: "2031-05-01" }),
  snag({ id: "s2", result: "fail", scheduledDate: "2031-06-01" }),
  snag({ id: "s3", result: "pass" }),
  snag({ id: "s4", result: "pass-with-comments" }),
  // Another project's, and another KIND — a hold point is not a defect.
  snag({ id: "s5", projectId: "p2" }),
  snag({ id: "s6", kind: "itp-hold-point" }),
];
const p = M.punchList(snags, "p1", TODAY);
ok("pending and fail are both open", p.open === 2, String(p.open));
// `pass-with-comments` CLOSES it: the comment is on record and the gate is
// through, which is why INSPECTION_RESULTS has both values.
ok("pass and pass-with-comments both close", p.closed === 2, String(p.closed));
ok("...and the total is only this project's snags", p.total === 4, String(p.total));
ok("another project's snags are not counted", !p.openIds.includes("s5"));
ok("a hold point is not a defect", !p.openIds.includes("s6"));
ok("the oldest open snag is aged from when it was raised",
  p.oldestOpenDays === 45, String(p.oldestOpenDays));
ok("nothing open means no age", M.punchList([], "p1", TODAY).oldestOpenDays === null);

console.log("\n== the warranty clock ==\n");

ok("a year after handover is a year later",
  M.addDays("2030-06-15", 365) === "2031-06-15", M.addDays("2030-06-15", 365));
ok("...and it crosses a leap day correctly",
  M.addDays("2032-02-28", 1) === "2032-02-29", M.addDays("2032-02-28", 1));
ok("...and a year boundary", M.addDays("2031-12-31", 1) === "2032-01-01");

const running = M.closurePosition(
  { handoverAt: "2031-01-15", supportPeriodDays: 365 }, [], "p1", TODAY);
ok("the support period ends a year after handover",
  running.warrantyEndsAt === "2032-01-15", String(running.warrantyEndsAt));
ok("...and is running", running.warrantyState === "running", running.warrantyState);

const expiring = M.closurePosition(
  { handoverAt: "2030-07-15", supportPeriodDays: 365 }, [], "p1", TODAY);
ok("...expiring inside the window", expiring.warrantyState === "expiring", expiring.warrantyState);
const expired = M.closurePosition(
  { handoverAt: "2029-01-15", supportPeriodDays: 365 }, [], "p1", TODAY);
ok("...and expired once past", expired.warrantyState === "expired", expired.warrantyState);
ok("...with the days negative", expired.warrantyDaysLeft < 0, String(expired.warrantyDaysLeft));

// NULL RATHER THAN A GUESSED DATE. The clock has not started, which is not the
// same as it having run out.
const noHandover = M.closurePosition({ supportPeriodDays: 365 }, [], "p1", TODAY);
ok("NO HANDOVER MEANS NO END DATE",
  noHandover.warrantyEndsAt === null, String(noHandover.warrantyEndsAt));
ok("...and the state is unknown, not expired",
  noHandover.warrantyState === "unknown", noHandover.warrantyState);

// A DELIBERATE NOUGHT IS AN ANSWER, and a different one from silence.
const none = M.closurePosition(
  { handoverAt: "2031-01-15", supportPeriodDays: 0 }, [], "p1", TODAY);
ok("a job with no support period says so",
  none.warrantyState === "none" && none.warrantyEndsAt === null, none.warrantyState);

console.log("\n== what stops a project closing ==\n");

const blocked = M.closurePosition(
  { practicalCompletionAt: "2031-01-15", supportPeriodDays: 365 }, snags, "p1", TODAY);
// A job closed over open defects is a job whose remaining work has just been
// deleted from the only place it was written down.
ok("OPEN SNAGS BLOCK CLOSING", blocked.canClose === false);
ok("...and say so by name", blocked.blockers.includes("open-snags"), blocked.blockers.join(","));

const noCompletion = M.closurePosition({ supportPeriodDays: 365 }, [], "p1", TODAY);
ok("no practical completion blocks closing",
  noCompletion.blockers.includes("no-practical-completion"));

const ready = M.closurePosition(
  { practicalCompletionAt: "2031-01-15", supportPeriodDays: 365 },
  [snag({ id: "s3", result: "pass" })], "p1", TODAY);
ok("a complete job with a clear punch list may close", ready.canClose === true,
  ready.blockers.join(","));
ok("...and is not yet closed", ready.isClosed === false);

const closed = M.closurePosition(
  { practicalCompletionAt: "2031-01-15", supportPeriodDays: 365, closedAt: "2031-06-01" },
  [], "p1", TODAY);
ok("a closed project is closed", closed.isClosed === true);
ok("...and cannot be closed again", closed.canClose === false);

console.log("\n== what the server refuses ==\n");

// Closing is a statement about the job's whole life, and un-saying it quietly
// is how a warranty period restarts without anybody deciding to restart it.
ok("A CLOSED PROJECT DOES NOT REOPEN",
  M.closureProblem({ closedAt: "2031-06-01" }, { supportPeriodDays: 730 }) === "closed");
// Handing over works that are not complete is a different event with a
// different name, and stored this way round the warranty clock sits behind it.
ok("HANDOVER CANNOT PREDATE PRACTICAL COMPLETION",
  M.closureProblem({}, { practicalCompletionAt: "2031-06-01", handoverAt: "2031-05-01" })
    === "handover-before-completion");
ok("...and the same day is allowed",
  M.closureProblem({}, { practicalCompletionAt: "2031-06-01", handoverAt: "2031-06-01" }) === null);
ok("...and it is checked against what is already stored",
  M.closureProblem({ practicalCompletionAt: "2031-06-01" }, { handoverAt: "2031-05-01" })
    === "handover-before-completion");
ok("a negative warranty is refused",
  M.closureProblem({}, { supportPeriodDays: -1 }) === "warranty-negative");
ok("a fractional one is refused", M.closureProblem({}, { supportPeriodDays: 1.5 }) === "warranty-fraction");
ok("...and an absurd one", M.closureProblem({}, { supportPeriodDays: 99999 }) === "warranty-range");
ok("a year is fine", M.closureProblem({}, { supportPeriodDays: 365 }) === null);
ok("nought days is fine", M.closureProblem({}, { supportPeriodDays: 0 }) === null);

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
