// CHOOSING DEPARTMENTS AT CREATION, purely. No store, no routes.
//
// THE DEFECT THIS GUARDS: a studio opened onto every department its field of
// work could conceivably touch, and a field of work is a blunt instrument — two
// companies in the same trade can share almost nothing. The create screen now
// asks the owner, and these assertions hold the three things that make the
// answer trustworthy: the screen and the route agree on what may be asked, a
// dependency is never left behind, and an answer the screen could not have sent
// is refused rather than quietly turned into a different studio.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const T = await import("@/shared/tradeSections");
const M = await import("@/modules/main/studios");
const K = await import("@/platform/db/keys");
const F = await import("@/shared/fieldsOfWork");
const A = await import("@/platform/access/resolve");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const cat = M.studioSetupCatalogue();

console.log("\n== what may be asked");

ok("Main is never asked about", !cat.roots.includes("main"));
ok("Approvals is never asked about — every studio has it", !cat.roots.includes("approvals"));
ok("Administration is never asked about — it is Settings, not a department",
  !cat.roots.some((k) => K.isSystemSection(k)));
// READ FROM NEVER_GATED_KEYS, never a hand-typed copy: a copy of that list went
// red the day Approvals joined it, for saying Approvals should be asked about.
ok("every other product department is asked about",
  K.PRODUCT_SECTION_DEFS.filter((d) => !T.NEVER_GATED_KEYS.includes(d.key)).every((d) => cat.roots.includes(d.key)));
// POINT OF SALE IS ITS OWN DEPARTMENT since 17/09/2026: asked about as a root,
// its sales list and shift history offered as its parts, and its old row under
// CRM & Sales (where the receipts are filed) offered nowhere.
ok("the point of sale is a department of its own", cat.roots.includes("pos"));
ok("...whose sales list and shift history are offered parts",
  ["pos-sales", "pos-shifts"].every((k) => (cat.children.pos || []).includes(k)));
ok("...and its filed row is no longer offered under CRM & Sales",
  !(cat.children["crm-sales"] || []).includes("crm-sales-pos"));
ok("another department's storage is never offered as a part",
  Object.values(cat.children).flat().every((k) => !K.isFiledOnlySection(k)),
  "crm-sales-quotations is filed under CRM & Sales and belongs to Quotations");
ok("a settings page is never offered as a part",
  Object.values(cat.children).flat().every((k) => !k.endsWith("-settings")));

// EVERY PART A DEPARTMENT HAS IS OFFERED UNLESS SOMETHING NAMES A REASON.
//
// The three assertions above are all NEGATIVE — they hold that the wrong rows
// stay out, and nothing held that the right ones come in. A filter widening by
// accident, or a sub-section whose key happens to match one, would drop a real
// screen from the question list and the owner would never learn the part
// existed: there is no empty row to notice, only one fewer tick box.
//
// So each unoffered child must be one of the four kinds the catalogue means to
// drop, re-derived here from the primitives rather than read back out of the
// catalogue's own filter. Anything else is a part that has gone missing.
const unoffered = [];
for (const d of K.PRODUCT_SECTION_DEFS.filter((x) => cat.roots.includes(x.key))) {
  const offered = cat.children[d.key] || [];
  for (const c of d.children || []) {
    if (offered.includes(c.key)) continue;
    const reason = K.isFiledOnlySection(c.key) ? "filed-only"
      : K.isSystemSection(c.key) ? "system"
      : (A.NO_SCREEN_YET || []).includes(c.key) ? "no-screen"
      : c.key.endsWith("-settings") ? "settings"
      : "";
    unoffered.push({ ...c, root: d.key, reason });
  }
}
ok("every part left out of the question list has a reason",
  unoffered.every((c) => c.reason),
  unoffered.filter((c) => !c.reason).map((c) => `${c.root}/${c.key}`).join(", ") || "nothing unaccounted for");

// AND A SETTINGS PAGE IS RECOGNISED BY TWO INDEPENDENT THINGS — its key and its
// declared name. The SUFFIX is what the catalogue filters on, so a work screen
// named `<department>-settings` would be dropped silently and this is the only
// thing that would say so; the name a studio actually reads is the second
// opinion. Every settings row in the tree carries "settings" in its name today,
// `engineering-docs-settings` ("Quotation settings") included.
ok("a part dropped for being a settings page says so in its own name",
  unoffered.filter((c) => c.reason === "settings").every((c) => /settings/i.test(c.name || "")),
  unoffered.filter((c) => c.reason === "settings" && !/settings/i.test(c.name || ""))
    .map((c) => `${c.key} is named "${c.name}"`).join(", ") || "all named as settings");

console.log("\n== the screen's payload");

const screen = M.studioSetupScreen("en");
ok("one entry per askable department", screen.departments.length === cat.roots.length);
ok("names come in the reader's language",
  M.studioSetupScreen("ar").departments.find((d) => d.key === "hr")?.name === "الموارد البشرية");
ok("a department says what it brings with it",
  screen.departments.find((d) => d.key === "maintenance")?.needs.includes("assets"));
// A FIELD THAT SUGGESTS NOTHING SUGGESTS EVERYTHING — what such a studio got
// before the screen existed. The owner narrows it; the product does not guess.
ok("no field of work suggests every department", screen.suggested[""].length === cat.roots.length);
ok("\"Other\" suggests every department", screen.suggested.Other.length === cat.roots.length);
ok("a real field of work suggests fewer", screen.suggested["Wholesale & Retail Trade"].length < cat.roots.length,
  screen.suggested["Wholesale & Retail Trade"].join(", "));
