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

import { S, ID, SECTION_COLLECTIONS, SECTION_DEFS, ALL_SECTION_KEYS } from "./keys";
import { readArr, editArr } from "./store";
import type { Row } from "./store";
import * as R from "./redisRows";
import * as P from "./pgRows";

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

/**
 * IS THIS STUDIO'S LIST THE PRODUCT'S LIST? Answered from rows already in hand.
 *
 * The section list belongs to the deployed PRODUCT, not to the date a tenant
 * signed up: two studios registered a month apart must have the same sections,
 * because an update is shared with everyone. The rows themselves are the whole
 * truth about that — which is why there is no stored version stamp. A stamp
 * would be a second source of truth able to disagree with the rows it describes
 * (version 7, one row short), and it would need backfilling onto every existing
 * studio, which is the migration problem this is here to remove.
 */
const isComplete = (rows: Section[]): boolean => {
  if (rows.length < ALL_SECTION_KEYS.length) return false;
  const have = new Set(rows.map((r) => r.key));
  return ALL_SECTION_KEYS.every((k) => have.has(k));
};

/**
 * THE ROWS AS STORED, with no catch-up. For readers that must not write.
 *
 * `listSections` plants what a studio is short of, which is what keeps every
 * tenant on the same product — but it makes a read a potential write, and there
 * is one caller for which that is wrong: scripts/migrate/plant-sections.mjs
 * asks what each studio is MISSING, and its whole contract is that a dry run
 * changes nothing. Reading through the catch-up would have made the dry run
 * plant the very rows it was reporting, then announce "nothing written", and
 * report zero planted on the apply run because the work was already done.
 *
 * Named for what it is rather than taking a flag, so a caller has to choose
 * deliberately and a reader can see which one it chose.
 */
export async function sectionsAsStored(studioId: string): Promise<Section[]> {
  const rows = await readArr<Section>(S.sections(studioId));
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function listSections(studioId: string): Promise<Section[]> {
  // ONE READ, AND THE CATCH-UP COSTS NOTHING WHEN THERE IS NOTHING TO CATCH.
  //
  // R2 took reconciliation off this path because it ran plantMissingSections on
  // every request — and that function did its OWN read, so the funnel every
  // reader passes through paid TWO round trips for a list that changes
  // approximately never. The expense was the second read, not the question.
  //
  // So the question is asked of the rows already fetched: a set membership test
  // over ~45 short strings, no I/O. A studio that is up to date — every studio,
  // almost always — pays exactly what it paid before. A studio created before a
  // section existed plants it the first time anybody opens it, once, and is then
  // in the fast path forever.
  //
  // WHY ON READ AT ALL, when scripts/migrate/plant-sections.mjs exists. Because
  // a manual step gets forgotten: `administration-access` shipped on 03/09 and
  // was still missing from two of three live studios two days later, with
  // nothing complaining. A tenant should not see a different product because of
  // when they signed up.
  //
  // THE ASSUMPTION THIS INHERITS, stated on plantMissingSections below and worth
  // repeating here because auto-planting is what makes it load-bearing: a
  // seeded key missing from a studio can only mean the studio predates the key,
  // never that somebody removed it. Nothing deletes sections today. If section
  // deletion ever ships, this resurrects what was just deleted, and both need a
  // record of which keys have been planted.
  const rows = await readArr<Section>(S.sections(studioId));
  if (!isComplete(rows)) {
    // Already ordered and renumbered by the planter, and handed back from the
    // same write — no third round trip to read what was just written.
    return plantMissingSections(studioId, rows);
  }
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
export async function plantMissingSections(studioId: string, known?: Section[]): Promise<Section[]> {
  // `known` is the caller's already-fetched rows. listSections passes them so
  // the catch-up costs no extra read; the migration script passes nothing and
  // this reads for itself, which is what lets it walk every studio unattended.
  const rows = known ?? await readArr<Section>(S.sections(studioId));
  if (isComplete(rows)) return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

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
//
// WHICH STORE ANSWERS. Redis by default, deliberately: an unset variable must
// never mean "migrate", or a migration happens by accident on the first deploy
// that forgets it.
//
// `parity` is the mode that makes the migration provable. It runs BOTH
// implementations on every call and throws on any disagreement, which turns the
// entire existing suite — 153 goldens included — into the parity test. A
// purpose-built harness can only check what somebody thought of; this checks
// what the product actually does.
// THE DEFAULT IS `postgres` NOW, AND THE OLD NAME NO LONGER MEANS WHAT IT SAYS.
//
// `redis` used to mean "collections live in Redis". Redis is gone: store.ts is
// backed by the `documents` table, so that mode now means "collections live as
// JSON arrays in the document store" — which works, and is exactly what this
// product did before P1, but it is not where a collection belongs. Operational
// rows belong in `collection_rows`: one row per record, indexed, and under FORCE
// ROW LEVEL SECURITY keyed on tenant_id, which a JSON array in a shared
// document table cannot be.
//
// So the default flipped rather than the mode being deleted. Deleting it would
// take `parity` with it, and parity is the thing that proved the two agree —
// it is worth keeping until the operational path has run in production long
// enough to be boring. The name is now wrong and is left wrong deliberately:
// renaming it would rewrite every place the migration recorded which store
// answered, for a mode that is on its way out.
export const DB_BACKEND = (process.env.NOMPANY_DB || "postgres") as "redis" | "postgres" | "parity";

function disagree(fn: string, a: unknown, b: unknown): never {
  throw new Error(
    `parity: ${fn} disagreed\n  redis:    ${JSON.stringify(a)}\n  postgres: ${JSON.stringify(b)}`,
  );
}

// COMPARED AS JSON TEXT, not with a deep-equal. Key order is the thing most
// likely to differ and the thing a structural comparison cannot see — which is
// precisely the failure this whole task exists to catch.
function same(fn: string, a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) disagree(fn, a, b);
  return a;
}

// PARITY WRITES GO TO BOTH STORES, WHICH MEANS BOTH MUST END IN THE SAME
// STATE. Redis runs first (it is the store of record until cutover); if
// Postgres then fails, the two stores have already diverged — Redis holds the
// write and Postgres does not — and every later parity comparison in this run
// is comparing against a Postgres that is missing state. Swallowing that
// failure and returning the Redis result anyway would hide exactly the defect
// this mode exists to surface, so it is never caught here: it is rethrown,
// named as a DIVERGENCE rather than a bare Postgres error, so whoever reads
// the log knows the two stores need reconciling before the next comparison in
// this run can be trusted at all.
async function second<T>(fn: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`parity: ${fn} — redis succeeded but postgres failed, stores now diverge: ${msg}`);
  }
}

