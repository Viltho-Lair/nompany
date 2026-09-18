// E-INVOICING — THE FRAMEWORK, asserted without a database: which invoices a
// studio's country requires to reach its authority, and that no adapter is
// claimed to exist that does not.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { einvoiceStatusOf, needsAction, adapterFor, EINVOICE_ADAPTERS } = await import("../src/modules/finance/einvoice.ts");
const { studioEInvoiceRules } = await import("../src/shared/compliance/rules.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const SA = studioEInvoiceRules({ country: "Saudi Arabia" });
const JO = studioEInvoiceRules({ country: "Jordan" });
ok("A SAUDI STUDIO'S COUNTRY REQUIRES E-INVOICING, through ZATCA", SA?.system === "Fatoora" && SA?.mode === "mixed");
ok("so does a Jordanian one's, through JoFotara", JO?.system === "JoFotara" && JO?.mode === "clearance");
ok("a country with no rule requires nothing", studioEInvoiceRules({ country: "Germany" }) === null);

ok("NO ADAPTER IS BUILT — the owner's framework-only decision", Object.keys(EINVOICE_ADAPTERS).length === 0);
ok("...so a Saudi studio is not connected", adapterFor(SA) === null);

const issued = { status: "Sent", issueDate: "2026-09-01" };
ok("an issued invoice not yet sent needs action", einvoiceStatusOf(issued, SA) === "unsubmitted" && needsAction("unsubmitted"));
ok("a draft is not required", einvoiceStatusOf({ status: "Draft", issueDate: "2026-09-01" }, SA) === "not-required");
ok("AN INVOICE ISSUED BEFORE THE MANDATE IS NOT REQUIRED", einvoiceStatusOf({ status: "Sent", issueDate: "2025-03-01" }, JO) === "not-required");
ok("nothing is required where the country requires nothing", einvoiceStatusOf(issued, null) === "not-required");
ok("an accepted invoice needs nothing more",
  !needsAction(einvoiceStatusOf({ ...issued, einvoice: { status: "accepted" } }, SA)));
ok("a rejected one does", needsAction(einvoiceStatusOf({ ...issued, einvoice: { status: "rejected" } }, SA)));

console.log(fails ? `\neinvoice model: ${fails} FAILURES\n` : "\neinvoice model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
