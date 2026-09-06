// THE ORG CHART, PURELY. No store, no routes, no fixtures.
//
// Two pure modules are under test and they carry very different weight.
//
//   shared/departments/tree      decides WHOSE records a manager may read.
//                                `subtreeIds` is what the `department` access
//                                scope resolves against, so a wrong answer here
//                                is a permission bug wearing a data-shape
//                                costume. Every assertion below that mentions a
//                                walk is really about that.
//   shared/departments/starters  the seeded chart per field of work. Its
//                                failures are silent by construction — a
//                                duplicate code half-writes a chart, a dangling
//                                parent reads as TOP LEVEL and therefore as
//                                more visibility, and an unknown section key
//                                renders as "handles nothing".
//
// The store-backed half — seeding once, refusing a cycle at the door, refusing
// a delete while people stand in it — is asserted in the integration suite,
// because those are route and repository behaviours rather than arithmetic.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const T = await import("@/shared/departments/tree");
const S = await import("@/shared/departments/starters");
const { ALL_SECTION_KEYS } = await import("@/platform/db/keys");
const { FIELDS_OF_WORK } = await import("@/shared/fieldsOfWork");
const M = await import("@/shared/departments/migrate");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// A small chart, three levels deep, plus two rows that exist to be awkward.
//
//   ops ─┬─ site ─── crew
//        └─ workshop
//   fin
//   orphan (parent points at a department that was deleted)
const CHART = [
  { id: "ops", parentId: "", name: "Operations" },
  { id: "site", parentId: "ops", name: "Site Execution" },
  { id: "crew", parentId: "site", name: "Crew" },
  { id: "workshop", parentId: "ops", name: "Workshop" },
  { id: "fin", parentId: "", name: "Finance" },
  { id: "orphan", parentId: "deleted_dep", name: "Orphan" },
];

console.log("\n== the walk the access scope depends on");

const ids = (set) => [...set].sort().join(",");

ok("a manager sees their own department", T.subtreeIds(CHART, "site").has("site"));
// THE DEFECT THIS GUARDS. Before the register was stored, `department` scope
// compared two departmentId strings, which on the derived model meant "the same
// SECTION" — an Operations Manager with three teams under them saw none of the
// three. Anything that reduces this back to an equality reproduces it.
ok("...and everybody underneath, to the bottom",
  ids(T.subtreeIds(CHART, "ops")) === "crew,ops,site,workshop");
ok("a leaf is just itself", ids(T.subtreeIds(CHART, "crew")) === "crew");
ok("a sibling's people are not theirs", !T.subtreeIds(CHART, "site").has("workshop"));
ok("nor is the parent's", !T.subtreeIds(CHART, "site").has("ops"));

// THE DIRECTION OF THE MISTAKE IS CHOSEN. An id naming nothing must not read as
// "everything" — the failure mode of a wrong answer here is showing somebody
// records they may not read.
ok("an unplaced person is scoped to nothing, not to everything",
  T.subtreeIds(CHART, "").size === 0 && T.subtreeIds(CHART, "no_such_dep").size === 0);

console.log("\n== data that should not exist, and must not hang a permission check");

// A cycle can reach the store despite the guard — a half-run migration, a
// restore. The walk runs INSIDE the function that decides what a person may
// see, so looping here is a hang on the read path.
const CYCLIC = [
  { id: "a", parentId: "b" },
  { id: "b", parentId: "a" },
  { id: "c", parentId: "a" },
];
ok("a stored cycle terminates rather than looping",
  ids(T.subtreeIds(CYCLIC, "a")) === "a,b,c");
ok("depth on a cycle terminates too", T.depthOf(CYCLIC, "a") > 0);

// A dangling parent must read as TOP LEVEL rather than dropping out of every
// walk: a department nobody can see is a department nobody can fix.
ok("a department whose parent was deleted is still listed",
  T.orderedTree(CHART).some((d) => d.id === "orphan"));
