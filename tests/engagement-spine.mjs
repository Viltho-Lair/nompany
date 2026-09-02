import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import {
  readEngagementView, attachTicketEngagement,
  attachToTicketEngagement, attachQuotationEngagement, setApprovedQuotation,
  detachRecord, attachRecord, listMembers, createEngagement, setDealAlias,
  applyDescriptor, readEngagement,
} from "../src/platform/db/engagement.ts";
assert.ok(KEY_PREFIX, "must run under a key prefix");

export async function testSpineHelpers() {
  const sid = `s_${Date.now().toString(36)}`;
  // Seed the ticket's engagement root via attachTicketEngagement (Phase 1b-i) —
  // it derives the SAME deterministic id the backfill would, so this is the
  // live create path, not createEngagement's random id.
  const ticketEng = await attachTicketEngagement(
    sid, { id: "tk_1", clientId: "c1", clientName: "Acme", ref: "ACME-001" }, { id: "c1", name: "Acme" },
  );
  assert.equal(ticketEng, deterministicEngId("ticket", "tk_1"));

  // attach an rfq and a converted quotation to the ticket's engagement
  await attachToTicketEngagement(sid, "rfq", "rfq_1", "tk_1");
  await attachToTicketEngagement(sid, "quotation", "quo_1", "tk_1");
  await setApprovedQuotation(sid, ticketEng, "quo_1");

  const view = await readEngagementView(sid, ticketEng);
  assert.deepEqual(view.members.rfq, ["rfq_1"]);
  assert.deepEqual(view.members.quotation, ["quo_1"]);
  assert.equal(view.singletons.approvedQuotation, "quo_1", "approved quotation recorded");

  // an internal (ticket-less) quotation mints its own engagement
  const engId = await attachQuotationEngagement(sid, { id: "quo_9", clientName: "Acme", number: "Q-9" }, null);
  assert.equal(engId, deterministicEngId("quotation", "quo_9"));
  const v2 = await readEngagementView(sid, engId);
  assert.deepEqual(v2.members.quotation, ["quo_9"]);
}

export async function testDetachResolvesThroughAlias() {
  const sid = `s_${Date.now().toString(36)}_da1`;

  // A minted deal with a derived id aliased onto it — the shape Task 3 creates.
  const deal = await createEngagement(sid, { ref: "ALIAS-DETACH" });
  const derived = deterministicEngId("ticket", "tk_detach");
  await setDealAlias(sid, derived, deal.id);

  await attachRecord(sid, derived, "rfq", "rfq_detach");
  assert.deepEqual(await listMembers(sid, deal.id, "rfq"), ["rfq_detach"],
    "attach already resolves, so the member lands on the minted deal");

  // THE BUG: detach given the same derived id must reach the same deal.
  await detachRecord(sid, derived, "rfq", "rfq_detach");
  assert.deepEqual(await listMembers(sid, deal.id, "rfq"), [],
    "detach through a derived id removes the member from the minted deal");
}

export async function testDescriptorFollowsTheAlias() {
  const sid = `s_${Date.now().toString(36)}_da2`;

  const deal = await createEngagement(sid, { ref: "ALIAS-DESC" });
  const derived = deterministicEngId("ticket", "tk_desc");
  await setDealAlias(sid, derived, deal.id);

  // What a backfill re-run hands over: a descriptor still keyed by derivation.
  await applyDescriptor(sid, {
    engId: derived,
    ref: "ALIAS-DESC",
    context: { createdAt: "2026-09-02T00:00:00.000Z" },
    singletons: { ticket: "tk_desc", approvedQuotation: null, project: null },
    members: { ticket: ["tk_desc"] },
  });

  assert.equal(await readEngagement(sid, derived), null,
    "no second root is written at the derived id");
  const root = await readEngagement(sid, deal.id);
  assert.ok(root, "the minted deal still exists");
  assert.equal(root.singletons.ticket, "tk_desc",
    "the descriptor landed on the deal the alias names");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [testSpineHelpers, testDetachResolvesThroughAlias, testDescriptorFollowsTheAlias]) {
      await t();
      console.log(`ok ${t.name}`);
    }
  })()
    .catch((e) => { console.error(e); process.exit(1); });
}
