# Execution Plan

**Written 2026-08-20 · commit `166300f` · covers all 40 audit findings plus the 10 gap-analysis items.**

This is the working document. `recommendations.md` says what is wrong; this says who does what, in what order, and what has to be true before the next thing starts.

---

## Progress

Branch `wave-0-security-hardening`. Suite green, `tsc --noEmit` clean, production build succeeds after every item. **Wave 0 complete** — all 8 items, plus the housekeeping and two faults found while working.

| Item | Finding | State |
|---|---|---|
| 0.1 Prefix-guard the orphan sweep | C-1 | **done** — `SWEEP_SCOPES` + `sweepRefusal()`, 8 assertions, negative-tested by reverting the fix |
| 0.7 bcrypt 10 → 12 + rehash on login | L-1 | **done** — `needsRehash()` reads the cost from the hash; old hashes keep verifying and upgrade on next sign-in |
| Housekeeping | M-6, M-13 | **done** — `jsconfig.json` deleted; `components.json` → `tsx: true`, `cssVariables: true` |
| 0.2 Rate-limit before `verifyPassword` | C-4 | **done** — three counters, escalating lockout, applied to login + forgot + reset |
| Legacy key removal | M-7 | **done** — exported, then 7 keys deleted by explicit list; 163 → 156 keys, verified gone |
| 0.3 Console session expiry | C-5 | **done** — `ix:supersession:<sha256>` with real `EX`; digests in the row, never tokens; legacy raw tokens dead |
| 0.4 `/api/track` hardening | C-3 | **done** — per-IP window, cross-site Origin refused, HyperLogLog visitors, field-capped day hash |
| 0.5 Security headers | H-10 | **done** — HSTS, nosniff, DENY, Referrer/Permissions-Policy, CSP Report-Only; verified on a running server |
| 0.6 Media ownership check | C-2 | **done** — private blobs record their studio; membership is the test, not "is anyone signed in" |
| 0.8 Redis eviction policy | M-14 | **done** — verified `noeviction` (already correct); asserted in the suite and reported weekly by the sweep |
| Media keys namespaced | *found while working* | **done** — `lib/media.js` built `g:media:<id>` from a bare literal, so the suite wrote real blobs; now via `MEDIA.blob` |
| Namespace test over every key builder | *found while working* | **done** — 61 builders checked; closes the class that produced C-1 and the media leak |
| M-1 dead capabilities removed | M-1 | **done** — `quality.documents.share`, `ix:qshare`, `qualityShareLinks`, `S.tokens`, `ix:stoken`, `activityLog`, `S.media`, plus `RL.contactIp` and `MEDIA.prefix` found by the new check |

### Gate A (Wave 1) — in progress

| Piece | State |
|---|---|
| Golden-response harness + normaliser | **done**, negative-tested by renaming a field |
| Golden coverage | **139 goldens; every surface covered** — nine studio departments, identity, and the `/super` console, including the wall between the two identities in both directions |
| Permission matrix (102 keys) | **done** — resolution proven exhaustive |
| Hop counting | **done** — independently reproduces the audit's 8-wave figure |
| Architectural assertions | **done** — 6 checks, found 3 dead builders on first run |
| CI (typecheck, 3 suites, build, budget, ephemeral redis:8) | **done** |
| Bundle budget | **done** — 1091 KB gz against a 1200 KB ceiling |
| Per-route permission enforcement | **done for every module** — each pins its own refusal shapes, and M-15 records where a granted right cannot be exercised at all |
| ESLint config | **done** — flat config, 0 errors, a 201-warning backlog gated by `scripts/lint-budget.mjs` so it can only shrink |
| Observability (request ids, structured logs) | **done** — `src/platform/http/observability.js`; every line carries a request id, every request reports its Redis hop count |

