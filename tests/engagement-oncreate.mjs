import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import { attachTicketEngagement, attachProjectEngagement, readEngagementView } from "../src/platform/db/engagement.ts";
import { buildEngagements } from "../src/platform/engagement/backfill.ts";
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

// A PROJECT RAISED DIRECTLY ROOTS ITS OWN DEAL. No ticket and no quotation
// means engagementIdForLineage answers "" — so without a root of its own this
// project joins nothing, and the stage registry's `unassignable: false` says a
// project is never supposed to be loose.
export async function testDirectProjectMintsItsOwnEngagement() {
  const sid = `s_${Date.now().toString(36)}d`;
  const project = {
    id: "prj_direct1", ticketId: "", quotationId: "", clientId: "c9",
    clientName: "", title: "Warehouse fit-out", number: "",
    createdAt: "2026-08-29T00:00:00.000Z",
  };
  const client = { id: "c9", name: "Northwind", industry: "Logistics" };
  const engId = await attachProjectEngagement(sid, project, client);
  assert.equal(engId, deterministicEngId("project", "prj_direct1"),
    "a direct project's engagement id is deterministic off the project");
  const view = await readEngagementView(sid, engId);
  assert.equal(view.singletons.project, "prj_direct1");
  assert.equal(view.singletons.ticket, null, "nothing invents a ticket");
  assert.equal(view.context.clientName, "Northwind",
    "the LIVE Client row names the deal, not the project's own copy");
  assert.equal(view.context.industry, "Logistics",
    "industry is the client's fact and is read off the client row");
}

// THE RECONCILER MUST REBUILD WHAT THE LIVE PATH WROTE. A live attach with no
// matching backfill branch is a root the next pass silently drops — the exact
// shape of the internal-quotation defect, one stage further down.
export function testBackfillClustersOrphanProjects() {
  const [d] = buildEngagements({
    projects: [{
      id: "prj_direct1", ticketId: "", quotationId: "", clientId: "c9",
      clientName: "", title: "Warehouse fit-out", number: "",
      createdAt: "2026-08-29T00:00:00.000Z",
    }],
    salesClients: [{ id: "c9", name: "Northwind", industry: "Logistics" }],
  });
  assert.equal(d.engId, deterministicEngId("project", "prj_direct1"));
  assert.equal(d.singletons.project, "prj_direct1");
  assert.equal(d.singletons.ticket, null);
  assert.equal(d.context.clientName, "Northwind");
  assert.equal(d.context.createdAt, "2026-08-29T00:00:00.000Z",
    "the deal is dated when the project was raised, not when the root was written");
}

// A PROJECT BEHIND A TICKET OR A QUOTATION STILL BELONGS TO THAT DEAL. This is
// the regression guard on the new branch: widen its condition by one field and
// every project in the product suddenly roots a second engagement of its own.
export function testBackfillLeavesLineagedProjectsAlone() {
  const withTicket = buildEngagements({ projects: [{ id: "prj_2", ticketId: "tk_1", quotationId: "quo_1" }] });
  assert.equal(withTicket.length, 0, "a project behind a ticket roots no engagement of its own");
  const withQuote = buildEngagements({ projects: [{ id: "prj_3", ticketId: "", quotationId: "quo_2" }] });
  assert.equal(withQuote.length, 0, "nor does one behind an internal quotation");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [
      testAttachTicketEngagement,
      testDirectProjectMintsItsOwnEngagement,
      testBackfillClustersOrphanProjects,
      testBackfillLeavesLineagedProjectsAlone,
    ]) { await t(); console.log(`ok ${t.name}`); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
