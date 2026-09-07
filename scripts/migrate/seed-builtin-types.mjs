// ONE-OFF RECORD-TYPE BACKFILL (CLI) — the other half of P4b phase 1.
//
// `seedBuiltinTypes` runs inside `createStudio` and nowhere else, which is the
// one way it differs from the two seeds beside it: sections catch up on read
// (`listSections` plants what a studio is short of) and the departments
// register seeds on read, so a studio predating either repairs itself the next
// time somebody opens it. A studio created before the engine shipped gets no
// record type at all, ever, on its own.
//
// AND A READ-PATH CATCH-UP COULD NOT RESCUE IT. Every engine read is gated on
// `engine.<typeKey>.view`, a key no existing studio's roles carry, so the
// request that would trigger the catch-up is the request that is refused before
// it gets there — the seed would be waiting on a door only the seed can open.
// This walks the studios deliberately instead.
//
//   node scripts/migrate/seed-builtin-types.mjs [--studio ID] [--apply] [--allow-live]
//
// `NOMPANY_KEY_PREFIX` PROTECTS HALF OF WHAT THIS WRITES, AND ONLY HALF. It
// namespaces the SECTION write, which is a key (`S.sections`) in `documents`.
// It does NOT namespace the type ROW, which goes to `collection_rows` under a
// real `tenant_id` — the trap CLAUDE.md spells out twice. So a sandbox run of
// this leaves real rows in the live shared table, cleaned only by
// `sweepPgTenants` against the ids `REG.studios` names. Do not read the prefix
// as a sandbox for this script.
//
// RUN `plant-sections.mjs` FIRST ON AN OLD STUDIO. A type plants its own
// sub-section under a parent that has to exist already, and a studio missing
// `engineering-docs` or `administration-settings` is REPORTED here and skipped
// whole rather than seeded into nothing. That order is not a preference: a
// sub-section falls back to its ROOT when absent, so rows written before the
// section exists land under the parent where nothing reads them — not deleted,
// not corrupted, invisible. The tender register paid for that once (three
// tenders created before planting, zero visible after), and neither
// `plantTypeSection` nor this repeats it.
//
// IT SEEDS THROUGH `seedBuiltinTypes` RATHER THAN REIMPLEMENTING IT. A second
// copy of the seed is free to disagree with the first — about the field list,
// about `origin`, about the order the section and the row are written in — and
// the disagreement would show up as a studio whose built-in type is subtly not
// the built-in type. Everything below the reporting is one call.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md: there is no dev
// database), and this WRITES, so it is guarded the way plant-sections.mjs and
// grant-administration.mjs are:
//   • DRY-RUN BY DEFAULT. Without --apply it only READS and reports what it
//     would seed. Run it first and read the plan.
//   • It refuses the live namespace unless you say so: run under
//     NOMPANY_KEY_PREFIX (a sandbox namespace) OR pass --allow-live.
//
// IT IS ADDITIVE AND IDEMPOTENT, and both properties are `seedBuiltinTypes`'s
// rather than this script's: it skips any type the studio already has by key,
// and `plantTypeSection` returns the existing section rather than a second one.
// So --apply is safe to re-run and a second run reports zero changes. IT NEVER
// OVERWRITES A TYPE A STUDIO ALREADY HOLDS — a studio that has edited its own
// copy keeps the edit, the same courtesy the departments register extends to a
// trade's chart.
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

// ---- env (Next loads .env.local; this plain-Node process must do it itself) --
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

// ---- the suites' loader, so `@/…` and TS strip work in plain Node ----------
const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { listStudios } = await import("@/modules/main/studios");
const { BUILTIN_TYPES, seedBuiltinTypes } = await import("@/platform/engine/builtins");
// `getSectionByKey` READS the stored array and plants nothing (`readArr`),
// which is what a dry run needs: `listSections` would heal the very studios
// this is reporting as short and then say nothing was written.
const { getSectionByKey } = await import("@/platform/db/sections");
const { repo } = await import("@/platform/db/repo");

const Types = repo("recordTypes");

const studios = ONE_STUDIO ? [{ id: ONE_STUDIO }] : await listStudios();

console.log(
  `\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", `
  + `${studios.length} studio(s), ${BUILTIN_TYPES.length} built-in type(s) …\n`,
);

let changedStudios = 0;
let seededTypes = 0;
let blockedStudios = 0;

for (const studio of studios) {
  const id = String(studio.id || "");
  if (!id) continue;
  const name = studio.slug || id;

  // BOTH ENGINE COLLECTIONS ARE ADDRESSED UNDER administration-settings
  // (keys.ts), so a studio without it has nowhere to put a type at all —
  // `seedBuiltinTypes` returns silently in that case, and a silent skip in a
  // migration report is the thing that gets forgotten. Named instead.
  const settings = await getSectionByKey(id, "administration-settings");
  if (!settings) {
    blockedStudios += 1;
    console.log(`  ${name}\n    SKIPPED — no administration-settings section; run plant-sections.mjs first`);
    continue;
  }

  const existing = await Types.find({ studio: { id }, section: settings });
  const have = new Set(existing.map((t) => String(t.key)));
  const lines = [];
  let blocked = false;

  for (const decl of BUILTIN_TYPES) {
    if (have.has(decl.key)) continue;
    // A TYPE WHOSE PARENT SECTION IS ABSENT IS SKIPPED WHOLE by
    // `plantTypeSection`, which answers null rather than planting at the root.
    // Reported here for the same reason: the studio needs plant-sections.mjs,
    // and "seeded 0" with no explanation reads as "already done".
    const parent = await getSectionByKey(id, decl.parentSectionKey);
    if (!parent) {
      blocked = true;
      lines.push(`    ${decl.key}: BLOCKED — no ${decl.parentSectionKey} section; run plant-sections.mjs first`);
      continue;
    }
    lines.push(`    ${decl.key}: + section engine-${decl.key}, + type row`);
    seededTypes += 1;
  }

  if (!lines.length) continue;
  changedStudios += 1;
  if (blocked) blockedStudios += 1;
  console.log(`  ${name}`);
  for (const l of lines) console.log(l);

  // ONE CALL, and it is the SAME call `createStudio` makes. It re-reads the
  // studio's types itself and skips what is already there, so what is written
  // here cannot drift from what a new studio is born with.
  if (APPLY) await seedBuiltinTypes(id);
}

console.log(`\nStudios changed : ${changedStudios}`);
console.log(`Types seeded    : ${seededTypes}`);
if (blockedStudios) console.log(`Studios blocked : ${blockedStudios} (missing a section — run plant-sections.mjs)`);
if (!APPLY) console.log("(dry run — nothing written; re-run with --apply to seed)");
console.log("");
process.exit(0);
