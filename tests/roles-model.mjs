// THE ROLE MODEL, PURELY. No store, no routes, no fixtures.
//
// Everything asserted here is arithmetic over values, which is why it runs in a
// second and needs no database. That matters more than usual on this branch:
// the Postgres pool is shared with two other sessions and has been dropping
// connections all night, so the fast inner loop deliberately does not touch it.
// The store-backed half — a role created inside a department, a library add
// copying permissions — lives in tests/suite.mjs where it belongs.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const R = await import("@/modules/people/roles");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== a role remembers its department");

const cleaned = R.cleanRole({ name: "Site Engineer", departmentId: "dep_x", source: "library" });
ok("a role keeps the department it was created in", cleaned.departmentId === "dep_x", JSON.stringify(cleaned.departmentId));
ok("...and where it came from", cleaned.source === "library", JSON.stringify(cleaned.source));

// A ROLE WITH NO DEPARTMENT IS STUDIO-WIDE, not invalid. Admin is one, and is
// the only one a studio is seeded with.
const wide = R.cleanRole({ name: "Admin" });
ok("a role with no department is studio-wide", wide.departmentId === "", JSON.stringify(wide.departmentId));
ok("...and defaults to custom rather than claiming a library origin",
  wide.source === "custom", JSON.stringify(wide.source));

// An invented source must not be stored: the field decides how the screen
// treats the row, and a third value would mean neither of the two things it can
// mean. The same reasoning as `cleanScopes` dropping a scope the area does not
// declare — a stored value nothing reads is worse than no value.
const bogus = R.cleanRole({ name: "X", source: "imported" });
ok("an unknown source falls back to custom", bogus.source === "custom", JSON.stringify(bogus.source));

// cleanRole is the door every write goes through, so a caller cannot smuggle
// a wildcard in on the body — that was true before this change and must stay
// true after it.
ok("no caller can mint a second wildcard through the body",
  R.cleanRole({ name: "Sneaky", wildcard: true }).wildcard === false);

console.log("\n== the eleven archetypes");

const A = await import("@/modules/people/archetypes");
const { ALL_PERMISSIONS, AREAS } = await import("@/platform/access");

ok("there are eleven", A.ARCHETYPES.length === 11, String(A.ARCHETYPES.length));

// EVERY KEY MUST BE REAL, and this is the whole argument for eleven sets
// rather than 2,900. The catalogue has moved twelve times in this repo's life
// and moved again while the spec was being written; with eleven sets a move is
// visible here, with 2,900 it would be silent.
const known = new Set(ALL_PERMISSIONS);
const strays = A.ARCHETYPES.flatMap((a) => A.permissionsFor(a.id).filter((k) => !known.has(k)));
ok("every archetype names only real permission keys", strays.length === 0, strays.join(", "));
ok("archetypeProblems agrees", A.archetypeProblems(ALL_PERMISSIONS).length === 0,
  A.archetypeProblems(ALL_PERMISSIONS).slice(0, 3).join(" | "));

// THE OTHER DIRECTION, which nothing checked until it had already gone wrong
// twice. `archetypeProblems` asserts every key an archetype NAMES exists; it
// says nothing about whether every key the catalogue OFFERS is named by
// somebody. Both holes below were found by a second session reading the model
// rather than by any test here.
//
// KEYS THE LADDER CANNOT REACH. `keysForLevel` walks an area's `verbs`, and
// VERBS is exactly view/create/edit/delete. Everything else — approve, pay,
// salary, lock, publish — lives in `area.extra`, so an archetype built only
// from [key, level] holds none of it. principal was built exactly that way and
// held 0 of 21, which left the approval chains unwalkable by any library role.
const EXTRA_KEYS = AREAS.flatMap((a) => (a.extra || []).map((x) => `${a.key}.${x.key}`));
const principal = new Set(A.permissionsFor("principal"));
const principalMissing = EXTRA_KEYS.filter((k) => !principal.has(k));
ok("principal holds every extra the catalogue offers", principalMissing.length === 0,
  principalMissing.slice(0, 4).join(", "));

// SHRINK-ONLY, exactly like the lint budget, and for the same reason: an
// exemption list has to be maintained and argued with, a number only has to go
// down. Both ceilings are what the model measures TODAY, and both residues are
// deliberate rather than accidental — which is why they are allowed to sit
// here rather than being driven to zero.
//
// A new area or a new extra covered by nothing but principal pushes one of
// these over and fails the build, which is the pressure the guard exists to
// apply. If the residue is genuinely right, lower nothing and say why here.
const nonPrincipal = new Set(
  A.ARCHETYPES.filter((a) => a.id !== "principal").flatMap((a) => A.permissionsFor(a.id)),
);

