// THE PAYMENT HOLD, asserted without a database.
//
// A policy over two answers — `threeWayMatch`'s and `supplierQualification`'s —
// so every case here is those two answers in plain objects. What matters most
// is what it must NEVER do: hold a studio that has not switched it on, hold a
// bill for want of a purchase order it never needed, or let one person both
// release a payment and make it.
import {
  paymentHold, holdProblems, cleanHold, readHold, releaseProblem, payProblem,
  DEFAULT_HOLD, HOLD_MODES,
} from "../src/modules/finance/hold.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const block = { mode: "block", tolerancePct: 0, toleranceAmount: 0 };
const warn = { ...block, mode: "warn" };
const off = { ...block, mode: "off" };
const lapsed = { usable: false, reason: "document-expired" };
const suspended = { usable: false, reason: "suspended" };
const rejected = { usable: false, reason: "rejected" };
const unassessed = { usable: true, reason: "never-assessed" };
const matched = { flags: [], variance: 0, receivedValue: 1000 };
const over = (variance, receivedValue = 1000) => ({ flags: ["over-billed"], variance, receivedValue });
const nothingArrived = { flags: ["over-billed", "billed-not-received"], variance: 500, receivedValue: 0 };
const po = { orderId: "ord_1" };
const noPo = { orderId: "" };

console.log("\n== off is the default, and off holds nothing");
ok("the default is off", DEFAULT_HOLD.mode === "off");
ok("a studio that never set one reads as off", readHold(null).mode === "off" && readHold({ settings: {} }).mode === "off");
ok("the three modes are the whole list", HOLD_MODES.join("|") === "off|warn|block");
{
  const h = paymentHold({ bill: po, qualification: lapsed, match: over(900), settings: off });
  ok("OFF HOLDS NOTHING, however bad the bill", h.reasons.length === 0 && !h.held, JSON.stringify(h.reasons));
}

console.log("\n== the supplier");
{
  const h = paymentHold({ bill: po, qualification: lapsed, match: matched, settings: block });
  // INVENTORY'S REFUSAL, VERBATIM: createOrder answers `supplier-${reason}`.
  ok("a lapsed document holds, in Inventory's own words", h.reasons.join() === "supplier-document-expired", h.reasons.join());
  ok("...and block refuses the payment", h.held && payProblem(h, "c_payer") === "held");
}
ok("a suspended supplier holds", paymentHold({ bill: po, qualification: suspended, match: null, settings: block }).reasons.join() === "supplier-suspended");
ok("a rejected supplier holds", paymentHold({ bill: po, qualification: rejected, match: null, settings: block }).reasons.join() === "supplier-rejected");
// AN UNASSESSED SUPPLIER IS USABLE — a studio that never opened the register
// is held over nothing.
ok("AN UNASSESSED SUPPLIER IS NOT HELD", paymentHold({ bill: po, qualification: unassessed, match: matched, settings: block }).reasons.length === 0);
// THE CHANGE FROM THE PLAN: a subcontractor's bill has no purchase order, and
// the supplier check must still reach it.
{
  const h = paymentHold({ bill: noPo, qualification: lapsed, match: null, settings: block });
  ok("A BILL WITH NO PURCHASE ORDER IS STILL CHECKED AGAINST ITS SUPPLIER", h.held && h.reasons.join() === "supplier-document-expired");
}
ok("a bill naming no known supplier is not held over it", paymentHold({ bill: noPo, qualification: null, match: null, settings: block }).reasons.length === 0);

console.log("\n== the match");
// THREE-WAY MATCHING NEEDS THREE DOCUMENTS: rent has one.
ok("A BILL WITH NO ORDER IS NEVER MATCH-HELD", paymentHold({ bill: noPo, qualification: null, match: over(900), settings: block }).reasons.length === 0);
{
  const h = paymentHold({ bill: po, qualification: null, match: over(50), settings: block });
  ok("over-billing past a zero tolerance holds", h.reasons.join() === "match-over-billed" && h.variance === 50 && h.allowed === 0);
}
ok("billing for nothing received holds", paymentHold({ bill: po, qualification: null, match: nothingArrived, settings: block }).reasons.join() === "match-billed-not-received");
ok("...AND NO TOLERANCE EXCUSES IT", paymentHold({ bill: po, qualification: null, match: nothingArrived,
  settings: { mode: "block", tolerancePct: 100, toleranceAmount: 100000 } }).reasons.join() === "match-billed-not-received");
