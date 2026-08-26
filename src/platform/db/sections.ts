// SECTION repository + operational-data accessors.
//
// Sections are per-studio rows (seeded from the fixed list at studio creation,
// appendable later — every create mints a fresh SectionID). Per the approved
// plan, SECTIONS OWN THEIR DATA: each operational collection lives under
// s:<StudioID>:sec:<SectionID>:c:<name>, every row carries
// { studioId, sectionId }, and deleting a section deletes its records
// (cascade.js → cascadeDeleteSection).
//
// Sections do NOT carry access of their own. Who may open one is answered from
// the permission catalogue in platform/access/resolve.ts, via the roles on somebody's
// collaborator row — see the note where the grant helpers used to be.

import { S, SEC, ID, SECTION_COLLECTIONS, SECTION_DEFS, ALL_SECTION_KEYS } from "./keys";
import { readArr, editArr } from "./store";
import { emit, TYPE } from "@/platform/realtime/events";
import { bumpMainAgg } from "./mainAgg";
import type { Row } from "./store";

// ---- what a section is -----------------------------------------------------
// A SECTION IS A CONTAINER THAT OWNS COLLECTIONS, and every field here exists
// because something reads it: `key` is what the permission catalogue maps to an
// area, `parentId` is the one level of nesting the nav allows, `sortOrder` is
// the running order the plant step re-derives, and `settings` is the section's
// own configuration blob, whose shape is the section's business rather than
// this module's.
export type Section = {
  id: string;
  studioId: string;
  key: string;
  name: string;
  parentId: string | null;
  enabled: boolean;
  sortOrder: number;
  settings: Record<string, unknown>;
  createdAt: string;
};

