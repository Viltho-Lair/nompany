// THE PROOF, READ-ONLY. Never an editArr, never an editJSON — this script
// cannot be the thing invariant 17 worries about, by construction: it calls
// nothing but listSections/readArr.
//
// Ten questions, each of which has a wrong answer that is silent:
//   1. a retired section key still sitting on a section row
//   2. a seeded key (ALL_SECTION_KEYS) missing from a studio — the plant
//      step skipped it or never ran
//   3. a section whose parent disagrees with SECTION_DEFS — renamed and
//      correctly granted, but nested under the wrong department in the
//      sidebar (restructure-sections.mjs's "sixth thing" — see its header)
//   4. a role that lost every grant (cleanPermissions dropped an unmapped
//      key, and default deny turned that into nobody-can-open-anything)
//   5. a role's scopes{} still keyed by a retired area — scopeFor falls back
//      to "own" silently; see resolve.ts's own comment on this exact bug
//   6. a collaborator's personal override still naming a retired key — the
//      same silent-narrowing failure as #5, one door over. resolve.ts
//      aliases this at read time TODAY (which is exactly why an unmigrated
//      override does not show up as a functional bug yet) — checked here
//      anyway because an export taken before this migration and reimported
//      after would put the studio right back where it started.
//   7. a stored notification href whose leading segment names a retired
//      section — clicking it renders a blank screen with no error
//   8. a record whose sectionId points at a section that does not hold its
//      collection any more — the collection move (or the plain rename that
//      substitutes for one) landed on the wrong side, or not at all
//   9. LEFTOVER ROWS the collection move's own two-write window can produce.
//      restructure-sections.mjs writes the destination first and empties the
//      source second — deliberately, so a crash between the two duplicates
//      rows rather than losing them. That tolerance is correct, but nothing
//      above actually reads the SOURCE side back: check #8 only walks
//      SECTION_COLLECTIONS[s.key], and the source section's post-rename key
//      (e.g. "field-service") does not list a moved collection (e.g.
//      "permits") any more — so a crash landing inside that window left
//      rows this script would otherwise call clean. This is the one failure
//      mode the design accepts; it must also be the one the proof can see.
//  10. two section rows in the same studio sharing one key — restructure-
//      sections.mjs's sectionIdForKey (and this script's own lookups) pick
//      whichever row comes first when that happens, silently. Unlikely (it
//      needs a retired key AND its target both present, or a custom section
//      colliding with a seeded one) but unguarded on both sides and cheap
//      to check.
//
// #3, #6, #9 and #10 are not on the brief's original list of four; #3 is the
// companion check for restructure-sections.mjs's re-parenting step, #6 is
// the companion check for its collaborator-overrides step, #9 is the
// companion check for its collection-move step's OWN documented risk
// window, and #10 guards an assumption sectionIdForKey makes silently. All
// four were added so a carrier (or an assumption) this migration writes or
// relies on always has a check that reads it back, rather than resting on
// trust.
//
//   node scripts/migrate/restructure-verify.mjs [--studio ID] [--allow-live]
//
// SAFETY — read-only regardless, but guarded the same way as
// restructure-sections.mjs for one reason: reading the LIVE studio registry
// by accident (wrong shell, no NOMPANY_KEY_PREFIX) is a mistake worth
// stopping on its own, even though nothing here can write.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });
}

const { listSections } = await import("@/platform/db/sections");
const { readArr } = await import("@/platform/db/store");
const { S, SEC, SECTION_DEFS, SECTION_COLLECTIONS, ALL_SECTION_KEYS } = await import("@/platform/db/keys");
const { SECTION_KEY_MAP, PERMISSION_KEY_MAP, COLLECTION_MOVES, mapSectionKey } = await import("@/platform/db/restructure");

const retiredSections = new Set(Object.keys(SECTION_KEY_MAP).filter((k) => SECTION_KEY_MAP[k] !== k));
const retiredAreas = new Set(Object.keys(PERMISSION_KEY_MAP).filter((k) => PERMISSION_KEY_MAP[k] !== k));

