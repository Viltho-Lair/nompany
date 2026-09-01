// THE DELETE PATH OF THE ENGAGEMENT LAYER.
//
// Every block names the defect it guards. The one this file was written for is
// first: a record was removed from its collection and its engagement state was
// left standing, so the engagements card kept claiming a stage that no longer
// had a row behind it.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ENG, KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import { getJSON, zRange, sMembers } from "../src/platform/db/store.ts";
import { cascadeDeleteEngagement } from "../src/platform/db/cascade.ts";
import {
  attachTicketEngagement, attachToTicketEngagement, attachQuotationEngagement,
  attachRecord, createEngagement, setApprovedQuotation,
  detachRecord, readEngagement, readEngagementView,
  engagementOf, engagementIdForLineage,
  isEngagementLocked, setEngagementLock,
} from "../src/platform/db/engagement.ts";
import { STAGE_REGISTRY } from "../src/platform/engagement/registry.ts";
import { engagementBlock, deletionImpact, engagementImpact } from "../src/modules/main/engagements.ts";

assert.ok(KEY_PREFIX, "engagement-delete tests must run under a key prefix");

const sid = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
// A reader who can see the whole spine. engagementBlock takes the resolved
// permission set directly (it is not a section, so there is no module context).
const FULL = new Set([
  "engagements.view", "crmSales.tickets.view", "engineeringDocs.rfq.view",
  "crmSales.quotations.view", "projects.list.view",
]);
const cardOf = (block, type) => (block.engagement?.cards || []).find((c) => c.type === type);
const FULL_PLUS_TASKS = new Set([...FULL, "tasks.board.view"]);

// THE REGRESSION THIS WHOLE PATH EXISTS TO CLOSE.
//
// removeQuotation deleted the row and nothing else, so the quotation stayed in
// its engagement's member ZSET. engagementBlock takes `present`/`count` straight
// off that ZSET while `summarise` resolves the ids against the real collection,
// so the card rendered "Quotation · present · 1" with a BLANK reference — a
// phantom stage claiming a record that no longer existed.
export async function testNoPhantomStageAfterDelete() {
  const s = sid();
  const engId = await attachTicketEngagement(
    s, { id: "tk_1", clientId: "c1", clientName: "Acme", ref: "ACME-001" }, { id: "c1", name: "Acme" },
  );
  await attachToTicketEngagement(s, "quotation", "quo_1", "tk_1");
  await setApprovedQuotation(s, engId, "quo_1");

  const ctx = { studio: { id: s }, access: FULL };
  const before = await engagementBlock(ctx, engId);
  assert.equal(cardOf(before, "quotation")?.present, true, "fixture: the stage is present to begin with");
  assert.equal(cardOf(before, "quotation")?.count, 1);

  await detachRecord(s, engId, "quotation", "quo_1");

  const after = await engagementBlock(ctx, engId);
  const card = cardOf(after, "quotation");
  assert.equal(card?.present, false, "the deleted quotation's stage is ABSENT, not present-with-a-blank-ref");
  assert.equal(card?.count, 0, "and it counts nothing");
  // The ticket stage is untouched — only the deleted record's stage moved.
  assert.equal(cardOf(after, "ticket")?.present, true, "the rest of the deal is left alone");
}

// A quotation may be a "many" member AND the root's approvedQuotation. Clearing
// only by type would leave the root pointing at a deleted row.
export async function testDetachClearsTheApprovedQuotationSlot() {
  const s = sid();
  const engId = await attachTicketEngagement(
    s, { id: "tk_2", clientName: "Acme", ref: "ACME-002" }, null,
  );
  await attachToTicketEngagement(s, "quotation", "quo_2", "tk_2");
  await setApprovedQuotation(s, engId, "quo_2");
  assert.equal((await readEngagement(s, engId)).singletons.approvedQuotation, "quo_2", "fixture");

  await detachRecord(s, engId, "quotation", "quo_2");
  const root = await readEngagement(s, engId);
  assert.equal(root.singletons.approvedQuotation, null, "the approved-quotation pointer goes with the record");
  assert.deepEqual((await readEngagementView(s, engId)).members.quotation, undefined, "and so does the membership");
}

