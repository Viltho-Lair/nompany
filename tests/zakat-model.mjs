// THE ZAKAT WORKSHEET, asserted without a database — the arithmetic the screen
// shows, including the floor and the ceiling the 2024 regulation sets.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { zakatWorksheet, cleanAdjustment, daysIn } = await import("../src/modules/finance/zakat.ts");
const { studioZakatRules } = await import("../src/shared/compliance/rules.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const SA = studioZakatRules({ country: "Saudi Arabia" });
ok("A SAUDI STUDIO HAS A ZAKAT RULE, from its country's file", SA?.rateHijri === 2.5 && SA?.hijriDays === 354, JSON.stringify(SA));
ok("a Jordanian one has none", studioZakatRules({ country: "Jordan" }) === null);
ok("nor does a studio with no country", studioZakatRules({}) === null);

const base = { equity: 1_000_000, netFixedAssets: 400_000, profit: 150_000, adjustments: [], zakatableShare: 100, days: 354 };
const hijri = zakatWorksheet(base, SA, "SAR");
ok("the base is additions less deductions", hijri.computed === 600_000 && hijri.base === 600_000, JSON.stringify(hijri));
ok("A HIJRI YEAR PAYS 2.5%", hijri.zakat === 15_000, String(hijri.zakat));

const greg = zakatWorksheet({ ...base, days: daysIn("2026-01-01", "2026-12-31") }, SA, "SAR");
ok("a Gregorian year has 365 days", daysIn("2026-01-01", "2026-12-31") === 365);
ok("A GREGORIAN YEAR IS PRORATED — about 2.577%", Math.abs(greg.rate - 2.5776) < 0.001 && greg.zakat === 15_466.1, `${greg.rate} ${greg.zakat}`);

const floor = zakatWorksheet({ ...base, netFixedAssets: 950_000 }, SA, "SAR");
ok("A BASE BELOW THE ADJUSTED PROFIT IS LIFTED TO IT", floor.floored && floor.base === 150_000, JSON.stringify(floor));

const loss = zakatWorksheet({ ...base, netFixedAssets: 1_200_000, profit: -50_000 }, SA, "SAR");
ok("a loss with no positive base carries no base at all", loss.base === 0 && loss.zakat === 0);

const capped = zakatWorksheet({ ...base, adjustments: [{ label: "Long-term loan", kind: "add", amount: 900_000 }] }, SA, "SAR");
ok("THE BASE IS CAPPED AT YEAR-END EQUITY", capped.computed === 1_500_000 && capped.capped && capped.base === 1_000_000, JSON.stringify(capped));

const share = zakatWorksheet({ ...base, zakatableShare: 60 }, SA, "SAR");
ok("only the zakatable share pays", share.zakat === 9_000);

ok("an adjustment needs a label, a kind and an amount", cleanAdjustment({ label: "x", kind: "add" }) === null
  && cleanAdjustment({ label: "Loan", kind: "add", amount: 5 })?.amount === 5
  && cleanAdjustment({ label: "Loan", kind: "wrong", amount: 5 }) === null);

console.log(fails ? `\nzakat model: ${fails} FAILURES\n` : "\nzakat model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
