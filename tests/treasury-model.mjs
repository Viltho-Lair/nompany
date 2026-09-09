// POST-DATED CHEQUES, THE CASH-FLOW FORECAST AND LETTERS OF GUARANTEE,
// asserted without a database.
//
// Three things, one question: what is going to happen to the bank balance.
import {
  chequeProblems, cleanCheque, chequeProblem, forecast, shortfall,
  guaranteeProblems, cleanGuarantee, guaranteeState, lockedUp,
  CHEQUE_STATUSES, PENDING,
} from "../src/modules/finance/treasury.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- cheques ----------------------------------------------------------------
const CH = { direction: "in", party: "Acme", number: "004512", amount: 5000, dueOn: "2026-09-30" };
ok("a cheque needs a direction", chequeProblems({ ...CH, direction: "" }).length === 1);
ok("a cheque needs a party", chequeProblems({ ...CH, party: "" }).length === 1);
// A CHEQUE WITHOUT ITS NUMBER cannot be found at the bank, chased, or told
// apart from the next one for the same amount from the same customer.
ok("A CHEQUE NEEDS ITS NUMBER", chequeProblems({ ...CH, number: "" }).length === 1);
ok("a cheque needs a date", chequeProblems({ ...CH, dueOn: "" }).length === 1);
ok("a good cheque passes", chequeProblems(CH).length === 0);
// ALWAYS POSITIVE — the DIRECTION carries the sign, the rule a payslip's
// allowances and deductions already follow.
ok("A NEGATIVE AMOUNT IS REFUSED", chequeProblems({ ...CH, amount: -1 }).length === 1);
ok("...and cleaning takes the absolute value", cleanCheque({ ...CH, amount: 5000 }).amount === 5000);
ok("a new cheque is held", cleanCheque(CH).status === "held");
ok("the five states are the whole ladder",
  CHEQUE_STATUSES.join("|") === "held|deposited|cleared|bounced|returned");
ok("money is still expected while held or deposited", PENDING.join("|") === "held|deposited");

ok("a held cheque is deposited", chequeProblem("held", "deposited") === null);
ok("a deposited cheque clears", chequeProblem("deposited", "cleared") === null);
ok("a deposited cheque can bounce", chequeProblem("deposited", "bounced") === null);
// A DEPOSITED CHEQUE GOES BACK TO HELD when the bank hands it back
// unpresented — not a bounce, and calling it one would mark a customer as
// having failed to pay when nothing was presented.
ok("A DEPOSITED CHEQUE CAN GO BACK TO HELD", chequeProblem("deposited", "held") === null);
ok("a bounced cheque can be redeposited", chequeProblem("bounced", "deposited") === null);
// A CLEARED CHEQUE IS FINISHED: the correction is a new record of what
// happened, not a rewrite of this one.
ok("A CLEARED CHEQUE GOES NOWHERE", chequeProblem("cleared", "bounced") === "transition");
ok("a returned cheque goes nowhere", chequeProblem("returned", "deposited") === "transition");
ok("a held cheque cannot clear without being deposited",
  chequeProblem("held", "cleared") === "transition");

// ---- the forecast -----------------------------------------------------------
const DUES = [
  { date: "2026-08-20", amount: 3000, label: "Overdue invoice", kind: "invoice" },
  { date: "2026-09-02", amount: 1000, label: "Invoice", kind: "invoice" },
  { date: "2026-09-10", amount: -4000, label: "Subcontractor", kind: "bill" },
  { date: "2026-09-18", amount: 500, label: "Cheque", kind: "cheque" },
  { date: "later", amount: 999, label: "Nonsense", kind: "invoice" },
];
const weeks = forecast(2000, DUES, { from: "2026-09-01", buckets: 3, days: 7 });
ok("a bucket per week", weeks.length === 3);
// ANYTHING DATED BEFORE THE START IS IN THE FIRST BUCKET, not dropped: a
// forecast that ignored overdue money would be optimistic by exactly the amount
// a studio is worried about.
ok("OVERDUE MONEY IS COUNTED IN THE FIRST BUCKET", weeks[0].in === 4000, String(weeks[0].in));
ok("the second week's payment is out", weeks[1].out === 4000);
ok("a rubbish date is in no bucket",
  !weeks.some((b) => b.items.some((i) => i.label === "Nonsense")));
