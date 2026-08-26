// Thin Redis access layer for the restructured model. Every repository goes
// through these helpers; nothing else touches Redis directly.
//
// WHY THE VALUES ARE `unknown` AND NOT `any`. What a key holds is decided by the
// repository that wrote it, and this layer has no way to know. `any` would let
// that ignorance travel: every caller would silently receive a value it could
// dereference however it liked, and the strictness this folder just gained would
// stop at the first `getJSON`. `unknown` makes the caller say what it expects,
// which is where the knowledge actually is — so the generic parameter on each
// read is the honest form, defaulting to `unknown` for callers that do not care.
//
// Design notes:
//  • JSON documents/arrays are plain string keys (JSON.stringify), matching the
//    rest of the app.
//  • Uniqueness claims use raw SET ... NX [EX ttl] via sendCommand so the code
//    is immune to node-redis option-API drift between versions.
//  • EVERY read-modify-write goes through editArr/editJSON (compare-and-set).
//    readArr/writeArr and getJSON/setJSON remain for pure reads and for blind
//    whole-value writes that depend on nothing they overwrite.
//  • Prefix deletion (the cascade primitive) SCANs with MATCH and DELs in
//    batches — safe on any DB size.

import { createHash } from "node:crypto";
import { cachedRead, invalidate } from "./requestCache";
import { getRedisClient } from "./redis";
import { log } from "@/platform/http/observability";

const r = () => getRedisClient();

/** A row in a collection. Repositories narrow this; the store never does. */
export type Row = Record<string, unknown>;

// ---- JSON documents --------------------------------------------------------
export async function getJSON<T = unknown>(key: string): Promise<T | null> {
  // THE ONE READ FUNNEL, so this is the one place the request cache attaches.
  // editJSON deliberately does NOT come through here — see requestCache.js.
  return cachedRead<T | null>(key, async () => {
    const raw = await (await r()).get(key);
    return raw == null ? null : (JSON.parse(raw) as T);
  });
}
export async function setJSON(key: string, value: unknown): Promise<void> {
  await (await r()).set(key, JSON.stringify(value));
  invalidate(key);
}
// Self-expiring JSON document (OTP challenges). Raw SET ... EX via sendCommand
// for the same reason claim() uses it: immunity to node-redis option-API drift.
export async function setJSONEx(key: string, value: unknown, ttlSec: number): Promise<void> {
  await (await r()).sendCommand(["SET", key, JSON.stringify(value), "EX", String(ttlSec)]);
  invalidate(key);
}
// Re-arm (or shorten) the expiry on a key that already exists. editJSON with
// keepTTL leaves the countdown where it was, which is right for a challenge and
// wrong for anything whose TTL means "idle for this long" — a live chat room
// has to start counting again on every message. Returns false when the key is
// already gone, which is how a caller learns its TTL elapsed mid-write.
export async function touchTTL(key: string, ttlSec: number): Promise<boolean> {
  return (await (await r()).expire(key, ttlSec)) === 1;
}
// Atomic single-use consume: returns true only for the caller that removed it,
// so two parallel verifications of the same code can never both succeed.
export async function consume(key: string): Promise<boolean> {
  invalidate(key);
  return (await (await r()).del(key)) === 1;
}
// Fixed-window counter: INCR, and set the window on first hit. Returns the
// running count so callers can compare against their limit.
export async function incrWithTTL(key: string, ttlSec: number): Promise<number> {
  const client = await r();
  const n = await client.incr(key);
  if (n === 1) await client.expire(key, ttlSec);
  return n;
}
// Seconds left on a key: -1 when it has no expiry, -2 when it is gone. A
// lockout is only useful if the caller can say HOW LONG for, and the TTL Redis
// is already holding is that answer — there is nothing to store separately.
export async function ttlOf(key: string): Promise<number> {
  return (await r()).ttl(key);
}
// LENGTHEN an existing window without restarting the count. `incrWithTTL` sets
// the expiry on the first hit only, which is right for a fixed window and wrong
// for an escalating lockout: tripping a limit has to be able to push the
// release further out while leaving the tally where it is.
export async function extendTTL(key: string, ttlSec: number): Promise<boolean> {
  const client = await r();
  const current = await client.ttl(key);
  if (current === -2) return false;              // gone; nothing to extend
  if (current >= ttlSec) return false;           // already locked for longer
  return (await client.expire(key, ttlSec)) === 1;
}
export async function readArr<T = Row>(key: string): Promise<T[]> {
  return (await getJSON<T[]>(key)) || [];
}
export async function writeArr(key: string, rows: readonly unknown[]): Promise<void> {
  await setJSON(key, rows);
}
export async function delKeys(...keys: (string | string[])[]): Promise<number> {
  const flat = keys.flat().filter(Boolean);
  if (!flat.length) return 0;
  const client = await r();
  let n = 0;
  invalidate(flat);
  for (let i = 0; i < flat.length; i += 100) n += await client.del(flat.slice(i, i + 100));
  return n;
}

