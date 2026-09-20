// OFFICIAL STUDIO VALUES, asserted without a database.
//
// The country compliance package's first slice: definition files, the
// validation each value is judged by, and the resolver every official document
// reads through. One block per thing that would otherwise go wrong quietly — a
// definition file nobody registered, a checksum that agrees with itself and not
// with the authority, a VAT number printed for a Studio with no VAT, a Saudi
// number surviving onto a UK invoice.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readdirSync, readFileSync } from "node:fs";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { CHECKSUMS } = await import("@/shared/compliance/checksums");
const { definitionProblems, valueProblem, normalizeValue } = await import("@/shared/compliance/definition");
const { COUNTRY_DEFINITIONS, definitionFor } = await import("@/shared/compliance/countries");
const { official, officialResolver, officialForDocument, officialValuesFor, isApplicable } =
  await import("@/shared/compliance/resolve");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- every definition file is registered, and well formed --------------------
// THE LIST IN countries/index.ts IS WRITTEN DOWN, so the mistake it invites is a
// file added to the folder and not to the list — a country that looks shipped
// and resolves to nothing. Read off the disk, not off the list.
const dir = "src/shared/compliance/countries";
const onDisk = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
ok("every country file in the folder is registered",
  onDisk.join(",") === Object.keys(COUNTRY_DEFINITIONS).sort().join(","),
  `disk ${onDisk.join(",")} vs registered ${Object.keys(COUNTRY_DEFINITIONS).sort().join(",")}`);
for (const code of onDisk) {
  const problems = definitionProblems(JSON.parse(readFileSync(`${dir}/${code}.json`, "utf8")));
  ok(`${code}.json is a valid definition`, problems.length === 0, problems.join("; "));
  ok(`${code}.json is filed under its own code`, COUNTRY_DEFINITIONS[code]?.code === code);
}
ok("the seven researched countries are defined", ["AE", "DE", "EG", "GB", "JO", "SA", "US"].every((c) => COUNTRY_DEFINITIONS[c]));

// ...and the checker refuses what would fail silently.
const base = JSON.parse(readFileSync(`${dir}/SA.json`, "utf8"));
const withField = (patch) => ({ ...base, fields: [{ ...base.fields[0], ...patch }] });
ok("a checksum nobody implemented is refused", definitionProblems(withField({ checksum: "mod-magic" })).length > 0);
ok("a pattern that does not compile is refused", definitionProblems(withField({ patterns: ["^([0-9$"] })).length > 0);
ok("an unanchored pattern is refused", definitionProblems(withField({ patterns: ["\\d{10}"] })).length > 0);
ok("a document kind nobody prints is refused", definitionProblems(withField({ showOn: ["poster"] })).length > 0);
ok("an unknown applicability condition is refused", definitionProblems(withField({ appliesWhen: { raining: true } })).length > 0);
ok("a duplicate key is refused",
  definitionProblems({ ...base, fields: [base.fields[0], base.fields[0]] }).some((p) => p.includes("duplicate")));

// ---- the checksums, against PUBLISHED numbers ---------------------------------
// Each is tested against a number the authority or the public record gives,
// never one this code generated: an implementation that made and checked its
// own examples would agree with itself however wrong it was.
ok("HMRC's published example 123 4567 82 passes mod 97", CHECKSUMS["mod97-9755"]("123456782"));
ok("...and one digit off fails", !CHECKSUMS["mod97-9755"]("123456783"));
ok("the published German VAT ID DE136695976 passes ISO 7064", CHECKSUMS["iso7064-mod11-10"]("136695976"));
ok("...and the format example DE123456789 does not", !CHECKSUMS["iso7064-mod11-10"]("123456789"));
ok("Luhn accepts the textbook 79927398713", CHECKSUMS.luhn("79927398713"));
ok("...and refuses 79927398710", !CHECKSUMS.luhn("79927398710"));

