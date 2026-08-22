// ACCESS RULES — the pure half of the suite. No Redis, no server, no fixtures:
// the catalogue and the resolver are functions over plain values, so this runs
// in milliseconds and is the first thing CI does.
//
// IT USED TO STRING-LOAD THE SOURCE. `new Function` over the file with the
// imports and exports regexed away — written before tests/loader.mjs existed,
// and it meant every assertion here was made against a mangled copy rather than
// the module the app imports. Two costs, and the second is the one that bit:
// the regex would have quietly eaten any multi-line construct ending in `;`,
// and the file broke the moment access moved folders, because it named the
// paths rather than the module.
//
// The loader the other two suites use resolves `@/` and reads .ts as readily as
// .js, so this now imports the real thing and keeps working through Wave 3's
// conversions.

import { register } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const ACCESS = await import("@/platform/access");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== catalogue");
console.log(`  ${ACCESS.AREAS.length} areas, ${ACCESS.ALL_PERMISSIONS.length} permissions`);
ok("no duplicate keys", new Set(ACCESS.ALL_PERMISSIONS).size === ACCESS.ALL_PERMISSIONS.length);
ok("no bare parent permission exists",
  !ACCESS.ALL_PERMISSIONS.some((k) => ["sales", "technical", "hr", "finance"].includes(k)));
ok("unknown keys rejected", !ACCESS.isPermission("sales.tickets.nuke") && ACCESS.isPermission("sales.tickets.edit"));
ok("cleanPermissions drops junk",
  JSON.stringify(ACCESS.cleanPermissions(["sales.tickets.view", "nope", "sales.tickets.view"]))
    === JSON.stringify(["sales.tickets.view"]));

