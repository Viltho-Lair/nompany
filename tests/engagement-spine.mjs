import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { KEY_PREFIX, ID, deterministicEngId } from "../src/platform/db/keys.ts";
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

// A SOURCE SCAN, not an exercise — the shape tests/auth-refusals.mjs already
// uses in this repo for a property that is a fact about the SHAPE of a
// function rather than about what it returns under a forced failure.
//
// Spec §7's last bullet asks for "a failed alias write fails the create.
// Assert the refusal surfaces rather than being swallowed." Mocking the store
// to make setDealAlias throw would prove only that a throw propagates through
// an ordinary async function — true of every function in this file, and proof
// of nothing about THIS one. What actually matters is READ off the source: has
// nobody wrapped the setDealAlias call in a try/catch that would swallow it,
// and does it still run BEFORE applyDescriptor (§3.2) rather than after. A
// mock cannot catch a later refactor that adds either of those; a scan of the
// text can, because the property under test is the text.
function applyAsDealSource() {
  // Line-based, matching functionBody's own technique in
  // tests/auth-refusals.mjs: find the function by its signature, take
  // everything up to the next top-level export. applyAsDeal is deliberately
  // unexported (module-private, per the plan's own Interfaces note), so the
  // start marker has no "export " prefix the way auth-refusals.mjs's does.
  const src = readFileSync(new URL("../src/platform/db/engagement.ts", import.meta.url), "utf8");
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith("async function applyAsDeal("));
  assert.ok(start >= 0, "applyAsDeal exists in engagement.ts");
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("export ")) { end = i; break; }
  }
  return lines.slice(start, end).join("\n");
}

export function testAliasWriteIsNotBestEffort() {
  const body = applyAsDealSource();

  const aliasAt = body.indexOf("setDealAlias(");
  // The SPECIFIC call at the minted id (§3.2's "applyDescriptor at the minted
  // id") — not either of the two earlier applyDescriptor(studioId, d) calls in
  // the alias-hit and grandfather branches above it, which this ordering claim
  // says nothing about.
  const rootAt = body.indexOf("applyDescriptor(studioId, { ...d, engId: dealId })");
  assert.ok(aliasAt > -1, "applyAsDeal calls setDealAlias");
  assert.ok(rootAt > -1, "applyAsDeal applies the descriptor at the minted id");
  assert.ok(aliasAt < rootAt,
    "the alias is written BEFORE the root (spec §3.2) — written the other way " +
    "round, a crash between the two leaves a deal derivation cannot find, and " +
    "the retry mints a SECOND one instead of converging");

  // NOT INSIDE A TRY/CATCH. Counted rather than matched with one regex,
  // because "not wrapped" is a claim about balance: any try appearing earlier
  // in the function must already be CLOSED by its own catch before this call is
  // reached, or the call is still inside it. A try/catch added around this one
  // call specifically — the exact "hardened into best-effort" regression this
  // guard exists to catch — is what would break this count.
  const before = body.slice(0, aliasAt);
  const opens = (before.match(/\btry\s*\{/g) || []).length;
  const closes = (before.match(/\}\s*catch\b/g) || []).length;
  assert.equal(opens, closes,
    "setDealAlias is not wrapped in a try/catch — a failed alias write must " +
    "fail the create (spec §3.1), not be swallowed into a best-effort one");
}

// THE BEHAVIOURAL HALF: §3.2's actual promise is convergence, not merely that
// a throw propagates — "a failure between the two leaves an alias pointing at
// a root that does not exist yet, and the retry resolves through it and
// applies the descriptor there." Simulated directly, on the real store, rather
// than by injecting a fault into applyAsDeal: the alias is written and the
// root genuinely is not, which is exactly the state a crash right after
// setDealAlias (and before applyDescriptor) would leave behind, and the very
// next create for this chain is the "retry" the promise is about.
export async function testConvergesWhenAliasLandedButRootDidNot() {
  const sid = `s_${Date.now().toString(36)}_da6`;
  const ticket = { id: "tk_partial", clientId: "c1", clientName: "Acme", ref: "ACME-PARTIAL" };
  const derived = deterministicEngId("ticket", "tk_partial");

  const dealId = ID.engagement();
  await setDealAlias(sid, derived, dealId);
  assert.equal(await readEngagement(sid, dealId), null,
    "the root genuinely does not exist yet — the crash this simulates");

  const result = await attachTicketEngagement(sid, ticket, { id: "c1", name: "Acme" });
  assert.equal(result, dealId,
    "the retry resolves through the alias and applies there — it converges " +
    "rather than forking a second deal for the same chain");
  assert.ok(await readEngagement(sid, dealId),
    "the root now exists at the deal the alias already named");
  assert.equal(await readEngagement(sid, derived), null,
    "and no second root was minted at the derivation either");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [
      testSpineHelpers, testDetachResolvesThroughAlias, testDescriptorFollowsTheAlias,
      testMintingIsIdempotentAndGrandfathers, testAliasWriteIsNotBestEffort,
      testConvergesWhenAliasLandedButRootDidNot,
    ]) {
      await t();
      console.log(`ok ${t.name}`);
    }
  })()
    .catch((e) => { console.error(e); process.exit(1); });
}
