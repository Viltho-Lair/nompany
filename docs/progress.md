# Progress

**What this is:** live state against `execution-plan.md`. That file is the plan;
this one is where we actually are. Updated when a wave item closes, not on a
schedule.

**Last updated:** 2026-09-06 · the ERP programme through P4a Projects slice 5
(billing milestones and retention).

**THIS FILE WENT NINE DAYS AND 280 COMMITS OUT OF DATE**, and the state it
described had been false for most of them: it called the engagements view "in
progress on a branch" long after it shipped, counted 148 goldens when there were
242, and knew nothing of the Postgres cutover, P2 or any of P4a. Recorded rather
than quietly corrected, because a status file nobody trusts is worse than none —
the same reason `CLAUDE.md` says so about its own numbers. Per-change
documentation lives in `CLAUDE.md` and `docs/functionality/`, which is where the
detail has been going; this file is the map.

---

## The short answer

| | |
|---|---|
| **Done** | Waves 0–3, Gate A, the engagement storage model Phase 0–1b, **P0** (fifteen-section restructure), **P1 + the cutover** (production runs Postgres; Redis is gone), **P2's approval engine** (bills, then bids), and **P4a's first three sections** |
| **In progress** | **P4a is COMPLETE** — all five sections, 07/09/2026. The only thread left from it is the closure slice's Gate A block, which could not be recorded because the machine's ADC credentials expired. **Next is P4b**, the abstraction extracted from the screens P4a built |
| **Blocked on nothing** | CI green on every push; goldens **316**, catalogue **174** keys, lint **142/0**, bundle **1687 KB gz against 1688**. The largest chunk is **165 KB against 250**, up from 158 with the Procurement dashboard — consolidation rather than sprawl (the chunk count fell 92 → 91 as `components/dashboard` was hoisted into the shared chunk), but it is the number every route pays and the one to watch. Measured 07/09/2026 at the commit that states them, not quoted from the line above |
| **The size of what is left** | **≈32 of the spec's ≈65.5 weeks.** P3's statutory half (ledger periods, statements, tax, auto-posting), P4b, P5, P6 and P7. See **The spec, subsection by subsection** below — the four empty sections are the visible part and the smaller one |
| **Next gate** | Gate B is 2 of 3 and sales sits at its 3-hop structural floor. Gate C (Wave 3) is done server-side; what is left is `checkJs` over the browser `.js` files and the `app/` restructure |

---

## The ERP programme — where the sections are

The waves below are the platform work. The **P-numbered programme** is the
product: fifteen sections, built one at a time, hand-written so that P4b's
abstraction is extracted from real screens rather than guessed at.

| Phase | What it is | State |
|---|---|---|
| **P0** | The fifteen-section restructure | ✅ on `main` |
| **P1** | Postgres behind the store seam (`NOMPANY_DB`: redis / postgres / parity) | ✅ on `main` |
| **The cutover** | Production runs Postgres through the Cloud Run gateway, live 02/09/2026, proven by a write rather than assumed. **Redis is gone entirely** — no `REDIS_URL` anywhere, nothing in `src` reads it | ✅ done |
| **P2** | The approval engine — a chain chosen at runtime, invariant 7 enforced twice. Two document types: bills, then bids. Chains live on the STUDIO record (`platform/approval/store`), not in Finance's settings | ✅ on `main` |
| **P4a** | Section-by-section depth, five sections hand-built | ✅ on `main` 07/09/2026, with one Gate A block outstanding (see below) |
| **P4b** | The abstraction, extracted from the screens P4a builds | ⬜ not started |

### P4a, slice by slice

Every slice below is on `main` and green. Each names its own file in
`docs/functionality/`, which is where the behaviour is written down.

| Section | Slices | State |
|---|---|---|
| **CRM & Sales** | contracts register · pipeline board · customer 360 · pricing and customer rates · the dashboard | ✅ complete |
| **Tendering & Estimating** | tender register · BOQ grid and rate library · tender pack and clarifications · bid review · handover to Projects | ✅ complete |
| **Projects, deepened** | **cost breakdown** · **purchase orders coded** · **earned value** · **variations** · **billing milestones and retention** · **the critical path** · **daily site reports** · **closure with punch list and warranty** | ✅ complete — see the caveat below |
| **Procurement & Subcontracting** | **purchase requisitions** · **supplier RFQ and quote comparison** · **purchase orders with expediting** · **subcontracts** · **supplier qualification and rating** · **GRN with 3-way match** · **the dashboard** | ✅ complete |
| **Administration & Settings** | a real gated section (03/09) · Master data with Locations and the departments register | ✅ complete |