// The nine are every *.settings area plus the three administration ones:
// configuring a department and deciding who may do what are administrative
// acts, not jobs a trade has a title for.
const PRINCIPAL_ONLY_AREAS = 9;
const lonelyAreas = AREAS
  .map((a) => a.key)
  .filter((key) => ![...nonPrincipal].some((k) => k.startsWith(`${key}.`)));
ok(`at most ${PRINCIPAL_ONLY_AREAS} areas are reachable by no archetype but principal`,
  lonelyAreas.length <= PRINCIPAL_ONLY_AREAS, `${lonelyAreas.length}: ${lonelyAreas.join(", ")}`);

// The six are the four approveHigh keys, hr.employees.salary and
// crmSales.quotations.unlock. Signing above a studio's own limit, reading pay,
// and reopening something already committed are decisions a studio makes about
// a PERSON — the same argument `money` already makes for declining approveHigh.
//
// 5 -> 6 on 09/09/2026, and the residue did not change in KIND: there are
// FOUR approveHigh keys now, `inventory.stock.approveHigh` having arrived
// with the stock write-off chain, and the sentence above already covers it
// word for word. Every extra this guard actually exists to catch — an
// ORDINARY approval nobody but Admin could give — was covered rather than
// counted: stock.approve and payroll.approve went to department-head,
// ledger.close to money.
const PRINCIPAL_ONLY_EXTRAS = 6;
const lonelyExtras = EXTRA_KEYS.filter((k) => !nonPrincipal.has(k));
ok(`at most ${PRINCIPAL_ONLY_EXTRAS} extras are held by no archetype but principal`,
  lonelyExtras.length <= PRINCIPAL_ONLY_EXTRAS, `${lonelyExtras.length}: ${lonelyExtras.join(", ")}`);

// A SECOND WILDCARD IS FORBIDDEN: exactly one exists and it is Admin, which
// "has to keep meaning everything as the product grows". So principal is an
// explicit list rather than a shortcut to the same place.
ok("principal is an explicit list, not a wildcard",
  A.permissionsFor("principal").length > 0
  && !A.ARCHETYPES.find((a) => a.id === "principal")?.wildcard);

// Running the company and deciding who may do what are different acts, and
// the second is the one that can hand somebody else everything.
ok("...and does not carry administration.access",
  !A.permissionsFor("principal").some((k) => k.startsWith("administration.access")),
  A.permissionsFor("principal").filter((k) => k.startsWith("administration.access")).join(", "));

// Eleven names describing one shape would be eleven names for nothing.
const shapes = new Set(A.ARCHETYPES.map((a) => A.permissionsFor(a.id).slice().sort().join("|")));
ok("all eleven differ from one another", shapes.size === 11, `${shapes.size} distinct`);

// "Raises and edits records, deletes nothing" is the line the Member starter
// role drew, and it survives the role model changing underneath it.
ok("a doer deletes nothing",
  !A.permissionsFor("doer").some((k) => k.endsWith(".delete")),
  A.permissionsFor("doer").filter((k) => k.endsWith(".delete")).join(", "));

// THE ARCHETYPE NO STARTER ROLE EVER COVERED. A checker reads widely and
// signs; building one by hand meant assembling view rights plus a review
// extra, which is why nobody did.
ok("a checker reads and signs but creates nothing",
  A.permissionsFor("checker").includes("engineeringDocs.register.review")
  && !A.permissionsFor("checker").some((k) => k.endsWith(".create")),
  A.permissionsFor("checker").filter((k) => k.endsWith(".create")).join(", "));

// A COPY, NOT A REFERENCE. If a caller can mutate what this returns, one
// studio adding a role changes every future one — the same class of bug
// departmentsForField returns a fresh array to avoid.
const firstDoer = A.permissionsFor("doer");
firstDoer.push("crmSales.tickets.delete");
ok("permissionsFor hands out a fresh array",
  !A.permissionsFor("doer").includes("crmSales.tickets.delete"));

