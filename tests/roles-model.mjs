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

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
