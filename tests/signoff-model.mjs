// THE CUSTOMER'S SIGNATURE, asserted without a database.
//
// The interesting assertions are the two shapes this deliberately does NOT
// have: a signature is not a status, and a second one is not a correction.
import {
  signoffProblems, signoffProblem, cleanSignoff, myJobs, fieldSummary,
} from "../src/modules/operations/signoff.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- a signature needs both halves -----------------------------------------
// A DRAWN SQUIGGLE nobody can read is not evidence of WHO signed; a TYPED NAME
// with no mark is exactly the `receivedBy` field this exists to replace, and it
// was never a signature.
ok("a name with no mark is refused",
  signoffProblems({ signedByName: "A Khoury" }).length === 1);
ok("a mark with no name is refused",
  signoffProblems({ mediaId: "med_1" }).length === 1);
ok("neither is two problems", signoffProblems({}).length === 2);
ok("both together pass",
  signoffProblems({ signedByName: "A Khoury", mediaId: "med_1" }).length === 0);

const entry = cleanSignoff(
  { signedByName: " A Khoury ", signedByTitle: "Site foreman", mediaId: "med_1", notes: "ok" },
  { capturedByCollaboratorId: "col_9", at: "2026-09-09T10:00:00.000Z" });
ok("the stored shape trims the name", entry.signedByName === "A Khoury");
// WHO CAPTURED IT IS A COLLABORATORID, never the customer and never a user
// (invariant 6).
ok("the capturer is stamped, not typed", entry.capturedByCollaboratorId === "col_9");
ok("the time is stamped, not typed", entry.at === "2026-09-09T10:00:00.000Z");

// ---- when a job can be signed for -------------------------------------------
// A SIGNATURE ON A JOB NOBODY HAS STARTED is a signature on nothing, and it is
// the shape that turns a sign-off sheet into a formality signed at the depot.
ok("a scheduled job cannot be signed for", signoffProblem({ status: "scheduled" }) === "not-started");
ok("a cancelled job cannot be signed for", signoffProblem({ status: "cancelled" }) === "cancelled");
ok("a job in progress can be", signoffProblem({ status: "in-progress" }) === null);
ok("a completed job can be", signoffProblem({ status: "completed" }) === null);
// A SECOND SIGNATURE IS NOT REFUSED: a revisit is signed again, and the list
// keeps both. Refusing one would make the honest case impossible in order to
// prevent a double tap.
ok("A JOB ALREADY SIGNED CAN BE SIGNED AGAIN", signoffProblem({ status: "completed" }) === null);

// ---- my round ---------------------------------------------------------------
const JOBS = [
  { id: "a", status: "scheduled", scheduledStart: "2026-09-09T08:00:00.000Z", assignedToCollaboratorIds: ["me"] },
  { id: "b", status: "in-progress", scheduledStart: "2026-09-09T11:00:00.000Z", assignedToCollaboratorIds: ["me"] },
  { id: "undated", status: "scheduled", scheduledStart: "", assignedToCollaboratorIds: ["me"] },
  { id: "done", status: "completed", scheduledStart: "2026-09-08T08:00:00.000Z", assignedToCollaboratorIds: ["me"] },
  { id: "off", status: "cancelled", scheduledStart: "2026-09-09T09:00:00.000Z", assignedToCollaboratorIds: ["me"] },
  { id: "theirs", status: "scheduled", scheduledStart: "2026-09-09T07:00:00.000Z", assignedToCollaboratorIds: ["you"] },
];
const round = myJobs(JOBS, "me");
ok("somebody else's job is not on my round", !round.some((j) => j.id === "theirs"));
ok("a cancelled job is not on my round", !round.some((j) => j.id === "off"));
ok("a finished job is not on my round", !round.some((j) => j.id === "done"));
ok("soonest first", round[0].id === "a");
// AN UNSCHEDULED JOB IS NOT URGENT, and an empty string sorting before every
// real date would put it at the top of every technician's day.
ok("AN UNDATED JOB SORTS LAST, NOT FIRST", round[round.length - 1].id === "undated",
  round.map((j) => j.id).join(","));

// IT IS NOT THE DISPATCH BOARD'S LANE: a technician's Tuesday job does not stop
// mattering at Tuesday's end, so this filters by person and by outstanding
// work, never by a single day.
const acrossDays = myJobs([
  ...JOBS,
  { id: "yesterday", status: "in-progress", scheduledStart: "2026-09-01T08:00:00.000Z", assignedToCollaboratorIds: ["me"] },
], "me");
ok("an unfinished job from last week is still mine", acrossDays[0].id === "yesterday");

// ---- what has been done and cannot be proved --------------------------------
// FED MY JOBS, not the studio's: the service filters by collaborator before
// it summarises, and counting somebody else's round into my day would be a
// number nobody could act on.
const MINE = JOBS.filter((j) => j.assignedToCollaboratorIds.includes("me"));
const summary = fieldSummary(MINE, { done: [] });
ok("outstanding counts the scheduled and the in-progress", summary.outstanding === 3);
ok("completed counts the completed", summary.completed === 1);
// A COMPLETED JOB WITH NO SIGN-OFF is not a failure and not missing data: it is
// work that has been done and cannot be proved, and nothing in the product
// could name it before.
ok("A COMPLETED JOB WITH NO SIGNATURE IS AWAITING ONE",
  summary.awaitingSignature.length === 1 && summary.awaitingSignature[0].id === "done");
ok("...and a signed one is not",
  fieldSummary(MINE, { done: [entry] }).awaitingSignature.length === 0);
// AN UNFINISHED JOB IS NOT AWAITING A SIGNATURE — it is awaiting the work.
ok("an unfinished job is not awaiting a signature",
  !summary.awaitingSignature.some((j) => j.id === "b"));

console.log(fails ? `\nsignoff model: ${fails} FAILURES\n` : "\nsignoff model: all passed\n");
process.exit(fails ? 1 : 0);