ok("...at the top level, not hidden",
  T.orderedTree(CHART).find((d) => d.id === "orphan").depth === 0);

console.log("\n== refusing a loop at the door");

ok("a department may not be its own parent", T.wouldCycle(CHART, "ops", "ops"));
ok("nor report into its own child", T.wouldCycle(CHART, "ops", "site"));
ok("nor into a grandchild", T.wouldCycle(CHART, "ops", "crew"));
ok("moving under a sibling is fine", !T.wouldCycle(CHART, "workshop", "site"));
ok("promoting to the top is fine", !T.wouldCycle(CHART, "crew", ""));

console.log("\n== depth, which is what keeps the walk bounded");

ok("a top-level department is depth 1", T.depthOf(CHART, "ops") === 1);
ok("three levels reads as 3", T.depthOf(CHART, "crew") === 3);
ok("the cap is four", T.MAX_DEPARTMENT_DEPTH === 4);

console.log("\n== tree order, which the screen indents by");

const order = T.orderedTree(CHART).map((d) => `${d.id}@${d.depth}`);
// `depth` here is the INDENT level (0-based), not depthOf's 1-based ancestry
// count. The two are different questions and the tree module says so; asserting
// both shapes is what stops somebody "fixing" one to match the other.
ok("a parent is drawn before its children",
  order.indexOf("ops@0") < order.indexOf("site@1")
  && order.indexOf("site@1") < order.indexOf("crew@2"),
  order.join(" "));
ok("a top-level row indents by 0 and counts as depth 1",
  T.orderedTree(CHART).find((d) => d.id === "ops").depth === 0 && T.depthOf(CHART, "ops") === 1);
ok("every row is drawn exactly once", order.length === CHART.length, order.join(" "));

console.log("\n== the seeded charts");

const problems = S.departmentSeedProblems(ALL_SECTION_KEYS);
ok("no seeded chart is malformed", problems.length === 0, problems.join(" | "));

// EVERY FIELD OF WORK HAS ONE. The dropdown on /administration-settings is
// FIELDS_OF_WORK; a field with no starter chart seeds an empty register and the
// studio meets the blank-grid problem STARTER_ROLES exists to avoid.
const missing = FIELDS_OF_WORK.filter((f) => S.departmentsForField(f).length === 0);
ok("every field of work on the settings screen has a starter chart",
  missing.length === 0, missing.join(", "));

// THE KEY IS THE DISPLAY STRING. `studio.fieldOfWork` stores what the dropdown
// showed, so a starter keyed to anything else reaches no studio at all — the
// same class of bug as the four label mismatches between fieldsOfWork.ts and
// platform/engagement/industries.ts.
const unknown = Object.keys(S.DEPARTMENT_STARTERS).filter((f) => !FIELDS_OF_WORK.includes(f));
ok("...and no starter chart is keyed to a field that does not exist",
  unknown.length === 0, unknown.join(", "));

// `Other` is a real answer on that screen and seeds nothing, mirroring
// actionsForField. Inventing a chart would be the product guessing at a trade.
ok("Other seeds nothing", S.departmentsForField("Other").length === 0);
ok("an unknown trade seeds nothing", S.departmentsForField("Beekeeping").length === 0);

// A FRESH ARRAY EVERY CALL. The seeder mutates its own copy while resolving
// parent codes to ids; handing out the frozen constant by reference is one
// careless map away from the studio's register.
const a = S.departmentsForField("Construction & Contracting");
a[0].name = "MUTATED";
ok("a caller cannot mutate the constant",
  S.departmentsForField("Construction & Contracting")[0].name !== "MUTATED");

console.log("\n== what a seeded chart is not allowed to be");

for (const field of FIELDS_OF_WORK) {
  const seeds = S.departmentsForField(field);
  // Every chart needs somewhere to put the people who are not on the operating
  // line, or a studio's first act is inventing Finance by hand.
  const hasBackOffice = seeds.some((d) => d.code === "FIN") && seeds.some((d) => d.code === "HR");
  if (!hasBackOffice) { ok(`${field} has a back office`, false); break; }
}
ok("every chart carries Finance and HR", true);