// An unknown id answers with nothing rather than throwing: it arrives from
// stored library data, and a bad row should cost one role its defaults, not
// take down the seed that was reading it.
ok("an unknown archetype grants nothing", A.permissionsFor("nonsense").length === 0);
ok("...and is not mistaken for a real one",
  !A.isArchetypeId("nonsense") && A.isArchetypeId("doer"));

console.log("\n== what a new studio starts with");

ok("exactly one starter role", R.STARTER_ROLES.length === 1, String(R.STARTER_ROLES.length));
ok("...and it is Admin", R.STARTER_ROLES[0]?.id === R.ADMIN_ROLE_ID, String(R.STARTER_ROLES[0]?.id));
ok("...the wildcard", R.STARTER_ROLES[0]?.wildcard === true);
ok("...studio-wide, not inside a department",
  (R.STARTER_ROLES[0]?.departmentId || "") === "");

// THE FOUR THAT LEFT. Manager, Team Lead, Member and Viewer were the same
// four whatever the studio did. Departments are seeded per industry now and
// bring their own roles, so "Site Engineer" under Site Execution says what
// "Member" never could — and two of them in different departments can hold
// different access, which one flat list could not express at all.
const starterNames = R.STARTER_ROLES.map((r) => r.name);
for (const gone of ["Manager", "Team Lead", "Member", "Viewer"]) {
  ok(`${gone} is no longer seeded`, !starterNames.includes(gone), starterNames.join(", "));
}

// A STARTER ROLE STILL NAMES AREAS THAT EXIST. Admin holds no explicit list
// — it is the wildcard — so this is really asserting that nothing crept back
// in with a hand-written key beside it.
ok("the starter role carries no explicit permissions",
  (R.STARTER_ROLES[0]?.permissions || []).length === 0,
  JSON.stringify(R.STARTER_ROLES[0]?.permissions));

// THE TRANSLATIONS FOLLOW THE ROLES. Eight entries covered the four that
// left; leaving them behind would be dead data keyed to strings nothing
// seeds any more.
const SR = await import("@/shared/studio/starterRoles");
ok("Admin still speaks Arabic", SR.starterRoleWord("ar", "Admin") !== "Admin");
for (const gone of ["Manager", "Team Lead", "Member", "Viewer"]) {
  ok(`no dead translation for ${gone}`, SR.starterRoleWord("ar", gone) === gone,
    SR.starterRoleWord("ar", gone));
}

// A string nobody translated falls through to the English it was given,
// which is what keeps a library role name readable rather than blank.
ok("an untranslated name falls through to English",
  SR.starterRoleWord("ar", "Site Engineer") === "Site Engineer");

console.log("\n== the role library");

const L = await import("@/modules/people/roleLibrary");
const { FIELDS_OF_WORK } = await import("@/shared/fieldsOfWork");
const S = await import("@/shared/departments/starters");

ok("the library has entries", L.LIBRARY.length > 1000, String(L.LIBRARY.length));

const codesByIndustry = Object.fromEntries(
  FIELDS_OF_WORK.map((f) => [f, S.departmentsForField(f).map((d) => d.code)]),
);
const libProblems = L.libraryProblems(FIELDS_OF_WORK, codesByIndustry);
ok("every library entry is well formed", libProblems.length === 0,
  libProblems.slice(0, 3).join(" | "));

// EVERY FIELD MUST HAVE ROLES, or a studio in that trade seeds departments
// with nothing in them — the blank-grid problem one level down.
const emptyFields = FIELDS_OF_WORK.filter((f) =>
  !L.LIBRARY.some((e) => e.industry === f));
ok("every field of work has roles of its own", emptyFields.length === 0, emptyFields.join(", "));

// AND EVERY DEPARTMENT, for the same reason. This is the assertion that
// caught two empty desks — the air/ocean freight desk and the FM helpdesk —
// which the generator now has hints for.
const emptyDepts = [];
for (const f of FIELDS_OF_WORK) {
  for (const code of codesByIndustry[f]) {
    if (!L.starterRolesFor(f, code).length) emptyDepts.push(`${f}/${code}`);
  }
}
ok("every seeded department has at least one role", emptyDepts.length === 0,
  emptyDepts.slice(0, 4).join(", "));

ok("no department seeds more than ten",
  FIELDS_OF_WORK.every((f) => codesByIndustry[f].every((c) => L.starterRolesFor(f, c).length <= 10)));

