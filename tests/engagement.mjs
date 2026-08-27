import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { zAdd, zRange, zRem, sCard, sAdd, sMembers } from "../src/platform/db/store.ts";
import { ENG, UNASSIGNED_ENG, ID, KEY_PREFIX } from "../src/platform/db/keys.ts";
import { STAGE_REGISTRY, stageOf, isSingleton, isUnassignable } from "../src/platform/engagement/registry.ts";
import { createEngagement, readEngagement, attachRecord, listMembers, detachRecord, addRef, removeRef, refCount, unassignedEngagement, promote } from "../src/platform/db/engagement.ts";

// The harness runs with NOMPANY_KEY_PREFIX set; refuse to run unprefixed.
assert.ok(KEY_PREFIX, "engagement tests must run under a key prefix");

export async function testZsetHelpers() {
  const k = `${KEY_PREFIX}test:eng:zset:${Date.now().toString(36)}`;
  await zAdd(k, 1, "a");
  await zAdd(k, 3, "c");
  await zAdd(k, 2, "b");
  assert.deepEqual(await zRange(k, 0, -1), ["a", "b", "c"], "ascending by score");
  assert.deepEqual(await zRange(k, 0, 1, { rev: true }), ["c", "b"], "newest-first paging");
  await zRem(k, "b");
  assert.deepEqual(await zRange(k, 0, -1), ["a", "c"], "zRem drops the member");

  const s = `${KEY_PREFIX}test:eng:set:${Date.now().toString(36)}`;
  await sAdd(s, "x"); await sAdd(s, "y"); await sAdd(s, "x");
  assert.equal(await sCard(s), 2, "sCard counts distinct members");
}

export function testEngagementKeys() {
  const P = KEY_PREFIX;
  assert.equal(ENG.root("s1", "e1"), `${P}s:s1:eng:e1`);
  assert.equal(ENG.members("s1", "e1", "invoice"), `${P}s:s1:eng:e1:members:invoice`);
  assert.equal(ENG.rec("s1", "invoice", "r1"), `${P}s:s1:rec:invoice:r1`);
  assert.equal(ENG.dept("s1", "invoice"), `${P}s:s1:dept:invoice`);
  assert.equal(ENG.hasStage("s1", "project"), `${P}s:s1:eng-ix:has:project`);
  assert.equal(ENG.ref("s1", "client", "c1"), `${P}s:s1:ref:client:c1`);
  assert.equal(ENG.refBy("s1", "client", "c1"), `${P}s:s1:ref-by:client:c1`);
  assert.equal(UNASSIGNED_ENG, "__unassigned");
  assert.match(ID.engagement(), /^eng_/);
  // Every builder must start with the prefix (Inv. 1 — the suite asserts this globally too).
  for (const k of [ENG.root("s","e"), ENG.members("s","e","t"), ENG.rec("s","t","r"),
                   ENG.dept("s","t"), ENG.hasStage("s","t"), ENG.ref("s","t","r"), ENG.refBy("s","t","r")]) {
    assert.ok(k.startsWith(`${P}s:`), `namespaced: ${k}`);
  }
}

export function testRegistry() {
  assert.equal(isSingleton("ticket"), true, "ticket is one-per-engagement");
  assert.equal(isSingleton("project"), true);
  assert.equal(isSingleton("invoice"), false, "invoices are many");
  assert.equal(isUnassignable("expense"), true, "an expense can exist with no deal");
  assert.equal(isUnassignable("ticket"), false, "a ticket always belongs to a deal");
  assert.equal(stageOf("nope"), null, "unknown type resolves null, not throws");
  // Every entry carries a section key and a permission (drives access + ownership).
  for (const e of Object.values(STAGE_REGISTRY)) {
    assert.ok(e.sectionKey && e.permission, `${e.type} declares section + permission`);
    assert.ok(e.cardinality === "one" || e.cardinality === "many");
  }
}

