// THE INDUSTRY CATALOGUE, purely. No store, no routes.
//
// THE DEFECT THIS GUARDS: the product asked a company to pick one of twenty-five
// statistical categories, which left the region's commonest companies — general
// trading, facility management, MEP contractors, clinics — with nowhere to go
// (the owner, 29/09/2026). The catalogue replaces the QUESTION; each industry
// carries a PROFILE (the sections and org chart a new studio starts with) that
// the console edits, and each specialism still starts from one of the 25 fields
// for what the profile does not decide. These assertions hold the built-in
// list valid, the console's merge honest, and the pickers' switches.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const C = await import("@/shared/industryCatalogue");
const P = await import("@/shared/industryPick");
const F = await import("@/shared/fieldsOfWork");
const K = await import("@/platform/db/keys");
const M = await import("@/modules/main/studios");
const IC = await import("@/shared/marketing/industries");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const built = C.builtInIndustries();
const specs = built.flatMap((i) => i.specialisms);
const roots = M.studioSetupCatalogue().roots;

console.log("\n== every built-in industry is valid as the console would check it");

for (const ind of built) {
  const problems = C.industryProblems(ind, roots, K.ALL_SECTION_KEYS, built);
  ok(`${ind.key} passes the console's own checks`, problems.length === 0, problems.join("; "));
}
const used = new Set(specs.map((s) => s.field));
const unreached = F.FIELDS_OF_WORK.filter((f) => !used.has(f));
ok("every field of work is still reachable through some specialism", unreached.length === 0, unreached.join(", "));
ok("every built-in has a website sentence in both languages", built.every((i) => i.lead.en && i.lead.ar));
ok("every built-in starts with the back office", built.every((i) => C.BACK_OFFICE.every((k) => i.profile.sections.includes(k))));
// The reason profiles exist: the old trade gating switched on 10-18 of 18
// departments for everybody. A profile that grew back to "everything" would
// read on the website as a bank starting with Point of Sale.
ok("no built-in profile switches on every department", built.every((i) => i.profile.sections.length < roots.length),
  built.filter((i) => i.profile.sections.length >= roots.length).map((i) => i.key).join(", "));

console.log("\n== keys are published and never collide");

const all = [...built.map((i) => i.key), ...specs.map((s) => s.key)];
ok("no key is used twice, industry or specialism", new Set(all).size === all.length);
ok("every key is a lowercase slug", all.every((k) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(k)));
ok("'other' is not a catalogue key", !all.includes(P.OTHER_INDUSTRY));
ok("a key is minted from an English name", C.keyFromName("Oil & Gas Services") === "oil-gas-services");

console.log("\n== both languages, every name");

const DIACRITICS = /[ً-ْٰ]/;
const named = [...built, ...specs];
ok("every name has English and Arabic", named.every((n) => n.en.trim() && n.ar.trim()));
ok("no Arabic name or sentence carries a diacritic", !named.some((n) => DIACRITICS.test(n.ar)) && !built.some((i) => DIACRITICS.test(i.lead.ar)));
ok("the website's Arabic chrome carries no diacritic", !DIACRITICS.test(JSON.stringify(IC.industriesCopy("ar"))));

console.log("\n== the console's rows over the built-ins");

const edited = { ...built[0], en: "Construction", locked: true };
const added = { key: "fitness", en: "Fitness", ar: "اللياقة", lead: { en: "", ar: "" }, active: true, locked: false,
  profile: { sections: ["hr", "finance"], departments: [{ name: "Finance", code: "FIN", parent: "", sectionKeys: ["finance"] }] },
  specialisms: [{ key: "gyms", en: "Gyms", ar: "النوادي", field: "Personal & Other Services", active: true }] };
const merged = C.mergeIndustries([edited, added]);
ok("an edited built-in replaces its code version, in place", merged[0].en === "Construction" && merged[0].builtIn && merged.length === built.length + 1);
ok("...and keeps its lock", merged[0].locked === true);
ok("an added industry comes after the built-ins, marked as added", merged.at(-1).key === "fitness" && !merged.at(-1).builtIn);
ok("a stored row is cleaned on the way out", C.mergeIndustries([{ key: "x", en: 5, specialisms: "no" }]).at(-1).specialisms.length === 0);
ok("a specialism key already used by another industry is refused",
  C.industryProblems({ ...added, specialisms: [{ ...added.specialisms[0], key: "clinics" }] }, roots, K.ALL_SECTION_KEYS, merged).some((p) => p.startsWith("specialism-taken")));
ok("a profile naming a section that is not a department is refused",
  C.industryProblems({ ...added, profile: { ...added.profile, sections: ["nope"] } }, roots, K.ALL_SECTION_KEYS, merged).includes("section:nope"));
