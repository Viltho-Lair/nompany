# nompany ERP — System Audit & Recommendations

**Audit date:** 2026-08-20 · **Commit:** `166300f` · **Branch:** `main`
**Scope:** the whole application — `src/app` (97 API routes, 3 route trees), `src/lib` (85 modules), `src/components` (studio, super, public, quality), the Redis data layer, and the live production dataset.

**Method.** Every claim below was verified against the source. Latency figures are *measured* against the live Redis instance in `.env.local` using read-only commands (`GET`/`STRLEN`/`SCAN`/`TYPE`/`MEMORY USAGE`/`INFO`); nothing was written and nothing was deleted. Bundle figures come from a clean `next build` run during this audit.

---

## 0. Executive summary

The codebase is unusually disciplined for its size. Access control is centralised in exactly one resolver (`src/platform/access/resolve.ts`), writes are genuinely atomic (compare-and-set in Lua, `src/platform/db/store.ts`), the ownership tree is encoded in the key tree so deletion is prefix deletion, and the reasoning behind almost every decision is written down next to it. That is a better foundation than most systems this age have.

Three things are nonetheless structurally wrong, and they compound:

1. **The storage model has no query layer.** Every collection is one JSON string under one key. Reading one ticket reads every ticket; writing one row rewrites the collection. Correctness is preserved by CAS; scalability is not.
2. **Request paths are chains of dependent round trips.** Rendering the Sales screen costs **8 sequential Redis hops** — measured at **1421 ms p50**, against **180 ms** for the identical data fetched in one batch. The hop count, not the network, is the defect.
3. **The frontend is a client-rendered monolith.** 131 of 320 component files are `"use client"`; there is no `loading.js`, no `<Suspense>`, and no skeleton anywhere in the twelve studio modules. 3.54 MB of client JavaScript (1.06 MB gzipped) ships before the first byte of data is requested.

And one finding is a live hazard rather than a design flaw:

> **`sweepOrphans()` is key-prefix-unaware and deletes by prefix.** Run once with `NOMPANY_KEY_PREFIX` set — which the project's own integration bootstrap sets to `test_` — it would classify every real user and studio subtree as orphaned and delete the entire production dataset. See **C-1**.

**Counts:** 6 critical, 11 high, 15 medium, 10 low. Full table in §6.

---

## 1. Critical

### C-1 · `sweepOrphans()` can delete the entire production dataset
`src/platform/db/cascade.ts:196-233` · weekly cron, `vercel.json`

The function mixes two addressing conventions in one body. The *repair* half builds keys through the prefixed builders:

```js
for (const u of users) if (!(await getIndex(IX.email(u.email)))) …   // IX.email() includes KEY_PREFIX
```

The *reap* half uses bare string literals:

```js
for (const id of strandedRoots(await scanPrefix("u:"), "u:", userIds)) { await delPrefix(`u:${id}:`); }
for (const id of strandedRoots(await scanPrefix("s:"), "s:", studioIds)) { await delPrefix(`s:${id}:`); }
```

`KEY_PREFIX` (`src/platform/db/keys.ts:32`) is honoured everywhere except here. With `NOMPANY_KEY_PREFIX=test_`, `readArr(REG.users)` reads `test_g:users` — empty — so `userIds` and `studioIds` are empty sets, `scanPrefix("u:")` returns every **real** user key, every id fails the `known.has(id)` test, and `delPrefix` removes the subtree. Same for `s:`. Then `ix:email:`, `ix:slug:`, `ix:owner:` and `ix:collab:` are reaped on the same logic.

`tests/integration.test.mjs:19` sets `NOMPANY_KEY_PREFIX` unconditionally. Nothing calls `sweepOrphans` from the suite today, which is the only reason this has not fired. There is no test, no guard, and no comment marking the line as dangerous.

**Fix (today, ~10 lines).** Add `import { KEY_PREFIX as P } from "@/platform/db/keys"` and prefix all four literals. Add a hard refusal at the top of the function: if `KEY_PREFIX` is non-empty **and** both registries are empty, return without deleting — an empty registry is never a licence to delete everything. Add a suite case that runs the sweep under a prefix with live-shaped decoy keys outside it and asserts the decoys survive.

