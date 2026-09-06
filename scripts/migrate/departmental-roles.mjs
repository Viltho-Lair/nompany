// ONE-OFF ROLE MIGRATION (CLI) — the four generic starter roles leave.
//
//   node scripts/migrate/departmental-roles.mjs [--studio ID] [--apply] [--allow-live]
//
// A studio used to start with five roles — Admin, Manager, Team Lead, Member,
// Viewer — and they were the same five whatever it did. Departments are seeded
// per field of work now and bring the roles their trade uses, so the generic
// four have somewhere better to be: "Site Engineer" under Site Execution says
// what "Member" never could, and two roles of one name in different departments
// can hold different access.
//
// New studios already never get them: STARTER_ROLES is Admin alone. This is the
// other half — removing them from studios that already have them.
//
// ADMIN IS NEVER TOUCHED. It is the one wildcard, the role that has to keep
// meaning everything as the product grows, and deleteRole refuses it anyway.
//
// IT REFUSES A STUDIO WHERE ANYBODY STILL HOLDS ONE, and that refusal is the
// whole safety of this script. Deleting a held role takes its access off every
// person holding it — cascadeDeleteRole reaps the reference so nobody is left
// pointing at a role that is gone — so a studio with holders is LEFT WORKING,
// named, and reported. That is the intended resting state rather than a
// failure: those people are doing their jobs under roles that still grant what
// they granted yesterday.
//
// THE EXIT IS A PERSON, DELIBERATELY. The only way a script could clear the
// refusal by itself is by guessing which departmental role each person should
// hold instead, and that guess is somebody's access. So: re-role them in HR,
// then run this again.
//
// BY ROLE ID, NOT BY NAME. A studio can rename a starter role — "Manager" may
// be "Head of Department" — and a rename must not decide whether it is removed.
// The same reasoning grant-administration.mjs states for the same four ids.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md: there is no dev
// database), and this DELETES, so it is guarded the way its siblings are:
//   • DRY-RUN BY DEFAULT. Without --apply it only READS and reports.
//   • It refuses the live namespace unless you say so: run under
//     NOMPANY_KEY_PREFIX (a sandbox namespace) OR pass --allow-live.
//
// This one DOES delete, so invariant 17's discipline applies in full: the dry
// run is the export, the deletion is by an explicit id list read back from the
// studio's own roles, and the re-run proves the result. It is idempotent — a
// studio whose four are already gone reports nothing to do.

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
const { listRoles, deleteRole } = await import("@/modules/people/roles");
const { listCollaborators } = await import("@/platform/auth/collaborators");
// WHAT IT WOULD DO IS DECIDED WITHOUT A STORE, in shared/roles/retire.ts, so it
// can be asserted on a laptop with no connection. This file reads, calls that,
// and deletes — the same split the departments migration uses, and for the same
// reason: a dry run that exercises nothing looks exactly like one that passes.
const { retirePlan, nothingToRetire } = await import("@/shared/roles/retire");

const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();

console.log(
  `\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", `
  + `${studios.length} studio(s) …\n`,
);

let cleared = 0;
let refused = 0;
let removed = 0;

for (const studio of studios) {
  const [roles, people] = await Promise.all([
    listRoles(studio.id),
    listCollaborators(studio.id),
  ]);

  const plan = retirePlan({ roles, people });
  if (nothingToRetire(plan)) continue;

  const label = `${studio.id}${studio.slug ? ` (${studio.slug})` : ""}`;

  if (plan.refused) {
    refused += 1;
    console.log(`  ${label}: REFUSED — somebody still holds these`);
    for (const [id, n] of Object.entries(plan.holders)) {
      const role = roles.find((r) => r.id === id);
      console.log(`      ${role?.name || id} (${id}): ${n} holder(s)`);
    }
    console.log("      Re-role those people in HR, then run this again.");
    continue;
  }

  cleared += 1;
  console.log(`  ${label}: ${plan.remove.map((r) => `${r.name} (${r.id})`).join(", ")}`);
  if (APPLY) {
    for (const role of plan.remove) {
      // By explicit id, read back from this studio's own roles a moment ago —
      // never by name and never by predicate.
      const out = await deleteRole(studio.id, role.id);
      if (out?.error) { console.log(`      ${role.id}: ${out.error}`); continue; }
      removed += 1;
    }
  }
}

console.log(
  `\n${APPLY ? "Applied" : "Would change"}: ${cleared} studio(s) clear, `
  + `${refused} refused, ${APPLY ? removed : "?"} role(s) removed.`,
);
if (refused) {
  console.log(
    "\nA REFUSED STUDIO IS LEFT WORKING. Its people keep the access they had;\n"
    + "nothing was written for it. Re-role them and run again.",
  );
}
if (!APPLY) console.log("\nRe-run with --apply to write.\n");