// ---- atomic read-modify-write ----------------------------------------------
// A collection lives in ONE key holding the whole array, so "read it, change one
// row, write it back" loses data whenever two of those overlap: both read the
// same array, and the second write erases the first one's change. Two people
// ticking different checklist items, or two admins approving two different join
// requests, is enough.
//
// editArr/editJSON close that window with a COMPARE-AND-SET: we remember what
// the key held when we read it, and the write only lands if the key STILL holds
// exactly that. If someone else got in first our write is refused, and we
// re-read and re-apply — so the second writer builds on the first one's result
// instead of erasing it.
//
// The comparison happens inside Redis, which is single-threaded, so
// read-compare-write is indivisible. It compares a SHA-1 of the stored string,
// which means we send up a 40-byte tag rather than a second copy of the
// document. The cost is therefore identical to the unsafe write it replaces —
// one read, one write. No lock, no extra keys, no second connection.
//
// This also gives us ordering for free: Redis executes commands on the same key
// in arrival order, so concurrent writers to one collection are serialised by
// the database itself. That is the FIFO-per-collection guarantee; it does not
// need a broker.
// On a REFUSED write the script hands back the value that is actually there, so
// a retry does not need a second GET. One round trip per attempt, not two.
// (Our values are always JSON, never the empty string, so "" unambiguously
// means "the key is absent".)
const CAS_LUA = `
local cur = redis.call('GET', KEYS[1])
local tag = ''
if cur then tag = redis.sha1hex(cur) end
if tag ~= ARGV[1] then return {0, cur or ''} end
if ARGV[3] == '1' then
  redis.call('SET', KEYS[1], ARGV[2], 'KEEPTTL')
else
  redis.call('SET', KEYS[1], ARGV[2])
end
return {1, ''}
`;
const CAS_SHA = createHash("sha1").update(CAS_LUA).digest("hex");

// The tag for "this is what the key held". A missing key tags as "" so that
// create-if-absent is expressible: if someone else creates it first, our write
// is refused and we retry against their value.
const tagOf = (raw: string | null) => (raw == null ? "" : createHash("sha1").update(raw).digest("hex"));

async function getRaw(key: string): Promise<string | null> {
  return (await r()).get(key);
}

// EVALSHA first (the script body is uploaded once per Redis instance); EVAL is
// the fallback for a server that has not seen it yet, e.g. after a restart or a
// SCRIPT FLUSH.
// Returns { ok, actual } — `actual` being the value the key really held at the
// instant the write was refused (null when absent), which the caller re-applies
// against instead of issuing a fresh read.
async function cas(key: string, prevRaw: string | null, nextRaw: string, keepTTL: boolean) {
  const client = await r();
  const args = ["1", key, tagOf(prevRaw), nextRaw, keepTTL ? "1" : "0"];
  let reply;
  try {
    reply = await client.sendCommand(["EVALSHA", CAS_SHA, ...args]);
  } catch (e) {
    if (!/NOSCRIPT/i.test((e as Error)?.message || "")) throw e;
    reply = await client.sendCommand(["EVAL", CAS_LUA, ...args]);
  }
  const [ok, actual] = reply as unknown as [unknown, string];
  return { ok: Number(ok) === 1, actual: actual === "" ? null : actual };
}

