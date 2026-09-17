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

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const cat = M.studioSetupCatalogue();

console.log("\n== what may be asked");

ok("Main is never asked about", !cat.roots.includes("main"));
ok("Tasks is never asked about", !cat.roots.includes("tasks"));
ok("Administration is never asked about — it is Settings, not a department",
  !cat.roots.some((k) => K.isSystemSection(k)));
ok("every other product department is asked about",
  K.PRODUCT_SECTION_DEFS.filter((d) => !["main", "tasks"].includes(d.key)).every((d) => cat.roots.includes(d.key)));
ok("the point of sale is an offered part of CRM & Sales",
  (cat.children["crm-sales"] || []).includes("crm-sales-pos"));
ok("another department's storage is never offered as a part",
  Object.values(cat.children).flat().every((k) => !K.isFiledOnlySection(k)),
  "crm-sales-quotations is filed under CRM & Sales and belongs to Quotations");
ok("a settings page is never offered as a part",
  Object.values(cat.children).flat().every((k) => !k.endsWith("-settings")));

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
ok("...and the two that are never off", r1.roots?.has("main") && r1.roots?.has("tasks"));
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

console.log("\n== the trade rule did not move");

// SECTION_NEEDS gained Quotations -> CRM & Sales. CRM & Sales is universal, so
// no field of work's default may have changed because of it.
for (const field of ["Wholesale & Retail Trade", "Construction & Contracting", "Manufacturing"]) {
  const roots = M.tradeRootsFor(field);
  ok(`${field} still starts with CRM & Sales`, roots?.has("crm-sales"));
}

console.log(fails === 0 ? "\nstudio setup model: all passed\n" : `\nstudio setup model: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
