// STATUTORY PAY, PURELY (tier 6) — social security, end of service, the WPS file.
//
// THE DEFECTS THESE GUARD: social security was typed by hand as an ordinary
// deduction and the employer's share existed nowhere, so a Jordanian studio's
// wage cost was short by 14.25% on every run; nobody could see what leaving
// staff would be owed; and a UAE studio's bank file was a CSV no bank takes.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const S = await import("@/modules/hr/statutory");
const P = await import("@/modules/hr/payroll");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the presets");
const JO = S.presetFor("jo");
const SA = S.presetFor("SA");
const AE = S.presetFor("AE");
ok("Jordan: 7.5% and 14.25% up to JOD 3,733", JO.socialSecurity.employeePct === 7.5 && JO.socialSecurity.employerPct === 14.25 && JO.socialSecurity.ceiling === 3733);
ok("Jordan gives no end of service to the SSC-covered", JO.endOfService === null);
ok("Saudi Arabia: 21 days, 30 after five years", SA.leave.Annual.days === 21 && SA.leave.Annual.daysAfter === 30);
ok("the UAE scheme covers nobody by default (Emiratis only)", AE.socialSecurity.coversEveryone === false);
ok("the UAE counts leave in calendar days", AE.workingDays === false);
ok("no preset for a country nompany has not researched", S.presetFor("EG") === null && S.presetFor("") === null);
ok("every preset passes the check it will be saved through",
  [JO, SA, AE].every((p) => S.statutoryProblems(p).length === 0));

console.log("\n== social security on a payslip");
const pay = {
  collaboratorId: "a", basic: 1000, iban: "", bankName: "",
  components: [
    { label: "Housing", amount: 200, kind: "allowance", insurable: true },
    { label: "Phone", amount: 100, kind: "allowance" },
  ],
};
const line = P.payslipFor(pay, { alias: "A", period: "2026-09", ss: JO.socialSecurity });
ok("charged on basic plus insurable allowances", line.ssBase === 1200, String(line.ssBase));
ok("the employee's share is deducted", line.ssEmployee === 90 && line.deductions === 90 && line.net === 1210);
ok("the employer's share is on top, not in the net", line.ssEmployer === 171 && line.gross === 1300);
const rich = P.payslipFor({ ...pay, basic: 5000, components: [] }, { alias: "R", period: "2026-09", ss: JO.socialSecurity });
ok("capped at the ceiling", rich.ssBase === 3733 && rich.ssEmployee === 279.98, JSON.stringify([rich.ssBase, rich.ssEmployee]));
ok("a scheme that covers nobody charges nobody", P.payslipFor(pay, { alias: "A", period: "2026-09", ss: AE.socialSecurity }).ssEmployee === 0);
ok("...unless the pay record says covered", P.payslipFor({ ...pay, ssCovered: true }, { alias: "A", period: "2026-09", ss: AE.socialSecurity }).ssEmployee === 132);
const expat = P.payslipFor({ ...pay, ssEmployeePct: 0, ssEmployerPct: 2 }, { alias: "E", period: "2026-09", ss: SA.socialSecurity });
ok("a person's own rates replace the scheme's (a non-Saudi: 0% and 2%)", expat.ssEmployee === 0 && expat.ssEmployer === 24);
ok("no scheme, no contribution, the net as before", P.payslipFor(pay, { alias: "A", period: "2026-09" }).net === 1300);
ok("a run totals the employer's share", P.runTotals([line, rich]).ssEmployer === 171 + rich.ssEmployer);
const cleaned = P.cleanPay({ collaboratorId: "a", basic: 1, components: [
  { label: "Housing", amount: 5, kind: "allowance", insurable: true },
  { label: "Loan", amount: 5, kind: "deduction", insurable: true },
] });
ok("only an allowance can be insurable", cleaned.components[0].insurable === true && !("insurable" in cleaned.components[1]));
ok("covered is three answers, not two", P.cleanPay({ collaboratorId: "a", basic: 1 }).ssCovered === null
  && P.cleanPay({ collaboratorId: "a", basic: 1, ssCovered: false }).ssCovered === false);
