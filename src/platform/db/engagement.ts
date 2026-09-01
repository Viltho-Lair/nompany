// THE ENGAGEMENT STORE — create/read/attach/detach over the new key scheme.
// The root holds context + the singleton pointers only; many-membership lives
// in ZSETs (spec §3.3), so a busy engagement never contends on one document.
import { ENG, ID, UNASSIGNED_ENG, deterministicEngId } from "./keys";
import { getJSON, setJSON, editJSON, delKeys, zAdd, zRange, zRem, zCard, sAdd, sRem, sCard } from "./store";
import { isSingleton, stageOf, STAGE_REGISTRY } from "../engagement/registry";
import { buildEngagements } from "../engagement/backfill";
import type { EngagementDescriptor } from "../engagement/backfill";
import { contribute, emptyContext } from "../engagement/context";
import type { DealContext, ContextProvenance, ContextSource, ContributionResult } from "../engagement/context";

export type Engagement = {
  id: string; studioId: string; ref: string;
  context: Record<string, unknown>;
  /**
   * WHICH FLOW THIS DEAL WALKS. Resolved from the industry when the deal opens
   * and stored, not re-derived: an industry's default template may change, and
   * a deal that silently switched flows would gain and lose stage cards for
   * reasons nobody performed.
   */
  templateId?: string;
  /**
   * WHAT RANK SET EACH FACT — bookkeeping for the contribution rule, kept
   * beside the context rather than inside it so a reader of `context.site` does
   * not have to step around a `siteSetBy`.
   */
  provenance?: ContextProvenance;
  singletons: Record<string, string | null>;
  createdAt: string; updatedAt: string;
  // LOCKED IS THE INTERLOCK ON A DESTRUCTIVE ACTION, and it is optional here
  // for the one reason that matters: absent MEANS locked (see isEngagementLocked).
  // Every engagement already written to Redis — the seven the backfill applied
  // to live, and every root written since — therefore reads as locked with no
  // migration and without touching a single live key.
  locked?: boolean;
};

// LOCKED UNLESS EXPLICITLY UNLOCKED. `!== false` rather than `=== true`, so the
// only value that opens the door is one somebody deliberately wrote through
// setEngagementLock. A missing field, a null, a root half-written by a crashed
// create — all of them read as locked, which is the direction a mistake here
// has to fail in.
//
// applyDescriptor rewrites the whole root and does not carry `locked`, so a
// re-run of the backfill over an unlocked engagement re-locks it. That is
// deliberate and is the same fail-safe: unlocking is a decision with a short
// life, taken immediately before a delete, not a state to be preserved.
export const isEngagementLocked = (eng: Engagement | null | undefined): boolean =>
  eng?.locked !== false;

// THE ROOT'S SINGLETON SLOTS ARE NOT ALL STAGE TYPES. `approvedQuotation` names
// a quotation, so anything walking the root by slot — a cascade deciding what a
// pointer refers to — needs the translation stated once rather than guessed at
// each call site.
export const SLOT_TYPE: Readonly<Record<string, string>> = Object.freeze({
  ticket: "ticket", approvedQuotation: "quotation", project: "project",
});

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
  await zAdd(ENG.index(studioId), Date.parse(eng.createdAt) || Date.now(), id);
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
  // THE REVERSE INDEX, WRITTEN HERE TOO — it used to be applyDescriptor's alone.
  // A backfilled record could answer "which engagement do I belong to?" and a
  // live-attached one could not, so engagementOf returned null for exactly the
  // records created since the dual-writes landed. That gap is invisible while
  // nothing asks the question; the delete path asks it on every removal, and a
  // null there means detaching from nothing. Same value applyDescriptor writes,
  // set (not appended), so a re-attach and a re-run are both idempotent.
  await setJSON(ENG.recEng(studioId, type, recId), engId);
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