---

### C-2 · Cross-tenant read of private media (IDOR)
`src/app/api/media/[id]/route.js:13-14`

```js
if (media.visibility === "private" && !(await currentUser())) {
  return new Response("Forbidden", { status: 403 });
}
```

The check is "is *somebody* signed in", not "is *this* person entitled". `putMedia` records an `owner` (`src/lib/media.js:27`) and no read path ever compares it. Media is platform-scoped at `g:media:<id>` with no studio in the key, so there is nothing to scope against either.

**Scope, verified against the live instance.** All 15 stored blobs are `visibility: "public"` today — logos and profile pictures, which are public by intent and leak nothing. So this is **not currently being exploited**.

What makes it critical anyway is the one caller of the private mode: `QualityWorkflow.js:99` uploads with `?kind=private`, and what it uploads is the **signature graphic a reviewer or approver puts on a controlled document**. `signables.js:26` then accepts `/api/media/<32-hex>` as that signature. The moment a studio signs its first document, any authenticated account on the platform — including one that signed up a minute ago — can fetch that person's handwritten signature by id. Ids travel in `src` attributes, exported PDFs and generated documents.

In other words: the guard on the private path is wrong, and the private path is used by exactly the feature that most needs it. It is broken *before* it is relied upon, which is the cheapest possible moment to fix it.

**Fix.** Move studio-owned blobs to `s:<StudioID>:media:<id>` (the key builder already exists at `keys.js:S.media`, unused), and on read resolve the studio and require membership; for platform blobs compare `owner` to `user.id`. Serve private blobs through a short-lived signed URL rather than a bare id.

**Also worth fixing while in there:** there is no deduplication. `nompany.png` is stored three times and `R.jpg` four times across different owners — identical bytes, four keys. Content-hash addressing would remove it.

---

### C-3 · Unauthenticated unbounded writes via `POST /api/track`
`src/app/api/track/route.js`

No session, no rate limit, no origin check, no bot check. The handler writes on every call:

```js
await inc(`pv:${page}`);              // hIncrBy stat:day:<YYYY-MM-DD>
if (vid) await client.sAdd(`stat:vis:${day}`, vid);   // vid is caller-supplied, 64 chars
```

The module comment states explicitly that **nothing here expires** — the 400-day TTL was deliberately removed. `vid` is attacker-controlled, so `stat:vis:<day>` is an unbounded set fed by anonymous callers. `page` is slugged to 40 chars over `[a-z0-9\-_/]`, so `pv:<page>` fields are also unbounded.

Redis is the platform's single point of storage. When the instance reaches its memory ceiling, *every* write in the product fails — sign-ups, invoices, quotations, sessions. This is a one-line-of-curl availability attack on the whole ERP.

**Fix.** Per-IP fixed-window limit through the existing `incrWithTTL` helper and a new `RL.trackIp` builder; cap `stat:vis:<day>` cardinality (or replace it with a HyperLogLog — `PFADD`/`PFCOUNT`, constant 12 KB regardless of volume, which is exactly the right shape for a unique-visitor count); restore a TTL on `stat:vis:*` and roll daily hashes into a monthly aggregate; verify `Origin` against the marketing host.

---

### C-4 · Password verification has no rate limit
`src/platform/auth/identity.js:235`, `src/app/api/identity/login/route.js`

```js
export async function login({ email, password, … }) {
  const user = await getUserByEmail(email);
  if (!user) return { error: "invalid" };
  if (!(await verifyPassword(String(password || ""), user.passwordHash))) return { error: "invalid" };
  …
  const challenge = await createChallenge({ … });   // rate limits live in HERE
```

The rate limiters (`RL.otpEmail`, `RL.otpIp`) are inside `createChallenge`, which is only reached **after** the password has already been verified correctly. A wrong password returns before any counter is touched. Online guessing is therefore bounded only by bcrypt cost 10 (~50-80 ms/attempt) and Vercel concurrency — thousands of attempts per minute across parallel requests.

