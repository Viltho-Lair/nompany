# Performance Audit & Fetching / Caching Plan

**Measured 2026-08-20** against the live Redis instance (`bedroom-roll-nice-66181.db.redis.io`, Redis 8.6.2, AWS) using read-only commands only. Bundle figures from a clean `next build` at commit `166300f`.

---

## 1. What was measured, and how to reproduce it

Two probes were run from the development workstation. Both issue only `PING`/`GET`/`STRLEN`/`TYPE`/`SCAN`/`MEMORY USAGE`/`INFO` — nothing was written.

- **Probe A** — key census, value sizes, row counts, and a set of timed access patterns.
- **Probe B** — a byte-for-byte replay of the key sequence that `GET /api/studios/<slug>/sales` and the studio shell actually issue, timed sequentially and then batched.

Each figure is p50 of 8-30 iterations.

### Baseline

| Measurement | Value |
|---|---|
| `PING` round-trip, p50 | **164.3 ms** (min 158.2, p95 170.2) |
| Total keys | 163 |
| Total dataset | ~8.54 MB |
| Redis `used_memory` | 36.49 MB |
| Connected clients | 24 |
| Redis version | 8.6.2 |

**The 164 ms RTT is the development workstation's distance to AWS, not production's.** In-region on Vercel it would be 1-5 ms. That does not make the finding smaller — it means the *ratios* below are the finding, and the absolute numbers are what a developer, or a user in a distant region, experiences today. The hop count is invariant.

---

## 2. The headline: dependent round trips

Every Redis command is one round trip. The application's read paths are **chains**, because each hop supplies the key the next hop needs.

### `GET /api/studios/<slug>/sales`

```
1  GET ix:session:<token>                 currentUser → findUserBySession
2  GET g:users                            getUserById — whole registry, parse, .find()
3  GET ix:slug:<slug>                     studioContext → getStudioBySlug
4  GET g:studios                          getStudioById — whole registry again
5  GET s:<sid>:collaborators              getCollaboratorByUser
6  GET s:<sid>:roles ‖ s:<sid>:sections   listRoles ‖ listSections   (parallel — 1 RTT)
7  GET s:<sid>:sections                   salesContext re-reads. DUPLICATE.
8  GET × 8 collections                    (parallel — 1 RTT)
```

| | Hops | p50 | min |
|---|---|---|---|
| As written | 8 | **1421 ms** | 1399 ms |
| Same 15 keys, one batch | 1 | **180 ms** | 175 ms |
| **Reduction available** | | **7.9×** | |

### Studio shell (`app/studio/[[...segments]]/page.js`)

Adds the questionnaire gate, `loadCatalogues()`, the profile read and `chatUsage`:

| | Hops | p50 |
|---|---|---|
| As written | 9 | **1532 ms** |
| Fully batched | 1 | **174 ms** |
| **Reduction available** | | **8.8×** |

### The user's actual experience

The shell renders on the server (1532 ms), the client hydrates, then the module fetches (1421 ms). **≈2.95 s of Redis latency before Sales has data**, and nothing is drawn in the meantime because there is no skeleton and no Suspense boundary.

### Sequential vs parallel, isolated

| Pattern | p50 |
|---|---|
| 6 collections, `Promise.all` | 167 ms |
| 6 collections, sequential `for` loop | **988 ms** |

The code already uses `Promise.all` correctly *within* a step. The cost is entirely in the dependencies *between* steps.

---

## 3. Where the bytes are

| Bytes | Type | Key |
|---:|---|---|
| 2,566,139 | string | `g:media:3871d7cd…` |
| 1,467,824 | string | `g:media:0648f480…` |
| 590,857 | string | `g:media:968ababc…` |
| 565,533 ×4 | string | `g:media:…` |
| 58,700 | **stream** | `s:std_msp4vswf2kdwy0:events` |
| 10,820 | string | `megatech:db` ← **legacy, zero readers** |
| 8,409 | string | `s:std_…:sections` (34 rows, 247 B/row) |
| 5,143 | string | `…:c:generatedDocuments` (1 row) |

**15 media blobs hold 6.5 MB — 76% of the entire dataset.** They are base64 (≈1.34× inflation), platform-scoped at `g:media:*` so no cascade reaps them, and unknown to the orphan sweep. Redis memory is the platform's hard availability ceiling.

`s:<sid>:sections` is 8.4 KB and is read **two to three times per request**. It changes approximately never.

---

## 4. Complexity, not just latency