// The project singleton. Same rule from the other side: the slot named by the
// type, cleared only while it still holds THIS record.
export async function testDetachClearsTheProjectSingleton() {
  const s = sid();
  const engId = await attachTicketEngagement(s, { id: "tk_3", ref: "ACME-003" }, null);
  await attachRecord(s, engId, "project", "prj_3");
  assert.equal((await readEngagement(s, engId)).singletons.project, "prj_3", "fixture");

  await detachRecord(s, engId, "project", "prj_3");
  assert.equal((await readEngagement(s, engId)).singletons.project, null, "the project singleton is cleared");
}

// DETACH IS THE EXACT INVERSE OF ATTACH. attachRecord writes four things —
// membership, the department index, has-stage and the reverse index — and detach
// used to undo two of them. Each half asserted separately, so a regression names
// which index came back.
export async function testDetachIsTheInverseOfAttach() {
  const s = sid();
  const eng = await createEngagement(s, {});
  await attachRecord(s, eng.id, "invoice", "inv_1", "2026-01-01T00:00:00Z");

  assert.deepEqual(await zRange(ENG.dept(s, "invoice"), 0, -1), ["inv_1"], "fixture: dept index written");
  assert.ok((await sMembers(ENG.hasStage(s, "invoice"))).includes(eng.id), "fixture: has-stage written");
  assert.equal(await engagementOf(s, "invoice", "inv_1"), eng.id, "fixture: the reverse index is written on ATTACH now");

  await detachRecord(s, eng.id, "invoice", "inv_1");

  assert.deepEqual(await readEngagementView(s, eng.id),
    { ref: "", locked: true, context: {}, singletons: { ticket: null, approvedQuotation: null, project: null }, members: {} },
    "membership gone");
  assert.deepEqual(await zRange(ENG.dept(s, "invoice"), 0, -1), [], "department index cleared");
  assert.equal(await engagementOf(s, "invoice", "inv_1"), null, "reverse index cleared");
  assert.equal(await getJSON(ENG.recEng(s, "invoice", "inv_1")), null, "...and the key itself is gone, not blanked");
}

// HAS-STAGE GOES WHEN THE LAST RECORD OF A TYPE GOES — AND NOT BEFORE.
// "Which engagements have a project / a quotation" is the one question this
// index is asked; leaving an engagement in it after its last record of that type
// was deleted is the same phantom as a stage card with a blank ref.
export async function testHasStageTracksTheLastRecordOfAType() {
  const s = sid();
  const eng = await createEngagement(s, {});
  await attachRecord(s, eng.id, "invoice", "inv_a");
  await attachRecord(s, eng.id, "invoice", "inv_b");

  await detachRecord(s, eng.id, "invoice", "inv_a");
  assert.ok((await sMembers(ENG.hasStage(s, "invoice"))).includes(eng.id),
    "one invoice still on the deal — the stage stays");

  await detachRecord(s, eng.id, "invoice", "inv_b");
  assert.ok(!(await sMembers(ENG.hasStage(s, "invoice"))).includes(eng.id),
    "the last invoice left — the engagement leaves the has-stage index");

  // The singleton half of the same rule.
  await attachRecord(s, eng.id, "project", "prj_a");
  assert.ok((await sMembers(ENG.hasStage(s, "project"))).includes(eng.id), "fixture");
  await detachRecord(s, eng.id, "project", "prj_a");
  assert.ok(!(await sMembers(ENG.hasStage(s, "project"))).includes(eng.id),
    "a cleared singleton leaves the has-stage index too");
}

// INVARIANT 11: a crashed cascade must be idempotent on re-run. Detaching
// something already detached is a no-op, never a throw — including against an
// engagement root that does not exist at all.
export async function testDetachIsIdempotent() {
  const s = sid();
  const engId = await attachTicketEngagement(s, { id: "tk_4", ref: "ACME-004" }, null);
  await attachToTicketEngagement(s, "quotation", "quo_4", "tk_4");
  await setApprovedQuotation(s, engId, "quo_4");

  await detachRecord(s, engId, "quotation", "quo_4");
  const once = await readEngagementView(s, engId);
  await detachRecord(s, engId, "quotation", "quo_4");
  const twice = await readEngagementView(s, engId);
  assert.deepEqual(twice, once, "a second detach changes nothing");

  // And against a root nothing ever created (the crash-before-attach shape).
  await detachRecord(s, deterministicEngId("ticket", "tk_never"), "quotation", "quo_never");
}

