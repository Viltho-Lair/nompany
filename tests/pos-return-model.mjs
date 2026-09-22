// A RETURN AT THE COUNTER (modules/sales/posReturnModel).
//
// THE DEFECTS THESE GUARD: a discounted item refunded at its shelf price pays
// the customer the discount back; a line returned in pieces must add up to
// what it was charged, not a cent more or less; a unit waiting in a return not
// yet signed must not be returnable twice; and units must go back to the batch
// they left, never twice to the same one.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
const R = await import("@/modules/sales/posReturnModel");
const P = await import("@/modules/sales/posModel");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};
const j = (v) => JSON.stringify(v);

// A sale of 3 × 10.00 with 10% off the basket, and a zero-rated 1 × 5.00.
const priced = P.priceBasket([
  { itemId: "a", description: "A", count: 3, price: 10 },
  { itemId: "b", description: "B", count: 1, price: 5, taxCategory: "zero" },
], { kind: "percent", value: 10 }, "SAR").lines;
const receipt = {
  id: "r1", currency: "SAR", vatRate: 15, taxMethod: "document", pricesIncludeTax: true,
  lines: [
    { ...priced[0], units: 3, picks: [{ batchId: "early", qty: 2 }, { batchId: "late", qty: 1 }] },
    { ...priced[1], units: 1, picks: [] },
  ],
};

console.log("\n== what is left");
const fresh = R.returnable(receipt, []);
ok("everything is returnable on a fresh sale", fresh[0].remaining === 3 && fresh[1].remaining === 1);
ok("a line's net is what was charged", fresh[0].net === 27, j(fresh[0]));

console.log("\n== the refund is what was paid");
const one = R.planReturn(receipt, [], [{ line: 0, units: 1 }]);
ok("one of three discounted units refunds a third of the net, not the shelf price", one.lines[0].refund === 9, j(one));
const r1 = { status: "Approved", receiptId: "r1", lines: [{ line: 0, units: 1, refund: 9 }] };
const r2 = { status: "Approved", receiptId: "r1", lines: [{ line: 0, units: 1, refund: 9 }] };
const last = R.planReturn(receipt, [r1, r2], [{ line: 0, units: 1 }]);
ok("the last unit takes whatever is left", last.lines[0].refund === 9);
const odd = { ...receipt, lines: [{ itemId: "c", description: "C", count: 3, price: 3.335, net: 10, units: 3 }] };
const a = R.planReturn(odd, [], [{ line: 0, units: 1 }]).lines[0].refund;
const b = R.planReturn(odd, [{ status: "Approved", receiptId: "r1", lines: [{ line: 0, units: 1, refund: a }] }], [{ line: 0, units: 1 }]).lines[0].refund;
const c = R.planReturn(odd, [{ status: "Approved", receiptId: "r1", lines: [{ line: 0, units: 2, refund: a + b }] }], [{ line: 0, units: 1 }]).lines[0].refund;
ok("returned one at a time, a line refunds exactly what it was charged", [a, b, c].join("|") === "3.33|3.33|3.34", [a, b, c].join("|"));

console.log("\n== what cannot be returned");
const pending = { status: "Pending", receiptId: "r1", lines: [{ line: 1, units: 1, refund: 4.5 }] };
ok("a unit waiting for a signature is not returnable again", R.planReturn(receipt, [pending], [{ line: 1, units: 1 }]).error === "too-many");
const rejected = { ...pending, status: "Rejected" };
ok("…and a rejected return frees it", !R.planReturn(receipt, [rejected], [{ line: 1, units: 1 }]).error);
ok("more than was sold is refused", R.planReturn(receipt, [], [{ line: 0, units: 4 }]).error === "too-many");
ok("a line the receipt does not have is refused", R.planReturn(receipt, [], [{ line: 9, units: 1 }]).error === "lines");
ok("nothing at all is refused", R.planReturn(receipt, [], [{ line: 0, units: 0 }]).error === "lines");
ok("another receipt's returns do not count", R.returnable(receipt, [{ ...r1, receiptId: "r2" }])[0].remaining === 3);