console.log("\n== the ladder");
// Tickets have no delete, so their ladder is none/view/edit — three rungs, not
// four. Clients have all four. Both must round-trip.
for (const areaKey of ["sales.tickets", "sales.clients"]) {
  const area = ACCESS.AREAS.find((a) => a.key === areaKey);
  console.log(`  ${areaKey}: ${ACCESS.levelsFor(area).join(" / ")}`);
  for (const lvl of ACCESS.levelsFor(area)) {
    const keys = ACCESS.keysForLevel(area, lvl);
    const back = ACCESS.levelOf(area, new Set(keys));
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
  ACCESS.effectivePermissions({ studio: {}, collaborator, roles, ...extra });

ok("owner gets everything", res({ role: "owner" }).size === ACCESS.ALL_PERMISSIONS.length);
ok("admin role is a wildcard", res({ roleIds: ["role_admin"] }).size === ACCESS.ALL_PERMISSIONS.length);

const eng = res({ roleIds: ["r_eng"] });
ok("engineer can edit tickets", ACCESS.can(eng, "sales.tickets.edit"));
ok("engineer CANNOT delete clients", !ACCESS.can(eng, "sales.clients.delete"));
ok("engineer CANNOT touch clients", !ACCESS.can(eng, "sales.clients.view"));
ok("no parent leak into siblings", !ACCESS.can(eng, "sales.settings.edit"));

const twoRoles = res({ roleIds: ["r_eng", "r_hr"] });
ok("two roles union", ACCESS.can(twoRoles, "sales.tickets.edit") && ACCESS.can(twoRoles, "hr.employees.view"));

console.log("\n== overrides are a diff");
const withOv = res({ roleIds: ["r_eng"], overrides: { allow: ["finance.cash.view"], deny: ["sales.tickets.edit"] } });
ok("override adds", ACCESS.can(withOv, "finance.cash.view"));
ok("override removes", !ACCESS.can(withOv, "sales.tickets.edit"));
ok("deny beats allow on the same key",
  !ACCESS.can(res({ roleIds: ["r_eng"], overrides: { allow: ["sales.clients.delete"], deny: ["sales.clients.delete"] } }),
    "sales.clients.delete"));

console.log("\n== scope");
ok("scoped area reads its role's scope", ACCESS.scopeFor({ collaborator: { roleIds: ["r_hr"] }, roles }, "hr.employees") === "department");
ok("unscoped defaults to own", ACCESS.scopeFor({ collaborator: { roleIds: ["r_eng"] }, roles }, "hr.employees") === "own");
ok("owner sees all", ACCESS.scopeFor({ collaborator: { role: "owner" }, roles }, "hr.employees") === "all");

// The legacy-bridge section was deleted with the bridge itself. It asserted
// that section grants translated faithfully into permissions; there are no
// grants left to translate, and a test for deleted code can only ever pass.

// Default deny, now that nothing falls back to grants.
console.log("\n== no role means nothing");
{
  const nobody = res({ id: "c9", roleIds: [] });
  ok("a person with no role holds nothing", nobody.size === 0);
  ok("...and every check refuses them",
    ACCESS.requirePermission(nobody, "sales.tickets.view")?.error === "forbidden");
}

console.log("\n== enforcement");
ok("requirePermission passes when held", ACCESS.requirePermission(eng, "sales.tickets.edit") === null);
ok("...refuses when not", ACCESS.requirePermission(eng, "sales.clients.delete")?.error === "forbidden");
ok("...catches a typo'd key", ACCESS.requirePermission(eng, "sales.tickets.remove")?.error === "unknown-permission");


console.log("\n== the guard, as a service function calls it");
// Exactly the shape sales.js uses: resolve once, guard before touching anything.
const guard = (access, key) => {
  const denied = ACCESS.requirePermission(access, key);
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
  const view = (acc, k) => ACCESS.sectionViewable(acc, k, keys);

  const only = res({ roleIds: ["r_eng"] });          // tickets view/create/edit
  ok("the section they hold is shown", view(only, "sales-tickets"));
  ok("a sibling they do not hold is hidden", !view(only, "sales-clients"));
  ok("the PARENT heading shows because a child does", view(only, "sales"));
  ok("an untouched heading is hidden", !view(only, "hr"));
  ok("the dashboard home has nothing to protect", view(only, "main"));

  ok("buttons appear where a write is held", ACCESS.sectionManageable(only, "sales-tickets", keys));
  // The bug that broke "raise an RFQ": a heading has no areas of its own, so
  // asking whether somebody may manage "sales" answered false for EVERYONE,
  // owners included, until it started asking its children.
  ok("a heading is manageable when a child is", ACCESS.sectionManageable(only, "sales", keys));
  ok("...and not when no child is", !ACCESS.sectionManageable(only, "hr", keys));
  ok("an owner may manage a heading",
    ACCESS.sectionManageable(res({ role: "owner" }), "sales", keys));
  ok("...and not where only view is held",
    !ACCESS.sectionManageable(res({ roleIds: ["r_hr"] }), "hr-employees", keys));

  // The whole point of the rewire: one source, so these cannot disagree.
  const canWrite = ACCESS.can(only, "sales.tickets.edit");
  ok("nav and guard agree", ACCESS.sectionManageable(only, "sales-tickets", keys) === canWrite);
}


console.log("\n== assigning access cannot escalate it");
{
  const known = ["role_admin", "r_eng", "r_hr"];
  const clean = ACCESS.cleanAssignment({ roleIds: ["r_eng", "made_up", "r_eng"], overrides: { allow: ["sales.clients.view", "nope"], deny: [] } }, known);
  ok("unknown role ids dropped", JSON.stringify(clean.roleIds) === JSON.stringify(["r_eng"]));
  ok("unknown permission keys dropped",
    JSON.stringify(clean.overrides.allow) === JSON.stringify(["sales.clients.view"]));

  // A Sales Engineer with people.members.edit tries to widen their own access.
  const actor = res({ roleIds: ["r_eng"], overrides: { allow: ["people.members.edit"] } });
  ok("cannot grant a permission they lack",
    ACCESS.escalates(actor, { overrides: { allow: ["finance.cash.delete"] } }, roles)?.error === "escalation");
  ok("cannot hand out the Admin wildcard",
    ACCESS.escalates(actor, { roleIds: ["role_admin"] }, roles)?.error === "escalation");
  ok("CAN grant what they do hold",
    ACCESS.escalates(actor, { overrides: { allow: ["sales.tickets.edit"] } }, roles) === null);
  ok("an owner may grant anything",
    ACCESS.escalates(res({ role: "owner" }), { roleIds: ["role_admin"] }, roles) === null);
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
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = `${dir}/${e.name}`;
    return e.isDirectory() ? walk(full) : full.endsWith(".js") ? [full] : [];
  });
  const SERVICES = [...walk("src/lib"), ...walk("src/app/api")];
  const enforced = new Set();
  for (const f of SERVICES) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/requirePermission\([\w.]+, "([^"]+)"\)/g)) enforced.add(m[1]);
  }
  // A GUARD THE GREP CANNOT SEE IS STILL A GUARD.
  //
  // The Quality workflow dispatches from a table: one moveRevision() calls
  // requirePermission(ctx.access, move.permission), and the key it needs lives
  // in TRANSITIONS. That is the whole point of declaring the machine once — but
  // it means the literal never appears beside the call, and this audit reported
  // quality.documents.approve as unguarded when it is guarded on every path.
  //
  // So: if any service dispatches a permission from a VARIABLE, the keys
  // declared as `permission: "..."` table entries count as enforced too.
  // Narrower would mean a false alarm nobody can fix without making the code
  // worse; an audit that cries wolf gets ignored, which is how the real hole
  // gets through.
  const dispatches = SERVICES.some((f) => /requirePermission\([\w.]+,\s*[\w.]+\)/.test(readFileSync(f, "utf8")));
  if (dispatches) {
    for (const f of SERVICES) {
      // Only real permission keys. `permission:` is also how sheetColumns.js
      // names the AREA a column answers to, and an area is not a permission —
      // sweeping those in made this audit report keys that do not exist.
      for (const m of readFileSync(f, "utf8").matchAll(/permission:\s*"([^"]+)"/g)) {
        if (ACCESS.isPermission(m[1])) enforced.add(m[1]);
      }
    }
  }

  const undeclared = [...enforced].filter((k) => !ACCESS.isPermission(k));
  ok("every enforced key is declared", undeclared.length === 0, undeclared.join(", "));

  const writes = ACCESS.ALL_PERMISSIONS.filter((k) => /\.(create|edit|delete|convert|lock|approve)$/.test(k));
  const gaps = writes.filter((k) => !enforced.has(k));
  console.log(`  ${enforced.size} keys enforced across ${SERVICES.length} files`);
  console.log(`  ${writes.length - gaps.length}/${writes.length} write permissions reach a guard`);
  if (gaps.length) console.log(`  still unguarded: ${gaps.join(", ")}`);
}

