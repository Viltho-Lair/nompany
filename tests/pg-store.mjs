// THE DOCUMENT STORE, PROVED AGAINST THE REAL DATABASE.
//
// src/platform/db/pgStore.ts reimplements every primitive store.ts used to
// reach Redis for. The primitives are where the migration's risk actually is:
// each one has a Redis semantic it must reproduce (an expired key reads as
// absent, a claim is atomic, a reference number never goes backwards) and none
// of those survive being asserted against a mock, because the thing being
// tested IS the database's behaviour.
//
// ONE ASSERTION PER BUG THAT COULD ACTUALLY HAPPEN, and each block names it.
// The concurrency blocks are not decoration: invariant 8 (compare-and-set),
// invariant 9 (flat backoff) and invariant 10 (reference numbers only move
// forward) are all statements about what happens when two writers arrive at
// once, and a sequential test cannot distinguish a correct implementation from
// one that has silently degraded into read-modify-write.
//
// NAMESPACED AND SWEPT. Every key and channel this file writes carries the
// prefix below, and the teardown reads its own keys back and deletes them by an
// EXPLICIT LIST (invariant 17) rather than by a predicate. DATABASE_URL is the
// live, shared database — NOMPANY_KEY_PREFIX does not protect Postgres, so the
// namespace is this file's own discipline and nothing else's.
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// SELF-REGISTERING LOADER, same reason and shape as tests/pg-parity.mjs: this
// file runs bare (`node tests/pg-store.mjs`) and pgStore.ts reaches its siblings
// with extensionless specifiers (`./pg`, `./keys` — house style per CLAUDE.md)
// that plain Node's ESM resolver cannot follow without this hook filling the
// extension in.
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("./loader.mjs", import.meta.url), { data: { root } });
}

// DATABASE_URL lives in .env.local, which Next loads and plain Node does not.
// Same six-line parse the rest of the suite uses; it never touches process.env
// for anything already set, so CI can supply the environment directly.
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI may supply the environment directly */ }

const HAS_DATABASE_URL = Boolean(process.env.DATABASE_URL);
if (!HAS_DATABASE_URL) {
  console.warn(
    "\n" + "=".repeat(78) +
    "\nDATABASE_URL is not set — SKIPPING every assertion in this file. The document" +
    "\nstore is NOT verified this run. CI always sets DATABASE_URL; locally, set it" +
    "\nin .env.local (see CLAUDE.md's Postgres section)." +
    "\n" + "=".repeat(78) + "\n",
  );
}

// Dynamic, not static — a static `import` is resolved before ANY module-level
// code runs (including the register() call above), which is exactly what leaves
// it too early to see the hook.
const { pgQuery, _poolForTests } = await import("../src/platform/db/pg.ts");
const { TBL } = await import("../src/platform/db/keys.ts");
const store = await import("../src/platform/db/store.ts");
const { purgeExpired } = await import("../src/platform/db/pgStore.ts");

const {
  getJSON, getJSONMany, setJSON, setJSONEx, readArr, writeArr, delKeys,
  touchTTL, consume, incrWithTTL, ttlOf, extendTTL,
  editJSON, editArr, isConflict,
  claim, getIndex, release,
  sAdd, sRem, sMembers, sCard,
  zAdd, zRange, zRem, zCard,
  hIncrBy, bumpCounter, hIncrBounded, hGetAll, hDel, hSet, hSetNX,
  pfAdd, pfCount,
  xAdd, xAfter, xLastId,
  memoryPolicy, scanPrefix, delPrefix,
} = store;

