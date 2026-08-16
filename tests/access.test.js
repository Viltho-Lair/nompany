const fs = require("fs");

// Load the two pure modules without a bundler: strip imports/exports and run.
const load = (path, names) => {
  const src = fs.readFileSync(path, "utf8")
    .replace(/^import[\s\S]*?;\s*$/gm, "")
    .replace(/export (const|function|async function)/g, "$1");
  const out = {};
  new Function("m", `${src}; Object.assign(m, {${names.join(",")}});`)(out);
  return out;
};

const P = load("src/lib/permissions.js",
  ["AREAS", "ALL_PERMISSIONS", "isPermission", "levelOf", "levelsFor", "keysForLevel", "cleanPermissions", "LEVELS"]);

// access.js imports from permissions.js, so stitch them together.
const accessSrc = fs.readFileSync("src/lib/access.js", "utf8")
  .replace(/^import[\s\S]*?;\s*$/gm, "")
  .replace(/export (const|function)/g, "$1");
const A = {};
new Function("m", "ALL_PERMISSIONS", "isPermission", "AREAS", "keysForLevel",
  `${accessSrc}; Object.assign(m, { effectivePermissions, scopeFor, can, requirePermission, sectionViewable, sectionManageable, cleanAssignment, escalates });`
)(A, P.ALL_PERMISSIONS, P.isPermission, P.AREAS, P.keysForLevel);

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== catalogue");
console.log(`  ${P.AREAS.length} areas, ${P.ALL_PERMISSIONS.length} permissions`);
ok("no duplicate keys", new Set(P.ALL_PERMISSIONS).size === P.ALL_PERMISSIONS.length);
ok("no bare parent permission exists",
  !P.ALL_PERMISSIONS.some((k) => ["sales", "technical", "hr", "finance"].includes(k)));
ok("unknown keys rejected", !P.isPermission("sales.tickets.nuke") && P.isPermission("sales.tickets.edit"));
ok("cleanPermissions drops junk",
  JSON.stringify(P.cleanPermissions(["sales.tickets.view", "nope", "sales.tickets.view"]))
    === JSON.stringify(["sales.tickets.view"]));

console.log("\n== the ladder");
// Tickets have no delete, so their ladder is none/view/edit — three rungs, not
// four. Clients have all four. Both must round-trip.
for (const areaKey of ["sales.tickets", "sales.clients"]) {
  const area = P.AREAS.find((a) => a.key === areaKey);
  console.log(`  ${areaKey}: ${P.levelsFor(area).join(" / ")}`);
  for (const lvl of P.levelsFor(area)) {
    const keys = P.keysForLevel(area, lvl);
    const back = P.levelOf(area, new Set(keys));
    ok(`  ${areaKey} ${lvl.padEnd(5)} -> ${keys.length} keys -> ${back}`, back === lvl);
  }
}

console.log("\n== resolution");
const roles = [
  { id: "role_admin", wildcard: true, permissions: [] },
  { id: "r_eng", permissions: ["sales.tickets.view", "sales.tickets.create", "sales.tickets.edit"], scopes: {} },
  { id: "r_hr", permissions: ["hr.employees.view"], scopes: { "hr.employees": "department" } },
];
const res = (collaborator, extra = {}) =>
  A.effectivePermissions({ studio: {}, collaborator, roles, ...extra });

ok("owner gets everything", res({ role: "owner" }).size === P.ALL_PERMISSIONS.length);
ok("admin role is a wildcard", res({ roleIds: ["role_admin"] }).size === P.ALL_PERMISSIONS.length);

const eng = res({ roleIds: ["r_eng"] });
ok("engineer can edit tickets", A.can(eng, "sales.tickets.edit"));
ok("engineer CANNOT delete clients", !A.can(eng, "sales.clients.delete"));
ok("engineer CANNOT touch clients", !A.can(eng, "sales.clients.view"));
ok("no parent leak into siblings", !A.can(eng, "sales.settings.edit"));

const twoRoles = res({ roleIds: ["r_eng", "r_hr"] });
ok("two roles union", A.can(twoRoles, "sales.tickets.edit") && A.can(twoRoles, "hr.employees.view"));

console.log("\n== overrides are a diff");
const withOv = res({ roleIds: ["r_eng"], overrides: { allow: ["finance.cash.view"], deny: ["sales.tickets.edit"] } });
ok("override adds", A.can(withOv, "finance.cash.view"));
ok("override removes", !A.can(withOv, "sales.tickets.edit"));
ok("deny beats allow on the same key",
  !A.can(res({ roleIds: ["r_eng"], overrides: { allow: ["sales.clients.delete"], deny: ["sales.clients.delete"] } }),
    "sales.clients.delete"));

console.log("\n== scope");
ok("scoped area reads its role's scope", A.scopeFor({ collaborator: { roleIds: ["r_hr"] }, roles }, "hr.employees") === "department");
ok("unscoped defaults to own", A.scopeFor({ collaborator: { roleIds: ["r_eng"] }, roles }, "hr.employees") === "own");
ok("owner sees all", A.scopeFor({ collaborator: { role: "owner" }, roles }, "hr.employees") === "all");

// The legacy-bridge section was deleted with the bridge itself. It asserted
// that section grants translated faithfully into permissions; there are no
// grants left to translate, and a test for deleted code can only ever pass.

// Default deny, now that nothing falls back to grants.
console.log("\n== no role means nothing");
{
  const nobody = res({ id: "c9", roleIds: [] });
  ok("a person with no role holds nothing", nobody.size === 0);
  ok("...and every check refuses them",
    A.requirePermission(nobody, "sales.tickets.view")?.error === "forbidden");
}

