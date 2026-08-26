// THE ENGAGEMENT STORE — create/read/attach/detach over the new key scheme.
// The root holds context + the singleton pointers only; many-membership lives
// in ZSETs (spec §3.3), so a busy engagement never contends on one document.
import { ENG, ID, UNASSIGNED_ENG } from "./keys";
import { getJSON, setJSON, editJSON, zAdd, zRange, zRem, sAdd, sRem, sCard } from "./store";
import { isSingleton, stageOf } from "../engagement/registry";

export type Engagement = {
  id: string; studioId: string; ref: string;
  context: Record<string, unknown>;
  singletons: Record<string, string | null>;
  createdAt: string; updatedAt: string;
};

const nowISO = () => new Date().toISOString();

export async function createEngagement(
  studioId: string, { ref = "", context = {} }: { ref?: string; context?: Record<string, unknown> } = {},
): Promise<Engagement> {
  const id = ID.engagement();
  const eng: Engagement = {
    id, studioId, ref, context,
    singletons: { ticket: null, approvedQuotation: null, project: null },
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  await setJSON(ENG.root(studioId, id), eng);
  return eng;
}

export async function readEngagement(studioId: string, engId: string): Promise<Engagement | null> {
  return getJSON<Engagement>(ENG.root(studioId, engId));
}

// Claim a singleton slot with compare-and-set: null → recId, refuse if filled.
// The claim happens on the root BEFORE a caller writes the record in Phase 1,
// so a lost cardinality race never leaves an orphan (spec §3.5, pressure-test #3).
//
// editJSON's real shape is `{ next, result }` / `{ result }`, not "return the
// next value directly" as sketched in the brief — the outcome and the value are
// distinct so a refusal-to-write ({ result }) cannot be confused with writing
// `undefined`. Adapted here; the compare-and-set semantics are unchanged.
async function claimSingleton(studioId: string, engId: string, type: string, recId: string): Promise<void> {
  await editJSON<Engagement, void>(ENG.root(studioId, engId), (eng) => {
    if (!eng) throw new Error("no-engagement");
    const cur = eng.singletons[type];
    if (cur && cur !== recId) throw new Error("cardinality");
    return { next: { ...eng, singletons: { ...eng.singletons, [type]: recId }, updatedAt: nowISO() } };
  });
}

export async function attachRecord(
  studioId: string, engId: string, type: string, recId: string, createdAt = nowISO(),
): Promise<void> {
  if (!stageOf(type)) throw new Error(`unknown-stage:${type}`);
  if (isSingleton(type)) {
    await claimSingleton(studioId, engId, type, recId);
  } else {
    // Many-membership is a ZSET add (spec §3.3): atomic per element, so a busy
    // engagement never contends the root document just to attach a record.
    await zAdd(ENG.members(studioId, engId, type), Date.parse(createdAt) || 0, recId);
  }
  // Indexes: department listing + has-stage. Best-effort, reconcilable (spec §3.5).
  await zAdd(ENG.dept(studioId, type), Date.parse(createdAt) || 0, recId);
  await sAdd(ENG.hasStage(studioId, type), engId);
}

export async function listMembers(
  studioId: string, engId: string, type: string, { limit, rev }: { limit?: number; rev?: boolean } = {},
): Promise<string[]> {
  if (isSingleton(type)) {
    const eng = await readEngagement(studioId, engId);
    const id = eng?.singletons[type];
    return id ? [id] : [];
  }
  const stop = limit && limit > 0 ? limit - 1 : -1;
  return zRange(ENG.members(studioId, engId, type), 0, stop, { rev });
}

// Detach the inverse of attachRecord: a singleton clear is a compare-and-set on
// the root (only if the slot still holds THIS record — a detach racing a later
// re-claim must never clobber the newer claim), a member removal is a plain
// zRem. The department index is always cleared; has-stage is left as-is, since
// the reconcile job prunes an engagement with no remaining record of a type
// (over-reporting presence briefly is cheap; a stray sAdd write here is not).
export async function detachRecord(studioId: string, engId: string, type: string, recId: string): Promise<void> {
  if (isSingleton(type)) {
    await editJSON<Engagement, void>(ENG.root(studioId, engId), (eng) => {
      if (!eng) return { result: undefined };
      if (eng.singletons[type] !== recId) return { result: undefined };
      return { next: { ...eng, singletons: { ...eng.singletons, [type]: null }, updatedAt: nowISO() } };
    });
  } else {
    await zRem(ENG.members(studioId, engId, type), recId);
  }
  await zRem(ENG.dept(studioId, type), recId);
}

// Reverse index for Tier-B reference integrity (spec §3.9): a referrer registers
// itself against the record it points to, so a delete can refuse while the set
// is non-empty. ONLY a live reference calls addRef — a frozen-snapshot
// traceability pointer must not (pressure-test #5) — but that policy belongs to
// the caller in Phase 1; these are just the primitives.
export async function addRef(studioId: string, type: string, refId: string, referrerId: string): Promise<void> {
  await sAdd(ENG.refBy(studioId, type, refId), referrerId);
}
export async function removeRef(studioId: string, type: string, refId: string, referrerId: string): Promise<void> {
  await sRem(ENG.refBy(studioId, type, refId), referrerId);
}
export async function refCount(studioId: string, type: string, refId: string): Promise<number> {
  return sCard(ENG.refBy(studioId, type, refId));
}