// DETACH IS THE EXACT INVERSE OF attachRecord, and it undoes setApprovedQuotation
// too. Every step is a compare-before-write, so re-running it after a crash is a
// no-op rather than an error (invariant 11) and a detach racing a later re-claim
// of the same slot can never clobber the newer claim.
//
// Children-first, registry-last, reading top to bottom: membership goes before
// the indexes that describe it, and has-stage goes last because it can only be
// decided once the membership it summarises is already gone.
export async function detachRecord(studioId: string, engId: string, type: string, recId: string): Promise<void> {
  // 1. THE ROOT'S POINTERS AT THIS RECORD — every slot holding it, not just the
  // slot named `type`. A quotation is a "many" member AND may be the deal's
  // approvedQuotation; clearing only by type would leave the root pointing at a
  // row that no longer exists, which is the phantom this whole path exists to
  // remove. Matching on the VALUE rather than the slot name also means a slot
  // added to the root later is cleared without editing this function.
  await editJSON<Engagement, void>(ENG.root(studioId, engId), (eng) => {
    if (!eng) return { result: undefined };                       // no root → nothing to clear
    const held = Object.entries(eng.singletons).filter(([, id]) => id === recId);
    if (!held.length) return { result: undefined };               // already detached → no write
    const singletons = { ...eng.singletons };
    for (const [slot] of held) singletons[slot] = null;
    return { next: { ...eng, singletons, updatedAt: nowISO() } };
  });
  // 2. MEMBERSHIP. A singleton's membership IS the root slot cleared above.
  if (!isSingleton(type)) await zRem(ENG.members(studioId, engId, type), recId);
  // 3. THE DEPARTMENT INDEX.
  await zRem(ENG.dept(studioId, type), recId);
  // 4. THE REVERSE INDEX, but only while it still names THIS engagement — a
  // record re-attached elsewhere between the two calls keeps its newer pointer.
  if ((await getJSON<string>(ENG.recEng(studioId, type, recId))) === engId) {
    await delKeys(ENG.recEng(studioId, type, recId));
  }
  // 5. HAS-STAGE, LAST AND ONLY WHEN THE STAGE IS ACTUALLY GONE.
  //
  // This used to be left alone deliberately, on the reasoning that a reconcile
  // job would prune it and that over-reporting a stage briefly was cheaper than
  // a stray write here. Both halves have since stopped being true: there is no
  // reconcile job (only the backfill, which is additive and never removes), so
  // "briefly" means forever, and "this studio has an engagement with a project"
  // is the one question eng-ix:has:<type> is asked — answering yes about a
  // deleted project is the same phantom as a stage card claiming a blank ref.
  // The counted guard is what makes it safe: the entry is removed only when the
  // engagement has no remaining record of the type, so an engagement with a
  // second quotation keeps its place. Still advisory rather than authoritative
  // — an attach interleaving between the count and the SREM can drop an entry
  // the attach just added, which the backfill re-adds on its next pass.
  const remaining = isSingleton(type)
    ? ((await readEngagement(studioId, engId))?.singletons[type] ? 1 : 0)
    : await zCard(ENG.members(studioId, engId, type));
  if (!remaining) await sRem(ENG.hasStage(studioId, type), engId);
}

/** The lineage fields a spine record carries, and all a derivation needs. */
export type EngagementLineage = { ticketId?: unknown; quotationId?: unknown; projectId?: unknown };

// WHICH ENGAGEMENT A SPINE RECORD BELONGS TO, DERIVED — the ticket's when there
// is a ticket behind it, the quotation's own when there is not (an internal
// quotation mints its own, see attachQuotationEngagement), and the project's
// own when there is neither (a project raised directly, see
// attachProjectEngagement). This rule is what openProject resolved inline and
// what every attach on the spine already obeys; it lives here once because a
// delete that derived it even slightly differently would detach from an
// engagement nobody ever attached to, and silently succeed.
//
// THE ORDER IS THE WHOLE CONTRACT. Project is last, so adding it moves nothing:
// a project behind a ticket still resolves to the ticket's engagement, and a
// project behind an internal quotation still resolves to the quotation's.
export function engagementIdForLineage(lineage: EngagementLineage): string {
  const ticketId = String(lineage.ticketId || "");
  if (ticketId) return deterministicEngId("ticket", ticketId);
  const quotationId = String(lineage.quotationId || "");
  if (quotationId) return deterministicEngId("quotation", quotationId);
  const projectId = String(lineage.projectId || "");
  return projectId ? deterministicEngId("project", projectId) : "";
}