ok("a rate above 100 is refused", P.payProblems({ collaboratorId: "a", basic: 1, ssEmployeePct: 150 }).length === 1);

console.log("\n== end of service");
ok("three years to the day is exactly three", S.serviceYearsBetween("2023-01-01", "2026-01-01") === 3);
const sa = (join, reason, asOf = "2026-01-01") => S.endOfService(SA.endOfService, { dateOfJoin: join, asOf, basic: 8000, wage: 10000, reason }).amount;
ok("Saudi: half a month a year for the first five", sa("2023-01-01", "termination") === 15000);
ok("Saudi: resigning under five years gets a third", sa("2023-01-01", "resignation") === 5000);
ok("Saudi: resigning under two years gets nothing", sa("2025-01-01", "resignation") === 0);
ok("Saudi: a month a year after five", sa("2014-01-01", "termination") === 95000);
ok("Saudi: after ten years resignation is paid in full", sa("2014-01-01", "resignation") === 95000);
const ae = (join) => S.endOfService(AE.endOfService, { dateOfJoin: join, asOf: "2026-01-01", basic: 6000, wage: 9000, reason: "resignation" }).amount;
ok("UAE: 21 days' basic a year, then 30 — and no cut for resigning", ae("2020-01-01") === 27000);
ok("UAE: nothing under a year", ae("2025-07-01") === 0);
ok("UAE: capped at two years' wage", ae("1986-01-01") === 144000);

console.log("\n== what a studio may store");
ok("a WPS employer ID is 13 digits", S.statutoryProblems({ wps: { employerId: "123", routingCode: "123456789" } }).includes("wpsEmployer"));
ok("a resignation share is 0 to 100%", S.statutoryProblems({ endOfService: { firstMonths: 1, resignation: [{ underYears: 2, factor: 1.5 }] } }).includes("eosResignation"));
ok("a rate above 100 is refused", S.statutoryProblems({ socialSecurity: { employeePct: 150, employerPct: 1 } }).includes("ssPct"));
const none = S.cleanStatutory({ socialSecurity: { employeePct: "", employerPct: "" } });
ok("both rates blank is no scheme, not an error", none.rules.socialSecurity === null);

console.log("\n== the UAE salary file");
const wps = { employerId: "1234567890123", routingCode: "123456789", scrFirst: false };
const accounts = {
  a: { iban: "AE070331234567890123456", agentId: "987654321", labourCardId: "12345678901234" },
  b: { iban: "AE070331234567890123457", agentId: "987654321", labourCardId: "" },
};
const input = {
  wps, currency: "AED", period: "2026-09",
  lines: [{ collaboratorId: "a", alias: "A", net: 1210.5, unpaidDays: 2 }, { collaboratorId: "b", alias: "B", net: 900 }],
  accountOf: (id) => accounts[id] || null, now: new Date("2026-09-30T08:05:09Z"),
};
const sif = S.sifFile(input);
const rows = sif.text.split("\r\n").filter(Boolean);
ok("one EDR per complete employee", rows[0] === "EDR,12345678901234,987654321,AE070331234567890123456,2026-09-01,2026-09-30,30,1210.50,0.00,2", rows[0]);
ok("the SCR totals them, last by default", rows[1] === "SCR,1234567890123,123456789,2026-09-30,1205,092026,1,1210.50,AED,", rows[1]);
ok("somebody with no labour-card ID is left out and named", sif.missing.length === 1 && sif.missing[0].alias === "B");
ok("the file is named by employer, date and UAE time", sif.filename === "1234567890123260930120509.SIF", sif.filename);
ok("the SCR can come first", S.sifFile({ ...input, wps: { ...wps, scrFirst: true } }).text.startsWith("SCR,"));
ok("a payroll not in AED is refused", S.sifFile({ ...input, currency: "JOD" }).error === "sif-currency");
ok("without the employer's IDs it is refused", S.sifFile({ ...input, wps: null }).error === "sif-employer");
ok("a file with nobody in it is refused", S.sifFile({ ...input, lines: [input.lines[1]] }).error === "sif-empty");

console.log(fails ? `\n${fails} failed` : "\nall passed");
process.exitCode = fails ? 1 : 0;