// Raised when a key stayed contended for every attempt. Callers that surface it
// should answer 409 — "someone else changed this, try again" — rather than
// pretend the write landed.
export class ConflictError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`write conflict on ${key}`);
    this.name = "ConflictError";
    this.key = key;
  }
}
export const isConflict = (e: unknown): e is ConflictError =>
  (e as { name?: string })?.name === "ConflictError";

// Every contended round has exactly ONE winner, so N writers piling onto one key
// need up to N rounds to all get through. This is a queue draining, not a
// livelock — which is why the wait between attempts stays SMALL and flat.
// Exponential backoff would be actively wrong here: it would idle the key while
// writers that could have made progress sat waiting. 64 covers a burst far
// larger than any single nompany collection realistically sees, and costs
// nothing when uncontended (the loop exits on the first success).
const MAX_ATTEMPTS = 64;
const RETRY_JITTER_MS = 15;

// editJSON(key, fn) — fn receives the CURRENT value (null when the key is
// absent) and returns:
//   { next, result }  write `next`, then return `result` to the caller
//   { result }        decide not to write at all (a rejected update, a no-op)
// fn may run more than once, so it must be a pure function of what it is given.
/**
 * What `fn` may hand back: a write, or a decision not to write.
 *
 * TWO SHAPES, NOT ONE OPTIONAL FIELD. `{ result }` and `{ next, ... }` are
 * different answers — "I looked and there is nothing to do" versus "write this"
 * — and a single optional `next` would make `next: undefined` mean the first,
 * which is exactly the confusion `"next" in outcome` was written to avoid.
 *
 * `result` IS OPTIONAL ON THE WRITE, because plenty of writes have nothing to
 * hand back: a cascade deleting rows says `{ next }` and means it. Those
 * callers leave R as void, and `undefined` is the honest value for them.
 */
export type EditOutcome<V, R> = { result: R } | { next: V; result?: R };

export async function editJSON<V = unknown, R = unknown>(
  key: string,
  fn: (current: V | null) => EditOutcome<V, R> | Promise<EditOutcome<V, R>>,
  { keepTTL = false }: { keepTTL?: boolean } = {},
): Promise<R> {
  let raw = await getRaw(key);                 // the only unconditional read
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const outcome = (await fn(raw == null ? null : (JSON.parse(raw) as V))) || ({} as EditOutcome<V, R>);
    if (!("next" in outcome)) return outcome.result;

    const { ok, actual } = await cas(key, raw, JSON.stringify(outcome.next), keepTTL);
    if (ok) {
      // THE WRITE LANDED, so any cached copy of this key is now a lie. Note
      // that editJSON's own read above deliberately bypasses the cache: a
      // compare-and-set must see the value as it actually stands, never a
      // remembered one.
      invalidate(key);
      return outcome.result as R;
    }

    // Refused. The script already told us what is there now, so re-apply
    // against that — no second read. The jitter only stops retries from
    // marching in lockstep.
    raw = actual;
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * RETRY_JITTER_MS)));
  }
  // Losing this many rounds in a row is not ordinary contention — it means a hot
  // spot worth knowing about, so say so rather than failing silently.
  log.error(`[store] gave up after ${MAX_ATTEMPTS} contended attempts on ${key}`);
  throw new ConflictError(key);
}

// The array flavour: an absent key reads as [], matching readArr().
export async function editArr<T = Row, R = unknown>(
  key: string,
  fn: (rows: T[]) => EditOutcome<T[], R> | Promise<EditOutcome<T[], R>>,
  opts?: { keepTTL?: boolean },
): Promise<R> {
  return editJSON<T[], R>(key, (cur) => fn(Array.isArray(cur) ? cur : []), opts);
}

