// THE RESTRUCTURE, APPLIED — the twelve-to-fifteen-section data migration
// (Task 7 of the P0 restructure).
//
// FIVE STORED CARRIERS name a section key or a permission-area key. The
// brief that shipped with this task named two; the other three were found by
// reading the code, not assumed from the brief:
//   1. a section row's `key`                    (SECTION_KEY_MAP)
//   2. role.permissions[]                        (PERMISSION_KEY_MAP)
//   3. role.scopes{}'s KEYS — RoleSchema.scopes is keyed by AREA, not by
//      permission (scopeFor reads r.scopes?.[areaKey]); unmapped, a scope
//      granted "all" silently narrows to "own" after the rename, with
//      nothing failing loudly enough to notice.
//   4. collaborator.overrides.{allow,deny}[] — the personal diff layered on
//      top of a role. resolve.ts already aliases these at read time, so
//      leaving them unmigrated breaks nothing TODAY, but an export taken
//      before this migration and reimported after is the same bug arriving
//      later.
//   5. a stored notification's `href` LEADING SEGMENT, built from a section
//      key (platform/notify/notifications.ts:108). Task 5 swept the
//      producers, so new notices are correct; every notice already stored
//      still points at a retired key, and clicking one renders a blank
//      screen with no error (page.js matches segments[0] against the
//      tenant's own section list and finds nothing there).
//
// A SIXTH THING, not named by the brief and not one of the five carriers
// above, but the same class of bug: five children's `parentId`. Renaming a
// child's `key` does not move it in the sidebar tree — StudioFrame.js groups
// the nav purely by `parentId` — and five children have a NEW LOGICAL PARENT
// under the fifteen-section blueprint, not just a new key:
//   technical-quotations -> crm-sales-quotations      (parent: crm-sales)
//   quality-documents    -> engineering-docs-register (parent: engineering-docs)
//   operations-planner   -> projects-planner          (parent: projects)
//   inventory-vendors    -> procurement-suppliers     (parent: procurement, NEW)
//   inventory-awb        -> logistics-shipments       (parent: logistics, NEW)
// Left alone, "Suppliers" and "Shipments" would keep rendering nested under
// Inventory, and "Quotations", "Document register" and "Planner" would keep
// rendering under Engineering & Documents / Quality & HSE / Field Operations
// — every one of them correctly NAMED and correctly GRANTED, but nested
// under the wrong department. This is computed generically from SECTION_DEFS
// (which child key lives under which parent key today), never a hardcoded
// pair, so it self-heals if SECTION_DEFS' tree ever changes shape again.
//
// IDEMPOTENT BY CONSTRUCTION — every map in restructure.ts is total (a target
// maps to itself; see selfMap there) — so a half-finished run is finished by
// re-running it, and a finished run touches nothing on a second pass.
//
// NOTHING HERE DELETES. No section row is removed and no record is dropped:
// invariant 17 governs this file, and the honest way to obey it is to have
// NO delete path at all, rather than a guarded one. The only editArr calls
// that empty an array are the SOURCE side of a collection move (step 6), and
// only after the destination write has already landed — a crash between the
// two duplicates rows rather than losing them, and a re-run reconciles by
// de-duping on id.
//
// ORDER IS THE SAFETY PROPERTY:
//   1. rename every section row's key
//   2. plant the sections with no predecessor (needed before step 3, which
//      re-parents INTO some of them, and before step 6, which moves records
//      INTO them)
//   3. re-parent the five children above, now that every target parent exists
//   4. rewrite every role's permissions[] and scopes{} keys
//   5. rewrite collaborator overrides and stored notification hrefs
//   6. reassign sectionId on the collections that changed owner
// Steps 4-5 land before step 6 moves anything, matching the brief: the alias
// in resolve.ts is what keeps people logged in while a role is still
// unmigrated, and that alias must stay correct right up until this script
// has actually rewritten every role.
//
//   node scripts/migrate/restructure-sections.mjs [--studio ID] [--apply] [--allow-live]
//
// SAFETY — modelled on scripts/migrate/backfill-engagements.mjs (the most
// recent migration in this folder, itself modelled on plant-sections.mjs):
//   • DRY-RUN BY DEFAULT. Without --apply this only READS and reports what it
//     would do, per studio, with a row count per collection move — nothing is
//     written. Read the plan before applying anything.
//   • It refuses the live namespace unless you say so: run under
//     NOMPANY_KEY_PREFIX (a sandbox namespace) OR pass --allow-live.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// ---- module resolution ------------------------------------------------------
// Registered at import time, not inside the CLI-only block below, so
// `migrateStudio` can be imported on its own (a test harness does exactly
// that) without pulling in argv parsing or the live-namespace refusal.
//
// SKIPPED UNDER TSX — see backfill-engagements.mjs's comment on this exact
// line for the reproduced deadlock: tsx's own loader thread is still
// evaluating when register() would try to add a second hook on top of it.
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });
}

