// MEDIA STORE — binaries in Vercel Blob, metadata in Redis.
//
// WHY THIS MOVED. Every uploaded file used to be base64'd whole into a Redis
// string at `g:media:<id>` — 1.34x inflation, no reclamation on delete beyond a
// single key, and platform-scoped so no studio cascade ever reaped it either.
// Redis memory is this deployment's hard ceiling (see `S.chatUsage` and the
// noeviction assertion in the suite), and it was mostly holding JPEGs.
//
// What stays in Redis is the RECORD: id, url, contentType, filename,
// visibility, owner, studioId, size, sha256. A couple of hundred bytes instead
// of a couple of megabytes, and still one `GET` to answer "does this exist and
// who may see it" — the thing every read needs before it needs the bytes.
//
// THE BLOB URL IS NEVER GIVEN TO A CLIENT, and that is the load-bearing
// decision in this file. Vercel Blob has no private-object mode: everything it
// stores sits behind a public, unguessable URL, full stop — there is no access
// level below "public" to ask for. The most sensitive image this product holds
// is the SIGNATURE GRAPHIC a reviewer or approver stamps on a controlled
// document, and /api/media/<id> guards those on STUDIO MEMBERSHIP (finding
// C-2, and it cost a fix once already). Handing the Blob URL to a client would
// undo that: it would replace a membership check with a shareable string, and a
// shared string cannot be taken back once it is out.
//
// So the id stays the public handle, the route stays the only door, and the
// URL lives only in the record, which only the server ever reads. Both a
// public and a private file are fetched here and streamed by the route — see
// the note on `readMedia` for why this file does not also offer a
// redirect-to-CDN path for public files.
import { randomUUID, createHash } from "node:crypto";
import { put, del } from "@vercel/blob";
import { getRedisClient } from "@/platform/db/redis";
import { MEDIA } from "@/platform/db/keys";

// MAX_BYTES predates Blob and survives the move, but not for the reason it was
// introduced. It used to exist because a bigger file meant more base64 stuffed
// into one Redis string; Blob has no such ceiling. It stays because this route
// reads the whole upload into memory with `await file.arrayBuffer()` before it
// ever touches Blob (see app/api/media/route.ts), and Vercel's own Serverless
// Functions cap a request body at roughly 4.5 MB by default — a larger
// MAX_BYTES here would not raise that ceiling, it would just move where the
// upload fails from a clean 413 to a platform-level error with no `error`
// field for the client to read. 5 MB is a deliberately-kept product bound,
// not a storage artifact; going higher needs a client-side/resumable upload
// (which Blob supports) to replace this route, not a bigger number here.
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file

// Built through the shared key module so the namespace applies. A literal here
// is how the integration suite came to write live blobs.
//
// BOTH namespaces come from that module, not just this one. The Redis record
// is `MEDIA.blob(id)`; the Blob object's pathname is `MEDIA.object(id)`, used
// at the `put` below. For as long as the bytes were base64 inside the record,
// prefixing the record WAS prefixing the bytes and one builder covered
// everything. Moving the bytes to Blob split that in two, and the second half
// was briefly a bare `media/${id}` literal — the same fault as the first,
// re-committed in the new store.
const key = (id: string) => MEDIA.blob(id);

export type MediaRecord = {
  id: string;
  url: string;
  pathname: string;
  contentType: string;
  filename: string;
  visibility: "public" | "private";
  owner: string;
  studioId: string;
  size: number;
  sha256: string;
  createdAt: string;
};

