import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ENG, KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import { createEngagement, attachTicketEngagement } from "../src/platform/db/engagement.ts";
import { zRange } from "../src/platform/db/store.ts";
import { ALL_PERMISSIONS, AREAS } from "../src/platform/access/catalogue.ts";
// listEngagements/engagementBlock need a seeded studio and are exercised in
// tests/suite.mjs (Task 6), where the seeding helpers already live — only the
// pure permission filter is tested here, so only it is imported.
import { visibleStageTypes } from "../src/modules/main/engagements.ts";

assert.ok(KEY_PREFIX, "engagement-view tests must run under a key prefix");

export async function testIndex() {
  const sid = `s_${Date.now().toString(36)}`;
  assert.equal(ENG.index(sid), `${KEY_PREFIX}s:${sid}:eng-index`);

  // A root created through the live dual-write path is indexed.
  const engId = await attachTicketEngagement(
    sid,
    { id: "tk_1", clientName: "Acme", ref: "ACME-001", createdAt: "2026-01-01T00:00:00Z" },
    { id: "c1", name: "Acme" },
  );
  assert.equal(engId, deterministicEngId("ticket", "tk_1"));
  assert.deepEqual(await zRange(ENG.index(sid), 0, -1), [engId], "indexed on create");

  // Idempotent: re-applying the same engagement does not duplicate it.
  await attachTicketEngagement(
    sid,
    { id: "tk_1", clientName: "Acme", ref: "ACME-001", createdAt: "2026-01-01T00:00:00Z" },
    { id: "c1", name: "Acme" },
  );
  assert.deepEqual(await zRange(ENG.index(sid), 0, -1), [engId], "re-apply does not duplicate");

  // createEngagement indexes too, so no root-creating primitive misses it.
  const bare = await createEngagement(sid, { ref: "ENG-1" });
  const all = await zRange(ENG.index(sid), 0, -1);
  assert.ok(all.includes(bare.id), "createEngagement indexes its root");
}

export function testPermissionKey() {
  assert.ok(ALL_PERMISSIONS.includes("engagements.view"), "engagements.view is a real key");
  const area = AREAS.find((a) => a.key === "engagements");
  assert.ok(area, "the engagements area exists");
  // This read `["view"]` — "view only, v1 is read-only" — until deleting a deal
  // became a real capability. It is asserted rather than derived so that
  // GRANTING SOMEBODY THE POWER TO DESTROY A DEAL IS A VISIBLE ACT in a diff:
  // deleting an engagement takes its tickets, RFQs, quotations, project, sheets
  // and invoices with it.
  assert.deepEqual([...area.verbs], ["view", "delete"], "view and delete; create/edit are not this screen's");
  assert.deepEqual((area.extra || []).map((x) => x.key), ["lock"],
    "lock is an extra power, outside the view/create/edit/delete ladder");
  assert.ok(ALL_PERMISSIONS.includes("engagements.delete"));
  assert.ok(ALL_PERMISSIONS.includes("engagements.lock"));
  assert.ok(!area.scoped, "not scoped: the department lens does that job");
}

// THE SAFETY PROPERTY, pinned as a test: a stage the reader holds no permission
// for must not appear in visibleStageTypes at all — not present-but-false, not
// counted, absent. This is what makes a withheld stage withheld rather than
// blanked at every call site that filters by this list.
export function testVisibleStageTypes() {
  // A Sales-only reader sees the ticket stage and nothing of Finance's.
  const salesOnly = new Set(["engagements.view", "crmSales.tickets.view"]);
  const types = visibleStageTypes(salesOnly);
  assert.ok(types.includes("ticket"), "crmSales.tickets.view reveals the ticket stage");
  assert.ok(!types.includes("invoice"), "no finance right, no invoice stage");
  assert.ok(!types.includes("project"), "no projects right, no project stage");

  // Finance sees its own and not Sales'.
  const finance = new Set(["engagements.view", "finance.cash.view"]);
  assert.ok(visibleStageTypes(finance).includes("invoice"));
  assert.ok(!visibleStageTypes(finance).includes("ticket"));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [testIndex, testPermissionKey, testVisibleStageTypes]) {
      await t();
      console.log(`ok ${t.name}`);
    }
  })().catch((e) => { console.error(e); process.exit(1); });
}