`RL.superLoginIp` exists for the console door but there is no subscriber-side equivalent, and `/api/identity/forgot` and `/api/identity/reset` are likewise unlimited.

**Fix.** Limit *before* `verifyPassword`, keyed on both email and IP, with exponential lockout. Raise `BCRYPT_ROUNDS` from 10 to 12 (`src/platform/auth/passwords.js:8`) — a one-character change that quadruples per-attempt cost.

---

### C-5 · Super-admin sessions never expire server-side
`src/platform/auth/superAuth.js:93-150`

A console session is a raw token pushed onto `sessionTokens[]` on the `g:superAdmins` row. The array carries no `expiresAt`, and `findSuperBySession` accepts any token present in it. `SUPER_TTL_SEC = 43200` is applied **only** to the cookie's `Max-Age`, which is a client-side hint the client controls.

A captured console token stays valid indefinitely — until six newer sign-ins push it off the end of a `slice(0, 6)`. Contrast the subscriber side, which does this correctly: `IX.session(token)` with Redis `EX` (`src/platform/auth/users.js:mintSession`), where expiry is enforced by the database.

Also: `findSuperBySession` reads the whole registry and compares with `Array.includes` — a non-constant-time comparison on a secret.

**Fix.** Mint console sessions the same way the user side does: `ix:supersession:<sha256(token)>` → adminId with `EX SUPER_TTL_SEC`. Keep the array as a *display* list only. Compare with `crypto.timingSafeEqual`.

---

### C-6 · Media upload has no quota and no reclamation
`src/lib/media.js`, `src/app/api/media/route.js`

Any signed-in user may upload 5 MB files, unlimited in number, with no per-user or per-studio budget. Each is base64-encoded (~1.34× inflation, so ~6.7 MB per Redis string) and stored at `g:media:<id>` — **platform-scoped, so no cascade reaps it**, and `sweepOrphans` does not know the namespace exists. Deleting a studio or a user leaves its blobs forever.

Measured on the live instance right now: 15 `g:media:*` keys hold **6.5 MB of the 8.5 MB total dataset** (76%), the largest single blob 2.57 MB. Redis memory is the platform's hard ceiling and it is already three-quarters media.

`BLOB_READ_WRITE_TOKEN` is present in `.env.local` — Vercel Blob is provisioned and unused.

**Fix.** Move binaries to Vercel Blob; keep only `{ id, url, contentType, size, owner, studioId }` in the database. Per-studio storage quota tied to the plan. Teach `sweepOrphans` the media namespace (or make blobs studio-scoped so the existing prefix cascade reaps them).

---

## 2. High

### H-1 · Session tokens are stored in plaintext
`ix:session:<token>` → UserID (`src/platform/auth/users.js`). Anyone who can read the database — a backup, a support export, a misconfigured `CONFIG GET`, or a second application on the same shared Redis Cloud instance — holds every live session. Store `sha256(token)` as the key; the cookie value stays the same, only the lookup changes. Same for the OTP challenge id (`OTP.challenge`).

### H-2 · Every authenticated request parses the whole user registry
`getUserById` (`src/platform/auth/users.js:50`) is `readArr(REG.users)` + `Array.find`. It sits on `currentUser()`, so it runs on **every authenticated request in the product**. Worse, `currentUser` also fires `touchLastSeen`, which calls `getUserById` *again* and then, every 3 minutes per user, rewrites the entire registry through `editArr`.

At 10,000 users × ~250 B that is a 2.5 MB fetch-and-parse per request and a 2.5 MB compare-and-set per user per 3 minutes, all contending on one key. The registry is the single hottest key in the system and it is also the widest.

**Fix now (no migration):** add `u:<UserID>:row` as the authoritative per-user document and demote `g:users` to an id list; or at minimum move `lastSeenAt`/`lastLoginAt` off the registry into `U.profile`, which nothing else contends on.

### H-3 · Whole-collection-per-key is the storage model
`SEC.col(studioId, sectionId, name)` holds an entire collection as one JSON array. Consequences, all present in the code:

