// A TENDER'S LADDER, PURELY. No store, no routes, no fixtures.
//
// The rules here are about SUBMISSION, which is what makes a tender different
// from a deal and is why this is its own ladder rather than a reuse of
// modules/sales/pipeline. A deal is chased and may stall anywhere; a tender has
// a date on it, is either bid or not, and cannot be won unless it was sent.
//
// (The two are deliberately unshared for now — the program design has P4a hand
// built so P4b's abstraction is extracted from real screens rather than guessed
// at from one. Where they DO agree is asserted, so the extraction has evidence.)

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const T = await import("@/modules/tendering/stages");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the ladder");

ok("every stage is either live or decided",
  T.LIVE_TENDER_STAGES.length + T.DECIDED_TENDER_STAGES.length === T.TENDER_STAGES.length,
  JSON.stringify([T.LIVE_TENDER_STAGES, T.DECIDED_TENDER_STAGES]));

ok("a new tender starts Identified", T.DEFAULT_TENDER_STAGE === "Identified");
ok("...which is live", !T.isDecided(T.DEFAULT_TENDER_STAGE));
ok("exactly one decided stage is a win",
  T.DECIDED_TENDER_STAGES.filter((s) => T.isWonTender(s)).length === 1);
// SUBMITTED IS ITS OWN KIND, neither open nor decided: the bid is in and the
// outcome is not known, which is the state a register spends most of its time in.
ok("Submitted is neither open nor decided",
  T.isSubmitted("Submitted") && !T.isDecided("Submitted"));

console.log("\n== a move that would be a lie");

const p = (from, to, reason) => T.tenderProblem({ from, to, reason });

// THE RULE THE WHOLE SECTION EXISTS FOR. "Won" straight from "Preparing" reads
// as a win and means the bid was never sent — a studio would be counting
// victories in contests it did not enter.
ok("a tender cannot be won without being submitted", p("Preparing", "Won") === "not-submitted");
ok("...nor lost", p("Preparing", "Lost", "price") === "not-submitted");
ok("...nor won straight from being noticed", p("Identified", "Won") === "not-submitted");
ok("but both are allowed once the bid is in",
  p("Submitted", "Won") === null && p("Submitted", "Lost", "price") === null);

// A DECIDED TENDER IS HISTORY, the same rule a closed deal follows.
ok("a decided tender cannot be reopened", p("Won", "Preparing") === "already-decided");
ok("...nor re-decided", p("Lost", "Won") === "already-decided");
ok("...and that includes one declined", p("No Bid", "Preparing") === "already-decided");

// AND YOU CANNOT DECLINE ONE YOU HAVE ALREADY SENT. After submission the honest
// exit is Withdrawn, which says something different to whoever reads it later.
ok("a submitted tender cannot become a No Bid", p("Submitted", "No Bid", "changed our mind") === "already-submitted");
ok("...but it can be withdrawn", p("Submitted", "Withdrawn", "client cancelled") === null);
ok("...and No Bid is fine before the bid goes in",
  p("Identified", "No Bid", "out of scope") === null && p("Preparing", "No Bid", "no capacity") === null);

console.log("\n== a decision says why");

ok("losing needs a reason", p("Submitted", "Lost") === "reason-required");
ok("declining needs a reason", p("Preparing", "No Bid") === "reason-required");
ok("withdrawing needs a reason", p("Submitted", "Withdrawn") === "reason-required");
ok("...and whitespace is not a reason", p("Submitted", "Lost", "   ") === "reason-required");
// WINNING NEEDS NO EXCUSE, which is the asymmetry that makes the field mean
// something: it exists to answer "why do we lose tenders".
ok("winning is not asked for a reason", p("Submitted", "Won") === null);

ok("a stage that does not exist is refused", p("Identified", "Shortlisted") === "unknown-stage");
ok("moving to where it already is changes nothing", p("Preparing", "Preparing") === null);

console.log("\n== what a move writes");

