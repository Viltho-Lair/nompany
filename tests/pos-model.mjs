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

const line = (price, count = 1, extra = {}) => ({ itemId: "i", description: "x", count, price, ...extra });

console.log("\n== a basket's lines");
const cleaned = P.cleanPosLines([
  { itemId: "a", count: "2", price: "1.5" },
  { itemId: "", count: 1 },
  { itemId: "b", count: 0 },
  { itemId: "c", count: 1, packName: "Box", packQty: 20, taxCategory: "zero" },
]);
ok("a line needs an item and a count", cleaned.length === 2, j(cleaned));
// PACKS WERE REMOVED (17/09/2026): a line is a count of the item's own unit,
// and whatever a stale screen still sends about a pack is dropped.
ok("a pack sent by an old screen is dropped", !("packName" in cleaned[1]) && !("packQty" in cleaned[1]));
ok("the tax category is kept", cleaned[1].taxCategory === "zero");
ok("a line takes its count in units, whatever a pack once said", P.unitsOf({ count: 3, packQty: 20 }) === 3);

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

// ---- the department's reports (17/09/2026) ----------------------------------
//
// THE DEFECTS THESE GUARD: a period is the READER's (a sale at 23:59 local time
// is today's, whatever UTC says); a period's end is exclusive, so midnight is
// never counted twice; a download and the list answer the same filter; and a
// typed item name cannot run as a formula in the spreadsheet it lands in.
const R = await import("@/modules/sales/posReports");

console.log("\n== periods, in the reader's own time");
const at = new Date(2026, 8, 17, 14, 30); // Thu 17 Sep 2026, local
const local = (iso) => { const d = new Date(iso); return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]; };
ok("today runs from local midnight to the next", j(local(R.periodRange("day", at).from)) === j([2026, 9, 17, 0])
  && j(local(R.periodRange("day", at).to)) === j([2026, 9, 18, 0]));
ok("yesterday is one step back", j(local(R.periodRange("day", at, -1).from)) === j([2026, 9, 16, 0]));
ok("a week starts on Sunday by default", j(local(R.periodRange("week", at).from)) === j([2026, 9, 13, 0])
  && j(local(R.periodRange("week", at).to)) === j([2026, 9, 20, 0]));
ok("...or on the day the studio chooses", j(local(R.periodRange("week", at, 0, 6).from)) === j([2026, 9, 12, 0]));
ok("a month", j(local(R.periodRange("month", at).from)) === j([2026, 9, 1, 0]) && j(local(R.periodRange("month", at).to)) === j([2026, 10, 1, 0]));
ok("a quarter", j(local(R.periodRange("quarter", at).from)) === j([2026, 7, 1, 0]) && j(local(R.periodRange("quarter", at).to)) === j([2026, 10, 1, 0]));
ok("the quarter before crosses nothing oddly", j(local(R.periodRange("quarter", at, -1).from)) === j([2026, 4, 1, 0]));
ok("a half-year", j(local(R.periodRange("half", at).from)) === j([2026, 7, 1, 0]) && j(local(R.periodRange("half", at).to)) === j([2027, 1, 1, 0]));
ok("a year", j(local(R.periodRange("year", at).from)) === j([2026, 1, 1, 0]) && j(local(R.periodRange("year", at, -1).to)) === j([2026, 1, 1, 0]));
ok("the six periods are the owner's six", j(R.PERIODS) === j(["day", "week", "month", "quarter", "half", "year"]));

