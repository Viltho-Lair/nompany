// ONE-OFF ENGAGEMENT BACKFILL (CLI) — Phase 1a, spec §5.4.
//
// A studio's ticket→rfq/quotation/project chain (and the project's own
// children — invoices, expenses, material orders, deliveries, AWB shipments,
// tasks, overtimes, project sheets) already exists; this walks it and derives
// the engagement layer OVER it: ENG.root / ENG.members / rec-eng (see
// src/platform/db/keys.ts and src/platform/db/engagement.ts). It is modelled
// directly on scripts/migrate/plant-sections.mjs — same flag shape, same two
// locks — because that is the one migration in this repo that already writes
// against live Redis safely.
//
//   node scripts/migrate/backfill-engagements.mjs [--studio ID] [--apply] [--allow-live]
//
// SAFETY — the read is against the LIVE, SHARED Redis (CLAUDE.md: there is no
// dev database), and although this migration WRITES, it is additive-only:
//   • DRY-RUN BY DEFAULT. Without --apply it only READS the existing source
//     collections and clusters them in memory (buildEngagements) — nothing is
//     written. Run it first, read the plan.
//   • It refuses the live namespace unless you say so: run under
//     NOMPANY_KEY_PREFIX (a sandbox namespace) OR pass --allow-live.
//
// READ-LAYER DISCIPLINE (the hard gate for this whole phase): every source
// collection is read through the repository seam (repo(name).find), never
// written to, never patched — this file has no addRow/updateRow/deleteRow
// call anywhere in it. The ONLY writes are applyDescriptor's, which touch
// ENG.* / rec-eng keys exclusively (src/platform/db/engagement.ts). Re-running
// --apply on an already-backfilled studio changes nothing — applyDescriptor is
// a setJSON + idempotent zAdd, not an append — so this is safe to retry after
// a crash and does not need invariant #17's two-confirmation dance (no
// delete/flush/drop/overwrite of anything that already exists). Read the dry
// run before applying regardless.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// ---- module resolution ------------------------------------------------------
// Registered at import time — not inside the CLI-only block below — so
// `backfillStudio` can be imported on its own (the test suite does exactly
// that) without pulling in argv parsing, the .env read, or the live-namespace
// refusal. Same loader the integration suite and every other migration script
// in this folder use, so `@/…` resolves identically to how Next resolves it.
//
// SKIPPED WHEN ALREADY RUNNING UNDER tsx (its own loader resolves `@/` off
// tsconfig's `paths` and needs no help) — NOT an optimisation. `tests/loader.mjs`
// itself calls `register()` again from inside code tsx's loader thread is
// already evaluating, and that nested registration deadlocks the process
// (reproduced: `import()` of this very file hangs forever under
// `npx tsx …`, plain `node` is unaffected). tsx marks itself in
// `process.execArgv` via its own `--import …/tsx/dist/loader.mjs`, which is
// what this checks for.
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });
}

const { listStudios } = await import("@/modules/main/studios");
const { getSectionByKey } = await import("@/platform/db/sections");
const { repo } = await import("@/platform/db/repo");
const { SECTION_COLLECTIONS } = await import("@/platform/db/keys");
const { buildEngagements } = await import("@/platform/engagement/backfill");
const { applyDescriptor } = await import("@/platform/db/engagement");

// ---- the source collections this backfill clusters -------------------------
// The exact set buildEngagements() reads (src/platform/engagement/backfill.ts):
// the ticket/client/rfq/quotation/project chain, plus every child type a
// project can own. Listed once here rather than re-derived, because
// buildEngagements' own field names (c.salesTickets, c.rfqs, …) are the
// contract — this list has to match them, not the other way round.
const NEEDED_COLLECTIONS = [
  "salesTickets", "salesClients", "rfqs", "quotations", "projects",
  "invoices", "expenses", "materialOrders", "deliveries", "awbShipments",
  "tasks", "overtimes", "projectSheets",
];

// The section KEY a collection lives under, read OFF SECTION_COLLECTIONS
// (keys.ts) rather than hand-copied — so this can never name a section key
// SECTION_COLLECTIONS itself disagrees with.
function sectionKeyOf(collection) {
  for (const [key, cols] of Object.entries(SECTION_COLLECTIONS)) {
    if (cols.includes(collection)) return key;
  }
  return null;
}

