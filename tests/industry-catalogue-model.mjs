// THE INDUSTRY CATALOGUE, purely. No store, no routes.
//
// THE DEFECT THIS GUARDS: the product asked a company to pick one of twenty-five
// statistical categories, which left the region's commonest companies — general
// trading, facility management, MEP contractors, clinics — with nowhere to go
// (the owner, 29/09/2026). The catalogue replaces the QUESTION, not the setup:
// every specialism starts from one of the twenty-five fields, so these
// assertions hold the join between the two, the alert that moves existing
// studios across, and the words in both languages.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const C = await import("@/shared/industryCatalogue");
const F = await import("@/shared/fieldsOfWork");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the catalogue and the twenty-five fields are one setup");

const specs = C.INDUSTRY_CATALOGUE.flatMap((i) => i.specialisms);
ok("every specialism starts from a real field of work",
  specs.every((s) => F.FIELDS_OF_WORK.includes(s.field)), specs.filter((s) => !F.FIELDS_OF_WORK.includes(s.field)).map((s) => s.key).join(", "));
// A field no specialism uses is a setup nobody can reach any more — its org
// chart, its roles and its flow would be dead code from the day this shipped.
const used = new Set(specs.map((s) => s.field));
const unreached = F.FIELDS_OF_WORK.filter((f) => !used.has(f));
ok("every field of work is still reachable through some specialism", unreached.length === 0, unreached.join(", "));

console.log("\n== keys are published and never collide");

const all = [...C.INDUSTRY_CATALOGUE.map((i) => i.key), ...specs.map((s) => s.key)];
ok("no key is used twice, industry or specialism", new Set(all).size === all.length);
ok("every key is a lowercase slug", all.every((k) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(k)));
ok("'other' is not a catalogue key", !all.includes(C.OTHER_INDUSTRY));

console.log("\n== both languages, every name");

const DIACRITICS = /[ً-ْٰ]/;
const named = [...C.INDUSTRY_CATALOGUE, ...specs];
ok("every name has English and Arabic", named.every((n) => n.en.trim() && n.ar.trim()));
ok("every Arabic name is Arabic", named.every((n) => /[؀-ۿ]/.test(n.ar)));
ok("no Arabic name carries a diacritic", !named.some((n) => DIACRITICS.test(n.ar)));

console.log("\n== choosing a specialism decides the field");

ok("a specialism gives its template", C.fieldForIndustry("mep-contracting") === "Construction & Contracting");
ok("'other' gives the Other field", C.fieldForIndustry(C.OTHER_INDUSTRY) === F.OTHER_FIELD);
ok("an unknown key gives nothing", C.fieldForIndustry("nope") === "" && !C.isIndustryKey("nope"));
ok("a key is named in the reader's language",
  C.industryLabel("clinics", "ar") === "العيادات والمراكز الطبية" && C.industryLabel("clinics", "en") === "Clinics & medical centres");

console.log("\n== the alert for studios still on the old list");

ok("a studio on an old field and no specialism is asked", C.needsIndustry({ fieldOfWork: "Construction & Contracting" }));
ok("...and one on Other is asked too", C.needsIndustry({ fieldOfWork: F.OTHER_FIELD }));
ok("a studio that chose a specialism is not", !C.needsIndustry({ fieldOfWork: "Construction & Contracting", industry: "fit-out" }));
ok("...nor one that chose Something else", !C.needsIndustry({ fieldOfWork: F.OTHER_FIELD, industry: C.OTHER_INDUSTRY }));
// "I'll set this up later" was an answer; the alert does not overrule it.
ok("a studio that skipped the question is not asked", !C.needsIndustry({ fieldOfWork: "" }));
ok("a stale specialism key does not count as chosen", C.needsIndustry({ fieldOfWork: "Manufacturing", industry: "retired-key" }));

// THE SUGGESTION CHANGES NOTHING: accepting it keeps the studio's setup, which
// is what lets the settings screen save it without re-seeding the pool.
const wrong = F.FIELDS_OF_WORK.filter((f) => C.fieldForIndustry(C.suggestedIndustry(f)) !== f);
ok("every old field is offered a specialism with the same setup", wrong.length === 0, wrong.join(", "));
ok("an old Other is offered Something else", C.suggestedIndustry(F.OTHER_FIELD) === C.OTHER_INDUSTRY);

console.log("\n== the picker");

const rows = C.industryOptions("en", "Something else");
ok("the picker lists every specialism, then Something else",
  rows.length === specs.length + 1 && rows.at(-1).value === C.OTHER_INDUSTRY);
ok("every specialism row carries its industry as the heading", rows.slice(0, -1).every((r) => r.group));
ok("the Arabic picker is in Arabic", C.industryOptions("ar", "مجال آخر").every((r) => /[؀-ۿ]/.test(r.label)));

console.log("\n== the website's industry pages");

const IC = await import("@/shared/marketing/industries");
const D = await import("@/shared/marketing/departments");
const live = new Set(D.liveDepartments("en").map((d) => d.key));
const keys = C.INDUSTRY_CATALOGUE.map((i) => i.key);
ok("every industry has a sentence in both languages",
  keys.every((k) => IC.industriesCopy("en").leads[k] && IC.industriesCopy("ar").leads[k]));
ok("...and no sentence for an industry that does not exist",
  ["en", "ar"].every((l) => Object.keys(IC.industriesCopy(l).leads).every((k) => keys.includes(k))));
const badFocus = keys.flatMap((k) => (IC.FOCUS[k] || []).filter((d) => !live.has(d)).map((d) => `${k}:${d}`));
ok("every industry names its departments, and each is a live one",
  keys.every((k) => (IC.FOCUS[k] || []).length > 0) && badFocus.length === 0, badFocus.join(", "));
ok("the Arabic page copy carries no diacritic", !DIACRITICS.test(JSON.stringify(IC.industriesCopy("ar"))));

console.log(fails ? `\nindustry catalogue: ${fails} FAILED` : "\nindustry catalogue: all passed");
process.exit(fails ? 1 : 0);
