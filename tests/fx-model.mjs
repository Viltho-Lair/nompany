// A FOREIGN-CURRENCY BILL IN A STUDIO-CURRENCY BOOK, asserted without a database.
//
// THE DEFECT: a bill in dollars posted its dollars straight into a book kept in
// dinars, and the trial balance still balanced — every entry balanced in its own
// wrong unit, so nothing anywhere could see it. These are the rules that replace
// it: convert at a rate frozen on the bill, pay at the day's rate, and put the
// gap on Exchange Differences rather than leaving it on the payable.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { isForeign, cleanRate, rateFor, inBase, settlePayment } = await import("../src/modules/finance/fx.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- is it foreign at all ---------------------------------------------------
ok("the studio's own currency is not foreign", !isForeign("JOD", "JOD"));
ok("...nor is a bill that names no currency", !isForeign("", "JOD"));
ok("...and case does not make it foreign", !isForeign("jod", "JOD"));
ok("a dollar bill in a dinar book is", isForeign("USD", "JOD"));

// ---- the rate ---------------------------------------------------------------
ok("a rate of nought is not a rate", cleanRate(0) === null);
ok("a negative rate is not a rate", cleanRate(-1) === null);
ok("a million is an amount typed into the rate box", cleanRate(1_000_000) === null);
ok("a real rate is kept", cleanRate("0.709") === 0.709);

const table = { USD: 1, JOD: 0.709, EUR: 0.92 };
ok("a home bill is at 1 and reads nothing", rateFor(null, null, "JOD", "JOD") === 1);
ok("A TYPED RATE WINS over the market", rateFor(0.71, table, "USD", "JOD") === 0.71);
ok("without one, the market table answers", Math.abs(rateFor(null, table, "USD", "JOD") - 0.709) < 1e-12);
ok("a cross pair goes through the table's base", Math.abs(rateFor(null, table, "EUR", "JOD") - 0.709 / 0.92) < 1e-12);
ok("NO RATE AT ALL IS NULL, never a guess", rateFor(null, null, "USD", "JOD") === null);
ok("...and an unquoted currency is null too", rateFor(null, table, "XYZ", "JOD") === null);

// ---- booking the bill -------------------------------------------------------
// 1,000 USD net + 160 USD VAT at 0.709, into a three-decimal book.
const booked = inBase({ subtotal: 1000, vat: 160 }, 0.709, "JOD");
ok("THE NET IS CONVERTED", booked.net === 709, String(booked.net));
ok("...the VAT is converted on its own", booked.vat === 113.44, String(booked.vat));
ok("...and the payable is their sum, so the entry balances by construction",
  booked.total === 822.44, String(booked.total));
const fils = inBase({ subtotal: 333.33, vat: 0 }, 0.7093, "JOD");
ok("a dinar book keeps the third decimal", fils.net === 236.431, String(fils.net));

// ---- paying it --------------------------------------------------------------
const bill = (payments) => ({ total: 1160, payments });

const whole = settlePayment(bill([{ id: "pay1", amount: 1160, rate: 0.712 }]), "pay1", 822.44, 0.709, "JOD");
ok("THE PAYABLE LEAVES AT THE BOOKING RATE", whole.payable === 822.44, JSON.stringify(whole));
ok("...the bank pays at the day's", whole.bank === 825.92, JSON.stringify(whole));
ok("...and the gap is a loss on Exchange Differences", whole.difference === 3.48, JSON.stringify(whole));

const cheaper = settlePayment(bill([{ id: "pay1", amount: 1160, rate: 0.705 }]), "pay1", 822.44, 0.709, "JOD");
ok("a payment at a better rate is a gain", cheaper.difference < 0 && cheaper.bank === 817.8, JSON.stringify(cheaper));

// THE LAST PAYMENT CLEARS WHAT IS LEFT. Three thirds of 1160 at 0.709, each
// rounded, need not add back to the rounded whole.
const thirds = [
  { id: "pay1", amount: 386.67, rate: 0.709 },
  { id: "pay2", amount: 386.67, rate: 0.709 },
  { id: "pay3", amount: 386.66, rate: 0.709 },
];
const cleared = thirds.map((p) => settlePayment(bill(thirds), p.id, 822.44, 0.709, "JOD").payable);
const sum = Math.round(cleared.reduce((t, n) => t + n, 0) * 1000) / 1000;
ok("A SETTLED BILL LEAVES EXACTLY NOUGHT ON THE PAYABLE", sum === 822.44, `${cleared.join(" + ")} = ${sum}`);
const flat = thirds.map((p) => settlePayment(bill(thirds), p.id, 822.44, 0.709, "JOD").difference);
ok("...and paid at the booking rate throughout, there is no exchange difference",
  flat.every((d) => Math.abs(d) < 0.0015), flat.join(","));

ok("a payment with no rate cannot be settled", settlePayment(bill([{ id: "pay1", amount: 1160 }]), "pay1", 822.44, 0.709, "JOD") === null);
ok("nor can one that is not on the bill", settlePayment(bill([]), "pay9", 822.44, 0.709, "JOD") === null);

console.log(fails ? `\nfx model: ${fails} FAILURES\n` : "\nfx model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