// TWO SESSIONS MUST NOT SHARE A NAMESPACE — several agent sessions work this
// repo at once, and a second run entering the first one's keys surfaces as a
// wall of unrelated failures rather than as the namespace collision it is.
const SESSION = process.env.NOMPANY_TEST_SESSION || "pgstore";
const P = `test_pgstore_${SESSION}_`;
let n = 0;
const k = (name) => `${P}${name}:${(n += 1)}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- documents -------------------------------------------------------------

export async function testJsonRoundTripKeepsKeyOrder(t) {
  // THE REASON THE COLUMN IS `json` AND NOT `jsonb`. jsonb normalises key order
  // (length, then bytewise) and the goldens pin key order — addRow writes `id`
  // before the spread precisely because JSON.stringify emits insertion order.
  // jsonb would have failed them silently, on every row, forever; this is the
  // assertion that would notice the column type being "fixed".
  const key = k("doc");
  const doc = { zebra: 1, a: "two", middle: { b: [3, 4] }, aaaaaaaa: null };
  await setJSON(key, doc);
  const back = await getJSON(key);
  t.equal(JSON.stringify(back), JSON.stringify(doc), "the document comes back in the order it was written");
}

export async function testAbsentKeyReadsAsNullAndEmptyArray(t) {
  t.equal(await getJSON(k("missing")), null, "an absent key is null");
  t.equal(JSON.stringify(await readArr(k("missing"))), "[]", "...and an absent array is []");
}

export async function testBatchedReadKeepsTheCallersOrder(t) {
  // A SELECT ... = ANY() promises no order at all, and cachedReadMany's contract
  // is one value per key IN THE ORDER GIVEN. Sorting the result by key, or
  // trusting the database to hand them back in the bind array's order, gives
  // every employee somebody else's profile.
  const a = k("many-a"); const b = k("many-b"); const c = k("many-c");
  await setJSON(a, { which: "a" });
  await setJSON(c, { which: "c" });
  const got = await getJSONMany([c, k("many-absent"), a, b]);
  t.equal(got[0]?.which, "c", "the first key asked for is the first answer");
  t.equal(got[1], null, "an absent key reads as null in place");
  t.equal(got[2]?.which, "a", "and the rest stay lined up");
  t.equal(got[3], null, "a never-written key is null, not undefined");
}

export async function testWriteArrRoundTrips(t) {
  const key = k("arr");
  await writeArr(key, [{ id: "r1" }, { id: "r2" }]);
  const rows = await readArr(key);
  t.equal(rows.length, 2, "both rows came back");
  t.equal(rows[0].id, "r1", "in order");
}

// ---- expiry ----------------------------------------------------------------

export async function testAnExpiredRowReadsAsAbsentEverywhere(t) {
  // THE ONE BEHAVIOUR REDIS GAVE FOR FREE. Redis deleted an expired key;
  // Postgres does not, so the row is still sitting there and every read has to
  // carry `expires_at IS NULL OR expires_at > now()`. A read that forgets the
  // predicate serves a lapsed OTP challenge, an expired session index or a
  // released slug claim as though it were live — which is a security failure,
  // not a tidiness one. Asserted on EVERY reader, because the predicate has to
  // be on every one of them.
  const key = k("ttl-doc");
  await setJSONEx(key, { secret: "code" }, 0.4);
  t.equal((await getJSON(key))?.secret, "code", "readable while it lives");
  t.equal((await ttlOf(key)) > 0, true, "and reports time left");

  await sleep(700);
  t.equal(await getJSON(key), null, "getJSON reads it as absent once expired");
  t.equal(JSON.stringify(await readArr(key)), "[]", "readArr too");
  t.equal(await getIndex(key), null, "getIndex too");
  t.equal(await ttlOf(key), -2, "ttlOf reports -2, the Redis value for 'gone'");
  t.equal(await touchTTL(key, 60), false, "touchTTL cannot re-arm something already gone");
  t.equal(await consume(key), false, "consume refuses it rather than handing it over");
  t.equal((await getJSONMany([key]))[0], null, "the batched read agrees");
  t.equal((await scanPrefix(key)).length, 0, "and a prefix scan does not list it");
}

export async function testTtlOfDistinguishesNoExpiryFromGone(t) {
  const key = k("ttl-none");
  await setJSON(key, { x: 1 });
  t.equal(await ttlOf(key), -1, "-1 is 'exists, no expiry'");
  t.equal(await ttlOf(k("ttl-never-written")), -2, "-2 is 'gone'");
}

export async function testSetJsonClearsAnExistingExpiry(t) {
  // Redis's SET (without KEEPTTL) dropped the TTL, and a caller re-writing a
  // document expects it to stop expiring. A store that quietly preserved the
  // old expiry would delete a live document at a time nobody asked for.
  const key = k("ttl-cleared");
  await setJSONEx(key, { v: 1 }, 60);
  await setJSON(key, { v: 2 });
  t.equal(await ttlOf(key), -1, "a plain write clears the expiry");
}

export async function testTouchTtlRestartsTheCountdown(t) {
  const key = k("ttl-touch");
  await setJSONEx(key, { v: 1 }, 2);
  await sleep(300);
  t.equal(await touchTTL(key, 60), true, "an existing key can be re-armed");
  t.equal((await ttlOf(key)) > 50, true, "and the countdown starts again, it does not merely continue");
}

export async function testExtendTtlLengthensButNeverShortens(t) {
  // An escalating lockout has to push the release further out while leaving the
  // tally where it is. Shortening it here would hand an attacker a way to cut
  // their own lockout short by tripping the limit again.
  const key = k("ttl-extend");
  await setJSONEx(key, { v: 1 }, 60);
  t.equal(await extendTTL(key, 10), false, "already locked for longer — refused");
  t.equal((await ttlOf(key)) > 50, true, "...and the existing window is untouched");
  t.equal(await extendTTL(key, 600), true, "a longer window is accepted");
  t.equal((await ttlOf(key)) > 500, true, "and applied");
  t.equal(await extendTTL(k("ttl-extend-absent"), 60), false, "nothing to extend on an absent key");
}

export async function testConsumeSucceedsForExactlyOneCaller(t) {
  // Two parallel verifications of the same OTP must not both succeed. The
  // DELETE's own row count is the guarantee — one of two concurrent deletes
  // removes the row and the other removes nothing.
  const key = k("consume");
  await setJSONEx(key, { code: "123456" }, 60);
  const results = await Promise.all(Array.from({ length: 8 }, () => consume(key)));
  t.equal(results.filter(Boolean).length, 1, "exactly one of eight parallel consumers wins");
  t.equal(await getJSON(key), null, "and the challenge is gone");
}

export async function testIncrWithTtlSetsTheWindowOnTheFirstHitOnly(t) {
  const key = k("window");
  t.equal(await incrWithTTL(key, 60), 1, "first hit is 1");
  const first = await ttlOf(key);
  t.equal(first > 0 && first <= 60, true, "and opens the window");
  t.equal(await incrWithTTL(key, 60), 2, "second hit counts");
  t.equal(await incrWithTTL(key, 60), 3, "third too");
  t.equal((await ttlOf(key)) <= first, true, "a later hit does not restart the window — it is FIXED, not sliding");
}

export async function testIncrWithTtlStartsAFreshWindowAfterExpiry(t) {
  // The row survives its own expiry here, so a counter that did not treat an
  // expired row as absent would resume at 4 instead of 1 — a rate limit that
  // never lets the caller back in.
  const key = k("window-reset");
  await incrWithTTL(key, 0.4);
  await incrWithTTL(key, 0.4);
  await sleep(700);
  t.equal(await incrWithTTL(key, 60), 1, "an expired window counts from one again");
}

// ---- compare-and-set (invariant 8) -----------------------------------------

export async function testEditJsonCreatesWhenAbsentAndDecidesNotToWrite(t) {
  const key = k("edit");
  const made = await editJSON(key, (cur) => {
    if (cur) return { result: "already" };
    return { next: { hits: 1 }, result: "created" };
  });
  t.equal(made, "created", "create-if-absent is expressible");
  const again = await editJSON(key, (cur) => (cur ? { result: "already" } : { next: {}, result: "created" }));
  t.equal(again, "already", "a mutator may decline to write at all");
  t.equal((await getJSON(key))?.hits, 1, "and declining leaves the document alone");
}

export async function testTwentyConcurrentEditsAllLand(t) {
  // THE BUG THIS GUARDS. A collection lives in ONE key holding the whole array,
  // so read-modify-write loses a change whenever two overlap: both read the same
  // array and the second write erases the first. Two admins approving two
  // different join requests is enough. If the compare-and-set has silently
  // degraded, this lands fewer than twenty and the count says by how many.
  const key = k("cas-array");
  await writeArr(key, []);
  await Promise.all(Array.from({ length: 20 }, (_, i) =>
    editArr(key, (rows) => ({ next: [...rows, { id: `r${i}` }] }))));
  const rows = await readArr(key);
  t.equal(rows.length, 20, "twenty concurrent appends all landed");
  t.equal(new Set(rows.map((r) => r.id)).size, 20, "and none overwrote another");
}

export async function testAFunctionPatchIsReappliedNotComputedOnce(t) {
  // "Flip this field" has to stay a flip under contention. A mutator whose
  // result was computed once against the value first read would set the counter
  // to 1 twenty times over; re-applying it against the value that actually won
  // is what makes twenty increments twenty.
  const key = k("cas-flip");
  await setJSON(key, { count: 0 });
  await Promise.all(Array.from({ length: 20 }, () =>
    editJSON(key, (cur) => ({ next: { ...cur, count: (cur?.count || 0) + 1 } }))));
  t.equal((await getJSON(key))?.count, 20, "each attempt re-applied the patch to the row as it then was");
}

export async function testEditJsonEventuallyThrowsConflictError(t) {
  // A key that stays contended for every attempt must SAY so rather than
  // pretending the write landed. Forced here by writing a competing value from
  // inside the mutator itself, so every compare-and-set is refused by
  // construction — which is the only way to reach the exhaustion path
  // deterministically rather than hoping for a race.
  const key = k("cas-exhaust");
  await setJSON(key, { v: 0 });
  let attempts = 0;
  let caught = null;
  try {
    await editJSON(key, async (cur) => {
      attempts += 1;
      // Land a competing write between the read and this attempt's compare.
      await pgQuery(
        `UPDATE ${TBL.docs} SET ${TBL.docCols.value} = $2::json,
                ${TBL.docCols.version} = ${TBL.docCols.version} + 1
          WHERE ${TBL.docCols.key} = $1`,
        [key, JSON.stringify({ v: attempts })],
      );
      return { next: { ...cur, mine: true } };
    });
  } catch (e) {
    caught = e;
  }
  t.equal(isConflict(caught), true, "a permanently contended key raises ConflictError");
  t.equal(caught?.name, "ConflictError", "named so a route can answer 409 rather than guess");
  t.equal(caught?.key, key, "and the error names the key");
  t.equal(attempts, 64, "after exactly MAX_ATTEMPTS rounds — flat retries, not an exponential give-up");
}

export async function testEditJsonKeepTtlHonoursBothAnswers(t) {
  const kept = k("cas-keepttl");
  await setJSONEx(kept, { v: 1 }, 60);
  await editJSON(kept, (cur) => ({ next: { ...cur, v: 2 } }), { keepTTL: true });
  t.equal((await ttlOf(kept)) > 50, true, "keepTTL leaves the countdown where it was");

  const cleared = k("cas-noketttl");
  await setJSONEx(cleared, { v: 1 }, 60);
  await editJSON(cleared, (cur) => ({ next: { ...cur, v: 2 } }));
  t.equal(await ttlOf(cleared), -1, "and the default clears it, exactly as SET did");
}

// ---- uniqueness claims -----------------------------------------------------

export async function testClaimIsAtomicUnderConcurrency(t) {
  // A slug, a session index, an owner handle: exactly one caller may hold it.
  // Reproducing SET NX as read-then-write would have opened a race that never
  // existed in Redis; INSERT ... ON CONFLICT DO NOTHING is atomic in the
  // database's own terms, and this is the assertion that says so.
  const key = k("claim");
  const racers = 25;
  const results = await Promise.all(
    Array.from({ length: racers }, (_, i) => claim(key, `holder-${i}`)));
  const winners = results.filter(Boolean).length;
  t.equal(winners, 1, `exactly one of ${racers} racers claimed it`);
  const held = await getIndex(key);
  t.equal(/^holder-\d+$/.test(String(held)), true, "and the stored value is the winner's, whole");
}

export async function testClaimReturnsFalseWhenHeldAndReleaseFreesIt(t) {
  const key = k("claim-release");
  t.equal(await claim(key, "first"), true, "an unheld key is claimable");
  t.equal(await claim(key, "second"), false, "a held one is not");
  t.equal(await getIndex(key), "first", "and the holder is unchanged");
  await release(key);
  t.equal(await getIndex(key), null, "release frees it");
  t.equal(await claim(key, "third"), true, "and it can be retaken");
}

export async function testAnExpiredClaimIsRetakeableWithoutASweeper(t) {
  // Redis removed the key itself when the hold lapsed. Here the row is still
  // there, so the claim statement has to reclaim it — otherwise a lapsed slug
  // hold would be permanently unclaimable, which is worse than the race the
  // TTL was there to avoid.
  const key = k("claim-expiry");
  t.equal(await claim(key, "briefly", 0.4), true, "claimed with a hold");
  t.equal(await claim(key, "too-soon"), false, "and refused while the hold stands");
  await sleep(700);
  t.equal(await getIndex(key), null, "the lapsed hold reads as absent");
  t.equal(await claim(key, "later"), true, "and the same statement retakes it");
  t.equal(await getIndex(key), "later", "with the new holder's value");
}

// ---- sets and sorted sets --------------------------------------------------

export async function testSetsHoldUniqueMembers(t) {
  const key = k("set");
  await sAdd(key, "a");
  await sAdd(key, "b");
  await sAdd(key, "a");
  t.equal((await sMembers(key)).sort().join(","), "a,b", "a member added twice is held once");
  t.equal(await sCard(key), 2, "sCard counts members");
  await sRem(key, "a");
  t.equal((await sMembers(key)).join(","), "b", "sRem drops it");
  t.equal(await sCard(k("set-absent")), 0, "an absent set is empty, not an error");
}

export async function testConcurrentSetAddsAllLand(t) {
  const key = k("set-race");
  await Promise.all(Array.from({ length: 20 }, (_, i) => sAdd(key, `m${i}`)));
  t.equal(await sCard(key), 20, "twenty concurrent members all landed");
}

export async function testSortedSetOrdersByScoreAndPagesByRank(t) {
  const key = k("zset");
  await zAdd(key, 1, "a");
  await zAdd(key, 3, "c");
  await zAdd(key, 2, "b");
  t.equal((await zRange(key, 0, -1)).join(","), "a,b,c", "ascending by score");
  t.equal((await zRange(key, 0, 1, { rev: true })).join(","), "c,b", "newest-first paging reverses THEN slices");
  t.equal((await zRange(key, -2, -1)).join(","), "b,c", "negative indices count from the end");
  t.equal((await zRange(key, 5, 10)).length, 0, "a page past the end is empty, not an error");
  t.equal(await zCard(key), 3, "zCard counts without materialising the members");
  await zAdd(key, 0, "c");
  t.equal((await zRange(key, 0, -1)).join(","), "c,a,b", "re-adding a member moves it rather than duplicating it");
  await zRem(key, "a");
  t.equal((await zRange(key, 0, -1)).join(","), "c,b", "zRem drops the member");
}

// ---- counters and hashes ---------------------------------------------------

export async function testTwentyConcurrentIncrementsLandTwenty(t) {
  // HINCRBY was atomic server-side, so two tabs bumping one counter could not
  // lose a write the way a read-modify-write on JSON would. The compare-and-set
  // is what replaces that guarantee, and this is the assertion that it did.
  const key = k("hash-race");
  const results = await Promise.all(Array.from({ length: 20 }, () => hIncrBy(key, "hits")));
  t.equal((await hGetAll(key)).hits, "20", "twenty concurrent increments land twenty");
  t.equal(new Set(results).size, 20, "and every caller was told a different running total");
}

export async function testHashValuesAreStrings(t) {
  // Redis hash values ARE strings, and callers compare against `"2"`, not `2`.
  // Storing numbers would change what JSON.stringify emits for anything that
  // echoes a hash back — a golden-response change disguised as a type tidy-up.
  const key = k("hash-strings");
  await hIncrBy(key, "a");
  await hSet(key, "b", 7);
  const h = await hGetAll(key);
  t.equal(typeof h.a, "string", "an incremented field is a string");
  t.equal(h.b, "7", "and so is a set one");
  t.equal(JSON.stringify(await hGetAll(k("hash-absent"))), "{}", "an absent hash is {}");
}

export async function testHSetReportsWhetherTheFieldWasNew(t) {
  const key = k("hash-hset");
  t.equal(await hSet(key, "f", "1"), 1, "1 for a field that did not exist");
  t.equal(await hSet(key, "f", "2"), 0, "0 for one that did");
  t.equal((await hGetAll(key)).f, "2", "and the new value landed");
}

export async function testHDelRemovesOnlyPresentFields(t) {
  const key = k("hash-hdel");
  await hSet(key, "a", "1");
  await hSet(key, "b", "2");
  t.equal(await hDel(key, "a", "never-set"), 1, "only fields that were there are counted");
  t.equal(JSON.stringify(await hGetAll(key)), JSON.stringify({ b: "2" }), "and only they are gone");
  t.equal(await hDel(key), 0, "no fields named is a no-op");
}

export async function testHSetNxSetsOnlyWhenAbsent(t) {
  const key = k("hash-setnx");
  t.equal(await hSetNX(key, "decision", "declined"), true, "an absent field is set");
  t.equal(await hSetNX(key, "decision", "rated"), false, "and a present one is refused");
  t.equal((await hGetAll(key)).decision, "declined", "the first answer stands — a decision is not overwritten");
}

export async function testHSetNxHasExactlyOneWinnerUnderConcurrency(t) {
  // THE REASON IT IS A PRIMITIVE AND NOT AN hGetAll FOLLOWED BY AN hSet. Both
  // callers are recording a decision: a rating-versus-decline, and the day's
  // active count settled once. Read-then-write lets a second racer overwrite a
  // settled figure, and the loser would never know.
  const key = k("hash-setnx-race");
  const racers = 20;
  const results = await Promise.all(
    Array.from({ length: racers }, (_, i) => hSetNX(key, "settled", `writer-${i}`)));
  t.equal(results.filter(Boolean).length, 1, `exactly one of ${racers} racers set the field`);
  t.equal(/^writer-\d+$/.test((await hGetAll(key)).settled), true, "and the winner's value is what stands");
}

export async function testBumpCounterNeverGoesBackwards(t) {
  // INVARIANT 10. Deleting the newest invoice must not let the next create
  // reissue a number a client already holds — so the stored tally is never
  // lowered, and the caller-supplied floor may only ever RAISE it. The floor
  // exists for studios that already hold records: their tally starts at zero
  // and would otherwise hand out INV-0001 to a studio whose last invoice was
  // INV-0042.
  const key = k("counter");
  t.equal(await bumpCounter(key, "invoice"), 1, "the first number is 1");
  t.equal(await bumpCounter(key, "invoice"), 2, "then 2");
  t.equal(await bumpCounter(key, "invoice", 0), 3, "a floor of 0 does not reset it");
  t.equal(await bumpCounter(key, "invoice", 1), 4, "a floor BELOW the tally cannot lower it");
  t.equal(await bumpCounter(key, "invoice", 41), 42, "a floor above it seeds forward");
  t.equal(await bumpCounter(key, "invoice"), 43, "and the next call carries on from there");
  t.equal(await bumpCounter(key, "quotation", 9), 10, "a second field counts independently");
  t.equal((await hGetAll(key)).invoice, "43", "the tally is stored as a string, like every hash value");
}

export async function testConcurrentBumpsNeverIssueTheSameNumber(t) {
  // Two people creating an invoice in the same moment must get two different
  // numbers rather than both reading the same tally. A duplicate here is a
  // duplicate reference number in a client's hands.
  const key = k("counter-race");
  const numbers = await Promise.all(Array.from({ length: 20 }, () => bumpCounter(key, "invoice")));
  t.equal(new Set(numbers).size, 20, "twenty concurrent bumps issued twenty distinct numbers");
  t.equal(Math.max(...numbers), 20, "with no gaps — the highest is exactly the count");
}

export async function testBoundedHashStopsMintingNewFields(t) {
  // The public traffic endpoint takes a page label from the request body, so
  // anybody can invent as many distinct fields as they can send requests. An
  // existing field always counts; a new one counts only while there is room,
  // and everything past that folds into one bucket.
  const key = k("hash-bounded");
  const cap = { max: 3, overflow: "pv:__other" };
  await hIncrBounded(key, "pv:home", cap);
  await hIncrBounded(key, "pv:home", cap);
  await hIncrBounded(key, "pv:pricing", cap);
  await hIncrBounded(key, "pv:careers", cap);
  let h = await hGetAll(key);
  t.equal(h["pv:home"] === "2" && h["pv:pricing"] === "1", true, "real pages keep their own tallies");

  for (let i = 0; i < 50; i += 1) await hIncrBounded(key, `pv:junk-${i}`, cap);
  h = await hGetAll(key);
  t.equal(Object.keys(h).length, cap.max + 1, "a full hash stops minting new fields");
  t.equal(h["pv:__other"], "50", "and folds the rest into one bucket");
  await hIncrBounded(key, "pv:home", cap);
  t.equal((await hGetAll(key))["pv:home"], "3", "while a page already counted keeps counting");
}

export async function testDistinctCountIsNowExact(t) {
  // A DELIBERATE CHANGE, not a port that lost a property: this was a
  // HyperLogLog, accurate to ~0.81%, because Redis was the whole of the
  // product's storage and an unbounded set was one curl loop from filling the
  // instance. Here the members are one row of a table sized in gigabytes, so
  // the count is exact — and a caller comparing against a tolerance simply
  // always passes now.
  const key = k("hll");
  for (let i = 0; i < 200; i += 1) await pfAdd(key, `visitor-${i}`);
  t.equal(await pfAdd(key, "visitor-7"), 0, "re-adding a known member reports no change");
  t.equal(await pfAdd(key, "visitor-fresh"), 1, "a new one reports 1");
  t.equal(await pfCount(key), 201, "and the count is exact, not an estimate");
  t.equal(await pfCount(k("hll-absent")), 0, "an absent counter is 0");
}

// ---- the event stream (invariant 12) ---------------------------------------

export async function testStreamReplayReturnsExactlyWhatWasMissed(t) {
  // "The stream is truth; pub/sub is a doorbell" held because the id was the
  // client's cursor. It still is: a reader resuming from Last-Event-ID asks for
  // `id > cursor` and must be handed everything after it and nothing it already
  // has. Off by one in either direction is a dropped event or a duplicate one.
  const channel = k("stream");
  const ids = [];
  for (let i = 0; i < 5; i += 1) ids.push(await xAdd(channel, { type: "row.created", rowId: `r${i}` }));

  const missed = await xAfter(channel, ids[1], 100);
  t.equal(missed.length, 3, "everything after the second entry, and only that");
  t.equal(missed.map((e) => e.rowId).join(","), "r2,r3,r4", "in order, oldest first");
  t.equal(missed[0].type, "row.created", "with the fields it was written with");
  t.equal(missed[0].id, ids[2], "and the id a client would resume from next");

  t.equal((await xAfter(channel, ids[4], 100)).length, 0, "a caller already at the head is handed nothing");
  t.equal((await xAfter(channel, "", 100)).length, 5, "an empty cursor reads from the start of the log");
  t.equal((await xAfter(channel, "", 2)).length, 2, "and count bounds the page");
}

export async function testStreamIdsKeepTheCursorShapeClientsValidate(t) {
  // platform/realtime/events.ts validates a cursor as /^\d+-\d+$/ before
  // passing it back in, and "0-0" is the sentinel a fresh client adopts to mean
  // "start from now". A bare "42" fails that test, and the client would be
  // handed the WHOLE log instead of nothing — a replay storm that reads as a UI
  // bug rather than as a cursor-format change.
  const channel = k("stream-shape");
  t.equal(await xLastId(channel), "0-0", "an empty log's newest id is the start-from-now sentinel");
  const id = await xAdd(channel, { type: "x" });
  t.equal(/^\d+-\d+$/.test(String(id)), true, "an appended id matches the cursor shape clients validate");
  t.equal(await xLastId(channel), id, "and xLastId reports it");
}

export async function testStreamIsTrimmedToRoughlyMaxLen(t) {
  // Capped so the log cannot grow without bound even if nothing sweeps it.
  // Approximate on purpose, like MAXLEN ~: exact trimming would take a lock on
  // the channel for every append, which is the contention an append-only log
  // exists to avoid.
  const channel = k("stream-trim");
  for (let i = 0; i < 30; i += 1) await xAdd(channel, { i: String(i) }, 10);
  const all = await xAfter(channel, "", 1000);
  t.equal(all.length <= 12, true, `the log stayed near its cap (${all.length} entries)`);
  t.equal(all[all.length - 1].i, "29", "and it is the NEWEST entries that survived");
}

export async function testStreamsAreSeparatedByChannel(t) {
  // One channel is one former stream key. A reader of a studio's log must never
  // be handed another studio's events — which is what a missing channel
  // predicate would do, silently, in a single shared table.
  const a = k("stream-a"); const b = k("stream-b");
  await xAdd(a, { which: "a" });
  await xAdd(b, { which: "b" });
  const fromA = await xAfter(a, "", 100);
  t.equal(fromA.length, 1, "a channel sees only its own entries");
  t.equal(fromA[0].which, "a", "and they are the right ones");
}

// ---- prefix scan / delete (invariant 17) -----------------------------------

export async function testAnEmptyPrefixIsRefusedBeforeAnyQuery(t) {
  // AN AD-HOC SCRIPT'S delPrefix("") EMPTIED PRODUCTION ONCE. `key LIKE '%'` is
  // every row exactly as `*` was every key, so the move to Postgres changed
  // nothing about this hazard. Refused before a query is built, so a bad call
  // cannot even reach the database — and refused by BOTH doors, so a future
  // refactor of delPrefix cannot lose the check by routing around scanPrefix.
  for (const [name, fn] of [["scanPrefix", scanPrefix], ["delPrefix", delPrefix]]) {
    for (const bad of ["", "   ", null, undefined]) {
      let threw = false;
      try { await fn(bad); } catch (e) { threw = /refusing an empty prefix/.test(e.message); }
      t.equal(threw, true, `${name}(${JSON.stringify(bad)}) is refused`);
    }
  }
}

export async function testPrefixScanTreatsUnderscoresLiterally(t) {
  // `_` MATCHES ANY CHARACTER IN LIKE, and this suite's own namespace
  // (`test_pgstore_…`) is full of them. Unescaped, a test teardown would match
  // and delete rows belonging to a DIFFERENT namespace — including another
  // agent session's, which is a documented failure mode in this repo.
  const stem = `${P}esc_${(n += 1)}`;
  const mine = `${stem}_child`;
  const notMine = `${stem}Xchild`;
  await setJSON(mine, { v: 1 });
  await setJSON(notMine, { v: 2 });
  const found = await scanPrefix(`${stem}_`);
  t.equal(found.length, 1, "only the literal match is listed");
  t.equal(found[0], mine, "and it is the right one");
  await delKeys(notMine);
}

export async function testDelPrefixRemovesTheScopedKeysAndCountsThem(t) {
  const stem = `${P}sweep_${(n += 1)}:`;
  await setJSON(`${stem}a`, { v: 1 });
  await setJSON(`${stem}b`, { v: 2 });
  await setJSON(`${P}keep_${n}`, { v: 3 });
  t.equal((await scanPrefix(stem)).length, 2, "the scan sees both");
  t.equal(await delPrefix(stem), 2, "the delete reports both");
  t.equal((await scanPrefix(stem)).length, 0, "and they are gone");
  t.equal((await getJSON(`${P}keep_${n}`))?.v, 3, "while a key outside the prefix is untouched");
}

export async function testDelKeysCountsOnlyWhatWasActuallyThere(t) {
  const a = k("del-a"); const b = k("del-b");
  await setJSON(a, { v: 1 });
  t.equal(await delKeys(a, b), 1, "an absent key is not counted");
  t.equal(await delKeys(), 0, "no keys is a no-op");
}

// ---- infrastructure --------------------------------------------------------

export async function testMemoryPolicyReportsPostgresHonestly(t) {
  // This used to report Redis's maxmemory_policy, because under `allkeys-*` a
  // full instance silently deletes live invoices and sessions. Postgres has no
  // eviction at all — a full disk refuses writes, it never chooses a row to
  // drop — so `safe` is true for a stronger reason than a correctly-set option,
  // and `policy` says so rather than echoing a setting that does not exist.
  const mem = await memoryPolicy();
  t.equal(mem.safe, true, "nothing is ever evicted");
  t.equal(mem.policy, "postgres", "and it says which store it is describing");
  t.equal(mem.usedBytes > 0, true, "the size reading is real, not a default");
  t.equal(typeof mem.usedHuman === "string" && mem.usedHuman.length > 0, true, mem.usedHuman);
}

export async function testExpiredRowsCanBeReclaimed(t) {
  // Correctness never waits on this — every read already treats a lapsed row as
  // absent — but nothing reclaims the space either, and the high-churn keys are
  // precisely the expiring ones. Left alone, `documents` accumulates dead rows
  // forever.
  const key = k("purge");
  await setJSONEx(key, { v: 1 }, 0.3);
  await sleep(600);
  const stillThere = await pgQuery(
    `SELECT 1 FROM ${TBL.docs} WHERE ${TBL.docCols.key} = $1`, [key]);
  t.equal(stillThere.rowCount, 1, "an expired row survives its own expiry — Postgres deletes nothing");
  t.equal((await purgeExpired(1000)) >= 1, true, "and the sweeper is what reclaims it");
  const gone = await pgQuery(
    `SELECT 1 FROM ${TBL.docs} WHERE ${TBL.docCols.key} = $1`, [key]);
  t.equal(gone.rowCount, 0, "the row is actually removed");
}

// ---- teardown --------------------------------------------------------------

// SWEPT BY AN EXPLICIT KEY LIST (invariant 17), not by a predicate — the ids are
// read back first and then named in the delete, which is the same shape
// tests/pg-sweep.mjs uses. The read is deliberately NOT filtered by expiry:
// scanPrefix would hide this file's own lapsed fixtures, and leaving those
// behind is exactly the accumulation testExpiredRowsCanBeReclaimed is about.
async function sweepOwnNamespace() {
  const like = `${P.replace(/([\\%_])/g, "\\$1")}%`;
  const { rows } = await pgQuery(
    `SELECT ${TBL.docCols.key} AS key FROM ${TBL.docs} WHERE ${TBL.docCols.key} LIKE $1 ESCAPE '\\'`,
    [like],
  );
  const keys = rows.map((r) => r.key);
  let docs = 0;
  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100);
    const res = await pgQuery(
      `DELETE FROM ${TBL.docs} WHERE ${TBL.docCols.key} = ANY($1::text[])`, [batch]);
    docs += res.rowCount;
  }
  const { rows: channels } = await pgQuery(
    `SELECT DISTINCT ${TBL.eventCols.channel} AS channel FROM ${TBL.events}
      WHERE ${TBL.eventCols.channel} LIKE $1 ESCAPE '\\'`,
    [like],
  );
  let events = 0;
  if (channels.length) {
    const res = await pgQuery(
      `DELETE FROM ${TBL.events} WHERE ${TBL.eventCols.channel} = ANY($1::text[])`,
      [channels.map((c) => c.channel)],
    );
    events = res.rowCount;
  }
  return { docs, events };
}

function makeHarness() {
  let fails = 0;
  return {
    equal(actual, expected, message = "") {
      const cond = actual === expected;
      if (!cond) fails += 1;
      console.log(
        `${cond ? "  ok  " : " FAIL "} ${message}` +
        (cond ? "" : `  — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`),
      );
    },
    get fails() { return fails; },
  };
}

// import.meta.url is a file:// URL on every platform, but `file://${argv[1]}` is
// POSIX-only: on Windows argv[1] is a backslashed path, so the naive template
// never matches and the runner silently no-ops.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    if (!HAS_DATABASE_URL) process.exit(0);
    const tests = [
      testJsonRoundTripKeepsKeyOrder,
      testAbsentKeyReadsAsNullAndEmptyArray,
      testBatchedReadKeepsTheCallersOrder,
      testWriteArrRoundTrips,
      testAnExpiredRowReadsAsAbsentEverywhere,
      testTtlOfDistinguishesNoExpiryFromGone,
      testSetJsonClearsAnExistingExpiry,
      testTouchTtlRestartsTheCountdown,
      testExtendTtlLengthensButNeverShortens,
      testConsumeSucceedsForExactlyOneCaller,
      testIncrWithTtlSetsTheWindowOnTheFirstHitOnly,
      testIncrWithTtlStartsAFreshWindowAfterExpiry,
      testEditJsonCreatesWhenAbsentAndDecidesNotToWrite,
      testTwentyConcurrentEditsAllLand,
      testAFunctionPatchIsReappliedNotComputedOnce,
      testEditJsonEventuallyThrowsConflictError,
      testEditJsonKeepTtlHonoursBothAnswers,
      testClaimIsAtomicUnderConcurrency,
      testClaimReturnsFalseWhenHeldAndReleaseFreesIt,
      testAnExpiredClaimIsRetakeableWithoutASweeper,
      testSetsHoldUniqueMembers,
      testConcurrentSetAddsAllLand,
      testSortedSetOrdersByScoreAndPagesByRank,
      testTwentyConcurrentIncrementsLandTwenty,
      testHashValuesAreStrings,
      testHSetReportsWhetherTheFieldWasNew,
      testHDelRemovesOnlyPresentFields,
      testHSetNxSetsOnlyWhenAbsent,
      testHSetNxHasExactlyOneWinnerUnderConcurrency,
      testBumpCounterNeverGoesBackwards,
      testConcurrentBumpsNeverIssueTheSameNumber,
      testBoundedHashStopsMintingNewFields,
      testDistinctCountIsNowExact,
      testStreamReplayReturnsExactlyWhatWasMissed,
      testStreamIdsKeepTheCursorShapeClientsValidate,
      testStreamIsTrimmedToRoughlyMaxLen,
      testStreamsAreSeparatedByChannel,
      testAnEmptyPrefixIsRefusedBeforeAnyQuery,
      testPrefixScanTreatsUnderscoresLiterally,
      testDelPrefixRemovesTheScopedKeysAndCountsThem,
      testDelKeysCountsOnlyWhatWasActuallyThere,
      testMemoryPolicyReportsPostgresHonestly,
      testExpiredRowsCanBeReclaimed,
    ];
    let totalFails = 0;
    let failure = null;
    try {
      for (const test of tests) {
        console.log(`\n== ${test.name}`);
        const t = makeHarness();
        await test(t);
        totalFails += t.fails;
      }
    } catch (e) {
      failure = e;
    }
    // SWEPT WHETHER OR NOT THE RUN PASSED. A crashed test that leaves its
    // fixtures behind in a live, shared database is how the next session
    // inherits a namespace it did not write.
    const swept = await sweepOwnNamespace().catch((e) => ({ error: e.message }));
    console.log(`\nswept ${P}* — ${JSON.stringify(swept)}`);
    if (failure) console.error(failure);
    console.log(totalFails || failure ? `\n${totalFails} FAILURES\n` : "\nall passed\n");
    await _poolForTests().end();
    process.exit(totalFails || failure ? 1 : 0);
  })().catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
}
