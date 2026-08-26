import assert from "node:assert/strict";
import { zAdd, zRange, zRem, sCard, sAdd } from "../src/platform/db/store.ts";
import { KEY_PREFIX } from "../src/platform/db/keys.ts";

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

if (import.meta.url === `file://${process.argv[1]}`) testZsetHelpers().then(() => console.log("ok")).catch(e => { console.error(e); process.exit(1); });