// ---- uniqueness claims / TTL indexes ---------------------------------------
// claim(key, value[, ttlSec]) → true if WE claimed it (SET NX), false if taken.
export async function claim(key: string, value: string, ttlSec?: number): Promise<boolean> {
  const args = ["SET", key, String(value), "NX"];
  if (ttlSec) args.push("EX", String(ttlSec));
  const res = await (await r()).sendCommand(args);
  // A claim that landed changes what the index says, so anything remembering the
  // old answer is now wrong. A claim that did NOT land changes nothing — but
  // invalidating anyway costs a Map.delete and removes the need to be right
  // about which case this was.
  invalidate(key);
  return (res as unknown) === "OK";
}
// CACHED LIKE getJSON, and for a sharper reason. An index read is the FIRST half
// of every "resolve a name to an id" pair — ix:slug, ix:session, ix:owner — so
// it is exactly the read a prefetch is trying to get out of the critical path.
// Leaving it uncached made the studio prefetch cost an extra command rather than
// saving a wave: the value was fetched twice, once to warm and once for real.
export async function getIndex(key: string): Promise<string | null> {
  return cachedRead(key, async () => (await r()).get(key));
}
export async function release(key: string): Promise<void> {
  invalidate(key);
  await (await r()).del(key);
}

// ---- sets (used for ix:collab:<UserID>) ------------------------------------
export async function sAdd(key: string, member: string): Promise<void> {
  await (await r()).sAdd(key, String(member));
  invalidate(key);
}
export async function sRem(key: string, member: string): Promise<void> {
  await (await r()).sRem(key, String(member));
  invalidate(key);
}
export async function sMembers(key: string): Promise<string[]> {
  return (await r()).sMembers(key);
}

// ---- sorted sets & set cardinality (index primitives) ----------------------
// Native atomic ops, the one allowed non-CAS write: each add/remove is atomic
// per element, so concurrent index writers never clobber a whole value.
export async function zAdd(key: string, score: number, member: string): Promise<void> {
  await (await r()).zAdd(key, [{ score, value: member }]);
  invalidate(key);
}
export async function zRange(
  key: string, start: number, stop: number, opts: { rev?: boolean } = {},
): Promise<string[]> {
  return (await r()).zRange(key, start, stop, opts.rev ? { REV: true } : undefined);
}
export async function zRem(key: string, member: string): Promise<void> {
  await (await r()).zRem(key, member);
  invalidate(key);
}
export async function sCard(key: string): Promise<number> {
  return (await r()).sCard(key);
}

// ---- counters ---------------------------------------------------------------
// A hash of tallies. HINCRBY is atomic server-side, so two tabs bumping the same
// counter cannot lose a write the way a read-modify-write on JSON would.
export async function hIncrBy(key: string, field: string, by = 1): Promise<number> {
  return (await r()).hIncrBy(key, String(field), by);
}
// THE NEXT NUMBER IN A SEQUENCE THAT NEVER GOES BACKWARDS.
//
// HINCRBY alone would do it, except for the studios that already hold records:
// their tally starts at zero and would hand out INV-0001 to a studio whose last
// invoice was INV-0042. So the caller passes a FLOOR — the highest reference it
// can see on the rows it already has in hand — and the counter is lifted to it
// before being stepped. That makes the first call self-seeding and every call
// after it a plain increment, with no migration to run.
//
// Read, compare and write happen inside one Lua call, so two people creating an
// invoice in the same moment get two different numbers rather than both reading
// the same tally. Redis is single-threaded; the script is the lock.
const BUMP_LUA = `
local cur = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
local floor = tonumber(ARGV[2])
if floor > cur then cur = floor end
cur = cur + 1
redis.call('HSET', KEYS[1], ARGV[1], cur)
return cur
`;
const BUMP_SHA = createHash("sha1").update(BUMP_LUA).digest("hex");

export async function bumpCounter(key: string, field: string, floor = 0): Promise<number> {
  const client = await r();
  const args = ["1", key, String(field), String(Math.max(0, Math.floor(Number(floor) || 0)))];
  try {
    return Number(await client.sendCommand(["EVALSHA", BUMP_SHA, ...args]));
  } catch (e) {
    if (!/NOSCRIPT/i.test((e as Error)?.message || "")) throw e;
    return Number(await client.sendCommand(["EVAL", BUMP_LUA, ...args]));
  }
}

