// PERIODS AND CLOSE, asserted without a database.
//
// A lock on a date range. The assertions that matter are what it refuses to
// do: post into a closed month, and pretend a reopened month was never closed.
import {
  periodOf, isClosed, postingProblem, closeProblems, closePreview, periodList, cleanClose,
  PERIOD_RE,
} from "../src/modules/finance/periods.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

ok("a period is a year and a month", PERIOD_RE.test("2026-09") && !PERIOD_RE.test("2026-00"));
ok("a date's period is its first seven characters", periodOf("2026-09-14") === "2026-09");
ok("something that is not a date has no period", periodOf("later") === "");

const CLOSED = [
  { id: "p1", period: "2026-08", closedByCollaboratorId: "c1", closedAt: "2026-09-01T00:00:00.000Z" },
];
const REOPENED = [
  ...CLOSED,
  {
    id: "p2", period: "2026-07", closedByCollaboratorId: "c1", closedAt: "2026-08-01T00:00:00.000Z",
    reopenedByCollaboratorId: "c2", reopenedAt: "2026-08-15T00:00:00.000Z", reason: "missed a bill",
  },
];

ok("a closed month is closed", isClosed(CLOSED, "2026-08"));
ok("an untouched month is not", isClosed(CLOSED, "2026-09") === false);
// A REOPENED PERIOD KEEPS ITS ROW: deleting it would erase the fact that it was
// ever closed and reopened, which is precisely what an auditor wants.
ok("A REOPENED MONTH IS OPEN, AND ITS ROW SURVIVES",
  isClosed(REOPENED, "2026-07") === false && REOPENED.some((r) => r.period === "2026-07"));

// ---- what a close refuses ---------------------------------------------------
// IT REFUSES THE POSTING, NOT THE DOCUMENT: an invoice raised late still
// exists; what it cannot do is land in a month somebody has already reported.
ok("A POSTING DATED IN A CLOSED MONTH IS REFUSED",
  postingProblem(CLOSED, "2026-08-31") === "period-closed");
ok("a posting in an open month is fine", postingProblem(CLOSED, "2026-09-01") === null);
ok("a posting in a reopened month is fine", postingProblem(REOPENED, "2026-07-15") === null);
// `postEntry` DEFAULTS AN UNPARSEABLE DATE TO TODAY, so answering "closed" for
// a value that will become today would refuse a posting for a month nobody
// named.
ok("a posting with no usable date is not refused here", postingProblem(CLOSED, "soon") === null);

ok("closing a month that is already closed is refused",
  closeProblems(CLOSED, "2026-08").length === 1);
ok("closing something that is not a month is refused",
  closeProblems(CLOSED, "whenever").length === 1);
ok("closing an open month passes", closeProblems(CLOSED, "2026-09").length === 0);

// ---- what a close would lock ------------------------------------------------
const ENTRIES = [
  { date: "2026-08-02" }, { date: "2026-08-30" }, { date: "2026-09-01" }, { date: "" },
];
const UNPOSTED = [
  { document: { id: "b1" }, date: "2026-08-15", kind: "bill" },
  { document: { id: "b2" }, date: "2026-08-04", kind: "bill" },
  { document: { id: "i1" }, date: "2026-09-02", kind: "invoice" },
];
const preview = closePreview(ENTRIES, UNPOSTED, "2026-08");
ok("the preview counts what is already posted", preview.entries === 2);
// A CLOSE THAT ONLY SAID "12 entries" is a button; one that says "and 3 bills
// dated in this month are not in the books" is a decision.
ok("THE PREVIEW NAMES WHAT IS DATED IN THE MONTH AND NOT POSTED",
  preview.unposted.length === 2, JSON.stringify(preview.unposted));
ok("...oldest first", preview.unposted[0].id === "b2");
ok("another month's unposted document is not listed",
  !preview.unposted.some((u) => u.id === "i1"));

// ---- the list ---------------------------------------------------------------
const list = periodList(ENTRIES, CLOSED, "2026-10-05");
const at = (p) => list.find((r) => r.period === p);
ok("a month with entries is listed", at("2026-08").entries === 2);
// THE CURRENT MONTH IS INCLUDED EVEN EMPTY, because it is the one somebody is
// working in.
ok("THE CURRENT MONTH IS LISTED EVEN WITH NOTHING IN IT", at("2026-10").entries === 0);
ok("newest first", list[0].period === "2026-10");
ok("a closed month says so", at("2026-08").closed === true);
ok("an entry with no date is in no month", !list.some((r) => r.period === ""));
// A CLOSED MONTH WITH NO ENTRIES IS STILL A ROW: closing an empty month says
// "nothing happened and nothing may", and hiding it makes the lock invisible.
const emptyClosed = periodList([], [{ id: "x", period: "2025-01", closedByCollaboratorId: "c", closedAt: "" }], "2026-10-05");
ok("A CLOSED EMPTY MONTH IS STILL A ROW",
  emptyClosed.some((r) => r.period === "2025-01" && r.closed));
const reopenedList = periodList(ENTRIES, REOPENED, "2026-10-05");
ok("a reopened month is marked as such",
  reopenedList.find((r) => r.period === "2026-07").reopened === true);
ok("...and is not closed", reopenedList.find((r) => r.period === "2026-07").closed === false);

ok("the stored close carries who and when",
  cleanClose("2026-09", { collaboratorId: "c9", at: "2026-10-01T00:00:00.000Z" })
    .closedByCollaboratorId === "c9");

console.log(fails ? `\nperiods model: ${fails} FAILURES\n` : "\nperiods model: all passed\n");
process.exit(fails ? 1 : 0);