export async function readCol<T extends Row = Row>(s: string, sec: string, n: string): Promise<T[]> {
  if (DB_BACKEND === "postgres") return P.pgReadCol<T>(s, sec, n);
  const a = await R.redisReadCol<T>(s, sec, n);
  if (DB_BACKEND !== "parity") return a;
  return same("readCol", a, await P.pgReadCol<T>(s, sec, n)) as T[];
}

export async function addRow<T extends Row = Row>(s: string, sec: string, n: string, item: Row): Promise<T> {
  if (DB_BACKEND === "postgres") return P.pgAddRow<T>(s, sec, n, item);
  const a = await R.redisAddRow<T>(s, sec, n, item);
  if (DB_BACKEND !== "parity") return a;
  // The id is minted by whichever ran first (Redis), so the second is handed
  // it explicitly — the comparison is about SHAPE and ORDER, not about two
  // stores independently inventing the same random id.
  //
  // announce: false — Redis already fired emit and bumpMainAgg for this exact
  // create; this second call exists to verify the DATA matches, not to
  // re-announce a change that already happened. Found by a real assertion:
  // "two tracked creates count as +2" landed as +4 (both stores announcing)
  // before this flag existed. See PgWriteOpts in pgRows.ts.
  const b = await second("addRow", () => P.pgAddRow<T>(s, sec, n, { ...item, id: a.id }, { announce: false }));
  return same("addRow", a, b) as T;
}

export async function addRows<T extends Row = Row>(s: string, sec: string, n: string, items: readonly Row[]): Promise<T[]> {
  if (DB_BACKEND === "postgres") return P.pgAddRows<T>(s, sec, n, items);
  const a = await R.redisAddRows<T>(s, sec, n, items);
  if (DB_BACKEND !== "parity") return a;
  // Same reasoning as addRow, per row in the batch — each id came from Redis,
  // seeded into the Postgres call rather than left to mint its own — and the
  // identical announce: false, for the identical reason.
  const seeded = items.map((it, i) => ({ ...it, id: a[i]?.id }));
  const b = await second("addRows", () => P.pgAddRows<T>(s, sec, n, seeded, { announce: false }));
  return same("addRows", a, b) as T[];
}

export async function updateRow<T extends Row = Row>(
  s: string, sec: string, n: string, id: string, patch: Row | ((row: T) => Row),
): Promise<T | null> {
  if (DB_BACKEND === "postgres") return P.pgUpdateRow<T>(s, sec, n, id, patch);
  const a = await R.redisUpdateRow<T>(s, sec, n, id, patch);
  if (DB_BACKEND !== "parity") return a;
  // announce: false — see addRow above.
  const b = await second("updateRow", () => P.pgUpdateRow<T>(s, sec, n, id, patch, { announce: false }));
  return same("updateRow", a, b) as T | null;
}

export async function deleteRow(s: string, sec: string, n: string, id: string): Promise<boolean> {
  if (DB_BACKEND === "postgres") return P.pgDeleteRow(s, sec, n, id);
  const a = await R.redisDeleteRow(s, sec, n, id);
  if (DB_BACKEND !== "parity") return a;
  // announce: false — see addRow above.
  const b = await second("deleteRow", () => P.pgDeleteRow(s, sec, n, id, { announce: false }));
  return same("deleteRow", a, b) as boolean;
}

// ---- access grants (removed) -----------------------------------------------
// listGrants/setGrant/removeGrant and the s:<StudioID>:grants key went with the
// grants model. Nothing read a grant after roles landed, so setGrant was a write
// that changed no decision and listGrants was a Redis round-trip on every ERP
// page load whose result was threaded through three functions and dropped.
//
// What replaced them: modules/people/roles.js for the definitions, `roleIds` on the
// collaborator row for the assignment, and platform/access/resolve.ts for the answer.
