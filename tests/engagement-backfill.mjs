import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ENG, deterministicEngId, KEY_PREFIX } from "../src/platform/db/keys.ts";
import { buildEngagements } from "../src/platform/engagement/backfill.ts";
import { applyDescriptor, readEngagementView, engagementOf } from "../src/platform/db/engagement.ts";
import { createUser } from "../src/platform/auth/users.ts";
import { createStudio } from "../src/modules/main/studios.ts";
import { getSectionByKey, addRow, readCol } from "../src/platform/db/sections.ts";
import { backfillStudio } from "../scripts/migrate/backfill-engagements.mjs";

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

// Task 4 — the CLI's own `backfillStudio`, driven in-process (no separate
// process, no --studio/--apply argv parsing here): seed a real studio through
// the same helpers tests/suite.mjs seeds one with, run the backfill, and read
// the layer back at the deterministic id. This is the end-to-end proof that
// the CLI reads a studio's LIVE collections through the repository and writes
// ONLY the engagement layer over them.
export async function testBackfillStudio() {
  const owner = (await createUser({ email: `bf-${Date.now().toString(36)}@test.invalid`, passwordHash: "x" })).user;
  const slug = `bf-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const created = await createStudio({ ownerUserId: owner.id, name: "Backfill Studio", slug, ownerAlias: "Owner" });
  assert.ok(!created.error, `fixture studio: ${created.error}`);
  const sid = created.studio.id;

  const ticketsSec = await getSectionByKey(sid, "sales-tickets");
  const clientsSec = await getSectionByKey(sid, "sales-clients");
  const quotationsSec = await getSectionByKey(sid, "technical-quotations");
  const projectsSec = await getSectionByKey(sid, "projects-list");
  const cashSec = await getSectionByKey(sid, "finance-cash");

  const client = await addRow(sid, clientsSec.id, "salesClients", { name: "Acme" });
  const ticket = await addRow(sid, ticketsSec.id, "salesTickets",
    { clientId: client.id, clientName: client.name, ref: "ACME-001", title: "Roof" });
  const quotation = await addRow(sid, quotationsSec.id, "quotations", { ticketId: ticket.id, createdAt: "2026-01-01" });
  const project = await addRow(sid, projectsSec.id, "projects", { ticketId: ticket.id });
  const invoice = await addRow(sid, cashSec.id, "invoices", { projectId: project.id });

  const engId = deterministicEngId("ticket", ticket.id);
  assert.equal(await readEngagementView(sid, engId), null, "no engagement layer exists before the backfill runs");

  const result = await backfillStudio(sid, { apply: true });
  assert.equal(result.engagements, 1, "one engagement backfilled for the one chain");
  // 3 singleton slots (ticket, approvedQuotation, project) + 1 quotation
  // member + 1 invoice member — see backfillStudio's own doc comment.
  assert.equal(result.records, 5, "record count matches the chain seeded above");

  const view = await readEngagementView(sid, engId);
  assert.ok(view, "engagement view resolves at the deterministic id");
  assert.equal(view.singletons.ticket, ticket.id, "ticket is the singleton head");
  assert.equal(view.singletons.project, project.id, "project is a singleton member");
  assert.deepEqual(view.members.quotation, [quotation.id], "quotation is a member");
  assert.deepEqual(view.members.invoice, [invoice.id], "invoice is a member");

  // READ-LAYER DISCIPLINE (the hard gate): the source collection this backfill
  // read from must come back byte-for-byte identical — no engagementId field
  // stitched on, no field touched at all.
  const ticketRows = await readCol(sid, ticketsSec.id, "salesTickets");
  assert.deepEqual(ticketRows.find((r) => r.id === ticket.id), ticket, "backfill never edits an existing record");

  // Idempotent: re-applying against the same studio does not duplicate members.
  await backfillStudio(sid, { apply: true });
  const again = await readEngagementView(sid, engId);
  assert.deepEqual(again.members.invoice, [invoice.id], "re-apply does not duplicate");

  // Dry run writes nothing: a second, untouched ticket with no engagement yet
  // must still have none after an apply:false pass reads it.
  const secondTicket = await addRow(sid, ticketsSec.id, "salesTickets", { clientId: client.id, ref: "ACME-002" });
  const secondEngId = deterministicEngId("ticket", secondTicket.id);
  const dry = await backfillStudio(sid, { apply: false });
  assert.ok(dry.engagements >= 2, "dry run still counts the new chain");
  assert.equal(await readEngagementView(sid, secondEngId), null, "dry run writes nothing");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [testKeysAndDetId, testCluster, testApplyAndRead, testBackfillStudio]) {
      await t();
      console.log(`ok ${t.name}`);
    }
  })().catch((e) => { console.error(e); process.exit(1); });
}