// A DETACH RACING A RE-ATTACH MUST NOT CLOBBER THE NEWER CLAIM. Both the root
// slot and the reverse index compare before they write, for this case.
export async function testDetachNeverClobbersANewerClaim() {
  const s = sid();
  const eng = await createEngagement(s, {});
  await attachRecord(s, eng.id, "project", "prj_old");
  await detachRecord(s, eng.id, "project", "prj_old");
  await attachRecord(s, eng.id, "project", "prj_new");

  // The late detach of the OLD record arrives after the new one claimed the slot.
  await detachRecord(s, eng.id, "project", "prj_old");
  assert.equal((await readEngagement(s, eng.id)).singletons.project, "prj_new",
    "the newer claim survives a late detach of the record it replaced");
  assert.equal(await engagementOf(s, "project", "prj_new"), eng.id,
    "and so does the newer reverse-index pointer");
}

// ONE DERIVATION, SHARED WITH THE CREATE PATH. openProject resolves the same
// rule through this function now: a delete that derived it even slightly
// differently would detach from an engagement nobody ever attached to and
// still report success.
export function testLineageDerivationMatchesTheCreatePath() {
  assert.equal(engagementIdForLineage({ ticketId: "tk_1", quotationId: "quo_1" }),
    deterministicEngId("ticket", "tk_1"), "a ticket behind it → the ticket's engagement");
  assert.equal(engagementIdForLineage({ ticketId: "", quotationId: "quo_1" }),
    deterministicEngId("quotation", "quo_1"), "internal → the quotation's own");
  assert.equal(engagementIdForLineage({}), "", "no lineage → nothing to detach from, not a guessed id");
}

// THE "DELETING THIS AFFECTS X, Y, Z" ANSWER, AND ITS SAFETY PROPERTY: it may
// never name a record the caller could not already see on that record's own
// department screen.
export async function testDeletionImpactNamesOnlyWhatTheReaderMaySee() {
  const s = sid();
  const engId = await attachTicketEngagement(
    s, { id: "tk_5", clientName: "Acme", ref: "ACME-005" }, null,
  );
  await attachToTicketEngagement(s, "quotation", "quo_5", "tk_5");
  await attachToTicketEngagement(s, "rfq", "rfq_5", "tk_5");
  await attachRecord(s, engId, "project", "prj_5");
  await setApprovedQuotation(s, engId, "quo_5");

  const full = await deletionImpact(
    { studio: { id: s }, access: FULL }, "quotation", { id: "quo_5", ticketId: "tk_5" },
  );
  assert.equal(full.impact?.engagementId, engId, "the deal is named");
  assert.equal(full.impact?.ref, "ACME-005");
  assert.deepEqual(full.impact?.clears, ["approvedQuotation"], "the root pointer that would be cleared");
  assert.equal(full.impact?.lastOfType, true, "it is the deal's only quotation");
  const types = (full.impact?.siblings || []).map((x) => x.type).sort();
  assert.deepEqual(types, ["project", "rfq", "ticket"], "and what else is on the deal");

  // A Technical-only reader holds no Sales and no Projects right. Those stages
  // must be ABSENT from the answer — not zeroed, not counted, not named.
  const technicalOnly = new Set(["crmSales.quotations.view"]);
  const narrow = await deletionImpact(
    { studio: { id: s }, access: technicalOnly }, "quotation", { id: "quo_5", ticketId: "tk_5" },
  );
  const narrowTypes = (narrow.impact?.siblings || []).map((x) => x.type);
  assert.ok(!narrowTypes.includes("ticket"), "no sales right, no ticket named");
  assert.ok(!narrowTypes.includes("project"), "no projects right, no project named");
  assert.ok(!narrowTypes.includes("rfq"), "no rfq right, no rfq named");

  // And the record's OWN type is gated: you cannot ask what deleting a
  // quotation affects without the right to see quotations.
  const noRight = await deletionImpact(
    { studio: { id: s }, access: new Set(["engagements.view"]) }, "quotation", { id: "quo_5", ticketId: "tk_5" },
  );
  assert.equal(noRight.error, "forbidden", "asking about a record you cannot see is refused");
  assert.equal(noRight.impact, undefined, "and refused with no payload at all");

  // A Tier B/C record (a client, a vendor) is not a stage: no engagement state,
  // so nothing to warn about — a fact, not a refusal.
  const notAStage = await deletionImpact(
    { studio: { id: s }, access: FULL }, "client", { id: "c1" },
  );
  assert.equal(notAStage.impact, null, "a non-stage record has no engagement impact");
}

