// THE CONSOLE'S WRITES TO THE INDUSTRY CATALOGUE — /super only, each one
// compare-and-set (invariant 8). A LOCKED industry refuses every change but the
// one that unlocks it — the owner, 29/09/2026: "locking ... so no changes done
// on it unintentionally". The lock is checked INSIDE the write, against the row
// as it is at that moment, so a lock set in another tab a second earlier wins.
// Reads are lib/data/industries.

import { editArr, readArr } from "@/platform/db/store";
import type { Row } from "@/platform/db/store";
import { ALL_SECTION_KEYS, REG } from "@/platform/db/keys";
import { BUILT_IN_KEYS, cleanIndustry, industryProblems, keyFromName, mergeIndustries, type Industry } from "@/shared/industryCatalogue";
import { studioSetupCatalogue } from "@/modules/main/studios";

const KEY = REG.industryCatalogue;

/** The sections a profile may switch on — the departments the create screen asks about. */
export function profileSectionKeys(): string[] {
  return [...studioSetupCatalogue().roots];
}

type Result = { industries: Industry[] } | { error: string; problems?: string[] };

async function write(key: string, change: (current: Industry | null, all: Industry[]) => Industry | { error: string; problems?: string[] } | "drop"): Promise<Result> {
  return editArr<Row, Result>(KEY, (rows) => {
    const all = mergeIndustries(rows);
    const current = all.find((i) => i.key === key) || null;
    const next = change(current, all);
    if (next === "drop") {
      return { next: rows.filter((r) => r.key !== key), result: { industries: mergeIndustries(rows.filter((r) => r.key !== key)) } };
    }
    // A refusal writes nothing.
    if ("error" in next) return { result: next };
    const row = { ...next } as unknown as Row;
    const without = rows.filter((r) => r.key !== key);
    const written = [...without, row];
    return { next: written, result: { industries: mergeIndustries(written) } };
  });
}

function checked(ind: Industry, all: Industry[]): Industry | { error: string; problems: string[] } {
  const problems = industryProblems(ind, profileSectionKeys(), ALL_SECTION_KEYS, all);
  return problems.length ? { error: "invalid", problems } : ind;
}

/**
 * CHANGE ONE INDUSTRY: names, sentence, active, profile, specialisms. The key
 * is the URL's and never the body's. A specialism key already in the industry
 * is kept as it was — a key is never renamed; a new specialism gets one minted
 * from its English name.
 */
export async function saveIndustry(key: string, input: unknown): Promise<Result> {
  return write(key, (current, all) => {
    if (!current) return { error: "notfound" };
    if (current.locked) return { error: "locked" };
    const body = cleanIndustry({ ...(input as object), key, locked: false }, current.builtIn);
    const known = new Set(current.specialisms.map((sp) => sp.key));
    body.specialisms = body.specialisms.map((sp) => ({ ...sp, key: sp.key && known.has(sp.key) ? sp.key : keyFromName(sp.en) }));
    return checked(body, all);
  });
}

/** ADD AN INDUSTRY. Its key is minted from its English name and can never change. */
export async function addIndustry(input: unknown): Promise<Result> {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const key = keyFromName(String(raw.en || ""));
  if (!key) return { error: "name" };
  return write(key, (current, all) => {
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
export async function setIndustryLock(key: string, locked: boolean): Promise<Result> {
  return write(key, (current) => {
    if (!current) return { error: "notfound" };
    return { ...current, locked };
  });
}

/** BACK TO THE CODE'S VERSION — built-ins only, and never while locked. */
export async function revertIndustry(key: string): Promise<Result> {
  if (!BUILT_IN_KEYS.has(key)) return { error: "not-built-in" };
  return write(key, (current) => {
    if (!current) return { error: "notfound" };
    if (current.locked) return { error: "locked" };
    return "drop";
  });
}

/** Was this built-in changed in the console? (A console-added one always was.) */
export function isCustomised(ind: Industry, stored: readonly Row[]): boolean {
  return stored.some((r) => r.key === ind.key);
}

export async function readIndustryRows(): Promise<Row[]> {
  return readArr(KEY);
}