// ---------------------------------------------------------------------------
// WIRING. The audit above proves a permission key is enforced SOMEWHERE. It
// cannot prove the guard was handed anything to check, and that is exactly how
// the Tasks board came to refuse every write including the owner's: the context
// resolved `access`, forgot to return it, and `requirePermission(undefined, …)`
// answered "forbidden" for everybody. The string was present, so the audit read
// clean while the module was entirely dead.
//
// These two checks are structural on purpose. They need no Redis and no server,
// they run in milliseconds, and they fail the moment somebody adds a module and
// forgets the one line that arms it.
console.log("\n== wiring");
{
  // 1. EVERY CONTEXT CARRIES `access`.
  // A service module resolves it once, in its *Context builder, and every guard
  // downstream reads it off that object. A builder that resolves it and does
  // not return it disarms the whole module silently.
  const builders = readdirSync("src/lib")
    .filter((f) => f.endsWith(".js"))
    .flatMap((f) => {
      const src = readFileSync(`src/lib/${f}`, "utf8");
      return [...src.matchAll(/export async function (\w*[Cc]ontext)\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/g)]
        .map((m) => ({ file: f, name: m[1], body: m[2] }));
    })
    // mainContext is the one that legitimately does not: it hands out a `seen`
    // predicate with access captured inside it, and holds no guarded writes.
    .filter((b) => b.name !== "mainContext");

  console.log(`  ${builders.length} context builders`);
  for (const b of builders) {
    // It has to appear in the RETURNED object, not merely be destructured.
    const returned = /return\s*\{[\s\S]*?\baccess\b[\s\S]*?\}/.test(b.body);
    ok(`  ${b.file} ${b.name} returns access`, returned);
  }

  // 2. EVERY WRITE ASKS FOR ITS RIGHT.
  // Anything that creates, changes or removes a record names the permission it
  // needs, in the function that does the work — routes get added and forgotten,
  // the service function cannot be reached around.
  //
  // The exceptions are listed with their reason rather than silently skipped;
  // an unexplained entry here is the next hole.
  const EXEMPT = {
    decideTask: "gated on holding the authority the task routes to, from Task settings",
    decideVacation: "cancelling your OWN pending request needs no approve right",
    requestTicketRfq: "delegates to requestRfq, which guards both doors itself",
    reportPosition: "you may always report your own position; the id is the session's",
    clearPosition: "your own always; somebody else's checks canManageTracking",
    requestJoinByCode: "raising a request is what a non-member does; approval is the gate",
    openProjects: "a READ — which projects an order or delivery may be pointed at",
  };
  const WRITES = /^export async function ((?:create|edit|update|remove|delete|save|adjust|track|issue|receive|open|convert|request|send|decide)\w*)\s*\(\s*ctx\b/;

  let checked = 0;
  for (const f of readdirSync("src/lib").filter((x) => x.endsWith(".js"))) {
    const src = readFileSync(`src/lib/${f}`, "utf8");
    // Split on top-level exports so each function's body is its own slice.
    const parts = src.split(/\n(?=export )/);
    for (const part of parts) {
      const m = part.match(WRITES);
      if (!m) continue;
      const name = m[1];
      if (EXEMPT[name]) continue;
      checked += 1;
      ok(`  ${f} ${name} guards itself`, /requirePermission\(/.test(part));
    }
  }
  console.log(`  ${checked} guarded writes checked, ${Object.keys(EXEMPT).length} documented exceptions`);
}

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