export async function testCreateRead() {
  const sid = `s_${Date.now().toString(36)}`;
  const eng = await createEngagement(sid, { ref: "ACME-001", context: { clientName: "Acme" } });
  assert.match(eng.id, /^eng_/);
  assert.equal(eng.context.clientName, "Acme");
  assert.deepEqual(eng.singletons, { ticket: null, approvedQuotation: null, project: null });
  const read = await readEngagement(sid, eng.id);
  assert.equal(read.id, eng.id, "reads back the same engagement");
  assert.equal(await readEngagement(sid, "eng_missing"), null, "absent engagement is null");
}

export async function testAttach() {
  const sid = `s_${Date.now().toString(36)}`;
  const eng = await createEngagement(sid, {});
  // singleton
  await attachRecord(sid, eng.id, "project", "p1");
  assert.equal((await readEngagement(sid, eng.id)).singletons.project, "p1");
  await assert.rejects(() => attachRecord(sid, eng.id, "project", "p2"), /cardinality/, "second project refused");
  // member
  await attachRecord(sid, eng.id, "invoice", "i1", "2026-01-01T00:00:00Z");
  await attachRecord(sid, eng.id, "invoice", "i2", "2026-02-01T00:00:00Z");
  assert.deepEqual(await listMembers(sid, eng.id, "invoice"), ["i1", "i2"], "members oldest-first");
  assert.deepEqual(await listMembers(sid, eng.id, "invoice", { rev: true, limit: 1 }), ["i2"], "newest page");
  // indexes populated
  assert.ok((await sMembers(ENG.hasStage(sid, "project"))).includes(eng.id), "eng-ix records the stage");
  // ENG.dept is a ZSET (attachRecord writes it with zAdd, ordered by createdAt),
  // not a SET — sCard is SCARD and throws WRONGTYPE against a sorted set, so the
  // dept index is read back with zRange, the primitive that actually wrote it.
  assert.deepEqual(await zRange(ENG.dept(sid, "invoice"), 0, -1), ["i1", "i2"], "dept index populated");
}

export async function testDetachAndRefs() {
  const sid = `s_${Date.now().toString(36)}`;
  const eng = await createEngagement(sid, {});
  await attachRecord(sid, eng.id, "invoice", "i1", "2026-01-01T00:00:00Z");
  await detachRecord(sid, eng.id, "invoice", "i1");
  assert.deepEqual(await listMembers(sid, eng.id, "invoice"), [], "detach removes the member");
  await attachRecord(sid, eng.id, "project", "p1");
  await detachRecord(sid, eng.id, "project", "p1");
  assert.equal((await readEngagement(sid, eng.id)).singletons.project, null, "detach clears the singleton");
  // reference integrity: a live reference blocks deletion; count reflects it.
  await addRef(sid, "client", "c1", "i1");
  await addRef(sid, "client", "c1", "i2");
  assert.equal(await refCount(sid, "client", "c1"), 2, "two live referrers");
  await removeRef(sid, "client", "c1", "i1");
  assert.equal(await refCount(sid, "client", "c1"), 1);
}

export async function testUnassigned() {
  const sid = `s_${Date.now().toString(36)}`;
  const bucket = await unassignedEngagement(sid);
  assert.equal(bucket.id, "__unassigned");
  const again = await unassignedEngagement(sid);
  assert.equal(again.id, "__unassigned", "idempotent — one bucket per studio");
  await attachRecord(sid, "__unassigned", "expense", "x1", "2026-01-01T00:00:00Z");
  const real = await createEngagement(sid, {});
  await promote(sid, "expense", "x1", real.id);
  assert.deepEqual(await listMembers(sid, "__unassigned", "expense"), [], "left the bucket");
  assert.deepEqual(await listMembers(sid, real.id, "expense"), ["x1"], "joined the deal");
}

// Runner — call every test in order. import.meta.url is a file:// URL on every
// platform, but `file://${process.argv[1]}` is POSIX-only: on Windows argv[1] is
// a backslashed path (e.g. C:\...), so the naive template never matches and the
// runner silently no-ops. pathToFileURL(...).href normalises both sides.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [testZsetHelpers, testEngagementKeys, testRegistry, testCreateRead,
                     testAttach, testDetachAndRefs, testUnassigned]) {
      await t(); console.log(`ok ${t.name}`);
    }
  })().catch((e) => { console.error(e); process.exit(1); });
}
