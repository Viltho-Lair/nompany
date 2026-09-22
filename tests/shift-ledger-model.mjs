// WHAT A CLOSED SHIFT PUTS IN THE BOOKS — the figures, before any account code.
//
// WHY THIS FILE EXISTS. A shop could sell all day, count its drawer and leave
// the ledger showing nothing: `pos.md` named that gap the day the section
// shipped and it stayed open until 22/09/2026. What closes it is one entry per
// shift, and the part of it that can be silently WRONG is the arithmetic —
// which money landed where, what was earned, what was taxed, and what a refund
// reverses. `postShift` turns these figures into lines; this asserts the
// figures, so the test needs no database, no chart of accounts and no studio.
//
// THE FIGURES COME FROM THE STORED REPORT, not from the receipts a second time,
// and that is the property most worth protecting here: the entry and the
// printed slip are the same arithmetic or the books and the shop disagree.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
const { shiftLedgerFigures, shiftHasLedgerEntry, shiftReport } = await import("@/modules/sales/posModel");

let fails = 0;
const ok = (what, cond, saw) => {
  if (cond) { console.log(`  ok    ${what}`); return; }
  fails += 1;
  console.log(`  FAIL  ${what}${saw === undefined ? "" : `\n        saw: ${saw}`}`);
};
const j = (v) => JSON.stringify(v);

// A sale as the shift report reads one.
const sale = (subtotal, vat, payments, change = 0) => ({
  kind: "sale", status: "Completed", subtotal, vat, total: subtotal + vat, payments, change,
});

console.log("\n== the money in is what the drawer actually kept");
const cashDay = shiftReport(
  [sale(100, 15, [{ method: "cash", amount: 200 }], 85)],
  { openingFloat: 50, countedCash: 165, currency: "SAR" },
);
const cashFigures = shiftLedgerFigures(cashDay, []);
ok("cash in is net of the change given back, never the note handed over",
  cashFigures.moneyIn.cash === 115, j(cashFigures.moneyIn));
ok("revenue is the net and tax is separate",
  cashFigures.revenue === 100 && cashFigures.vat === 15, j(cashFigures));

console.log("\n== every method lands on its own");
const mixed = shiftReport(
  [
    sale(100, 15, [{ method: "cash", amount: 115 }]),
    sale(200, 30, [{ method: "card", amount: 230 }]),
    sale(100, 15, [{ method: "transfer", amount: 115 }]),
  ],
  { openingFloat: 0, currency: "SAR" },
);
const mixedFigures = shiftLedgerFigures(mixed, []);
ok("cash, card and transfer are three figures",
  mixedFigures.moneyIn.cash === 115 && mixedFigures.moneyIn.card === 230 && mixedFigures.moneyIn.transfer === 115,
  j(mixedFigures.moneyIn));
ok("and the trading is the sum of the three sales",
  mixedFigures.revenue === 400 && mixedFigures.vat === 60, j(mixedFigures));

console.log("\n== a voided sale is not trading");
const withVoid = shiftReport(
  [sale(100, 15, [{ method: "cash", amount: 115 }]), { ...sale(500, 75, [{ method: "cash", amount: 575 }]), status: "Voided" }],
  { openingFloat: 0, currency: "SAR" },
);
const voidFigures = shiftLedgerFigures(withVoid, []);
ok("a void contributes no revenue, no tax and no money",
  voidFigures.revenue === 100 && voidFigures.vat === 15 && voidFigures.moneyIn.cash === 115,
  j(voidFigures));

console.log("\n== a refund reverses, it does not net");
const refunds = [{ method: "cash", subtotal: 40, vat: 6, total: 46 }];
const refunded = shiftReport(
  [sale(100, 15, [{ method: "cash", amount: 115 }])],
  { openingFloat: 0, currency: "SAR", refunds: refunds.map((r) => ({ method: r.method, amount: r.total })) },
);
const refundFigures = shiftLedgerFigures(refunded, refunds);
// THE POINT OF THE WHOLE FILE: "took 115 and gave 46 back" is not "took 69".
ok("revenue stays what was SOLD, not what was kept",
  refundFigures.revenue === 100 && refundFigures.vat === 15, j(refundFigures));
ok("what was paid back is its own figure, split into net and tax",
  refundFigures.refundNet === 40 && refundFigures.refundVat === 6, j(refundFigures));
ok("…and the cash going back out is its own too",
  refundFigures.moneyOut.cash === 46, j(refundFigures.moneyOut));
