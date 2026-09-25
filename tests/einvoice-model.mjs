// E-INVOICING — THE FRAMEWORK, asserted without a database: which invoices a
// studio's country requires to reach its authority, what the product can do
// about it, and — the owner's rule of 26/09/2026 — that it never reaches the
// authority itself.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { einvoiceStatusOf, needsAction, adapterFor, EINVOICE_ADAPTERS, EINVOICE_STATUSES } = await import("../src/modules/finance/einvoice.ts");
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

console.log("\n== nompany prepares, and never submits (the owner, 26/09/2026)");
// THE RULE, AS A PROPERTY OF EVERY ADAPTER: it prepares a file, and there is no
// other door. Each adapter submitted to its authority for a while (Jordan
// 22–26/09, Saudi Arabia for one uncommitted day) before the owner ruled it out.
ok("EVERY ADAPTER PREPARES, and none has a submit, a readiness check or a test mode",
  Object.values(EINVOICE_ADAPTERS).every((a) => typeof a.prepare === "function"
    && !("submit" in a) && !("ready" in a) && !("testing" in a)));

// AND AS A PROPERTY OF THE SOURCE, because a new file can reintroduce a call
// without touching an adapter. Nothing under src/ names an authority's API
// host, and no e-invoicing module calls fetch. TRACKED files, via git grep —
// `git add` a new one before believing this.
const hosts = ["jofotara.gov.jo", "zatca.gov.sa/e-invoicing", "gw-fatoora", "gw-apic-gov"];
let found = "";
try {
  found = execFileSync("git", ["grep", "-l", "-E", hosts.map((h) => h.replace(/\./g, "\\.")).join("|"), "--", "src"], { encoding: "utf8" });
} catch { found = ""; }
ok("NO FILE UNDER src/ NAMES A TAX AUTHORITY'S API HOST", found.trim() === "", found.trim());
const financeDir = "src/modules/finance";
const einvoicing = readdirSync(financeDir).filter((f) => /^(einvoice|jofotara|zatca|ublXml)/.test(f));
const calling = einvoicing.filter((f) => /\bfetch\s*\(/.test(readFileSync(`${financeDir}/${f}`, "utf8")));
ok("NO E-INVOICING MODULE CALLS fetch", calling.length === 0, calling.join(", "));
ok("...and the list it checked is not empty", einvoicing.length >= 7, einvoicing.join(", "));

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
