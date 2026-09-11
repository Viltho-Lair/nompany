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
// BOTH IMPORTS AT THE TOP. Imported mid-file, after the first block had run,
// this exited 127 on Windows with every assertion passing — libuv's
// `UV_HANDLE_CLOSING` assert, the loader hook's thread torn down under
// `process.exit`. permit-model.mjs has the same two imports up here and exits 0.
const B = await import("@/modules/procurement/bulkNeeds");

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

console.log("\n== ordering what a Bulk sheet still needs (tier 5)");

// THE DEFECT THIS GUARDS IS BUYING TWICE. Nothing links an order back to a
// sheet row, so "needed" is what was sold less what is allocated less what is
// already ASKED FOR — a second press must find the first press's requisitions.
const groups = [
  { id: "v1", title: "Acme", rows: [
    { itemId: "cam", description: "Camera", unit: "pc", qty: 10, serials: ["s1", "s2"] },
    { itemId: "nvr", description: "Recorder", unit: "pc", qty: 1, serials: ["n1"] },
  ] },
  { id: "unassigned", title: "No vendor yet", rows: [
    { itemId: "cable", description: "Cable", qty: 100 },
    { description: "Labour", qty: 3 },
  ] },
];

const first = B.bulkNeeds(groups, new Map());
ok("what is short is sold less what is allocated", first.needs[0]?.lines[0]?.qty === 8, JSON.stringify(first.needs));
ok("a fully allocated line asks for nothing", first.needs[0]?.lines.length === 1);
ok("one requisition per supplier", first.needs.length === 1 && first.needs[0].vendorId === "v1");
// COUNTED, NOT DROPPED: a line with no supplier or no Registered Item cannot
// become an order, and a list that silently omitted it would read as done.
ok("a line with no supplier or no registered item is reported, not dropped", first.skipped === 2, String(first.skipped));

// THE SECOND PRESS. The first raised a Draft for 8 cameras; nothing more is short.
const asked = B.askedFor("p1", [
  { projectId: "p1", status: "Draft", lines: [{ itemId: "cam", qty: 8 }] },
  { projectId: "p1", status: "Rejected", lines: [{ itemId: "cam", qty: 99 }] },
  { projectId: "p2", status: "Approved", lines: [{ itemId: "cam", qty: 99 }] },
], []);
ok("a live requisition counts as asked for", asked.get("cam") === 8, String(asked.get("cam")));
ok("a second press asks for nothing", B.bulkNeeds(groups, asked).needs.length === 0);

// AN ORDER COUNTS ONCE. One converted from a requisition IS that requisition's
// quantity; a direct order stands on its own; a cancelled one asked for nothing.
const withOrders = B.askedFor("p1",
  [{ projectId: "p1", status: "Ordered", lines: [{ itemId: "cam", qty: 5 }] }],
  [
    { projectId: "p1", status: "Ordered", requisitionId: "r1", lines: [{ itemId: "cam", qty: 5 }] },
    { projectId: "p1", status: "Ordered", lines: [{ itemId: "cam", qty: 2 }] },
    { projectId: "p1", status: "Cancelled", lines: [{ itemId: "cam", qty: 50 }] },
  ]);
ok("a converted order is not counted on top of its requisition", withOrders.get("cam") === 7, String(withOrders.get("cam")));

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
// exitCode, not exit(): see the imports above — the natural shutdown waits for
// the loader's thread instead of tearing it down mid-close.
process.exitCode = fails ? 1 : 0;