const at = "2026-09-05T10:00:00.000Z";
const sent = T.tenderPatch({ from: "Preparing", to: "Submitted", at, byCollaboratorId: "col_1" });
// STAMPED WHEN IT HAPPENS. The submission date is a fact a studio is asked
// about by clients and auditors; deriving it later from an array is how it
// becomes approximate.
ok("submitting stamps submittedAt", sent.submittedAt === at);
ok("...and does not decide anything", sent.decidedAt === undefined);
ok("...and records who (invariant 6: a CollaboratorID)",
  sent.stageHistory.at(-1).byCollaboratorId === "col_1");

const lost = T.tenderPatch({
  from: "Submitted", to: "Lost", at, byCollaboratorId: "col_1", reason: "  undercut on price  ",
  history: [{ status: "Submitted", at: "2026-08-01T00:00:00.000Z", byCollaboratorId: "" }],
});
ok("a decision stamps decidedAt", lost.decidedAt === at);
ok("...stores the trimmed reason", lost.decisionReason === "undercut on price");
ok("...and appends rather than replacing", lost.stageHistory.length === 2);
ok("...but does not re-stamp the submission",
  lost.submittedAt === undefined, JSON.stringify(lost.submittedAt));

const won = T.tenderPatch({ from: "Submitted", to: "Won", at, byCollaboratorId: "c", reason: "left over" });
// Cleared on a win, so a tender withdrawn and re-entered cannot carry the old
// excuse — the same rule a deal's lostReason follows.
ok("a win clears any reason handed to it", won.decisionReason === "");

const long = T.tenderPatch({
  from: "Identified", to: "Preparing", at, byCollaboratorId: "",
  history: Array.from({ length: 250 }, () => ({ status: "Identified", at, byCollaboratorId: "" })),
});
ok("history is capped at 200", long.stageHistory.length === 200);

console.log("\n== the date the register is for");

const now = Date.parse("2026-09-05T09:00:00.000Z");
ok("a deadline next week is seven days out", T.daysToDeadline("2026-09-12", now) === 7);
ok("today is zero", T.daysToDeadline("2026-09-05", now) === 0);
ok("yesterday is negative", T.daysToDeadline("2026-09-04", now) === -1);
// MEASURED FROM MIDNIGHT, not from the current instant: a deadline "today"
// must read as today all day, not flip to -1 at nine in the morning.
ok("...and the hour of day does not move it",
  T.daysToDeadline("2026-09-05", Date.parse("2026-09-05T23:59:00.000Z")) === 0);
ok("no deadline is null, never zero", T.daysToDeadline("", now) === null);
ok("...and nor is nonsense", T.daysToDeadline("not a date", now) === null);

console.log("\n== the one a studio is about to miss");

// THE WHOLE POINT OF A REGISTER. A missed submission is not a loss — it is
// nothing at all, it appears in no win rate, and only a list that surfaces it
// before the day arrives ever catches it.
ok("an un-submitted tender due today is at risk", T.isAtRisk("Preparing", "2026-09-05", now));
ok("...and one whose date has gone", T.isAtRisk("Identified", "2026-08-01", now));
ok("...but not one already submitted", !T.isAtRisk("Submitted", "2026-08-01", now));
ok("...nor one already decided", !T.isAtRisk("No Bid", "2026-08-01", now));
ok("...nor one still days away", !T.isAtRisk("Preparing", "2026-09-12", now));
ok("a tender with no deadline is not at risk, it is incomplete",
  !T.isAtRisk("Preparing", "", now));

console.log("\n== where it agrees with the deal ladder, and where it does not");

const P = await import("@/modules/sales/pipeline");
// The two SHAPES agree, which is the evidence P4b's extraction will need. The
// RULES do not, which is why they are not shared yet.
ok("both ladders refuse reopening a settled record",
  p("Won", "Preparing") === "already-decided" && P.stageProblem({ from: "Closed Won", to: "Lead" }) === "already-closed");
ok("both demand a reason for a losing outcome",
  p("Submitted", "Lost") === "reason-required"
  && P.stageProblem({ from: "Opportunity", to: "Closed Lost" }) === "reason-required");
ok("only the tender ladder knows about submission",
  p("Preparing", "Won") === "not-submitted" && typeof P.stageProblem === "function"
  && !Object.keys(P).includes("isSubmitted"));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
