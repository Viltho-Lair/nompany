// FIXED ASSETS IN THE BOOK, asserted without a database.
//
// THE DEFECT: the register computed cost, depreciation and book value from the
// day it was built, and nothing put any of it in the ledger — Fixed Assets and
// Accumulated Depreciation sat at nought on every studio while the register
// showed a fleet. These are the three entries that replace that, and the rules
// that keep them from counting money twice.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const {
  depreciationOf, depreciationDue, depreciationLines, disposalLines, acquisitionLines, fundingCode, isFunding,
} = await import("../src/modules/finance/depreciation.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};
// Every entry balances: the same rule postEntry refuses on, asked of the lines.
const balances = (lines, dp = 2) => {
  const f = 10 ** dp;
  const d = lines.reduce((t, l) => t + Math.round((l.debit || 0) * f), 0);
  const c = lines.reduce((t, l) => t + Math.round((l.credit || 0) * f), 0);
  return d === c;
};
const side = (lines, code, key) => lines.find((l) => l.code === code)?.[key] || 0;

// ---- how it was paid for ----------------------------------------------------
ok("the four sources are the only ones", ["bank", "payable", "bill", "opening"].every(isFunding) && !isFunding("cash") && !isFunding(""));
ok("paid from the bank credits the bank", fundingCode("bank") === "1010");
ok("owed with no bill credits Accounts Payable", fundingCode("payable") === "2000");
ok("owned before the books credits Owner's Equity", fundingCode("opening") === "3000");
ok("BOUGHT ON A BILL MOVES THE COST OUT OF THAT BILL'S EXPENSE, never the bank again",
  fundingCode("bill", "5000") === "5000");
ok("...and without the bill's account there is nothing to move it from", fundingCode("bill") === null);

const acquired = acquisitionLines(24000, "1010", "SAR");
ok("acquisition: Dr Fixed Assets at cost", side(acquired, "1500", "debit") === 24000);
ok("...Cr the source", side(acquired, "1010", "credit") === 24000 && balances(acquired));
ok("a cost of nought posts nothing", acquisitionLines(0, "1010").length === 0);

// ---- the run ----------------------------------------------------------------
// 24,000, no salvage, 24 months straight-line: 1,000 a month from 2026-01-15.
const van = { cost: 24000, salvageValue: 0, usefulLifeMonths: 24, method: "straight-line", acquiredOn: "2026-01-15" };

ok("A FIRST RUN CATCHES UP EVERY MONTH NOT YET IN THE BOOK",
  depreciationDue(van, 0, "2026-06-30", "SAR") === 5000, String(depreciationDue(van, 0, "2026-06-30", "SAR")));
ok("a run after that posts only the month since", depreciationDue(van, 5000, "2026-07-31", "SAR") === 1000);
ok("a month already run owes nothing", depreciationDue(van, 6000, "2026-07-31", "SAR") === 0);
// A useful life lengthened after runs: the book is AHEAD of the schedule.
const longer = { ...van, usefulLifeMonths: 48 };
ok("A LENGTHENED LIFE POSTS BACK WHAT THE BOOK HOLDS TOO MUCH OF",
  depreciationDue(longer, 6000, "2026-07-31", "SAR") === -3000, String(depreciationDue(longer, 6000, "2026-07-31", "SAR")));
ok("the schedule and the run agree on what is written off",
  depreciationDue(van, 0, "2026-07-31", "SAR") === depreciationOf(van, "2026-07-31", "SAR").accumulated);

const charge = depreciationLines(1000);
ok("depreciation: Dr Depreciation, Cr Accumulated Depreciation",
  side(charge, "5400", "debit") === 1000 && side(charge, "1510", "credit") === 1000 && balances(charge));
const back = depreciationLines(-3000);
ok("a negative true-up is the same entry the other way round",
  side(back, "1510", "debit") === 3000 && side(back, "5400", "credit") === 3000 && balances(back));
ok("nothing due posts nothing", depreciationLines(0).length === 0);

// ---- disposal ---------------------------------------------------------------
// Sold on 2026-10-20 for 17,000: nine whole months written off = 9,000, book
// value 15,000, so a gain of 2,000. The runs had only reached June (5,000).
const sold = { ...van, disposedOn: "2026-10-20", disposalProceeds: 17000 };
const off = disposalLines(sold, 5000, "SAR");
ok("THE DISPOSAL ENTRY BALANCES", balances(off), JSON.stringify(off));
ok("...charges the depreciation the runs had not reached", side(off, "5400", "debit") === 4000, JSON.stringify(off));
ok("...clears what Accumulated Depreciation held", side(off, "1510", "debit") === 5000);
ok("...banks the proceeds", side(off, "1010", "debit") === 17000);
ok("...takes the cost out of Fixed Assets", side(off, "1500", "credit") === 24000);
ok("...and books the gain the register shows", side(off, "4900", "credit") === 2000);

const scrapped = disposalLines({ ...sold, disposalProceeds: 0 }, 9000, "SAR");
ok("scrapped for nothing: a loss of the whole book value", side(scrapped, "4900", "debit") === 15000 && balances(scrapped),
  JSON.stringify(scrapped));
ok("...and no proceeds line", !scrapped.some((l) => l.code === "1010"));

// A run posted PAST the disposal date (the disposal was recorded late): the
// book holds more than the schedule to the day it went, and gives it back.
const late = disposalLines(sold, 10000, "SAR");
ok("a book ahead of the disposal date gives the excess back to Depreciation",
  side(late, "5400", "credit") === 1000 && balances(late), JSON.stringify(late));

// Three decimals: the dinar keeps its fils through a disposal.
const dinar = disposalLines({ cost: 1000.005, salvageValue: 0, usefulLifeMonths: 3, method: "straight-line", acquiredOn: "2026-01-01", disposedOn: "2026-02-01", disposalProceeds: 700.001 }, 0, "JOD");
ok("a JOD disposal balances to the fils", balances(dinar, 3), JSON.stringify(dinar));

console.log(fails ? `\nasset posting model: ${fails} FAILURES\n` : "\nasset posting model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
