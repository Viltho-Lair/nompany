// ONE-OFF GRANT BACKFILL (CLI) — the Maintenance rights, for the roles that
// kept the maintenance register under Assets.
//
// Until 11/09/2026 the only maintenance record was the engine's `maintenance`
// register under Assets & Equipment, governed by `engine.maintenance.*`. The
// Maintenance section brings `maintenance.requests.*` and `maintenance.orders.*`,
// and a studio's existing roles hold neither, because roles never re-seed a
// studio that has them (CLAUDE.md, "ROLES DO NOT CATCH UP"). This gives every
// role holding engine-maintenance verb V the same verb on BOTH new areas:
// whoever kept the register takes the fault reports and dispatches the work.
//
//   node scripts/migrate/grant-maintenance.mjs [--studio ID] [--apply] [--allow-live]
//
// ORDER: run `plant-sections.mjs` FIRST on an existing studio, so the
// Maintenance sections exist before anybody can reach them; this script only
// decides who can.
//
// ADDITIVE AND IDEMPOTENT: it only adds a verb a role lacks and never removes
// the engine right — the register is still there until it is migrated. Admin
// (wildcard) is skipped. Individual overrides are reported, not written.
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

const FROM = "engine.maintenance";
// Plans too: whoever kept the register is who scheduled what was due.
const TO = ["maintenance.requests", "maintenance.orders", "maintenance.plans"];
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
    const add = TO.flatMap((area) =>
      VERBS.filter((v) => held.has(`${FROM}.${v}`) && !held.has(`${area}.${v}`)).map((v) => `${area}.${v}`));
    if (!add.length) continue;
    lines.push(`    ${role.name} (${role.id}) → + ${add.join(", ")}`);
    if (APPLY) await updateRole(studio.id, role.id, { permissions: [...held, ...add] });
    changedRoles += 1;
  }

  const byOverride = people.filter((c) =>
    Array.isArray(c.permissions) && c.permissions.some((p) => String(p).startsWith(`${FROM}.`)));
  overrides += byOverride.length;

  if (lines.length || byOverride.length) {
    changedStudios += 1;
    console.log(`  ${studio.slug || studio.id}`);
    for (const l of lines) console.log(l);
    if (byOverride.length) console.log(`    ${byOverride.length} person(s) hold the maintenance register through an individual override — grant Maintenance on the Access screen`);
  }
}

console.log(`\nStudios changed        : ${changedStudios}`);
console.log(`Roles changed          : ${changedRoles}`);
console.log(`Overrides left to hand : ${overrides}`);
if (!APPLY) console.log("(dry run — nothing written; re-run with --apply to grant)");
console.log("");
process.exit(0);
