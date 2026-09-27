// THE SHOP FLOOR, asserted without a database.
//
// Two things a factory could not answer before: how long a run took, and
// whether the batch was any good. What is worth asserting is what each of them
// REFUSES to say when it does not know.
// THROUGH THE LOADER, because `shopfloor.ts` now imports `./mrp` for the one
// rule of what an open work order is, and Node's own resolver will not find an
// extensionless sibling.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const {
  runHours, startProblem, keptRun, orderEffort, qcProblems, batchVerdict, awaitingCheck, QC_RESULTS,
} = await import("@/modules/manufacturing/shopfloor");

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
const OPEN = { status: "Released" };
ok("nothing open means anybody can start", startProblem("wo1", "me", [], OPEN) === null);
ok("starting the same order twice is refused by name",
  startProblem("wo1", "me", [log({ endedAt: "" })], OPEN) === "already-running");
// AN OPERATOR AT ONE MACHINE CANNOT ALSO BE AT ANOTHER, and two open runs is
// how a day ends with sixteen hours logged against eight worked.
ok("STARTING A SECOND ORDER WHILE ONE IS RUNNING IS REFUSED",
  startProblem("wo2", "me", [log({ endedAt: "" })], OPEN) === "other-run");
ok("somebody else's open run does not block me",
  startProblem("wo1", "you", [log({ endedAt: "", byCollaboratorId: "me" })], OPEN) === null);
ok("a closed run blocks nothing", startProblem("wo1", "me", [log({})], OPEN) === null);
ok("a run needs an order", startProblem("", "me", [], OPEN) === "order");

// THE TERMINAL OFFERED EVERY WORK ORDER, Completed and Cancelled included, and
// `startRun` never looked the order up — the status was dropped on the way in,
// and any id at all was accepted. Hours logged against a shut job are cost
// nobody can put anywhere.
ok("A RUN AGAINST AN ORDER THAT DOES NOT EXIST IS REFUSED", startProblem("ghost", "me", [], null) === "no-order");
ok("A RUN AGAINST A COMPLETED ORDER IS REFUSED",
  startProblem("wo1", "me", [], { status: "Completed" }) === "order-closed");
ok("...and against a Cancelled one", startProblem("wo1", "me", [], { status: "Cancelled" }) === "order-closed");
ok("an In progress order takes a run", startProblem("wo1", "me", [], { status: "In progress" }) === null);

// A DOUBLE TAP COULD OPEN TWO RUNS: the one-open-run check is a read followed
// by a write, and the store has no unique constraint for it. `startRun` writes
// first and re-reads; every reader keeps the SAME run, so exactly one stands.
const twin = [
  log({ id: "b", endedAt: "", startedAt: "2026-09-09T08:00:00.001Z" }),
  log({ id: "a", endedAt: "", startedAt: "2026-09-09T08:00:00.000Z" }),
  log({ id: "z", endedAt: "", byCollaboratorId: "you", startedAt: "2026-09-09T07:00:00.000Z" }),
];
ok("OF TWO OPEN RUNS, THE EARLIEST IS KEPT", keptRun(twin, "me").id === "a");
ok("...whichever order they are read in", keptRun([...twin].reverse(), "me").id === "a");
ok("...ties go to the id, so every reader agrees",
  keptRun([log({ id: "q", endedAt: "" }), log({ id: "p", endedAt: "" })], "me").id === "p");
ok("somebody else's run is never mine to keep", keptRun(twin, "nobody") === null);

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
// THE REASONS WERE ENGLISH SENTENCES joined into the refusal, so an Arabic
// terminal printed "say why it failed". They are tokens the screen translates.
ok("A QC REFUSAL IS A TOKEN, NOT AN ENGLISH SENTENCE",
  qcProblems({ batchId: "b1", result: "fail" }).join() === "fail-reason");
ok("...and so is a missing batch", qcProblems({ result: "pass" }).join() === "batch");
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