console.log("\n== the tax refunded is the sale's");
const t = R.returnTotals(R.planReturn(receipt, [], [{ line: 0, units: 3 }, { line: 1, units: 1 }]).lines, receipt);
const sold = P.posTotals(priced, { vatRate: 15, currency: "SAR", method: "document", pricesIncludeTax: true });
ok("returning everything refunds the sale's total and its tax exactly", t.total === sold.total && t.vat === sold.vat, j([t, sold]));
const excl = { ...receipt, pricesIncludeTax: false };
const te = R.returnTotals([{ line: 0, itemId: "a", description: "A", units: 1, refund: 9 }], excl);
ok("a sale taxed on top refunds the tax on top", te.total === 10.35 && te.vat === 1.35, j(te));

console.log("\n== back to the batch it left");
ok("the last batch taken is filled first", j(R.restockPlan(receipt.lines[0], 0, 1)) === j([{ batchId: "late", qty: 1 }]));
ok("then the earlier one", j(R.restockPlan(receipt.lines[0], 1, 2)) === j([{ batchId: "early", qty: 2 }]));
ok("across both in one return", j(R.restockPlan(receipt.lines[0], 0, 3)) === j([{ batchId: "late", qty: 1 }, { batchId: "early", qty: 2 }]));
ok("a line from no batch goes back to no batch", j(R.restockPlan(receipt.lines[1], 0, 1)) === j([{ batchId: "", qty: 1 }]));

// AN OFFER IS REFUNDED AS IT WAS CHARGED (22/09/2026). A return reads the net
// the sale FROZE onto the line; it never re-runs the offers, so ending one
// tomorrow refunds nothing extra and a free item refunds nothing at all.
console.log("\n== what the shop's offers left on the line");
const offerReceipt = {
  currency: "SAR", vatRate: 15, pricesIncludeTax: true,
  lines: [
    // Two at 10, an offer took 5 off: the line was paid 15.
    { itemId: "p", description: "P", count: 2, price: 10, gross: 20, promotionDiscount: 5, net: 15, units: 2, picks: [] },
    // The free one. It was charged nothing, so it refunds nothing.
    { itemId: "q", description: "Q", count: 1, price: 10, gross: 10, promotionDiscount: 10, net: 0, units: 1, picks: [] },
  ],
};
const half = R.planReturn(offerReceipt, [], [{ line: 0, units: 1 }]).lines[0].refund;
ok("half a discounted line refunds half of what was PAID, not half the shelf price", half === 7.5, String(half));
const rest = R.planReturn(
  offerReceipt,
  [{ status: "Approved", receiptId: "", lines: [{ line: 0, units: 1, refund: half }] }],
  [{ line: 0, units: 1 }],
).lines[0].refund;
ok("…and the other half refunds the rest exactly", rest === 7.5, String(rest));
ok("a free item refunds nothing", R.planReturn(offerReceipt, [], [{ line: 1, units: 1 }]).lines[0].refund === 0);
ok("a free item still goes back to stock", R.planReturn(offerReceipt, [], [{ line: 1, units: 1 }]).lines[0].units === 1);

console.log("\n== the drawer");
const rep = P.shiftReport(
  [{ total: 50, vat: 0, subtotal: 50, payments: [{ method: "cash", amount: 50 }] }],
  { openingFloat: 100, currency: "SAR", refunds: [{ method: "cash", amount: 9 }, { method: "card", amount: 4 }] },
);
ok("cash refunded is not expected in the drawer", rep.expectedCash === 141 && rep.cashRefunded === 9, j(rep));
ok("the report says what was refunded, by method", rep.refunds === 13 && rep.refundsByMethod.length === 2);

console.log(fails ? `\npos return model: ${fails} FAILURES\n` : "\npos return model: all passed\n");
process.exitCode = fails ? 1 : 0;
