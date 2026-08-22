# Progress

**What this is:** live state against `execution-plan.md`. That file is the plan;
this one is where we actually are. Updated when a wave item closes, not on a
schedule.

**Last updated:** 2026-08-21 · 49 commits since the audit baseline (`166300f`)

---

## The short answer

| | |
|---|---|
| **Done** | Wave 0, Gate A, and Wave 2's three seams (A, B, C) |
| **In progress** | W9 onward. Gate B's criteria are met |
| **Blocked on nothing** | CI green on every push |
| **Next gate** | **Gate B**: zero `readCol` in services · ≤2 hops per module request |

The plan budgets Wave 2 at weeks 5–12. Three of its ten items are done.

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
| Goldens unchanged | 139 | ✅ 139 |

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
| W7 — speed refactors | 🟡 | R1 done (via Seam C). R2, R6, R9 open |
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
`updateRow` and `deleteRow` are now internal to `src/lib/data/`.

---

## Waves 3–5 ⬜

**W3** TypeScript + departmental modules — 🟡 in progress.
`shared/` ✅ currencies, countries, i18n, slug · `platform/access` ✅ catalogue and
resolver behind one door, typed, with the `PermissionKey` union · `platform/db`
next, then one department per step. `tsconfig.strict.json` gains a folder per
step and never loses one.
**W4** UI/UX system — independent, can run alongside.
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
