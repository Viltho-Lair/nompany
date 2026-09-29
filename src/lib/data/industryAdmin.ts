// THE CONSOLE'S WRITES TO THE INDUSTRY CATALOGUE — /super only, each one
// compare-and-set (invariant 8). A LOCKED industry refuses every change but the
// one that unlocks it — the owner, 29/09/2026: "locking ... so no changes done
// on it unintentionally". The lock is checked INSIDE the write, against the row
// as it is at that moment, so a lock set in another tab a second earlier wins.
// Reads are lib/data/industries.
//
// EVERY CHANGE KEEPS THE VERSION IT REPLACED — the owner, the same day: "per
// created industry a version history is reasonable, with a restore button".
// Each write appends to that industry's own history (INDUSTRY.history) the
// industry as it was BEFORE, who changed it and when; restoring one writes it
// back and is itself a change, so a restore can be undone the same way.
//
// THE HISTORY IS WRITTEN AFTER THE CHANGE, as a second document. A crash
// between the two loses one entry, never the change — the catalogue is what
// studios read, and it must not wait on the log. Refusals record nothing.

import { editArr, readArr } from "@/platform/db/store";
import type { Row } from "@/platform/db/store";
import { ALL_SECTION_KEYS, ID, INDUSTRY, REG } from "@/platform/db/keys";
import {
  BUILT_IN_KEYS, cleanIndustry, describeChange, industryProblems, keyFromName, mergeIndustries, restoredVersion, type Industry,
} from "@/shared/industryCatalogue";
import { studioSetupCatalogue } from "@/modules/main/studios";
import { FLOW_TEMPLATES } from "@/platform/engagement/templates";

const KEY = REG.industryCatalogue;

/**
 * Who changed it, as the history shows it: the console admin's email. Here
 * rather than in a route, because a route file may export only its handlers.
 */
export function byOf(admin: unknown): string {
  const a = (admin || {}) as { email?: unknown; id?: unknown };
  return String(a.email || a.id || "");
}

/** How many versions an industry keeps. Older ones fall off the end. */
export const HISTORY_LIMIT = 50;

/** The sections a profile may switch on — the departments the create screen asks about. */
export function profileSectionKeys(): string[] {
  return [...studioSetupCatalogue().roots];
}

export type Action = "added" | "saved" | "locked" | "unlocked" | "reverted" | "restored";
export type HistoryEntry = { id: string; at: string; by: string; action: Action; before: Industry | null };

type Result = { industries: Industry[] } | { error: string; problems?: string[] };
type Change = Industry | { error: string; problems?: string[] } | "drop";

async function write(key: string, action: Action, by: string, change: (current: Industry | null, all: Industry[]) => Change): Promise<Result> {
  // The version this write replaced, from the round that WON: the closure may
  // run once per compare-and-set retry, and only the last run is what landed.
  let before: Industry | null = null;
  const out = await editArr<Row, Result>(KEY, (rows) => {
    const all = mergeIndustries(rows);
    const current = all.find((i) => i.key === key) || null;
    before = current;
    const next = change(current, all);
    if (next === "drop") {
      const kept = rows.filter((r) => r.key !== key);
      return { next: kept, result: { industries: mergeIndustries(kept) } };
    }
    // A refusal writes nothing.
    if ("error" in next) return { result: next };
    const written = [...rows.filter((r) => r.key !== key), { ...next } as unknown as Row];
    return { next: written, result: { industries: mergeIndustries(written) } };
  });
  if (!("error" in out)) {
    const entry: HistoryEntry = { id: ID.industryChange(), at: new Date().toISOString(), by, action, before };
    await editArr<HistoryEntry>(INDUSTRY.history(key), (rows) => ({ next: [...rows, entry].slice(-HISTORY_LIMIT), result: undefined }));
  }
  return out;
}

function checked(ind: Industry, all: Industry[]): Industry | { error: string; problems: string[] } {
  const problems = industryProblems(ind, profileSectionKeys(), ALL_SECTION_KEYS, FLOW_TEMPLATES.map((t) => t.id), all);
  return problems.length ? { error: "invalid", problems } : ind;
}

