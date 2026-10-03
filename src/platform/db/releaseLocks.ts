// SECTIONS STILL BEING BUILT, HIDDEN FROM EVERY STUDIO — the owner, 03/10/2026:
// "there should be a way in /super to lock these sections and their subsections
// entirely for studio to not be able to see undergoing improvements."
//
// A LOCK IS A SWITCH THE STUDIO CANNOT TURN ON. A locked section reads as
// switched off (`enabled: false`) wherever the studio's sections are read
// (`listSections`), so every rule that already honours the switch applies with
// nothing new: the sidebar leaves it out, its API answers `section-off` (404)
// before the handler runs, its dashboard widgets are absent and Main's figures
// skip it. What the lock ADDS is the words — Settings → Sections and the page
// itself say "being improved" rather than nothing — and that the studio cannot
// switch it back on.
//
// NOTHING IS STORED ON THE STUDIO. The overlay is applied to a copy of the rows
// on the way out; the studio's own switch is untouched underneath, so lifting a
// lock gives every studio back exactly what it had. Records filed under a locked
// section stay where they are — a lock hides a screen, it never moves or deletes
// anything.
//
// A ROOT TAKES ITS CHILDREN WITH IT. StudioFrame promotes a visible child whose
// parent is hidden to the top level, so locking Manufacturing while leaving its
// sub-sections on would scatter them across the nav — the same reason a
// switched-off root switches its children off at creation.
//
// PREVIEW STUDIOS see through every lock: the owner's own test studio, where a
// section can be tried on production data before anybody else meets it.
//
// SYSTEM ROWS ARE NEVER LOCKABLE. Main, Approvals and Administration are where a
// member lands and where the studio is configured; locking one would leave a
// studio with nowhere to go and nowhere to undo it.

import { REG, SECTION_DEFS, isFiledOnlySection, isSystemSection } from "./keys";
import { editJSON, getJSON } from "./store";

export type ReleaseLocks = {
  /** Section keys hidden from studios — roots or sub-sections. */
  locked: string[];
  /** Studio ids that see through every lock. */
  previewStudios: string[];
  updatedAt: string;
  updatedBy: string;
};

const EMPTY: ReleaseLocks = { locked: [], previewStudios: [], updatedAt: "", updatedBy: "" };
const NEVER_LOCKED = new Set(["main", "approvals"]);

/**
 * Every key the console may lock: the product's sections and their sub-sections.
 * FILED-ONLY rows are left out (measured on screen 03/10/2026): they are storage,
 * already shown nowhere, so holding one back would change nothing a studio sees
 * and the console would be offering a switch that does nothing.
 */
export function lockableKeys(): string[] {
  return SECTION_DEFS
    .filter((d) => !isSystemSection(d.key) && !NEVER_LOCKED.has(d.key))
    .flatMap((d) => [d.key, ...(d.children || []).map((c) => c.key).filter((k) => !isSystemSection(k) && !isFiledOnlySection(k))]);
}

/** The stored document, cleaned: unknown keys dropped, duplicates removed. */
export function cleanLocks(raw: unknown): ReleaseLocks {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const allowed = new Set(lockableKeys());
  const strings = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map((x) => String(x ?? "").trim()).filter(Boolean))] : []);
  return {
    locked: strings(r.locked).filter((k) => allowed.has(k)),
    previewStudios: strings(r.previewStudios),
    updatedAt: String(r.updatedAt || ""),
    updatedBy: String(r.updatedBy || ""),
  };
}

type Row = { key: string; id?: string; parentId?: string | null };

/**
 * THE KEYS A STUDIO MAY NOT SEE: every locked key, and every row under a locked
 * row — followed through the stored parent ids, because engine registers are
 * planted under a root they do not share a key prefix with (Quality & HSE's).
 * Empty for a preview studio.
 */
export function hiddenKeys(rows: readonly Row[], locks: ReleaseLocks, studioId = ""): Set<string> {
  if (!locks.locked.length || (studioId && locks.previewStudios.includes(studioId))) return new Set();
  const locked = new Set(locks.locked);
  const byId = new Map(rows.filter((r) => r.id).map((r) => [String(r.id), r]));
  const hidden = new Set<string>();
  for (const row of rows) {
    let cur: Row | undefined = row;
    for (let hops = 0; cur && hops < 10; hops += 1) {
      if (locked.has(cur.key)) { hidden.add(row.key); break; }
      cur = cur.parentId ? byId.get(String(cur.parentId)) : undefined;
    }
  }
  // A locked key with no row yet (planted later) is still hidden by name.
  for (const k of locked) hidden.add(k);
  return hidden;
}

/** The rows as a studio sees them: hidden ones read as switched off. A copy — nothing is written. */
export function applyLocks<T extends Row & { enabled?: boolean }>(rows: readonly T[], locks: ReleaseLocks, studioId = ""): T[] {
  const hidden = hiddenKeys(rows, locks, studioId);
  if (!hidden.size) return [...rows];
  return rows.map((r) => (hidden.has(r.key) ? { ...r, enabled: false } : r));
}

// ---- reading and writing ---------------------------------------------------

// ONE READ PER INSTANCE PER HALF MINUTE. This sits on the section read every
// request makes, and the document changes when somebody in /super ships or
// holds back a section — a few times a month. A lock therefore reaches every
// studio within thirty seconds, which is fast enough for something whose whole
// purpose is to stay put.
const TTL_MS = 30_000;
let cache: { at: number; value: ReleaseLocks } | null = null;

export async function readReleaseLocks(): Promise<ReleaseLocks> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = cleanLocks(await getJSON(REG.sectionLocks));
  cache = { at: Date.now(), value };
  return value;
}

/** Replace the locks (the console's one write). Clears this instance's cache. */
export async function writeReleaseLocks(input: unknown, by: string): Promise<ReleaseLocks> {
  const next = cleanLocks({ ...(input as object), updatedAt: new Date().toISOString(), updatedBy: by });
  await editJSON<ReleaseLocks, void>(REG.sectionLocks, () => ({ next, result: undefined }));
  cache = { at: Date.now(), value: next };
  return next;
}

export { EMPTY as NO_LOCKS };

/**
 * THE SECTION KEYS HIDDEN FROM A STUDIO THAT DOES NOT EXIST YET — the create
 * screen's view. Followed through the declared tree (`SECTION_DEFS`), since a
 * new studio has no rows of its own to follow.
 */
export function hiddenDefKeys(locks: ReleaseLocks): Set<string> {
  const rows = SECTION_DEFS.flatMap((d) => [
    { key: d.key, id: d.key, parentId: null },
    ...(d.children || []).map((c) => ({ key: c.key, id: c.key, parentId: d.key })),
  ]);
  return hiddenKeys(rows, locks);
}
