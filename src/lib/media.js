// MEDIA STORE — binaries in Vercel Blob, metadata in Redis.
//
// WHY THIS MOVED. Every uploaded file used to be base64'd into a Redis string at
// `g:media:<id>`: 1.34× inflation, no quota, no reclamation, and platform-scoped
// so no cascade ever reaped it. Measured on the live instance, fifteen files held
// 7.95 MB — the largest single share of the dataset. Redis memory is this
// deployment's hard ceiling and it was mostly holding JPEGs.
//
// What stays in Redis is the record: id, contentType, filename, visibility,
// owner, studioId, size, and the blob's URL. A couple of hundred bytes instead
// of a couple of megabytes.
//
// THE BLOB URL IS NEVER GIVEN TO A CLIENT, and that is the load-bearing decision
// in this file.
//
// Vercel Blob serves over public, unguessable URLs. The most sensitive image
// this product holds is the SIGNATURE GRAPHIC a reviewer or approver stamps on a
// controlled document, and /api/media/<id> guards those on STUDIO MEMBERSHIP —
// which was finding C-2, and cost a fix. Handing out the blob URL would undo it
// and replace a membership check with an unguessable string, which is not the
// same thing and is not recoverable once a URL has been shared.
//
// So the id stays the public handle, the route stays the only door, and the URL
// lives in the record where only the server sees it. A PUBLIC blob may be
// redirected to (the CDN serves it, we pay no egress); a PRIVATE one is streamed
// through the route after the membership check. See api/media/[id]/route.js.

import { randomUUID, createHash } from "node:crypto";
import { put, del } from "@vercel/blob";
import { getRedisClient } from "@/lib/data/redis";
import { MEDIA, S } from "@/lib/data/keys";
import { hIncrBy, hGetAll } from "@/lib/data/store";
import { seatLimitForPackage } from "@/lib/pricing";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file

// PER-STUDIO STORAGE, TIED TO HEADCOUNT rather than invented as its own ladder.
// A plan already says how many people it is for; storage that did not scale with
// that would be a second number to keep in step for no reason. 50 MB a seat, and
// the unlimited tier is unlimited here too.
const MB = 1024 * 1024;
const PER_SEAT_BYTES = 50 * MB;
const FLOOR_BYTES = 500 * MB;

// Built through the shared key module so the namespace applies. A literal here
// is how the integration suite came to write live blobs.
const key = (id) => MEDIA.blob(id);

/** The byte budget for a studio on this plan. */
export function quotaFor(packageKey) {
  const seats = seatLimitForPackage(packageKey);
  if (!Number.isFinite(seats)) return Infinity;
  return Math.max(FLOOR_BYTES, seats * PER_SEAT_BYTES);
}

/** How much a studio is using, and what it may use. */
export async function usage(studioId, packageKey) {
  const used = Number((await hGetAll(S.mediaUsage(studioId)))?.bytes || 0);
  return { used, quota: quotaFor(packageKey) };
}

/**
 * Store a file.
 *
 * `visibility: "public"` may be served to anyone with the LINK — meaning
 * /api/media/<id>, not the blob URL. "private" requires membership of the
 * studio the file was uploaded for, enforced by the serve route.
 */
export async function putMedia({
  buffer, contentType, filename, visibility = "public",
  owner = "", studioId = "", packageKey = "",
}) {
  if (!buffer?.length) return { error: "empty" };
  if (buffer.length > MAX_BYTES) return { error: "too-large" };

  // QUOTA IS CHECKED BEFORE THE UPLOAD, not after. Writing the blob and then
  // refusing would leave a paid-for object nobody can reach — the reclamation
  // problem this change exists to end.
  if (studioId) {
    const { used, quota } = await usage(studioId, packageKey);
    if (used + buffer.length > quota) {
      return { error: "quota", used, quota, needed: buffer.length };
    }
  }

  const id = randomUUID().replace(/-/g, "");
  // CONTENT HASH, so the same file uploaded twice is recognisable as the same
  // file. Not yet used to deduplicate — that needs a reverse index and a
  // decision about who owns a shared blob — but recording it now is free and
  // retrofitting it over existing objects is not.
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const blob = await put(`media/${id}`, buffer, {
    access: "public",
    contentType: String(contentType || "application/octet-stream"),
    // The id is already random; Vercel's suffix would only make the URL harder
    // to reason about, and the URL is never public anyway.
    addRandomSuffix: false,
  });

  const record = {
    id,
    url: blob.url,
    pathname: blob.pathname,
    contentType: String(contentType || "application/octet-stream"),
    filename: String(filename || "file").slice(0, 200),
    visibility: visibility === "private" ? "private" : "public",
    owner: String(owner || ""),
    // WHOSE STUDIO THIS BELONGS TO, when it belongs to one. It is what the read
    // path checks membership against. Absent means the file is personal to
    // `owner` (an account photo), not that it is public.
    studioId: String(studioId || ""),
    size: buffer.length,
    sha256,
    createdAt: new Date().toISOString(),
  };

  const client = await getRedisClient();
  await client.set(key(id), JSON.stringify(record));
  if (studioId) await hIncrBy(S.mediaUsage(studioId), "bytes", buffer.length);

  return { id, url: `/api/media/${id}`, size: record.size };
}

/** The record, without the bytes. The serve route decides how to deliver them. */
export async function getMedia(id) {
  if (!id || !/^[a-f0-9]{32}$/i.test(String(id))) return null;
  const client = await getRedisClient();
  const raw = await client.get(key(id));
  if (!raw) return null;
  return JSON.parse(raw);
}

/** The bytes, fetched from Blob. Only for what the route may not redirect to. */
export async function readMedia(record) {
  if (!record?.url) return null;
  const res = await fetch(record.url, { cache: "no-store" });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

/** Remove the record AND the object. Losing one without the other is the leak. */
export async function deleteMedia(id) {
  const record = await getMedia(id);
  if (!record) return false;

  // THE OBJECT GOES FIRST. If the record is deleted first and this throws, the
  // blob is unreachable and unreclaimable — the exact failure C-6 described,
  // reintroduced in a smaller form. This way a failure leaves a record pointing
  // at a missing object, which the next attempt can still clean up.
  if (record.pathname || record.url) {
    await del(record.url).catch(() => {});
  }
  const client = await getRedisClient();
  const gone = (await client.del(key(id))) === 1;
  if (gone && record.studioId && record.size) {
    await hIncrBy(S.mediaUsage(record.studioId), "bytes", -record.size);
  }
  return gone;
}
