// THE SALES ORDER'S STATUS RULES, PURELY. A status is a value and a move is a
// decision about two of them, so none of this needs a store, a route or a
// fixture — it runs in milliseconds beside tests/pipeline-model.mjs.
//
// ONE ASSERTION PER RULE THE SERVICE DEPENDS ON. The screen draws its buttons
// from this same module and the route refuses through it, so a rule that is
// wrong here is wrong in both places at once — which is the reason the module
// is pure and the reason this file exists.
//
// The loader preamble is access.test.mjs's — it is what lets a .mjs test import
// a .ts module rather than asserting against a string-loaded copy of it.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const O = await import("@/modules/sales/orderStatus");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const LINE = [{ description: "Cable tray, 300mm", qty: 40, unitPrice: 22.5 }];

console.log("\n== the moves that exist ==\n");

ok("a draft may be confirmed", O.orderProblem("Draft", "Confirmed", LINE) === null);
ok("a draft may be cancelled", O.orderProblem("Draft", "Cancelled", LINE) === null);
ok("a confirmed order may be fulfilled", O.orderProblem("Confirmed", "Fulfilled", LINE) === null);
ok("a confirmed order may be cancelled", O.orderProblem("Confirmed", "Cancelled", LINE) === null);

console.log("\n== and the ones that do not ==\n");

// CONFIRMED DOES NOT GO BACK TO DRAFT. Confirming is telling a customer their
// order is accepted; un-telling them is a cancellation, not an edit, and a
// record that can quietly return to Draft is one nobody can audit.
ok("a confirmed order cannot go back to draft",
  O.orderProblem("Confirmed", "Draft", LINE) === "not-allowed");
// TERMINAL MEANS TERMINAL, both ways round.
ok("a fulfilled order cannot be cancelled",
  O.orderProblem("Fulfilled", "Cancelled", LINE) === "not-allowed");
ok("a cancelled order cannot be revived",
  O.orderProblem("Cancelled", "Draft", LINE) === "not-allowed");
ok("...nor fulfilled", O.orderProblem("Cancelled", "Fulfilled", LINE) === "not-allowed");
// DELIVERING SOMETHING NOBODY ACCEPTED IS NOT FULFILMENT.
ok("a draft cannot skip straight to fulfilled",
  O.orderProblem("Draft", "Fulfilled", LINE) === "not-allowed");

console.log("\n== a status the type does not have ==\n");

ok("an unknown destination is refused", O.orderProblem("Draft", "Shipped", LINE) === "status");
ok("...and an unknown origin too", O.orderProblem("Pending", "Confirmed", LINE) === "status");
ok("...and empty is not a status", O.orderProblem("Draft", "", LINE) === "status");

console.log("\n== an order with no lines ==\n");

// THE RULE THE RECORD EXISTS FOR. A confirmed order is a promise to supply
// something; nought lines is a promise to supply nothing, and the total agrees
// — it would read as a real order worth 0.00 rather than as an empty one.
ok("AN EMPTY ORDER CANNOT BE CONFIRMED", O.orderProblem("Draft", "Confirmed", []) === "no-lines");
// ...but it may still be abandoned, which is the common case: somebody opened
// one and thought better of it. Refusing that would strand the record.
ok("...but an empty order may still be cancelled",
  O.orderProblem("Draft", "Cancelled", []) === null);

console.log("\n== what may still be undone ==\n");

// A DRAFT IS A MISTAKE SOMEBODY MAY TAKE BACK; anything further has been told
// to a customer, and what happens next is a state the record HAS.
ok("a draft may be deleted", O.orderDeletable("Draft"));
ok("a confirmed order may not", !O.orderDeletable("Confirmed"));
ok("...nor a fulfilled one", !O.orderDeletable("Fulfilled"));
// CANCELLED IS NOT DELETABLE EITHER, which is the whole point of having it: it
// is the honest exit that keeps the reference spent (invariant 10) and the
// trail readable, and deleting it afterwards would undo both.
ok("...nor a cancelled one", !O.orderDeletable("Cancelled"));

ok("lines are editable only while draft",
  O.orderLinesEditable("Draft") && !O.orderLinesEditable("Confirmed"));

console.log("\n== what the screen is allowed to offer ==\n");

// THE SCREEN DRAWS FROM THIS, so a move it offers and the server refuses would
// be a button that lies. The two are the same table.
ok("a draft offers exactly confirm and cancel",
  O.movesFrom("Draft").join(",") === "Confirmed,Cancelled", O.movesFrom("Draft").join(","));
ok("a confirmed order offers fulfil and cancel",
  O.movesFrom("Confirmed").join(",") === "Fulfilled,Cancelled", O.movesFrom("Confirmed").join(","));
ok("a terminal status offers nothing", O.movesFrom("Fulfilled").length === 0);
ok("...and neither does a status that is not one", O.movesFrom("Nonsense").length === 0);

// EVERY OFFERED MOVE IS A LEGAL MOVE, asserted over the whole table rather than
// case by case — a transition added to one and not the other is the drift this
// catches.
const drift = O.ORDER_STATUSES.filter((from) =>
  O.movesFrom(from).some((to) => O.orderProblem(from, to, LINE) !== null));
ok("nothing the screen offers is refused by the rule behind it",
  drift.length === 0, drift.join(","));

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