**PROJECTS IS COMPLETE AS OF 07/09/2026, and the eight bullets are the programme spec's
rather than `CLAUDE.md`'s shorter list — which is what this row got wrong once before.** Daily
site reports shipped with photographs; closure reads the `snag` inspections as its punch list
rather than keeping a second list of the same defects.

**ONE CAVEAT ON THE CLOSURE SLICE, because a green row should not hide it:** it landed WITHOUT
its Gate A block. The machine's Google ADC credentials expired mid-session, so nothing local
could reach Cloud SQL and there was nothing to record goldens against. Its 40 unit assertions,
tsc, strict tsc, the build and lint all pass, and CI confirms it breaks no existing golden —
but **the closure route has no contract of its own yet**. The block is written and waiting on
`gcloud auth application-default login` plus a `cloud-sql-proxy` restart.

**WITH THAT, P4a IS COMPLETE: all five hand-built sections.** What follows is P4b, the
abstraction extracted from the screens P4a built rather than guessed at.

**Four sections still render nothing** and are hidden rather than shown empty:
Manufacturing, Assets, Reports, and Quality & HSE. They are listed in
`NO_SCREEN_YET` and hold no permission area, because a right nothing can
exercise is a bug (invariant 16). Tendering was the fifth until its register
landed.

**THE CRITICAL PATH WAS ALREADY BUILT, and this file said it "remains" — for about an hour,
because I copied the claim out of `CLAUDE.md` while writing the very section that criticises
this file for being stale.** Recorded rather than silently fixed: the failure mode is
believing a document instead of the code, and I did it in the act of complaining about it.
The engine has computed late finish, total float and `critical` since it was written, and
four places render it. What was missing was that `savePlan` validates nothing inside a plan
document, so a task like `{ id: "t1" }` — which the API accepts — threw
`t.dependencies is not iterable` and took the whole planner with it. `normalizeTask` at the
store boundary fixes it, and `tests/planner-schedule.mjs` is the engine's first coverage.

**What the billing slice added, as the shape of all of them:** a payment schedule
and retention on a project (`projects.billing`, catalogue 149 → 153), the pure
`modules/projects/billing.ts` shared with the screen, `milestoneId` on
`InvoiceSchema`, nine goldens, and `docs/functionality/billing-milestones.md`
with an honest "Not built yet" — nothing raises the invoice, no starter role
holds the right, and variations still move neither the schedule nor the budget.

**A LESSON THIS FILE SHOULD KEEP, because it cost a full Gate A cycle:** a Gate A
block that mints a person, raises an invoice or writes to a shared fixture must
run AFTER every section that records a golden and BEFORE `no golden is left
behind`. Seated inside the projects block, the billing section moved six goldens
belonging to other modules — an invoice reference, three HR lists, the operations
board and a project list — with no route having changed. Seated after the
completeness check instead, it failed by exactly its own nine names. The
direct-projects block documents the rule; it is not obvious from anywhere else.

---

## The spec, subsection by subsection

**THIS TABLE EXISTS BECAUSE THIS FILE DID NOT HAVE ONE, and its absence hid the size of
what is left.** Everything above tracks PHASES and, inside P4a, SLICES. Neither answers
"which subsections are built" — so from this file alone the roughly fifty pending ones
were invisible, and the four visibly-empty sections read as the whole gap. They are not.

**The authority is `docs/superpowers/specs/2026-08-30-erp-multi-industry-program-design.md`,
phases P2 to P7.** It is the ONLY document that enumerates the target subsections.
`docs/erp-guide.md` describes the PRE-RESTRUCTURE product — its own heading says "the
twelve departments" — and must not be read as the target.

**EVERY ROW BELOW WAS CHECKED AGAINST THE CODE on 07/09/2026, not copied from prose.**
That is the discipline this file keeps failing: four separate figures in it were stale on
the day they were read, and each had been carried forward rather than measured. When you
change this table, grep for the thing; do not trust the row above.