Latency is fixable with batching. These are not.

| Operation | Today | Rows scanned |
|---|---|---|
| Find a user by id | `GET g:users` + `.find()` | **all users** |
| Find a user by email | `GET ix:email` → `GET g:users` + `.find()` | all users |
| Find a studio by slug | `GET ix:slug` → `GET g:studios` + `.find()` | all studios |
| Find one quotation by id | `GET …c:quotations` + `.find()` | all quotations |
| List tickets for a screen | 6 whole collections joined in JS | all of six collections |
| Update one row | read + rewrite whole array (CAS) | whole collection |
| "Tickets created this month" | read all, filter in JS | all tickets |
| Any sort, any page | read all, sort in JS | all rows |

There is **no index, no `WHERE`, no `ORDER BY` and no pagination anywhere in the product.** Two amplifiers make this worse than it reads:

- **`touchLastSeen` fires on every authenticated request.** It calls `getUserById` (whole registry) and, every 3 minutes per user, rewrites the whole registry through `editArr`. At 10,000 users × 250 B that is a 2.5 MB CAS write per user per 3 minutes, all contending on one key.
- **Live updates refetch everything.** `useLiveUpdates(slug, section, load)` re-runs the full module payload on any event. One ticket edit in a 30-seat studio triggers 30 clients × 6-collection payloads. `StudioSales` subscribes to two sections, so Technical activity fires it too.

### Projected

| Studio size | `salesTickets` | Read per screen open | Write per row edit |
|---|---|---|---|
| 100 tickets | ~120 KB | ~500 KB (6 collections) | 120 KB |
| 1,000 tickets | ~1.2 MB | ~4 MB | 1.2 MB |
| 5,000 tickets | ~6 MB | ~18 MB | 6 MB |

At 5,000 tickets a single screen open moves ~18 MB out of Redis, parses it in the function, and ships the filtered remainder to the browser. Contention on `editArr` grows with concurrent editors on the same collection; `MAX_ATTEMPTS = 64` is then a hard wall that surfaces as HTTP 500.

---

## 5. Client-side cost

| Measurement | Value |
|---|---|
| Client JS, raw | **3.54 MB** across 51 chunks |
| Client JS, gzipped | **1.06 MB** |
| Largest single chunk | 1.14 MB raw / 312 KB gz |
| `"use client"` files | **131 of 320** |
| `loading.js` files | **0** |
| `<Suspense>` boundaries | **0** |
| Skeletons in the 12 studio modules | **0** |

All twelve modules are client components (37-69 KB of source each) that fetch in `useEffect` after hydration with `cache: "no-store"`. Nothing that could be server-rendered is. There is no bundle analyzer, no size budget, and no route-level code splitting beyond what Next does automatically.

---

## 6. The plan

Five stages. Stages 1-3 need no schema change and are independently shippable.

### Stage 1 — Free wins (days, no risk)

| Action | Expected |
|---|---|
| **Pin the function region** in `vercel.json` to the Redis region and verify with a deployed probe. | The single largest absolute win, and currently unverified. |
| **Delete hop 7.** `studioContext` already returns `sections`; every `*Context` and `api/studios/[slug]/route.js` re-read it. Pass it down. | −1 hop everywhere (−164 ms here, −12% of the chain) |
| **Move `plantMissingSections` off the read path** to studio creation plus a one-off backfill. | Removes a reconciliation pass from every request |
| **Move `lastSeenAt`/`lastLoginAt`** off `g:users` onto `u:<id>:profile`. | Removes the hottest CAS contention in the system |
| **Add `Cache-Control` to genuinely static endpoints** (`/api/pricing`, `/api/fonts`). | Removes them from the origin entirely |

### Stage 2 — Request-scoped memoisation (a week)

Wrap the per-request reads in React's `cache()` (server components) and an `AsyncLocalStorage` map (route handlers), keyed by Redis key:

```js
// src/lib/data/request-cache.js
const store = new AsyncLocalStorage();
export const withRequestCache = (fn) => store.run(new Map(), fn);
export async function cachedGet(key, load) {
  const m = store.getStore();
  if (!m) return load();
  if (!m.has(key)) m.set(key, load());   // the PROMISE, so concurrent callers share one flight
  return m.get(key);
}
```

Route `getJSON`/`readArr` through it for reads only — never writes. This alone removes hops 2, 4 and 7 (duplicate registry and section reads) with no call-site changes, and makes N+1 patterns like `listEmployees`' per-employee `getProfile` collapse when the same profile repeats.