// THE ONE RESOLUTION A DELETE PATH USES. The reverse index first, because it is
// the recorded answer and survives a record whose lineage was later edited; the
// derivation above only as a fallback, for a record attached before attachRecord
// began writing that index. Empty string when neither can answer — the caller
// then has nothing to detach from, which is a fact, not an error.
export async function engagementIdFor(
  studioId: string, type: string, recId: string, lineage: EngagementLineage,
): Promise<string> {
  return (await engagementOf(studioId, type, recId)) || engagementIdForLineage(lineage);
}

// WHICH DEAL A PROJECT'S CHILD JOINS — the project's, read from the reverse
// index and from nowhere else.
//
// Deliberately NOT a second derivation off the ticket/quotation lineage. The
// child rows here (an invoice, a sheet, a purchase order, a delivery note, a
// waybill, an overtime line) carry a projectId and nothing more, while
// openProject already resolved "the ticket's engagement, else the quotation's
// own" through engagementIdForLineage and recorded the answer when it attached.
// Asking rec-eng returns that same id by construction; a lineage derivation
// repeated here could differ by a hair — an internal quotation's own engagement
// versus its (absent) ticket's — and would attach the child to an engagement
// nothing else uses, which reads exactly like a lost record.
//
// "" IS A REAL ANSWER, not an error: a record raised with no project, or one
// raised against a project opened before the dual-writes landed, has no deal to
// join. It is NOT parked in __unassigned — that bucket is a promotion holding
// pen for a record waiting to be moved into a real engagement, not a home for
// one that never had a deal behind it. The backfill reconciles the second case,
// and running it is a decision of its own.
export async function projectEngagementId(studioId: string, projectId: string): Promise<string> {
  if (!projectId) return "";
  return (await engagementOf(studioId, "project", projectId)) || "";
}

// ATTACH A PROJECT'S CHILD TO THE PROJECT'S DEAL. Never throws.
//
// The guard lives HERE rather than at each call site, which is the one place
// this helper departs from attachToTicketEngagement's shape. Six create verbs
// across four modules owe the identical two lines, and a guard that has to be
// remembered six times is a guard that will be forgotten once — the forgotten
// one turns a raised invoice into a 500 because a ZADD failed. A create that
// succeeded must keep succeeding; a swallowed attach is healed by the backfill,
// which is the reconciler.
//
// `recIds` accepts an array because ONE action can write several rows (a crew's
// evening is one overtime form and one row per person): the engagement is
// resolved once and every row joins the same set, rather than re-reading the
// same reverse-index key per row.
export async function attachToProjectEngagement(
  studioId: string, type: string, recIds: string | string[], projectId: string, createdAt?: string,
): Promise<string> {
  const ids = (Array.isArray(recIds) ? recIds : [recIds]).filter(Boolean);
  if (!ids.length) return "";
  try {
    const engId = await projectEngagementId(studioId, projectId);
    if (!engId) return "";
    for (const recId of ids) await attachRecord(studioId, engId, type, recId, createdAt);
    return engId;
  } catch { return ""; }   // best-effort: reconciled later
}