// ---- validation, country by country -------------------------------------------
const field = (code, key) => definitionFor(code).fields.find((f) => f.key === key);
const accepts = (code, key, v) => valueProblem(field(code, key), v) === "";
const refuses = (code, key, v) => valueProblem(field(code, key), v) !== "";

// Saudi Arabia
ok("SA: a VAT number is 15 digits starting and ending with 3", accepts("SA", "vat_registration_number", "300012345678903"));
ok("SA: ...typed with spaces is the same number", accepts("SA", "vat_registration_number", "3000 1234 5678 903"));
ok("SA: ...one not ending in 3 is refused", refuses("SA", "vat_registration_number", "300012345678901"));
// THE TRANSITION: the Unified National Number replaced branch CRs from
// 03/04/2025, and existing numbers stay valid until 2030.
ok("SA: a Unified National Number starting 7 is accepted", accepts("SA", "commercial_registration_number", "7001234567"));
ok("SA: ...and so is a legacy CR during the transition", accepts("SA", "commercial_registration_number", "1010123456"));
ok("SA: ...but not nine digits", refuses("SA", "commercial_registration_number", "101012345"));
ok("SA: a postal code is five digits", accepts("SA", "national_address_postal_code", "12345") && refuses("SA", "national_address_postal_code", "1234"));
ok("SA: a short address is four letters and four digits", accepts("SA", "national_short_address", "rrrd2929") && refuses("SA", "national_short_address", "RRR2929"));
// United Arab Emirates
ok("AE: a TRN is 15 digits", accepts("AE", "vat_registration_number", "100123456700003") && refuses("AE", "vat_registration_number", "10012345670000"));
ok("AE: a licence expiry is a date", accepts("AE", "trade_licence_expiry", "2027-03-31") && refuses("AE", "trade_licence_expiry", "31/03/2027"));
ok("AE: a trade licence is free text", accepts("AE", "trade_licence_number", "DED-123/456"));
ok("AE: the MoHRE establishment ID for WPS is 13 digits",
  accepts("AE", "mohre_establishment_id", "1234567890123") && refuses("AE", "mohre_establishment_id", "123456789012"));
ok("AE: ...and prints on nothing — it is for the salary file", (field("AE", "mohre_establishment_id").showOn || []).length === 0);
// Jordan
ok("JO: a tax number is 8 to 12 digits", accepts("JO", "tax_number", "12345678") && refuses("JO", "tax_number", "1234567"));
// Egypt
ok("EG: a registration number is 9 digits", accepts("EG", "tax_registration_number", "123-456-789") && refuses("EG", "tax_registration_number", "12345678"));
// United States
ok("US: an EIN is 9 digits, dash or not", accepts("US", "ein", "12-3456789") && accepts("US", "ein", "123456789"));
ok("US: ...and eight is refused", refuses("US", "ein", "12-345678"));
ok("US: a state is two letters", accepts("US", "state_of_formation", "de") && refuses("US", "state_of_formation", "Delaware"));
// United Kingdom
ok("GB: a VAT number passing the check is accepted, with or without GB", accepts("GB", "vat_registration_number", "GB 123 4567 82") && accepts("GB", "vat_registration_number", "123456782"));
ok("GB: ...one failing the check digits is refused as a checksum", valueProblem(field("GB", "vat_registration_number"), "GB123456783") === "checksum");
ok("GB: a Scottish company number is SC and six digits", accepts("GB", "company_number", "SC123456") && refuses("GB", "company_number", "SC12345"));
ok("GB: a PAYE reference keeps its slash", accepts("GB", "paye_reference", "123/AB45678") && refuses("GB", "paye_reference", "123AB45678"));
// Germany
ok("DE: the published VAT ID is accepted", accepts("DE", "vat_registration_number", "DE 136 695 976"));
ok("DE: ...a format-shaped one with a wrong check digit is refused", valueProblem(field("DE", "vat_registration_number"), "DE123456789") === "checksum");
ok("DE: a register number is HRA or HRB and digits", accepts("DE", "register_number", "HRB 12345") && refuses("DE", "register_number", "HRC 12345"));