// Store a file. `visibility: "public"` may be served to anyone with the
// /api/media/<id> link; "private" requires a signed-in requester who is a
// member of `studioId` (enforced by the serve route, never by this function).
export async function putMedia(
  { buffer, contentType, filename, visibility = "public", owner = "", studioId = "" }: {
    buffer: Buffer;
    contentType: string;
    filename: string;
    visibility?: string;
    owner?: string;
    studioId?: string;
  },
) {
  if (!buffer?.length) return { error: "empty" };
  if (buffer.length > MAX_BYTES) return { error: "too-large" };

  const id = randomUUID().replace(/-/g, "");
  // CONTENT HASH, recorded so the same file uploaded twice is recognisable as
  // the same file, and so the migration script can prove a Blob copy matches
  // its Redis original byte-for-byte. Not used to deduplicate storage yet —
  // that needs a reverse index and a decision about who owns a shared blob —
  // but recording it now is free and retrofitting it over existing objects
  // later is not.
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const blob = await put(MEDIA.object(id), buffer, {
    access: "public",
    contentType: String(contentType || "application/octet-stream"),
    // The id is already random and unguessable; Vercel's own random suffix
    // would only make the pathname harder to reason about for no gain, since
    // the URL is never exposed to a client either way.
    addRandomSuffix: false,
  });

  const record: MediaRecord = {
    id,
    url: blob.url,
    pathname: blob.pathname,
    contentType: String(contentType || "application/octet-stream"),
    filename: String(filename || "file").slice(0, 200),
    visibility: visibility === "private" ? "private" : "public",
    owner: String(owner || ""),
    // WHOSE STUDIO THIS BELONGS TO, when it belongs to one. It is what the read
    // path checks membership against — see the note there. Absent means the
    // file is personal to `owner` (an account photo), not that it is public.
    studioId: String(studioId || ""),
    size: buffer.length,
    sha256,
    createdAt: new Date().toISOString(),
  };
  const client = await getRedisClient();
  await client.set(key(id), JSON.stringify(record));
  return { id, url: `/api/media/${id}`, size: record.size };
}

// The record, without the bytes. The serve route decides who may have them and
// fetches them separately with `readMedia`.
export async function getMedia(id: string): Promise<MediaRecord | null> {
  if (!id || !/^[a-f0-9]{32}$/i.test(String(id))) return null;
  const client = await getRedisClient();
  const raw = await client.get(key(id));
  if (!raw) return null;
  return JSON.parse(raw);
}

// The bytes, fetched from Blob.
//
// This is used for EVERY read, public or private, not only the private path a
// redirect could not cover. A redirect to the Blob URL would be the more
// obvious move for a public file — the CDN would serve it directly and this
// deployment would pay no egress for it — but it would also mean the Blob URL
// reaches the client's address bar and network log for that one request type.
// Nothing downstream currently depends on that distinction, and keeping one
// code path (fetch-and-stream, unconditionally) rather than two (redirect for
// public, stream for private) means there is exactly one place that can leak
// a Blob URL, and it never does. The redirect is a real, available
// optimisation — worth its own commit once it is deliberately decided that a
// public blob URL leaking to a client's network tab is an acceptable trade for
// the egress saving.
export async function readMedia(record: { url?: string }): Promise<Buffer | null> {
  if (!record?.url) return null;
  const res = await fetch(record.url, { cache: "no-store" });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

// Remove the record AND the object. Losing one without the other is the leak:
// a record with no object serves 404 forever (harmless, just orphaned bytes
// nobody bills for); an object with no record is unreachable and
// unreclaimable, which is the failure this move exists to end.
export async function deleteMedia(id: string) {
  const record = await getMedia(id);
  if (!record) return false;

  // THE OBJECT GOES FIRST. If the record is deleted first and this throws, the
  // record is gone but the blob is still live and still billed — the smaller
  // version of the same leak. This order leaves, at worst, a record pointing
  // at an already-deleted object, which the next `deleteMedia` call on the
  // same id (or a re-run of the migration's future reclaim step) can still
  // clean up.
  //
  // Deliberately UNCAUGHT. `del` on an already-gone blob is a no-op rather than
  // an error, so the only thing a catch here could swallow is a real failure —
  // network, auth, a wrong token — and swallowing it would delete the record
  // anyway and strand the object, which is precisely the leak this ordering
  // exists to prevent. Throwing leaves both halves in place, so a retry still
  // cleans up.
  if (record.url) {
    await del(record.url);
  }
  const client = await getRedisClient();
  return (await client.del(key(id))) === 1;
}

// Time-limit a blob's RECORD (used for short-lived exports/attachments).
//
// This expires the Redis key only. The Blob object underneath is not deleted,
// so a caller relying on this to reclaim storage is wrong to: it orphans the
// object exactly the way a record-without-object leak does above, just on a
// timer instead of a crash. Nothing in this codebase currently calls it — if
// something starts to, it needs to `deleteMedia` before (or instead of)
// relying on the TTL, or the object leaks forever.
export async function expireMedia(id: string, seconds: number) {
  const client = await getRedisClient();
  return client.expire(key(id), seconds);
}