**Opened while working, not yet decided:** `login()` checks `status === "suspended"` *before* verifying the password, so a suspended account is distinguishable from a non-existent one with no password at all — an enumeration oracle. Moving the check below `verifyPassword` closes it and costs one line, but it changes what a suspended person sees when they mistype their password. Decide before Wave 1 records golden responses.

---

## 0. Assumptions — check these before starting

The plan is shaped by four assumptions. Each is drawn from evidence in the repository or the live instance. **If any is wrong, tell me — two of them change the plan materially.**

| # | Assumption | Evidence | If wrong |
|---|---|---|---|
| **A1** | **Pre-launch or pilot.** No paying tenants depend on uptime yet. | 3 studios, 5 users, 15 media blobs on the live instance. 214 commits since 2026-08-06. Legacy pre-pivot keys still present. | **Big change.** The SQL migration gains a dual-write phase (+4 weeks), every schema change needs a backfill script, and Wave 0 fixes need staged rollout instead of direct deploy. |
| **A2** | **Small team — one to three developers.** | Single git author across all 214 commits. | Waves can run more in parallel; the calendar compresses roughly linearly up to about three streams. |
| **A3** | **The data is precious even though the tenant count is small.** | Real quotations, invoices and controlled documents exist in the reference studio. | If it is genuinely disposable test data, Wave 5 can drop dual-write entirely and cut over in one step. |
| **A4** | **Functional parity is required.** Nothing the product does today may stop working. | Stated in the brief. | If specific features can be dropped, say which — several (the dead capabilities in M-1) are cheaper to delete than to finish. |

**Calendar below assumes A1 + A2 (one primary developer).** Weeks are working weeks, not elapsed.

---

## 1. Shape

Six waves. Waves 2-4 overlap; 0, 1 and 5 do not.

```
W0  Stop the bleeding          week 1          ── must ship before anything else
W1  Safety net                 weeks 2-4       ── GATE: nothing after this starts until green
W2  Seams + performance        weeks 5-12
W3  TypeScript + modules       weeks 9-20      ── overlaps W2 from week 9
W4  UI/UX system               weeks 9-24      ── independent, runs alongside W2/W3
W5  SQL Server                 weeks 20-32     ── needs W2's repository seam finished
```

**The two gates that are not negotiable:**
- **Gate A (end of W1):** golden-response tests for all 97 routes, permission matrix, CI green. Nothing in W2+ starts before this. Without it, "exact functional parity" is a hope, not a property.
- **Gate B (end of W2):** every service calls the repository interface; zero direct `readCol` in service code. Without it W5 is an application rewrite instead of a second adapter.

---

## 2. Wave 0 — Stop the bleeding · **week 1**

Eight changes. All small, all local, all independently deployable. Ship them in this order; do not batch them into one pull request.

| # | Fix | Finding | Files | Effort |
|---|---|---|---|---|
| 0.1 | **Prefix-guard `sweepOrphans`** + refuse to delete when the registry is empty | C-1 | `platform/db/cascade.ts` | 30 min |
| 0.2 | **Rate-limit before `verifyPassword`**, keyed on email + IP, escalating lockout; same on `/forgot` and `/reset` | C-4 | `platform/auth/identity.js`, `platform/db/keys.ts` | 2 h |
| 0.3 | **Server-side console session expiry** — `ix:supersession:<sha256>` with `EX`; `timingSafeEqual` | C-5 | `platform/auth/superAuth.js` | 3 h |
| 0.4 | **Rate-limit + Origin check on `/api/track`**; HyperLogLog for the visitor set; TTL restored | C-3 | `api/track/route.js`, `platform/db/keys.ts` | 3 h |
| 0.5 | **Security headers** — CSP (report-only first), HSTS, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, `poweredByHeader: false` | H-10 | `next.config.mjs` | 2 h |
| 0.6 | **Ownership check on private media** — compare `owner`, and require studio membership for studio-scoped blobs | C-2 | `api/media/[id]/route.js` | 2 h |
| 0.7 | **Bcrypt 10 → 12** | L-1 | `platform/auth/passwords.js` | 5 min |
| 0.8 | **Verify and pin Redis `maxmemory-policy noeviction`**; add a memory-headroom alert | M-14 | infrastructure | 1 h |

