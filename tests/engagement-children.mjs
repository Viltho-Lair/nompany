// A PROJECT'S CHILDREN ARE IN THE DEAL.
//
// Every block names the defect it guards. The one this file was written for:
// invoice, sheet, order, delivery, shipment and overtime were all declared
// `onDelete: "cascade"` in STAGE_REGISTRY — the deal owns them — and not one of
// their create verbs ever called attachRecord. They were registry members in
// name only: deleting a deal left its invoices standing, and the engagement
// card under-reported the deal by every child ever raised on its project.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ENG, KEY_PREFIX, UNASSIGNED_ENG } from "../src/platform/db/keys.ts";
import { zRange, sMembers } from "../src/platform/db/store.ts";
import {
  attachTicketEngagement, attachRecord, attachToProjectEngagement,
  detachFromItsEngagement, projectEngagementId, engagementOf, readEngagementView,
} from "../src/platform/db/engagement.ts";

assert.ok(KEY_PREFIX, "engagement-children tests must run under a key prefix");

const sid = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

// A deal with a project on it — the shape every child in this file hangs off.
async function seedDealWithProject(s, { ticketId = "tk_c", projectId = "prj_c" } = {}) {
  const engId = await attachTicketEngagement(
    s, { id: ticketId, clientId: "c1", clientName: "Acme", ref: "ACME-C" }, { id: "c1", name: "Acme" },
  );
  await attachRecord(s, engId, "project", projectId);
  return engId;
}

// THE RESOLUTION, AND THERE IS ONLY ONE. A child carries a projectId and
// nothing else, so the project's reverse index is what says which deal it
// joins — never a second derivation off the ticket/quotation lineage, which
// could differ by a hair and attach the child to an engagement nothing uses.
export async function testAChildResolvesItsDealFromItsProject() {
  const s = sid();
  const engId = await seedDealWithProject(s);
  assert.equal(await projectEngagementId(s, "prj_c"), engId, "the project's reverse index is the answer");
  assert.equal(await projectEngagementId(s, ""), "", "no project, no deal — and no throw");
  assert.equal(await projectEngagementId(s, "prj_nobody_opened"), "", "an unknown project resolves to nothing");
}

// THE DEFECT ITSELF: an invoice raised on a project is IN the deal.
export async function testAChildRaisedOnAProjectJoinsTheDeal() {
  const s = sid();
  const engId = await seedDealWithProject(s);

  const got = await attachToProjectEngagement(s, "invoice", "inv_c", "prj_c", "2026-01-01T00:00:00Z");
  assert.equal(got, engId, "the attach reports the deal it joined");

  const view = await readEngagementView(s, engId);
  assert.deepEqual(view.members.invoice, ["inv_c"], "the invoice is a member of the deal");
  assert.equal(await engagementOf(s, "invoice", "inv_c"), engId, "and can answer which deal it is in");
  assert.deepEqual(await zRange(ENG.dept(s, "invoice"), 0, -1), ["inv_c"], "the department index is written");
  assert.ok((await sMembers(ENG.hasStage(s, "invoice"))).includes(engId), "and the deal has an invoice stage");
}

// ONE ACTION, SEVERAL ROWS. A crew's evening is one overtime form and one row
// per person; all of them join the same deal off ONE resolution rather than one
// read of the same reverse-index key per row (the hop-count constraint).
export async function testEveryRowOfOneActionJoinsTheSameDeal() {
  const s = sid();
  const engId = await seedDealWithProject(s);
  await attachToProjectEngagement(s, "overtime", ["ot_1", "ot_2", "ot_3"], "prj_c", "2026-01-01T00:00:00Z");
  const view = await readEngagementView(s, engId);
  assert.deepEqual([...(view.members.overtime || [])].sort(), ["ot_1", "ot_2", "ot_3"]);
}

// A RECORD WITH NO DEAL HAS NO DEAL, and that is a valid end state rather than
// an error or a thing to be swept up later. It is NOT parked in __unassigned:
// that bucket is a promotion holding pen for a record waiting to be moved into
// a real engagement, not a home for one that never had a deal behind it.
export async function testARecordWithNoProjectAttachesToNothingAndDoesNotThrow() {
  const s = sid();
  await seedDealWithProject(s);
  assert.equal(await attachToProjectEngagement(s, "invoice", "inv_loose", ""), "", "no project, no attach");
  assert.equal(await engagementOf(s, "invoice", "inv_loose"), null, "and no reverse index written");
  assert.deepEqual(
    await zRange(ENG.members(s, UNASSIGNED_ENG, "invoice"), 0, -1), [],
    "and it is NOT parked in __unassigned",
  );
}

// A SWALLOWED ATTACH NEVER FAILS THE CREATE. A create that succeeded must keep
// succeeding: the row is written, the engagement layer is best-effort, and the
// backfill is the reconciler. An unknown stage type is the cheapest way to make
// attachRecord throw for real rather than mocking the failure.
export async function testASwallowedAttachNeverFailsTheCreate() {
  const s = sid();
  await seedDealWithProject(s);
  assert.equal(
    await attachToProjectEngagement(s, "not-a-stage", "x_1", "prj_c"), "",
    "a failing attach reports nothing and throws nothing",
  );
}

// DETACH IS THE MIRROR, and it leaves the rest of the deal exactly as it was.
export async function testDetachingAChildLeavesTheRestOfTheDealIntact() {
  const s = sid();
  const engId = await seedDealWithProject(s);
  await attachToProjectEngagement(s, "invoice", "inv_a", "prj_c");
  await attachToProjectEngagement(s, "invoice", "inv_b", "prj_c");
  await attachToProjectEngagement(s, "sheet", "sh_a", "prj_c");

  assert.equal(await detachFromItsEngagement(s, "invoice", "inv_a"), engId, "detach reports the deal it left");

  const view = await readEngagementView(s, engId);
  assert.deepEqual(view.members.invoice, ["inv_b"], "the other invoice stays");
  assert.deepEqual(view.members.sheet, ["sh_a"], "and so does the sheet");
  assert.equal(view.singletons.project, "prj_c", "and the project singleton is untouched");
  assert.equal(await engagementOf(s, "invoice", "inv_a"), null, "the detached record's reverse index is gone");
  assert.ok(
    (await sMembers(ENG.hasStage(s, "invoice"))).includes(engId),
    "has-stage stays while a second invoice remains — it goes with the LAST one",
  );

  await detachFromItsEngagement(s, "invoice", "inv_b");
  assert.ok(
    !(await sMembers(ENG.hasStage(s, "invoice"))).includes(engId),
    "...and goes when the last invoice goes",
  );
}

// A RECORD THAT NEVER ATTACHED DETACHES FROM NOTHING. Every delete verb calls
// this unconditionally, and every row created before this increment shipped —
// like every row raised with no project — has no engagement state at all.
export async function testDetachingARecordThatNeverAttachedIsANoOp() {
  const s = sid();
  assert.equal(await detachFromItsEngagement(s, "invoice", "inv_never"), "", "nothing to leave, and no throw");
  assert.equal(await detachFromItsEngagement(s, "invoice", ""), "", "and an empty id is refused before any read");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [
      testAChildResolvesItsDealFromItsProject, testAChildRaisedOnAProjectJoinsTheDeal,
      testEveryRowOfOneActionJoinsTheSameDeal,
      testARecordWithNoProjectAttachesToNothingAndDoesNotThrow,
      testASwallowedAttachNeverFailsTheCreate,
      testDetachingAChildLeavesTheRestOfTheDealIntact,
      testDetachingARecordThatNeverAttachedIsANoOp,
    ]) { await t(); console.log(`ok ${t.name}`); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