// Read every source collection for one studio, READ-ONLY, through the
// repository seam (Gate B) — never a raw key, never a write. Two collections
// can share one section (finance-cash: invoices + expenses; inventory-sheets:
// materialOrders + projectSheets), so section lookups are cached per studio
// rather than repeated per collection — one hop per DISTINCT section key, not
// per collection name.
async function readStudioCollections(studioId) {
  const sectionByKey = new Map(); // section KEY -> Section | null
  const out = {};
  for (const name of NEEDED_COLLECTIONS) {
    const key = sectionKeyOf(name);
    if (!key) { out[name] = []; continue; }
    if (!sectionByKey.has(key)) sectionByKey.set(key, await getSectionByKey(studioId, key));
    const section = sectionByKey.get(key);
    // A studio with no such section yet (predates it, or it was never
    // reached) simply has nothing to read here — same answer every other
    // reader in the product gives, not an error.
    out[name] = section ? await repo(name).find({ studioId, sectionId: section.id }) : [];
  }
  return out;
}

/**
 * Read one studio's existing chains, cluster them into engagement
 * descriptors (buildEngagements, pure), and — when `apply` — persist the
 * layer via applyDescriptor. READ-ONLY over every existing collection;
 * writes ONLY ENG.* / rec-eng keys, never an existing record. Idempotent:
 * calling this twice with apply:true on the same studio leaves the layer
 * exactly as the first call did (applyDescriptor re-derives, never appends).
 *
 * @returns counts for the CLI/test to report — `records` is every singleton
 *   slot filled plus every member id across every descriptor, i.e. how many
 *   existing rows the layer now points at (a record can count twice if it
 *   fills both a singleton slot and its own member set, e.g. the "approved"
 *   quotation, which is intentional: it says how many POINTERS were written,
 *   not how many distinct rows exist).
 */
export async function backfillStudio(studioId, { apply = false } = {}) {
  const collections = await readStudioCollections(studioId);
  const descriptors = buildEngagements(collections);

  if (apply) {
    for (const d of descriptors) await applyDescriptor(studioId, d);
  }

  const records = descriptors.reduce((n, d) => {
    const singles = Object.values(d.singletons).filter(Boolean).length;
    const members = Object.values(d.members).reduce((m, ids) => m + ids.length, 0);
    return n + singles + members;
  }, 0);

  return {
    engagements: descriptors.length,
    records,
    sample: descriptors.slice(0, 3).map((d) => ({ engId: d.engId, ref: d.ref })),
  };
}

// ---- CLI ---------------------------------------------------------------
// Guarded so importing this module (as the test suite does, for
// `backfillStudio`) never runs the driver below — only `node
// scripts/migrate/backfill-engagements.mjs` does.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
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

  if (!process.env.REDIS_URL) {
    console.error("REDIS_URL is not set — nothing to read from.");
    process.exit(1);
  }

  // Refuse the live namespace unless explicitly allowed. An empty prefix IS
  // production (keys.ts), so touching it is the thing the guard is about.
  const prefix = process.env.NOMPANY_KEY_PREFIX || "";
  if (!prefix && !ALLOW_LIVE) {
    console.error(
      "Refusing to touch the LIVE key namespace without consent.\n" +
        "  • For a safe trial, run under a sandbox prefix: NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/backfill-engagements.mjs\n" +
        "  • To read/backfill live on purpose, pass --allow-live (add --apply to actually write).",
    );
    process.exit(1);
  }

  const studios = STUDIO ? [{ id: STUDIO }] : await listStudios();
  console.log(
    `${APPLY ? "APPLYING" : "DRY RUN"} over ${prefix ? `namespace "${prefix}"` : "the LIVE namespace"}` +
      `${STUDIO ? `, studio ${STUDIO}` : `, ${studios.length} studios`} …\n`,
  );

  let totalEng = 0;
  let totalRec = 0;
  for (const s of studios) {
    const id = String(s.id || "");
    if (!id) continue;
    const { engagements, records, sample } = await backfillStudio(id, { apply: APPLY });
    if (!engagements) continue;
    totalEng += engagements;
    totalRec += records;
    const refs = sample.map((d) => d.ref || d.engId).join(", ");
    console.log(`  ${id}  ${engagements} engagement(s), ${records} record(s)${refs ? ` — e.g. ${refs}` : ""}`);
  }

  console.log(
    `\nEngagements ${APPLY ? "written" : "found"} : ${totalEng}` +
      `\nRecords     ${APPLY ? "attached" : "would attach"} : ${totalRec}` +
      (APPLY ? "" : "\n(dry run — nothing written; re-run with --apply to persist)"),
  );
  process.exit(0);
}