// The picker excludes main, tasks and the four sections that render nothing —
// which is exactly the sixteen-entry list the derived model offered. A seed
// naming one of those would put it straight back.
const DEAD = new Set(["main", "tasks", "manufacturing", "assets", "reports", "quality-hse"]);
const seedsDead = FIELDS_OF_WORK.flatMap((f) => S.departmentsForField(f))
  .flatMap((d) => d.sectionKeys)
  .filter((k) => DEAD.has(k));
// Manufacturing, Assets, Quality & HSE and Reports have no screen TODAY, and
// the seeds name them anyway where the trade genuinely works there — a factory
// has a Production department whatever the nav can currently draw. What must
// never appear is main or tasks, which are not departments in any studio.
const seedsNotADepartment = FIELDS_OF_WORK.flatMap((f) => S.departmentsForField(f))
  .flatMap((d) => d.sectionKeys)
  .filter((k) => k === "main" || k === "tasks");
ok("no seeded department claims to work in Main",
  !seedsNotADepartment.includes("main"), seedsNotADepartment.join(", "));
ok("...or in Tasks, which is a control rather than a section",
  !seedsNotADepartment.includes("tasks"), seedsNotADepartment.join(", "));
console.log(`  note  ${seedsDead.length} seeded links name a section with no screen yet (expected: they arrive with the screen)`);

console.log("\n== the migration off section keys");

// THIS RUNS ONCE, AGAINST LIVE DATA, BY SOMEBODY WHO CANNOT UNDO IT — which
// is exactly why the deciding half is pure and asserted here rather than
// discovered by running the CLI twice against a database and squinting.
//
// The state it migrates: while departments were derived from the nav,
// `departmentId` on a collaborator held a SECTION KEY. Every one of those
// now names nothing.
const SECTION_NAMES = {
  "crm-sales": "CRM & Sales",
  projects: "Projects",
  hr: "Human Resources",
};

const legacyPeople = [
  { id: "c1", departmentId: "crm-sales" },
  { id: "c2", departmentId: "crm-sales" },
  { id: "c3", departmentId: "projects" },
  { id: "c4", departmentId: "" },
  { id: "c5" },
];

const first = M.departmentMigrationPlan({
  people: legacyPeople, departments: [], sectionNames: SECTION_NAMES,
});

ok("one department per distinct legacy value, not one per person",
  first.create.length === 2, JSON.stringify(first.create.map((c) => c.key)));
ok("...named after the section people were filed under",
  first.create[0].name === "CRM & Sales", JSON.stringify(first.create[0]));
ok("...carrying that section key, so the link survives the move",
  JSON.stringify(first.create[0].sectionKeys) === JSON.stringify(["crm-sales"]));
ok("everybody holding a legacy value moves", first.moving.length === 3,
  first.moving.join(","));

// THE UNPLACED STAY UNPLACED. Filing them somewhere would be the script
// inventing an org chart fact nobody stated, and it is the one thing a
// migration cannot be asked to guess.
ok("a blank departmentId is left alone",
  !first.moving.includes("c4") && !first.moving.includes("c5"), first.moving.join(","));

console.log("\n== running it twice");

// Idempotence BY CONSTRUCTION rather than by a flag: the legacy set is
// defined as the values that are not department ids, so a person who has
// been re-pointed cannot appear in it again. Asserted, because "it should be
// idempotent" written in a comment has never stopped anything.
const migrated = [
  { id: "dep_sales", name: "CRM & Sales", sectionKeys: ["crm-sales"] },
  { id: "dep_proj", name: "Projects", sectionKeys: ["projects"] },
];
const settledPeople = [
  { id: "c1", departmentId: "dep_sales" },
  { id: "c2", departmentId: "dep_sales" },
  { id: "c3", departmentId: "dep_proj" },
  { id: "c4", departmentId: "" },
  { id: "c5" },
];
const second = M.departmentMigrationPlan({
  people: settledPeople, departments: migrated, sectionNames: SECTION_NAMES,
});
ok("a second run plans nothing at all", M.planIsEmpty(second), JSON.stringify(second));