// A BLANK IS NEVER REFUSED: the Owner fills the section in over time, and a
// save refused for a mandatory field still empty could never be made at all.
ok("a blank mandatory value is not a problem", valueProblem(field("SA", "commercial_registration_number"), "") === "");
ok("normalising strips what the rule strips", normalizeValue(field("GB", "vat_registration_number"), "gb 123-4567-82") === "GB123456782");

// ---- the resolver: the owner's three conditions ---------------------------------
// A value appears only when the country is SELECTED, the field is FILLED, and it
// is APPLICABLE. Anything else is "" — never a placeholder, never an error,
// never a value from another country.
const sa = {
  country: "Saudi Arabia", vatRate: 15,
  officialValues: {
    legal_name_ar: "شركة المثال",
    commercial_registration_number: "7001234567",
    vat_registration_number: "300012345678903",
    national_address_postal_code: "12345",
    tga_transport_licence_number: "TGA-9",
  },
};
ok("a filled, applicable value resolves", official(sa, "commercial_registration_number") === "7001234567");
ok("...normalised under the country's rule",
  official({ ...sa, officialValues: { ...sa.officialValues, vat_registration_number: "3000 1234 5678 903" } }, "vat_registration_number") === "300012345678903");
ok("NO COUNTRY SELECTED: nothing resolves", official({ ...sa, country: "" }, "commercial_registration_number") === "");
ok("A COUNTRY WITH NO DEFINITION: nothing resolves", official({ ...sa, country: "Kenya" }, "commercial_registration_number") === "");
ok("A KEY THIS COUNTRY DOES NOT DEFINE: nothing resolves", official(sa, "ein") === "");
ok("A BLANK VALUE: nothing resolves", official({ ...sa, officialValues: {} }, "commercial_registration_number") === "");
// VAT registration is applicable only to a Studio that charges VAT — a blank
// rate already means "not registered" (shared/vat).
ok("NOT APPLICABLE: a VAT number on a Studio with no VAT rate prints nothing",
  official({ ...sa, vatRate: "" }, "vat_registration_number") === "");
ok("...and prints once a rate is set", official(sa, "vat_registration_number") === "300012345678903");
// A fleet licence applies only when Logistics & Fleet is switched on, and with
// nobody having asked, it is NOT applicable.
ok("NOT APPLICABLE: a fleet licence with nobody saying Logistics is on", official(sa, "tga_transport_licence_number") === "");
ok("...nor with Logistics switched off",
  official(sa, "tga_transport_licence_number", { sectionOn: (k) => k !== "logistics" }) === "");
ok("...and prints with it switched on",
  official(sa, "tga_transport_licence_number", { sectionOn: () => true }) === "TGA-9");
ok("the studio.official(key) shape answers the same", officialResolver(sa)("commercial_registration_number") === "7001234567");
ok("isApplicable says why independently of the value",
  isApplicable({ ...sa, vatRate: "" }, field("SA", "vat_registration_number")) === false);
// A country accepted as a code as well as a stored name.
ok("a two-letter code selects the same definition", official({ ...sa, country: "SA" }, "commercial_registration_number") === "7001234567");

// ---- switching country ----------------------------------------------------------
// VALUES ARE KEYED BY FIELD, so a field both countries define keeps what was
// typed, and one only the old country defines stays stored but never prints.
const switchedToJO = { ...sa, country: "Jordan" };
ok("SA → JO: a field both define keeps its value", official(switchedToJO, "legal_name_ar") === "شركة المثال");
ok("SA → JO: ...a CR both define keeps it, judged by Jordan's rule", official(switchedToJO, "commercial_registration_number") === "7001234567");
ok("SA → JO: a Saudi-only field prints nothing", official(switchedToJO, "national_address_postal_code") === "");
ok("SA → JO: ...but is still stored, and returns on switching back",
  switchedToJO.officialValues.national_address_postal_code === "12345" && official(sa, "national_address_postal_code") === "12345");