console.log("\n== filtering");
const sale = (id, atISO, extra = {}) => ({
  id, number: `RCT-${id}`, at: atISO, terminalId: "t1", shiftId: "s1", cashierCollaboratorId: "c1",
  total: 10, subtotal: 8.7, vat: 1.3, lines: [{ itemId: "milk", description: "Milk", count: 2, price: 5, units: 2 }],
  payments: [{ method: "cash", amount: 10 }], ...extra,
});
const day = R.periodRange("day", at);
const inside = new Date(2026, 8, 17, 23, 59, 59).toISOString();
const midnight = new Date(2026, 8, 18, 0, 0, 0).toISOString();
const salesRows = [
  sale("1", inside),
  sale("2", midnight),
  sale("3", new Date(2026, 8, 17, 9).toISOString(), {
    terminalId: "t2", cashierCollaboratorId: "c2",
    lines: [{ itemId: "bread", description: "Bread", count: 1, price: 3, units: 1 }, { itemId: "milk", description: "Milk", count: 1, price: 5, units: 1 }],
    payments: [{ method: "card", amount: 8 }], total: 8,
  }),
  sale("4", new Date(2026, 8, 17, 10).toISOString(), { status: "Voided" }),
];
const today = R.filterReceipts(salesRows, R.cleanSalesFilter({ from: day.from, to: day.to }));
ok("23:59:59 is today and midnight is tomorrow", today.some((r) => r.id === "1") && !today.some((r) => r.id === "2"));
ok("a voided sale is never listed", !today.some((r) => r.id === "4"));
ok("newest first", today[0].id === "1");
ok("by cashier", j(R.filterReceipts(salesRows, { ...day, cashierIds: ["c2"] }).map((r) => r.id)) === j(["3"]));
ok("by till", j(R.filterReceipts(salesRows, { ...day, terminalIds: ["t2"] }).map((r) => r.id)) === j(["3"]));
ok("by how it was paid", j(R.filterReceipts(salesRows, { ...day, methods: ["card"] }).map((r) => r.id)) === j(["3"]));
ok("by chosen receipts", j(R.filterReceipts(salesRows, { receiptIds: ["1", "3"] }).map((r) => r.id).sort()) === j(["1", "3"]));
ok("search finds an item on a receipt", j(R.filterReceipts(salesRows, { ...day, q: "bread" }).map((r) => r.id)) === j(["3"]));
ok("...and a receipt number", j(R.filterReceipts(salesRows, { q: "rct-2" }).map((r) => r.id)) === j(["2"]));
const fromQuery = R.cleanSalesFilter(new URLSearchParams("from=nonsense&methods=cash,bitcoin&cashierIds=c1,c2"));
ok("a filter from a query string drops what it cannot read",
  fromQuery.from === "" && j(fromQuery.methods) === j(["cash"]) && j(fromQuery.cashierIds) === j(["c1", "c2"]));

console.log("\n== totals and what sold");
const t = R.salesTotals(today);
ok("totals are for what the filter kept", t.sales === 2 && t.total === 18 && t.items === 4, j(t));
ok("...with the average sale", t.average === 9);
ok("...and takings by method", j(t.byMethod) === j([{ method: "cash", amount: 10 }, { method: "card", amount: 8 }]));
const sold = R.itemsSold(today, { milk: "Fresh milk" });
ok("items sold, most units first", sold[0].itemId === "milk" && sold[0].units === 3 && sold[1].itemId === "bread", j(sold));
ok("...valued at the shelf price", sold[0].value === 15);
ok("...counting each receipt once", sold[0].receipts === 2);
ok("...by the name the item has today", sold[0].name === "Fresh milk");
ok("...and the printed name for an item since deleted", sold[1].name === "Bread");
const lines = R.soldLines(today, { cashiers: { c1: "Sara" }, tills: { t1: "Front" } });
ok("every line, with who sold it and where", lines.length === 3 && lines[0].cashier === "Sara" && lines[0].till === "Front");

console.log("\n== the download");
const csv = R.toCsvFile(["Item", "Units"], [["=HYPERLINK(\"x\")", 2], ["Milk, fresh", -1], ["-5", 1]]);
ok("a time is written as the reader's clock showed it",
  R.localStamp("2026-09-17T11:58:48.629Z", -180) === "2026-09-17 14:58" && R.localStamp("2026-09-17T23:30:00Z", -180) === "2026-09-18 02:30");
ok("...and an unreadable one is blank", R.localStamp("nope") === "");
ok("it starts with the mark Excel needs for Arabic", csv.charCodeAt(0) === 0xfeff);
ok("a formula-looking name is made text", csv.includes("'=HYPERLINK"));
ok("a comma is quoted", csv.includes("\"Milk, fresh\""));
ok("a negative number stays a number", csv.includes("\r\n-5,1"));