const { listSections, plantMissingSections } = await import("@/platform/db/sections");
const { editArr, readArr } = await import("@/platform/db/store");
const { S, SEC, SECTION_DEFS, ALL_SECTION_KEYS } = await import("@/platform/db/keys");
const {
  COLLECTION_MOVES, mapSectionKey, mapPermissionKey,
} = await import("@/platform/db/restructure");

// ---- the sixth thing: re-parenting, derived from SECTION_DEFS, not hardcoded --
// Which ROOT key a given (already-mapped) child key lives under today, per
// SECTION_DEFS. Returns null for a root itself, or for a studio-appended
// custom section SECTION_DEFS never named — neither of those is ever
// re-parented.
function declaredParentKeyOf(childKey) {
  for (const def of SECTION_DEFS) {
    if ((def.children || []).some((c) => c.key === childKey)) return def.key;
  }
  return null;
}

// One pass over a section list, working out which rows need their parentId
// moved to match SECTION_DEFS' current tree. `keyOf(row)` lets the caller
// choose whether to read a row's key as-stored (apply mode, already renamed
// by the time this runs) or projected forward (dry-run preview, where
// nothing has been renamed yet) — same row list, same logic, either way.
function computeReparents(sections, keyOf) {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const out = [];
  for (const s of sections) {
    if (!s.parentId) continue; // roots never re-parent
    const childKey = keyOf(s);
    const wantParentKey = declaredParentKeyOf(childKey);
    if (!wantParentKey) continue;
    const curParent = byId.get(s.parentId);
    const curParentKey = curParent ? keyOf(curParent) : null;
    if (curParentKey !== wantParentKey) out.push({ row: s, childKey, from: curParentKey, to: wantParentKey });
  }
  return out;
}

// ---- the four (really six) things, per studio ------------------------------
/**
 * Migrate one studio. Read-only when `apply` is false — every count below is
 * still computed so the dry run can report exactly what it would do.
 *
 * @returns counts for the CLI (and a test harness) to report, plus `moves`
 *   (one entry per COLLECTION_MOVES row that actually has rows to move) and
 *   `reparents` (one entry per section whose parent SECTION_DEFS disagrees
 *   with today).
 */