- `ticketQuotation` reads **all** quotations to find one by id (`src/modules/sales/sales.js:637`).
- `listTickets` reads **six** whole collections — tickets, clients, rfqs, quotations, tasks, projects — and joins them in JavaScript (`src/modules/sales/sales.js:599`).
- Any single-row update rewrites and re-serialises the whole array.
- Write throughput on a hot collection is one winner per CAS round; `MAX_ATTEMPTS = 64` then `ConflictError`.
- There is no index, no `WHERE`, no `ORDER BY`, no pagination anywhere in the product. Every filter and every sort happens after transferring everything.

This is the finding the Redis→SQL migration exists to close. See `database-migration-mssql.md`.

### H-4 · Dependent round trips dominate latency (measured)
Measured against the live instance, RTT 164 ms p50 from the development workstation:

| Path | Hops | Measured p50 | Same data, one batch | Ratio |
|---|---|---|---|---|
| `GET /api/studios/<slug>/sales` | 8 | **1421 ms** | 180 ms | **7.9×** |
| Studio shell `page.js` render | 9 | **1532 ms** | 174 ms | **8.8×** |
| 6 collections sequential vs parallel | 6 | 988 ms | 167 ms | 5.9× |

A user opening Sales pays both: **~2.95 s of Redis latency before the screen has data.**

The absolute numbers scale with RTT — in-region on Vercel they would be ~10-40 ms — but the *hop count is the defect*, and it is what a co-location change cannot fix. Full breakdown and the fix plan in `performance-audit.md`.

### H-5 · `listSections` runs twice per module request, and reconciles on every read
`studioContext` reads sections (`src/lib/studios.js:123`), then every module context reads them again (`salesContext` at `src/modules/sales/sales.js:111`, and identically in `hr.js`, `finance.js`, `inventory.js`, `operations.js`, `projects.js`, `tasks.js`, `technical.js`, `quality.js`, `main.js`). `src/app/api/studios/[slug]/route.js:19` does it a third time after `studioContext` already returned `sections`.

`listSections` additionally runs `plantMissingSections` — a full reconciliation against `SECTION_DEFS` — on every read, on the hot path, for a write that happens at most once per studio ever.

### H-6 · Live updates refetch entire module payloads
`useLiveUpdates(slug, "sales", load)` (`StudioSales.js:93,96`) re-runs the full `GET /api/studios/<slug>/sales` on every event. One person editing one ticket in a 30-seat studio triggers 30 clients × 6-collection payloads. `StudioSales` subscribes to *two* sections, so a Technical event fires it too. The event log already carries `{ collection, rowId }` — enough for a targeted patch — and none of it is used.

### H-7 · `ConflictError` surfaces as HTTP 500
`store.js` raises `ConflictError` after 64 contended attempts; no route maps it. A client sees an opaque 500 and cannot distinguish "retry, someone else was writing" from "the server is broken". Known and open in the project's own notes; the fix is a shared `handle()` wrapper, not 57 edits.

### H-8 · N+1 reads in list endpoints
`listEmployees` issues one `getProfile` per employee (`src/modules/hr/hr.js:338`); `listUsersForConsole` issues three reads per user (`src/platform/auth/users.js:121`). Parallel, so one RTT — but N commands, and N JSON parses, per page view.

### H-9 · Field encryption fails open and fails silent
`encryptField` returns plaintext when `FIELD_ENCRYPTION_KEY` is unset (`src/platform/auth/fieldCrypto.js:35`); `decryptField` returns `""` on any failure. A deploy with the key missing writes ID and passport numbers in the clear with no signal; a key rotation blanks every existing value with no error. The same key also derives the device IP HMAC (`identity.js:hashIp`), which returns `""` when unset — so device history silently stops working too.

### H-10 · No CSRF defence beyond `SameSite=Lax`, and no security headers
No `Origin`/`Referer` validation on any state-changing route; no CSRF token. `Lax` covers cross-site POST but not a same-site subdomain, and the platform deliberately spans `nompany.com` and `www.nompany.com`. `next.config.mjs` sets `reactStrictMode` and nothing else: no CSP, no HSTS, no `X-Frame-Options`, no `Referrer-Policy`, no `X-Content-Type-Options`, `poweredByHeader` left on.