**Counts as at 07/09/2026:** 41 subsections declared in `SECTION_DEFS`; the spec expects
roughly 50 more. Four sections render nothing and hold no permission area — Manufacturing
& Production, Assets & Equipment, Quality & HSE, Reports & BI.

### P2 — Engine ✅ essentially complete

| Item | State |
|---|---|
| `industries` + `flow_templates` as stored, editable data | ✅ `platform/db/flows.ts` |
| `deals` with the nine context facts and the contribution rule | ✅ |
| `deal_aliases` as lookup helpers only | ✅ |
| `deal_members` — explicit membership | ✅ `platform/engagement/membership.ts` |
| No status column; derived from `statusChain` | ✅ |
| The unassigned pen, park and promotion | ✅ |
| Template-driven deal screen, invitations, withheld-vs-empty | ✅ `modules/main/engagements.ts` |
| Tenant flow editor (clone, reorder, checkpoints) | ✅ `settings/flows` |
| The six new stage types | ✅ all of `contract` `timesheet` `change_order` `inspection` `payment` `job` |
| Timesheets with normal and overtime hours | ✅ |
| Approval-workflow engine | ✅ three document types: bills, bids, requisitions |

### P3 — Money 🟡 **the operational half is built; the statutory half is not**

**THIS IS THE LARGEST HIDDEN GAP IN THE PROGRAMME** and nothing above said so. The spec's
own acceptance test — *"the deal card's profit figure reconciles to the ledger"* — cannot
pass today, because there is no ledger to reconcile to beyond a trial balance.

| Item | State |
|---|---|
| `payment` as a first-class allocatable record | ✅ |
| Retention and progress billing (IPC) | ✅ client side and subcontract side |
| Budgets and commitment control | 🟡 at PROJECT level (`projects/costing`); not in the ledger |
| Multi-currency | 🟡 daily FX table and rate-at-approval stored; no revaluation |
| Dimensions on every journal line (deal, cost code, branch, department) | ⬜ |
| Periods and close, year-end rollover | ⬜ |
| Statements from the ledger — P&L, balance sheet, cash flow | ⬜ only `trialBalance` exists |
| Credit notes as corrections | ⬜ |
| Configurable tax engine, ZATCA adapter, withholding | ⬜ |
| Bank reconciliation, cash-flow forecast, PDCs, LGs | ⬜ |
| Auto-posting from every module | ⬜ |

### P4a — the hand-built sections ✅ complete 07/09/2026

All five, slice by slice, in the table further up this file.

### P4b — the record engine ⬜ not started

A record type declared as data; the engine supplies list, card, create and edit, workflow,
attachments, comments, audit, live updates and permission filtering. **Roughly 50 of the
remaining subsections ride it**, which is why it precedes P5.

Bespoke screens the spec says it must never be stretched to cover: BOQ grid, Gantt, cost
sheet, dispatch board, shop-floor terminal, MRP and capacity planner, mobile field view,
payroll run, financial statements, report builder. **Two of those are already built by
hand** — the BOQ grid and the Gantt — which is the line holding where the spec drew it.

### P5 — engine-driven sections ⬜ barely begun

| Section | Built | Missing |
|---|---|---|
| **Engineering & Documents** | document register, approval workflows, live view | transmittals, RFI and submittal registers with ball-in-court, EBOM and specs, technical library |
| **Inventory completion** | stock, items, serials, sheets, dashboard | locations and bins, batch lifecycle, stocktaking and adjustment approval, valuation method |
| **Assets & Equipment** | — | everything: allocation to deals, internal hire rates, utilization, maintenance, calibration |
| **Quality & HSE** | `inspections` exist, filed under Projects | ITPs, NCR/CAPA, audits, HSE incidents with LTIFR, permits to work, toolbox talks, certifications, dashboard |
| **Logistics & Fleet** | shipments and AWB | POD, trips and routing, fleet register and compliance, customs and freight files with landed cost, dashboard |

### P6 — other centres of gravity ⬜ barely begun