**0.1 in full, because it is the one that cannot wait:**

```js
import { KEY_PREFIX as P } from "@/platform/db/keys";

export async function sweepOrphans() {
  const users = await readArr(REG.users);
  const studios = await readArr(REG.studios);

  // An empty registry is never a licence to delete everything. Under a test
  // prefix this is the normal state, and the reap below would take the real
  // key space with it.
  if (P && !users.length && !studios.length) {
    console.warn(`[sweep] refusing: prefix "${P}" set and both registries empty`);
    return { skipped: "empty-registry-under-prefix" };
  }
  …
  for (const k of await scanPrefix(`${P}ix:email:`)) …
  for (const k of await scanPrefix(`${P}ix:slug:`))  …
  for (const k of await scanPrefix(`${P}ix:owner:`)) …
  for (const k of await scanPrefix(`${P}ix:collab:`)) …
  for (const id of strandedRoots(await scanPrefix(`${P}u:`), `${P}u:`, userIds)) …
  for (const id of strandedRoots(await scanPrefix(`${P}s:`), `${P}s:`, studioIds)) …
}
```

**Correction, made while building it.** The original note here said to prove the
guard by running the sweep under `test_` with live-shaped decoy keys outside the
prefix. That test must never be written: the suite shares one Redis with
production, so a regression test that *executed* `sweepOrphans` to prove it was
safe would be the very thing it guards against — and it would fire exactly when
the fix was absent, which is when it is most dangerous.

Both guards are therefore expressed as **pure values** — `SWEEP_SCOPES` (every
prefix the sweep may scan) and `sweepRefusal()` — so they can be asserted
without a single `DEL`. The load-bearing assertion states the property rather
than the implementation: *no live key is matchable by any prefix this sweep
scans*. Reverting the fix makes it fail and name the real keys that would have
been deleted.

**Also in week 1, zero-risk housekeeping:**
- Delete `jsconfig.json` (M-13).
- Fix `components.json` → `"tsx": true`, `"cssVariables": true` (M-6).
- Delete the legacy pre-pivot keys after one export (M-7).
- Pin the function region in `vercel.json` to the Redis region, and measure before/after (M-11).

**Wave 0 exit:** all eight deployed; the sweep test proves the guard; a deployed latency probe reports the in-region hop cost.

---

## 3. Wave 1 — Safety net · **weeks 2-4** · **GATE A**

Nothing after this wave starts until this is green. This is the wave that makes "exact functional parity" a property rather than an intention.

### 3.1 Characterisation harness (week 2-3)

Extend `tests/suite.mjs`, which already drives the real routes against a prefixed Redis:

- **Golden responses, all 97 routes.** Fixture studio, request, recorded status + exact JSON. Any field rename, null-vs-empty-string change or status-code change fails.
- **Permission matrix, all 104 keys.** One collaborator holding exactly one key; assert allow on the intended route, deny on its neighbours.
- **Concurrency tests on `editArr`.** N parallel writers on one collection; assert every write survives.
- **Hop-count assertion per route.** Wrap the Redis client, tally commands in `AsyncLocalStorage`, assert the count. This is what stops W2's batching from regressing later.

### 3.2 CI (week 3)

`.github/workflows/ci.yml` — there is no `.github/` today:

```
typecheck   tsc --noEmit
lint        eslint          ← config to be written (M-12); none exists despite `next lint` in package.json
test        the suite, against a redis:8 service container — not the shared production instance
budget      client bundle size ceiling
contrast    token-pair contrast check (W4 needs it; add the harness now)
```

