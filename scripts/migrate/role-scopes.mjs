// ONE-OFF SCOPE BACKFILL (CLI) — department scope for the roles that answer
// their team's leave.
//
// Every library role was written with `scopes: {}`, and an unscoped area falls
// back to `own` (`scopeFor` in platform/access/resolve.ts). So a department head
// holding `hr.vacations.approve` was rung by the approval bell and then shown
// only their OWN leave — nothing to approve — and the same for attendance and
// the employee cards. New roles now arrive with their archetype's scopes
// (`scopesFor` in modules/people/archetypes.ts); this reaches the roles that
// already exist, because `STARTER_ROLES` and the library never re-seed a studio
// that has roles.
//
//   node scripts/migrate/role-scopes.mjs [--studio ID] [--apply] [--allow-live]
//
// WHICH ROLES, AND WHY BY RIGHT RATHER THAN BY NAME. A stored role carries no
// archetype, and a studio renames roles freely. What marks a role as one that
// manages people is the right it holds: `hr.vacations.approve`. Such a role gets
// `department` on each of hr.employees, hr.vacations and hr.attendance that it
// can VIEW — never on an area it holds nothing in, where a scope decides nothing.
//
// IT NEVER NARROWS AND NEVER OVERRIDES. An area the studio has already scoped —
// to anything, `own` included — is left exactly as it is: that is a decision
// somebody made on the Access screen, and a migration does not second-guess it.
// Only an area with NO scope stored is given one. Admin (wildcard) is skipped.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md: there is no dev
// database), and this WRITES, so it is guarded the way grant-administration.mjs
// is:
//   • DRY-RUN BY DEFAULT. Without --apply it only reads and reports.
//   • It refuses the live namespace unless NOMPANY_KEY_PREFIX is set or
//     --allow-live is passed.
// Additive and idempotent: a second --apply writes nothing.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALLOW_LIVE = argv.includes("--allow-live");
const ONE_STUDIO = (() => {
  const i = argv.indexOf("--studio");
  return i >= 0 ? argv[i + 1] : "";
})();

try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI or an already-exported shell */ }

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — nothing to read from.");
  process.exit(1);
}

const prefix = process.env.NOMPANY_KEY_PREFIX || "";
if (!prefix && !ALLOW_LIVE) {
  console.error(
    "Refusing to run against the LIVE namespace.\n\n"
    + "  Set NOMPANY_KEY_PREFIX to work in a sandbox, or pass --allow-live\n"
    + "  once you have read a dry run and mean it.\n",
  );
  process.exit(1);
}

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { listStudios } = await import("@/modules/main/studios");
const { listRoles, updateRole } = await import("@/modules/people/roles");

const MANAGES_PEOPLE = "hr.vacations.approve";
const AREAS = ["hr.employees", "hr.vacations", "hr.attendance"];

const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();

console.log(
  `\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", `
  + `${studios.length} studio(s) …\n`,
);

let changedStudios = 0;
let changedRoles = 0;

for (const studio of studios) {
  const roles = await listRoles(studio.id);
  const lines = [];

  for (const role of roles) {
    if (role.wildcard) continue;
    const held = new Set(role.permissions || []);
    if (!held.has(MANAGES_PEOPLE)) continue;

    const scopes = { ...(role.scopes || {}) };
    const added = AREAS.filter((area) => !(area in scopes) && held.has(`${area}.view`));
    if (!added.length) continue;

    for (const area of added) scopes[area] = "department";
    lines.push(`    ${role.name} (${role.id}) → department on ${added.join(", ")}`);
    if (APPLY) await updateRole(studio.id, role.id, { scopes });
    changedRoles += 1;
  }

  if (lines.length) {
    changedStudios += 1;
    console.log(`  ${studio.slug || studio.id}`);
    for (const l of lines) console.log(l);
  }
}

console.log(`\nStudios changed : ${changedStudios}`);
console.log(`Roles changed   : ${changedRoles}`);
if (!APPLY) console.log("(dry run — nothing written; re-run with --apply to scope)");
console.log("");
process.exit(0);
