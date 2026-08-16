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
  ["AREAS", "ALL_PERMISSIONS", "isPermission", "levelOf", "keysForLevel", "cleanPermissions", "LEVELS"]);

// access.js imports from permissions.js, so stitch them together.
const accessSrc = fs.readFileSync("src/lib/access.js", "utf8")
  .replace(/^import[\s\S]*?;\s*$/gm, "")
  .replace(/export (const|function)/g, "$1");
const A = {};
new Function("m", "ALL_PERMISSIONS", "isPermission", "AREAS", "keysForLevel",
  `${accessSrc}; Object.assign(m, { effectivePermissions, permissionsFromGrants, scopeFor, can, requirePermission });`
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
const tickets = P.AREAS.find((a) => a.key === "sales.tickets");
for (const lvl of P.LEVELS) {
  const keys = P.keysForLevel(tickets, lvl);
  const back = P.levelOf(tickets, new Set(keys));
  ok(`${lvl.padEnd(5)} -> ${keys.length} keys -> reads back as ${back}`, back === lvl);
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
ok("engineer CANNOT delete tickets", !A.can(eng, "sales.tickets.delete"));
ok("engineer CANNOT touch clients", !A.can(eng, "sales.clients.view"));
ok("no parent leak into siblings", !A.can(eng, "sales.settings.edit"));

const twoRoles = res({ roleIds: ["r_eng", "r_hr"] });
ok("two roles union", A.can(twoRoles, "sales.tickets.edit") && A.can(twoRoles, "hr.employees.view"));

console.log("\n== overrides are a diff");
const withOv = res({ roleIds: ["r_eng"], overrides: { allow: ["finance.cash.view"], deny: ["sales.tickets.edit"] } });
ok("override adds", A.can(withOv, "finance.cash.view"));
ok("override removes", !A.can(withOv, "sales.tickets.edit"));
ok("deny beats allow on the same key",
  !A.can(res({ roleIds: ["r_eng"], overrides: { allow: ["sales.tickets.delete"], deny: ["sales.tickets.delete"] } }),
    "sales.tickets.delete"));

console.log("\n== scope");
ok("scoped area reads its role's scope", A.scopeFor({ collaborator: { roleIds: ["r_hr"] }, roles }, "hr.employees") === "department");
ok("unscoped defaults to own", A.scopeFor({ collaborator: { roleIds: ["r_eng"] }, roles }, "hr.employees") === "own");
ok("owner sees all", A.scopeFor({ collaborator: { role: "owner" }, roles }, "hr.employees") === "all");

console.log("\n== legacy bridge preserves today's behaviour");
const sections = [
  { id: "s1", key: "sales" }, { id: "s2", key: "sales-tickets" }, { id: "s3", key: "sales-clients" },
];
const g = (sectionId, action, effect = "allow") =>
  ({ subjectType: "collaborator", subjectId: "c1", sectionId, action, effect });
const legacy = (grants) => A.effectivePermissions({ studio: {}, collaborator: { id: "c1" }, roles: [], sections, grants });

const l1 = legacy([g("s2", "view"), g("s2", "manage")]);
ok("manage on tickets -> full on tickets", A.can(l1, "sales.tickets.delete"));
ok("...and nothing on clients", !A.can(l1, "sales.clients.view"));

const l2 = legacy([g("s1", "view"), g("s1", "manage")]);
ok("manage on the PARENT grants nothing (sales is not an area)", l2.size === 0);

const l3 = legacy([g("s2", "manage")]);
ok("manage without view still grants nothing", !A.can(l3, "sales.tickets.view"));

const l4 = legacy([g("s2", "view"), g("s2", "manage"), g("s2", "manage", "deny")]);
ok("deny still wins", A.can(l4, "sales.tickets.view") && !A.can(l4, "sales.tickets.delete"));

const l5 = A.effectivePermissions({
  studio: {}, collaborator: { id: "c1", roleIds: ["r_eng"] }, roles,
  sections, grants: [g("s3", "view"), g("s3", "manage")],
});
ok("once a role is assigned, grants are ignored", !A.can(l5, "sales.clients.view") && A.can(l5, "sales.tickets.edit"));

console.log("\n== enforcement");
ok("requirePermission passes when held", A.requirePermission(eng, "sales.tickets.edit") === null);
ok("...refuses when not", A.requirePermission(eng, "sales.tickets.delete")?.error === "forbidden");
ok("...catches a typo'd key", A.requirePermission(eng, "sales.tickets.remove")?.error === "unknown-permission");

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
