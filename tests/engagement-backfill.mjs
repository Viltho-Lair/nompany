import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ENG, deterministicEngId, KEY_PREFIX } from "../src/platform/db/keys.ts";
import { buildEngagements } from "../src/platform/engagement/backfill.ts";
import { applyDescriptor, readEngagementView, engagementOf } from "../src/platform/db/engagement.ts";
import { STAGE_REGISTRY } from "../src/platform/engagement/registry.ts";
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

// Task 3 (client-belongs-to-the-engagement) — THE LIVE BUG: an internal
// quotation's clientId names a real client (createQuotation now stores
// clientName as "" once the client is a real record — see technical.ts —
// so the untranslated id was resolving to nothing). The orphan branch used to
// read q.clientName only, never consulting clientById the way the ticket
// branch does one loop up; that asymmetry is what left all six live
// internal-quotation engagements with a blank client name. Pure, no Redis —
// buildEngagements takes plain collections in and hands descriptors back.
export function testOrphanClientLive() {
  const collections = {
    salesClients: [{ id: "c1", name: "Loose Industries" }],
    // The live shape exactly: clientId set, clientName already blanked by
    // createQuotation once a real Client row exists.
    quotations: [{ id: "quo_orphan", clientId: "c1", clientName: "", title: "Internal deal" }],
  };
  const [d] = buildEngagements(collections);
  assert.equal(d.context.clientId, "c1", "context carries the quotation's clientId");
  assert.equal(d.context.clientName, "Loose Industries",
    "context.clientName resolves through clientById, the same as the ticket branch — today it reads \"\"");

  // The fallback still holds for free text that never became a record — no
  // clientId, no matching row, nothing to resolve against.
  const [freeText] = buildEngagements({
    salesClients: [],
    quotations: [{ id: "quo_freetext", clientName: "Typed Only" }],
  });
  assert.equal(freeText.context.clientName, "Typed Only",
    "with no clientId at all, the stored clientName is still the fallback");
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

  const ticketsSec = await getSectionByKey(sid, "crm-sales-tickets");
  const clientsSec = await getSectionByKey(sid, "crm-sales-clients");
  const quotationsSec = await getSectionByKey(sid, "crm-sales-quotations");
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

// Task 5 — PARITY: the backfilled engagement layer must equal what today's
// read paths return for a full chain, not just the single-quotation/
// single-invoice shape testBackfillStudio already covers. Two quotations
// (different createdAt) on one ticket, a project naming both ticket and
// quotation, two invoices and a task on that project, PLUS one orphan
// internal quotation (no ticketId) — closing the two gaps the earlier tests
// left open: (1) which quotation becomes "approved" when there is more than
// one (newest by createdAt), and (2) the orphan-quotation-as-its-own-
// engagement path, which testCluster only proves at the pure-clustering
// level and never round-trips through backfillStudio + readEngagementView.
export async function testParity() {
  const owner = (await createUser({ email: `par-${Date.now().toString(36)}@test.invalid`, passwordHash: "x" })).user;
  const slug = `par-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const created = await createStudio({ ownerUserId: owner.id, name: "Parity Studio", slug, ownerAlias: "Owner" });
  assert.ok(!created.error, `fixture studio: ${created.error}`);
  const sid = created.studio.id;

  const ticketsSec = await getSectionByKey(sid, "crm-sales-tickets");
  const clientsSec = await getSectionByKey(sid, "crm-sales-clients");
  const quotationsSec = await getSectionByKey(sid, "crm-sales-quotations");
  const projectsSec = await getSectionByKey(sid, "projects-list");
  const cashSec = await getSectionByKey(sid, "finance-cash");
  const tasksSec = await getSectionByKey(sid, "tasks");

  const client = await addRow(sid, clientsSec.id, "salesClients", { name: "Acme Parity" });
  const ticket = await addRow(sid, ticketsSec.id, "salesTickets",
    { clientId: client.id, clientName: client.name, ref: "ACME-PAR-001", title: "Roof" });
  const quo1 = await addRow(sid, quotationsSec.id, "quotations", { ticketId: ticket.id, createdAt: "2026-01-01" });
  const quo2 = await addRow(sid, quotationsSec.id, "quotations", { ticketId: ticket.id, createdAt: "2026-03-01" });
  const project = await addRow(sid, projectsSec.id, "projects", { ticketId: ticket.id, quotationId: quo2.id });
  const inv1 = await addRow(sid, cashSec.id, "invoices", { projectId: project.id });
  const inv2 = await addRow(sid, cashSec.id, "invoices", { projectId: project.id });
  const task = await addRow(sid, tasksSec.id, "tasks", { projectId: project.id });

  // Orphan internal quotation: no ticket, its own client name — clusters into
  // its OWN engagement (buildEngagements' second loop), not the ticket's.
  const orphanQuo = await addRow(sid, quotationsSec.id, "quotations", { clientName: "Loose Co" });

  const result = await backfillStudio(sid, { apply: true });
  assert.ok(result.engagements >= 2, "one engagement for the ticket chain, one for the orphan quotation");

  const engId = deterministicEngId("ticket", ticket.id);
  const view = await readEngagementView(sid, engId);
  assert.ok(view, "engagement view resolves for the ticket chain");

  // PARITY — the layer's resolved records must equal what the live rows say.
  assert.equal(view.context.clientName, client.name, "context.clientName equals the live client's name");
  assert.equal(view.singletons.ticket, ticket.id, "singletons.ticket equals the seeded ticket");
  assert.equal(view.singletons.project, project.id, "singletons.project equals the seeded project");
  // The coverage gap this closes: with two quotations, "approved" must be the
  // newest by createdAt, not just whichever one happens to be seeded alone.
  assert.equal(view.singletons.approvedQuotation, quo2.id, "approvedQuotation is the NEWEST quotation by createdAt");
  assert.deepEqual([...view.members.quotation].sort(), [quo1.id, quo2.id].sort(), "both quotations are members");
  assert.deepEqual([...view.members.invoice].sort(), [inv1.id, inv2.id].sort(), "both invoices are members");
  assert.deepEqual(view.members.task, [task.id], "the task is a member");

  // The orphan path — its own engagement, keyed off the quotation itself.
  const orphanEngId = deterministicEngId("quotation", orphanQuo.id);
  const orphanView = await readEngagementView(sid, orphanEngId);
  assert.ok(orphanView, "the orphan quotation resolves its own engagement");
  assert.deepEqual(orphanView.members.quotation, [orphanQuo.id], "the orphan engagement's only member is itself");
}

// Task 6 — VOCABULARY PARITY, the highest-value Minor from the Phase-1a final
// review: the engagement member-type vocabulary is hand-maintained in THREE
// places that must stay in sync with nothing binding them —
//   • STAGE_REGISTRY (registry.ts)            — the canonical singular types.
//   • buildEngagements' memberTypes + the explicit rfq/quotation (backfill.ts)
//     — what the backfill WRITES to member ZSETs.
//   • readEngagementView's type list (db/engagement.ts) — what the read view
//     READS back.
// Phase 1a already hit exactly this drift class once (plural collection name
// vs singular registry type, see testApplyAndRead's comment). If a future
// stage type is added to one list and not the others, its member set is
// written-but-never-surfaced, or read-but-never-populated — SILENTLY, because
// each list is internally consistent and the bug only exists once the three
// are compared.
//
// PRIMARY GUARD — behavioral round-trip: neither memberTypes nor
// readEngagementView's type array is exported (and none is added here —
// src/** stays untouched; tests only), so the binding proof is seeding ONE
// record of every member type the backfill is supposed to carry, running the
// real backfill, and asserting readEngagementView surfaces every single one
// under its expected key. A type dropped from either list makes its assertion
// fail here, not silently in production.
const ALL_MEMBER_TYPES = [
  "rfq", "quotation",                          // ticket-scoped
  "invoice", "expense", "order", "delivery",   // project-scoped
  "shipment", "task", "overtime", "sheet",
];

export async function testVocabularyParity() {
  const owner = (await createUser({ email: `voc-${Date.now().toString(36)}@test.invalid`, passwordHash: "x" })).user;
  const slug = `voc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const created = await createStudio({ ownerUserId: owner.id, name: "Vocabulary Studio", slug, ownerAlias: "Owner" });
  assert.ok(!created.error, `fixture studio: ${created.error}`);
  const sid = created.studio.id;

  const ticketsSec = await getSectionByKey(sid, "crm-sales-tickets");
  const clientsSec = await getSectionByKey(sid, "crm-sales-clients");
  const rfqSec = await getSectionByKey(sid, "engineering-docs-rfq");
  const quotationsSec = await getSectionByKey(sid, "crm-sales-quotations");
  const projectsSec = await getSectionByKey(sid, "projects-list");
  const cashSec = await getSectionByKey(sid, "finance-cash");
  const sheetsSec = await getSectionByKey(sid, "inventory-sheets");   // owns materialOrders + projectSheets
  const inventorySec = await getSectionByKey(sid, "inventory");      // owns deliveries
  const awbSec = await getSectionByKey(sid, "logistics-shipments");
  const tasksSec = await getSectionByKey(sid, "tasks");
  const overtimesSec = await getSectionByKey(sid, "projects-overtimes");

  const client = await addRow(sid, clientsSec.id, "salesClients", { name: "Vocab Co" });
  const ticket = await addRow(sid, ticketsSec.id, "salesTickets",
    { clientId: client.id, clientName: client.name, ref: "VOC-001", title: "Vocabulary" });
  const project = await addRow(sid, projectsSec.id, "projects", { ticketId: ticket.id });

  // Ticket-scoped member types: one of each.
  const rfq = await addRow(sid, rfqSec.id, "rfqs", { ticketId: ticket.id });
  const quotation = await addRow(sid, quotationsSec.id, "quotations", { ticketId: ticket.id, createdAt: "2026-01-01" });

  // Project-scoped member types: one of each the backfill is supposed to carry
  // (mirrors backfill.ts' memberTypes tuple list exactly, so a type silently
  // dropped from that list has nothing seeded to expose it — which is why the
  // registry-membership check below is the second, independent guard).
  const invoice = await addRow(sid, cashSec.id, "invoices", { projectId: project.id });
  const expense = await addRow(sid, cashSec.id, "expenses", { projectId: project.id });
  const order = await addRow(sid, sheetsSec.id, "materialOrders", { projectId: project.id });
  const sheet = await addRow(sid, sheetsSec.id, "projectSheets", { projectId: project.id });
  const delivery = await addRow(sid, inventorySec.id, "deliveries", { projectId: project.id });
  const shipment = await addRow(sid, awbSec.id, "awbShipments", { projectId: project.id });
  const task = await addRow(sid, tasksSec.id, "tasks", { projectId: project.id });
  const overtime = await addRow(sid, overtimesSec.id, "overtimes", { projectId: project.id });

  await backfillStudio(sid, { apply: true });

  const engId = deterministicEngId("ticket", ticket.id);
  const view = await readEngagementView(sid, engId);
  assert.ok(view, "engagement view resolves for the seeded chain");

  const expected = {
    rfq: rfq.id, quotation: quotation.id, invoice: invoice.id, expense: expense.id,
    order: order.id, sheet: sheet.id, delivery: delivery.id, shipment: shipment.id,
    task: task.id, overtime: overtime.id,
  };
  for (const [type, id] of Object.entries(expected)) {
    // If buildEngagements writes this type to a ZSET readEngagementView's list
    // doesn't name (or the reverse — the view names a type nothing ever
    // writes), this member array comes back empty or missing the id. That IS
    // the drift this test exists to catch.
    assert.deepEqual(view.members[type], [id],
      `"${type}" round-trips: written by buildEngagements, surfaced by readEngagementView`);
  }

  // SECOND, CHEAPER GUARD — direct list-vs-registry: every member type the
  // write/read paths use must be a real STAGE_REGISTRY key, so a typo'd or
  // non-registry type is caught even without a seeded record for it.
  // `bill` and `asset` ARE STAGE_REGISTRY entries deliberately NOT in
  // ALL_MEMBER_TYPES: they hang off finance-payables/finance-assets, which
  // carry no ticketId/projectId to cluster a chain by, so the backfill (a
  // pure ticket→project walk) has nothing to attach them to — their absence
  // here is intentional non-project-scoping, not drift. `ticket`/`project`
  // are the singleton slots (tracked via `singletons`, not `members`), so
  // they are checked separately, not in this list.
  for (const type of ALL_MEMBER_TYPES) {
    assert.ok(STAGE_REGISTRY[type],
      `"${type}" is a STAGE_REGISTRY key — the backfill/read-view vocabulary must stay inside the registry`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [testKeysAndDetId, testCluster, testOrphanClientLive, testApplyAndRead, testBackfillStudio,
                      testParity, testVocabularyParity]) {
      await t();
      console.log(`ok ${t.name}`);
    }
  })().catch((e) => { console.error(e); process.exit(1); });
}
