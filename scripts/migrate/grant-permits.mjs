// ONE-OFF GRANT BACKFILL (CLI) — the permit right, for the roles that held
// permits through Tracking (tier 5, one permit register).
//
// Permits answered to `fieldService.tracking.*` — the right that governs where
// people are — and moved to Quality & HSE with a right of their own,
// `qualityHse.permits.*`. A studio's existing roles hold the old one and not the
// new, because roles never re-seed a studio that has them (CLAUDE.md, "ROLES DO
// NOT CATCH UP"). This gives every role holding Tracking verb V the permit verb
// V, and copies Tracking's scope across when the permit area has none.
//
//   node scripts/migrate/grant-permits.mjs [--studio ID] [--apply] [--allow-live]
//
// NOTHING BREAKS BEFORE IT RUNS: until then the permit services also accept
// Tracking's right (`permitDenied` in modules/operations/operations.ts). What
// waits on it is the Quality & HSE screen itself, whose view guard asks the new
// right — and that fallback can be removed once every studio has been run.
//
// ADDITIVE AND IDEMPOTENT: it only adds a verb a role lacks and never removes
// Tracking — a role that tracks people still does. Admin (wildcard) is skipped.
// Collaborators' individual overrides are not touched; the report says how many
// hold Tracking through one, so somebody can grant the permit right by hand.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md), and this WRITES:
//   • DRY-RUN BY DEFAULT. Without --apply it only reads and reports.
//   • It refuses the live namespace unless NOMPANY_KEY_PREFIX is set or
//     --allow-live is passed.

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
const { listCollaborators } = await import("@/platform/auth/collaborators");

const FROM = "fieldService.tracking";
const TO = "qualityHse.permits";
const VERBS = ["view", "create", "edit", "delete"];

const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);

let changedStudios = 0;
let changedRoles = 0;
let overrides = 0;

for (const studio of studios) {
  const [roles, people] = await Promise.all([listRoles(studio.id), listCollaborators(studio.id)]);
  const lines = [];

  for (const role of roles) {
    if (role.wildcard) continue;
    const held = new Set(role.permissions || []);
    const add = VERBS.filter((v) => held.has(`${FROM}.${v}`) && !held.has(`${TO}.${v}`)).map((v) => `${TO}.${v}`);
    const scopes = { ...(role.scopes || {}) };
    const copyScope = FROM in scopes && !(TO in scopes) && (add.length || held.has(`${TO}.view`));
    if (!add.length && !copyScope) continue;
    if (copyScope) scopes[TO] = scopes[FROM];

    lines.push(`    ${role.name} (${role.id}) → + ${add.join(", ") || "(scope only)"}${copyScope ? `, scope ${scopes[TO]}` : ""}`);
    if (APPLY) await updateRole(studio.id, role.id, { permissions: [...held, ...add], scopes });
    changedRoles += 1;
  }

  // REPORTED, NOT WRITTEN: an individual override is a decision somebody made
  // about one person, and a migration does not extend it on their behalf.
  const byOverride = people.filter((c) =>
    Array.isArray(c.permissions) && c.permissions.some((p) => String(p).startsWith(`${FROM}.`)));
  overrides += byOverride.length;

  if (lines.length || byOverride.length) {
    changedStudios += 1;
    console.log(`  ${studio.slug || studio.id}`);
    for (const l of lines) console.log(l);
    if (byOverride.length) console.log(`    ${byOverride.length} person(s) hold Tracking through an individual override — grant the permit right on the Access screen`);
  }
}

console.log(`\nStudios changed        : ${changedStudios}`);
console.log(`Roles changed          : ${changedRoles}`);
console.log(`Overrides left to hand : ${overrides}`);
if (!APPLY) console.log("(dry run — nothing written; re-run with --apply to grant)");
console.log("");
process.exit(0);
