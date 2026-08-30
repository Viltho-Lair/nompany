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
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
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
  !ACCESS.ALL_PERMISSIONS.some((k) => ["crmSales", "engineeringDocs", "hr", "finance"].includes(k)));
ok("unknown keys rejected", !ACCESS.isPermission("crmSales.tickets.nuke") && ACCESS.isPermission("crmSales.tickets.edit"));
ok("cleanPermissions drops junk",
  JSON.stringify(ACCESS.cleanPermissions(["crmSales.tickets.view", "nope", "crmSales.tickets.view"]))
    === JSON.stringify(["crmSales.tickets.view"]));

console.log("\n== the ladder");
// Tickets have no delete, so their ladder is none/view/edit — three rungs, not
// four. Clients have all four. Both must round-trip.
for (const areaKey of ["crmSales.tickets", "crmSales.clients"]) {
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
  { id: "r_eng", permissions: ["crmSales.tickets.view", "crmSales.tickets.create", "crmSales.tickets.edit"], scopes: {} },
  { id: "r_hr", permissions: ["hr.employees.view"], scopes: { "hr.employees": "department" } },
];
const res = (collaborator, extra = {}) =>
  ACCESS.effectivePermissions({ studio: {}, collaborator, roles, ...extra });

ok("owner gets everything", res({ role: "owner" }).size === ACCESS.ALL_PERMISSIONS.length);
ok("admin role is a wildcard", res({ roleIds: ["role_admin"] }).size === ACCESS.ALL_PERMISSIONS.length);

const eng = res({ roleIds: ["r_eng"] });
ok("engineer can edit tickets", ACCESS.can(eng, "crmSales.tickets.edit"));
ok("engineer CANNOT delete clients", !ACCESS.can(eng, "crmSales.clients.delete"));
ok("engineer CANNOT touch clients", !ACCESS.can(eng, "crmSales.clients.view"));
ok("no parent leak into siblings", !ACCESS.can(eng, "crmSales.settings.edit"));

const twoRoles = res({ roleIds: ["r_eng", "r_hr"] });
ok("two roles union", ACCESS.can(twoRoles, "crmSales.tickets.edit") && ACCESS.can(twoRoles, "hr.employees.view"));

console.log("\n== overrides are a diff");
const withOv = res({ roleIds: ["r_eng"], overrides: { allow: ["finance.cash.view"], deny: ["crmSales.tickets.edit"] } });
ok("override adds", ACCESS.can(withOv, "finance.cash.view"));
ok("override removes", !ACCESS.can(withOv, "crmSales.tickets.edit"));
ok("deny beats allow on the same key",
  !ACCESS.can(res({ roleIds: ["r_eng"], overrides: { allow: ["crmSales.clients.delete"], deny: ["crmSales.clients.delete"] } }),
    "crmSales.clients.delete"));

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
    ACCESS.requirePermission(nobody, "crmSales.tickets.view")?.error === "forbidden");
}

console.log("\n== enforcement");
ok("requirePermission passes when held", ACCESS.requirePermission(eng, "crmSales.tickets.edit") === null);
ok("...refuses when not", ACCESS.requirePermission(eng, "crmSales.clients.delete")?.error === "forbidden");
ok("...catches a typo'd key", ACCESS.requirePermission(eng, "crmSales.tickets.remove")?.error === "unknown-permission");


console.log("\n== the guard, as a service function calls it");
// Exactly the shape sales.js uses: resolve once, guard before touching anything.
const guard = (access, key) => {
  const denied = ACCESS.requirePermission(access, key);
  return denied ? `refused (${denied.error})` : "allowed";
};
const viewer = res({ roleIds: ["r_eng"] });
ok("engineer may create a ticket", guard(viewer, "crmSales.tickets.create") === "allowed");
ok("engineer may NOT delete a client", guard(viewer, "crmSales.clients.delete") === "refused (forbidden)");
ok("engineer may NOT touch settings", guard(viewer, "crmSales.settings.edit") === "refused (forbidden)");
ok("a mistyped key fails loudly, not silently",
  guard(viewer, "crmSales.tickets.destroy") === "refused (unknown-permission)");
ok("owner passes every guard",
  ["crmSales.clients.delete", "hr.employees.salary", "finance.cash.delete"]
    .every((k) => guard(res({ role: "owner" }), k) === "allowed"));


