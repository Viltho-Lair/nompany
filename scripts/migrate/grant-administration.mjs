// ONE-OFF PERMISSION BACKFILL (CLI) — the Administration fold's other half.
//
// Folding Administration & Settings into a real section gated People on
// `administration.members.view`. Before that, the People screen was shown to
// EVERY member (StudioFrame's `show: true`), so gating it takes the screen away
// from everybody whose role does not hold the new right — which is every role,
// because the right decided nothing until now.
//
//   node scripts/migrate/grant-administration.mjs [--studio ID] [--apply] [--allow-live]
//
// WHAT IT GRANTS, AND WHAT IT DELIBERATELY DOES NOT.
//
//   Manager    → administration.members.view
//   Team Lead  → administration.members.view
//   Member     → nothing
//   Viewer     → nothing
//   Admin      → nothing, because it is `wildcard: true` and already answers
//                for every key. Writing permissions onto a wildcard role would
//                teach the next reader to distrust what wildcard means.
//
// SO MEMBERS AND VIEWERS LOSE THE PEOPLE SCREEN, and that is the change
// working rather than failing. Who else is in the studio, and with what roles,
// is a management view. This script does NOT restore the previous reach: doing
// that would mean granting the right to every role, which is the opposite of
// what making it a right was for. A studio that disagrees grants it — that is
// now possible, and it was not before.
//
// NOTHING IS GRANTED FOR administration.access. The roles screen was
// admin-only before the fold and admins hold it through the wildcard, so
// nobody's access changes and no default hands role editing to a new group.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md: there is no dev
// database), and this WRITES, so it is guarded the way plant-sections.mjs is:
//   • DRY-RUN BY DEFAULT. Without --apply it only READS and reports what it
//     would change. Run it first and read the plan.
//   • It refuses the live namespace unless you say so: run under
//     NOMPANY_KEY_PREFIX (a sandbox namespace) OR pass --allow-live.
//
// IT IS ADDITIVE AND IDEMPOTENT. It appends a key to a role's list when absent
// and writes nothing when present, so --apply is safe to re-run. IT NEVER
// REMOVES A PERMISSION — not one, not ever: a migration that can take a right
// away is a migration that can lock somebody out of their own studio.
//
// It is not a destructive op (no delete, flush, drop or unbounded overwrite),
// so it does not need invariant 17's two-confirmation dance — but it names the
// studios it touches from the registry rather than writing by predicate, which
// is the half of invariant 17 that applies to writes.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALLOW_LIVE = argv.includes("--allow-live");
const ONE_STUDIO = (() => {
  const i = argv.indexOf("--studio");
  return i >= 0 ? argv[i + 1] : "";
})();

// ---- env -------------------------------------------------------------------
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

// Refuse the live namespace unless explicitly allowed. An empty prefix IS
// production (keys.ts), so touching it is the thing the guard is about.
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

// THE GRANTS, BY ROLE ID rather than by name. A studio can rename a starter
// role — "Manager" may be "Head of Department" — and a rename must not decide
// who keeps a screen.
const GRANTS = {
  role_manager: ["administration.members.view"],
  role_lead: ["administration.members.view"],
};

const studios = ONE_STUDIO
  ? [{ id: ONE_STUDIO }]
  : await listStudios();

console.log(
  `\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", `
  + `${studios.length} studio(s) …\n`,
);

let changedStudios = 0;
let changedRoles = 0;

for (const studio of studios) {
  const roles = await listRoles(studio.id);
  const lines = [];

  for (const [roleId, keys] of Object.entries(GRANTS)) {
    const role = roles.find((r) => r.id === roleId);
    // A studio that deleted a starter role is not an error — it decided it did
    // not want that role, and inventing it back would be a different migration.
    if (!role) continue;
    if (role.wildcard) continue;

    const held = new Set(role.permissions || []);
    const missing = keys.filter((k) => !held.has(k));
    if (!missing.length) continue;

    lines.push(`    ${role.name} (${roleId}) += ${missing.join(", ")}`);
    if (APPLY) {
      // ADDITIVE: the existing list, then what it lacked. Never a replacement,
      // so a permission a studio added by hand survives this untouched.
      await updateRole(studio.id, roleId, {
        permissions: [...(role.permissions || []), ...missing],
      });
    }
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
if (!APPLY) console.log("(dry run — nothing written; re-run with --apply to grant)");
console.log("");
process.exit(0);
