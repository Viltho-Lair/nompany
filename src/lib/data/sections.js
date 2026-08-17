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
// the permission catalogue in lib/access.js, via the roles on somebody's
// collaborator row — see the note where the grant helpers used to be.

import { S, SEC, ID, SECTION_COLLECTIONS } from "@/lib/data/keys";
import { readArr, editArr } from "@/lib/data/store";
import { emit, TYPE } from "@/lib/data/events";

// ---- section rows ----------------------------------------------------------
export async function listSections(studioId) {
  const rows = await readArr(S.sections(studioId));
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
export async function getSection(studioId, sectionId) {
  const rows = await readArr(S.sections(studioId));
  return rows.find((s) => s.id === sectionId) || null;
}
export async function getSectionByKey(studioId, key) {
  const rows = await readArr(S.sections(studioId));
  return rows.find((s) => s.key === key) || null;
}

// Append a new section — UNIQUE(StudioID, key); always a fresh SectionID. The
// uniqueness check runs inside the atomic write, and sortOrder is derived from
// the list as it actually stands, so two appends cannot collide on either.
export async function appendSection(studioId, { key, name, parentId = null }) {
  const cleanKey = String(key || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  if (!cleanKey || !cleanName) return { error: "missing" };
  return editArr(S.sections(studioId), (rows) => {
    if (rows.some((s) => s.key === cleanKey)) return { result: { error: "exists" } };
    if (parentId) {
      const parent = rows.find((s) => s.id === parentId);
      // The tree is one level deep: a sub-section cannot own sub-sections.
      if (!parent) return { result: { error: "parent" } };
      if (parent.parentId) return { result: { error: "nested" } };
    }
    const section = {
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
export async function updateSection(studioId, sectionId, patch) {
  return editArr(S.sections(studioId), (rows) => {
    let updated = null;
    const next = rows.map((s) => {
      if (s.id !== sectionId) return s;
      const { id, studioId: sid, key, parentId, ...safe } = patch || {};
      updated = { ...s, ...safe, id: s.id, studioId: s.studioId, key: s.key, parentId: s.parentId ?? null };
      return updated;
    });
    return updated ? { next, result: updated } : { result: null };
  });
}

// The collection names a section key is allowed to hold (from the fixed map);
// appended custom sections start with no predefined collections.
export function collectionsForKey(sectionKey) {
  return SECTION_COLLECTIONS[sectionKey] || [];
}

// ---- operational rows (each carries studioId + sectionId) ------------------
// Reading is free-form; WRITING is only ever addRow/updateRow/deleteRow. There
// is deliberately no writeCol(): a blind whole-collection write is exactly the
// lost update those three exist to prevent, so the door is not left open.
export async function readCol(studioId, sectionId, name) {
  return readArr(SEC.col(studioId, sectionId, name));
}
// The three mutators each apply their change to the collection AS IT ACTUALLY
// STANDS at the instant of the write, not to a copy read moments earlier. Two
// people ticking different checklist items on the same board both land.
export async function addRow(studioId, sectionId, name, item) {
  const row = await editArr(SEC.col(studioId, sectionId, name), (rows) => {
    const created = { id: item.id || ID.row(name), ...item, studioId, sectionId };
    return { next: [created, ...rows], result: created };
  });
  await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name, rowId: row.id });
  return row;
}

// `patch` may be a function of the current row, which is how a caller expresses
// "flip this field" rather than "set it to what I last saw". On a contended
// write the function is re-applied to the row as it now is — so the flip stays
// a flip instead of silently reverting someone else's change.
export async function updateRow(studioId, sectionId, name, rowId, patch) {
  const updated = await editArr(SEC.col(studioId, sectionId, name), (rows) => {
    let hit = null;
    const next = rows.map((r) => {
      if (r.id !== rowId) return r;
      const changes = typeof patch === "function" ? patch(r) : patch;
      hit = { ...r, ...changes, id: r.id, studioId: r.studioId, sectionId: r.sectionId };
      return hit;
    });
    return hit ? { next, result: hit } : { result: null };
  });
  // Only a real change is announced — a miss changed nothing to tell anyone about.
  if (updated) await emit(studioId, { type: TYPE.rowUpdated, sectionId, collection: name, rowId });
  return updated;
}
export async function deleteRow(studioId, sectionId, name, rowId) {
  const removed = await editArr(SEC.col(studioId, sectionId, name), (rows) => {
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
// What replaced them: lib/data/roles.js for the definitions, `roleIds` on the
// collaborator row for the assignment, and lib/access.js for the answer.
