// REQUISITIONS, PURELY. No store, no routes, no fixtures.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a status moved by assignment rather
// than through the approval. A requisition exists so that somebody other than
// the requester says yes; a generic status edit that could write "Approved"
// would route the money around the one signature the record is for, and it
// would do it silently — the change-order route shipped exactly that shape, and
// rejecting a variation approved it for a fortnight because nothing could reach
// the transition.
//
// So `requisitionProblem` refuses Approved and Rejected BY NAME, and the two
// doors that write a status both consult it.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/procurement/model");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what a request is worth");

const lines = [
  { description: "Scaffold hire", unit: "week", qty: 4, estUnitCost: 250 },
  { description: "Site fencing", unit: "m", qty: 100, estUnitCost: 12 },
];
const t = M.requisitionTotals(lines);
ok("the estimate is the sum of its lines", t.estimated === 2200, String(t.estimated));
ok("...and the quantities are counted separately", t.qty === 104, String(t.qty));
ok("a fully estimated request is complete", t.complete === true);

// A BLANK IS NOT NOUGHT. The distinction is the whole reason `complete` exists:
// a line nobody has priced makes the total provisional, and a signature given
// against a provisional total authorises a number that will change.
const partial = M.requisitionTotals([
  { description: "Scaffold hire", qty: 4, estUnitCost: 250 },
  { description: "Something nobody has priced", qty: 1 },
]);
ok("an unpriced line makes the total provisional", partial.complete === false);
ok("...and the estimate still sums what it can", partial.estimated === 1000,
  String(partial.estimated));

// NOUGHT IS A PRICE. A line genuinely expected to cost nothing is estimated.
ok("a line priced at zero is still estimated",
  M.requisitionTotals([{ description: "Free samples", qty: 5, estUnitCost: 0 }]).complete === true);

// A LINE THAT SAYS NOTHING IS NOT A LINE — the grid always keeps an empty row
// at the bottom, and refusing it would make every save fail until somebody
// cleared it by hand.
ok("empty rows are not lines",
  M.requisitionTotals([{ description: "  ", qty: 3, estUnitCost: 9 }]).lines === 0);
ok("nothing at all is not complete either",
  M.requisitionTotals([]).complete === false);
ok("...and a non-array is survivable", M.requisitionTotals(null).lines === 0);

console.log("\n== what may happen to one");

const draft = { status: "Draft", lines, createdByCollaboratorId: "c1" };

ok("a draft with lines may be submitted", M.requisitionProblem(draft, "Submitted") === null);
// NOTHING TO APPROVE IS NOT A REQUEST.
ok("an empty draft may not",
  M.requisitionProblem({ status: "Draft", lines: [] }, "Submitted") === "no-lines");
ok("and only a draft may be",
  M.requisitionProblem({ status: "Submitted", lines }, "Submitted") === "already");

// THE ASSERTION THIS FILE EXISTS FOR. Approved and Rejected are answers reached
// through the approval walk; a status move that could write either would skip
// invariant 7 entirely.
ok("APPROVED IS NOT A MOVE", M.requisitionProblem(draft, "Approved") === "not-answerable");
ok("...AND NEITHER IS REJECTED", M.requisitionProblem(draft, "Rejected") === "not-answerable");

// ONLY AN APPROVED REQUEST BECOMES AN ORDER.
ok("a submitted request cannot be ordered",
  M.requisitionProblem({ status: "Submitted", lines }, "Ordered") === "not-approved");
ok("an approved one can",
  M.requisitionProblem({ status: "Approved", lines }, "Ordered") === null);

// TERMINAL MEANS TERMINAL: an ordered request has a purchase order hanging off
// it, and a decided one records a decision. Moving either puts a request back
// in front of somebody after the answer.
for (const from of ["Ordered", "Cancelled", "Rejected"]) {
  ok(`a ${from.toLowerCase()} request is decided`,
    M.requisitionProblem({ status: from, lines }, "Submitted") === "decided");
}

// NOTHING RETURNS TO DRAFT. Once somebody has been asked, the thing they were
// asked about must not change underneath them.
ok("nothing goes back to draft",
  M.requisitionProblem({ status: "Submitted", lines }, "Draft") === "no-return");

// WITHDRAWING IS ALWAYS HONEST, including after approval: the alternative is an
// order nobody wanted.
ok("a submitted request may be withdrawn",
  M.requisitionProblem({ status: "Submitted", lines }, "Cancelled") === null);
ok("...and so may an approved one",
  M.requisitionProblem({ status: "Approved", lines }, "Cancelled") === null);

ok("an unknown status is refused", M.requisitionProblem(draft, "Purchased") === "status");
ok("a missing record is refused", M.requisitionProblem(null, "Submitted") === "notfound");

console.log("\n== who may change it");

ok("a draft edits", M.requisitionEditable(draft) === true);
ok("a submitted one does not", M.requisitionEditable({ status: "Submitted" }) === false);
// A SUBMITTED REQUEST IS A QUESTION SOMEBODY WAS ASKED and a decided one is the
// answer; deleting either erases a decision rather than a mistake.
ok("only a draft deletes", M.requisitionDeletable(draft) === true);
ok("...and an approved one never does",
  M.requisitionDeletable({ status: "Approved" }) === false);
// Absent means draft — every requisition is born one, and a row with no status
// is a row from before the field, not a row in limbo.
ok("no status reads as a draft", M.requisitionEditable({}) === true);

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
