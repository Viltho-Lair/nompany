// SECTION repository + operational-data accessors.
//
// Sections are per-studio rows (seeded from the fixed list at studio creation,
// appendable later — every create mints a fresh SectionID). Per the approved
// plan, SECTIONS OWN THEIR DATA: each operational collection lives under
// s:<StudioID>:sec:<SectionID>:c:<name>, every row carries
// { studioId, sectionId }, and deleting a section deletes its records
// (cascade.js → cascadeDeleteSection).
//
// Access grants (view/manage per collaborator or department) target SectionIDs
// and live in s:<StudioID>:grants.

import { S, SEC, ID, SECTION_COLLECTIONS } from "@/lib/data/keys";
import { readArr, writeArr } from "@/lib/data/store";

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

// Append a new section — UNIQUE(StudioID, key); always a fresh SectionID.
export async function appendSection(studioId, { key, name }) {
  const cleanKey = String(key || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  if (!cleanKey || !cleanName) return { error: "missing" };
  const rows = await readArr(S.sections(studioId));
  if (rows.some((s) => s.key === cleanKey)) return { error: "exists" };
  const section = {
    id: ID.section(), studioId, key: cleanKey, name: cleanName,
    enabled: true, sortOrder: rows.length, settings: {}, createdAt: new Date().toISOString(),
  };
  await writeArr(S.sections(studioId), [...rows, section]);
  return { section };
}

// id / studioId / key are immutable — name, enabled, sortOrder, settings patch.
export async function updateSection(studioId, sectionId, patch) {
  const rows = await readArr(S.sections(studioId));
  let updated = null;
  const next = rows.map((s) => {
    if (s.id !== sectionId) return s;
    const { id, studioId: sid, key, ...safe } = patch || {};
    updated = { ...s, ...safe, id: s.id, studioId: s.studioId, key: s.key };
    return updated;
  });
  if (updated) await writeArr(S.sections(studioId), next);
  return updated;
}

// The collection names a section key is allowed to hold (from the fixed map);
// appended custom sections start with no predefined collections.
export function collectionsForKey(sectionKey) {
  return SECTION_COLLECTIONS[sectionKey] || [];
}

// ---- operational rows (each carries studioId + sectionId) ------------------
export async function readCol(studioId, sectionId, name) {
  return readArr(SEC.col(studioId, sectionId, name));
}
export async function writeCol(studioId, sectionId, name, rows) {
  await writeArr(SEC.col(studioId, sectionId, name), rows);
}
export async function addRow(studioId, sectionId, name, item) {
  const rows = await readCol(studioId, sectionId, name);
  const row = { id: item.id || ID.row(name), ...item, studioId, sectionId };
  await writeCol(studioId, sectionId, name, [row, ...rows]);
  return row;
}
export async function updateRow(studioId, sectionId, name, rowId, patch) {
  const rows = await readCol(studioId, sectionId, name);
  let updated = null;
  const next = rows.map((r) => {
    if (r.id !== rowId) return r;
    updated = { ...r, ...patch, id: r.id, studioId: r.studioId, sectionId: r.sectionId };
    return updated;
  });
  if (updated) await writeCol(studioId, sectionId, name, next);
  return updated;
}
export async function deleteRow(studioId, sectionId, name, rowId) {
  const rows = await readCol(studioId, sectionId, name);
  const next = rows.filter((r) => r.id !== rowId);
  const removed = next.length !== rows.length;
  if (removed) await writeCol(studioId, sectionId, name, next);
  return removed;
}

// ---- access grants (subject = collaborator or department; target = section) -
export async function listGrants(studioId) {
  return readArr(S.grants(studioId));
}
export async function setGrant(studioId, { subjectType, subjectId, sectionId, action, effect }) {
  if (!["collaborator", "department"].includes(subjectType)) return { error: "subject" };
  if (!subjectId || !sectionId || !action) return { error: "missing" };
  const rows = await readArr(S.grants(studioId));
  const without = rows.filter((g) => !(g.subjectType === subjectType && g.subjectId === subjectId && g.sectionId === sectionId && g.action === action));
  const grant = { id: ID.grant(), studioId, subjectType, subjectId, sectionId, action, effect: effect === "deny" ? "deny" : "allow" };
  await writeArr(S.grants(studioId), [...without, grant]);
  return { grant };
}
export async function removeGrant(studioId, grantId) {
  const rows = await readArr(S.grants(studioId));
  await writeArr(S.grants(studioId), rows.filter((g) => g.id !== grantId));
}