Two lint rules worth writing on day one, both of which fail today and should:
- every key in `ALL_PERMISSIONS` appears in at least one `requirePermission`/`can` call → catches `quality.documents.share` (M-1);
- every key builder in `keys.js` has a reader → catches `activityLog` and `ix:stoken` (M-1).

### 3.3 Observability (week 4)

Nothing in W2 can be judged without this:
- structured logs with a request id, route, hop count, bytes read, duration;
- error reporting (Sentry or equivalent) — `console.error` is currently the whole strategy;
- Redis memory + connection-count dashboard and alert.

### 3.4 Deletions (week 4)

Cheaper to remove than to finish, per M-1 and M-2:
- `ix:qshare`, `qualityShareLinks`, `quality.documents.share` — **or** build the `/q/<token>` route. Decide; do not leave a permission that grants nothing.
- `s:<id>:activityLog` — delete the builder now; the real audit log arrives in W2 with a different shape.
- `S.tokens` / `ix:stoken` — delete the builders and the cascade branch.
- The four unemitted `NOTIFY.*` constants — **do not delete these**; they get producers in W2. `joinDecided` in particular is a visible product bug.

**Gate A exit:** CI green on `main`; a deliberate one-character change to any route makes the golden test fail.

---

## 4. Wave 2 — Seams + performance · **weeks 5-12** · **GATE B**

Detail in `refactoring-strategy.md` and `performance-audit.md`. Order matters: each item lands in a seam built by the one before it, so the work shrinks as it goes.

| Sprint | Work | Findings closed |
|---|---|---|
| **W5-6** | **Seam A — the route wrapper.** One auth spec per route, one error table, `ConflictError` → 409, request id on every response, idempotency keys, `Origin` check. Convert in order: identity → studios → one department at a time. | H-7, H-10 (CSRF), gap #1 |

> **The route wrapper's checklist writes itself.** Gate A scans every recorded
> golden for a refusal whose HTTP status disagrees with what the error name
> means, prints each one as `for wave 2: …`, and fails the build if a *new* one
> appears. Today that is 3, all in `technical/quotations` — which maps
> everything except `notfound` and `locked` to 400, so a permission refusal
> arrives as `400 forbidden` where `403` would be honest. The known count is a
> constant in `tests/gate-a.mjs`; **lower it as the wrapper lands**, and expect
> the list to grow on its own as the remaining modules get goldens.
| **W7** | **Speed refactors R1, R2, R6, R9.** Pass `sections` down (kills hop 7 everywhere); move `plantMissingSections` off the read path; move `lastSeenAt`/`lastLoginAt` off `g:users`; batch the `getProfile` N+1. | H-5, H-8, H-2 (partly) |
| **W8** | **Request-scoped cache + batched prefetch.** `AsyncLocalStorage` map keyed by Redis key; two `MGET` waves; widen `ix:slug` to carry the studio document. **Target: 8 hops → 2.** | H-4, H-2 |
| **W9** | **Targeted live updates.** The event already carries `{collection, rowId}` and no consumer reads it. Add a per-row endpoint; patch the client array in place. | H-6 |
| **W10** | **Media to Vercel Blob.** Studio-scoped keys, per-plan quota, dedupe by content hash, sweep integration. `BLOB_READ_WRITE_TOKEN` is already provisioned. | C-6, C-2 (fully) |
| **W10** | **Audit log.** One `AuditLog` write from the route wrapper — one edit, not 97. `{at, actor, actorType, studioId, action, subject, before, after, ip, requestId}`. | H-11 |
| **W11** | **Security hardening round 2.** Hash session tokens and reset codes at rest; `fieldCrypto` fails closed; publish `{kind, id}` over pub/sub instead of notification bodies; super-admin MFA. | H-1, H-9, L-7 |
| **W11** | **Notification producers.** The four unemitted types first (`joinDecided` leads), then the event-driven triggers, permission-gated at write time. | M-2 |
| **W12** | **Seam B — the repository interface.** `repo(collection).find({where, order, limit, cursor})`, Redis adapter only, behaviour byte-identical. Pagination contract defined here. | H-3 (interface), gap #7 |
| **W12** | **Rewrite `sweepOrphans`** as a batched, resumable, chunked job that cannot time out. | M-10 |