// SENIOR FIRST. A department arriving with ten operatives and no lead is a
// worse starting point than one with its head, its supervisor and its
// professionals.
const constructionOps = L.starterRolesFor("Construction & Contracting", "OPS");
ok("a department is seeded most senior first",
  constructionOps.length > 1 && constructionOps[0].tier <= constructionOps[constructionOps.length - 1].tier,
  constructionOps.map((r) => `${r.name}:${r.tier}`).join(" "));

// THE SPINE IS STORED ONCE AND REACHES EVERY FIELD. Writing it per industry
// doubled the file for no information; the readers treat "*" as matching any
// field, so Finance gets its accountants in all twenty-five trades.
const spineRows = L.LIBRARY.filter((e) => e.industry === "*");
ok("the universal spine is stored once", spineRows.length > 0 && spineRows.length < 200,
  String(spineRows.length));
ok("...and reaches a field that has none of its own back office",
  L.starterRolesFor("Management Consulting", "FIN").length > 0,
  L.starterRolesFor("Management Consulting", "FIN").map((r) => r.name).join(", "));

// Search is what the screen uses; it must find by substring, case-blind, and
// must never hand back the catalogue.
ok("search finds by substring", L.searchLibrary("engineer", { limit: 5 }).length === 5);
ok("...case-insensitively", L.searchLibrary("ENGINEER", { limit: 1 }).length === 1);
ok("...and is capped even with no search term at all",
  L.searchLibrary("", { limit: 20 }).length === 20);

// A COPY, NOT A REFERENCE — the BOQ rate rule. Editing an archetype later
// must reprice nothing already created.
const entry = L.LIBRARY.find((e) => e.archetype === "doer");
const copied = L.permissionsForLibraryRole(entry, { sectionKeys: ["crm-sales"] });
copied.push("crmSales.tickets.delete");
ok("a library role hands out a fresh permission list",
  !L.permissionsForLibraryRole(entry, { sectionKeys: ["crm-sales"] }).includes("crmSales.tickets.delete"));

console.log("\n== a library role starts inside its department's own sections");

// THE DEFECT: an archetype was copied WHOLE, so a "doer" filed under Estimation
// arrived holding CRM tickets, the project list and the inventory items —
// sections its department never said it works in. The owner's rule
// (11/09/2026): a role starts with its department's sections, and anything
// wider is granted on the Access screen afterwards.
{
  const doer = { ...entry, archetype: "doer" };
  const inEstimation = L.permissionsForLibraryRole(doer, { sectionKeys: ["tendering"] });
  ok("a role reaches no section its department does not work in",
    !inEstimation.some((k) => k.startsWith("crmSales.") || k.startsWith("projects.") || k.startsWith("inventory.")),
    inEstimation.join(", "));

  // Tasks is not a section, so nothing on the board is another department's.
  ok("...and keeps what belongs to no section", inEstimation.includes("tasks.board.view"));

  // SCOPED, SO KEPT: unscoped it reaches only the holder's own records, and it
  // is the right `requestVacation` asks for. Filtering it out would leave a
  // site engineer unable to book their own leave.
  ok("...and can still ask for their own leave", inEstimation.includes("hr.vacations.create"));

  // THE ROOT COMES FROM SECTION_DEFS, NOT THE KEY'S PREFIX. The RFQ queue's
  // section is `engineering-docs-rfq` and it sits under CRM & Sales; a prefix
  // match would hand it to Engineering and take it from Sales.
  const seller = { ...entry, archetype: "winner-of-work" };
  ok("a child section is matched by its real parent, not its prefix",
    L.permissionsForLibraryRole(seller, { sectionKeys: ["crm-sales"] }).includes("engineeringDocs.rfq.edit")
    && !L.permissionsForLibraryRole(seller, { sectionKeys: ["engineering-docs"] }).includes("engineeringDocs.rfq.edit"));

  // An engine right follows its register's section.
  const types = [
    { key: "ncr", parentSectionKey: "quality-hse" },
    { key: "workorder", parentSectionKey: "manufacturing" },
  ];
  const inspector = L.permissionsForLibraryRole({ ...entry, archetype: "checker" }, { sectionKeys: ["quality-hse"], types });
  ok("a register in the department's section is kept, one outside it is not",
    inspector.includes("engine.ncr.delete") && !inspector.some((k) => k.startsWith("engine.workorder.")),
    inspector.filter((k) => k.startsWith("engine.")).join(", "));

  // THE SHAPE AND THE DEPARTMENT ALWAYS MEET. `doer` names no Tendering right,
  // so confining alone left an Estimator under Estimation able to open nothing
  // there. Its home level is edit: it files bids and deletes none.
  ok("a role holds its shape's level on its own department's sections",
    inEstimation.includes("tendering.tenders.edit") && !inEstimation.includes("tendering.tenders.delete"),
    inEstimation.filter((k) => k.startsWith("tendering.")).join(", "));

  // THE HOME LEVEL NEVER OPENS A DOOR: not a section's settings, and nothing
  // in Administration — Access and People decide who may do what, and Master
  // data holds the department tree that widens a manager's reach.
  const head = { ...entry, archetype: "department-head" };
  const financeHead = L.permissionsForLibraryRole(head, { sectionKeys: ["finance"] });
  ok("a head runs their section in full, settings aside",
    financeHead.includes("finance.payables.delete") && !financeHead.some((k) => k.startsWith("finance.settings.")),
    financeHead.filter((k) => k.startsWith("finance.")).join(", "));
  const adminHead = L.permissionsForLibraryRole(head, { sectionKeys: ["administration"] });
  // People at VIEW survives because the shape NAMES it and the department is
  // Administration; what the home level must never add is any of the doors.
  ok("...and an Administration department gains no administrative door by default",
    !adminHead.some((k) => /^administration\.(access|master|settings)\./.test(k))
    && !adminHead.includes("administration.members.edit"),
    adminHead.filter((k) => k.startsWith("administration.")).join(", "));

  // THE ONE EXEMPTION, the owner's decision: principal runs the whole company.
  const md = L.permissionsForLibraryRole({ ...entry, archetype: "principal" }, { sectionKeys: ["administration"] });
  ok("a principal role is not confined to its department",
    md.includes("projects.list.delete") && md.includes("finance.payables.approveHigh"));
  ok("...and still cannot decide who may do what",
    !md.some((k) => k.startsWith("administration.access")));

  // A DEPARTMENT WITH NO SECTIONS (Legal) holds nothing sectioned at all.
  const legal = L.permissionsForLibraryRole({ ...entry, archetype: "department-head" }, { sectionKeys: [] });
  ok("a department with no sections gets only what belongs to none",
    legal.every((k) => k.startsWith("tasks.") || k.startsWith("engagements.") || k.startsWith("hr.employees.")
      || k.startsWith("hr.vacations.") || k.startsWith("hr.attendance.")),
    legal.join(", "));
}

