// BANK RECONCILIATION, asserted without a database.
//
// A pairing, not a calculation — so the assertions are about what it refuses to
// pair automatically and the two DIFFERENT problems it keeps apart.
import {
  statementProblems, cleanStatementLine, suggestMatches, reconcile, matchProblem,
} from "../src/modules/finance/reconciliation.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- a statement line -------------------------------------------------------
ok("a line needs a date", statementProblems({ amount: 100, description: "x" }).length === 1);
// A BANK DOES NOT PRINT A MOVEMENT OF NOUGHT, and one typed here would sit
// unmatchable for ever against a book line that also does not exist.
ok("A LINE OF NOUGHT IS REFUSED",
  statementProblems({ date: "2026-09-01", amount: 0, description: "x" }).length === 1);
ok("a line needs a description",
  statementProblems({ date: "2026-09-01", amount: 100 }).length === 1);
ok("a good line passes",
  statementProblems({ date: "2026-09-01", amount: -100, description: "Charge" }).length === 0);
ok("money out is negative and survives cleaning",
  cleanStatementLine({ date: "2026-09-01", amount: -100, description: "Charge" }).amount === -100);

// ---- suggestions ------------------------------------------------------------
const LINES = [
  { id: "s1", date: "2026-09-03", description: "TRF ACME", amount: 500 },
  { id: "s2", date: "2026-09-05", description: "TRF ACME", amount: 500 },
  { id: "s3", date: "2026-09-06", description: "BANK CHARGE", amount: -12 },
];
const BOOK = [
  { entryId: "e1", date: "2026-09-01", memo: "Acme payment", amount: 500 },
  { entryId: "e2", date: "2026-09-04", memo: "Acme payment", amount: 500 },
  { entryId: "e3", date: "2026-09-02", memo: "Cheque to supplier", amount: -900 },
];

const suggestions = suggestMatches(LINES, BOOK);
// s1 is the 3rd: one day from e2 (the 4th) and two from e1 (the 1st), so the
// CLOSEST is e2. Asserting `e1` here was a first draft's guess and the code was
// right — the expectation, not the pairing, was wrong.
ok("a line is paired with the closest entry of the same amount",
  suggestions.find((s) => s.lineId === "s1")?.entryId === "e2",
  JSON.stringify(suggestions));
// ONE SUGGESTION PER ENTRY: the second identical amount takes what is left, so
// a person resolving them one at a time never sees a pairing already used.
ok("A SECOND IDENTICAL AMOUNT TAKES THE OTHER ENTRY",
  suggestions.find((s) => s.lineId === "s2")?.entryId === "e1");
// GREEDY PER LINE, NOT GLOBALLY OPTIMAL, and deliberately: pairing s1-e1 and
// s2-e2 totals three days apart where this totals five. Solving it properly is
// an assignment problem and would buy nothing, because NOTHING IS MATCHED
// AUTOMATICALLY — for two payments of one amount in one week the dates are not
// what tells them apart, the bank's description is, and only a person reads it.
ok("THE PAIRING IS GREEDY AND SAYS SO",
  suggestions.find((s) => s.lineId === "s1").daysApart
  + suggestions.find((s) => s.lineId === "s2").daysApart === 5);
// THE AMOUNT MUST MATCH EXACTLY. A tolerance would pair a 500 with a 499.50 and
// hide a bank charge of fifty pence, which is what a reconciliation is for.
ok("a bank charge with no matching entry is not suggested",
  !suggestions.some((s) => s.lineId === "s3"));
ok("an entry far outside the window is not suggested",
  suggestMatches([{ id: "x", date: "2026-12-01", description: "d", amount: 500 }], BOOK).length === 0);
ok("an already-matched line is not suggested again",
  suggestMatches([{ ...LINES[0], matchedEntryId: "e1" }], BOOK).length === 0);
// AN ENTRY ALREADY CONFIRMED ELSEWHERE is out of play.
ok("an entry already confirmed is not suggested for another line",
  suggestMatches(
    [{ ...LINES[0], matchedEntryId: "e2" }, LINES[1]], BOOK,
  ).find((s) => s.lineId === "s2")?.entryId === "e1");

// ---- where the two sides stand ----------------------------------------------
const CONFIRMED = [{ ...LINES[0], matchedEntryId: "e2" }, LINES[1], LINES[2]];
const state = reconcile(CONFIRMED, BOOK);
// `bookBalance` IS EVERY BOOK LINE: it is what the ledger says, and subtracting
// the unmatched would give a figure that is neither the ledger's nor the bank's.
ok("the book balance is every book line", state.bookBalance === 100, String(state.bookBalance));
ok("the statement balance is every statement line", state.statementBalance === 988);
ok("the difference is between the two", state.difference === -888);
ok("one pair is matched", state.matched === 1);

// THREE STATES, TWO OF THEM DIFFERENT PROBLEMS.
ok("MONEY ON THE STATEMENT AND NOT IN THE BOOKS is listed",
  state.onStatementOnly.map((l) => l.id).join(",") === "s2,s3");
ok("MONEY IN THE BOOKS AND NOT ON THE STATEMENT is listed separately",
  state.inBooksOnly.map((b) => b.entryId).join(",") === "e1,e3");
// A HEALTHY RECONCILIATION HAS A DIFFERENCE — uncleared cheques are supposed to
// be there. What makes it wrong is the difference not being EXPLAINED, which is
// why both lists come back rather than one number.
ok("a fully matched pair leaves nothing unexplained", (() => {
  const all = [{ id: "a", date: "2026-09-01", description: "x", amount: 100, matchedEntryId: "b1" }];
  const bk = [{ entryId: "b1", date: "2026-09-01", memo: "x", amount: 100 }];
  const r = reconcile(all, bk);
  return r.difference === 0 && r.onStatementOnly.length === 0 && r.inBooksOnly.length === 0;
})());

// ---- confirming a pair ------------------------------------------------------
ok("a pair of the same amount confirms", matchProblem(LINES[0], BOOK[0]) === null);
// A PERSON MAY CONFIRM A PAIRING THIS NEVER SUGGESTED — an unrecognisable bank
// description, dates months apart — but NOT one where the money differs,
// because that is two events rather than a match.
ok("AMOUNTS THAT DIFFER ARE NOT A MATCH", matchProblem(LINES[0], BOOK[2]) === "amount");
ok("a date months apart is still a legitimate match",
  matchProblem({ ...LINES[0], date: "2025-01-01" }, BOOK[0]) === null);
ok("a line already matched is refused",
  matchProblem({ ...LINES[0], matchedEntryId: "e9" }, BOOK[0]) === "already-matched");
ok("a missing line is refused", matchProblem(undefined, BOOK[0]) === "line");
ok("a missing entry is refused", matchProblem(LINES[0], undefined) === "entry");

console.log(fails ? `\nreconciliation model: ${fails} FAILURES\n` : "\nreconciliation model: all passed\n");
process.exit(fails ? 1 : 0);
