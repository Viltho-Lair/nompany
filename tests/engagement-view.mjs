import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ENG, KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import { createEngagement, attachTicketEngagement } from "../src/platform/db/engagement.ts";
import { zRange } from "../src/platform/db/store.ts";
import { ALL_PERMISSIONS, AREAS } from "../src/platform/access/catalogue.ts";

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
  assert.deepEqual([...area.verbs], ["view"], "view only — v1 is read-only");
  assert.ok(!area.scoped, "not scoped: the department lens does that job");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => { for (const t of [testIndex, testPermissionKey]) { await t(); console.log(`ok ${t.name}`); } })()
    .catch((e) => { console.error(e); process.exit(1); });
}
