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

  const byId = new Set(existing.map((d) => d.id));
  const sectionName = Object.fromEntries(sections.map((s) => [s.key, s.name || s.key]));
  // Already a department row → nothing to do. Blank → nothing to do either: an
  // unplaced person stays unplaced rather than being filed somewhere by a script.
  const legacy = [...new Set(people
    .map((c) => String(c.departmentId || ""))
    .filter((v) => v && !byId.has(v)))];

  if (!legacy.length) continue;

  const lines = [];
  const idFor = {};
  for (const key of legacy) {
    // A value that is not a section key either is a department row from a
    // studio that has already been migrated (caught above) or is data nobody
    // can account for. Named after the section where there is one, after
    // itself where there is not — visible and fixable either way.
    const name = sectionName[key] || key;
    const already = existing.find((d) => (d.sectionKeys || []).includes(key) || d.name === name);
    if (already) { idFor[key] = already.id; lines.push(`    ${key} → existing "${already.name}"`); continue; }
    lines.push(`    ${key} → new department "${name}"`);
    if (APPLY) {
      const row = await Departments.create({ studio, section: master }, {
        name,
        code: "",
        parentId: "",
        managerCollaboratorId: "",
        sectionKeys: sectionName[key] ? [key] : [],
        createdAt: new Date().toISOString(),
      });
      idFor[key] = row.id;
      createdRows += 1;
    }
  }

  const moving = people.filter((c) => legacy.includes(String(c.departmentId || "")));
  lines.push(`    ${moving.length} person(s) re-pointed`);
  if (APPLY) {
    for (const person of moving) {
      const next = idFor[String(person.departmentId)];
      if (!next) continue;
      await updateCollaborator(studio.id, person.id, { departmentId: next });
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
