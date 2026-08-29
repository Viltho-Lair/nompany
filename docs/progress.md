# Progress

**What this is:** live state against `execution-plan.md`. That file is the plan;
this one is where we actually are. Updated when a wave item closes, not on a
schedule.

**Last updated:** 2026-08-27 · engagement storage model Phase 0 + 1a + 1b on `main`; the engagements view built

---

## The short answer

| | |
|---|---|
| **Done** | Wave 0, Gate A, Wave 2 seams (A, B, C), **W7 speed refactors R6/R2/R9**, and the **engagement storage model Phase 0 + 1a + 1b** (all on `main`, green) |
| **In progress** | **The engagements view** (`/<slug>/engagements`) on branch `engagements-view` — the first surface that reads the layer |
| **Blocked on nothing** | CI green on every push; goldens **148** (144 + the engagement view's four) |
| **Next gate** | Gate B met in practice (sales at its 3-hop structural floor); the engagement model is the repository-seam endgame ahead of the SQL migration |

---

## Engagement storage model — the current build

The restructure specified in `docs/superpowers/specs/2026-08-26-engagement-storage-model-design.md`
is being built and shipped incrementally. On `main`:

| Increment | What it added | State |
|---|---|---|
| **Phase 0 — foundations** | ZSET store helpers, `ENG.*` key builders, the pure stage registry (`src/platform/engagement/registry.ts`), the engagement store (`src/platform/db/engagement.ts`: create/attach/detach/members/refs/unassigned/promote) | ✅ on `main` |
| **Phase 1a — backfill read layer** | pure chain-clustering (`backfill.ts`), a guarded backfill CLI (`scripts/migrate/backfill-engagements.mjs`), `readEngagementView`, a `recEng` reverse index | ✅ on `main`, **applied to live** (7 engagements on the reference studio, proven read-only) |
| **Phase 1b-i — ticket dual-write** | `createTicket` also mints its engagement, same deterministic id/clustering, guarded best-effort, response byte-identical | ✅ on `main` |
| **Phase 1b-rest** | RFQ / quotation / project creation attach to their engagement; internal quotation mints its own; approved quotation recorded — the whole spine now dual-writes on create | ✅ on `main` |
| **The engagements view** | `/<slug>/engagements` — the first surface that READS the layer: a `createdAt`-scored index, the grantable `engagements.view` key, a read layer filtering every stage by the permission its registry entry declares, two GET routes, four goldens, and a screen with a nav entry above People | ✅ built (`engagements-view`) |
| **Direct project creation** *(2026-08-29)* | Projects gains a second create path with no ticket/RFQ/quotation behind it — the client resolved by `resolveClientFor`, industry written onto the Client row rather than the project, a direct project rooting its own engagement (`attachProjectEngagement`, matched by a third `buildEngagements` branch), and both project sheets seeded either way, permanently empty on the direct path until a quotation is attached. `docs/functionality/projects.md` written. | ✅ on branch `direct-project-creation` |

Plans: `docs/superpowers/plans/2026-08-2{6,7}-engagement-*.md`. Deferred (ledgered): the project's
children attaching on create, score-members-by-`createdAt`, `dept`/`hasStage` on backfilled
engagements, routing the best-effort miss through observability, and the reconcile job.

---

## Gates

A gate is a promise the build keeps, not a milestone anybody declares.

| Gate | Exit criteria | State |
|---|---|---|
| **A** | Golden responses recorded · permission matrix exhaustive · hop counts pinned · CI enforcing all three | ✅ **green** |
| **B** | Zero direct `readCol` in service code · ≤2 hops per module request · goldens unchanged throughout | 🟡 **2 of 3** |
| **C** *(W3)* | Every module `.tsx`, departmental structure, no cross-imports outside declared seams | ⬜ not started |

### Gate B, in detail

| Criterion | Target | Now |
|---|---|---|
| `readCol` in service code | 0 | ✅ **0** |
| Hops — `/api/studios/[slug]` | ≤2 | ✅ **2 waves** *(was 8)* |
| Hops — `…/sales` | ≤2 | **3 waves** *(was 8)* — 3 is the structural floor |
| Goldens unchanged | 148 | ✅ the original 144 byte-identical throughout; the engagement view ADDED four |

The studio route meets the ≤2 target. Sales sits at 3, and 3 is the structural
floor rather than a convenient stopping point: the section list cannot be fetched
until the studio id is known, and the collections cannot be fetched until the
section ids are. Going lower means denormalising one into the other — a real
option with a real invalidation cost, and an open decision rather than an
oversight.

---

## Wave 0 — stop the bleeding ✅

| Finding | What it was |
|---|---|
| C-1 | Orphan sweep could prefix-delete production |
| C-2 | Media served without a membership check |
| C-3 | Traffic ingest unbounded — the one public write |
| C-4 | No credential rate limiting |
| C-5 | Console sessions never expired |
| H-10 | Security headers absent |
| M-1 | Dead capabilities deleted |

Plus bcrypt 12 with rehash-on-login, and the legacy pre-pivot keys removed.

## Wave 1 — the safety net ✅ **GATE A**

139 goldens · 102-key permission matrix · hop counting · 6 architectural
assertions · CI (typecheck, lint budget, 3 suites, build, bundle budget) ·
observability with request ids · ESLint.

**Found by the harness, not by reading code:** M-15 (a quality manager who signs
but never authors could sign nothing), L-10 (an unreachable branch), and the
status-code inventory that wrote Wave 2's own checklist.

**Found by asking, not by the harness:** the OAuth device gap. A user who
registered with Google or Microsoft never saw a device on their account —
`recordDevice` was called in exactly one place, the OTP path — so the screen
where somebody would notice an unfamiliar sign-in rendered empty for every OAuth
account that had live sessions. The console's own session list was the same
shape: three hardcoded rows where the real digests had been kept since C-5 and
never read. Both were reported, not detected; a test only exists for them now
because somebody looked at a screen and asked why it was empty.

## Wave 2 — seams and performance 🟡

| Item | State | Notes |
|---|---|---|
| **Seam A** — route wrapper | ✅ | All 96 routes. 7 dead guards removed. CSRF + idempotency + request ids |
| **Seam B** — repository | ✅ built · 🟡 adopted | Interface + 25 assertions; 1 of 13 files migrated |
| **Seam C** — module context | ✅ | 9 contexts → 1 factory. −448/+174 lines. **Killed hop 7 everywhere** |
| W7 — speed refactors | ✅ | R1 (via Seam C), **R2** (`plantMissingSections` off the read path + backfill CLI), **R6** (`lastSeenAt`/`lastLoginAt` off `g:users` onto `u:<id>:activity`), **R9** (`getProfile` N+1 → one `MGET`) — all on `main` |
| W8 — cache + prefetch | ✅ | 8 waves → 2 (studio) and 3 (sales) |
| W9 — targeted live updates | ✅ | The stream names the row; the doorbell stopped carrying the message |
| W10 — media to Blob · audit log | 🟡 | Audit log ✅. Blob is written and tested, blocked on the store being created |
| W11 — security round 2 · notifications | ✅ | Session digests at rest, console MFA, real console sessions |
| W12 — repository adoption · sweep rewrite | 🟡 | The `readCol` migration below |

### The `readCol` migration

| File | Sites | State |
|---|---|---|
| all 13 service modules | 188 | ✅ |

Every service module reads and writes through `repo()`. `readCol`, `addRow`,
`updateRow` and `deleteRow` are now internal to `src/platform/db/`.

---

## Waves 3–5 ⬜

**W3** TypeScript + departmental modules — 🟡 the server side is done.

| Step | State |
|---|---|
| `shared/` | ✅ TypeScript |
| `platform/access` | ✅ typed, `PermissionKey` union |
| `platform/db` | ✅ 8 files, reads generic over `unknown` |
| `platform/{http,realtime,notify,relations}` | ✅ typed |
| `platform/auth` | ✅ 13 files, 9 record types named |
| Twelve departments | ✅ moved to `src/modules/<name>/`, typed, Zod schema each |
| What was left of `src/lib` | ✅ typed, and on the ratchet |
| `src/app/api/**/route.ts` | ✅ 99 files, both configs clean |
| `src/components`, `src/app` pages | ⬜ W4's slice, deferred deliberately |
| `noImplicitAny` over every `.ts`/`.tsx` | ✅ the ratchet reaches `src/**` |
| `checkJs` repo-wide, `allowJs` deleted | ⬜ blocked on the two rows above |

`npx tsc --noEmit` and the strict config are both clean over every file the
server runs: 270 TypeScript files against 212 JavaScript, and every one of the
212 is a browser file.

**The API routes are converted.** The first attempt produced 994 errors, the
second 314; both times the bulk was one thing said four different ways, and
naming it was the whole job:

- `moduleContext` is generic over its department, so `financeContext` hands a
  route a FinanceContext rather than the bare ModuleContext.
- `route()`'s `context` is matched against `ContextError` by name, so `A` infers
  the context alone instead of the union the wrapper has already narrowed.
- **A `string` error does not discriminate a union.** `if (result.error)` cannot
  remove an arm whose `error` is a `string` — the empty string is one — so every
  success field after the guard read as missing. `refused()` in `platform/http`
  is the same runtime test as a type guard, and it is what 40 routes now use.
- `ContextError`, `Refusal`, `LimitResult`, `ResendResult`, `ChallengeResult`,
  `LoginResult`, `SuperLoginResult`, `JoinDecision`, `AcceptResult`,
  `ExchangeSnapshot`: ten services that answered "either-or" as one object with
  everything optional now answer it as two arms.

`checkJs` is what is left, and that is the 212 browser files.

**The strictness ratchet is finished for TypeScript.** `tsconfig.strict.json`'s
`include` is now `src/**/*`: every `.ts` and `.tsx` in the tree is graded with
`noImplicitAny` on, and the folder list is gone because there was nothing left
to add. It arrived one folder at a time — platform, then people and hr, then
main/projects/finance/tasks, then sales/technical/operations/inventory/quality,
then `src/lib` — 753 findings in all. What keeps the file alive is `checkJs`,
which is the 212 remaining `.js` files, every one a browser file: they convert
with W4 and this config and `allowJs` go with them.

`next-env.d.ts` had to join the include: overriding `include` drops the base
config's, and that file is what augments `fetch`'s options with Next's
`next: { revalidate }` — without it `app/api/fonts/route.ts` failed under the
strict config and nowhere else, which reads as a bug in the route.


**W4** UI/UX system — independent, can run alongside. Briefed in full on
22/08/2026 and researched in **`w4-dashboards-and-motion.md`**, which is a
proposal awaiting approval; nothing in it is built.

The brief: rebuild Finance around AP/AR/GL/FA, turn every department page into a
data-dense dashboard, port nine animation techniques from the marketing site,
rewire `/super` / `/account` / studio routing, and — carried from earlier —
remove every placeholder field, translate the studio and the main site into real
Arabic with working RTL, render every date dd/mm/yyyy, redesign the login page,
and write the operator documentation the product has never had.

Four findings from the survey change the shape of it:

- **The chart kit already exists.** `app/super/_components/charts.js` is 417
  lines of dependency-free, server-rendered, token-themed SVG with a matching
  skeleton. No charting library should be added; it costs 0 KB against 95 KB of
  budget headroom.
- **The nine techniques already exist**, numbered `TECHNIQUE 1`–`9` in
  `components/landing/`. Phase 3 is a promotion into a shared `components/motion/`,
  not a build.
- **~15 of `/super`'s 22 pages are template mock data** — which makes the
  placeholder sweep and the `/super` rewire the same task.
- **The studio ships every department to every route**, which is the 305 KB
  chunk. The routing split pays for everything else in the brief.

Analysis is a **paid** capability, tiered `basic` / `simple` / `moderate` /
`advanced`; packages and tiers are both paid services in future. Every widget
carries its rung, and `analyticsLevelOf()` is the one function the entitlement
model will later replace.
**W5** SQL Server — needs the repository seam *adopted*, not just built.

---

## Open decisions

Things waiting on a person, not on work.

| Decision | Why it is open |
|---|---|
| The palette for W4 | The marketing site is dark-first indigo/Sora; the ERP is light-first blue/Saira. One of them has to move |

**Recently closed.**

- **`login()` checks `suspended` before the password** — kept, deliberately. It
  is an enumeration oracle: anybody who can guess an address learns whether it
  belongs to a suspended account. Bought with it is a suspended person being told
  why, without first having to remember a password they were switched off from
  using months ago — and a switched-off account never spending a bcrypt-12
  verify. The oracle is exactly one bit wide and stays that way: a wrong password
  and an unregistered address both still return `invalid`. Four Gate A assertions
  pin the order so it cannot be quietly reversed.
- **The dashboard tier ladder is basic / simple / moderate / advanced.** Standard
  and basic were the same rung; the ladder now climbs once per name.
- **A tier declares its own `analyticsLevel`,** explicitly, from that fixed set.
  Not inferred from the tier's name — a `/super` tier is a studio-authored record
  and its name is free text, so anything keyed to the name breaks on the first
  rename.
- **Invariant 2 was overstated** and the code was right — existence is public by
  design; what a non-member learns nothing about is the contents.
- **`quality.documents.setup`** deleted rather than built.
- **The console's fabricated screens** — the profile page now reads the record
  for sessions, two-factor state, recovery codes, password age and the
  super-admin list. The API keys card was deleted rather than made real: there
  is no API key feature, and a screen offering to revoke credentials that were
  never issued is the dead capability the catalogue's own rule forbids.

---

## What actually costs time

Recorded because "why is this slow" deserves an answer with numbers in it.

- **Verification dominates.** Four suites, serial, ≈7 minutes, against a Redis in
  another region. Every one of 183 `readCol` calls is a real round trip.
- **The suites are the type system.** `tsc --noEmit` has now passed three broken
  things — a syntax error and two ReferenceErrors — because `checkJs` is false on
  `.js` files. Skipping a suite run does not save time, it moves the cost.
- **Concurrent runs are not a shortcut.** Two suites on one namespace delete each
  other's fixtures, and the failure looks like a bug in whatever was mid-call. It
  cost two false investigations before `tests/exclusive.mjs` made it refuse.
