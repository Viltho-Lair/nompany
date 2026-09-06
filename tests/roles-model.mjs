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
const { ALL_PERMISSIONS } = await import("@/platform/access");

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

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