/**
 * CHANGE ONE INDUSTRY: names, sentence, active, profile, specialisms. The key
 * is the URL's and never the body's. A specialism key already in the industry
 * is kept as it was — a key is never renamed; a new specialism gets one minted
 * from its English name.
 */
export async function saveIndustry(key: string, input: unknown, by: string): Promise<Result> {
  return write(key, "saved", by, (current, all) => {
    if (!current) return { error: "notfound" };
    if (current.locked) return { error: "locked" };
    const body = cleanIndustry({ ...(input as object), key, locked: false }, current.builtIn);
    const known = new Set(current.specialisms.map((sp) => sp.key));
    body.specialisms = body.specialisms.map((sp) => ({ ...sp, key: sp.key && known.has(sp.key) ? sp.key : keyFromName(sp.en) }));
    return checked(body, all);
  });
}

/** ADD AN INDUSTRY. Its key is minted from its English name and can never change. */
export async function addIndustry(input: unknown, by: string): Promise<Result> {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const key = keyFromName(String(raw.en || ""));
  if (!key) return { error: "name" };
  return write(key, "added", by, (current, all) => {
    if (current) return { error: "taken" };
    const body = cleanIndustry({ ...raw, key, locked: false }, false);
    body.specialisms = body.specialisms.map((sp) => ({ ...sp, key: keyFromName(sp.en) }));
    return checked(body, all);
  });
}

/**
 * LOCK OR UNLOCK. The one change a locked industry accepts, and a separate call
 * on purpose: unlocking is never a side effect of saving something else.
 * Locking a built-in the console has not touched stores the code's version,
 * locked — so the lock also holds it still against a later release.
 */
export async function setIndustryLock(key: string, locked: boolean, by: string): Promise<Result> {
  return write(key, locked ? "locked" : "unlocked", by, (current) => {
    if (!current) return { error: "notfound" };
    return { ...current, locked };
  });
}

/** BACK TO THE CODE'S VERSION — built-ins only, and never while locked. */
export async function revertIndustry(key: string, by: string): Promise<Result> {
  if (!BUILT_IN_KEYS.has(key)) return { error: "not-built-in" };
  return write(key, "reverted", by, (current) => {
    if (!current) return { error: "notfound" };
    if (current.locked) return { error: "locked" };
    return "drop";
  });
}

/**
 * PUT AN OLDER VERSION BACK: the industry as it was before the change `entryId`
 * records. Refused while locked, and checked like any save — a version that no
 * longer passes (a section since removed from the product) is refused by name
 * rather than written. A specialism added since is kept, switched off
 * (`restoredVersion` says why).
 */
export async function restoreIndustry(key: string, entryId: string, by: string): Promise<Result> {
  const entry = (await readArr<HistoryEntry>(INDUSTRY.history(key))).find((e) => e.id === entryId);
  if (!entry) return { error: "notfound" };
  if (!entry.before) return { error: "nothing-before" };
  const version = cleanIndustry(entry.before, Boolean(entry.before.builtIn));
  return write(key, "restored", by, (current, all) => {
    if (!current) return { error: "notfound" };
    if (current.locked) return { error: "locked" };
    return checked(restoredVersion(version, current), all);
  });
}

/**
 * ONE INDUSTRY'S HISTORY, newest first, each entry with what its change did.
 * An entry stores the version BEFORE its change, so what came AFTER is the
 * next entry's "before" — or, for the newest, the industry as it is now.
 */
export async function industryHistory(key: string) {
  const [rows, all] = await Promise.all([readArr<HistoryEntry>(INDUSTRY.history(key)), readArr<Row>(KEY)]);
  const now = mergeIndustries(all).find((i) => i.key === key) || null;
  const clean = (v: Industry | null) => (v ? cleanIndustry(v, Boolean(v.builtIn)) : null);
  return rows.map((e, i) => {
    const after = i + 1 < rows.length ? clean(rows[i + 1].before) : now;
    return { id: e.id, at: e.at, by: e.by, action: e.action, restorable: Boolean(e.before), changes: describeChange(clean(e.before), after) };
  }).reverse();
}

export async function readIndustryRows(): Promise<Row[]> {
  return readArr(KEY);
}
