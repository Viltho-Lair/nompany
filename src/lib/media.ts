// MEDIA STORE (restructured) — uploaded files kept in Redis and served back by
// id. Platform-scoped: `g:media:<id>`.
//
// Old ids embedded a tenant (`<tenant>.<raw>`); that scheme is gone along with
// the old structure, and every old blob was deleted, so there is no legacy form
// to parse. When the ERP modules land, studio-owned files move under
// s:<StudioID>:media:<id> so they cascade with the studio.

import { randomUUID } from "node:crypto";
import { getRedisClient } from "@/platform/db/redis";
import { MEDIA } from "@/platform/db/keys";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file
// Built through the shared key module so the namespace applies. A literal
// here is how the integration suite came to write live blobs.
const key = (id) => MEDIA.blob(id);

// Store a file. `visibility: "public"` may be served to anyone with the link;
// "private" requires a signed-in requester (enforced by the serve route).
export async function putMedia({ buffer, contentType, filename, visibility = "public", owner = "", studioId = "" }) {
  if (!buffer?.length) return { error: "empty" };
  if (buffer.length > MAX_BYTES) return { error: "too-large" };

  const id = randomUUID().replace(/-/g, "");
  const record = {
    id,
    contentType: String(contentType || "application/octet-stream"),
    filename: String(filename || "file").slice(0, 200),
    visibility: visibility === "private" ? "private" : "public",
    owner: String(owner || ""),
    // WHOSE STUDIO THIS BELONGS TO, when it belongs to one. It is what the read
    // path checks membership against — see the note there. Absent means the
    // file is personal to `owner` (an account photo), not that it is public.
    studioId: String(studioId || ""),
    size: buffer.length,
    data: buffer.toString("base64"),
    createdAt: new Date().toISOString(),
  };
  const client = await getRedisClient();
  await client.set(key(id), JSON.stringify(record));
  return { id, url: `/api/media/${id}`, size: record.size };
}

export async function getMedia(id: string) {
  if (!id || !/^[a-f0-9]{32}$/i.test(String(id))) return null;
  const client = await getRedisClient();
  const raw = await client.get(key(id));
  if (!raw) return null;
  const record = JSON.parse(raw);
  return { ...record, buffer: Buffer.from(record.data, "base64") };
}

export async function deleteMedia(id: string) {
  const client = await getRedisClient();
  return (await client.del(key(id))) === 1;
}

// Time-limit a blob (used for short-lived exports/attachments).
export async function expireMedia(id: string, seconds) {
  const client = await getRedisClient();
  return client.expire(key(id), seconds);
}