// THE MIRROR, AND IT IS A STEP OF ITS OWN. Never throws, for the same reason.
//
// Called BEFORE the row is removed: a crash between the two leaves a row with no
// engagement state, which the backfill heals, rather than engagement state
// pointing at a record that no longer exists, which nothing heals.
//
// It takes no lineage because a project's child has none of its own — the
// reverse index attachRecord wrote is the only record of which deal it joined,
// so a record that never attached detaches from nothing, which is a fact rather
// than a failure.
export async function detachFromItsEngagement(
  studioId: string, type: string, recId: string,
): Promise<string> {
  if (!recId) return "";
  try {
    const engId = await engagementOf(studioId, type, recId);
    if (engId) await detachRecord(studioId, engId, type, recId);
    return engId || "";
  } catch { return ""; }   // best-effort: reconciled later
}

// LOCK OR UNLOCK A DEAL. A compare-and-set on the root (Inv. 8), never a blind
// overwrite, and false when there is no root to lock — "this engagement does
// not exist" is a real answer, not an error worth throwing.
export async function setEngagementLock(
  studioId: string, engId: string, locked: boolean,
): Promise<boolean> {
  return editJSON<Engagement, boolean>(ENG.root(studioId, engId), (eng) => {
    if (!eng) return { result: false };
    return { next: { ...eng, locked, updatedAt: nowISO() }, result: true };
  });
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
  // The reverse index moves WITH the member. attachRecord writes it, so leaving
  // it here would make a promoted record still answer "__unassigned" to
  // engagementOf — and a later delete would then detach it from the bucket it
  // no longer belongs to while its real engagement kept the phantom.
  await setJSON(ENG.recEng(studioId, type, recId), toEngId);
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
  // The one place a root becomes listable. Every create path funnels through
  // applyDescriptor (ticket dual-write, internal quotation, the backfill), so
  // this single line indexes them all; ZADD per id keeps a re-run idempotent.
  await zAdd(ENG.index(studioId), Date.parse(String(d.context.createdAt || "")) || Date.now(), d.engId);
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
): Promise<{ ref: string; locked: boolean; context: Record<string, unknown>; singletons: Record<string, string | null>; members: Record<string, string[]> } | null> {
  const root = await readEngagement(studioId, engId);
  if (!root) return null;
  const members: Record<string, string[]> = {};
  // EVERY "many" stage the registry declares, DERIVED rather than listed. A
  // hand-copied array here once silently dropped bill and asset — added to
  // STAGE_REGISTRY but never to this list, so their member sets were read as
  // permanently empty. That is a worse failure here than a typical missed
  // case: the engagements view has no way to tell "this stage does not exist"
  // apart from "this stage was withheld by permission" (spec's safety
  // property) — both read as absent from the payload — so a stage the read
  // layer simply forgot is indistinguishable from one correctly denied.
  // Deriving from STAGE_REGISTRY means a thirteenth "many" type is covered
  // the moment it is registered, the same way attachRecord and ENG.members
  // already are.
  const manyTypes = Object.values(STAGE_REGISTRY)
    .filter((e) => e.cardinality === "many")
    .map((e) => e.type);
  for (const type of manyTypes) {
    const ids = await zRange(ENG.members(studioId, engId, type), 0, -1);
    if (ids.length) members[type] = ids;
  }
  // `ref` lives on the root, never inside `context` — returned alongside it
  // (additive, existing fields unchanged) so a caller like listEngagements
  // does not have to re-read the root just for the one field it already has
  // in hand here.
  // `locked` rides alongside `ref` for the same reason `ref` does: the caller
  // already has the root in hand here, and a screen that has to re-read it just
  // to decide whether to draw an Unlock button is a hop nobody chose to spend.
  return { ref: root.ref, locked: isEngagementLocked(root), context: root.context, singletons: root.singletons, members };
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

// A PROJECT RAISED DIRECTLY mints its OWN engagement — the backfill's
// orphan-project path, reused so a live direct project and a backfilled one
// match byte-for-byte. Same shape as attachQuotationEngagement one stage up,
// and for the same reason: two implementations of one clustering is how the
// live path and the reconciler come to disagree about which deal a record is on.
export async function attachProjectEngagement(
  studioId: string, project: Record<string, unknown>, client: Record<string, unknown> | null,
): Promise<string> {
  const [descriptor] = buildEngagements({
    projects: [project], salesClients: client ? [client] : [],
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

// ---- P2: identity, aliases and the shared facts -----------------------------

/**
 * RESOLVE ANY ID TO THE ONE TRUE DEAL ID (§2.2, Law 3).
 *
 * A deal's identity is minted once by the record that opened it and never
 * moves. But this codebase also DERIVES ids from a record's lineage
 * (`engagementIdForLineage`), and those derived ids are in the wild. When a
 * "more important" record arrives late — a sales ticket raised after the
 * project it belongs to — the derived id changes while the deal must not.
 *
 * So a derived id is a lookup helper: it resolves HERE, to the deal that
 * actually exists, rather than re-rooting anything. That is the whole
 * difference between an alias table and a migration.
 *
 * Returns the input unchanged when no alias exists, so a caller holding a real
 * deal id pays one read and gets it back.
 */
export async function resolveDealId(studioId: string, anyId: string): Promise<string> {
  if (!studioId || !anyId) return "";
  const mapped = await getJSON<string>(ENG.alias(studioId, anyId));
  return typeof mapped === "string" && mapped ? mapped : anyId;
}

/**
 * Point a derived id at the deal it should resolve to.
 *
 * REFUSES TO REPOINT AN EXISTING ALIAS at a different deal, and that refusal is
 * the safety property. An alias silently changing target means every record
 * that resolved through it yesterday belongs to a different deal today, with no
 * event anywhere recording that it moved. Repointing is a merge, and a merge is
 * a deliberate operation with its own rules — not something a late-arriving
 * record does as a side effect.
 */
export async function setDealAlias(studioId: string, aliasId: string, dealId: string): Promise<void> {
  if (!studioId || !aliasId || !dealId || aliasId === dealId) return;
  const existing = await getJSON<string>(ENG.alias(studioId, aliasId));
  if (typeof existing === "string" && existing && existing !== dealId) {
    throw new Error(
      `engagement: alias "${aliasId}" already resolves to "${existing}" and cannot be repointed to ` +
        `"${dealId}". Identity is minted once (Law 3); moving a deal's records is a merge, not an alias edit.`,
    );
  }
  await setJSON(ENG.alias(studioId, aliasId), dealId);
}

/**
 * APPLY ONE STAGE'S CONTRIBUTION TO A DEAL'S SHARED FACTS (Law 4).
 *
 * The rule itself is pure and lives in platform/engagement/context.ts; this is
 * the part that reads, applies and writes. It returns what changed and what was
 * REFUSED, because the caller is what audits an overwrite and what surfaces a
 * disagreement — neither of which this function should decide for it.
 *
 * Compare-and-set through editJSON (invariant 8): two stages contributing at
 * once must not have one silently discard the other's facts, and a blind
 * whole-root write is exactly how that happens.
 */
export async function contributeContext(
  studioId: string,
  engId: string,
  proposed: Partial<DealContext>,
  source: ContextSource,
): Promise<ContributionResult | null> {
  const dealId = await resolveDealId(studioId, engId);
  let outcome: ContributionResult | null = null;

  await editJSON<Engagement, void>(ENG.root(studioId, dealId), (current) => {
    if (!current) return { value: current, result: undefined };
    const context = { ...emptyContext(), ...(current.context as Partial<DealContext>) };
    const provenance = (current.provenance || {}) as ContextProvenance;
    const applied = contribute(context, provenance, proposed, source);
    outcome = applied;
    if (!applied.changes.length) return { value: current, result: undefined };
    return {
      value: {
        ...current,
        context: applied.context as unknown as Record<string, unknown>,
        provenance: applied.provenance,
        updatedAt: new Date().toISOString(),
      },
      result: undefined,
    };
  });

  return outcome;
}