// An internal quotation's engagement resolves through the reverse index the
// backfill and the create path both write — no ticket to derive from.
export async function testInternalQuotationDetaches() {
  const s = sid();
  const engId = await attachQuotationEngagement(
    s, { id: "quo_i", clientName: "Acme", number: "Q-9" }, null,
  );
  assert.equal(await engagementOf(s, "quotation", "quo_i"), engId, "fixture: applyDescriptor wrote the reverse index");
  await detachRecord(s, engId, "quotation", "quo_i");
  assert.deepEqual((await readEngagementView(s, engId)).members.quotation, undefined, "membership gone");
  assert.equal(await engagementOf(s, "quotation", "quo_i"), null, "reverse index gone");
}


// ---- deleting a whole deal --------------------------------------------------

// LOCKED UNLESS SOMEBODY SAID OTHERWISE. Every engagement already in Redis was
// written before this field existed, so "absent" has to mean locked or the
// feature would ship by unlocking every deal on live at once. No migration, no
// write to live data — the default IS the migration.
export async function testLockDefaultsToLocked() {
  assert.equal(isEngagementLocked({ id: "e", singletons: {} }), true, "absent → locked");
  assert.equal(isEngagementLocked({ id: "e", locked: undefined }), true, "undefined → locked");
  assert.equal(isEngagementLocked(null), true, "no root at all → locked");
  assert.equal(isEngagementLocked({ id: "e", locked: true }), true);
  assert.equal(isEngagementLocked({ id: "e", locked: false }), false, "only an explicit false opens the door");

  // And through the store, on a root written the way every live one was.
  const s = sid();
  const engId = await attachTicketEngagement(s, { id: "tk_l", ref: "LOCK-001" }, null);
  assert.equal((await readEngagementView(s, engId)).locked, true,
    "a root written with no `locked` field reads as locked");
  await setEngagementLock(s, engId, false);
  assert.equal((await readEngagementView(s, engId)).locked, false, "unlock is an explicit act");
}

// A LOCKED DEAL REFUSES DELETION, and the refusal lives in the store function
// rather than only in the route — an interlock guarded in one caller is an
// interlock until somebody writes the second caller.
export async function testLockedEngagementRefusesDeletion() {
  const s = sid();
  const engId = await attachTicketEngagement(s, { id: "tk_lk", ref: "LOCK-002" }, null);

  const refused = await cascadeDeleteEngagement(s, engId);
  assert.equal(refused.error, "locked", "locked by default, so the cascade refuses");
  assert.ok(await readEngagement(s, engId), "and the root is untouched");

  await setEngagementLock(s, engId, false);
  const done = await cascadeDeleteEngagement(s, engId);
  assert.ok(done.ok, `unlocked, so it goes: ${JSON.stringify(done)}`);
  assert.equal(await readEngagement(s, engId), null, "the root is gone");
}

// RE-RUNNING IS A CLEAN NO-OP (invariant 11). The root goes LAST, so its absence
// means the cascade already finished; a second run has nothing to finish and
// says so instead of throwing.
export async function testDeleteEngagementIsIdempotent() {
  const s = sid();
  const engId = await attachTicketEngagement(s, { id: "tk_id", ref: "IDEM-001" }, null);
  await setEngagementLock(s, engId, false);
  assert.ok((await cascadeDeleteEngagement(s, engId)).ok);
  const again = await cascadeDeleteEngagement(s, engId);
  assert.equal(again.error, "notfound", "a re-run is a clean notfound, not a throw");
  assert.deepEqual(await zRange(ENG.index(s), 0, -1), [], "and the deal is out of the index");
}

