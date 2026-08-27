// THE ENGAGEMENT STORE — create/read/attach/detach over the new key scheme.
// The root holds context + the singleton pointers only; many-membership lives
// in ZSETs (spec §3.3), so a busy engagement never contends on one document.
import { ENG, ID, UNASSIGNED_ENG, deterministicEngId } from "./keys";
import { getJSON, setJSON, editJSON, zAdd, zRange, zRem, sAdd, sRem, sCard } from "./store";
import { isSingleton, stageOf } from "../engagement/registry";
import { buildEngagements } from "../engagement/backfill";
import type { EngagementDescriptor } from "../engagement/backfill";

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

// One well-known engagement per studio for loose records (spec §3.6.2).
export async function unassignedEngagement(studioId: string): Promise<Engagement> {
  const key = ENG.root(studioId, UNASSIGNED_ENG);
  const existing = await getJSON<Engagement>(key);
  if (existing) return existing;
  const eng: Engagement = {
    id: UNASSIGNED_ENG, studioId, ref: "",
    context: {}, singletons: { ticket: null, approvedQuotation: null, project: null },
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  await setJSON(key, eng);
  return eng;
}

// Promote a loose member into a real engagement: a SET move, no record rewrite.
// (The caller updates the record's own engagementId field in Phase 1.)
export async function promote(studioId: string, type: string, recId: string, toEngId: string): Promise<void> {
  if (isSingleton(type)) throw new Error("promote-singleton");
  const score = await scoreOf(studioId, UNASSIGNED_ENG, type, recId);
  await zRem(ENG.members(studioId, UNASSIGNED_ENG, type), recId);
  await zAdd(ENG.members(studioId, toEngId, type), score, recId);
  await sAdd(ENG.hasStage(studioId, type), toEngId);
}

// Phase-0 simplification: both branches return Date.now(), because the record's
// own createdAt is not read back here yet — Phase 1 stores it on the record and
// reads it, preserving the member's original ordering across the move.
async function scoreOf(studioId: string, engId: string, type: string, recId: string): Promise<number> {
  const ids = await zRange(ENG.members(studioId, engId, type), 0, -1);
  return ids.includes(recId) ? Date.now() : Date.now();
}

// Persist a backfill descriptor as the engagement layer. Idempotent: the root is
// set (not appended), members are re-added to a set (ZADD is idempotent per id),
// and the reverse index is re-pointed. Writes only ENG.* / recEng keys — never an
// existing record (read-layer discipline, spec Phase 1a).
export async function applyDescriptor(studioId: string, d: EngagementDescriptor): Promise<void> {
  await setJSON(ENG.root(studioId, d.engId), {
    id: d.engId, studioId, ref: d.ref, context: d.context,
    singletons: d.singletons, createdAt: nowISO(), updatedAt: nowISO(),
  });
  for (const [type, ids] of Object.entries(d.members)) {
    for (const recId of ids) {
      await zAdd(ENG.members(studioId, d.engId, type), 0, recId);
      await setJSON(ENG.recEng(studioId, type, recId), d.engId);
    }
  }
  for (const [slot, recId] of Object.entries(d.singletons)) {
    if (recId) await setJSON(ENG.recEng(studioId, slot, recId), d.engId);
  }
}

export async function engagementOf(studioId: string, type: string, recId: string): Promise<string | null> {
  return getJSON<string>(ENG.recEng(studioId, type, recId));
}

// Assemble the engagement from the layer (root + every member set). Record
// bodies are resolved by the caller from their own collections — this returns ids.
export async function readEngagementView(
  studioId: string, engId: string,
): Promise<{ context: Record<string, unknown>; singletons: Record<string, string | null>; members: Record<string, string[]> } | null> {
  const root = await readEngagement(studioId, engId);
  if (!root) return null;
  const members: Record<string, string[]> = {};
  // SINGULAR registry types (STAGE_REGISTRY) — the same vocabulary attachRecord
  // and ENG.members use, so a Phase-1b attachRecord("invoice", …) lands in the
  // ZSET this reads, not a second, plural, invisible one.
  for (const type of ["rfq", "quotation", "invoice", "expense", "order",
                      "delivery", "shipment", "task", "overtime", "sheet"]) {
    const ids = await zRange(ENG.members(studioId, engId, type), 0, -1);
    if (ids.length) members[type] = ids;
  }
  return { context: root.context, singletons: root.singletons, members };
}

// Dual-write helper: derive and persist the engagement for a just-created ticket,
// reusing the SAME clustering the backfill uses so a live ticket and a backfilled
// one are identical. Children (rfq/quotation/project) attach later as they're
// created (Phase 1b-ii+). Returns the deterministic engId.
export async function attachTicketEngagement(
  studioId: string, ticket: Record<string, unknown>, client: Record<string, unknown> | null,
): Promise<string> {
  const [descriptor] = buildEngagements({
    salesTickets: [ticket],
    salesClients: client ? [client] : [],
  });
  await applyDescriptor(studioId, descriptor);
  return descriptor.engId;
}

// Attach a spine record (rfq, converted quotation, invoice, …) to the ticket
// engagement it belongs to. The ticket's engId is deterministic (spec §3.4),
// so a caller never has to look it up first — no extra hop.
export async function attachToTicketEngagement(
  studioId: string, type: string, recId: string, ticketId: string,
): Promise<void> {
  await attachRecord(studioId, deterministicEngId("ticket", ticketId), type, recId);
}

// An internal (ticket-less) quotation mints its OWN engagement — the backfill's
// orphan-quotation path, reused so a live internal quotation and a backfilled
// one match byte-for-byte.
export async function attachQuotationEngagement(
  studioId: string, quotation: Record<string, unknown>, client: Record<string, unknown> | null,
): Promise<string> {
  const [descriptor] = buildEngagements({
    quotations: [quotation], salesClients: client ? [client] : [],
  });
  await applyDescriptor(studioId, descriptor);
  return descriptor.engId;
}

// Record which quotation a ticket's engagement has approved. A compare-and-set
// on the root (Inv. 8) — never a blind overwrite — and a no-op when the root is
// absent, so a caller racing engagement creation loses nothing: the reconcile
// job rebuilds the root from the record itself on its next pass.
export async function setApprovedQuotation(
  studioId: string, engId: string, quotationId: string,
): Promise<void> {
  await editJSON<Engagement, void>(ENG.root(studioId, engId), (eng) => {
    if (!eng) return { result: undefined }; // root absent → reconcile will build it
    return { next: { ...eng, singletons: { ...eng.singletons, approvedQuotation: quotationId }, updatedAt: nowISO() } };
  });
}