export async function migrateStudio(studioId, { apply = false } = {}) {
  const counts = {
    sectionsRenamed: 0, sectionsPlanted: 0, sectionsReparented: 0,
    rolesRewritten: 0, collaboratorsRewritten: 0, notificationsRewritten: 0,
    rowsMoved: 0, moves: [], reparents: [],
  };

  // ---- 1. RENAME. One field on the section row. Records point at
  // sectionId, an id minted once at creation, never at the key — so not a
  // single record is touched by this step. ----------------------------------
  const beforeSections = await readArr(S.sections(studioId));
  counts.sectionsRenamed = beforeSections.filter((s) => mapSectionKey(s.key) !== s.key).length;
  if (apply && counts.sectionsRenamed) {
    await editArr(S.sections(studioId), (rows) => ({
      next: rows.map((s) => ({ ...s, key: mapSectionKey(s.key) })),
    }));
  }

  // ---- 2. PLANT. The sections with no predecessor. plantMissingSections is
  // already idempotent and forward-only, and RE-DERIVES sortOrder from
  // SECTION_DEFS on every write that plants anything — see its own comment
  // in platform/db/sections.ts — which is what puts a newly-planted root
  // where it belongs in the nav rather than at the end, and re-sorts every
  // OTHER row (renamed or not) to match, not only the ones it just added. --
  if (apply) {
    const before = beforeSections.length;
    const after = await plantMissingSections(studioId);
    counts.sectionsPlanted = after.length - before;
  } else {
    // Dry-run has not renamed anything, so project every existing row's key
    // forward to see which of ALL_SECTION_KEYS a real run would still find
    // missing — the same set plantMissingSections would plant.
    const haveMapped = new Set(beforeSections.map((s) => mapSectionKey(s.key)));
    counts.sectionsPlanted = ALL_SECTION_KEYS.filter((k) => !haveMapped.has(k)).length;
  }

  // ---- 3. RE-PARENT. Only reachable now that step 2 has planted any brand
  // new parent (procurement, logistics) a re-parented child needs to point
  // at. In apply mode this reads the section list FRESH inside the editArr
  // callback (never the `beforeSections` closed over above), because the
  // compare-and-set must decide against the row as it actually stands. -----
  if (apply) {
    // The counts this step reports come back through editArr's OWN `result`
    // channel rather than as a side effect written from inside `fn` — `fn`
    // can run more than once under contention (store.ts's own rule), and a
    // side effect assigned from inside it would just be reassigned
    // identically on every retry here, but routing it through `result`
    // keeps this step honest about that rule rather than relying on the
    // reassignment happening to be harmless.
    const applied = await editArr(S.sections(studioId), (rows) => {
      const keyOf = (row) => row.key; // already renamed+planted by this point
      const reparents = computeReparents(rows, keyOf);
      const idByKey = new Map(rows.filter((r) => !r.parentId).map((r) => [r.key, r.id]));
      const applicable = reparents.filter((r) => idByKey.has(r.to));
      if (!applicable.length) return { result: [] };
      const moving = new Map(applicable.map((r) => [r.row.id, idByKey.get(r.to)]));
      const next = rows.map((s) => (moving.has(s.id) ? { ...s, parentId: moving.get(s.id) } : s));
      return { next, result: applicable.map((r) => ({ key: r.childKey, from: r.from, to: r.to })) };
    });
    counts.sectionsReparented = applied.length;
    counts.reparents = applied;
  } else {
    // Preview only: project every row's key forward, since nothing has
    // actually been renamed or planted yet.
    const reparents = computeReparents(beforeSections, (row) => mapSectionKey(row.key));
    counts.sectionsReparented = reparents.length;
    counts.reparents = reparents.map((r) => ({ key: r.childKey, from: r.from, to: r.to }));
  }

  // The section list this studio will actually hold once steps 1-3 have run
  // (or, in dry-run, the list as it stands today — used only to resolve a
  // COLLECTION_MOVES source id below, which already exists either way).
  const sections = apply ? await listSections(studioId) : beforeSections;
  const sectionIdForKey = (wantKey) =>
    sections.find((s) => (apply ? s.key : mapSectionKey(s.key)) === wantKey)?.id || null;

  // ---- 4. ROLES. The dangerous one, and the reason resolve.ts aliases
  // first: a role stores literal permission strings and RoleSchema.scopes is
  // keyed by area (not permission) — leaving either unmapped empties a
  // role's real grants under default deny, or silently narrows every scoped
  // grant to "own". ----------------------------------------------------------
  const beforeRoles = await readArr(S.roles(studioId));
  const roleNeedsRewrite = (r) =>
    (r.permissions || []).some((p) => mapPermissionKey(p) !== p) ||
    Object.keys(r.scopes || {}).some((k) => mapPermissionKey(k) !== k);
  counts.rolesRewritten = beforeRoles.filter(roleNeedsRewrite).length;
  if (apply && counts.rolesRewritten) {
    await editArr(S.roles(studioId), (rows) => ({
      next: rows.map((r) => (!roleNeedsRewrite(r) ? r : {
        ...r,
        permissions: (r.permissions || []).map(mapPermissionKey),
        scopes: Object.fromEntries(Object.entries(r.scopes || {}).map(([k, v]) => [mapPermissionKey(k), v])),
      })),
    }));
  }

  // ---- 5a. COLLABORATORS. The personal diff on top of a role — same
  // stored-string problem as role.permissions, on a different row. --------
  const beforeCollabs = await readArr(S.collaborators(studioId));
  const collabNeedsRewrite = (c) => {
    const ov = c.overrides || {};
    return (ov.allow || []).some((p) => mapPermissionKey(p) !== p) ||
      (ov.deny || []).some((p) => mapPermissionKey(p) !== p);
  };
  counts.collaboratorsRewritten = beforeCollabs.filter(collabNeedsRewrite).length;
  if (apply && counts.collaboratorsRewritten) {
    await editArr(S.collaborators(studioId), (rows) => ({
      next: rows.map((c) => (!c.overrides || !collabNeedsRewrite(c) ? c : {
        ...c,
        overrides: {
          ...c.overrides,
          allow: (c.overrides.allow || []).map(mapPermissionKey),
          deny: (c.overrides.deny || []).map(mapPermissionKey),
        },
      })),
    }));
  }

  // ---- 5b. NOTIFICATIONS. Stored `href`s are studio-relative
  // ("people", "crm-sales-tickets/tkt_1") — only the LEADING segment ever
  // names a section, so only it is ever mapped. A leading "/" or an absolute
  // URL is never a section reference (super notifications live in a
  // different registry entirely) and is left alone. --------------------------
  const leadingSegment = (href) => {
    const s = String(href || "");
    if (!s || s.startsWith("/") || /^[a-z]+:\/\//i.test(s)) return null;
    return s.split("/")[0];
  };
  const beforeNotices = await readArr(S.notifications(studioId));
  const noticeNeedsRewrite = (n) => {
    const seg = leadingSegment(n.href);
    return Boolean(seg) && mapSectionKey(seg) !== seg;
  };
  counts.notificationsRewritten = beforeNotices.filter(noticeNeedsRewrite).length;
  if (apply && counts.notificationsRewritten) {
    await editArr(S.notifications(studioId), (rows) => ({
      next: rows.map((n) => {
        const seg = leadingSegment(n.href);
        if (!seg) return n;
        const mapped = mapSectionKey(seg);
        if (mapped === seg) return n;
        const parts = String(n.href).split("/");
        parts[0] = mapped;
        return { ...n, href: parts.join("/") };
      }),
    }));
  }

  // ---- 6. MOVE. The only step that rewrites RECORDS: sectionId on each row
  // of a collection whose owning section actually changed. Most of
  // COLLECTION_MOVES' 11 entries turn out to be no-ops here once mapped —
  // e.g. technical-quotations and crm-sales-quotations are the SAME section
  // row (a plain rename, step 1 already handled it) — which is exactly why
  // this compares the MAPPED keys and skips when they agree, rather than
  // trusting the table's `from`/`to` spelling at face value. ----------------
  for (const move of COLLECTION_MOVES) {
    const fromKey = mapSectionKey(move.from);
    const toKey = mapSectionKey(move.to);
    if (fromKey === toKey) continue; // the rename already relocated this collection
    const fromId = sectionIdForKey(fromKey);
    if (!fromId) continue; // this studio never had the source section (e.g. appended custom set)
    const rows = await readArr(SEC.col(studioId, fromId, move.collection));
    if (!rows.length) continue;
    counts.rowsMoved += rows.length;
    const entry = { collection: move.collection, from: move.from, to: move.to, count: rows.length };
    counts.moves.push(entry);
    if (!apply) continue;
    const toId = sectionIdForKey(toKey);
    if (!toId) { entry.error = `destination section "${toKey}" not found — plant step may have failed`; continue; }
    // DESTINATION FIRST, SOURCE EMPTIED SECOND. A crash between the two
    // duplicates rows rather than losing them; the id de-dupe below is what
    // makes a re-run after that crash reconcile instead of duplicating.
    await editArr(SEC.col(studioId, toId, move.collection), (cur) => {
      const held = new Set(cur.map((r) => r.id));
      const incoming = rows.filter((r) => !held.has(r.id)).map((r) => ({ ...r, sectionId: toId }));
      return { next: [...incoming, ...cur] };
    });
    await editArr(SEC.col(studioId, fromId, move.collection), () => ({ next: [] }));
  }

  return counts;
}

// ---- CLI ---------------------------------------------------------------
// Guarded so importing this module (as a test harness does, for
// `migrateStudio`) never runs the driver below — only
// `node scripts/migrate/restructure-sections.mjs` does.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listStudios } = await import("@/modules/main/studios");

  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(`--${name}`);
  const opt = (name, dflt) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
  };
  const STUDIO = opt("studio", "");
  const APPLY = flag("apply");
  const ALLOW_LIVE = flag("allow-live");

  // .env.local load — Next loads it automatically; this plain-Node process
  // must do it itself.
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* CI or an already-exported shell */ }

  // THE STORE IS POSTGRES NOW — see backfill-engagements.mjs for the same fix.
  // This reads and writes through @/platform/db/store and imports no client of
  // its own, so the deleted REDIS_URL was the only thing naming a backend, and
  // guarding on it made the script unrunnable rather than safe.
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
        "  • For a safe trial, run under a sandbox prefix: NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/restructure-sections.mjs\n" +
        "  • To read/migrate live on purpose, pass --allow-live (add --apply to actually write).",
    );
    process.exit(1);
  }

  const studios = STUDIO ? [{ id: STUDIO }] : await listStudios();
  console.log(
    `${APPLY ? "APPLYING" : "DRY RUN"} over ${prefix ? `namespace "${prefix}"` : "the LIVE namespace"}` +
      `${STUDIO ? `, studio ${STUDIO}` : `, ${studios.length} studio(s)`} …\n`,
  );

  const totals = {
    sectionsRenamed: 0, sectionsPlanted: 0, sectionsReparented: 0,
    rolesRewritten: 0, collaboratorsRewritten: 0, notificationsRewritten: 0, rowsMoved: 0,
  };
  let studiosTouched = 0;

  for (const s of studios) {
    const id = String(s.id || "");
    if (!id) continue;
    const c = await migrateStudio(id, { apply: APPLY });
    const touched = c.sectionsRenamed || c.sectionsPlanted || c.sectionsReparented ||
      c.rolesRewritten || c.collaboratorsRewritten || c.notificationsRewritten || c.rowsMoved;
    if (!touched) continue;

    studiosTouched += 1;
    console.log(`  studio ${s.slug || id}`);
    if (c.sectionsRenamed) console.log(`    sections renamed        : ${c.sectionsRenamed}`);
    if (c.sectionsPlanted) console.log(`    sections planted        : ${c.sectionsPlanted}`);
    if (c.sectionsReparented) {
      console.log(`    sections re-parented    : ${c.sectionsReparented}`);
      for (const r of c.reparents) console.log(`      ${r.key}: ${r.from ?? "(none)"} -> ${r.to}`);
    }
    if (c.rolesRewritten) console.log(`    roles rewritten         : ${c.rolesRewritten}`);
    if (c.collaboratorsRewritten) console.log(`    collaborators rewritten : ${c.collaboratorsRewritten}`);
    if (c.notificationsRewritten) console.log(`    notifications rewritten : ${c.notificationsRewritten}`);
    for (const m of c.moves) {
      console.log(`    ${m.collection}: ${m.count} row(s) ${m.from} -> ${m.to}${m.error ? `  ! ${m.error}` : ""}`);
    }

    for (const k of Object.keys(totals)) totals[k] += c[k] || 0;
  }

  console.log(`\nStudios touched            : ${studiosTouched} / ${studios.length}`);
  console.log(`Sections renamed            : ${totals.sectionsRenamed}`);
  console.log(`Sections planted            : ${totals.sectionsPlanted}`);
  console.log(`Sections re-parented        : ${totals.sectionsReparented}`);
  console.log(`Roles rewritten             : ${totals.rolesRewritten}`);
  console.log(`Collaborators rewritten     : ${totals.collaboratorsRewritten}`);
  console.log(`Notifications rewritten     : ${totals.notificationsRewritten}`);
  console.log(`Collection rows moved       : ${totals.rowsMoved}`);
  console.log(APPLY ? "\napplied" : "\ndry run complete — re-run with --apply");
  process.exit(0);
}