// A HALF-RUN MIGRATION IS THE REALISTIC FAILURE, not a clean one: the process
// dies, or somebody Ctrl-Cs it. What is left must be resumable, and the
// people already moved must not move twice.
const halfway = M.departmentMigrationPlan({
  people: [
    { id: "c1", departmentId: "dep_sales" },
    { id: "c3", departmentId: "projects" },
  ],
  departments: [migrated[0]],
  sectionNames: SECTION_NAMES,
});
ok("a half-run migration resumes on what is left",
  halfway.moving.length === 1 && halfway.moving[0] === "c3", JSON.stringify(halfway.moving));
ok("...and does not touch what already moved",
  !halfway.moving.includes("c1"), JSON.stringify(halfway.moving));

console.log("\n== what it must not duplicate");

// A studio that edited its register between runs — or ran the CLI, then
// created the department by hand — must not end up with two rows for one
// team. Matching on the SECTION KEY and on the NAME is what covers both.
// THIS ASSERTION USED TO EXPECT THE OPPOSITE, and it was wrong in the
// dangerous direction. Reusing any department that merely NAMES the section
// silently absorbs people: five seeded departments claim "crm-sales" across the
// starter charts, so a contractor's CRM & Sales people would have landed in
// Business Development, invisibly, on any studio whose register had been seeded
// first — which is the default order, because the register seeds the first time
// anybody opens HR.
const byKey = M.departmentMigrationPlan({
  people: [{ id: "c1", departmentId: "crm-sales" }],
  departments: [{ id: "dep_x", name: "Business Development", sectionKeys: ["crm-sales"] }],
  sectionNames: SECTION_NAMES,
});
ok("a seeded department that merely names the section does NOT absorb people",
  byKey.create.length === 1 && byKey.create[0].name === "CRM & Sales",
  JSON.stringify(byKey));
ok("...so the studio can see both and merge them deliberately",
  Object.keys(byKey.reuse).length === 0, JSON.stringify(byKey.reuse));

const byName = M.departmentMigrationPlan({
  people: [{ id: "c1", departmentId: "crm-sales" }],
  departments: [{ id: "dep_y", name: "CRM & Sales", sectionKeys: [] }],
  sectionNames: SECTION_NAMES,
});
ok("a department under the section's exact name IS reused, so a half-run resumes",
  byName.create.length === 0 && byName.reuse["crm-sales"] === "dep_y", JSON.stringify(byName));

// A section can be renamed or removed after people were filed under it. The
// value is carried through under its own name rather than dropped: visible
// and fixable beats silently vanished.
const orphanKey = M.departmentMigrationPlan({
  people: [{ id: "c1", departmentId: "a-section-that-went-away" }],
  departments: [],
  sectionNames: SECTION_NAMES,
});
ok("a legacy value with no section survives under its own name",
  orphanKey.create[0]?.name === "a-section-that-went-away", JSON.stringify(orphanKey.create));
ok("...and claims no section link it cannot justify",
  JSON.stringify(orphanKey.create[0]?.sectionKeys) === "[]", JSON.stringify(orphanKey.create));

// THE THING IT IS FORBIDDEN TO DO. Mapping "projects" people onto Site
// Execution because the studio builds things would be a guess nobody can see
// happening and nobody can undo. The plan names sections, never starters.
const starterNames = new Set(S.departmentsForField("Construction & Contracting").map((d) => d.name));
ok("the plan never invents a starter department",
  !first.create.some((c) => starterNames.has(c.name)),
  first.create.map((c) => c.name).join(", "));
console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
