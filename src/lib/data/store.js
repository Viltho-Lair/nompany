// Thin Redis access layer for the restructured model. Every repository in
// src/lib/data goes through these helpers; nothing else touches Redis directly.
//
// Design notes:
//  • JSON documents/arrays are plain string keys (JSON.stringify), matching the
//    rest of the app.
//  • Uniqueness claims use raw SET ... NX [EX ttl] via sendCommand so the code
//    is immune to node-redis option-API drift between versions.
//  • Prefix deletion (the cascade primitive) SCANs with MATCH and DELs in
//    batches — safe on any DB size.

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
