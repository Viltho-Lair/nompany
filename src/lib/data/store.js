// Thin Redis access layer for the restructured model. Every repository in
// src/lib/data goes through these helpers; nothing else touches Redis directly.
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
import { getRedisClient } from "@/lib/data/redis";

const r = () => getRedisClient();

// ---- JSON documents --------------------------------------------------------
export async function getJSON(key) {
  const raw = await (await r()).get(key);
  return raw == null ? null : JSON.parse(raw);
}
export async function setJSON(key, value) {
  await (await r()).set(key, JSON.stringify(value));
}
// Self-expiring JSON document (OTP challenges). Raw SET ... EX via sendCommand
// for the same reason claim() uses it: immunity to node-redis option-API drift.
export async function setJSONEx(key, value, ttlSec) {
  await (await r()).sendCommand(["SET", key, JSON.stringify(value), "EX", String(ttlSec)]);
}
// Re-arm (or shorten) the expiry on a key that already exists. editJSON with
// keepTTL leaves the countdown where it was, which is right for a challenge and
// wrong for anything whose TTL means "idle for this long" — a live chat room
// has to start counting again on every message. Returns false when the key is
// already gone, which is how a caller learns its TTL elapsed mid-write.
export async function touchTTL(key, ttlSec) {
  return (await (await r()).expire(key, ttlSec)) === 1;
}
// Atomic single-use consume: returns true only for the caller that removed it,
// so two parallel verifications of the same code can never both succeed.
export async function consume(key) {
  return (await (await r()).del(key)) === 1;
}
// Fixed-window counter: INCR, and set the window on first hit. Returns the
// running count so callers can compare against their limit.
export async function incrWithTTL(key, ttlSec) {
  const client = await r();
  const n = await client.incr(key);
  if (n === 1) await client.expire(key, ttlSec);
  return n;
}
export async function readArr(key) {
  return (await getJSON(key)) || [];
}
export async function writeArr(key, rows) {
  await setJSON(key, rows);
}
export async function delKeys(...keys) {
  const flat = keys.flat().filter(Boolean);
  if (!flat.length) return 0;
  const client = await r();
  let n = 0;
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
const tagOf = (raw) => (raw == null ? "" : createHash("sha1").update(raw).digest("hex"));

async function getRaw(key) {
  return (await r()).get(key);
}

// EVALSHA first (the script body is uploaded once per Redis instance); EVAL is
// the fallback for a server that has not seen it yet, e.g. after a restart or a
// SCRIPT FLUSH.
// Returns { ok, actual } — `actual` being the value the key really held at the
// instant the write was refused (null when absent), which the caller re-applies
// against instead of issuing a fresh read.
async function cas(key, prevRaw, nextRaw, keepTTL) {
  const client = await r();
  const args = ["1", key, tagOf(prevRaw), nextRaw, keepTTL ? "1" : "0"];
  let reply;
  try {
    reply = await client.sendCommand(["EVALSHA", CAS_SHA, ...args]);
  } catch (e) {
    if (!/NOSCRIPT/i.test(e?.message || "")) throw e;
    reply = await client.sendCommand(["EVAL", CAS_LUA, ...args]);
  }
  const [ok, actual] = reply;
  return { ok: Number(ok) === 1, actual: actual === "" ? null : actual };
}

// Raised when a key stayed contended for every attempt. Callers that surface it
// should answer 409 — "someone else changed this, try again" — rather than
// pretend the write landed.
export class ConflictError extends Error {
  constructor(key) {
    super(`write conflict on ${key}`);
    this.name = "ConflictError";
    this.key = key;
  }
}
export const isConflict = (e) => e?.name === "ConflictError";

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
export async function editJSON(key, fn, { keepTTL = false } = {}) {
  let raw = await getRaw(key);                 // the only unconditional read
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const outcome = (await fn(raw == null ? null : JSON.parse(raw))) || {};
    if (!("next" in outcome)) return outcome.result;

    const { ok, actual } = await cas(key, raw, JSON.stringify(outcome.next), keepTTL);
    if (ok) return outcome.result;

    // Refused. The script already told us what is there now, so re-apply
    // against that — no second read. The jitter only stops retries from
    // marching in lockstep.
    raw = actual;
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * RETRY_JITTER_MS)));
  }
  // Losing this many rounds in a row is not ordinary contention — it means a hot
  // spot worth knowing about, so say so rather than failing silently.
  console.error(`[store] gave up after ${MAX_ATTEMPTS} contended attempts on ${key}`);
  throw new ConflictError(key);
}

