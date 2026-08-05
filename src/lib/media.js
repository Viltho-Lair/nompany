import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getRedisClient } from "@/lib/db";

// Binary media store (uploaded logos, images and CVs). Files are kept as
// separate Redis keys (`media:<id>`) — never inside the main JSON document,
// which is read/written wholesale on every render. Records elsewhere store
// only the URL string `/api/media/<id>`.
//
// Local dev (no REDIS_URL) writes to data/media/<id> (+ a .meta.json sidecar),
// mirroring the filesystem fallback in src/lib/db.js.
const useRedis = Boolean(process.env.REDIS_URL);
const MEDIA_DIR = path.join(process.cwd(), "data", "media");
const ID_RE = /^[a-f0-9]{24}$/;

const keyFor = (id) => `media:${id}`;

function newId() {
  return crypto.randomBytes(12).toString("hex");
}

export async function putMedia({ buffer, contentType, filename, visibility = "public", owner = "" }) {
  const id = newId();
  const record = {
    contentType: contentType || "application/octet-stream",
    filename: filename || id,
    visibility,
    // For private media, the user id allowed to view it besides admin/HR (e.g.
    // an employee viewing their own ID/passport scan). Empty = staff-only.
    owner: owner || "",
    size: buffer.length,
    createdAt: new Date().toISOString(),
    dataB64: buffer.toString("base64"),
  };
  if (useRedis) {
    const client = await getRedisClient();
    await client.set(keyFor(id), JSON.stringify(record));
  } else {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    fs.writeFileSync(path.join(MEDIA_DIR, id), buffer);
    const { dataB64, ...meta } = record;
    fs.writeFileSync(path.join(MEDIA_DIR, `${id}.meta.json`), JSON.stringify(meta));
  }
  return { id, url: `/api/media/${id}` };
}

export async function getMedia(id) {
  if (!ID_RE.test(id || "")) return null;
  if (useRedis) {
    const client = await getRedisClient();
    const raw = await client.get(keyFor(id));
    if (!raw) return null;
    const rec = JSON.parse(raw);
    return { ...rec, buffer: Buffer.from(rec.dataB64, "base64") };
  }
  const file = path.join(MEDIA_DIR, id);
  const metaFile = path.join(MEDIA_DIR, `${id}.meta.json`);
  if (!fs.existsSync(file) || !fs.existsSync(metaFile)) return null;
  const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  return { ...meta, buffer: fs.readFileSync(file) };
}

export async function deleteMedia(id) {
  if (!ID_RE.test(id || "")) return;
  if (useRedis) {
    const client = await getRedisClient();
    await client.del(keyFor(id));
    return;
  }
  try { fs.unlinkSync(path.join(MEDIA_DIR, id)); } catch {}
  try { fs.unlinkSync(path.join(MEDIA_DIR, `${id}.meta.json`)); } catch {}
}

// Set a time-to-live so bytes auto-expire (used when an application is
// rejected — the CV is purged 7 days later even without an admin visit).
export async function expireMedia(id, seconds) {
  if (!ID_RE.test(id || "")) return;
  if (useRedis) {
    const client = await getRedisClient();
    await client.expire(keyFor(id), seconds);
  }
  // Filesystem fallback keeps no TTL; the purge job removes it in dev.
}
