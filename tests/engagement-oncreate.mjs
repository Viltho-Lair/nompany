import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import { attachTicketEngagement, readEngagementView } from "../src/platform/db/engagement.ts";
assert.ok(KEY_PREFIX, "must run under a key prefix");

export async function testAttachTicketEngagement() {
  const sid = `s_${Date.now().toString(36)}`;
  const ticket = { id: "tk_9", clientId: "c1", clientName: "Acme", ref: "ACME-001", title: "Roof", industry: "Eng" };
  const client = { id: "c1", name: "Acme" };
  const engId = await attachTicketEngagement(sid, ticket, client);
  assert.equal(engId, deterministicEngId("ticket", "tk_9"), "deterministic id matches the backfill's");
  const view = await readEngagementView(sid, engId);
  assert.equal(view.singletons.ticket, "tk_9");
  assert.equal(view.context.clientName, "Acme");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => { for (const t of [testAttachTicketEngagement]) { await t(); console.log(`ok ${t.name}`); } })()
    .catch((e) => { console.error(e); process.exit(1); });
}