| Section | Built | Missing |
|---|---|---|
| **Human Resources** | employees, leave, org chart, roles | attendance, employee requests, recruitment and onboarding, performance, training and skills, manpower planning, **and payroll entirely** — salary runs, allowances, deductions, payslips, bank/WPS files, payroll posting |
| **Field Operations & Service** | schedule, tracking | service orders and job cards, dispatch board, AMC contracts, preventive-maintenance plans, mobile field view with e-signature, installed base, dashboard |
| **Manufacturing & Production** | — | everything: BOM and routing, work orders, MRP and capacity planning, shop-floor terminal, production QC, dashboard |

### P7 — cross-cutting and readiness ⬜ barely begun

| Item | State |
|---|---|
| **Reports & BI** — executive dashboard, report builder, KPI targets, alert rules | ⬜ section renders nothing |
| **Administration master data** | 🟡 Locations and Departments built; currencies, UoM, numbering series, cost codes, categories, industry taxonomy pending |
| Integrations and API, notification templates, print formats | ⬜ |
| **Templates B–G activation** — one real deal per template, end to end | ⬜ only Template A is exercised |
| Readiness — performance pass, onboarding, spreadsheet import, docs | ⬜ |

### What that adds up to

The spec sizes the programme at **≈65.5 weeks**. Done: P0 (2) + P1 (5) + P2 (8.5) + P4a
(14) ≈ **29.5**. Remaining: P3's statutory half, P4b (4), P5 (8), P6 (11), P7 (6) — call
it **≈32 weeks**, or a little under half the programme still ahead.

**The four empty sections are the visible part and the smaller part.** P3's ledger work and
P6's payroll are each larger than any section built so far, and neither appears anywhere
else in this file.

## Engagement storage model — the current build

The restructure specified in `docs/superpowers/specs/2026-08-26-engagement-storage-model-design.md`
is being built and shipped incrementally. On `main`:

| Increment | What it added | State |
|---|---|---|
| **Phase 0 — foundations** | ZSET store helpers, `ENG.*` key builders, the pure stage registry (`src/platform/engagement/registry.ts`), the engagement store (`src/platform/db/engagement.ts`: create/attach/detach/members/refs/unassigned/promote) | ✅ on `main` |
| **Phase 1a — backfill read layer** | pure chain-clustering (`backfill.ts`), a guarded backfill CLI (`scripts/migrate/backfill-engagements.mjs`), `readEngagementView`, a `recEng` reverse index | ✅ on `main`, **applied to live** (7 engagements on the reference studio, proven read-only) |
| **Phase 1b-i — ticket dual-write** | `createTicket` also mints its engagement, same deterministic id/clustering, guarded best-effort, response byte-identical | ✅ on `main` |
| **Phase 1b-rest** | RFQ / quotation / project creation attach to their engagement; internal quotation mints its own; approved quotation recorded — the whole spine now dual-writes on create | ✅ on `main` |
| **The engagements view** | `/<slug>/engagements` — the first surface that READS the layer: a `createdAt`-scored index, the grantable `engagements.view` key, a read layer filtering every stage by the permission its registry entry declares, two GET routes, four goldens, and a screen with a nav entry above People | ✅ on `main` |
| **Direct project creation** *(2026-08-29)* | Projects gains a second create path with no ticket/RFQ/quotation behind it — the client resolved by `resolveClientFor`, industry written onto the Client row rather than the project, a direct project rooting its own engagement (`attachProjectEngagement`, matched by a third `buildEngagements` branch), and both project sheets seeded either way, permanently empty on the direct path until a quotation is attached. `docs/functionality/projects.md` written. | ✅ on `main` |
| **A third create path** *(2026-09)* | The handover from a won tender — `tenderSource` beside `quotationSource` and `directSource`, deliberately a third HEAD of `openProject` rather than a function in Tendering, so the engagement dual-write below the split cannot be forgotten | ✅ on `main` |

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
| Goldens unchanged | 316 | ✅ changed only when a feature deliberately changed a response, each re-recorded with a stated reason |

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
| W10 — media to Blob · audit log | 🟡 | Audit log ✅. **The Blob port shipped** — uploads go to Vercel Blob and the URL is never given to a client; the route fetches server-side after the membership check. Only `--reclaim` (deleting the two pre-Blob records' base64) is outstanding |
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