console.log("\n== the nav reads the same source as the guards");
{
  const keys = ["main", "crm-sales", "crm-sales-tickets", "crm-sales-clients", "crm-sales-settings", "hr", "hr-employees"];
  const view = (acc, k) => ACCESS.sectionViewable(acc, k, keys);

  const only = res({ roleIds: ["r_eng"] });          // tickets view/create/edit
  ok("the section they hold is shown", view(only, "crm-sales-tickets"));
  ok("a sibling they do not hold is hidden", !view(only, "crm-sales-clients"));
  ok("the PARENT heading shows because a child does", view(only, "crm-sales"));
  ok("an untouched heading is hidden", !view(only, "hr"));
  ok("the dashboard home has nothing to protect", view(only, "main"));

  ok("buttons appear where a write is held", ACCESS.sectionManageable(only, "crm-sales-tickets", keys));
  // The bug that broke "raise an RFQ": a heading has no areas of its own, so
  // asking whether somebody may manage "crm-sales" answered false for EVERYONE,
  // owners included, until it started asking its children.
  ok("a heading is manageable when a child is", ACCESS.sectionManageable(only, "crm-sales", keys));
  ok("...and not when no child is", !ACCESS.sectionManageable(only, "hr", keys));
  ok("an owner may manage a heading",
    ACCESS.sectionManageable(res({ role: "owner" }), "crm-sales", keys));
  ok("...and not where only view is held",
    !ACCESS.sectionManageable(res({ roleIds: ["r_hr"] }), "hr-employees", keys));

  // The whole point of the rewire: one source, so these cannot disagree.
  const canWrite = ACCESS.can(only, "crmSales.tickets.edit");
  ok("nav and guard agree", ACCESS.sectionManageable(only, "crm-sales-tickets", keys) === canWrite);
}


console.log("\n== assigning access cannot escalate it");
{
  const known = ["role_admin", "r_eng", "r_hr"];
  const clean = ACCESS.cleanAssignment({ roleIds: ["r_eng", "made_up", "r_eng"], overrides: { allow: ["crmSales.clients.view", "nope"], deny: [] } }, known);
  ok("unknown role ids dropped", JSON.stringify(clean.roleIds) === JSON.stringify(["r_eng"]));
  ok("unknown permission keys dropped",
    JSON.stringify(clean.overrides.allow) === JSON.stringify(["crmSales.clients.view"]));

  // A Sales Engineer with people.members.edit tries to widen their own access.
  const actor = res({ roleIds: ["r_eng"], overrides: { allow: ["administration.members.edit"] } });
  ok("cannot grant a permission they lack",
    ACCESS.escalates(actor, { overrides: { allow: ["finance.cash.delete"] } }, roles)?.error === "escalation");
  ok("cannot hand out the Admin wildcard",
    ACCESS.escalates(actor, { roleIds: ["role_admin"] }, roles)?.error === "escalation");
  ok("CAN grant what they do hold",
    ACCESS.escalates(actor, { overrides: { allow: ["crmSales.tickets.edit"] } }, roles) === null);
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
// WHERE THE SERVICE CODE IS, and it stopped being one directory.
//
// These two checks read `src/lib` and nothing else. Wave 3 moved the twelve
// departments into `src/modules/<name>/`, and the scan went on passing — over
// an almost empty list: 12 context builders became 1, and 82 guarded writes
// became 0, with no failure. That is the failure mode a source-scanning test
// has. It cannot tell "nothing is wrong" from "nothing was read", and the
// version that reads nothing never fails again.
//
// So: both trees, both extensions, and a FLOOR under the counts — the two
// assertions at the end of this block are the load-bearing half. A number that
// can only be checked by a human reading the output is not checked.
const SERVICE_FILES = (function collect(dirs) {
  const out = [];
  for (const dir of dirs) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry).split("\\").join("/");
      if (statSync(path).isDirectory()) { out.push(...collect([path])); continue; }
      if (/\.(js|ts)$/.test(path)) out.push({ path, text: readFileSync(path, "utf8") });
    }
  }
  return out;
})(["src/lib", "src/modules"]);