### H-11 · No audit trail for privileged actions
`S.activityLog` is declared in `keys.js:181` and **has zero readers and zero writers**. Super admins can change a studio's plan, suspend a user, and rewrite the catalogue with no record of who did it or when. Studio admins can grant themselves roles, remove members and unlock locked quotations with no record either. For an ERP holding invoices, salaries and controlled documents this is the compliance gap, not a nice-to-have.

---

## 3. Medium

### M-1 · Declared-but-dead capabilities
Three of these, all discoverable as "the feature exists" from the outside:

| Capability | Declared at | Reality |
|---|---|---|
| External document share links | `IX.qshare`, `qualityShareLinks` collection, `quality.documents.share` permission | **Nothing reads or writes any of them.** There is no `/q/<token>` route. `q` is reserved in `proxy.js` and `RESERVED_SLUGS` for a page that does not exist. The permission is grantable on the Access screen and grants nothing. |
| Studio access tokens | `S.tokens`, `IX.stoken` | Only ever *deleted* (`cascade.js:121`). Never written. |
| Studio activity log | `S.activityLog` | Never touched. |

The permission catalogue's own stated rule (`permissions.js`) is that a right nothing can exercise is a bug. `quality.documents.share` violates it.

### M-2 · Four notification types are declared and never emitted
`NOTIFY.joinDecided`, `NOTIFY.peopleChanged`, `NOTIFY.taskAssigned`, `NOTIFY.mention` (`src/platform/notify/notifications.js:43`). Only five producers exist in the whole product. The most visible consequence: **a person who asks to join a studio is never told whether they were approved or declined.** They must re-open the studio address and guess. Full producer/UI gap analysis in `security-and-notifications.md`.

### M-3 · No progressive loading anywhere in the studio
Zero `loading.js` files, zero `<Suspense>` boundaries, zero skeletons in the twelve studio modules. Skeletons exist only in `components/quality/documents/document-skeleton.tsx` and on the marketing landing page. Every module renders empty, then fetches, then pops — the exact failure the design checklist's *Progressive Loading* section calls out. Addressed in `ui-ux-overhaul.md`.

### M-4 · 131 of 320 component files are `"use client"`
All twelve studio modules are client components, 37-69 KB of source each, fetching in `useEffect` after hydration. Nothing that could be server-rendered is. Measured build output: **3.54 MB raw / 1.06 MB gzipped** client JavaScript across 51 chunks, largest single chunk **1.14 MB raw (312 KB gz)**.

### M-5 · Four disjoint design-token systems
`--color-*` (landing), `--geex-*` (studio), `--doc-*` (quality editor / shadcn vocabulary), plus literal hexes in `tailwind.config.js` (`brand`, `steel`, `success`/`warning`/`danger`/`info`, `accent`, `geex`). No shared semantic layer, no spacing scale, no elevation or z-index scale, no radius scale, no typography scale. A status pill in Sales and a status pill in Quality get their colour from two different places.

### M-6 · `components.json` contradicts the repository
`"tsx": false` while every file in `src/components/ui/` is `.tsx`; `"cssVariables": false` while the design direction requires token-driven theming. Running `npx shadcn add` today emits `.jsx` with hardcoded colours into a `.tsx` token-based folder.

### M-7 · Legacy keys still in production Redis
Three families of pre-pivot keys (a 10.8 KB `db` string, a `settings` hash, and five collection keys) survive from the pre-pivot system. **No source file reads any of them.** They are invisible to every cascade and to the sweep.

### M-8 · Coarse write gate can mislead
`hrGuard(params, { write: true })` tests `sectionManageable` — "any write on any area of this module". Someone holding `hr.employees.edit` but not `hr.vacations.create` passes the gate and is then correctly refused by `requirePermission` inside the service. The behaviour is safe (defence in depth works), but the client receives `read-only` from the gate in some paths and `forbidden` from the service in others for the same class of refusal.

### M-9 · Write rights and read rights diverge on encrypted PII
`saveEmployment` requires `hr.employees.edit` to write `idNumber`/`passportNumber`, but `hr.employees.salary` to *read* them (`src/modules/hr/hr.js:370`, `:318`). Someone who cannot see an ID number can overwrite it.