// True for a bare area key ("sales.tickets", the shape RoleSchema.scopes uses)
// OR a verb-suffixed permission ("sales.tickets.view") built from a retired
// one — the same split mapPermissionKey itself uses, so this checks exactly
// what that function would have rewritten.
function namesRetiredArea(key) {
  if (retiredAreas.has(key)) return true;
  const cut = key.lastIndexOf(".");
  return cut >= 0 && retiredAreas.has(key.slice(0, cut));
}

// The ROOT key a child key is declared under today, per SECTION_DEFS — the
// same lookup restructure-sections.mjs's re-parenting step uses, so "does the
// tree agree with the defs" is asked with the one function that also decides
// what the defs say, not a second copy of the same lookup.
function declaredParentKeyOf(childKey) {
  for (const def of SECTION_DEFS) {
    if ((def.children || []).some((c) => c.key === childKey)) return def.key;
  }
  return null;
}

/** Verify one studio. Returns a list of problem strings (empty = clean). */
export async function verifyStudio(studioId, label = studioId) {
  const problems = [];
  const sections = await listSections(studioId);
  const byId = new Map(sections.map((s) => [s.id, s]));

  // 1 + 2 — every row names a real, current key; every current key is present.
  for (const s of sections) {
    if (retiredSections.has(s.key)) problems.push(`RETIRED SECTION KEY ${label}/${s.key}`);
    if (!ALL_SECTION_KEYS.includes(s.key)) problems.push(`UNKNOWN SECTION KEY ${label}/${s.key}`);
  }
  for (const key of ALL_SECTION_KEYS) {
    if (!sections.some((s) => s.key === key)) problems.push(`MISSING SECTION ${label}/${key}`);
  }

  // 3 — every child sits under the parent SECTION_DEFS declares for it today.
  for (const s of sections) {
    const wantParentKey = declaredParentKeyOf(s.key);
    if (!wantParentKey) continue; // a root, or a studio-appended custom section
    const parent = s.parentId ? byId.get(s.parentId) : null;
    if (!parent || parent.key !== wantParentKey) {
      problems.push(`WRONG PARENT ${label}/${s.key}: under "${parent?.key ?? "(none)"}", expected "${wantParentKey}"`);
    }
  }

  // 4 + 5 — no role emptied by an unmapped grant; no scope key still retired.
  const roles = await readArr(S.roles(studioId));
  for (const r of roles) {
    if (!r.wildcard && (r.permissions || []).length === 0) {
      problems.push(`EMPTY ROLE ${label}/${r.name || r.id}`);
    }
    for (const p of r.permissions || []) {
      if (namesRetiredArea(p)) problems.push(`RETIRED PERMISSION ${label}/${r.name || r.id}: "${p}"`);
    }
    for (const k of Object.keys(r.scopes || {})) {
      if (namesRetiredArea(k)) problems.push(`RETIRED SCOPE KEY ${label}/${r.name || r.id}: "${k}"`);
    }
  }

  // 6 — no personal override still naming a retired key.
  const collaborators = await readArr(S.collaborators(studioId));
  for (const c of collaborators) {
    const ov = c.overrides || {};
    for (const p of [...(ov.allow || []), ...(ov.deny || [])]) {
      if (namesRetiredArea(p)) problems.push(`RETIRED OVERRIDE ${label}/${c.id || c.alias || "?"}: "${p}"`);
    }
  }

  // 7 — no stored notification href whose leading segment is retired.
  const notifications = await readArr(S.notifications(studioId));
  for (const n of notifications) {
    const href = String(n.href || "");
    if (!href || href.startsWith("/") || /^[a-z]+:\/\//i.test(href)) continue;
    const seg = href.split("/")[0];
    if (retiredSections.has(seg)) problems.push(`RETIRED NOTIFICATION HREF ${label}/${n.id}: "${href}"`);
  }

  // 8 — every record's sectionId agrees with the section that holds its collection.
  for (const s of sections) {
    for (const collection of SECTION_COLLECTIONS[s.key] || []) {
      const rows = await readArr(SEC.col(studioId, s.id, collection));
      for (const row of rows) {
        if (row.sectionId !== s.id) {
          problems.push(`ORPHAN ${label}/${s.key}/${collection}/${row.id}: sectionId=${row.sectionId}`);
        }
      }
    }
  }

  // 9 — LEFTOVER: for every COLLECTION_MOVES entry that names a real move
  // (mapped from/to actually differ), the SOURCE side must be empty. This is
  // the one place restructure-sections.mjs's destination-first, source-
  // second write order can leave a visible trace of a crash between the two
  // — check #8 above cannot see it, because the source section's CURRENT
  // key (e.g. "field-service") no longer lists the moved collection (e.g.
  // "permits") in SECTION_COLLECTIONS, so nothing else ever reads that key
  // back. A row found here is reported as its own failure class, not folded
  // into ORPHAN, because the fix is "re-run the migration" rather than
  // "something's sectionId is wrong" — the row's sectionId is still
  // perfectly correct for the OLD section it has not finished leaving.
  const byKey = new Map(sections.map((s) => [s.key, s]));
  for (const move of COLLECTION_MOVES) {
    const fromKey = mapSectionKey(move.from);
    const toKey = mapSectionKey(move.to);
    if (fromKey === toKey) continue; // no real move — the rename alone relocated this collection
    const fromSection = byKey.get(fromKey);
    if (!fromSection) continue; // this studio never had the source section
    const leftover = await readArr(SEC.col(studioId, fromSection.id, move.collection));
    if (leftover.length) {
      problems.push(
        `LEFTOVER ${label}/${move.collection}: ${leftover.length} row(s) still under "${fromKey}" ` +
          `(should have finished moving to "${toKey}") — re-run restructure-sections.mjs --apply`,
      );
    }
  }

  // 10 — no two section rows in the same studio share a key. Both
  // restructure-sections.mjs's sectionIdForKey and this script's own byKey
  // lookup above pick whichever row comes first when that happens, silently
  // — unlikely (it needs a retired key AND its already-migrated target both
  // present, or a studio-appended custom section colliding with a seeded
  // one) but unguarded on both sides and cheap to check here.
  const byKeyCount = new Map();
  for (const s of sections) byKeyCount.set(s.key, (byKeyCount.get(s.key) || 0) + 1);
  for (const [key, count] of byKeyCount) {
    if (count > 1) problems.push(`DUPLICATE SECTION KEY ${label}/${key}: ${count} rows share this key`);
  }

  return problems;
}

// ---- CLI ---------------------------------------------------------------
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listStudios } = await import("@/modules/main/studios");

  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(`--${name}`);
  const opt = (name, dflt) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
  };
  const STUDIO = opt("studio", "");
  const ALLOW_LIVE = flag("allow-live");

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

  const prefix = process.env.NOMPANY_KEY_PREFIX || "";
  if (!prefix && !ALLOW_LIVE) {
    console.error(
      "Refusing to read the LIVE key namespace without consent.\n" +
        "  • For a safe trial, run under a sandbox prefix: NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/restructure-verify.mjs\n" +
        "  • To read live on purpose, pass --allow-live (this script never writes either way).",
    );
    process.exit(1);
  }

  const studios = STUDIO ? [{ id: STUDIO }] : await listStudios();
  console.log(
    `VERIFYING (read-only) over ${prefix ? `namespace "${prefix}"` : "the LIVE namespace"}` +
      `${STUDIO ? `, studio ${STUDIO}` : `, ${studios.length} studio(s)`} …\n`,
  );

  let bad = 0;
  for (const s of studios) {
    const id = String(s.id || "");
    if (!id) continue;
    const problems = await verifyStudio(id, s.slug || id);
    for (const p of problems) { bad += 1; console.error(p); }
  }
  console.log(bad ? `\n${bad} problems` : "\nclean");
  process.exit(bad ? 1 : 0);
}
