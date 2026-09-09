// WITHHOLDING TAX, asserted without a database.
//
// VAT is added and withholding is deducted, and the assertions here are all
// about keeping those two apart — because modelling one as the other produces
// an invoice for the wrong amount and a receivable that never clears.
import {
  withholdingProblems, cleanWithholding, withholdingOn, settledWith, unclaimed,
} from "../src/modules/finance/withholding.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- the rule ---------------------------------------------------------------
ok("a rule needs a name", withholdingProblems({ rate: 5 }).length === 1);
// A RATE OF NOUGHT IS NOT A RULE: it withholds nothing, and a studio with one
// learns to ignore a column of 0.00, which is the state this exists to end.
ok("A RATE OF NOUGHT IS REFUSED", withholdingProblems({ label: "WHT", rate: 0 }).length === 1);
// A TYPO OF 50 FOR 5 is the shape this catches; no jurisdiction withholds all
// of it.
ok("a rate of 100 or more is refused", withholdingProblems({ label: "WHT", rate: 100 }).length === 1);
ok("a negative threshold is refused",
  withholdingProblems({ label: "WHT", rate: 5, threshold: -1 }).length === 1);
ok("a good rule passes", withholdingProblems({ label: "Contractor", rate: 5, threshold: 1000 }).length === 0);
ok("cleaning caps the rate below 100", cleanWithholding({ label: "x", rate: 999 }).rate === 99.99);

const RULE = { label: "Contractor", rate: 5, threshold: 1000 };

// ---- what is withheld -------------------------------------------------------
// THE BASE IS THE SUBTOTAL, NEVER THE VAT-INCLUSIVE TOTAL. Taxing the tax is
// the commonest way to be wrong by exactly the VAT rate.
const big = withholdingOn(RULE, { subtotal: 10000, total: 11600 });
ok("THE BASE IS THE SUBTOTAL, NOT THE TOTAL", big.base === 10000);
ok("...so the amount is the rate on the subtotal", big.amount === 500, String(big.amount));
// THE INVOICE IS STILL WORTH WHAT IT SAYS; what changes is the cash expected.
ok("the net payable is the total less the withholding", big.netPayable === 11100);
ok("it applies", big.applies === true);

// BELOW THE THRESHOLD NOTHING IS WITHHELD, and `applies` says so rather than
// returning nought: "did not apply" and "applied and produced nothing" are
// different facts, and a reader shown 0.00 cannot tell which.
const small = withholdingOn(RULE, { subtotal: 900, total: 1044 });
ok("BELOW THE THRESHOLD IT DOES NOT APPLY", small.applies === false);
ok("...and withholds nothing", small.amount === 0);
ok("...and the whole total is payable", small.netPayable === 1044);

// THE THRESHOLD IS TESTED ON THE BASE: a rule above 1,000 catching a 900
// invoice with 100 of VAT would be the authority's money crossing the studio's
// own threshold.
const justUnder = withholdingOn(RULE, { subtotal: 950, total: 1102 });
ok("VAT DOES NOT PUSH A DOCUMENT OVER THE THRESHOLD", justUnder.applies === false);
ok("exactly at the threshold it applies", withholdingOn(RULE, { subtotal: 1000, total: 1160 }).applies);

ok("no rule means nothing is withheld",
  withholdingOn(null, { subtotal: 10000, total: 11600 }).applies === false);
ok("...and the whole total is payable",
  withholdingOn(null, { subtotal: 10000, total: 11600 }).netPayable === 11600);

// ---- when it is settled -----------------------------------------------------
// A CLIENT WHO WITHHOLDS PAYS LESS AND STILL OWES NOTHING. Judging against the
// gross leaves every withheld invoice permanently short by the tax, chased for
// money the client is legally required not to send.
const paidNet = settledWith({ total: 11600, paid: 11100 }, big);
ok("THE CLIENT WHO PAID THE NET OWES NOTHING", paidNet.settled === true);
ok("...and nothing is outstanding", paidNet.outstanding === 0);
ok("the expected figure is the net, not the total", paidNet.expected === 11100);
const paidNothing = settledWith({ total: 11600, paid: 0 }, big);
ok("nothing paid is the net outstanding", paidNothing.outstanding === 11100);
// WITHOUT WITHHOLDING the comparison is against the gross, unchanged.
ok("an ordinary invoice is judged against its total",
  settledWith({ total: 1044, paid: 1044 }, small).settled === true);
ok("...and is short until it is paid in full",
  settledWith({ total: 1044, paid: 1000 }, small).outstanding === 44);
// A DOCUMENT WORTH NOTHING IS NOT SETTLED — the guard `paymentStatus` carries.
ok("a document worth nothing is not settled",
  settledWith({ total: 0, paid: 0 }, withholdingOn(null, { subtotal: 0, total: 0 })).settled === false);

// ---- what to chase ----------------------------------------------------------
// THE CERTIFICATE IS THE ASSET, not the deduction: 500 withheld is only worth
// 500 if the studio can prove it was paid over.
const docs = [
  { document: { id: "a", reference: "INV-1" }, withheld: big },
  { document: { id: "b", reference: "INV-2" }, withheld: big, certificateRef: "CERT-9" },
  { document: { id: "c", reference: "INV-3" }, withheld: small },
];
const chase = unclaimed(docs);
ok("a withheld document with no certificate is chased", chase.length === 1 && chase[0].id === "a");
ok("one with a certificate is not", !chase.some((d) => d.id === "b"));
ok("one where nothing was withheld is not", !chase.some((d) => d.id === "c"));
ok("the biggest comes first", chase[0].amount === 500);

console.log(fails ? `\nwithholding model: ${fails} FAILURES\n` : "\nwithholding model: all passed\n");
process.exit(fails ? 1 : 0);
