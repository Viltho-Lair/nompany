// THE TILL'S ARITHMETIC — what a basket comes to, whether it is paid, and what a
// shift took.
//
// THE DEFECTS THESE GUARD: a shelf price that already includes tax must not have
// tax added again (11.50 at 15% is 10.00 + 1.50, never 11.50 + 1.73); a card
// cannot be for more than is due, because only cash gives change; and a drawer
// that is short is reported, never corrected.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const P = await import("@/modules/sales/posModel");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};
const j = (v) => JSON.stringify(v);

const line = (price, count = 1, extra = {}) => ({ itemId: "i", description: "x", packQty: 1, count, price, ...extra });

console.log("\n== a basket's lines");
const cleaned = P.cleanPosLines([
  { itemId: "a", count: "2", price: "1.5", packQty: 0 },
  { itemId: "", count: 1 },
  { itemId: "b", count: 0 },
  { itemId: "c", count: 1, packName: "Box", packQty: 20, taxCategory: "zero" },
]);
ok("a line needs an item and a count", cleaned.length === 2, j(cleaned));
ok("a pack of nought is one unit", cleaned[0].packQty === 1);
ok("the pack and the tax category are kept", cleaned[1].packName === "Box" && cleaned[1].taxCategory === "zero");
ok("a line of three boxes of twenty takes sixty units", P.unitsOf({ count: 3, packQty: 20 }) === 60);

console.log("\n== prices that include tax");
const inc = P.posTotals([line(11.5)], { vatRate: 15, currency: "SAR", pricesIncludeTax: true });
ok("the tax is taken out, not added on", inc.total === 11.5 && inc.vat === 1.5 && inc.subtotal === 10, j(inc));
const incMixed = P.posTotals([line(11.5), line(4, 2, { taxCategory: "zero" })], { vatRate: 15, currency: "SAR", pricesIncludeTax: true });
ok("a zero-rated line carries no tax and still counts", incMixed.total === 19.5 && incMixed.vat === 1.5 && incMixed.subtotal === 18, j(incMixed));
ok("the breakdown adds up to the totals",
  incMixed.breakdown.reduce((s, b) => s + b.taxable, 0) === incMixed.subtotal
  && incMixed.breakdown.reduce((s, b) => s + b.tax, 0) === incMixed.vat);
const jod = P.posTotals([line(1.16, 3)], { vatRate: 16, currency: "JOD", pricesIncludeTax: true, method: "line" });
ok("a dinar till works in fils, per line", jod.total === 3.48 && jod.vat === 0.48 && jod.subtotal === 3, j(jod));
const perDoc = P.posTotals([line(0.05), line(0.05)], { vatRate: 15, currency: "SAR", pricesIncludeTax: true, method: "document" });
const perLine = P.posTotals([line(0.05), line(0.05)], { vatRate: 15, currency: "SAR", pricesIncludeTax: true, method: "line" });
ok("the two methods can differ by a halala, and each keeps the total", perDoc.total === 0.1 && perLine.total === 0.1 && perDoc.vat !== perLine.vat, `${j(perDoc)} ${j(perLine)}`);
ok("no rate means no tax", P.posTotals([line(10)], { vatRate: 0, currency: "SAR", pricesIncludeTax: true }).vat === 0);

console.log("\n== prices tax is added to (a sales tax)");
const exc = P.posTotals([line(10, 2)], { vatRate: 8, currency: "USD", pricesIncludeTax: false });
ok("the tax is added on top", exc.subtotal === 20 && exc.vat === 1.6 && exc.total === 21.6, j(exc));

console.log("\n== is it paid");
const cash = P.cleanPayments([{ method: "cash", amount: "20" }], "SAR");
ok("cash over the total gives change", j(P.settle(11.5, cash, "SAR")) === j({ problem: "", paid: 20, change: 8.5 }));
ok("too little is refused", P.settle(11.5, P.cleanPayments([{ method: "cash", amount: 10 }], "SAR"), "SAR").problem === "underpaid");
ok("a card for more than is due is refused — only cash gives change",
  P.settle(11.5, P.cleanPayments([{ method: "card", amount: 12 }], "SAR"), "SAR").problem === "overpaid-card");
const split = P.settle(11.5, P.cleanPayments([{ method: "card", amount: 10 }, { method: "cash", amount: 5 }], "SAR"), "SAR");
ok("a split payment gives change from its cash", split.problem === "" && split.change === 3.5, j(split));
ok("an unknown method or a nought is dropped",
  P.cleanPayments([{ method: "cheque", amount: 5 }, { method: "cash", amount: 0 }], "SAR").length === 0);
ok("a dinar payment keeps its fils", P.cleanPayments([{ method: "cash", amount: 1.2345 }], "JOD")[0].amount === 1.235);

console.log("\n== what a shift took");
const receipts = [
  { total: 11.5, subtotal: 10, vat: 1.5, change: 8.5, payments: [{ method: "cash", amount: 20 }], breakdown: [{ category: "standard", rate: 15, taxable: 10, tax: 1.5 }] },
  { total: 23, subtotal: 20, vat: 3, change: 0, payments: [{ method: "card", amount: 23 }], breakdown: [{ category: "standard", rate: 15, taxable: 20, tax: 3 }] },
  { total: 99, subtotal: 99, vat: 0, status: "Voided", payments: [{ method: "cash", amount: 99 }] },
];
const r = P.shiftReport(receipts, { openingFloat: 100, countedCash: 110, currency: "SAR" });
ok("two sales, the voided one left out", r.sales === 2 && r.total === 34.5 && r.vat === 4.5, j(r));
ok("takings by method", j(r.byMethod) === j([{ method: "cash", amount: 20 }, { method: "card", amount: 23 }]));
ok("expected cash is float + cash − change", r.cashTaken === 11.5 && r.expectedCash === 111.5);
ok("a short drawer is reported, not corrected", r.countedCash === 110 && r.difference === -1.5);
ok("tax by rate", r.byTax.length === 1 && r.byTax[0].taxable === 30 && r.byTax[0].tax === 4.5);
const open = P.shiftReport(receipts, { openingFloat: 100, currency: "SAR" });
ok("an open shift has no count and no difference", open.countedCash === null && open.difference === null);

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
