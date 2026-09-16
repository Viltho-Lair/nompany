// MONEY FOLLOWS ITS CURRENCY — the rounding rule, and the one total every
// priced document uses.
//
// THE DEFECT THIS GUARDS: money was rounded everywhere to two places, so a
// Jordanian studio's quotations, invoices and ledger dropped the third decimal
// of every dinar (1.235 JOD became 1.24). And the total was computed twice —
// once for quotations and sales orders, once for invoices and bills — which
// holds only until one of the two learns a rule the other does not.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const M = await import("@/shared/money");
const { documentTotals } = await import("@/shared/documentTotals");
const V = await import("@/shared/vat");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== which currencies have which decimals");
ok("the dinars and the Omani rial have three",
  ["JOD", "KWD", "BHD", "OMR", "IQD", "LYD", "TND"].every((c) => M.currencyDecimals(c) === 3));
ok("the Saudi riyal, the dirham and the pound have two",
  ["SAR", "AED", "EGP", "USD", "EUR", "QAR"].every((c) => M.currencyDecimals(c) === 2));
ok("the yen and the won have none", M.currencyDecimals("JPY") === 0 && M.currencyDecimals("KRW") === 0);
ok("case does not matter", M.currencyDecimals("jod") === 3);
ok("no currency is two — every studio before it set one", M.currencyDecimals("") === 2 && M.currencyDecimals(undefined) === 2);

console.log("\n== rounding");
ok("a dinar keeps its third decimal", M.roundMoney(1.2345, "JOD") === 1.235, String(M.roundMoney(1.2345, "JOD")));
ok("a riyal is cut to two", M.roundMoney(1.2345, "SAR") === 1.23);
ok("a yen is whole", M.roundMoney(1234.5, "JPY") === 1235);
ok("1.005 is 1.01, not the float's 1.00", M.roundMoney(1.005, "SAR") === 1.01);
ok("a negative rounds away from nought, like the positive", M.roundMoney(-1.005, "SAR") === -1.01);
ok("a decimals count works as well as a code", M.roundMoney(1.23456, 3) === 1.235);
ok("nonsense is nought, never NaN", M.roundMoney("abc", "JOD") === 0 && M.roundMoney(undefined) === 0);

console.log("\n== whole minor units, which is how the ledger balances");
ok("1.235 JOD is 1235 fils", M.toMinor(1.235, "JOD") === 1235);
ok("1.23 SAR is 123 halalas", M.toMinor(1.23, "SAR") === 123);
ok("and back again", M.fromMinor(1235, "JOD") === 1.235 && M.fromMinor(123, "SAR") === 1.23);
ok("three postings of 0.001 JOD balance one of 0.003",
  M.toMinor(0.001, "JOD") * 3 === M.toMinor(0.003, "JOD"));

console.log("\n== a sum of rounded amounts loses only float noise");
ok("0.1 + 0.2 is 0.3", M.roundSum(0.1 + 0.2) === 0.3);
ok("a dinar total keeps its fils", M.roundSum(1.235 + 2.001) === 3.236);

console.log("\n== what a screen shows");
ok("a dinar shows three places", M.moneyText(1.2, "JOD") === "1.200");
ok("a riyal shows two", M.moneyText(1.2, "SAR") === "1.20");
ok("no currency: two, or three when there is a third", M.moneyText(1.2) === "1.20" && M.moneyText(1.235) === "1.235");

console.log("\n== one total for every priced document");
const jod = documentTotals({ lines: [{ qty: 3, unitPrice: 1.2345 }], vatRate: 16, currency: "JOD" });
ok("a dinar quotation totals in fils", jod.subtotal === 3.704 && jod.vat === 0.593 && jod.total === 4.297, JSON.stringify(jod));
const sar = documentTotals({ lines: [{ qty: 3, unitPrice: 1.2345 }], vatRate: 15, currency: "SAR" });
ok("the same lines in riyal total in halalas", sar.subtotal === 3.7 && sar.vat === 0.56 && sar.total === 4.26, JSON.stringify(sar));
ok("the three figures always add up", jod.subtotal + jod.vat === jod.total || M.roundSum(jod.subtotal + jod.vat) === jod.total);
const blank = documentTotals({ lines: [{ qty: "", unitPrice: null }, { qty: 2, unitPrice: 5 }], vatRate: "" });
ok("a blank line contributes nothing and a blank rate is no tax", blank.subtotal === 10 && blank.vat === 0 && blank.total === 10);
ok("no lines is nought, not an error", documentTotals({}).total === 0);

console.log("\n== the VAT split back out of a gross amount");
const split = V.splitGross(11.6, 16, "JOD");
ok("a dinar gross splits in fils and the parts add up",
  split.vat === 1.6 && split.net === 10 && M.roundSum(split.net + split.vat) === 11.6, JSON.stringify(split));
const odd = V.splitGross(1.001, 16, "JOD");
ok("…including a gross whose tax has a third decimal", odd.vat === 0.138 && odd.net === 0.863, JSON.stringify(odd));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