// ---- section rows ----------------------------------------------------------
export async function listSections(studioId: string): Promise<Section[]> {
  // A PLAIN READ NOW — reconciliation moved OFF the read path (R2).
  //
  // This used to call plantMissingSections on every request, at "the ONE funnel
  // every reader passes through", so a section added to SECTION_DEFS would reach
  // studios created before it. That put a reconciliation pass on every module
  // load for a list that changes approximately never. A studio is instead seeded
  // COMPLETE at creation (createStudio writes the full SECTION_DEFS), and a
  // section added to the defs later reaches existing studios through the one-off
  // idempotent backfill (scripts/migrate/plant-sections.mjs → plantMissingSections),
  // run once when the defs change — not re-derived on every read.
  const rows = await readArr<Section>(S.sections(studioId));
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

// SEEDED SECTIONS A STUDIO DOES NOT HAVE YET — the one-off backfill (R2), no
// longer the read path. Exported for scripts/migrate/plant-sections.mjs, which
// walks every studio and calls this once after SECTION_DEFS gains a key. It reads
// its own rows so a caller needs only the studio id.
//
// The seeded list is the whole truth about which sections a studio has: nothing
// appends one (appendSection has no caller) and nothing deletes one (no route
// reaches cascadeDeleteSection). So a seeded key missing from a studio can only
// mean the studio was created before that key existed — never that somebody
// removed it — and planting it is restoring the studio to the list it is
// supposed to have.
//
// IF SECTION DELETION EVER SHIPS, that inference stops holding and this needs a
// record of which keys have ever been planted, or it will resurrect the section
// somebody just deleted. It is the only thing this function assumes.
//
// IDEMPOTENT AND FORWARD-ONLY: it writes nothing when the studio already holds
// every seeded key (the common case), and only PLANTS missing rows and re-derives
// their running order otherwise — inside editArr, so two runs arriving together
// cannot plant twice. Safe to re-run; it never deletes.
export async function plantMissingSections(studioId: string): Promise<Section[]> {
  const rows = await readArr<Section>(S.sections(studioId));
  const have = new Set(rows.map((s) => s.key));
  if (ALL_SECTION_KEYS.every((k) => have.has(k))) return rows;

  return editArr<Section, Section[]>(S.sections(studioId), (current) => {
    const held = new Set(current.map((s) => s.key));
    const missing = SECTION_DEFS.filter(
      (d) => !held.has(d.key) || (d.children || []).some((c) => !held.has(c.key)),
    );
    if (!missing.length) return { result: current };

    const now = new Date().toISOString();
    const next = [...current];
    for (const def of missing) {
      let parent = next.find((s) => s.key === def.key);
      if (!parent) {
        parent = {
          id: ID.section(), studioId, key: def.key, name: def.name, parentId: null,
          enabled: true, sortOrder: next.length, settings: {}, createdAt: now,
        };
        next.push(parent);
      }
      for (const child of def.children || []) {
        if (next.some((s) => s.key === child.key)) continue;
        next.push({
          id: ID.subsection(), studioId, key: child.key, name: child.name, parentId: parent.id,
          enabled: true, sortOrder: next.length, settings: {}, createdAt: now,
        });
      }
    }

    // Re-derive the running order from SECTION_DEFS so a section planted late
    // sits where it belongs in the nav rather than after everything else. Rows
    // the defs do not name keep their order, at the end.
    const rank = new Map<string, number>();
    ALL_SECTION_KEYS.forEach((k, i) => rank.set(k, i));
    const ordered = [...next].sort((a, b) => {
      const ra = rank.get(a.key) ?? ALL_SECTION_KEYS.length + (a.sortOrder ?? 0);
      const rb = rank.get(b.key) ?? ALL_SECTION_KEYS.length + (b.sortOrder ?? 0);
      return ra - rb;
    });
    const renumbered = ordered.map((s, i) => ({ ...s, sortOrder: i }));
    // Handed back as the result too, so the caller reads what was just written
    // rather than spending a second round-trip asking for it.
    return { next: renumbered, result: renumbered };
  });
}
export async function getSection(studioId: string, sectionId: string): Promise<Section | null> {
  const rows = await readArr<Section>(S.sections(studioId));
  return rows.find((s) => s.id === sectionId) || null;
}
export async function getSectionByKey(studioId: string, key: string): Promise<Section | null> {
  const rows = await readArr<Section>(S.sections(studioId));
  return rows.find((s) => s.key === key) || null;
}

// Append a new section — UNIQUE(StudioID, key); always a fresh SectionID. The
// uniqueness check runs inside the atomic write, and sortOrder is derived from
// the list as it actually stands, so two appends cannot collide on either.
export async function appendSection(
  studioId: string,
  { key, name, parentId = null }: { key?: string; name?: string; parentId?: string | null },
): Promise<{ error: string } | { section: Section }> {
  const cleanKey = String(key || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  if (!cleanKey || !cleanName) return { error: "missing" };
  return editArr<Section, { error: string } | { section: Section }>(S.sections(studioId), (rows) => {
    if (rows.some((s) => s.key === cleanKey)) return { result: { error: "exists" } };
    if (parentId) {
      const parent = rows.find((s) => s.id === parentId);
      // The tree is one level deep: a sub-section cannot own sub-sections.
      if (!parent) return { result: { error: "parent" } };
      if (parent.parentId) return { result: { error: "nested" } };
    }
    const section: Section = {
      id: parentId ? ID.subsection() : ID.section(),
      studioId, key: cleanKey, name: cleanName, parentId: parentId || null,
      enabled: true, sortOrder: rows.length, settings: {}, createdAt: new Date().toISOString(),
    };
    return { next: [...rows, section], result: { section } };
  });
}

// id / studioId / key / parentId are immutable — name, enabled, sortOrder and
// settings patch. parentId is fixed because re-parenting would move a row out
// from under the cascade that owns its data.
export async function updateSection(
  studioId: string,
  sectionId: string,
  patch: Partial<Section> | null | undefined,
): Promise<Section | null> {
  return editArr<Section, Section | null>(S.sections(studioId), (rows) => {
    let updated: Section | null = null;
    const next = rows.map((s) => {
      if (s.id !== sectionId) return s;
      // The four destructured out are the immutable ones; naming them is how
      // they are excluded, which is why none is read.
      const { id: _id, studioId: _sid, key: _key, parentId: _parentId, ...safe } = patch || {};
      updated = { ...s, ...safe, id: s.id, studioId: s.studioId, key: s.key, parentId: s.parentId ?? null };
      return updated;
    });
    return updated ? { next, result: updated } : { result: null };
  });
}

// The collection names a section key is allowed to hold (from the fixed map);
// appended custom sections start with no predefined collections.
export function collectionsForKey(sectionKey: string): string[] {
  // SECTION_COLLECTIONS is a literal map, so its keys are a union and a plain
  // `string` cannot index it. The lookup is by design open-ended — a section key
  // the map does not name has no predefined collections, which is what an
  // appended custom section is — so the index signature is widened here rather
  // than the map being loosened for everybody.
  return (SECTION_COLLECTIONS as Record<string, string[]>)[sectionKey] || [];
}

// ---- operational rows (each carries studioId + sectionId) ------------------
// Reading is free-form; WRITING is only ever addRow/updateRow/deleteRow. There
// is deliberately no writeCol(): a blind whole-collection write is exactly the
// lost update those three exist to prevent, so the door is not left open.
export async function readCol<T extends Row = Row>(
  studioId: string, sectionId: string, name: string,
): Promise<T[]> {
  return readArr<T>(SEC.col(studioId, sectionId, name));
}
// The three mutators each apply their change to the collection AS IT ACTUALLY
// STANDS at the instant of the write, not to a copy read moments earlier. Two
// people ticking different checklist items on the same board both land.
export async function addRow<T extends Row = Row>(
  studioId: string, sectionId: string, name: string, item: Row,
): Promise<T> {
  const row = await editArr<T, T>(SEC.col(studioId, sectionId, name), (rows) => {
    // `id` STAYS FIRST, before the spread. It reads like a formality and is not:
    // JSON.stringify emits keys in insertion order, the golden responses pin
    // that order, and moving this line below `...item` failed 34 of them. The
    // cast is because `item.id` is `unknown` off a Row — every caller passes a
    // string or nothing, and ID.row supplies one when they pass nothing.
    const created = { id: (item.id as string) || ID.row(name), ...item, studioId, sectionId } as unknown as T;
    return { next: [created, ...rows], result: created };
  });
  await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name, rowId: row.id as string });
  void bumpMainAgg(studioId, sectionId, name); // best-effort rollup, never awaited (§3)
  return row;
}