### M-10 · `sweepOrphans` will time out before the data outgrows it
It is O(users + studios + indexes) *sequential* Redis commands. At 5,000 users that is >15,000 dependent round trips — past Vercel's function ceiling long before the dataset is large.

### M-11 · No function region pinned
`vercel.json` declares crons and nothing else. Functions default to `iad1`; Redis Cloud (`bedroom-roll-nice-66181.db.redis.io`) sits at an AWS region that is not pinned or documented anywhere in the repo. Given H-4, a cross-region mismatch multiplies every one of those 8 hops. This is the cheapest large win available and it is currently unverified.

### M-12 · No CI, no linter config, no test runner
No `.github/`. No `.eslintrc*` or `eslint.config.*` although `package.json` declares `"lint": "next lint"`. Tests are two files executed by bare `node`, with no runner, no reporter, no coverage and no gate on merge. The 90 KB `tests/suite.mjs` is genuinely good work with nothing enforcing that it stays green.

### M-13 · `jsconfig.json` and `tsconfig.json` both present
Next ignores `jsconfig.json` when `tsconfig.json` exists. It is dead configuration that will silently diverge.

### M-15 · The coarse write gate makes five declared rights unusable alone
`src/modules/quality/quality.js:79`, `src/platform/access/resolve.ts:sectionManageable`

Quality's workflow routes are gated `{ write: true }`, which tests `canManage` —
and `canManage` is `sectionManageable`, which only ever looks at the **create,
edit and delete verbs**. All five of Quality's powers are declared as `extra`
entries, not verbs:

`setup` · `review` · `approve` · `publish` · `obsolete`

So somebody granted exactly *"view a document and sign it off"* never reaches
the service that would let them — they are refused `read-only` by the gate.
**A quality manager who signs but never authors cannot sign anything.**

That defeats the separation of duties the module is built around. The catalogue
declares review and approve separately, in its own words, *"because they are two
people"* — and a reviewer who must also hold `edit` to exercise the right is
being handed authoring access purely to get past a gate.

This is M-8 with teeth. M-8 said the coarse gate produces a misleading error
message; here it makes a granted right unexercisable, which is the
dead-capability shape the permission catalogue explicitly forbids.

**Found by** a golden that asserted an approver could approve and got
`403 read-only`. Pinned by `quality.refused.approve.pureapprover`.

**Fix.** The gate should ask whether the caller holds *any* right the route can
act on, not whether they hold a write verb. Cleanest as part of Wave 2's route
wrapper, where `{ write: true }` becomes a declared permission set per route
rather than a module-wide flag.

---

### M-14 · Redis eviction policy unverified
The whole product depends on Redis never evicting. Nothing in the repo asserts `maxmemory-policy noeviction`, and nothing alerts on memory headroom. With C-3 and C-6 both able to grow the dataset without bound, an eviction policy of `allkeys-lru` would silently delete live invoices.

---

## 4. Low

