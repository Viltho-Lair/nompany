// A PAYMENT RUN'S CHOICE OF BILLS, asserted without a database
// (modules/finance/paymentRun). Paying is `recordBillPayment`'s, and its checks
// are covered where it lives; what is asserted here is which bills a run offers.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const R = await import("../src/modules/finance/paymentRun.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const bills = [
  { id: "a", reference: "BILL-1", status: "Approved", dueDate: "2026-09-10", outstanding: 100, currency: "SAR" },
  { id: "b", reference: "BILL-2", status: "Approved", dueDate: "2026-10-30", outstanding: 50, currency: "SAR" },
  { id: "c", reference: "BILL-3", status: "Received", dueDate: "2026-09-01", outstanding: 70, currency: "SAR" },
  { id: "d", reference: "BILL-4", status: "Approved", dueDate: "2026-09-05", outstanding: 0, currency: "SAR" },
  { id: "e", reference: "BILL-5", status: "Approved", dueDate: "", outstanding: 30, currency: "USD" },
  { id: "f", reference: "BILL-6", status: "Approved", dueDate: "2026-09-02", outstanding: 20, currency: "SAR", hold: { held: true, reasons: ["lapsed"] } },
];
const run = R.runCandidates(bills, "2026-09-30");
const ids = run.map((c) => c.id);
ok("AN APPROVED BILL DUE BY THE DATE IS OFFERED", ids.includes("a"));
ok("one due after it is not", !ids.includes("b"));
ok("AN UNAPPROVED BILL IS NEVER OFFERED — payment waits on approval", !ids.includes("c"));
ok("a settled bill is not offered", !ids.includes("d"));
ok("A BILL NOBODY DATED IS OFFERED, or it would wait for ever", ids.includes("e"));
ok("a held bill is LISTED, so nobody wonders where it went", ids.includes("f") && run.find((c) => c.id === "f").held);
ok("oldest due first, undated last", ids.join() === "f,a,e", ids.join());
ok("with no date, everything approved and owing", R.runCandidates(bills, "").length === 4);

const totals = R.runTotals(run, ["a", "e", "f"]);
ok("TOTALS ARE PER CURRENCY, and a held bill adds nothing", totals.SAR === 100 && totals.USD === 30, JSON.stringify(totals));

console.log(fails ? `\npayment run model: ${fails} FAILURES\n` : "\npayment run model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