// The array flavour: an absent key reads as [], matching readArr().
export async function editArr(key, fn, opts) {
  return editJSON(key, (cur) => fn(Array.isArray(cur) ? cur : []), opts);
}

// ---- uniqueness claims / TTL indexes ---------------------------------------
// claim(key, value[, ttlSec]) → true if WE claimed it (SET NX), false if taken.
export async function claim(key, value, ttlSec) {
  const args = ["SET", key, String(value), "NX"];
  if (ttlSec) args.push("EX", String(ttlSec));
  const res = await (await r()).sendCommand(args);
  return res === "OK";
}
export async function getIndex(key) {
  return (await r()).get(key);
}
export async function release(key) {
  await (await r()).del(key);
}

// ---- sets (used for ix:collab:<UserID>) ------------------------------------
export async function sAdd(key, member) {
  await (await r()).sAdd(key, String(member));
}
export async function sRem(key, member) {
  await (await r()).sRem(key, String(member));
}
export async function sMembers(key) {
  return (await r()).sMembers(key);
}

// ---- counters ---------------------------------------------------------------
// A hash of tallies. HINCRBY is atomic server-side, so two tabs bumping the same
// counter cannot lose a write the way a read-modify-write on JSON would.
export async function hIncrBy(key, field, by = 1) {
  return (await r()).hIncrBy(key, String(field), by);
}
export async function hGetAll(key) {
  return (await r()).hGetAll(key);
}
export async function hDel(key, ...fields) {
  if (!fields.length) return 0;
  return (await r()).hDel(key, fields.map(String));
}

// ---- streams (the append-only event log) -----------------------------------
// A Stream is the one Redis type that is ordered, durable and addressable by
// cursor at the same time, which is exactly what "replay what I missed" needs.
// Entry ids are monotonic and assigned by Redis, so they ARE the cursor.

// MAXLEN ~ n trims approximately (to whole nodes), which is far cheaper than
// exact trimming and keeps the log bounded without a sweeper.
export async function xAdd(key, fields, maxLen) {
  const argv = ["XADD", key];
  if (maxLen) argv.push("MAXLEN", "~", String(maxLen));
  argv.push("*");
  for (const [field, value] of Object.entries(fields)) argv.push(field, String(value ?? ""));
  return (await r()).sendCommand(argv);
}

// Entries strictly AFTER `cursor`, oldest first. The leading "(" is Redis's
// exclusive-range marker, so the caller never re-receives the entry it already
// has. An empty cursor reads from the very start of the (already trimmed) log.
export async function xAfter(key, cursor, count) {
  const start = cursor ? `(${cursor}` : "-";
  const reply = await (await r()).sendCommand(["XRANGE", key, start, "+", "COUNT", String(count)]);
  return (reply || []).map(([id, flat]) => {
    const fields = {};
    for (let i = 0; i < flat.length; i += 2) fields[flat[i]] = flat[i + 1];
    return { id, ...fields };
  });
}

// The newest id, or "0-0" for an empty log — what a fresh client adopts so it
// starts from "now" instead of replaying history it never needed.
export async function xLastId(key) {
  const reply = await (await r()).sendCommand(["XREVRANGE", key, "+", "-", "COUNT", "1"]);
  return reply?.[0]?.[0] || "0-0";
}

// ---- prefix scan / delete (THE cascade primitive) --------------------------
export async function scanPrefix(prefix) {
  const client = await r();
  const keys = [];
  for await (const batch of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 500 })) {
    keys.push(...(Array.isArray(batch) ? batch : [batch]));
  }
  return keys;
}
export async function delPrefix(prefix) {
  const keys = await scanPrefix(prefix);
  return delKeys(keys);
}
