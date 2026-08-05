import fs from "fs";
import path from "path";
import { createClient } from "redis";

// Data store with two backends:
//   * Redis (production) — ONE key PER COLLECTION (`megatech:c:<name>`) plus a
//     settings key (`megatech:settings`). A read/write touches only the relevant
//     slice, so a small read (e.g. services) no longer deserializes the whole
//     database, and a write no longer re-serializes unrelated collections.
//   * Local JSON file (dev) — data/db.json, seeded from data/seed.json.
//
// MIGRATION IS NON-DESTRUCTIVE: the original single document still lives under
// `megatech:db` and is used as a READ-ONLY fallback + one-time seed. The first
// time a collection (or settings) is read and its own key is absent, it is
// backfilled from that legacy document. The legacy key is never modified again,
// so a rollback is simply "ignore the per-collection keys" — no data is lost.
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const SEED_PATH = path.join(DATA_DIR, "seed.json");
const LEGACY_KEY = "megatech:db";
const SETTINGS_KEY = "megatech:settings";
const colKey = (name) => `megatech:c:${name}`;

const useRedis = Boolean(process.env.REDIS_URL);

// Short-lived per-collection cache + in-flight coalescing so a burst of parallel
// reads for the same collection collapses into one backend round-trip (fixes the
// old thundering-herd where N concurrent misses each parsed the whole DB).
const CACHE_TTL_MS = 1500;
const cache = new Map();      // key -> { data, at }
const inflight = new Map();   // key -> Promise

function seed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
}

// ---- Redis client ---------------------------------------------------------
let clientPromise = null;

async function getClient() {
  if (clientPromise) {
    const existing = await clientPromise;
    if (existing.isOpen) return existing;
    clientPromise = null;
  }
  clientPromise = (async () => {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => console.error("Redis client error:", err.message));
    await client.connect();
    return client;
  })();
  return clientPromise;
}

// Shared connected Redis client, reused by the media store (src/lib/media.js).
export function getRedisClient() {
  return getClient();
}

// ---- Legacy single-doc (read-only fallback + one-time seed) ----------------
let legacyCache = null;
let legacyAt = 0;
async function legacyDoc() {
  if (legacyCache && Date.now() - legacyAt < CACHE_TTL_MS) return legacyCache;
  const client = await getClient();
  const raw = await client.get(LEGACY_KEY);
  let data;
  if (raw == null) {
    data = seed();
    await client.set(LEGACY_KEY, JSON.stringify(data));
  } else {
    data = JSON.parse(raw);
  }
  legacyCache = data;
  legacyAt = Date.now();
  return data;
}

// ---- Redis per-collection read/write --------------------------------------
async function redisReadCollection(name) {
  const client = await getClient();
  const raw = await client.get(colKey(name));
  if (raw != null) return JSON.parse(raw);
  // Backfill this collection's key from the legacy doc (or seed) on first read.
  const doc = await legacyDoc();
  const rows = Array.isArray(doc[name]) ? doc[name] : [];
  await client.set(colKey(name), JSON.stringify(rows));
  return rows;
}
async function redisWriteCollection(name, rows) {
  const client = await getClient();
  await client.set(colKey(name), JSON.stringify(rows));
}
async function redisReadSettings() {
  const client = await getClient();
  const raw = await client.get(SETTINGS_KEY);
  if (raw != null) return JSON.parse(raw);
  const doc = await legacyDoc();
  const s = doc.settings || {};
  await client.set(SETTINGS_KEY, JSON.stringify(s));
  return s;
}
async function redisWriteSettings(s) {
  const client = await getClient();
  await client.set(SETTINGS_KEY, JSON.stringify(s));
}

// ---- Local filesystem backend (dev, single file) --------------------------
function fsEnsure() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, fs.readFileSync(SEED_PATH, "utf-8"), "utf-8");
}
function fsReadDoc() {
  fsEnsure();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}
function fsWriteDoc(doc) {
  fsEnsure();
  fs.writeFileSync(DB_PATH, JSON.stringify(doc, null, 2), "utf-8");
}

