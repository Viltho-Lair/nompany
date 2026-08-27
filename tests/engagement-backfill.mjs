import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ENG, deterministicEngId, KEY_PREFIX } from "../src/platform/db/keys.ts";
import { buildEngagements } from "../src/platform/engagement/backfill.ts";
import { applyDescriptor, readEngagementView, engagementOf } from "../src/platform/db/engagement.ts";

assert.ok(KEY_PREFIX, "backfill tests must run under a key prefix");

export function testKeysAndDetId() {
  const P = KEY_PREFIX;
  assert.equal(ENG.recEng("s1", "invoice", "i1"), `${P}s:s1:rec-eng:invoice:i1`);
  const a = deterministicEngId("ticket", "tk_9");
  const b = deterministicEngId("ticket", "tk_9");
  assert.equal(a, b, "same head → same engagement id (idempotent backfill)");
  assert.notEqual(a, deterministicEngId("ticket", "tk_10"), "different head → different id");
  assert.match(a, /^eng_/, "engagement-id shaped");
}

export function testCluster() {
  const collections = {
    salesTickets: [{ id: "tk_1", clientId: "c1", clientName: "Acme", title: "Roof", ref: "ACME-001",
                     contactName: "Sam", location: { city: "X" }, industry: "Eng", urgency: "Normal", deadline: "2027-01-01" }],
    salesClients: [{ id: "c1", name: "Acme" }],
    rfqs: [{ id: "rfq_1", ticketId: "tk_1" }],
    quotations: [{ id: "quo_1", ticketId: "tk_1", createdAt: "2026-01-01" },
                 { id: "quo_2", ticketId: "tk_1", createdAt: "2026-02-01" }],
    projects: [{ id: "pro_1", ticketId: "tk_1", quotationId: "quo_2" }],
    invoices: [{ id: "inv_1", projectId: "pro_1" }, { id: "inv_2", projectId: "pro_1" }],
  };
  const descs = buildEngagements(collections);
  assert.equal(descs.length, 1, "one engagement for the one chain");
  const d = descs[0];
  assert.equal(d.singletons.ticket, "tk_1");
  assert.equal(d.singletons.project, "pro_1");
  assert.deepEqual(d.members.quotation.sort(), ["quo_1", "quo_2"], "both quotations are members");
  assert.deepEqual(d.members.invoice.sort(), ["inv_1", "inv_2"], "project's invoices attach to the engagement");
  assert.equal(d.context.clientId, "c1", "live client ref carried as context");
  assert.equal(d.ref, "ACME-001", "engagement takes the ticket ref");
}

export async function testApplyAndRead() {
  const sid = `s_${Date.now().toString(36)}`;
  const [d] = buildEngagements({
    salesTickets: [{ id: "tk_1", clientId: "c1", clientName: "Acme", ref: "ACME-001", title: "Roof" }],
    salesClients: [{ id: "c1", name: "Acme" }],
    quotations: [{ id: "quo_1", ticketId: "tk_1", createdAt: "2026-01-01" }],
    projects: [{ id: "pro_1", ticketId: "tk_1" }],
    invoices: [{ id: "inv_1", projectId: "pro_1" }],
  });
  await applyDescriptor(sid, d);
  const view = await readEngagementView(sid, d.engId);
  assert.equal(view.context.clientName, "Acme");
  assert.equal(view.singletons.ticket, "tk_1");
  assert.equal(view.singletons.project, "pro_1");
  assert.deepEqual(view.members.quotation, ["quo_1"]);
  assert.deepEqual(view.members.invoice, ["inv_1"]);
  // Member keys are the SINGULAR registry type (STAGE_REGISTRY / attachRecord's
  // vocabulary) — the same ZSET a future Phase-1b attachRecord("invoice", …)
  // would write to. If the descriptor used the plural collection name instead,
  // the backfilled set and the live-write set would silently diverge.
  assert.equal(await engagementOf(sid, "invoice", "inv_1"), d.engId, "reverse index resolves");
  // Idempotent: re-applying yields the same view (no duplicate members).
  await applyDescriptor(sid, d);
  const again = await readEngagementView(sid, d.engId);
  assert.deepEqual(again.members.invoice, ["inv_1"], "re-apply does not duplicate");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => { for (const t of [testKeysAndDetId, testCluster, testApplyAndRead]) { await t(); console.log(`ok ${t.name}`); } })()
    .catch((e) => { console.error(e); process.exit(1); });
}
