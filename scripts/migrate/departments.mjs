// ONE-OFF DATA MIGRATION (CLI) — section keys become department rows.
//
// While departments were DERIVED from the nav, `departmentId` on a collaborator
// held a SECTION KEY ("crm-sales"). The register is stored again, so the field
// holds a row id, and every person already placed is pointing at a value that
// names nothing.
//
//   node scripts/migrate/departments.mjs [--studio ID] [--apply] [--allow-live]
//
// WHAT IT DOES, AND THE ONE THING IT REFUSES TO DO.
//
// For each studio it collects the distinct legacy values people actually hold,
// creates ONE department per value — named after the section, carrying that
// section key in `sectionKeys` — and rewrites each person onto the new id.
//
// IT DOES NOT MAP ANYBODY ONTO THE STARTER CHART. It would be easy to notice
// that a construction studio's "projects" people probably belong in Site
// Execution, and it would be a guess: nobody asked for it, the studio cannot
// see it happening, and un-guessing it afterwards means knowing who was where
// before. So the migration is a faithful rename and nothing else. What the
// studio had is what it gets, under names it recognises, and the screen offers
// the standard chart as an ADDITION it can accept or ignore.
//
// A CONSEQUENCE WORTH KNOWING: a migrated studio's register is not empty, so
// the lazy seed in listDepartments never fires for it. That is deliberate —
// seeding on top of a migration would mix invented departments into a chart the
// studio can already read, and the "add the ones we're missing" button exists
// precisely so that choice stays theirs.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md: there is no dev
// database), and this WRITES, so it is guarded exactly as its two siblings are:
//   • DRY-RUN BY DEFAULT. Without --apply it only READS and reports.
//   • It refuses the live namespace unless you say so: run under
//     NOMPANY_KEY_PREFIX (a sandbox namespace) OR pass --allow-live.
//
// IT IS IDEMPOTENT. A person whose departmentId already names a real department
// row is skipped, so --apply is safe to re-run; a second run reports zero.
//
// IT DELETES NOTHING — no row, no field, no prefix — so invariant 17's
// two-confirmation dance does not apply. It still names its studios from the
// registry rather than writing by predicate, which is the half of invariant 17
// that governs writes.
//
// ORDER MATTERS, the lesson plant-sections.mjs paid for: run this BEFORE
// anybody edits the register on a live studio. A department created by hand
// first is not wrong, it just means the studio has two rows for one team.

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
const { listSections } = await import("@/platform/db/sections");
const { listCollaborators, updateCollaborator } = await import("@/platform/auth/collaborators");
const { repo } = await import("@/platform/db/repo");
// WHAT IT WOULD DO IS DECIDED WITHOUT A STORE, in shared/departments/migrate.ts,
// so it can be asserted on a laptop with no connection. This file reads, calls
// that, and writes. A migration is the one kind of code run once against live
// data by somebody who cannot undo it; the deciding half should not require a
// database to inspect.
const { departmentMigrationPlan, planIsEmpty } = await import("@/shared/departments/migrate");

const Departments = repo("departments");

const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();

console.log(
  `\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", `
  + `${studios.length} studio(s) …\n`,
);

let changedStudios = 0;
let createdRows = 0;
let movedPeople = 0;

for (const studio of studios) {
  const sections = await listSections(studio.id);
  const master = sections.find((s) => s.key === "administration-master");
  if (!master) {
    // The register has nowhere to live. plant-sections.mjs is the fix, and
    // saying so beats writing rows under a section this studio does not have.
    console.log(`  ${studio.id}: no administration-master section — run plant-sections.mjs first`);
    continue;
  }

  const [people, existing] = await Promise.all([
    listCollaborators(studio.id),
    Departments.find({ studio, section: master }),
  ]);

  const sectionNames = Object.fromEntries(sections.map((sec) => [sec.key, sec.name || sec.key]));
  const plan = departmentMigrationPlan({ people, departments: existing, sectionNames });
  if (planIsEmpty(plan)) continue;

  const lines = [];
  const idFor = { ...plan.reuse };
  for (const [key, id] of Object.entries(plan.reuse)) {
    lines.push(`    ${key} -> existing "${existing.find((d) => d.id === id)?.name || id}"`);
  }
  for (const row of plan.create) {
    lines.push(`    ${row.key} -> new department "${row.name}"`);
    if (APPLY) {
      const created = await Departments.create({ studio, section: master }, {
        name: row.name,
        code: "",
        parentId: "",
        managerCollaboratorId: "",
        sectionKeys: row.sectionKeys,
        createdAt: new Date().toISOString(),
      });
      idFor[row.key] = created.id;
      createdRows += 1;
    }
  }

  lines.push(`    ${plan.moving.length} person(s) re-pointed`);
  if (APPLY) {
    // BY THE PLAN'S OWN LIST, not by re-reading the people: the plan decided
    // who moves, and re-deriving it here would be a second answer free to
    // disagree with the one that was printed in the dry run.
    const byId = Object.fromEntries(people.map((c) => [c.id, c]));
    for (const collaboratorId of plan.moving) {
      const next = idFor[String(byId[collaboratorId]?.departmentId || "")];
      if (!next) continue;
      await updateCollaborator(studio.id, collaboratorId, { departmentId: next });
      movedPeople += 1;
    }
  }
  changedStudios += 1;
  console.log(`  ${studio.id}${studio.slug ? ` (${studio.slug})` : ""}:`);
  for (const line of lines) console.log(line);
}

console.log(
  `\n${APPLY ? "Applied" : "Would change"}: ${changedStudios} studio(s), `
  + `${APPLY ? createdRows : "?"} department(s) created, ${APPLY ? movedPeople : "?"} person(s) moved.`,
);
if (!APPLY) console.log("Re-run with --apply to write.\n");
