// E-INVOICING — THE FRAMEWORK, asserted without a database: which invoices a
// studio's country requires to reach its authority, and that no adapter is
// claimed to exist that does not.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { einvoiceStatusOf, needsAction, adapterFor, EINVOICE_ADAPTERS, shouldRetry, MAX_RETRY_ATTEMPTS } = await import("../src/modules/finance/einvoice.ts");
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

// THIS ASSERTED "NO ADAPTER IS BUILT" from 18/09/2026, when the owner chose
// framework only, until Jordan's landed on 22/09/2026 at their instruction —
// and it FAILED the moment it did, which is the assertion doing its job. What
// it pins now is the same property one country along: a country whose adapter
// nobody has written is NOT CONNECTED, and the product says so rather than
// implying an invoice was sent.
ok("JORDAN HAS AN ADAPTER, and it is keyed by the name its country file declares",
  Boolean(EINVOICE_ADAPTERS.jofotara) && adapterFor(JO)?.key === "jofotara");
ok("...and Saudi Arabia still has none, so a Saudi studio is not connected",
  !EINVOICE_ADAPTERS.zatca && adapterFor(SA) === null);
ok("the registry answers only for names a country declares",
  adapterFor({ ...JO, adapter: "invented" }) === null);

const issued = { status: "Sent", issueDate: "2026-09-01" };
ok("an issued invoice not yet sent needs action", einvoiceStatusOf(issued, SA) === "unsubmitted" && needsAction("unsubmitted"));
ok("a draft is not required", einvoiceStatusOf({ status: "Draft", issueDate: "2026-09-01" }, SA) === "not-required");
ok("AN INVOICE ISSUED BEFORE THE MANDATE IS NOT REQUIRED", einvoiceStatusOf({ status: "Sent", issueDate: "2025-03-01" }, JO) === "not-required");
ok("nothing is required where the country requires nothing", einvoiceStatusOf(issued, null) === "not-required");
ok("an accepted invoice needs nothing more",
  !needsAction(einvoiceStatusOf({ ...issued, einvoice: { status: "accepted" } }, SA)));
ok("a rejected one does", needsAction(einvoiceStatusOf({ ...issued, einvoice: { status: "rejected" } }, SA)));

console.log("\n== what a scheduled retry sends again, and what it leaves alone");
// THE DISTINCTION THE WHOLE CRON RESTS ON. `failed` is the WIRE — a timeout,
// a 500 — and the same document may well be accepted next time. `rejected` is
// the AUTHORITY having read the document and said no, so sending it again is
// the same rejection, daily, for ever: a studio hammering its own tax office
// with something a person has to fix.
ok("a transport failure is sent again", shouldRetry({ state: "failed", attempts: 1 }) === true);
ok("AN AUTHORITY'S REJECTION IS NOT", shouldRetry({ state: "rejected", attempts: 1 }) === false);
// And the subtler half: an invoice nobody has tried to send is waiting on a
// PERSON, not on the network. A cron that submitted these would be quietly
// deciding to file a studio's taxes for them.
ok("an unsubmitted invoice is left for a person", shouldRetry({ state: "unsubmitted" }) === false);
ok("so is one already accepted", shouldRetry({ state: "accepted", attempts: 1 }) === false);
ok("and one still pending", shouldRetry({ state: "pending", attempts: 1 }) === false);

// A CEILING, because a failure that repeats has stopped being bad luck.
ok("a first failure is retried", shouldRetry({ state: "failed", attempts: 0 }) === true);
ok("…and so is the fifth", shouldRetry({ state: "failed", attempts: 5 }) === true);
ok("the sixth is where it stops", shouldRetry({ state: "failed", attempts: 6 }) === false);
ok("…and it does not start again after", shouldRetry({ state: "failed", attempts: 99 }) === false);
ok("the ceiling is six", MAX_RETRY_ATTEMPTS === 6, String(MAX_RETRY_ATTEMPTS));
ok("a row with no attempts counted reads as none", shouldRetry({ state: "failed" }) === true);
ok("a row that is nothing at all is not retried", shouldRetry({}) === false);

console.log(fails ? `\neinvoice model: ${fails} FAILURES\n` : "\neinvoice model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