ok("an org chart with a dangling parent is refused",
  C.industryProblems({ ...added, profile: { ...added.profile, departments: [{ name: "A", code: "A", parent: "Z", sectionKeys: [] }] } }, roots, K.ALL_SECTION_KEYS, merged).some((p) => p.startsWith("department:")));

console.log("\n== picking, and what switching off means");

const cat = P.pickCatalogue(merged);
ok("a specialism gives its template", P.fieldForIndustry(cat, "mep-contracting") === "Construction & Contracting");
ok("'other' gives the Other field", P.fieldForIndustry(cat, P.OTHER_INDUSTRY) === F.OTHER_FIELD);
ok("an unknown key gives nothing and cannot be chosen", P.fieldForIndustry(cat, "nope") === "" && !P.isChoosable(cat, "nope"));

const off = P.pickCatalogue(C.mergeIndustries([{ ...built.find((i) => i.key === "healthcare"), active: false }]));
ok("a switched-off industry cannot be chosen by a new studio", !P.isChoosable(off, "clinics"));
ok("...but a studio that holds it may save it again", P.isChoosable(off, "clinics", "clinics"));
ok("...and it is not offered", !P.industryOptions(off, "en", "Other").some((o) => o.value === "clinics"));
ok("...unless it is the studio's own answer", P.industryOptions(off, "en", "Other", "clinics").some((o) => o.value === "clinics"));
ok("...and it is never suggested", P.suggestedIndustry(off, "Healthcare & Social Services") !== "clinics");

console.log("\n== the alert for studios still on the old list");

ok("a studio on an old field and no specialism is asked", P.needsIndustry({ fieldOfWork: "Construction & Contracting" }));
ok("a studio that chose a specialism is not", !P.needsIndustry({ fieldOfWork: "Construction & Contracting", industry: "fit-out" }));
ok("a studio that skipped the question is not asked", !P.needsIndustry({ fieldOfWork: "" }));
const wrong = F.FIELDS_OF_WORK.filter((f) => P.fieldForIndustry(cat, P.suggestedIndustry(cat, f)) !== f);
ok("every old field is offered a specialism with the same setup", wrong.length === 0, wrong.join(", "));

console.log("\n== what the create screen pre-fills");

const setup = M.studioSetupScreen("en", merged);
ok("each specialism pre-fills its industry's profile", setup.suggestedByIndustry["mep-contracting"].every((k) => merged[0].profile.sections.includes(k) || ["main", "approvals", "crm-sales", "assets"].includes(k)));
ok("the create screen is handed the console's list, not the code's", setup.industries.some((i) => i.key === "fitness"));
const rows = P.industryOptions(cat, "en", "Something else");
ok("every picker row carries its industry as the heading", rows.slice(0, -1).every((r) => r.group));

console.log("\n== history: what a change did, and putting a version back");

const v1 = built.find((i) => i.key === "healthcare");
const v2 = { ...v1, active: false, profile: { ...v1.profile, sections: [...v1.profile.sections, "pos"] },
  specialisms: [...v1.specialisms.map((s) => (s.key === "clinics" ? { ...s, en: "Clinics" } : s)), { key: "dental", en: "Dental", ar: "طب الأسنان", field: "Healthcare & Social Services", active: true }] };
const said = C.describeChange(v1, v2);
ok("a change is said in words: switched off", said.includes("Switched off"));
ok("...a section added, by key", said.includes("Sections added: pos"));
ok("...a specialism added and one renamed", said.includes("Specialisms added: Dental") && said.includes("Specialisms edited: Clinics"));
ok("nothing moved says nothing", C.describeChange(v1, structuredClone(v1)).length === 0);
ok("an industry that did not exist before was added", C.describeChange(null, v1)[0] === "Added");

// Putting v1 back while v2 is live: the specialism added in v2 may already be
// a studio's answer, so it stays — switched off — and the lock is not restored.
const back = C.restoredVersion({ ...v1, locked: true }, v2);
ok("restoring keeps a specialism added since, switched off",
  back.specialisms.some((s) => s.key === "dental" && s.active === false));
ok("...puts the old names and switches back", back.active === true && back.specialisms.find((s) => s.key === "clinics").en === v1.specialisms.find((s) => s.key === "clinics").en);
ok("...and arrives unlocked", back.locked === false);
ok("...and still passes the console's checks", C.industryProblems(back, roots, K.ALL_SECTION_KEYS, built).length === 0);

console.log(fails ? `\nindustry catalogue: ${fails} FAILED` : "\nindustry catalogue: all passed");
process.exit(fails ? 1 : 0);
