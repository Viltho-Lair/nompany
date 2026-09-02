import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import {
  readEngagementView, attachTicketEngagement,
  attachToTicketEngagement, attachQuotationEngagement, setApprovedQuotation,
  detachRecord, attachRecord, listMembers, createEngagement, setDealAlias,
  applyDescriptor, readEngagement, resolveDealId,
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
  assert.notEqual(ticketEng, deterministicEngId("ticket", "tk_1"),
    "a deal opened now mints its own id rather than deriving one");
  assert.equal(await resolveDealId(sid, deterministicEngId("ticket", "tk_1")), ticketEng,
    "and the derived id resolves to it, so anything holding one lands on the deal");

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
  assert.notEqual(engId, deterministicEngId("quotation", "quo_9"),
    "an internal quotation mints its own id too");
  assert.equal(await resolveDealId(sid, deterministicEngId("quotation", "quo_9")), engId,
    "and its derivation resolves to it");
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

export async function testMintingIsIdempotentAndGrandfathers() {
  const sid = `s_${Date.now().toString(36)}_da3`;
  const ticket = { id: "tk_m", clientId: "c1", clientName: "Acme", ref: "ACME-M" };

  // TWICE IS ONCE. A retry, a re-entry and a reconcile pass all land on one deal.
  const first = await attachTicketEngagement(sid, ticket, { id: "c1", name: "Acme" });
  const second = await attachTicketEngagement(sid, ticket, { id: "c1", name: "Acme" });
  assert.equal(second, first, "a second create for the same chain returns the same deal");

  // A DEAL FROM BEFORE THIS CHANGE: a root sitting at its derived id, no alias.
  const sid2 = `s_${Date.now().toString(36)}_da4`;
  const legacy = { id: "tk_old", clientId: "c2", clientName: "Old", ref: "OLD-1" };
  const derived = deterministicEngId("ticket", "tk_old");
  await applyDescriptor(sid2, {
    engId: derived, ref: "OLD-1", context: { createdAt: "2026-08-01T00:00:00.000Z" },
    singletons: { ticket: "tk_old", approvedQuotation: null, project: null },
    members: { ticket: ["tk_old"] },
  });

  const again = await attachTicketEngagement(sid2, legacy, { id: "c2", name: "Old" });
  assert.equal(again, derived, "a deal that already exists keeps the derived id it has");
  assert.equal(await resolveDealId(sid2, derived), derived, "and no alias is written for it");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [
      testSpineHelpers, testDetachResolvesThroughAlias, testDescriptorFollowsTheAlias,
      testMintingIsIdempotentAndGrandfathers,
    ]) {
      await t();
      console.log(`ok ${t.name}`);
    }
  })()
    .catch((e) => { console.error(e); process.exit(1); });
}