// THE CASE THE FORMAT CHECK EXISTS FOR: both countries define a VAT number, and
// a Saudi one kept across a switch to the UK must not print on a UK invoice.
const switchedToGB = { ...sa, country: "United Kingdom" };
ok("SA → GB: A SAUDI VAT NUMBER KEPT ACROSS THE SWITCH NEVER PRINTS AS A UK ONE",
  official(switchedToGB, "vat_registration_number") === "");
ok("SA → GB: every Saudi value absent from the UK's fields",
  Object.keys(officialValuesFor(switchedToGB)).every((k) => definitionFor("GB").fields.some((f) => f.key === k)));

// ---- one official document: a Saudi invoice against a US one ---------------------
// The end-to-end case at the resolver's level: what each country puts on an
// invoice, from its own file, with no code naming either. (Slice B wires this
// into the invoice template itself.)
const saInvoice = officialForDocument(sa, "invoice").map((p) => p.key);
ok("a Saudi invoice carries the Arabic legal name, CR, VAT number and address",
  ["legal_name_ar", "commercial_registration_number", "vat_registration_number", "national_address_postal_code"]
    .every((k) => saInvoice.includes(k)), saInvoice.join(","));
ok("...and nothing it has not filled", !saInvoice.includes("national_address_street"));
const us = { country: "United States", vatRate: "", officialValues: { ein: "123456789", state_of_formation: "DE", state_entity_number: "1234567" } };
ok("A US INVOICE CARRIES NONE OF THE SAUDI FIELDS", officialForDocument(us, "invoice").length === 0);
ok("...even with a Saudi value somehow stored",
  officialForDocument({ ...us, officialValues: { ...us.officialValues, ...sa.officialValues } }, "invoice").length === 0);
ok("...while a US contract carries its state of formation",
  officialForDocument(us, "contract").map((p) => p.key).join(",") === "state_of_formation,state_entity_number");