// EVERY STAGE TYPE HAS DECLARED WHAT HAPPENS TO IT. This is the assertion that
// makes adding a thirteenth stage safe: a new entry with no `onDelete` is
// either silently destroyed or silently stranded, and neither shows up until
// somebody deletes a deal in production.
export function testEveryStageDeclaresItsDisposition() {
  for (const e of Object.values(STAGE_REGISTRY)) {
    assert.ok(e.onDelete === "cascade" || e.onDelete === "keep",
      `${e.type} must declare onDelete`);
  }
  // WHAT SURVIVES A DELETE, PINNED BY NAME. Updated deliberately when P2 added
  // `payment`, which is the interesting one and the reason this guard exists.
  //
  // The other four survive because each can exist with NO DEAL AT ALL, so its
  // presence on one does not prove that deal created it. A payment is different:
  // it cannot be created without a deal — it settles a particular deal's invoice
  // — and it still survives, because Law 6 says money that moved in the world is
  // DETACHED when its deal is deleted, never destroyed. An append-only money
  // rule that erased a recorded payment because somebody removed the deal would
  // be no rule at all.
  //
  // So "can stand alone" and "survives a delete" are two different properties,
  // and payment is the type that separates them. It shipped as `cascade` first;
  // the blueprint's vocabulary table is what caught it.
  const kept = Object.values(STAGE_REGISTRY).filter((e) => e.onDelete === "keep").map((e) => e.type).sort();
  assert.deepEqual(kept, ["asset", "bill", "expense", "payment", "task"],
    "changing this list changes what a delete destroys — say so deliberately");

  // The four that can be CREATED with no deal, which is the other property and
  // is what the unassigned pen holds. Pinned separately so a future change to
  // one cannot quietly move the other.
  const standalone = Object.values(STAGE_REGISTRY).filter((e) => e.unassignable).map((e) => e.type).sort();
  assert.deepEqual(standalone, ["asset", "bill", "expense", "task"],
    "these are what the unassigned pen can hold — a payment cannot exist without a deal");
}

// ============================================================================
// THE USER'S OWN RULE, AND THE ONE WITH REAL CONSEQUENCES: "everything that is
// linked to it will be deleted EXCEPT IF THE INFORMATION IS CREATED ELSE WHERE."
//
// The Sales CLIENT is the case that matters. `context.clientId` POINTS AT a
// client; it does not own one. Deleting a deal must never take the client row
// with it — other deals reference the same row, and the client existed before
// this deal and outlives it.
//
// Asserted here against the engagement layer's own primitives; the same rule is
// proven end to end through the real routes and a real client row in
// tests/suite.mjs. Both, because this is a destructive path and the cheap test
// is the one that will still be run when somebody is in a hurry.
export async function testDeletingADealDoesNotDeleteItsClient() {
  const s = sid();
  const client = { id: "cli_1", name: "Acme Holdings" };
  const engId = await attachTicketEngagement(
    s, { id: "tk_c", clientId: client.id, clientName: client.name, ref: "CLIENT-001" }, client,
  );
  await setEngagementLock(s, engId, false);

  const root = await readEngagement(s, engId);
  assert.equal(root.context.clientId, client.id, "fixture: the deal names the client");

  const done = await cascadeDeleteEngagement(s, engId);
  assert.ok(done.ok, JSON.stringify(done));
  // The client is not a STAGE — it is not in the registry at all — so it can
  // never appear in what a cascade walked. That is the structural guarantee,
  // stated as an assertion so a future "clients as a stage" idea has to face it.
  assert.ok(!STAGE_REGISTRY.client, "a client is a Tier B shared reference, not a stage");
  assert.ok(!done.deleted.some((d) => d.id === client.id), "the client is not among the deleted");
  assert.ok(!done.deleted.some((d) => d.type === "client"), "and no client-typed record is either");
}

// THE SAME RULE FROM THE ANGLE THAT ACTUALLY BREAKS: one client, two deals.
// Deleting either must leave the other deal and the shared client alone.
export async function testASharedClientSurvivesEitherDeal() {
  const s = sid();
  const client = { id: "cli_2", name: "Shared Co" };
  const first = await attachTicketEngagement(
    s, { id: "tk_s1", clientId: client.id, clientName: client.name, ref: "SHARED-001" }, client);
  const second = await attachTicketEngagement(
    s, { id: "tk_s2", clientId: client.id, clientName: client.name, ref: "SHARED-002" }, client);
  assert.notEqual(first, second, "fixture: two distinct deals");

  await setEngagementLock(s, first, false);
  assert.ok((await cascadeDeleteEngagement(s, first)).ok);

  const survivor = await readEngagement(s, second);
  assert.ok(survivor, "the other deal is untouched");
  assert.equal(survivor.context.clientId, client.id, "and still points at the same client row");
  assert.deepEqual(await zRange(ENG.index(s), 0, -1), [second], "only the deleted deal left the index");
}

