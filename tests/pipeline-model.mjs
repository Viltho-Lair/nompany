// THE PIPELINE, PURELY. A stage is a value and a transition is a decision about
// two of them, so none of this needs a store, a route or a fixture — it runs in
// milliseconds beside tests/approval-model.mjs rather than inside the suite.
//
// ONE ASSERTION PER DEFECT, and every defect below is one the code actually had
// before this slice, not one imagined for the occasion. `editTicket` checked
// that a status was a member of TICKET_STATUSES and nothing else, so a Closed
// Won deal could be sent back to Lead; `closedAt` and `lostReason` were on the
// schema and written by nobody; and ./tickets stated a rule about post-approval
// statuses that no code enforced.
//
// The loader preamble is access.test.mjs's — it is what lets a .mjs test import
// a .ts module rather than asserting against a string-loaded copy of it.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const P = await import("@/modules/sales/pipeline");
const { TICKET_STATUSES } = await import("@/modules/sales/tickets");
const { ALL_PERMISSIONS } = await import("@/platform/access");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== every stage is classified");

// THE SILENT DISAPPEARANCE. A status added to TICKET_STATUSES and not given a
// StageDef throws nothing and fails no type check — it simply never appears on
// the board, and every deal sitting in it vanishes from the funnel while
// continuing to exist. Nothing else in the build can catch that.
ok("no ticket status is missing from the stage table",
  P.unclassifiedStatuses().length === 0, JSON.stringify(P.unclassifiedStatuses()));

ok("the board's columns are the live stages, in funnel order",
  JSON.stringify(P.BOARD_COLUMNS) === JSON.stringify(["Lead", "Opportunity", "Commit", "On-Hold"]),
  JSON.stringify(P.BOARD_COLUMNS));

ok("...and no closed stage is among them",
  !P.BOARD_COLUMNS.some((s) => P.isClosed(s)));

ok("every stage is either a column or a way of ending",
  P.BOARD_COLUMNS.length + P.CLOSED_STAGES.length === TICKET_STATUSES.length);

ok("exactly one closed stage is a win",
  P.CLOSED_STAGES.filter((s) => P.isWon(s)).length === 1);

// ON-HOLD IS NEITHER. It was tempting to call a held deal closed, which would
// erase it from the pipeline, or open, which would leave it in the forecast at
// a probability nobody has revisited since it stalled.
ok("a held deal is neither open nor closed", P.stageDef("On-Hold").kind === "paused");

console.log("\n== a move that would be a lie");

const problem = (from, to, opts = {}) => P.stageProblem({ from, to, ...opts });

// THE ORIGINAL DEFECT. `editTicket` accepted any member of TICKET_STATUSES from
// the payload, so a won deal could be dragged back into the funnel — deleting a
// win from every count already taken off it and leaving the ticket in a stage
// its own closedAt contradicts.
ok("a won deal cannot be reopened",
  problem("Closed Won", "Lead") === "already-closed");
ok("...nor a lost one", problem("Closed Lost", "Opportunity") === "already-closed");
ok("...nor moved to another closed stage",
  problem("Closed Lost", "Dropped", { lostReason: "x" }) === "already-closed");

// THE SENTENCE ./tickets STATED AND NOTHING ENFORCED: the post-approval
// statuses are pickable "only after the quotation approval is complete".
ok("Commit needs a quotation", problem("Opportunity", "Commit") === "no-quotation");
ok("...and so does a win",
  problem("Opportunity", "Closed Won") === "no-quotation");
ok("...and both are allowed once one exists",
  problem("Opportunity", "Commit", { hasQuotation: true }) === null);

// AND THE TRAP ON THE OTHER SIDE. Requiring a quotation to ABANDON a deal would
// strand every dead lead in the pipeline forever, waiting for a document nobody
// will ever raise.
ok("a bare lead can still be dropped",
  problem("Lead", "Dropped", { lostReason: "no budget" }) === null);
ok("...cancelled", problem("Lead", "Cancelled by Client", { lostReason: "went quiet" }) === null);
ok("...and put on hold", problem("Lead", "On-Hold") === null);

console.log("\n== a losing close says why");

ok("closing as lost with no reason is refused",
  problem("Opportunity", "Closed Lost") === "reason-required");
ok("...and whitespace is not a reason",
  problem("Opportunity", "Closed Lost", { lostReason: "   " }) === "reason-required");
ok("...but a real one is accepted",
  problem("Opportunity", "Closed Lost", { lostReason: "price" }) === null);
// A WIN NEEDS NO EXCUSE, which is the whole asymmetry: `lostReason` exists to
// answer "why do we lose", and asking it of a win would make the field mean
// nothing.
ok("a win is not asked for a reason",
  problem("Opportunity", "Closed Won", { hasQuotation: true }) === null);

ok("a stage that does not exist is refused",
  problem("Lead", "Negotiating") === "unknown-stage");
ok("moving a deal to where it already is changes nothing",
  problem("Lead", "Lead") === null);

console.log("\n== what a move writes");

const patch = P.stagePatch({
  from: "Opportunity", to: "Closed Lost", at: "2026-09-04T10:00:00.000Z",
  byCollaboratorId: "col_1", lostReason: "  price  ",
  history: [{ status: "Opportunity", at: "2026-08-01T00:00:00.000Z", byCollaboratorId: "" }],
});

