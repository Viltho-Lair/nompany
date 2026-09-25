// WHAT FINANCE NEEDS SET UP, asserted without a database.
//
// THE DEFECT: a studio met its missing setup only as a refusal at the moment it
// bit — "no-studio-currency" on the first bill somebody tried to approve — and
// nothing ever said a country's invoices must carry its tax number. The owner's
// rule (18/09/2026): there is no home market; the studio's country decides, and
// the product annotates the setup that matters.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { financeSetup } = await import("../src/modules/finance/setup.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};
const keys = (studio) => financeSetup(studio).map((i) => `${i.key}:${i.state}`);

const blank = keys({});
ok("A STUDIO WITH NOTHING SET IS TOLD TO CHOOSE ITS COUNTRY", blank.includes("country:missing"), blank.join(","));
ok("...and its currency", blank.includes("currency:missing"));
ok("...and nothing country-specific is guessed without a country", blank.length === 2, blank.join(","));

// Jordan: a sales tax, three mandatory values in Finance's departments.
const jo = keys({ country: "Jordan", currency: "JOD" });
ok("a country with a sales tax and no rate is flagged to CHECK, not as wrong", jo.includes("vat:check"), jo.join(","));
ok("THE COUNTRY'S MANDATORY VALUES ARE NAMED", jo.includes("official:tax_number:missing")
  && jo.includes("official:commercial_registration_number:missing"), jo.join(","));
ok("nothing about currency once it is set", !jo.some((k) => k.startsWith("currency")));
// E-INVOICING WHERE NOMPANY CANNOT PREPARE THE FILE: said, never implied away.
// It was asked of Jordan until its adapter shipped (22/09/2026), then of Saudi
// Arabia until its did (25/09/2026). Every country that declares e-invoicing
// has an adapter now, so the notice has no real country to fire for; what is
// asserted is that neither of these gets it, and that what a Jordanian file
// needs is named where every official value is — as a missing value.
// (A "connect" notice existed for one day and went with the owner's rule of
// 26/09/2026: nompany never connects to an authority.)
const sa = keys({ country: "Saudi Arabia", currency: "SAR" });
ok("A COUNTRY WHOSE FILE NOMPANY PREPARES IS NOT TOLD IT CANNOT",
  !sa.includes("einvoice:check") && !jo.includes("einvoice:check"), `${sa.join(",")} / ${jo.join(",")}`);
ok("and nothing tells a studio to connect to anything", ![...sa, ...jo].some((k) => k.startsWith("einvoice-")));
ok("WHAT JORDAN'S FILE NEEDS IS NAMED AS MISSING OFFICIAL VALUES — the income source sequence and the invoice code",
  jo.includes("official:jofotara_income_source:missing") && jo.includes("official:jofotara_invoice_type:missing"), jo.join(","));
ok("...and a country that requires none is not", !keys({ country: "Germany", currency: "EUR" }).includes("einvoice:check"));

// Saudi Arabia: the VAT number is conditional on being registered.
const unregistered = keys({ country: "Saudi Arabia", currency: "SAR" });
ok("an unregistered studio is not asked for a VAT number", !unregistered.some((k) => k.startsWith("official:vat_registration_number")),
  unregistered.join(","));
const registered = financeSetup({ country: "Saudi Arabia", currency: "SAR", vatRate: 15, officialValues: { vat_registration_number: "123" } });
const vatItem = registered.find((i) => i.key === "official:vat_registration_number");
ok("A REGISTERED ONE IS — and a malformed number is said to be wrong", vatItem?.state === "invalid", JSON.stringify(vatItem));
ok("...with the country's own label, in both languages", Boolean(vatItem?.label?.en && vatItem?.label?.ar));
ok("a registered studio is not told to check its rate", !registered.some((i) => i.key === "vat"));
ok("HR's values are not Finance's to annotate", !registered.some((i) => i.key.includes("gosi")));

console.log(fails ? `\nfinance setup model: ${fails} FAILURES\n` : "\nfinance setup model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