// THE PROPERTY THE WHOLE DESIGN TURNS ON: one name, two departments, two
// different access shapes. If the library cannot express this, departmental
// roles are just a grouping.
const byName = new Map();
for (const e of L.LIBRARY) {
  const seen = byName.get(e.name) || new Set();
  seen.add(e.archetype);
  byName.set(e.name, seen);
}
const differing = [...byName.entries()].filter(([, shapes]) => shapes.size > 1);
ok("a repeated job title can carry different access in different places",
  differing.length > 0, `${differing.length} such titles`);

console.log("\n== retiring the four generic roles");

const RT = await import("@/shared/roles/retire");

// A studio that still has all five, with nobody holding the four.
const fiveRoles = [
  { id: R.ADMIN_ROLE_ID, name: "Admin" },
  { id: "role_manager", name: "Manager" },
  { id: "role_lead", name: "Team Lead" },
  { id: "role_member", name: "Member" },
  { id: "role_viewer", name: "Viewer" },
  { id: "rol_custom", name: "Site Engineer" },
];

const clear = RT.retirePlan({ roles: fiveRoles, people: [{ id: "c1", roleIds: [] }] });
ok("an unheld studio clears all four", clear.remove.length === 4,
  clear.remove.map((r) => r.id).join(", "));
ok("...and is not refused", clear.refused === false);

// ADMIN IS NEVER TOUCHED. It is the one wildcard and the role that has to
// keep meaning everything as the product grows.
ok("Admin is never removed", !clear.remove.some((r) => r.id === R.ADMIN_ROLE_ID),
  clear.remove.map((r) => r.id).join(", "));

// Nor is anything the studio made for itself.
ok("a studio's own roles are never removed",
  !clear.remove.some((r) => r.id === "rol_custom"));

// THE REFUSAL IS THE WHOLE SAFETY OF THIS SCRIPT. Deleting a held role takes
// its access off everybody holding it.
const held = RT.retirePlan({
  roles: fiveRoles,
  people: [{ id: "c1", roleIds: ["role_manager"] }, { id: "c2", roleIds: ["role_manager"] }],
});
ok("a studio where somebody holds one is refused", held.refused === true);
ok("...naming the role and the count", held.holders.role_manager === 2,
  JSON.stringify(held.holders));