// ---- printed: the same two invoices, through the real layout and the real fill ---
// SLICE B. What a client actually receives: the starter invoice layout a Studio
// is offered, filled by the same `fillTemplate` the print route runs, with the
// merge values `mergeValuesFor` adds for the official fields. Asserted on the
// printed TEXT, because that is what a tax inspector reads.
{
  const L = await import("@/modules/quality/layouts");
  const { fillTemplate } = await import("@/modules/quality/fill");
  const { documentsDict } = await import("@/shared/studio/documents");
  const P = await import("@/shared/compliance/printing");

  const words = (lang) => ({ ...documentsDict(lang).starter, title: documentsDict(lang).kindTitle("invoice") });
  const textOf = (node) => (node?.text || "") + (node?.content || []).map(textOf).join("\n");
  const print = (studio, lang = "en", legalInfo = []) => {
    const layout = L.starterLayout("invoice", words(lang), legalInfo);
    const values = { "company.name": "Example Co", ...P.officialMergeValues(studio, "invoice", lang, {}) };
    // As mergeValuesFor builds it: the legal rows, less any repeating an official value.
    values["company.legal"] = P.legalRowsBeside(legalInfo, officialForDocument(studio, "invoice"))
      .map((r) => `${r.key}: ${r.value}`).join(" · ");
    const out = fillTemplate(JSON.parse(layout.header), values, {}, { columns: {}, totals: {}, vatAt: () => "", taxableAt: () => "", rtl: lang === "ar" });
    return { text: textOf(out.doc), missing: out.missing, doc: out.doc };
  };

  const saPrinted = print(sa);
  ok("A SAUDI INVOICE PRINTS ITS VAT NUMBER", saPrinted.text.includes("300012345678903"), saPrinted.text);
  ok("...its CR number and Arabic legal name", saPrinted.text.includes("7001234567") && saPrinted.text.includes("شركة المثال"));
  ok("...labelled in the document's language",
    print(sa, "ar").text.includes(field("SA", "vat_registration_number").label.ar));
  ok("...and nothing it did not fill — no empty label, no dash", !/: —|: ·|: $|\[/m.test(saPrinted.text), saPrinted.text);
  ok("...with no placeholder left unresolved", saPrinted.missing.length === 0, saPrinted.missing.join(","));

  const usPrinted = print(us);
  ok("A US INVOICE PRINTS NONE OF IT", !usPrinted.text.includes("300012345678903") && !usPrinted.text.includes("7001234567"));
  ok("...and its letterhead is the company name alone, not a blank line per missing number",
    usPrinted.text.trim() === "Example Co" && usPrinted.doc.content.length === 1, JSON.stringify(usPrinted.doc.content.length));
  ok("...still with no placeholder left unresolved", usPrinted.missing.length === 0, usPrinted.missing.join(","));

  // A LAYOUT WRITTEN IN ONE COUNTRY, PRINTED IN ANOTHER: a Saudi-only field
  // placed on its own still resolves — to nothing — rather than printing its
  // bracketed name on a UK invoice.
  const placed = { type: "doc", content: [{ type: "paragraph", content: [{ type: "mergeField", attrs: { key: "official.zakat_tin", label: "Zakat TIN" } }] }] };
  const inGB = fillTemplate(placed, P.officialMergeValues(switchedToGB, "invoice", "en", {}), {}, { columns: {}, totals: {}, vatAt: () => "", taxableAt: () => "", rtl: false });
  ok("a Saudi-only placeholder printed in the UK is empty, not '[Zakat TIN]'",
    inGB.missing.length === 0 && textOf(inGB.doc) === "", textOf(inGB.doc));

  // NOTHING PRINTS TWICE: a VAT number typed into Legal information before the
  // country's fields existed is dropped where the official one prints…
  const legal = [{ key: "VAT No.", value: "300 0123 4567 8903" }, { key: "Bank", value: "IBAN SA00 0000" }];
  const both = print(sa, "en", legal);
  ok("A VAT NUMBER IN BOTH PLACES PRINTS ONCE", both.text.split(/3000\s?1234\s?5678\s?903|300 0123 4567 8903/).length - 1 === 1, both.text);
  ok("...while a legal row with nothing official beside it still prints", both.text.includes("Bank: IBAN SA00 0000"));
  // …and kept where it does not: no VAT rate, so no official VAT number.
  ok("...and the legal row is kept when the official one does not apply",
    print({ ...sa, vatRate: "" }, "en", legal).text.includes("VAT No.: 300 0123 4567 8903"));

  // SLICE C: THE PAYSLIP'S HEADING reads the same resolver for its kind. A UK
  // employer's PAYE reference is marked for payslips; nothing Saudi is.
  const gb = { country: "United Kingdom", vatRate: 20, officialValues: { paye_reference: "123/AB45678", company_number: "12345678" } };
  ok("a UK payslip carries the PAYE reference", officialForDocument(gb, "payslip").map((p) => p.key).join(",") === "paye_reference");
  ok("...and not the company number, which the file marks for other documents", !officialForDocument(gb, "payslip").some((p) => p.key === "company_number"));
  ok("a Saudi payslip carries no official value", officialForDocument(sa, "payslip").length === 0);

  // THE RECEIPT reads the same resolver for its own kind.
  ok("a Saudi receipt carries the VAT number", officialForDocument(sa, "receipt").some((p) => p.value === "300012345678903"));
  ok("...and a US receipt carries nothing", officialForDocument(us, "receipt").length === 0);
}

// ---- department rules, read from the files (slice D) -----------------------------
{
  const R = await import("@/shared/compliance/rules");
  ok("a file may carry rules and no fields", definitionProblems({ ...base, fields: [], rules: { tax: base.rules.tax } }).length === 0);
  ok("...but not neither", definitionProblems({ ...base, fields: [], rules: undefined }).length > 0);
  ok("a tax method that is neither document nor line is refused",
    definitionProblems({ ...base, rules: { tax: { ...base.rules.tax, method: "sometimes" } } }).length > 0);
  ok("two employment versions from one day are refused",
    definitionProblems({ ...base, rules: { employment: [base.rules.employment[0], base.rules.employment[0]] } }).some((p) => p.includes("two versions")));
  ok("the tax profile comes from the file", R.taxProfileFor("Saudi Arabia").taxName === base.rules.tax.taxName);
  ok("a country whose file has fields and no tax rules gets the default", R.taxProfileFor("United Kingdom").country === "");
  ok("a rules-only country offers no official values", officialValuesFor({ country: "Oman" }) && Object.keys(officialValuesFor({ country: "Oman" })).length === 0);
  ok("...and its tax profile still answers", R.taxProfileFor("Oman").method === "line");
  ok("every employment version is tagged with its country", R.EMPLOYMENT_RULES.every((e) => /^[A-Z]{2}$/.test(e.country)));
  ok("a preset carries no WPS identifier — those are the Studio's own", ["JO", "SA", "AE"].every((c) => R.payPresetFor(c) && !("wps" in R.payPresetFor(c))));
}

// ---- no country's rules in shared code -------------------------------------------
// The constraint the package was built under. A two-letter country code as a
// string literal in the shared modules is the first sign of a rule written into
// code instead of into a definition.
// SLICE D: the department rules left code for the files, so the modules that
// read them are held to the same line — including shared/taxProfile, which held
// a table keyed by country code until 18/09/2026.
const sharedFiles = ["checksums.ts", "definition.ts", "resolve.ts", "printing.ts", "rules.ts", "countries/index.ts"]
  .map((f) => [f, readFileSync(`src/shared/compliance/${f}`, "utf8")])
  .concat([["shared/taxProfile.ts", readFileSync("src/shared/taxProfile.ts", "utf8")]]);
const literal = /["'`](SA|AE|JO|EG|US|GB|DE)["'`]/;
for (const [name, text] of sharedFiles) {
  ok(`${name} names no country`, !literal.test(text), (text.match(literal) || [])[0]);
}

// ---- a wage protection scheme is the country's own, or absent -------------------
// 20/09/2026: the scheme was the UAE's, hardcoded in the HR module and offered
// to every studio. It is a declared block now, and a declaration nothing could
// act on is refused the way a field nothing could fill is.
console.log("\n== a country declares its own wage protection scheme");

const aeDef = definitionFor("AE");
ok("the UAE declares one", Boolean(aeDef.rules.wageProtection));
ok("...naming a field the UAE actually has",
  aeDef.fields.some((f) => f.key === aeDef.rules.wageProtection.employerIdField));
ok("no other country carries one it has not been researched for",
  ["JO", "SA", "EG", "US", "GB", "DE"].every((c) => !definitionFor(c)?.rules?.wageProtection));

const withScheme = (wageProtection) => ({
  code: "ZZ", name: { en: "Z", ar: "ز" }, version: 1, checked: "2026-09-20",
  rules: { wageProtection },
  fields: [{
    key: "some_id", department: "hr", label: { en: "Some id", ar: "رقم" }, hint: { en: "", ar: "" },
    required: "optional", showOn: [], source: { label: "x", status: "uncertain" },
  }],
});
const sound = { system: "WPS", authority: "Ministry", employerIdField: "some_id", employerIdDigits: 10, routingDigits: 6, fileCurrency: "ZZD", checked: "2026-09-20", source: "x" };
ok("a sound declaration is accepted", definitionProblems(withScheme(sound)).length === 0);
ok("a scheme naming a field the country has not got is refused",
  definitionProblems(withScheme({ ...sound, employerIdField: "elsewhere_id" }))
    .some((p) => /employerIdField/.test(p)));
ok("...and one with no identifier lengths is refused, since nothing could judge a value",
  definitionProblems(withScheme({ ...sound, employerIdDigits: 0 }))
    .some((p) => /employerIdDigits/.test(p)));
ok("...and one with no source is refused, like every other rule",
  definitionProblems(withScheme({ ...sound, source: "" })).some((p) => /wageProtection: source/.test(p)));

console.log(fails ? `\nofficial values model: ${fails} FAILED` : "\nofficial values model: all passed");
process.exitCode = fails ? 1 : 0;
