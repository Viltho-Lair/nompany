// LEASES UNDER IFRS 16, asserted without a database (modules/finance/leases).
//
// THE DEFECT: a five-year office lease was rent — a line in the P&L each month
// and nothing on the balance sheet — so a studio committed to 300,000 of
// payments showed no liability at all.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const L = await import("../src/modules/finance/leases.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

ok("A LEASE OF TWELVE MONTHS OR LESS IS AN ORDINARY EXPENSE — the short-term exemption",
  "problems" in L.cleanLease({ name: "Van", start: "2026-01-01", termMonths: 12, payment: 100, annualRate: 5 }));
ok("the rate is a yearly percentage", "problems" in L.cleanLease({ name: "Van", start: "2026-01-01", termMonths: 24, payment: 100, annualRate: 90 }));

const { lease } = L.cleanLease({ name: "Office", start: "2026-01-01", termMonths: 36, payment: 1000, annualRate: 6 });
ok("payments are in arrears unless said", lease.timing === "arrears");
const pv = L.presentValueMinor(lease, "SAR") / 100;
ok("THE LIABILITY STARTS AT THE PRESENT VALUE OF THE PAYMENTS", Math.abs(pv - 32871.02) < 0.05, String(pv));
const adv = L.presentValueMinor({ ...lease, timing: "advance" }, "SAR") / 100;
ok("...and higher when paid in advance, the first payment undiscounted", Math.abs(adv - pv * 1.005) < 0.05, String(adv));
ok("a lease at nought per cent is its payments", L.presentValueMinor({ ...lease, annualRate: 0 }, "SAR") === 3600000);

const s = L.leaseSchedule(lease, "SAR");
const last = s.months[s.months.length - 1];
ok("THE LIABILITY RUNS TO EXACTLY NOUGHT over the term", last.closing === 0, JSON.stringify(last));
const dep = Math.round(s.months.reduce((a, m) => a + m.depreciation, 0) * 100);
ok("THE ASSET IS DEPRECIATED TO EXACTLY NOUGHT", dep === Math.round(s.initial * 100), `${dep} vs ${s.initial}`);
const paid = s.months.reduce((a, m) => a + m.payment, 0);
const interest = Math.round(s.months.reduce((a, m) => a + m.interest, 0) * 100) / 100;
ok("PAYMENTS ARE THE LIABILITY PLUS ITS INTEREST", Math.abs(paid - (s.initial + interest)) < 0.005, `${paid} ${s.initial} ${interest}`);
ok("the first month's interest is the opening liability at the monthly rate", s.months[0].interest === Math.round(pv * 0.005 * 100) / 100);
ok("the months are the lease's own", s.months[0].period === "2026-01" && last.period === "2028-12");

const sa = L.leaseSchedule({ ...lease, timing: "advance" }, "SAR");
ok("paid in advance, it also runs to nought", sa.months[sa.months.length - 1].closing === 0);

const lines = L.leaseMonthLines(s.months[0], { depreciation: "dep", accumulated: "acc", interest: "int", liability: "liab", money: "bank" });
const dr = lines.reduce((a, l) => a + (l.debit || 0), 0);
const cr = lines.reduce((a, l) => a + (l.credit || 0), 0);
ok("A MONTH'S ENTRY BALANCES: depreciation, interest and the payment", Math.abs(dr - cr) < 1e-9 && lines.length === 6, JSON.stringify(lines));
ok("...and the payment leaves the money account it names", lines.some((l) => l.accountId === "bank" && l.credit === 1000));

console.log(fails ? `\nleases model: ${fails} FAILURES\n` : "\nleases model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