ok("the suggestion is the same answer the trade rule gives",
  screen.suggested["Wholesale & Retail Trade"].every((k) => M.tradeRootsFor("Wholesale & Retail Trade").has(k)));

console.log("\n== dependencies follow");

ok("Maintenance brings Assets", T.withNeeds(["maintenance"]).has("assets"));
ok("Quotations brings CRM & Sales, where clients are kept", T.withNeeds(["quotations"]).has("crm-sales"));
ok("a department with no needs brings nothing", T.withNeeds(["hr"]).size === 1);

const r1 = T.resolveSectionChoice({ roots: ["maintenance", "hr"] }, cat);
ok("a choice resolves", !r1.error, JSON.stringify(r1));
ok("...adding what the choice needs", r1.roots?.has("assets"));
ok("...and the two that are never off", r1.roots?.has("main") && r1.roots?.has("approvals"));
ok("...and nothing else", r1.roots && !r1.roots.has("crm-sales") && !r1.roots.has("projects"));

console.log("\n== parts inside a department");

const r2 = T.resolveSectionChoice({ roots: ["crm-sales"], offChildren: ["crm-sales-pipeline", "crm-sales-contracts"] }, cat);
ok("a department can be on with some of its parts off",
  !r2.error && r2.offChildren.has("crm-sales-pipeline") && r2.offChildren.has("crm-sales-contracts"));
// Unticked inside a department later answered "no": the screen keeps it, and
// it is not a disagreement worth refusing.
const r3 = T.resolveSectionChoice({ roots: ["hr"], offChildren: ["crm-sales-pipeline"] }, cat);
ok("a part switched off under a department that is off is dropped, not refused",
  !r3.error && r3.offChildren.size === 0);

console.log("\n== refused rather than corrected");

ok("an unknown department is refused",
  T.resolveSectionChoice({ roots: ["hr", "made-up"] }, cat).error === "sections-invalid");
ok("Main is not a choice, so naming it is refused",
  T.resolveSectionChoice({ roots: ["main"] }, cat).error === "sections-invalid");
ok("an unknown part is refused",
  T.resolveSectionChoice({ roots: ["hr"], offChildren: ["hr-made-up"] }, cat).error === "sections-invalid");
ok("a settings page is not a part, so naming it is refused",
  T.resolveSectionChoice({ roots: ["finance"], offChildren: ["finance-settings"] }, cat).error === "sections-invalid");
ok("roots that are not a list are refused",
  T.resolveSectionChoice({ roots: "hr" }, cat).error === "sections-invalid");
ok("a body that is not an object is refused",
  T.resolveSectionChoice("hr", cat).error === "sections-invalid");
// AN EMPTY SIDEBAR IS THE SHOCK FROM THE OTHER SIDE.
ok("choosing no department at all is refused",
  T.resolveSectionChoice({ roots: [] }, cat).error === "sections-empty");

console.log("\n== every department some trade actually starts with");

// A DEPARTMENT NO TRADE EVER PRE-TICKS IS A QUESTION NOBODY IS HELPED WITH.
//
// The trade only pre-fills the answers, so a root missing from the trade rules
// is still ASKED about and can still be ticked — which is why nothing failed
// today and why this went unnoticed as a class. What it costs is the point of
// the screen: the department is off by default for all twenty-five trades,
// including the ones that live by it, and the owner has to know to go and find
// it.
//
// THE WAY IN IS `tradeSections.ts`, three of them: an action resolves to it
// (ACTION_SECTION), it is on some trade's flow spine, or every company needs it
// (UNIVERSAL_SECTION_KEYS — which is how Marketing arrived on 19/09/2026, no
// service action being marketing). A new department that touched none of the
// three is what this catches.
//
// REAL TRADES ONLY. An unknown trade suggests every department, so counting it
// would satisfy this assertion for a root nothing knows about — the single case
// it exists to find.
const preTicked = Object.fromEntries(cat.roots.map((k) => [k, 0]));
for (const field of F.FIELDS_OF_WORK) {
  const on = M.tradeRootsFor(field);
  if (!(on instanceof Set) || on.size === 0) ok(`${field} resolves to a real set of departments`, false);
  for (const key of cat.roots) if (on?.has(key)) preTicked[key] += 1;
}
const orphans = cat.roots.filter((k) => preTicked[k] === 0);
const rarest = [...cat.roots].sort((a, b) => preTicked[a] - preTicked[b])[0];
ok("every department asked about is one some trade starts with", orphans.length === 0,
  orphans.length
    ? `pre-ticked by no trade: ${orphans.join(", ")}`
    : `least common is ${rarest} at ${preTicked[rarest]}/${F.FIELDS_OF_WORK.length}`);
// MARKETING IS WHAT PROVED THE GAP WAS REACHABLE — declared 19/09/2026 with no
// action that could turn it on, so it is universal BY HAND. Named here because
// losing it reads as a trade-rules change rather than as a missing department.
ok("Marketing is a department every trade starts with",
  preTicked.marketing === F.FIELDS_OF_WORK.length,
  `${preTicked.marketing}/${F.FIELDS_OF_WORK.length}`);

console.log("\n== the trade rule did not move");

// SECTION_NEEDS gained Quotations -> CRM & Sales. CRM & Sales is universal, so
// no field of work's default may have changed because of it.
for (const field of ["Wholesale & Retail Trade", "Construction & Contracting", "Manufacturing"]) {
  const roots = M.tradeRootsFor(field);
  ok(`${field} still starts with CRM & Sales`, roots?.has("crm-sales"));
}

console.log(fails === 0 ? "\nstudio setup model: all passed\n" : `\nstudio setup model: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