Also in this wave, from the gap analysis: **soft-delete tombstones** (gap #2), the **outbox for email and fan-out** (gap #3), and **`schemaVersion` on every stored document** (gap #5 — costs nothing now, very expensive to retrofit).

**Gate B exit:** zero direct `readCol` calls in service code; hop-count assertions show ≤2 per module request; golden tests unchanged throughout.

---

## 5. Wave 3 — TypeScript + departmental modules · **weeks 9-20**

Runs from week 9, overlapping W2's later sprints. Full detail in `typescript-modularization.md`.

| Weeks | Step |
|---|---|
| 9 | `shared/` — currencies, countries, format, slug, i18n. Pure, no dependents to break. |
| 10 | `platform/access` — yields the `PermissionKey` union that everything else wants. |
| 11-12 | `platform/db` — keys, store, cascade, the repository interface. **Only after Gate B.** |
| 13 | `platform/auth`, `realtime`, `notify`, `http`, `relations` |
| 14-19 | One department per step, ascending by cross-module reads: **tasks → main → people → finance → operations → hr → inventory → projects → technical → sales**. Quality is already TypeScript and only moves folders. |
| 20 | `app/` reduced to re-exports; `checkJs` on repo-wide; `allowJs` deleted. |

**`noImplicitAny` and the 99 route files both landed ahead of step 20**, on
22/08/2026. `tsconfig.strict.json`'s `include` is `src/**/*`, so every `.ts` and
`.tsx` in the tree is graded with it on and the folder list that made the
ratchet a ratchet is gone — there is nothing left to add. The routes converted
as a rename rather than a rewrite because four things were fixed at the seam
instead of ninety-nine at the leaves; see `progress.md`.

What step 20 still owns is `checkJs` and the `app/` restructure. `checkJs` is
the 212 `.js` files left, every one of them a browser file: they convert with
Wave 4's UI work, and `tsconfig.strict.json` and `allowJs` go with them.

Per department, in strict order: **pure `git mv` commit** → rename to `.ts` → write `schema.ts` transcribed from the existing coercion → replace hand-rolled coercion → add `index.ts` manifest → enable `noImplicitAny` for that folder. Golden tests must not move at any point.

---

## 6. Wave 4 — UI/UX system · **weeks 9-24**

Independent of the server work; runs in parallel throughout. Full detail in `ui-ux-overhaul.md`.

| Weeks | Phase |
|---|---|
| 9 | Token layer: primitives + semantics + spacing/elevation/radius/type. `--geex-*` and `--doc-*` re-pointed as aliases. **No visual change.** |
| 10-11 | `src/ui/` primitives, form controls, overlays. shadcn-generated, tokens applied. MUI theme bound to the same variables, including `zIndex`. |
| 12-13 | **Skeletons everywhere** + `loading.tsx` + Suspense boundaries. Highest user-visible payoff in the entire plan, and independent of everything else. |
| 13 | **Toast layer.** There is none today — every mutation currently succeeds or fails silently. |
| 14-19 | Component split per module (server shell / table island / lazy dialogs / pure `derive.ts`). Sales first. Shares the work with W3's per-department step — **do it once, in the same slice, not twice.** |
| 20-22 | MUI Data Grid on the five dense grids; pagination wired to W2's cursor contract. |
| 23-24 | Accessibility pass: keyboard, ARIA, contrast in CI, RTL completion (`stylis-plugin-rtl` install + logical properties). |

Closes M-3, M-4, M-5, M-6, and the a11y and RTL gap items (#9, #10).

**One thing to settle in week 9**, before the token layer is written: the ERP is light-first blue/Saira; the main website is dark-first indigo/Sora. My recommendation is to adopt the brand hue, accent family, easing curves and display face while keeping the ERP light-first with full dark mode. That decision is yours and it blocks the token layer.


### Two requirements added 22/08/2026

**1. No placeholder data in a field, anywhere.** Fields across the studio carry
sample values left over from before the migration off the old system. A field is
a space to be filled; filling it with plausible-looking data that is not the
studio's data is the same failure the console's fabricated Security tab was —
somebody reads it as a record. This is a sweep, not a feature: every `defaultValue`,
`placeholder` that states a fact rather than a format, and every seeded sample
row. A placeholder that shows the SHAPE ("+966 5X XXX XXXX", "dd/mm/yyyy") stays;
one that shows a VALUE goes.

**2. Every studio section gets a dashboard, and the dashboards are tiered.**
Eight parents already have a `*.dashboard` view right in the catalogue and six
render a module dashboard; the rest render nothing or a generic shell. Each
section needs one built from statistic boxes, graphs and section information —
and what a section can honestly show has to come from what its records actually
hold, so each department needs its own analysis pass before anything is drawn.

The complexity is **tiered the way `/super` tiers are**, so a studio on Standard
gets simple direct statistics (counts, sums, this-month-vs-last) and the higher
tiers unlock progressively heavier analysis.

Both settled 22/08/2026:

- **The ladder is `basic` / `simple` / `moderate` / `advanced`.** Standard and
  basic read as one rung, so the first name changed. Each level unlocks
  progressively heavier analysis; `basic` is counts and sums.
- **A tier carries an explicit `analyticsLevel`** from that set. NOT inferred
  from the tier's name: a `/super` tier is a studio-authored record whose name is
  free text (`DEFAULT_TIER` in `lib/data/catalog.js` seeds one called "Standard"
  and nothing stops another being called anything at all), so a dashboard keyed
  to the name would break the first time somebody renamed one. This is a
  catalogue change — a new field on the tier record, defaulted for existing rows.


Scheduling: the per-section analysis is research, the tier field is a small
catalogue change, and the drawing shares the W4 component-split slice — same
rule as above, done once per department rather than twice.

---

## 7. Wave 5 — SQL Server · **weeks 20-32**

Needs Gate B. Full detail in `database-migration-mssql.md`.

| Weeks | Stage |
|---|---|
| 20-22 | **Stage 0.** Schema deployed; `repo/sql.ts` written; the golden suite runs green against **both** adapters in CI. Nothing in production changes. |
| 23-24 | **Stage 1.** Backfill, one transaction per studio, idempotent and resumable, insertion order derived from `relations.js`' topological sort. Ids preserved verbatim. |
| 25-27 | **Stage 2.** Dual-write, read from Redis. Nightly reconciler reports drift. Three verification checks: row counts, checksums, and response equality against the golden set. |
| 28-30 | **Stage 3.** Read from SQL, per studio behind a flag. Internal studio → 5% → all. Redis still written, so rollback is a flag flip. |
| 31 | **Stage 4.** SQL is the source of truth. Transactions replace multi-key writes. |
| 32 | **Stage 5.** Decommission migrated prefixes after a clean retention window. Redis keeps: OTP, rate limits, chat, FX, the event stream, pub/sub, sessions. |

Closes H-3 fully, H-2 fully, and gap items #6 (structural tenancy) and #2 (restore).

**If A3 is wrong and the data is disposable**, stages 2-3 collapse into a single cutover and this wave becomes 5 weeks instead of 13.

---

## 8. Finding → wave

Every one of the 40 findings, assigned. Nothing is unowned.

| Wave | Findings |
|---|---|
| **W0** | C-1, C-2 (guard), C-3, C-4, C-5, H-10 (headers), L-1, M-6, M-7, M-11, M-13, M-14 |
| **W1** | M-1, M-12, L-6, L-8, L-9 · plus the harness and observability |
| **W2** | C-2 (full), C-6, H-1, H-2, H-4, H-5, H-6, H-7, H-8, H-9, H-10 (CSRF), H-11, M-2, M-8, M-9, M-10, L-2, L-3, L-4, L-5, L-7 |
| **W3** | — (structural; enables the rest) |
| **W4** | M-3, M-4, M-5 |
| **W5** | H-3 |
| **Gaps** | #1 idempotency → W2 · #2 soft delete → W2, restore → W5 · #3 outbox → W2 · #4 observability → W1 · #5 schemaVersion → W2 · #6 structural tenancy → W5 · #7 pagination → W2 contract, W5 execution · #8 plan enforcement → W2 · #9 a11y → W4 · #10 RTL → W4 |

---

## 9. Working agreements

These are what keep a six-month plan from drifting.

1. **Every session starts from a green `main`.** If CI is red, fixing it is the session.
2. **One concern per pull request.** A move and a rewrite never share a commit — a pure `git mv` is reviewable at a glance; a move plus a rewrite is not.
3. **Golden tests are the contract.** If a response changes, the change is wrong until deliberately re-recorded in its own commit with a stated reason.
4. **Hop counts are part of the contract.** A route that regresses from 2 hops to 8 fails the build.
5. **No new `readCol` in service code** after Gate B. Lint-enforced.
6. **The preserve-list is binding.** `system_architecture.md` §14 and `refactoring-strategy.md` §6 list what must not be "cleaned up". Each entry exists because a real failure produced it.
7. **Measure before and after, every performance change.** The probe scripts from this audit are the baseline.
8. **Deletions get an export first.** Cheap insurance, and the one habit that makes C-1-class mistakes survivable.

---

## 10. Week 1, day by day

| Day | Work |
|---|---|
| **Mon** | 0.1 sweep guard + its test. Deploy. Then 0.7 bcrypt. Export and delete the legacy pre-pivot keys. |
| **Tue** | 0.2 login rate limiter (+ forgot/reset). Deploy. |
| **Wed** | 0.3 console session expiry. 0.4 track limiter + HyperLogLog. Deploy. |
| **Thu** | 0.5 security headers, CSP report-only. 0.6 media ownership check. Deploy. |
| **Fri** | 0.8 Redis eviction policy + alerting. Region pin + before/after latency measurement. Delete `jsconfig.json`, fix `components.json`. Start the W1 harness. |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Wave 1 feels like no progress and gets skipped | It is the gate. Every wave after it depends on parity being provable. Skipping it means discovering breakage in production instead of in CI. |
| Six months is longer than the business can wait | W0 and W2's first four sprints deliver the visible wins — the app stops being slow around week 8, and skeletons land week 13. W5 is invisible to users and can slip without hurting anyone. |
| Parallel W3 and W4 collide on the same files | They share exactly one step — the per-department component split. Do it once, in the same slice. Sequence departments identically in both waves. |
| The SQL migration reveals data that will not map | Stage 1 writes every anomaly to a `MigrationAnomaly` table and Stage 3 does not begin until that table is reviewed. Nothing is silently defaulted. |
| Scope grows mid-wave | Anything not in §8 goes on a list and is scheduled into a later wave, not the current one. |
| A1 is wrong and there are live tenants | Tell me now. It adds ~4 weeks to W5 and changes W0 from direct deploys to staged rollout. |

---

## 12. What I need from you to start

1. **Confirm or correct A1-A4** (§0). A1 and A3 change the calendar most.
2. **Decide M-1:** delete the share-link capability, or build the `/q/<token>` route. Either is fine; leaving it is not.
3. **Decide the palette question** (§6) before week 9.
4. **Say whether anything in §8 is not worth doing.** Several items are cheaper to remove than to finish, and A4 is the assumption I am least sure of.

Then week 1 starts Monday.