// `patch` may be a function of the current row, which is how a caller expresses
// "flip this field" rather than "set it to what I last saw". On a contended
// write the function is re-applied to the row as it now is — so the flip stays
// a flip instead of silently reverting someone else's change.
export async function updateRow<T extends Row = Row>(
  studioId: string, sectionId: string, name: string, rowId: string,
  patch: Row | ((row: T) => Row),
): Promise<T | null> {
  const updated = await editArr<T, T | null>(SEC.col(studioId, sectionId, name), (rows) => {
    let hit: T | null = null;
    const next = rows.map((r) => {
      if (r.id !== rowId) return r;
      const changes = typeof patch === "function" ? patch(r) : patch;
      hit = { ...r, ...changes, id: r.id, studioId: r.studioId, sectionId: r.sectionId } as unknown as T;
      return hit;
    });
    return hit ? { next, result: hit } : { result: null };
  });
  // Only a real change is announced — a miss changed nothing to tell anyone about.
  if (updated) await emit(studioId, { type: TYPE.rowUpdated, sectionId, collection: name, rowId });
  return updated;
}
export async function deleteRow(
  studioId: string, sectionId: string, name: string, rowId: string,
): Promise<boolean> {
  const removed = await editArr<Row, boolean>(SEC.col(studioId, sectionId, name), (rows) => {
    const next = rows.filter((r) => r.id !== rowId);
    return next.length === rows.length ? { result: false } : { next, result: true };
  });
  if (removed) await emit(studioId, { type: TYPE.rowDeleted, sectionId, collection: name, rowId });
  return removed;
}

// ---- access grants (removed) -----------------------------------------------
// listGrants/setGrant/removeGrant and the s:<StudioID>:grants key went with the
// grants model. Nothing read a grant after roles landed, so setGrant was a write
// that changed no decision and listGrants was a Redis round-trip on every ERP
// page load whose result was threaded through three functions and dropped.
//
// What replaced them: modules/people/roles.js for the definitions, `roleIds` on the
// collaborator row for the assignment, and platform/access/resolve.ts for the answer.
