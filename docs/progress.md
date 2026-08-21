# Progress

**What this is:** live state against `execution-plan.md`. That file is the plan;
this one is where we actually are. Updated when a wave item closes, not on a
schedule.

**Last updated:** 2026-08-21 · 44 commits since the audit baseline (`166300f`)

---

## The short answer

| | |
|---|---|
| **Done** | Wave 0, Gate A, and Wave 2's three seams (A, B, C) |
| **In progress** | Gate B — the `readCol` migration, 1 of 13 files |
| **Blocked on nothing** | CI green on every push |
| **Next gate** | **Gate B**: zero `readCol` in services · ≤2 hops per module request |

The plan budgets Wave 2 at weeks 5–12. Three of its ten items are done.

---

## Gates

A gate is a promise the build keeps, not a milestone anybody declares.

| Gate | Exit criteria | State |
|---|---|---|
| **A** | Golden responses recorded · permission matrix exhaustive · hop counts pinned · CI enforcing all three | ✅ **green** |
| **B** | Zero direct `readCol` in service code · ≤2 hops per module request · goldens unchanged throughout | 🟡 **1 of 3** |
| **C** *(W3)* | Every module `.tsx`, departmental structure, no cross-imports outside declared seams | ⬜ not started |

### Gate B, in detail

| Criterion | Target | Now |
|---|---|---|
| `readCol` in service code | 0 | **183** across 12 files |
| Hops — `/api/studios/[slug]` | ≤2 | 6 waves *(was 7)* |
| Hops — `…/sales` | ≤2 | 7 waves *(was 8)* |
| Goldens unchanged | 139 | ✅ 139 |

Hop counts come down in **W8** (request-scoped cache + batched prefetch), not in
the migration itself. The migration is what makes W8 possible to write once
rather than thirteen times.

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

## Wave 2 — seams and performance 🟡

| Item | State | Notes |
|---|---|---|
| **Seam A** — route wrapper | ✅ | All 96 routes. 7 dead guards removed. CSRF + idempotency + request ids |
| **Seam B** — repository | ✅ built · 🟡 adopted | Interface + 25 assertions; 1 of 13 files migrated |
| **Seam C** — module context | ✅ | 9 contexts → 1 factory. −448/+174 lines. **Killed hop 7 everywhere** |
| W7 — speed refactors | 🟡 | R1 done (via Seam C). R2, R6, R9 open |
| W8 — cache + prefetch | ⬜ | The 8→2 hop work |
| W9 — targeted live updates | ⬜ | |
| W10 — media to Blob · audit log | ⬜ | |
| W11 — security round 2 · notifications | ⬜ | |
| W12 — repository adoption · sweep rewrite | 🟡 | The `readCol` migration below |

### The `readCol` migration

| File | Sites | State |
|---|---|---|
| `tasks.js` | 5 | ✅ |
| `inventory.js` | 48 | ⬜ |
| `sales.js` | 31 | ⬜ |
| `operations.js` | 22 | ⬜ |
| `technical.js` | 21 | ⬜ |
| `projects.js` | 15 | ⬜ |
| `finance.js` | 10 | ⬜ |
| `awbTracking.js` | 9 | ⬜ |
| `qualityDocs.js` | 8 | ⬜ |
| `qualityDocRevisions.js` | 7 | ⬜ |
| `hr.js` | 7 | ⬜ |
| `quality.js` | 4 | ⬜ |
| `main.js` | 1 | ⬜ |

---

## Waves 3–5 ⬜

**W3** TypeScript + departmental modules — needs Gate B.
**W4** UI/UX system — independent, can run alongside.
**W5** SQL Server — needs the repository seam *adopted*, not just built.

---

## Open decisions

Things waiting on a person, not on work.

| Decision | Why it is open |
|---|---|
| `login()` checking `suspended` before or after the password | It is an enumeration oracle today. Fixing it changes a response somebody may rely on |
| The palette for W4 | The marketing site is dark-first indigo/Sora; the ERP is light-first blue/Saira. One of them has to move |

**Recently closed:** invariant 2 was overstated and the code was right (existence
is public by design); `quality.documents.setup` deleted rather than built.

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