// THE TWO DEAD FIELDS, now written. Both were declared on SalesTicketSchema
// from the beginning and neither was ever set by anything.
ok("a closing move stamps closedAt", patch.closedAt === "2026-09-04T10:00:00.000Z");
ok("...and stores the trimmed reason", patch.lostReason === "price");
ok("...and appends to the history rather than replacing it",
  patch.stageHistory.length === 2 && patch.stageHistory[0].status === "Opportunity");
ok("...naming who made the move (invariant 6: a CollaboratorID)",
  patch.stageHistory[1].byCollaboratorId === "col_1");

const won = P.stagePatch({
  from: "Commit", to: "Closed Won", at: "2026-09-04T10:00:00.000Z",
  byCollaboratorId: "col_1", lostReason: "left over from an earlier attempt",
});
// A DEAL DROPPED AND LATER WON MUST NOT CARRY THE OLD EXCUSE. The reason is
// cleared on a winning close rather than left where it was.
ok("a win clears any reason it was handed", won.lostReason === "");

const open = P.stagePatch({
  from: "Lead", to: "Opportunity", at: "2026-09-04T10:00:00.000Z", byCollaboratorId: "",
});
ok("a move between live stages stamps no closedAt", open.closedAt === undefined);
ok("...and writes no reason", open.lostReason === undefined);

// CAPPED, like comments are. A deal bounced between two stages all week must
// not grow a row without bound.
const long = P.stagePatch({
  from: "Lead", to: "Opportunity", at: "2026-09-04T10:00:00.000Z", byCollaboratorId: "",
  history: Array.from({ length: 250 }, (_, i) => ({ status: "Lead", at: `${i}`, byCollaboratorId: "" })),
});
ok("history is capped at 200 entries", long.stageHistory.length === 200);
ok("...keeping the newest", long.stageHistory[199].status === "Opportunity");

console.log("\n== how long it has been sitting there");

// THE DAY-ONE BUG THIS AVOIDS. Every ticket that exists today was written
// before stageHistory did, so a board that could only read history would show
// nothing at all for every deal a live studio already has — on precisely the
// day the board is most worth reading. A ticket that has been in Lead since it
// was raised genuinely HAS been, so the fallback is a fact, not a guess.
ok("a deal with no history falls back to when it was last touched",
  P.enteredStageAt({ status: "Lead", updatedAt: "2026-08-01T00:00:00.000Z", createdAt: "2026-07-01T00:00:00.000Z" })
    === "2026-08-01T00:00:00.000Z");
ok("...and to when it was raised, if it has never been touched",
  P.enteredStageAt({ status: "Lead", createdAt: "2026-07-01T00:00:00.000Z" }) === "2026-07-01T00:00:00.000Z");

// A DEAL THAT CAME BACK. Reading the FIRST matching entry would date the stage
// from a visit months ago and report a fresh deal as stale.
ok("a deal that returned to a stage is dated from the latest visit",
  P.enteredStageAt({
    status: "Opportunity",
    stageHistory: [
      { status: "Opportunity", at: "2026-01-01T00:00:00.000Z", byCollaboratorId: "" },
      { status: "On-Hold", at: "2026-02-01T00:00:00.000Z", byCollaboratorId: "" },
      { status: "Opportunity", at: "2026-08-01T00:00:00.000Z", byCollaboratorId: "" },
    ],
    updatedAt: "2026-08-02T00:00:00.000Z",
  }) === "2026-08-01T00:00:00.000Z");

const now = Date.parse("2026-09-04T00:00:00.000Z");
ok("days are whole days", P.daysSince("2026-08-30T00:00:00.000Z", now) === 5);
ok("a future date is zero days, not a negative one",
  P.daysSince("2026-10-01T00:00:00.000Z", now) === 0);
ok("an unparseable date is zero rather than NaN",
  P.daysSince("", now) === 0 && P.daysSince("not a date", now) === 0);

console.log("\n== what the forecast is worth");

ok("weighted value is value by likelihood", P.weightedValue(1000, 40) === 400);
ok("...to two places, not to the nearest whole", P.weightedValue(999, 33) === 329.67);
ok("a probability above 100 is clamped", P.weightedValue(1000, 250) === 1000);
ok("...and below zero", P.weightedValue(1000, -50) === 0);
ok("nonsense is zero, never NaN",
  P.weightedValue("x", 40) === 0 && P.weightedValue(1000, undefined) === 0);

console.log("\n== the right, and the file that must stay pure");

// INVARIANT 16 FROM THE OTHER END: the section declares an area, and the area
// has to exist for the section to be grantable at all.
ok("crmSales.pipeline.view is a real permission",
  ALL_PERMISSIONS.includes("crmSales.pipeline.view"));

// THE WHOLE POINT OF THE SPLIT. The board imports this module to validate a
// move with the same function the server refuses it with; one server import
// here would drag a database client into the browser bundle. Asserted against
// the source text because that is the only way to see an import that a passing
// test would otherwise never exercise.
const src = readFileSync(new URL("../src/modules/sales/pipeline.ts", import.meta.url), "utf8");
const serverImports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1])
  .filter((spec) => spec.startsWith("@/platform/") || spec.includes("/db/"));
ok("the pure pipeline module imports nothing server-side",
  serverImports.length === 0, JSON.stringify(serverImports));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