// THE CLOSING BALANCE IS CUMULATIVE, which is the point: a week that is net
// positive can still be the week the account goes under.
ok("the closing balance carries forward", weeks[0].closing === 6000);
ok("...and falls with the payment", weeks[1].closing === 2000);
ok("...and rises with the cheque", weeks[2].closing === 2500);

// A WEEK THAT IS NET POSITIVE CAN STILL BE THE WEEK THE ACCOUNT GOES UNDER,
// which is why the closing balance is cumulative and why the shortfall is
// found on it rather than on the net.
const tight = forecast(-500, DUES, { from: "2026-09-01", buckets: 3, days: 7 });
ok("a shortfall is the first bucket that goes under",
  shortfall(tight)?.from === "2026-09-08",
  JSON.stringify(tight.map((b) => b.closing)));
// NULL IS NOT "FINE": it means nothing in the horizon takes the account
// negative, which is a different statement from the business being healthy.
ok("no shortfall in the horizon is null", shortfall(weeks) === null);
ok("a start that is not a date forecasts nothing",
  forecast(1000, DUES, { from: "soon" }).length === 0);

// ---- guarantees -------------------------------------------------------------
const G = {
  reference: "LG-1", beneficiary: "Ministry", kind: "Performance", amount: 50000,
  issuedOn: "2026-01-01", expiresOn: "2026-12-31", margin: 5000,
};
ok("a guarantee needs a reference", guaranteeProblems({ ...G, reference: "" }).length === 1);
ok("a guarantee needs a beneficiary", guaranteeProblems({ ...G, beneficiary: "" }).length === 1);
ok("a guarantee needs an expiry", guaranteeProblems({ ...G, expiresOn: "" }).length === 1);
ok("it cannot expire before it was issued",
  guaranteeProblems({ ...G, expiresOn: "2025-01-01" }).some((p) => /before it was issued/.test(p)));
// A BANK HOLDING MORE THAN THE INSTRUMENT IS WORTH is a typo, and it would
// overstate the cash a studio thinks is locked up.
ok("THE MARGIN CANNOT EXCEED THE GUARANTEE",
  guaranteeProblems({ ...G, margin: 60000 }).some((p) => /cannot exceed/.test(p)));
ok("a good guarantee passes", guaranteeProblems(G).length === 0);

const live = { id: "g1", ...cleanGuarantee(G) };
ok("a guarantee well before expiry is live", guaranteeState(live, "2026-06-01") === "live");
ok("...and expiring inside the window", guaranteeState(live, "2026-12-15") === "expiring");
ok("...and expired after it", guaranteeState(live, "2027-01-01") === "expired");
// `expired` IS NOT `released`, and the difference is money: expiry at the bank
// does not return the margin — somebody has to ask for it back.
ok("A RELEASED GUARANTEE IS NOT MERELY EXPIRED",
  guaranteeState({ ...live, released: true }, "2026-06-01") === "released");

const held = lockedUp([live, { ...live, id: "g2", released: true }, { ...live, id: "g3", expiresOn: "2020-01-01" }]);
ok("what the bank holds counts every unreleased guarantee", held.count === 2);
// AN EXPIRED GUARANTEE STILL COUNTS: dropping it would tell a studio its cash
// was free on the day it stopped being at risk and long before it came back.
ok("AN EXPIRED GUARANTEE IS STILL LOCKED UP", held.margin === 10000, String(held.margin));
ok("...and a released one is not", held.amount === 100000);

console.log(fails ? `\ntreasury model: ${fails} FAILURES\n` : "\ntreasury model: all passed\n");
process.exit(fails ? 1 : 0);