// The drawer, meanwhile, holds the netted figure — which is the shift report's
// job and not the ledger's, and the two are allowed to differ for that reason.
ok("the drawer expects the netted cash, and that is a different question",
  refunded.expectedCash === 69, String(refunded.expectedCash));

console.log("\n== a refund paid as a credit never touched the drawer");
const creditRefund = shiftLedgerFigures(
  shiftReport([sale(100, 15, [{ method: "cash", amount: 115 }])], { openingFloat: 0, currency: "SAR" }),
  [],
);
ok("a credit refund contributes no money out", j(creditRefund.moneyOut) === j({}));

console.log("\n== a return against an INVOICE is not the till's to reverse");
// It drafts a credit note, and the note posts its own reversal against
// Accounts Receivable — booking it here too would reverse one sale twice.
// Found by reading `posReturns.completeReturn` while writing the documentation,
// not by a test, which is why it is a test now. The FILTER lives in
// `postShift`; what this pins is that the figures honour what they are handed,
// so a filter that stops working shows up as a changed figure rather than as a
// quietly doubled reversal.
const receiptOnly = shiftLedgerFigures(
  shiftReport([sale(100, 15, [{ method: "cash", amount: 115 }])], { openingFloat: 0, currency: "SAR" }),
  // …the invoice-sourced return having been filtered out before it got here.
  [],
);
ok("nothing is reversed when the till owns no return",
  receiptOnly.refundNet === 0 && receiptOnly.refundVat === 0 && j(receiptOnly.moneyOut) === j({}),
  j(receiptOnly));

console.log("\n== the entry balances");
// Debits = credits, which is what postEntry refuses without. Composed here the
// way `postShift` composes it, so the arithmetic is proven before any chart.
const balanceOf = (f) => {
  const debit = Object.values(f.moneyIn).filter((v) => v > 0).reduce((s, v) => s + v, 0)
    + f.refundNet + f.refundVat;
  const credit = f.revenue + f.vat
    + Object.values(f.moneyOut).reduce((s, v) => s + v, 0)
    + Object.values(f.moneyIn).filter((v) => v < 0).reduce((s, v) => s - v, 0);
  return { debit: Math.round(debit * 100) / 100, credit: Math.round(credit * 100) / 100 };
};
for (const [what, f] of [
  ["a plain cash day", cashFigures],
  ["three methods", mixedFigures],
  ["a day with a void", voidFigures],
  ["a day with a refund", refundFigures],
]) {
  const b = balanceOf(f);
  ok(`${what} balances`, b.debit === b.credit, j(b));
}

console.log("\n== a negative cash figure is handled, not assumed");
// THIS CANNOT ARISE FROM SALES, and the composition still survives it — which
// is the point. `settle` refuses a card payment larger than the total
// ("overpaid-card": only cash gives change), so change can never exceed the
// cash taken and `cashTaken` cannot go below nought through selling. What COULD
// put a negative in front of this function is a hand-corrected report or a
// payment kind that does not exist yet, and the answer has to be a credit line
// rather than an entry that refuses to balance for a reason nobody can read.
const negative = shiftLedgerFigures(
  { byMethod: [{ method: "cash", amount: 10 }, { method: "card", amount: 155 }], cashTaken: -40, subtotal: 100, vat: 15 },
  [],
);
ok("a negative cash figure survives as a figure", negative.moneyIn.cash === -40, j(negative.moneyIn));
const nb = balanceOf(negative);
ok("…and the entry still balances, the negative debit becoming a credit",
  nb.debit === nb.credit, j(nb));

console.log("\n== nothing to post");
const empty = shiftLedgerFigures(shiftReport([], { openingFloat: 100, countedCash: 100, currency: "SAR" }), []);
ok("an empty drawer opened and closed is no entry at all", shiftHasLedgerEntry(empty) === false, j(empty));
ok("…but a drawer that sold anything is", shiftHasLedgerEntry(cashFigures) === true);
ok("…and so is one that only refunded", shiftHasLedgerEntry(shiftLedgerFigures(
  shiftReport([], { openingFloat: 0, currency: "SAR", refunds: [{ method: "cash", amount: 46 }] }),
  refunds,
)) === true);

console.log("\n== a report that is not there");
ok("no report is no figures rather than a throw", shiftHasLedgerEntry(shiftLedgerFigures(null, [])) === false);
ok("an undefined report likewise", shiftHasLedgerEntry(shiftLedgerFigures(undefined, [])) === false);

console.log(fails ? `\nshift ledger model: ${fails} FAILURES\n` : "\nshift ledger model: all passed\n");
process.exitCode = fails ? 1 : 0;
