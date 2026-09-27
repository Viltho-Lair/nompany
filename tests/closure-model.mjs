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
//
// AND, READ AS SOURCE rather than run, that the doors actually use it: the list's
// Support tag, Edit details, the settings write and the opening claim. Each of
// those was a real defect (27/09/2026) that a pure test of the model alone could
// not see, because the model was right and nothing was calling it.

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
// `num` read "abc" as nought, so a typo recorded a job as carrying no support.
ok("something that is not a number is refused, not read as nought",
  M.closureProblem({}, { supportPeriodDays: "abc" }) === "warranty-fraction");

console.log("\n== one rule for a support period, at every door ==\n");

// Edit details, the create path and the studio default used `nonNeg`, which
// let 1.5 and 99999 through — and the closing-out tab then refused the next
// save of its dates over a number nobody had typed there.
ok("a fraction is refused by the shared rule", M.supportPeriodProblem(1.5) === "warranty-fraction");
ok("...and a century", M.supportPeriodProblem(36500) === "warranty-range");
ok("...and a negative", M.supportPeriodProblem(-3) === "warranty-negative");
ok("...and a blank, which is not a nought", M.supportPeriodProblem("") === "warranty-fraction");
ok("a whole number typed as text is fine", M.supportPeriodProblem("730") === null);
ok("ten years exactly is fine", M.supportPeriodProblem(3650) === null);

console.log("\n== the list's Support tag reads the same clock as the tab ==\n");

// THE DEFECT: `supportStatus` (projects/sla) counted from the END date and
// turned 0 into 365, while this model counts from HANDOVER and reads 0 as "no
// support". A project that ended last month, carries a deliberate nought and was
// handed over was "Support: 335d left" on the list and "no support period" on
// its own tab.
const tagOf = (p) => M.supportTag(M.closurePosition(p, [], "p1", TODAY));
ok("a deliberate nought is NO SUPPORT, never a year",
  tagOf({ endDate: "2031-05-15", handoverAt: "2031-05-15", supportPeriodDays: 0 }) === "none");
ok("an end date alone does not start the clock — handover does",
  tagOf({ endDate: "2031-05-15", supportPeriodDays: 365 }) === "not-started");
ok("running from handover",
  tagOf({ handoverAt: "2031-06-01", supportPeriodDays: 365 }) === "running");
ok("...including inside the warning window, which is still support",
  tagOf({ handoverAt: "2030-07-01", supportPeriodDays: 365 }) === "running");
ok("ended once the period from handover has passed",
  tagOf({ handoverAt: "2029-01-01", supportPeriodDays: 365 }) === "ended");

// AND THE SCREENS ACTUALLY READ IT. A pure function nobody calls is exactly how
// the second calculation survived, so the wiring is asserted from the source.
import { readFileSync } from "node:fs";
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const screen = src("src/components/studio2/StudioProjects.js");
const sla = src("src/modules/projects/sla.ts");
ok("the project list's tag reads closurePosition",
  /closurePosition/.test(screen) && /supportTag\(/.test(screen));
ok("...and the second calculation is gone",
  !/export function supportStatus/.test(sla) && !/from "@\/modules\/projects\/sla"/.test(screen));

console.log("\n== a closed project is closed everywhere ==\n");

// Edit details wrote straight past the closure: dates, manager and support
// period could all be rewritten on a closed job.
const projects = src("src/modules/projects/projects.ts");
const update = projects.slice(projects.indexOf("export async function updateProject"),
  projects.indexOf("export async function removeProject"));
ok("updateProject refuses a closed project",
  /if \(current\.closedAt\) return \{ error: "closed" \}/.test(update));
ok("...and asks again inside the row's own compare-and-set (invariant 8)",
  /Projects\.update\(\{[^}]*\}, id, \(row\) =>/.test(update) && /row\.closedAt/.test(update));
ok("...and holds the support period to the tab's rule, not nonNeg",
  /supportPeriodProblem\(body\.supportPeriodDays\)/.test(update) && !/nonNeg\(body\.supportPeriodDays/.test(update));

console.log("\n== settings merge into the live row, and weights are gone ==\n");

const settings = projects.slice(projects.indexOf("export async function saveProjectsSettings"),
  projects.indexOf("export function readProjectsSettings"));
// The whole object was rebuilt from the copy the request read and written as a
// plain patch, so two people saving two settings at once lost one.
ok("saveProjectsSettings writes a FUNCTION patch over the live settings",
  /updateSection\(studio\.id, settingsSection\.id, \(live\) =>/.test(settings));
ok("requirement weights are no longer written — nothing read them",
  !/requirementWeights/.test(settings));

console.log("\n== one project per tender, under contention ==\n");

// Two handovers landing together both read "no project yet" and both created.
const open = projects.slice(projects.indexOf("export async function openProject"),
  projects.indexOf("const OPENING_HOLD_SECONDS"));
const claimAt = open.indexOf("await claim(opening");
ok("openProject claims the source before any head runs its check",
  claimAt > 0 && claimAt < open.indexOf("await tenderSource(") && claimAt < open.indexOf("await quotationSource("));
ok("...keyed by the tender through keys.ts, never a literal (invariant 1)",
  /PROJECT\.opening\(studio\.id, `tender:\$\{tenderId\}`\)/.test(open));
ok("...and releases it once the row exists, in a finally",
  /finally \{[^}]*release\(opening\)/.test(open));

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