// A KEPT RECORD IS DETACHED, NOT DELETED. A task or a bill stops pointing at a
// root that no longer exists — the alternative is a record whose engagementId
// names nothing, which is the mirror of the phantom this branch exists to remove.
export async function testKeptRecordsAreDetachedNotDeleted() {
  const s = sid();
  const engId = await attachTicketEngagement(s, { id: "tk_k", ref: "KEEP-001" }, null);
  await attachRecord(s, engId, "task", "task_1");
  await attachRecord(s, engId, "bill", "bill_1");
  await setEngagementLock(s, engId, false);

  const done = await cascadeDeleteEngagement(s, engId);
  assert.ok(done.ok, JSON.stringify(done));
  const keptIds = done.kept.map((k) => k.id).sort();
  assert.deepEqual(keptIds, ["bill_1", "task_1"], "both survive the deal");
  assert.equal(await engagementOf(s, "task", "task_1"), null,
    "but each stops pointing at the deleted deal");
  assert.equal(await engagementOf(s, "bill", "bill_1"), null);
  assert.ok(!(await sMembers(ENG.hasStage(s, "task"))).includes(engId),
    "and the deal leaves every has-stage index it was in");
}

// THE WHOLE-DEAL "this will delete X and leave Y" ANSWER, with the same
// permission filter the engagements view uses.
export async function testEngagementImpactSplitsDeletedFromSurviving() {
  const s = sid();
  const engId = await attachTicketEngagement(s, { id: "tk_i", ref: "IMPACT-001" }, null);
  await attachToTicketEngagement(s, "quotation", "quo_i2", "tk_i");
  await attachRecord(s, engId, "task", "task_i");

  const full = await engagementImpact({ studio: { id: s }, access: FULL_PLUS_TASKS }, engId);
  const deletes = (full.impact?.deletes || []).map((x) => x.type).sort();
  const survives = (full.impact?.survives || []).map((x) => x.type).sort();
  assert.deepEqual(deletes, ["quotation", "ticket"], "the deal's own records go");
  assert.deepEqual(survives, ["task"], "the task was created elsewhere and stays");
  assert.equal(full.impact?.locked, true, "and the answer says whether the safety is on");

  // The safety property, again: a reader with no Tasks right is never told a
  // task exists on this deal — not as a survivor, not as a count.
  const noTasks = await engagementImpact(
    { studio: { id: s }, access: new Set(["engagements.view", "crmSales.tickets.view"]) }, engId);
  assert.deepEqual((noTasks.impact?.survives || []).map((x) => x.type), [],
    "no tasks right, no task named");
  assert.deepEqual((noTasks.impact?.deletes || []).map((x) => x.type), ["ticket"],
    "and only the stages they may see are counted");

  const blind = await engagementImpact({ studio: { id: s }, access: new Set([]) }, engId);
  assert.equal(blind.error, "forbidden", "and engagements.view is still the door");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [
      testNoPhantomStageAfterDelete, testDetachClearsTheApprovedQuotationSlot,
      testDetachClearsTheProjectSingleton, testDetachIsTheInverseOfAttach,
      testHasStageTracksTheLastRecordOfAType, testDetachIsIdempotent,
      testDetachNeverClobbersANewerClaim, testLineageDerivationMatchesTheCreatePath,
      testDeletionImpactNamesOnlyWhatTheReaderMaySee, testInternalQuotationDetaches,
      testLockDefaultsToLocked, testLockedEngagementRefusesDeletion,
      testDeleteEngagementIsIdempotent, testEveryStageDeclaresItsDisposition,
      testDeletingADealDoesNotDeleteItsClient, testASharedClientSurvivesEitherDeal,
      testKeptRecordsAreDetachedNotDeleted, testEngagementImpactSplitsDeletedFromSurviving,
    ]) { await t(); console.log(`ok ${t.name}`); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