- **L-1** `BCRYPT_ROUNDS = 10` (`passwords.js:8`). Raise to 12.
- **L-2** `readArr` returns `[]` for a corrupt/non-array value — a parse failure and an empty collection are indistinguishable.
- **L-3** `getMedia` parses a multi-MB JSON string just to read `visibility` before the auth check; store metadata in a hash and the payload separately.
- **L-4** `deviceFingerprint` reads `x-forwarded-for` unvalidated; on any non-Vercel path that header is caller-supplied and the device list becomes forgeable.
- **L-5** Rate-limit keys are per-instance-agnostic but fixed-window, so a burst straddling the boundary gets 2× the limit. Sliding window or token bucket.
- **L-6** No `robots`/`X-Robots-Tag` on `/api/*`; studio pages set `robots: {index:false}` but API responses do not.
- **L-7** `CH.user(userId)` publishes notification bodies over Redis pub/sub; anyone with `SUBSCRIBE` on the shared instance reads them. Publish only `{ kind, id }` and let the client fetch.
- **L-8** `RESERVED_SLUGS` does not include `q`'s siblings for future platform routes (`assets`, `cdn`, `status`, `health`, `webhooks`) — a studio can claim them today.
- **L-9** Error responses leak internal vocabulary (`no-section`, `same-signer`, `escalation`) to unauthenticated-adjacent callers. Fine for debugging, worth mapping to stable public codes.
- **L-10** **An unreachable guard in `requestVacation`.** `src/modules/hr/hr.js:487` refuses booking leave for somebody else with `if (target !== me && !canManage)`. That branch cannot fire: `canManage` is `sectionManageable` over HR's areas, and `SECTION_AREAS` maps `hr-employees` to **both** `hr.employees` and `hr.vacations` — so holding `hr.vacations.create`, which the line above already required, makes `canManage` true by construction. Anyone who reaches the check has already passed it. Not a hole (the permission does the work the branch was meant to do) but a guard nobody can exercise, which is the same dead-capability shape the permission catalogue forbids. Found by writing a test that asserted a refusal and got a 201. Pinned by `hr.vacation.forothers.bymanager`.

---

## 5. Gap analysis — what was not asked for and is missing anyway

These are structural necessities absent from the product, ordered by how much later work each one prevents.

1. **No idempotency on mutating endpoints.** A retried "create invoice" creates two invoices. `bumpCounter` guarantees the *number* is unique; nothing guarantees the *request* is applied once. Accept an `Idempotency-Key` header, claim it with `SET NX EX 24h`, return the stored response on replay. This is a prerequisite for the queue work in Phase 3, for mobile clients, and for any payment path (Stripe is already a dependency).

2. **No soft delete and no restore.** Deletion is prefix deletion — genuinely gone, immediately. For a system holding invoices and controlled documents, an accidental studio delete is unrecoverable, and there is no backup/restore procedure documented anywhere in the repo. Add `deletedAt` tombstones with a retention window before the cascade fires, plus a documented, *tested* point-in-time restore.

3. **No outbox for side effects.** Email, notification fan-out and event emission happen inline and best-effort. `deliverCode` failing means a locked-out user with only a `console.error` to show for it. An outbox row committed with the write, drained by a worker, makes delivery observable and retriable.

4. **No observability.** No structured logging, no request ids, no tracing, no metrics, no error reporting. `console.error` is the entire strategy. With H-4's latency profile there is currently no way to know which of the eight hops is slow in production, or whether C-3 is being exploited.

5. **No schema versioning on stored documents.** Every JSON document is implicitly versioned by the code that last wrote it. There is no `v` field and no migration runner, so a shape change requires either a lazy read-repair (which `plantMissingSections` does, on the hot path) or a hand-written script. Add `schemaVersion` now — it costs nothing today and is very expensive to retrofit.

6. **Multi-tenancy is enforced only in application code.** Every cross-tenant guarantee is a `studioContext` call a developer remembered to make. There is no database-level boundary. The SQL migration is the moment to make tenancy structural (`StudioId` on every table, row-level security or a mandatory tenant-scoped view layer) rather than conventional.

7. **No pagination contract.** No endpoint accepts `limit`/`cursor`. Every list is unbounded, so the first studio with 5,000 tickets breaks the Sales screen, the API response and the browser at the same time. Define the cursor contract *before* the SQL migration so it lands once.

8. **No plan enforcement beyond seat count.** `memberLimitOf` gates approvals; nothing gates storage, chat allowance is checked at the door but not on the write, and no module checks entitlement. A studio downgraded to Free keeps every module.

9. **No accessibility baseline.** No automated a11y check, no focus-visible audit, no contrast verification, and the studio's data tables are `<div>` grids in several modules. The design checklist requires 4.5:1 contrast, full keyboard navigation of data grids, and correct ARIA — none of which is currently measured. See `ui-ux-overhaul.md`.

10. **RTL is half-built.** The app is bilingual (EN/AR) and `stylis-plugin-rtl` is not installed, so MUI components render LTR inside an RTL page. Logical properties (`ps-`/`ms-`) are used in some places and physical ones in others.

---

## 6. Findings index