console.log("\n== discounts at the till (the owner, 18/09/2026)");
// THE DEFECTS THESE GUARD: a basket discount kept only as a basket figure
// cannot be taxed per rate or refunded per line — return one of two items and
// the refund either pays the whole discount back or none of it; and a cap
// checked on the discount box alone is walked round by typing a lower price.
ok("a discount needs a known kind and a positive value",
  P.cleanDiscount({ kind: "percent", value: 0 }) === null && P.cleanDiscount({ kind: "x", value: 5 }) === null
  && P.cleanDiscount({ kind: "percent", value: 150 }).value === 100);
const lp = P.priceBasket([line(10, 2, { discount: { kind: "percent", value: 10 } })], null, "SAR");
ok("a line's percentage comes off its own gross", lp.lines[0].gross === 20 && lp.lines[0].lineDiscount === 2 && lp.lines[0].net === 18, j(lp.lines[0]));
const la = P.priceBasket([line(5, 1, { discount: { kind: "amount", value: 9 } })], null, "SAR");
ok("an amount never takes a line below nought", la.lines[0].net === 0 && la.lines[0].lineDiscount === 5, j(la.lines[0]));
const bs = P.priceBasket([line(10), line(20), line(30)], { kind: "amount", value: 10 }, "SAR");
ok("a basket discount is spread by what each line came to",
  bs.lines.map((l) => l.basketShare).join("|") === "1.67|3.33|5", j(bs.lines.map((l) => l.basketShare)));
ok("…and the shares add up to it exactly", bs.basketDiscount === 10
  && Math.round(bs.lines.reduce((s, l) => s + l.basketShare, 0) * 100) / 100 === 10);
ok("each line stores what it was paid", bs.lines.map((l) => l.net).join("|") === "8.33|16.67|25");
const omr = P.priceBasket([line(1, 1), line(1, 1), line(1, 1)], { kind: "amount", value: 1 }, "OMR");
ok("three decimals for a three-decimal currency, remainder on the last line",
  omr.lines.map((l) => l.basketShare).join("|") === "0.333|0.333|0.334", j(omr.lines.map((l) => l.basketShare)));
const both = P.priceBasket([line(100, 1, { discount: { kind: "percent", value: 10 } }), line(100)], { kind: "percent", value: 10 }, "SAR");
ok("a basket percentage is of what is left after the lines' own",
  both.basketDiscount === 19 && both.discountTotal === 29, j(both));
const taxed = P.posTotals(P.priceBasket([line(115)], { kind: "amount", value: 23 }, "SAR").lines,
  { vatRate: 15, currency: "SAR", pricesIncludeTax: true });
ok("the tax comes out of what was charged, not the shelf price", taxed.total === 92 && taxed.vat === 12 && taxed.subtotal === 80, j(taxed));
const mixed = P.posTotals(P.priceBasket([line(115), line(100, 1, { taxCategory: "zero" })], { kind: "percent", value: 10 }, "SAR").lines,
  { vatRate: 15, currency: "SAR", pricesIncludeTax: true });
ok("each rate's taxable amount falls by its own share", mixed.total === 193.5
  && mixed.breakdown.find((b) => b.rate === 15).tax === 13.5 && mixed.breakdown.find((b) => b.rate === 0).taxable === 90, j(mixed));
const plain = [line(3.335, 3), line(1.2)];
ok("an undiscounted basket totals exactly as before",
  j(P.posTotals(plain, { vatRate: 15, currency: "SAR", pricesIncludeTax: true }))
  === j(P.posTotals(P.priceBasket(plain, null, "SAR").lines, { vatRate: 15, currency: "SAR", pricesIncludeTax: true })));
const typed = P.priceBasket([line(8, 1, { listPrice: 10 })], null, "SAR").lines[0];
ok("a typed lower price counts against the cap", P.discountPercentOf(typed, "SAR") === 20);
const stacked = P.priceBasket([line(10, 1, { discount: { kind: "percent", value: 10 } })], { kind: "percent", value: 10 }, "SAR").lines[0];
ok("a line's discount and its basket share count together", P.discountPercentOf(stacked, "SAR") === 19);
const zrep = P.shiftReport([{ total: 9, vat: 0, subtotal: 9, discountTotal: 1, payments: [{ method: "cash", amount: 9 }] }, { total: 5, vat: 0, subtotal: 5, payments: [] }],
  { openingFloat: 0, currency: "SAR" });
ok("the shift report says what was given away", zrep.discounts === 1, j(zrep));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