// A TALLY THAT CANNOT GROW A NEW FIELD FOREVER.
//
// `hIncrBy` on a caller-supplied field name is unbounded by construction: the
// public traffic endpoint takes a page label from the request body, so anybody
// can invent as many distinct fields as they can send requests. Redis is this
// product's only storage, and a full instance fails every write in it.
//
// So: an existing field always counts; a NEW field counts only while the hash
// is under its ceiling, and everything past that folds into one overflow field.
// Real pages keep their own tallies, invented ones cost a single bucket, and
// nothing has to be maintained as the site's page list changes.
//
// One EVALSHA — the read, the compare and the write are indivisible, so two
// requests arriving together cannot both see room for the last field.
const HINCR_BOUNDED_LUA = `
local field = ARGV[1]
if redis.call('HEXISTS', KEYS[1], field) == 1 then
  return redis.call('HINCRBY', KEYS[1], field, 1)
end
if redis.call('HLEN', KEYS[1]) >= tonumber(ARGV[2]) then
  return redis.call('HINCRBY', KEYS[1], ARGV[3], 1)
end
return redis.call('HINCRBY', KEYS[1], field, 1)
`;
const HINCR_BOUNDED_SHA = createHash("sha1").update(HINCR_BOUNDED_LUA).digest("hex");

export async function hIncrBounded(
  key: string,
  field: string,
  { max, overflow }: { max: number; overflow: string },
): Promise<number> {
  const client = await r();
  const args = ["1", key, String(field), String(max), String(overflow)];
  try {
    return Number(await client.sendCommand(["EVALSHA", HINCR_BOUNDED_SHA, ...args]));
  } catch (e) {
    if (!/NOSCRIPT/i.test((e as Error)?.message || "")) throw e;
    return Number(await client.sendCommand(["EVAL", HINCR_BOUNDED_LUA, ...args]));
  }
}

// ---- approximate cardinality (HyperLogLog) ---------------------------------
// "How many distinct visitors today" asked of a structure that costs the same
// whether the answer is ten or ten million — about 12 KB at its widest, and far
// less while the count is low. A SET answers it exactly and grows without
// bound, which for a value nobody needs to the unit is the wrong trade twice
// over: it is the expensive answer AND the one an anonymous caller can inflate.
export async function pfAdd(key: string, member: string): Promise<number> {
  return (await r()).pfAdd(key, String(member));
}
export async function pfCount(key: string): Promise<number> {
  return (await r()).pfCount(key);
}

export async function hGetAll(key: string): Promise<Record<string, string>> {
  return (await r()).hGetAll(key);
}
export async function hDel(key: string, ...fields: string[]): Promise<number> {
  if (!fields.length) return 0;
  return (await r()).hDel(key, fields.map(String));
}
// A PLAIN SET, next to `hIncrBy`/`hGetAll`/`hDel` above. The nightly rollup
// reconcile (api/cron/main-rollup) writes a computed total rather than a
// delta, so HINCRBY is the wrong primitive for it — this is HSET.
export async function hSet(key: string, field: string, value: string | number): Promise<number> {
  return (await r()).hSet(key, field, String(value));
}

// ---- streams (the append-only event log) -----------------------------------
// A Stream is the one Redis type that is ordered, durable and addressable by
// cursor at the same time, which is exactly what "replay what I missed" needs.
// Entry ids are monotonic and assigned by Redis, so they ARE the cursor.

// MAXLEN ~ n trims approximately (to whole nodes), which is far cheaper than
// exact trimming and keeps the log bounded without a sweeper.
export async function xAdd(key: string, fields: Record<string, unknown>, maxLen?: number): Promise<unknown> {
  const argv = ["XADD", key];
  if (maxLen) argv.push("MAXLEN", "~", String(maxLen));
  argv.push("*");
  for (const [field, value] of Object.entries(fields)) argv.push(field, String(value ?? ""));
  return (await r()).sendCommand(argv);
}

// Entries strictly AFTER `cursor`, oldest first. The leading "(" is Redis's
// exclusive-range marker, so the caller never re-receives the entry it already
// has. An empty cursor reads from the very start of the (already trimmed) log.
/** One stream entry: its id, plus whatever fields were written into it. */
export type StreamEntry = { id: string } & Record<string, string>;