console.log("\n== enforcement");
ok("requirePermission passes when held", A.requirePermission(eng, "sales.tickets.edit") === null);
ok("...refuses when not", A.requirePermission(eng, "sales.clients.delete")?.error === "forbidden");
ok("...catches a typo'd key", A.requirePermission(eng, "sales.tickets.remove")?.error === "unknown-permission");


console.log("\n== the guard, as a service function calls it");
// Exactly the shape sales.js uses: resolve once, guard before touching anything.
const guard = (access, key) => {
  const denied = A.requirePermission(access, key);
  return denied ? `refused (${denied.error})` : "allowed";
};
const viewer = res({ roleIds: ["r_eng"] });
ok("engineer may create a ticket", guard(viewer, "sales.tickets.create") === "allowed");
ok("engineer may NOT delete a client", guard(viewer, "sales.clients.delete") === "refused (forbidden)");
ok("engineer may NOT touch settings", guard(viewer, "sales.settings.edit") === "refused (forbidden)");
ok("a mistyped key fails loudly, not silently",
  guard(viewer, "sales.tickets.destroy") === "refused (unknown-permission)");
ok("owner passes every guard",
  ["sales.clients.delete", "hr.employees.salary", "finance.cash.delete"]
    .every((k) => guard(res({ role: "owner" }), k) === "allowed"));


console.log("\n== the nav reads the same source as the guards");
{
  const keys = ["main", "sales", "sales-tickets", "sales-clients", "sales-settings", "hr", "hr-employees"];
  const view = (acc, k) => A.sectionViewable(acc, k, keys);

  const only = res({ roleIds: ["r_eng"] });          // tickets view/create/edit
  ok("the section they hold is shown", view(only, "sales-tickets"));
  ok("a sibling they do not hold is hidden", !view(only, "sales-clients"));
  ok("the PARENT heading shows because a child does", view(only, "sales"));
  ok("an untouched heading is hidden", !view(only, "hr"));
  ok("the dashboard home has nothing to protect", view(only, "main"));

  ok("buttons appear where a write is held", A.sectionManageable(only, "sales-tickets"));
  ok("...and not where only view is held",
    !A.sectionManageable(res({ roleIds: ["r_hr"] }), "hr-employees"));

  // The whole point of the rewire: one source, so these cannot disagree.
  const canWrite = A.can(only, "sales.tickets.edit");
  ok("nav and guard agree", A.sectionManageable(only, "sales-tickets") === canWrite);
}


console.log("\n== assigning access cannot escalate it");
{
  const known = ["role_admin", "r_eng", "r_hr"];
  const clean = A.cleanAssignment({ roleIds: ["r_eng", "made_up", "r_eng"], overrides: { allow: ["sales.clients.view", "nope"], deny: [] } }, known);
  ok("unknown role ids dropped", JSON.stringify(clean.roleIds) === JSON.stringify(["r_eng"]));
  ok("unknown permission keys dropped",
    JSON.stringify(clean.overrides.allow) === JSON.stringify(["sales.clients.view"]));

  // A Sales Engineer with people.members.edit tries to widen their own access.
  const actor = res({ roleIds: ["r_eng"], overrides: { allow: ["people.members.edit"] } });
  ok("cannot grant a permission they lack",
    A.escalates(actor, { overrides: { allow: ["finance.cash.delete"] } }, roles)?.error === "escalation");
  ok("cannot hand out the Admin wildcard",
    A.escalates(actor, { roleIds: ["role_admin"] }, roles)?.error === "escalation");
  ok("CAN grant what they do hold",
    A.escalates(actor, { overrides: { allow: ["sales.tickets.edit"] } }, roles) === null);
  ok("an owner may grant anything",
    A.escalates(res({ role: "owner" }), { roleIds: ["role_admin"] }, roles) === null);
}


// ---------------------------------------------------------------------------
// COVERAGE AUDIT. The point of a declared catalogue is that you can check it
// against reality: a key nobody enforces is a right nobody can exercise, and a
// key enforced but undeclared is a typo waiting to deny someone silently.
//
// This is not a pass/fail gate — a few areas are genuinely still to be wired,
// and failing the suite for known work would only teach people to skip it. It
// prints, so the gap stays visible instead of being forgotten.
console.log("\n== enforcement coverage");
{
  // EVERY source file, not a hand-kept list. The first version of this audit
  // named seven services and therefore could not see the guards later added to
  // tasks.js, awbTracking.js and the routes — an audit with its own blind spot
  // reports clean and means nothing.
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = `${dir}/${e.name}`;
    return e.isDirectory() ? walk(full) : full.endsWith(".js") ? [full] : [];
  });
  const SERVICES = [...walk("src/lib"), ...walk("src/app/api")];
  const enforced = new Set();
  for (const f of SERVICES) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/requirePermission\([\w.]+, "([^"]+)"\)/g)) enforced.add(m[1]);
  }
  const undeclared = [...enforced].filter((k) => !P.isPermission(k));
  ok("every enforced key is declared", undeclared.length === 0, undeclared.join(", "));

  const writes = P.ALL_PERMISSIONS.filter((k) => /\.(create|edit|delete|convert|lock|approve)$/.test(k));
  const gaps = writes.filter((k) => !enforced.has(k));
  console.log(`  ${enforced.size} keys enforced across ${SERVICES.length} files`);
  console.log(`  ${writes.length - gaps.length}/${writes.length} write permissions reach a guard`);
  if (gaps.length) console.log(`  still unguarded: ${gaps.join(", ")}`);
}

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