// REFUSED MEANS NOTHING IS REMOVED, not "remove the three that are free". A
// studio left holding Manager and nothing else is halfway between two role
// models, and nobody chose that state.
ok("...and nothing at all is removed, not even the unheld three",
  held.remove.length === 0, JSON.stringify(held.remove));

// Idempotent: a studio already migrated has nothing to do.
const done = RT.retirePlan({
  roles: [{ id: R.ADMIN_ROLE_ID, name: "Admin" }, { id: "rol_x", name: "Estimator" }],
  people: [{ id: "c1", roleIds: ["rol_x"] }],
});
ok("a studio already retired has nothing to do", RT.nothingToRetire(done));

// A RENAMED STARTER ROLE IS STILL THAT ROLE. Matching by name would leave
// "Head of Department" behind on any studio that renamed Manager.
const renamed = RT.retirePlan({
  roles: [{ id: "role_manager", name: "Head of Department" }],
  people: [],
});
ok("a renamed starter role is still retired", renamed.remove.length === 1,
  JSON.stringify(renamed.remove));

console.log("\n== an archetype owns a section's registers, not a list of names");

// TWENTY-NINE REGISTERS THAT NO LIBRARY ROLE COULD OPEN. `permissionsFor` walked
// `grants` and `extras`, both of which name AREAS — and an engine right is
// minted from a row, so no archetype held one and a seeded departmental role
// arrived able to open none of its own section's registers. The roles SCREEN
// learned to offer them first; this is the other half, so a studio does not tick
// a hundred and sixteen boxes by hand.
{
  const A = await import("@/modules/people/archetypes");

  // The expansion is against the types PASSED IN, so this asks the question
  // with a studio's list rather than the built-in one — which is also how a
  // studio's own custom register reaches the shapes that own its section.
  const types = [
    { key: "ncr", parentSectionKey: "quality-hse" },
    { key: "audit", parentSectionKey: "quality-hse" },
    { key: "workorder", parentSectionKey: "manufacturing" },
    { key: "houseRule", parentSectionKey: "quality-hse" },   // a studio's own
  ];

  const checker = A.permissionsFor("checker", types);
  ok("a QA/QC shape holds its own section's registers at full",
    ["view", "create", "edit", "delete"].every((v) => checker.includes(`engine.ncr.${v}`)));
  ok("...including a register the studio declared itself",
    checker.includes("engine.houseRule.delete"));
  ok("...and only VIEWS the operational one it inspects",
    checker.includes("engine.workorder.view") && !checker.includes("engine.workorder.edit"));

  // `edit` IS THE MIDDLE RUNG AND IT HAS TO STOP SHORT OF DELETE, or the ladder
  // has two rungs and the shapes that use it are lying.
  const doer = A.permissionsFor("doer", types);
  ok("whoever does the work may file a record and not delete one",
    doer.includes("engine.ncr.create") && doer.includes("engine.ncr.edit")
    && !doer.includes("engine.ncr.delete"));

  // THE MONEY SHAPE OWNS NO REGISTER, which is a decision rather than an
  // omission: nothing in the twenty-nine is a controller's to keep.
  ok("a finance shape picks up no register at all",
    A.permissionsFor("money", types).every((k) => !k.startsWith("engine.")));

  // AND NO STUDIO, NO ENGINE KEYS. The default is the archetype's DECLARED
  // shape — every pure caller asks for that, and inventing keys for types the
  // studio does not hold would grant rights to registers that do not exist.
  ok("with no types in hand an archetype declares no engine right",
    A.permissionsFor("checker").every((k) => !k.startsWith("engine.")));

  // EVERY SECTION AN ARCHETYPE NAMES MUST BE A REAL ONE, the same rule `level()`
  // enforces for areas — a typo here would grant nothing, silently, forever.
  const { ALL_SECTION_KEYS } = await import("@/platform/db/keys");
  const bad = [];
  for (const a of A.ARCHETYPES) {
    for (const [sectionKey] of a.engineSections || []) {
      if (!ALL_SECTION_KEYS.includes(sectionKey)) bad.push(`${a.id} -> ${sectionKey}`);
    }
  }
  ok("every section an archetype names exists", bad.length === 0, bad.join(", "));
}

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