export async function xAfter(key: string, cursor: string, count: number): Promise<StreamEntry[]> {
  const start = cursor ? `(${cursor}` : "-";
  // XRANGE replies as [[id, [field, value, field, value, ...]], ...] — the flat
  // field list is the wire format, and unflattening it is this function's job.
  const reply = await (await r()).sendCommand(["XRANGE", key, start, "+", "COUNT", String(count)]);
  return ((reply || []) as unknown as [string, string[]][]).map(([id, flat]) => {
    const fields: Record<string, string> = {};
    for (let i = 0; i < flat.length; i += 2) fields[flat[i]] = flat[i + 1];
    return { id, ...fields };
  });
}

// The newest id, or "0-0" for an empty log — what a fresh client adopts so it
// starts from "now" instead of replaying history it never needed.
export async function xLastId(key: string): Promise<string> {
  const reply = (await (await r()).sendCommand(["XREVRANGE", key, "+", "-", "COUNT", "1"])) as unknown as
    [string, string[]][] | null;
  return reply?.[0]?.[0] || "0-0";
}

// ---- infrastructure invariants ---------------------------------------------
// THE ONE SETTING THAT CAN LOSE DATA WITHOUT ANY CODE BEING WRONG.
//
// Every byte this product owns is in Redis. Under an `allkeys-*` eviction
// policy a full instance does not refuse writes — it silently deletes whatever
// it judges least recently used, which here means live invoices, sessions and
// controlled documents. `noeviction` turns that same condition into a loud,
// obvious write failure instead, which is the outcome we want.
//
// It is correct today. It is checked anyway, because it lives in the Redis
// Cloud console rather than in this repository: nothing here would notice it
// being changed, and the change is invisible until the day it matters. CONFIG
// GET is restricted on this plan, so the reading is taken from INFO.
//
// Reported rather than enforced — the app cannot set it, and refusing to serve
// over it would turn a warning into an outage.
export async function memoryPolicy() {
  const raw = await (await r()).info("memory");
  const field = (k: string) => (raw.split(/\r?\n/).find((l) => l.startsWith(`${k}:`)) || "").split(":")[1]?.trim() || "";
  const policy = field("maxmemory_policy");
  return {
    policy,
    safe: policy === "noeviction",
    usedBytes: Number(field("used_memory")) || 0,
    usedHuman: field("used_memory_human"),
    peakHuman: field("used_memory_peak_human"),
    maxBytes: Number(field("maxmemory")) || 0,
  };
}

// ---- prefix scan / delete (THE cascade primitive) --------------------------
// AN EMPTY PREFIX MATCHES THE ENTIRE KEYSPACE. `${""}*` is `*`, so scanPrefix("")
// enumerates every key and delPrefix("") deletes every key — in a single, shared,
// live Redis, that is the whole database. It has happened: an ad-hoc script's
// delPrefix("") emptied production once, the exact hazard invariant #1 in CLAUDE.md
// is about.
//
// There is NO legitimate whole-keyspace scan in this product — every sweep is
// scoped (SWEEP_SCOPES) and every cascade targets an id — so an empty prefix is
// always a bug, never an intent. Refuse it BEFORE any client call, so a bad call
// cannot even reach Redis. A non-empty prefix (a key builder, or a test's own
// KEY_PREFIX like "test_") passes untouched: this guards the catastrophe, not the
// legitimate namespaced teardown.
function assertScopedPrefix(prefix: string, op: string): void {
  if (!prefix || !prefix.trim()) {
    throw new Error(
      `store.${op}: refusing an empty prefix — "${String(prefix)}*" matches every key in the ` +
        "shared database. Pass a scoped prefix built from keys.ts, never an empty string.",
    );
  }
}

export async function scanPrefix(prefix: string): Promise<string[]> {
  assertScopedPrefix(prefix, "scanPrefix");
  const client = await r();
  const keys: string[] = [];
  for await (const batch of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 500 })) {
    keys.push(...(Array.isArray(batch) ? batch : [batch]));
  }
  return keys;
}
export async function delPrefix(prefix: string): Promise<number> {
  // Guarded here too — not only via scanPrefix — so the refusal names the delete
  // and a future refactor of delPrefix cannot lose the check.
  assertScopedPrefix(prefix, "delPrefix");
  const keys = await scanPrefix(prefix);
  return delKeys(keys);
}