| # | Severity | Finding | Primary location |
|---|---|---|---|
| C-1 | Critical | Orphan sweep can delete the production dataset | `platform/db/cascade.ts:196` |
| C-2 | Critical | Cross-tenant read of private media | `api/media/[id]/route.js:13` |
| C-3 | Critical | Unauthenticated unbounded writes via `/api/track` | `api/track/route.js` |
| C-4 | Critical | No rate limit on password verification | `platform/auth/identity.js:235` |
| C-5 | Critical | Super-admin sessions never expire server-side | `platform/auth/superAuth.js:93` |
| C-6 | Critical | Media upload unquotaed and never reclaimed | `lib/media.js` |
| H-1 | High | Session tokens stored in plaintext | `platform/auth/users.js` |
| H-2 | High | Whole user registry read per request | `platform/auth/users.js:50` |
| H-3 | High | Whole-collection-per-key storage model | `platform/db/sections.ts:149` |
| H-4 | High | 8-9 dependent round trips per screen | measured, §2 |
| H-5 | High | `listSections` duplicated + reconciles on read | `lib/studios.js:123` |
| H-6 | High | Live updates refetch whole payloads | `studio2/useLiveUpdates.js` |
| H-7 | High | `ConflictError` returns 500 not 409 | `platform/db/store.ts` |
| H-8 | High | N+1 profile reads in list endpoints | `modules/hr/hr.js:338` |
| H-9 | High | Field encryption fails open and silent | `platform/auth/fieldCrypto.js:35` |
| H-10 | High | No CSRF defence, no security headers | `next.config.mjs` |
| H-11 | High | No audit trail for privileged actions | `keys.js:181` |
| M-1 | Medium | Three declared-but-dead capabilities | `keys.js`, `permissions.js` |
| M-2 | Medium | Four notification types never emitted | `platform/notify/notifications.js:43` |
| M-3 | Medium | No skeletons / Suspense / loading.js | `src/app` |
| M-4 | Medium | 131 client components, 1.06 MB gz | build output |
| M-5 | Medium | Four disjoint token systems | `globals.css`, `tailwind.config.js` |
| M-6 | Medium | `components.json` contradicts repository | `components.json` |
| M-7 | Medium | Legacy pre-pivot keys in production | live Redis |
| M-8 | Medium | Coarse write gate misleads | `modules/hr/hr.js:98` |
| M-9 | Medium | Write/read rights diverge on encrypted PII | `modules/hr/hr.js:370` |
| M-10 | Medium | Sweep will time out before data outgrows it | `platform/db/cascade.ts:196` |
| M-11 | Medium | No function region pinned | `vercel.json` |
| M-12 | Medium | No CI, no lint config, no test runner | repo root |
| M-13 | Medium | Duplicate `jsconfig.json` | repo root |
| M-14 | Medium | Redis eviction policy unverified | infrastructure |
| M-15 | Medium | Coarse write gate makes 5 declared rights unusable alone | `modules/quality/quality.js:79` |
| L-1 – L-10 | Low | See §4 | — |

---

## 7. Sequencing

**This week — stop the bleeding.** C-1 (prefix guard), C-4 (login limiter), C-5 (server-side console expiry), C-3 (track limiter), H-10 (security headers). All are small, local and independently shippable.

**This month — close the exposure.** C-2 and C-6 together (media to Blob, studio-scoped, quota'd). H-1 (hash session tokens). H-9 (fail closed). H-11 (audit log). M-1 (delete the dead capabilities or build the `/q` route). M-2 (emit the four missing notifications).

**Next quarter — the structural work,** in this order, because each depends on the one before:
1. `performance-audit.md` — batching, caching, region pinning. Wins 5-8× with no schema change and validates the measurement harness the migration will need.
2. `refactoring-strategy.md` — the repository seam and the route wrapper. This is what makes the storage swap a one-layer change.
3. `typescript-modularization.md` — types on the seam, department by department.
4. `database-migration-mssql.md` — dual-write, backfill, cut over.
5. `ui-ux-overhaul.md` — tokens, taxonomy, skeletons, server components.

Each has its own document in this folder.
