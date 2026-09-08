// THE SHOP FLOOR, asserted without a database.
//
// Two things a factory could not answer before: how long a run took, and
// whether the batch was any good. What is worth asserting is what each of them
// REFUSES to say when it does not know.
import {
  runHours, startProblem, orderEffort, qcProblems, batchVerdict, awaitingCheck, QC_RESULTS,
} from "../src/modules/manufacturing/shopfloor.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const log = (over) => ({
  id: "l", workOrderId: "wo1", station: "Line 1", byCollaboratorId: "me",
  startedAt: "2026-09-09T08:00:00.000Z", endedAt: "2026-09-09T10:30:00.000Z", notes: "", ...over,
});

// ---- how long a run took ----------------------------------------------------
ok("a closed run is the gap between its ends", runHours(log({})) === 2.5);
// OPEN IS NULL, NOT ZERO. Reporting nought would make a half-finished batch
// look free and understate every job on the floor right now.
ok("AN OPEN RUN IS NULL, NOT ZERO", runHours(log({ endedAt: "" })) === null);
ok("a backwards run is nought rather than negative",
  runHours(log({ endedAt: "2026-09-09T07:00:00.000Z" })) === 0);
ok("a run with no start is null", runHours(log({ startedAt: "" })) === null);

// ---- one open run per person ------------------------------------------------
ok("nothing open means anybody can start", startProblem("wo1", "me", []) === null);
ok("starting the same order twice is refused by name",
  startProblem("wo1", "me", [log({ endedAt: "" })]) === "already-running");
// AN OPERATOR AT ONE MACHINE CANNOT ALSO BE AT ANOTHER, and two open runs is
// how a day ends with sixteen hours logged against eight worked.
ok("STARTING A SECOND ORDER WHILE ONE IS RUNNING IS REFUSED",
  startProblem("wo2", "me", [log({ endedAt: "" })]) === "other-run");
ok("somebody else's open run does not block me",
  startProblem("wo1", "you", [log({ endedAt: "", byCollaboratorId: "me" })]) === null);
ok("a closed run blocks nothing", startProblem("wo1", "me", [log({})]) === null);
ok("a run needs an order", startProblem("", "me", []) === "order");

// ---- what an order has cost -------------------------------------------------
const LOGS = [
  log({ id: "a" }),                                        // 2.5 h
  log({ id: "b", startedAt: "2026-09-09T11:00:00.000Z", endedAt: "2026-09-09T12:00:00.000Z" }),
  log({ id: "c", endedAt: "" }),                           // still running
  log({ id: "d", workOrderId: "wo2" }),
];
const effort = orderEffort(LOGS, "wo1");
ok("effort is the closed runs' hours", effort.hours === 3.5, String(effort.hours));
ok("...counting only this order's", effort.runs === 2);
// SEPARATED RATHER THAN ESTIMATED: folding a guess into the total would produce
// a number that moves when nobody has done anything.
ok("AN OPEN RUN IS COUNTED, NOT ESTIMATED INTO THE TOTAL", effort.openRuns === 1);

// ---- the verdict ------------------------------------------------------------
ok("the three results are the whole ladder", QC_RESULTS.join("|") === "pass|fail|concession");
ok("a check needs a batch", qcProblems({ result: "pass" }).length === 1);
ok("a check needs a result", qcProblems({ batchId: "b1" }).length === 1);
ok("a nonsense result is refused", qcProblems({ batchId: "b1", result: "maybe" }).length === 1);
ok("a pass needs no reason", qcProblems({ batchId: "b1", result: "pass" }).length === 0);
// A FAIL THAT DOES NOT SAY WHY cannot be acted on, argued with, or counted —
// the rule a losing deal already follows with `lostReason`.
ok("A FAIL WITHOUT A REASON IS REFUSED",
  qcProblems({ batchId: "b1", result: "fail" }).length === 1);
// ACCEPTING MATERIAL THAT MISSED THE SPEC is a decision somebody has to defend.
ok("a concession without a reason is refused too",
  qcProblems({ batchId: "b1", result: "concession" }).length === 1);
ok("a fail with a reason passes",
  qcProblems({ batchId: "b1", result: "fail", reason: "porosity" }).length === 0);

const CHECKS = [
  { id: "c1", batchId: "b1", result: "fail", reason: "porosity", byCollaboratorId: "me", at: "2026-09-01T10:00:00.000Z" },
  { id: "c2", batchId: "b1", result: "pass", reason: "", byCollaboratorId: "me", at: "2026-09-05T10:00:00.000Z" },
  { id: "c3", batchId: "b2", result: "fail", reason: "short", byCollaboratorId: "me", at: "2026-09-02T10:00:00.000Z" },
];
// A BATCH THAT FAILED, WAS REWORKED AND PASSED IS A PASSING BATCH. The history
// stays; the verdict is the last word.
ok("THE VERDICT IS THE LATEST CHECK, NOT A TALLY", batchVerdict(CHECKS, "b1").id === "c2");
ok("...even when an earlier one failed", batchVerdict(CHECKS, "b1").result === "pass");
// "NOT CHECKED" AND "CHECKED AND FINE" ARE OPPOSITE FACTS about a batch about
// to be shipped, and defaulting to the safe-sounding one is how an uninspected
// batch leaves the building looking approved.
ok("AN UNCHECKED BATCH IS NULL, NOT A PASS", batchVerdict(CHECKS, "b9") === null);

const BATCHES = [
  { id: "b1", madeOn: "2026-09-01" },
  { id: "b2", madeOn: "2026-09-02" },
  { id: "b3", madeOn: "2026-08-20" },
  { id: "b4", madeOn: "2026-09-03" },
];
const waiting = awaitingCheck(BATCHES, CHECKS);
ok("a batch nobody has checked is waiting", waiting.map((b) => b.id).join(",") === "b3,b4",
  waiting.map((b) => b.id).join(","));
ok("a checked batch is not waiting, whatever the verdict",
  !waiting.some((b) => b.id === "b1" || b.id === "b2"));
ok("the oldest comes first", waiting[0].id === "b3");

console.log(fails ? `\nshopfloor model: ${fails} FAILURES\n` : "\nshopfloor model: all passed\n");
process.exit(fails ? 1 : 0);
