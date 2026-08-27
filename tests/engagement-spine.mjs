import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import {
  readEngagementView, attachTicketEngagement,
  attachToTicketEngagement, attachQuotationEngagement, setApprovedQuotation,
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => { for (const t of [testSpineHelpers]) { await t(); console.log(`ok ${t.name}`); } })()
    .catch((e) => { console.error(e); process.exit(1); });
}