### Stage 3 — Collapse the chain (2-3 weeks)

**Prefetch what the chain will need, in one batch, before the chain runs.** The keys are derivable from the URL and the cookie:

```js
// One MGET, issued before studioContext, on the keys the request will certainly want.
const [session, users, slugIx] = await mget(IX.session(token), REG.users, IX.slug(slug));
// studioId is now known → a SECOND batch covers everything else.
const [studios, collaborators, roles, sections, ...cols] = await mget(
  REG.studios, S.collaborators(sid), S.roles(sid), S.sections(sid),
  ...collectionsFor(module).map(c => SEC.col(sid, sectionIdFor(c), c)),
);
```

Two hops instead of eight. To get to two rather than three, denormalise `ix:slug:<slug>` from `→ StudioID` to `→ {studioId, name, slug, sectionIds}` — the slug index is written once at studio creation and on rename, so a slightly wider value costs nothing and removes a whole hop.

**Also in this stage:**
- **Targeted live updates.** The event already carries `{collection, rowId}`. Add `GET …/<module>/row?collection=&id=` and patch the client's array in place instead of refetching the module. Removes the N-clients × full-payload amplification.
- **`ConflictError` → 409** via one shared route wrapper (see `refactoring-strategy.md`), so clients can retry instead of seeing 500.
- **Idempotency keys** on mutating endpoints — `SET NX EX 24h` on the key, return the stored response on replay.

### Stage 4 — Caching tiers

Three tiers, each with an explicit invalidation rule. **Nothing tenant-scoped is cached without a studio-scoped tag** — a stale cross-tenant read is worse than a slow one.

| Tier | What | Mechanism | Invalidated by |
|---|---|---|---|
| **Request** | anything read twice in one request | `AsyncLocalStorage` map | end of request |
| **Process** | `g:packages`, `g:tiers`, `g:erpServices`, `g:catalogSettings`, `fx:usd` | in-memory LRU, 60 s TTL | TTL + explicit bust on `/super` catalogue write |
| **Edge / ISR** | `/api/pricing`, marketing metadata | `revalidate` + `revalidateTag` | tag on catalogue write |

Deliberately **not** cached: anything under `s:<StudioID>:*` beyond the request scope, and anything derived from `access`. The permission set must be recomputed per request — a cached "may edit" outliving a role change is a security bug, not a stale render.

`s:<sid>:sections` is the one tenant-scoped exception worth making, because it changes approximately never: cache it per studio with a version counter bumped on any section write, and read the counter with the batch you were already issuing.

### Stage 5 — Structural (the SQL migration)

Everything in §4 is a property of the storage model, not of the code above it. Indexes, `WHERE`, `ORDER BY`, `LIMIT`/`OFFSET`, joins pushed into the database, and single-row updates that do not rewrite a collection all arrive with `database-migration-mssql.md`. Stages 1-4 are what make that migration a one-layer change rather than a rewrite — and the measurement harness built here is what proves it was worth doing.

---

## 7. Targets

Measured in-region (Vercel function ↔ Redis/SQL in the same region), which is the environment that matters.

| Metric | Today (est. in-region) | After stage 3 | After stage 5 |
|---|---|---|---|
| Redis/DB hops per module request | 8 | **2** | 1-2 |
| Server time, Sales endpoint p50 | ~40 ms | ~10 ms | ~8 ms |
| Bytes read per Sales screen (1,000 tickets) | ~4 MB | ~4 MB | **~40 KB** (paged) |
| Live-update cost per edit, 30 seats | 30 × 4 MB | 30 × 4 MB | **30 × ~2 KB** |
| Client JS, gzip | 1.06 MB | 1.06 MB | **< 400 KB** (see `ui-ux-overhaul.md`) |
| Time to first meaningful paint | after full fetch | skeleton immediately | skeleton immediately |

## 8. Instrumentation to add first

None of the above should be shipped without the ability to see it. Before stage 1:

1. **Count round trips per request.** Wrap the Redis client, tally commands in `AsyncLocalStorage`, and emit the count on a response header in preview. A regression from 2 hops back to 8 must be visible in a pull request, not in production.
2. **Structured request logs** with a request id, route, hop count, bytes read and duration.
3. **A size budget in CI** on the client bundle, failing the build on regression.
4. **A Redis memory alert** with headroom, given that media and analytics can both grow unbounded today.

Without these, every number in this document decays the day after it was written.