// ---- Unified raw read/write (backend-agnostic) ----------------------------
async function readCollectionRaw(name) {
  return useRedis ? redisReadCollection(name) : (fsReadDoc()[name] || []);
}
async function writeCollectionRaw(name, rows) {
  if (useRedis) await redisWriteCollection(name, rows);
  else { const doc = fsReadDoc(); doc[name] = rows; fsWriteDoc(doc); }
}
async function readSettingsRaw() {
  return useRedis ? redisReadSettings() : (fsReadDoc().settings || {});
}
async function writeSettingsRaw(s) {
  if (useRedis) await redisWriteSettings(s);
  else { const doc = fsReadDoc(); doc.settings = s; fsWriteDoc(doc); }
}

// Cached read for the read-only getters. Mutations always read fresh via
// readCollectionRaw() to avoid lost updates, then refresh the cache.
async function readCollectionCached(name) {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  if (inflight.has(name)) return inflight.get(name);
  const p = (async () => {
    try {
      const data = await readCollectionRaw(name);
      cache.set(name, { data, at: Date.now() });
      return data;
    } finally {
      inflight.delete(name);
    }
  })();
  inflight.set(name, p);
  return p;
}
function refreshCache(name, rows) {
  cache.set(name, { data: rows, at: Date.now() });
}

// Collections that behave like arrays of records with an `id`.
const COLLECTIONS = [
  "services",
  "projects",
  "careers",
  "messages",
  "applications",
  "previousProjects",
  "galleryImages",
  "slas",
  "signatures",
  "users",
  "quotations",
  "salesTickets",
  "salesClients",
  "rfqs",
  "reviews",
  "activityLog",
  "inventoryVendors",
  "inventoryItems",
  "inventoryStock",
  "tasks",
  "employees",
  "departments",
  "positions",
  "certifications",
  "projectSheets",
  "deliveries",
  "materialOrders",
  "workTasks",
  "permits",
  "cashSheets",
  "locations",
  "trackingPositions",
  "docImages",
  "notifications",
  "overtimes",
  "awbAirlines",
  "awbShipments",
];

// Collections the admin can manually reorder (lower `order` sorts first).
const ORDERABLE = ["projects", "galleryImages"];

export async function getCollection(name) {
  if (!COLLECTIONS.includes(name)) throw new Error(`Unknown collection: ${name}`);
  const rows = await readCollectionCached(name);
  if (ORDERABLE.includes(name)) {
    return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return rows;
}

export async function getSettings() {
  const hit = cache.get("__settings");
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const s = await readSettingsRaw();
  cache.set("__settings", { data: s, at: Date.now() });
  return s;
}

export async function updateSettings(patch) {
  const cur = await readSettingsRaw();
  const next = { ...cur, ...patch };
  await writeSettingsRaw(next);
  cache.set("__settings", { data: next, at: Date.now() });
  return next;
}

function makeId(name) {
  return `${name.slice(0, 3)}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export async function createItem(name, item) {
  if (!COLLECTIONS.includes(name)) throw new Error(`Unknown collection: ${name}`);
  const existing = await readCollectionRaw(name); // fresh read → no lost updates
  const record = { id: item.id || makeId(name), ...item };
  if (ORDERABLE.includes(name) && record.order === undefined) {
    record.order = existing.reduce((max, r) => Math.max(max, r.order ?? -1), -1) + 1;
  }
  const rows = [record, ...existing];
  await writeCollectionRaw(name, rows);
  refreshCache(name, rows);
  return record;
}

export async function updateItem(name, id, patch) {
  if (!COLLECTIONS.includes(name)) throw new Error(`Unknown collection: ${name}`);
  const existing = await readCollectionRaw(name);
  let updated = null;
  const rows = existing.map((row) => {
    if (row.id === id) {
      updated = { ...row, ...patch, id };
      return updated;
    }
    return row;
  });
  await writeCollectionRaw(name, rows);
  refreshCache(name, rows);
  return updated;
}

export async function deleteItem(name, id) {
  if (!COLLECTIONS.includes(name)) throw new Error(`Unknown collection: ${name}`);
  const existing = await readCollectionRaw(name);
  const before = existing.length;
  const rows = existing.filter((row) => row.id !== id);
  await writeCollectionRaw(name, rows);
  refreshCache(name, rows);
  return before !== rows.length;
}

// Wholesale-replace a collection's rows — used by lib/activity.js to trim the
// activity log. Now touches only that collection's key.
export async function replaceCollection(name, rows) {
  if (!COLLECTIONS.includes(name)) throw new Error(`Unknown collection: ${name}`);
  await writeCollectionRaw(name, rows);
  refreshCache(name, rows);
  return rows;
}
