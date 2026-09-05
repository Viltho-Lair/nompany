// ONE-OFF SECTION BACKFILL (CLI) — the other half of R2.
//
// listSections stopped reconciling on every request (see src/platform/db/sections.ts).
// A studio is seeded complete at creation, so the only studios that can be
// missing a seeded section are ones created BEFORE that section key was added to
// SECTION_DEFS. This walks every studio (or one, with --studio) and plants any
// missing seeded sections ONCE, restoring the exact list listSections used to
// re-derive on the fly.
//
//   node scripts/migrate/plant-sections.mjs [--studio ID] [--apply] [--allow-live]
//
// SAFETY — the read is against the LIVE, SHARED Redis (CLAUDE.md: there is no dev
// database), and this is the rare migration that WRITES, so it is guarded twice:
//   • DRY-RUN BY DEFAULT. Without --apply it only READS and reports which studios
//     are short and by how much — nothing is written. Run it first, read the plan.
//   • It refuses the live namespace unless you say so: run under NOMPANY_KEY_PREFIX
//     (a sandbox namespace) OR pass --allow-live.
//
// IT IS ADDITIVE AND IDEMPOTENT — plantMissingSections plants missing rows through
// editArr (compare-and-set), never deletes, and writes nothing to a studio that is
// already complete. So --apply is safe to re-run and cannot lose data. It is NOT a
// destructive op (no delete, flush, drop, or unbounded overwrite), so it does not
// need the two-confirmation dance invariant #17 governs — but read the dry run.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const STUDIO = opt("studio", "");
const APPLY = flag("apply");
const ALLOW_LIVE = flag("allow-live");

// ---- env (Next loads .env.local; this plain-Node process must do it itself) --
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI or an already-exported shell */ }

// THE STORE IS POSTGRES NOW, and this checked for REDIS_URL -- which no longer
// exists anywhere, so the script refused to start at all. Same defect and same
// fix as backfill-engagements.mjs; it reads through the store abstraction and
// never named a backend otherwise, only this guard did.
//
// It matters beyond starting up: this script IS how a seeded section key added
// after a studio was created reaches that studio, now that listSections no
// longer reconciles on every read. A guard on a deleted variable made the
// documented repair unrunnable.
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — nothing to read from.");
  process.exit(1);
}

// Refuse the live namespace unless explicitly allowed. An empty prefix IS
// production (keys.ts), so touching it is the thing the guard is about.
const prefix = process.env.NOMPANY_KEY_PREFIX || "";
if (!prefix && !ALLOW_LIVE) {
  console.error(
    "Refusing to touch the LIVE key namespace without consent.\n" +
      "  • For a safe trial, run under a sandbox prefix: NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/plant-sections.mjs\n" +
      "  • To read/plant live on purpose, pass --allow-live (add --apply to actually write).",
  );
  process.exit(1);
}

// ---- the suites' loader, so `@/…` and TS strip work in plain Node ----------
const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { listStudios } = await import("@/modules/main/studios");
// `sectionsAsStored`, NOT `listSections`: the latter plants what a studio is
// short of, which would make this dry run write the rows it is reporting and
// then say nothing was written.
const { plantMissingSections, sectionsAsStored } = await import("@/platform/db/sections");
const { ALL_SECTION_KEYS } = await import("@/platform/db/keys");

// ---- run -------------------------------------------------------------------
const studios = STUDIO ? [{ id: STUDIO }] : await listStudios();
console.log(
  `${APPLY ? "PLANTING" : "DRY RUN"} over ${prefix ? `namespace "${prefix}"` : "the LIVE namespace"}` +
    `${STUDIO ? `, studio ${STUDIO}` : `, ${studios.length} studios`} …\n`,
);

const seeded = new Set(ALL_SECTION_KEYS);
let short = 0;
let planted = 0;

for (const s of studios) {
  const id = String(s.id || "");
  if (!id) continue;
  const before = await sectionsAsStored(id);
  const have = new Set(before.map((r) => r.key));
  const missing = [...seeded].filter((k) => !have.has(k));
  if (!missing.length) continue;

  short += 1;
  console.log(`  ${id}  missing ${missing.length}: ${missing.join(", ")}`);
  if (APPLY) {
    const after = await plantMissingSections(id);
    planted += after.length - before.length;
  }
}

console.log(
  `\nStudios short of sections : ${short}` +
    (APPLY ? `\nSections planted          : ${planted}` : "\n(dry run — nothing written; re-run with --apply to plant)"),
);
process.exit(0);