ok("under-billing is not held", paymentHold({ bill: po, qualification: null, match: { flags: [], variance: -40, receivedValue: 1000 }, settings: block }).reasons.length === 0);
ok("a match that agrees is not held", paymentHold({ bill: po, qualification: null, match: matched, settings: block }).reasons.length === 0);

console.log("\n== the tolerance is two dials, and the greater one applies");
const t = (pct, amt, variance, received = 1000) =>
  paymentHold({ bill: po, qualification: null, match: over(variance, received), settings: { mode: "block", tolerancePct: pct, toleranceAmount: amt } });
ok("inside the percentage passes", !t(1, 0, 8).held, "1% of 1000 allows 10");
ok("past the percentage holds", t(1, 0, 12).held);
ok("inside the amount passes", !t(0, 20, 15).held);
ok("past the amount holds", t(0, 3, 5).held);
// THE GREATER OF THE TWO: 1% of 1000 is 10, the floor is 20, so 15 passes.
ok("THE GREATER DIAL WINS", !t(1, 20, 15).held && t(1, 20, 15).allowed === 20);
ok("...on a large order the percentage is the greater", t(1, 20, 150, 50000).allowed === 500 && !t(1, 20, 150, 50000).held);

console.log("\n== warn shows, block refuses");
{
  const h = paymentHold({ bill: po, qualification: lapsed, match: over(50), settings: warn });
  ok("warn lists every reason", h.reasons.length === 2, h.reasons.join());
  ok("...AND REFUSES NOTHING", !h.held && payProblem(h, "c_payer") === null);
  ok("...and has nothing to release", releaseProblem(h, "because") === "not-held");
}

console.log("\n== releasing is a reason, its own right, and not the payer's");
{
  const held = paymentHold({ bill: po, qualification: null, match: over(50), settings: block });
  ok("a held payment needs a reason to release", releaseProblem(held, "   ") === "reason");
  ok("...and with one it may be released", releaseProblem(held, "Credit note promised") === null);
  ok("a bill with nothing against it cannot be released", releaseProblem(paymentHold({ bill: po, qualification: null, match: matched, settings: block }), "x") === "not-held");

  const bill = { ...po, holdRelease: { byCollaboratorId: "c_head", reason: "Credit note promised", at: "2026-09-10", reasons: ["match-over-billed"] } };
  const after = paymentHold({ bill, qualification: null, match: over(50), settings: block });
  ok("a release covering every reason lifts the hold", after.released && !after.held);
  ok("...and cannot be given twice", releaseProblem(after, "again") === "already-released");
  // TWO SIGNATURES, TWO PEOPLE.
  ok("THE RELEASER MAY NOT MAKE THE PAYMENT", payProblem(after, "c_head") === "released-by-payer");
  ok("...somebody else may", payProblem(after, "c_payer") === null);

  // A RELEASE COVERS WHAT IT WAS GIVEN FOR: the supplier lapsing afterwards is
  // a new reason nobody signed for.
  const lapsedSince = paymentHold({ bill, qualification: lapsed, match: over(50), settings: block });
  ok("A NEW REASON AFTER A RELEASE HOLDS AGAIN", lapsedSince.held && !lapsedSince.released, lapsedSince.reasons.join());
}

console.log("\n== the setting");
ok("a good setting has no problems", holdProblems({ mode: "warn", tolerancePct: 2, toleranceAmount: 5 }).length === 0);
ok("an unknown mode is named", holdProblems({ mode: "sometimes" }).some((p) => /one of off, warn, block/.test(p)));
ok("a percentage past 100 is named", holdProblems({ mode: "block", tolerancePct: 150 }).some((p) => /between 0 and 100/.test(p)));
ok("a negative amount is named", holdProblems({ mode: "block", toleranceAmount: -1 }).some((p) => /cannot be negative/.test(p)));
ok("blank tolerances read as nought, not as refusals", holdProblems({ mode: "off", tolerancePct: "", toleranceAmount: "" }).length === 0);
ok("cleaning keeps a good setting", JSON.stringify(cleanHold({ mode: "block", tolerancePct: "2.5", toleranceAmount: "10" })) === JSON.stringify({ mode: "block", tolerancePct: 2.5, toleranceAmount: 10 }));
ok("...and falls to off on nonsense", cleanHold({ mode: "nope", tolerancePct: -3 }).mode === "off" && cleanHold({ tolerancePct: -3 }).tolerancePct === 0);

console.log(fails ? `\nhold model: ${fails} FAILURES\n` : "\nhold model: all passed\n");
process.exit(fails ? 1 : 0);
