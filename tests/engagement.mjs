import assert from "node:assert/strict";
import { zAdd, zRange, zRem, sCard, sAdd } from "../src/platform/db/store.ts";
import { ENG, UNASSIGNED_ENG, ID, KEY_PREFIX } from "../src/platform/db/keys.ts";

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

if (import.meta.url === `file://${process.argv[1]}`) testZsetHelpers().then(() => console.log("ok")).catch(e => { console.error(e); process.exit(1); });
