# Uploaded files (media)

Any binary a studio or account uploads — logos, attachments, and the signature graphic stamped
on a controlled document — stored under one id and served back through one route.

## What it is

`src/lib/media.ts`: `putMedia`, `getMedia`, `readMedia`, `deleteMedia`, `expireMedia`. Two
routes: `POST /api/media` (upload) and `GET /api/media/<id>` (serve). Platform-scoped
(`g:media:<id>`), not a section collection — this is entirely outside the Redis→Postgres
section migration and outside `readCol`/`DB_BACKEND`.

| Where | What it does |
|---|---|
| `src/lib/media.ts` | `putMedia`/`getMedia`/`readMedia`/`deleteMedia`/`expireMedia` |
| `src/app/api/media/route.ts` | `POST` — validates the caller, resolves the studio from a slug, uploads |
| `src/app/api/media/[id]/route.ts` | `GET` — the one door that may ever read a file back |
| `src/platform/db/keys.ts` | `MEDIA.blob(id)` — the only place the key is built |
| `scripts/migrate-media-to-blob.mjs` | Moves pre-existing base64 records into Blob |

## What it stores

**The binary goes to Vercel Blob; Redis keeps the record.** A record is: `id`, `url`
(the Blob object's URL), `pathname`, `contentType`, `filename`, `visibility`
(`"public"` | `"private"`), `owner`, `studioId`, `size`, `sha256`, `createdAt`. A couple of
hundred bytes in Redis per file, not the file itself.

This replaces base64'ing the whole file into the Redis string at `g:media:<id>` (1.34x
inflation, no reclamation beyond a single key, and — because the key is platform-scoped —
no studio cascade ever reaped an orphan). Measured live on 31/08/2026: **2 files, 1.06 MB of
file bytes** (~1.41 MB as stored, base64 being 1.33x), both public, both personal rather than
studio-owned, still in the old form and not yet migrated.

**There are now TWO namespaces, and both are built in `keys.ts`.** `MEDIA.blob(id)` is the
Redis record; `MEDIA.object(id)` is the Blob object's pathname. For as long as the bytes were
base64 inside the record, prefixing the record *was* prefixing the bytes and one builder
covered everything — moving the bytes to Blob split that in two. The second half was briefly a
bare `` `media/${id}` `` literal, which is the same fault the `MEDIA` block's own header in
`keys.ts` was written about, re-committed in a store that did not exist when that header was
written. It never reached live, because the Blob store was created after it was fixed.

It matters more here than in Redis or Postgres because the two halves are reaped by different
mechanisms: `delPrefix` takes the test run's *record*, and nothing took the *object* it named.
That leaves precisely the state `deleteMedia`'s comment calls unreachable and unreclaimable —
billed forever, with the only pointer to it deleted. `tests/blob-sweep.mjs` is the other half,
mirroring `tests/pg-sweep.mjs`: it **lists by this run's prefix and deletes an explicit URL
list**, and **refuses an empty prefix outright**, because `list({ prefix: "" })` enumerates
every production object and deleting those would be the Blob restatement of the broad-scan
delete that once wiped this project's whole Redis instance (invariant 17).

**`MAX_BYTES` stays at 5 MB**, but not for the reason it existed before. It used to bound how
much base64 one Redis string held; Blob has no such ceiling. It survives because
`POST /api/media` reads the whole upload into memory with `file.arrayBuffer()` before Blob
ever sees it, and Vercel's own Serverless Functions cap a request body at roughly 4.5 MB by
default — raising the number here would not raise that ceiling, it would just move the
failure from a clean `413` to an opaque platform error. Going higher needs a client-side or
resumable upload (which Blob supports) to replace this route, not a bigger constant.

## What it does

**Upload (`POST /api/media`).** Signed-in only. A private upload must name a studio (via
`slug`) — private means "only this tenant may read it," and the read path needs a studio to
check membership against; there is no owner-only fallback because the one feature that uses
private files (a signature) is stamped by one person and read by everyone else on the
document. `putMedia` hashes the buffer (`sha256`), uploads it to Blob at `media/<id>`
(`access: "public"`, no random suffix — the id is already unguessable), then writes the
record to Redis. Answers `{ id, url: "/api/media/<id>", size }` — **the app-side id and
route, never the Blob URL.**

**Serve (`GET /api/media/<id>`).** Looks up the record; a private file additionally checks
that the caller is signed in and a member of `record.studioId` (or, for a studio-less
personal file, that they are its `owner`) — `refuse()` in the route, 404 either way a caller
is turned away so a guessed id is never confirmed as real. **Both public and private files
are then fetched from Blob server-side and streamed back** — `readMedia()` does one
`fetch(record.url)`. The Blob URL itself is never sent to a client, for either visibility.

**Why not redirect a public file to the CDN.** Vercel Blob has no private-object mode: every
object it holds sits behind a public, unguessable URL — there is no access level below
"public" to request. Handing that URL to a client (via a redirect) would work for public
files, and would save this deployment the egress of streaming them itself. It is not done:
keeping exactly one code path — fetch-and-stream, unconditional — means there is exactly one
place a Blob URL could leak to a client, and it is not one. This is a real, available
optimisation for the public case specifically; it was left for a separate, deliberate change
rather than folded in here.

**Delete (`deleteMedia`).** Removes the Blob object first, then the Redis record — in that
order, so a failure between the two leaves a record pointing at a (now-missing) object rather
than a live, unbilled, unreachable object with no record. Nothing in the product calls this
yet.

**`expireMedia`** sets a TTL on the Redis record only. It does not touch the Blob object, so
using it without also calling `deleteMedia` first orphans the object on a timer instead of a
crash — the same leak shape `deleteMedia`'s ordering exists to avoid. Nothing calls this
either.

## Migrating what predates this move

`scripts/migrate-media-to-blob.mjs` moves the base64 records that existed before Blob was
wired up. It is read-only by default; `--write` uploads each one to Blob and adds a `url`
field beside the existing base64 (additive, reversible); `--reclaim` then deletes the base64
`data` field, and only for a record whose Blob copy has already been fetched back and
hash-checked against the original in the same run. It refuses to run under
`NOMPANY_KEY_PREFIX` (a test namespace has nothing worth migrating) and is idempotent — a
record already carrying `url` and no `data` is skipped, so an interrupted run is fixed by
running it again.

It has been run once, read-only, against the live instance (31/08/2026): **2 records, 1.41 MB,
both public** — dry-run report only, nothing written. It has not been run with `--write` or
`--reclaim` against live data; that is a separate authorisation.

## Not built yet

- **No quota.** Storage is not tied to a studio's headcount or plan; a studio can upload
  without limit beyond the 5 MB per-file cap.
- **No cascade.** A deleted studio's media is not deleted with it — `MEDIA.blob` is
  platform-scoped, and nothing walks a studio's files on delete. Tracked as a known gap, not
  attempted here.
- **No deduplication.** `sha256` is recorded per record but nothing checks it against other
  records before uploading, so the same file uploaded twice is stored twice.
- **No client-side/resumable upload**, so `MAX_BYTES` stays a hard 5 MB rather than something
  Vercel's request-body ceiling would allow if the browser talked to Blob directly.
- **The migration script's `--write`/`--reclaim` have not been run against live data.** The
  2 live records are still base64 in Redis.