console.log("\n== wiring");
{
  // 1. EVERY CONTEXT CARRIES `access`.
  //
  // THIS CHECK WAS NEARLY DEAD AND NOBODY NOTICED. It matched
  // `export async function xxxContext(...)` and asserted that the body returned
  // `access`. Seam C replaced nine of those hand-written builders with
  // `moduleContext({...})` factory calls, so the pattern stopped matching them —
  // twelve builders became two, the block went on passing, and the assertion it
  // was making no longer covered any module context in the product.
  //
  // Rewritten against what the code IS. There is one factory now, so the
  // property is asserted once, on it — and the second half is the one that
  // matters more: every module context must COME FROM the factory, because a
  // department that hand-rolls its own is a department this check cannot see.
  const factory = SERVICE_FILES.find((f) => f.path.endsWith("modules/context.js")
    || f.path.endsWith("modules/context.ts"));
  ok("  the module-context factory is where it is expected", Boolean(factory));

  if (factory) {
    // It has to appear in the RETURNED object, not merely be destructured.
    ok("  moduleContext returns access to every department it builds",
      /const out = \{[^}]*\baccess\b[^}]*\}/.test(factory.text));
    // studioContext is the one it is built on, and it must carry it too.
    const studios = SERVICE_FILES.find((f) => /\/studios\.(js|ts)$/.test(f.path));
    ok("  studioContext returns access",
      Boolean(studios) && /return\s*\{[\s\S]{0,400}?\baccess\b/.test(studios.text));
  }

  // EVERY MODULE CONTEXT COMES FROM THE FACTORY. mainContext is the one
  // exception and it is a real one: it hands out a `seen` predicate with access
  // captured inside it, and holds no guarded writes of its own.
  const HAND_ROLLED_OK = new Set(["mainContext", "studioContext"]);
  const handRolled = SERVICE_FILES.flatMap(({ path, text }) =>
    [...text.matchAll(/export async function (\w+Context)\s*\(/g)]
      .map((m) => ({ path, name: m[1] })))
    .filter((c) => !HAND_ROLLED_OK.has(c.name));
  ok("  no department hand-rolls its own context",
    handRolled.length === 0, handRolled.map((c) => `${c.path}:${c.name}`).join(", "));

  // THE TYPE ARGUMENT IS OPTIONAL IN THIS PATTERN and it is why the floor below
  // exists: `moduleContext<FinanceContext>(` stopped matching `moduleContext\(`
  // the day the factory became generic, and this count went from nine to zero
  // while every other assertion in the file went on passing.
  const fromFactory = SERVICE_FILES.flatMap(({ text }) =>
    [...text.matchAll(/export const (\w+Context) = moduleContext(?:<[^>]*>)?\(/g)].map((m) => m[1]));
  console.log(`  ${fromFactory.length} module contexts, all from the factory`);
  // THE FLOOR. Twelve departments, and the ones without a moduleContext call are
  // main (hand-rolled, exempt above) and people (no section of its own). A count
  // that drops below this means files stopped being read, which is exactly how
  // this check died the first time.
  ok("  every department that has a context still has one", fromFactory.length >= 9,
    String(fromFactory.length));


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
  for (const { path: f, text } of SERVICE_FILES) {
    // Split on top-level exports so each function's body is its own slice.
    const parts = text.split(/\n(?=export )/);
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

  // THE FLOOR, and it is the assertion this block was missing. Both scans above
  // read the filesystem, and a filesystem scan that finds nothing reports
  // success — which is precisely what happened when the departments moved to
  // src/modules and this went from 82 writes to 0 without failing.
  //
  // 70 rather than 82 so ordinary work does not trip it: a write can legitimately
  // be removed, and the number only has to be far enough above zero that "the
  // scan found nothing" cannot hide underneath it.
  ok("  the write scan is reading real files", checked >= 70, String(checked));
  ok("  ...and so is the file collector", SERVICE_FILES.length >= 40, String(SERVICE_FILES.length));

}


console.log("\n== schemas: what a department says it stores");
// A SCHEMA THAT COMPILES IS NOT A SCHEMA THAT WORKS.
//
// These are transcribed from the coercion that already writes each record, so
// the thing that can go wrong is a transcription error — a field marked
// required that the creator does not always set, a limit copied from the wrong
// line. Either one type-checks perfectly and refuses a real row the first time
// anything parses with it.
//
// So each schema is handed a row shaped the way its own creator writes it, and
// asked. Cheap: no Redis, no fixtures, pure values.
//
// The negative cases are the half that matters. A schema that accepts
// everything would pass every positive assertion above and be worth nothing.
{
  const { TaskSchema } = await import("@/modules/tasks/schema");
  const { RoleSchema, JoinRequestSchema } = await import("@/modules/people/schema");
  const { InvoiceSchema, ExpenseSchema } = await import("@/modules/finance/schema");
  const { VacationSchema, CertificationSchema } = await import("@/modules/hr/schema");
  const { PermitSchema, ShiftSchema, PositionSchema, LocationSchema } =
    await import("@/modules/operations/schema");

  const why = (r) => (r.success ? "" : JSON.stringify(r.error.issues[0]));
  const accepts = (label, schema, row) => {
    const r = schema.safeParse(row);
    ok(`  ${label}`, r.success, why(r));
  };
  const refuses = (label, schema, row) => ok(`  ${label}`, !schema.safeParse(row).success);

  const task = {
    id: "tas_1", studioId: "std_1", sectionId: "sec_1", title: "Fit the panel", type: "",
    description: "", status: "To do", priority: "Normal", assigneeCollaboratorId: "",
    projectId: "", dueDate: "", checklist: [{ id: "c1", text: "Unbox", done: false }],
    createdByCollaboratorId: "col_1", createdAt: "2026-08-22T00:00:00.000Z", completedAt: "",
    approvals: {}, approvalWithdrawnAt: "",
  };
  accepts("a task as createTask writes it", TaskSchema, task);
  refuses("...and not one without a title", TaskSchema, { ...task, title: undefined });

  const role = {
    id: "rol_1", studioId: "std_1", name: "Engineer", permissions: ["crmSales.tickets.view"],
    scopes: { "hr.employees": "department" }, createdAt: "x",
  };
  accepts("a role as cleanRole writes it", RoleSchema, role);
  // THE ENUM COMES FROM THE CATALOGUE. This is the assertion that says so: a
  // scope the access module does not define is refused here without this file
  // knowing what the three are.
  refuses("...and not a scope the catalogue has never heard of", RoleSchema,
    { ...role, scopes: { "hr.employees": "everything" } });

  accepts("a join request", JoinRequestSchema, {
    id: "req_1", studioId: "std_1", userId: "usr_1", status: "pending",
    createdAt: "x", decidedAt: "", decidedByCollaboratorId: "",
  });

  const invoice = {
    id: "inv_1", studioId: "s", sectionId: "sec", reference: "INV-0001",
    // `qty`, NOT `quantity` — cleanLines writes `qty` and invoiceTotals reads
    // it. The schema said `quantity` for a while and this fixture agreed with
    // the schema instead of with the code, so the pair passed while neither
    // matched a stored invoice. Inventory is where `quantity` is the word.
    projectId: "", clientName: "Acme", lines: [{ description: "Panel", qty: 2, unitPrice: 50 }],
    vatRate: 15, status: "Draft", issueDate: "2026-08-22", dueDate: "", notes: "",
  };
  accepts("an invoice as createInvoice writes it", InvoiceSchema, invoice);
  refuses("...and not a VAT rate above 100", InvoiceSchema, { ...invoice, vatRate: 150 });

  accepts("an expense", ExpenseSchema, {
    id: "exp_1", studioId: "s", sectionId: "sec", reference: "EXP-0001", amount: 42, category: "Travel",
  });

  // BOTH DATE SPELLINGS, and this is where that is recorded rather than
  // remembered: rows written by the request screen carry from/to, newer ones
  // carry startDate/endDate, and both are still read.
  accepts("a vacation with from/to", VacationSchema, {
    id: "vac_1", studioId: "s", sectionId: "sec", collaboratorId: "col_1", kind: "Annual",
    from: "2026-09-01", to: "2026-09-05", status: "Pending", createdAt: "x",
  });
  accepts("...and one with startDate/endDate", VacationSchema, {
    id: "vac_2", studioId: "s", sectionId: "sec", collaboratorId: "col_1", kind: "Annual",
    startDate: "2026-09-01", endDate: "2026-09-05", status: "Pending", createdAt: "x",
  });

  accepts("a certification", CertificationSchema, {
    id: "cer_1", studioId: "s", sectionId: "sec", name: "IPAF", issuer: "",
    validityMonths: 0, notes: "", createdAt: "x",
  });
  accepts("a permit", PermitSchema, { id: "per_1", studioId: "s", sectionId: "sec" });
  accepts("a shift", ShiftSchema, { id: "shi_1", studioId: "s", sectionId: "sec" });
  accepts("a position", PositionSchema, {
    id: "pos_1", studioId: "s", sectionId: "sec", collaboratorId: "col_1", at: "x",
  });
  accepts("a location", LocationSchema, {
    id: "loc_1", studioId: "s", sectionId: "sec", name: "Yard", kind: "Site",
  });
}

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
