// E-INVOICING — THE FRAMEWORK, asserted without a database: which invoices a
// studio's country requires to reach its authority, what the product can do
// about it, and WHERE IT MAY REACH THE AUTHORITY ITSELF — Saudi Arabia alone,
// through one file (the owner's decision A, 03/10/2026, reversing "never" of
// 26/09/2026).
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { einvoiceStatusOf, needsAction, adapterFor, EINVOICE_ADAPTERS, EINVOICE_STATUSES } = await import("../src/modules/finance/einvoice.ts");
const { ZATCA_OPEN_ENVIRONMENTS } = await import("../src/modules/finance/zatcaApi.ts");
const { dueForBatch } = await import("../src/modules/finance/einvoiceService.ts");
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

ok("JORDAN AND SAUDI ARABIA HAVE ADAPTERS, each keyed by the name its country file declares",
  adapterFor(JO)?.key === "jofotara" && adapterFor(SA)?.key === "zatca");
ok("the registry answers only for names a country declares",
  adapterFor({ ...JO, adapter: "invented" }) === null);

console.log("\n== who submits (the owner: never, 26/09/2026; Saudi Arabia, 03/10/2026)");
// THE RULE, AS A PROPERTY OF EVERY ADAPTER: each prepares, and ONLY ZATCA'S
// submits. Jordan's posted to JoFotara for four days (22–26/09) and the
// decision that reopened submission named Saudi Arabia alone.
ok("EVERY ADAPTER PREPARES", Object.values(EINVOICE_ADAPTERS).every((a) => typeof a.prepare === "function"));
ok("ONLY ZATCA'S SUBMITS — Jordan stays prepare-only",
  Object.values(EINVOICE_ADAPTERS).filter((a) => "submit" in a).map((a) => a.key).join(",") === "zatca"
  && typeof EINVOICE_ADAPTERS.zatca.submission === "function");

// AND AS A PROPERTY OF THE SOURCE, because a new file can open a second door
// without touching an adapter. ONE file under src/ names an authority's API
// host, it names ZATCA's alone, and it is the only e-invoicing module that
// calls fetch. TRACKED files, via git grep — `git add` a new one before
// believing this.
const hosts = ["jofotara.gov.jo", "zatca.gov.sa/e-invoicing", "gw-fatoora", "gw-apic-gov"];
let found = "";
try {
  found = execFileSync("git", ["grep", "-l", "-E", hosts.map((h) => h.replace(/\./g, "\\.")).join("|"), "--", "src"], { encoding: "utf8" });
} catch { found = ""; }
ok("ONE FILE UNDER src/ NAMES A TAX AUTHORITY'S API HOST, and it is ZATCA's client",
  found.trim() === "src/modules/finance/zatcaApi.ts", found.trim());
let jordan = "";
try { jordan = execFileSync("git", ["grep", "-l", "-E", "jofotara\\.gov\\.jo|gw-apic-gov", "--", "src"], { encoding: "utf8" }); } catch { jordan = ""; }
ok("...and no file names Jordan's", jordan.trim() === "", jordan.trim());
const financeDir = "src/modules/finance";
const einvoicing = readdirSync(financeDir).filter((f) => /^(einvoice|jofotara|zatca|ublXml)/.test(f));
const calling = einvoicing.filter((f) => /\bfetch\s*\(/.test(readFileSync(`${financeDir}/${f}`, "utf8")));
ok("ONLY ZATCA'S CLIENT CALLS fetch among the e-invoicing modules", calling.join(",") === "zatcaApi.ts", calling.join(", "));
ok("...and the list it checked is not empty", einvoicing.length >= 10, einvoicing.join(", "));
// OPENING SIMULATION OR PRODUCTION IS THE OWNER'S DECISION, and changing this
// line is how that decision is recorded.
ok("ONLY ZATCA'S DEVELOPER PORTAL IS OPEN (the owner, 03/10/2026)", JSON.stringify(ZATCA_OPEN_ENVIRONMENTS) === JSON.stringify(["developer"]));

console.log("\n== the nightly batch");
ok("an unsubmitted or prepared invoice issued since submitting began is due",
  dueForBatch({ issueDate: "2026-10-04" }, "unsubmitted", "2026-10-04") && dueForBatch({ issueDate: "2026-10-05" }, "prepared", "2026-10-04"));
ok("ONE ISSUED BEFORE IS NOT — it may have reached the authority some other way; a person submits it",
  !dueForBatch({ issueDate: "2026-10-03" }, "unsubmitted", "2026-10-04"));
ok("A REJECTED ONE WAITS FOR A PERSON — sent again unchanged it collects the same refusal",
  !dueForBatch({ issueDate: "2026-10-05" }, "rejected", "2026-10-04"));
ok("an accepted one is never sent again", !dueForBatch({ issueDate: "2026-10-05" }, "accepted", "2026-10-04"));

console.log("\n== where an invoice stands");
ok("`prepared` is a state, and the three submission states survive only to be read",
  ["prepared", "accepted", "rejected", "pending", "submitted", "failed"].every((s) => EINVOICE_STATUSES.includes(s)));
const issued = { status: "Sent", issueDate: "2026-09-01" };
ok("an issued invoice nothing has been done with needs action", einvoiceStatusOf(issued, SA) === "unsubmitted" && needsAction("unsubmitted"));
ok("A PREPARED ONE STILL DOES — the file exists, the authority has not been heard from",
  needsAction(einvoiceStatusOf({ ...issued, einvoice: { status: "prepared" } }, SA)));
ok("a draft is not required", einvoiceStatusOf({ status: "Draft", issueDate: "2026-09-01" }, SA) === "not-required");
ok("AN INVOICE ISSUED BEFORE THE MANDATE IS NOT REQUIRED", einvoiceStatusOf({ status: "Sent", issueDate: "2025-03-01" }, JO) === "not-required");
ok("nothing is required where the country requires nothing", einvoiceStatusOf(issued, null) === "not-required");
ok("an accepted invoice needs nothing more",
  !needsAction(einvoiceStatusOf({ ...issued, einvoice: { status: "accepted" } }, SA)));
ok("a rejected one does", needsAction(einvoiceStatusOf({ ...issued, einvoice: { status: "rejected" } }, SA)));
ok("A LEGACY `failed` STILL READS AS NEEDING ACTION, rather than vanishing from the queue",
  needsAction(einvoiceStatusOf({ ...issued, einvoice: { status: "failed" } }, JO)));

console.log(fails ? `\neinvoice model: ${fails} FAILURES\n` : "\neinvoice model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
