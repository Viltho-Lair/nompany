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
| **In progress** | **P4a is COMPLETE** — all five sections, 07/09/2026. The only thread left from it is the closure slice's Gate A block, which could not be recorded because the machine's ADC credentials expired. **P4b phase 1 is on `main`** — a record type declared as a row, one built-in type end to end; phases 2 and 3 are ahead |
| **Blocked on nothing** | CI green on every push; goldens **343**, catalogue **177** keys, lint **142/0**, bundle **1687 KB gz against 1688**. The largest chunk is **165 KB against 250**, up from 158 with the Procurement dashboard — consolidation rather than sprawl (the chunk count fell 92 → 91 as `components/dashboard` was hoisted into the shared chunk), but it is the number every route pays and the one to watch. **Goldens and the catalogue were re-measured at the P4b phase-1 commit** (`ls tests/goldens \| wc -l`, and the `ALL_PERMISSIONS.length` assertion in `tests/gate-a.mjs`). This row said 316 and 174, which were both TRUE when written at `ada60616` and decayed on `main` afterwards — 174 → 177 and 316 → 336 before P4b began, then 336 → 343 with the engine's seven goldens. **The engine added no catalogue key at all**, and never will: `engine.<typeKey>.<verb>` is structural, minted from a row, and cannot enter a compile-time list. The bundle and lint figures are the P4a-closure build's and are NOT re-measured here |
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
| **P4b** | The record engine — the abstraction, extracted from the screens P4a built | 🟡 phase 1 on `main` |

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

# THE DOCUMENT REGISTER — all 110 markdown files, audited 07/09/2026

**THIS FILE IS THE ONLY PROGRESS FILE.** Everything proposed, accepted, rejected, deleted
or changed is recorded here and nowhere else. No new `.md` may be created for a feature, a
plan, a status or a suggestion. See "The one-file rule" below.

Audited by reading every file's heading, size and stated status, and by checking the code
each one claims to describe. The categories are mine; the verdicts are measured.

## A — DEAD. Describes something that does not exist. Delete.

| File | Lines | Why |
|---|---|---|
| `docs/erp-guide.md` | 239 | **DELETED 07/09/2026.** Described the pre-restructure product; its own heading said "the twelve departments". |
| `DOCUMENTATION.md` | 229 | Describes an in-studio **Documentation section that was removed**: `src/lib/documentation.js`, `DocumentationGuide.js` and the `documentation` permission node are all gone. The file still opens with "This file is the source of truth". |
| `docs/database-migration-mssql.md` | 396 | "Redis to Microsoft SQL Server". **Neither end is real** — Redis is gone and the target was Postgres. A migration that never happened, to a database never used. |
| `scripts/migrate/README.md` | 317 | "Redis to SQL Server backfill (CLI)". The same fiction, documenting flags for scripts that now run against Postgres. |
| `docs/README.md` | 60 | Surveyed 20/08/2026 at "12 departments" with Redis latency figures, and its index points at `erp-guide.md`, now deleted. |

## B — STALE. Real subject, wrong facts. Fix or fold in.

| File | Lines | Why |
|---|---|---|
| `docs/system_architecture.md` | 392 | **14 mentions of Redis**, which no file in `src` can open. |
| `docs/planner-kanban-integration.md` | 252 | 3 Redis mentions; the planner shipped and this still reads as a proposal. |
| `docs/ui-ux-progress.md` | 194 | **A second progress file.** Last updated 23/08/2026 — two weeks stale. It calls itself "the sibling of progress.md", which is the problem. |
| `docs/functionality/sections.md` | 219 | Four stale rows: Tendering "not built", CRM missing pipeline and 360, Procurement "suppliers only", Master data "locations only". |
| `claudewants.md` | 44 | Empty. Harmless, but it is a channel nobody reads. |

## C — SEPARATE TRACK. Not progress files; leave or fold deliberately.

`SEO-PLAN.md` (703) and `SEO-LOG.md` (96) run their own backlog and dated log. `DESIGN.md`
(283), `LICENSES.md` (49), `README.md` (153), `legal/privacy-policy.md`,
`legal/terms-and-conditions.md`, `docs/glossary.md` (575) and
`docs/research/industry-roles.md` (3,968) are reference rather than status.

## D — THE WAVE PLAN. Superseded by the ERP programme, still cited.

| File | State |
|---|---|
| `docs/execution-plan.md` (397) | Waves 0 to 3 done, Wave 4 not started, Wave 5 **overtaken by P1** and no longer a wave. |
| `docs/recommendations.md` (383) | The audit that produced the waves. Findings assigned; several closed. |
| `docs/performance-audit.md` (241) | Wave 2. Largely delivered (8 hops to 2, request cache, batched prefetch). |
| `docs/security-and-notifications.md` (289) | Waves 0 and 2. Delivered. |
| `docs/typescript-modularization.md` (260) | Wave 3. **Done server-side**; its own comment still says 212 browser files, now 272. |
| `docs/refactoring-strategy.md` (233) | The `src/lib` split. Done. |
| `docs/ui-ux-overhaul.md` (465) | **Wave 4 — NOT STARTED.** |
| `docs/w4-dashboards-and-motion.md` (1,161) | **Wave 4 proposal — AWAITING A DECISION FROM YOU** (palette: marketing indigo/Sora against the ERP light-first blue/Saira). |

## E — SPECS AND PLANS. 36 files. Historical record of shipped work, except three.

Every `docs/superpowers/specs/*` and `plans/*` dated 23/08 to 06/09 describes work that
**shipped**: Nova, the executive dashboard and rollup, engagements phases 0 to 1b, service
actions, the engagements view, direct project creation, deal aliases, P0's restructure,
P1's Postgres swap, the Cloud Run gateway, the administration fold, the approval engine,
connected calendars, the /super calendar, departmental roles.

**The ones that are NOT shipped, and the first is the important one:**

| File | State |
|---|---|
| `2026-09-07-record-engine-design.md` + `-phase-1.md` (1,732 lines) | **P4b — NOT BUILT.** No `modules/record*` or `platform/record*` exists. **Roughly 50 of the ~68 outstanding subsections are meant to ride this.** The single highest-leverage unbuilt thing in the programme. |
| `2026-09-07-marketing-site-rebuild-design.md` (360) | Active. The design landed on `main`; the site is not rebuilt. |
| `2026-09-06-server-rendered-first-payload-*` (967) | Phase 1, Tendering. No matching code found by grep. **Unverified — confirm before trusting either way.** |

## F — WHAT WILL HURT THE CODE

**Ten items were listed here on 07/09/2026 and all ten were removed the same day**, from the
source where they existed and from CLAUDE.md and this file where they did not. Kept as a record
of what was taken out and what it cost, because a removal nobody can see gets re-proposed.

| # | What it was | What happened |
|---|---|---|
| 1 | **Auto-planting on read.** `listSections` reconciled against `ALL_SECTION_KEYS` and wrote what was short. A sub-section falls back to its ROOT when absent, so a collection-owning section planted late left its rows under the parent — invisible. Three tenders went that way in the sandbox. | **REMOVED.** `listSections` returns what is stored. `plant-sections.mjs` is the only planter. |
| 2 | **The resurrection assumption** in the same read: a missing seeded key could only mean the studio predates it, never that somebody deleted it. | **REMOVED with 1.** Planting is deliberate, so an operator decides. |
| 3 | **The `sweepOrphans` rewrite (M-10)** — a planned change to a live-deleting cron. | **DROPPED.** Never existed. `sweepOrphans` itself is untouched and still guarded by `SWEEP_SCOPES`/`sweepRefusal`. |
| 4 | **Media `--reclaim`** — the script was gone while `media.md` documented its three flags, inviting somebody to rebuild a live-deletion tool from prose. | **DROPPED.** |
| 5 | **`schemaVersion` on stored documents.** | **DROPPED.** Never existed. Would have forced a mass golden re-record. |
| 6 | **Soft-delete tombstones.** | **DROPPED.** `deletedAt` left `migrate/transform.ts`; nothing had ever written it. |
| 7 | **The record engine (P4b).** | **Removed from CLAUDE.md and this file as a live commitment.** Its spec and plan survive under `docs/superpowers/`; roughly 50 subsections still ride it, so this is a scheduling fact rather than a hazard. |
| 8 | **`DEFAULT_VAT_RATE = 15`** — the Saudi rate, DUPLICATED in `finance.ts` and `technical/quotations.ts`, the second commented "KSA standard rate". Applied to every studio's invoices and quotations on a platform sold regionally then globally. | **REMOVED, both copies.** No default rate. Whoever raises a document sets one. |
| 9 | **`BASE = "SAR"`** in `api/pricing` — one country's money as the origin every rate converted from. | **REMOVED.** The base is `catalogSettings.baseCurrency`, data rather than a constant, default `USD`. |
| 10 | **`checkJs` repo-wide.** | **DROPPED** as a commitment. Both configs still have it off; 272 browser files convert with Wave 4. |

**Also removed in the same pass, found while doing it:**

- **The riyal glyph.** `Money.js`, `Currency.js` and `PricingView` drew SAR as a hand-drawn
  mark while the other 165 currencies showed their letters. `components/Riyal.js` is deleted.
  One currency given a courtesy no other gets reads as a statement about where a product is
  from. **Supporting SAR was never the problem; singling it out was.**
- **`+966 55 000 0000`** and an `Asia/Riyadh` timezone default in the /super console.
- **SAR first** in the pricing page's pre-fetch placeholder and its offline currency list.
- **Nova's prompt**, which told every tenant its money was SAR and described the
  pre-restructure twelve departments.

**WHAT REMAINS OPEN, and it is the real one:**

- **The record engine is not built**, and roughly 50 of the 72 outstanding subsections are
  meant to ride it. Everything above is hygiene; this is the rate limiter.
- **`scripts/migrate/departmental-roles.mjs` has never been run**, so every existing studio
  holds Manager, Team Lead, Member and Viewer beside the new departmental roles.
- **Roles do not catch up.** `listRoles` seeds only into an EMPTY list.
- **Seeded roles never reach departments that already exist**, so Finance, HR and
  Administration can never receive theirs.
- **A forgotten `plant-sections.mjs` run** is now the accepted cost of removing item 1. Run it
  whenever a seeded section key is added.
- **`tests/access.test.mjs`'s dead-capability audit is blind** and its companion assertion
  passes vacuously.
- **PRICES MAY NEED RE-CHECKING.** The pricing base defaults to `USD` now. If the package
  figures in /super were typed as riyal, they read as dollars until somebody sets
  `baseCurrency` back or re-enters them. One field, in catalog settings.

## G — DRIFT: what was said, and what then happened

| Said | What happened |
|---|---|
| "The catalogue stays at 159; I am adding no permission keys" | True of departmental roles, then moved to 166 by two Procurement slices. Fine — but it was stated as a stable fact. |
| "principal is every area at full" | It was every area at full **and no extra at all**, which left the approval chains unwalkable by any library role. Found by another session, not by a test. Fixed 07/09. |
| Bundle ceiling "1638 against 1644" | Three separate numbers here and in `CLAUDE.md` were stale when written. Now 1671 against 1674, with 3 KB of headroom. |
| "46 subsections declared" | **42.** Written one paragraph after the warning not to carry numbers forward. |
| "Nothing in the product hard-codes a currency" | **False.** `pricing/route.ts` authors in SAR, the landing page defaults to SAR, `/super` prices in SAR, and there is a hand-drawn riyal glyph. |
| Four sections "render nothing" read as the whole gap | They are 23 of ~68 outstanding subsections. The other 45 sit inside sections that already render and read as finished. |
| The Fifteen Sections artifact as the picture of progress | Hand-written HTML, four days stale, ~25 grey bullets already green. |

## H — THE ONE-FILE RULE

**No new `.md` file for a feature, a plan, a status, an audit or a suggestion.**
Everything lands here.

- A **new major feature** I propose gets a row in the ledger below, not a spec file.
- If you **reject** it, the row is marked `REJECTED` and stays.
- If you ask to **delete** it, the row is marked `DELETED` and stays.
- If you ask to **change** it, the row is marked `CHANGED TO: <what>` and stays.
- Rows are never removed. A decision you cannot see is a decision that gets re-argued.
- Minor changes get no row.

### The decision ledger

| Date | Proposal | Status |
|---|---|---|
| 07/09/2026 | Delete `docs/erp-guide.md` | **DONE** |
| 07/09/2026 | Delete the five dead documents in category A | **PROPOSED** |
| 07/09/2026 | Top-up seeded roles for departments that already exist | **PROPOSED** |
| 07/09/2026 | Studio Settings points at Master data when the industry changes | **PROPOSED** |
| 07/09/2026 | Fix Nova's hardcoded "Money is in SAR" to use the studio currency | **DONE** |
| 07/09/2026 | Fix Nova's prompt naming the pre-restructure twelve departments | **DONE** |
| 07/09/2026 | Make the VAT rate a per-studio setting; stop defaulting to 15 | **PROPOSED — highest priority of the country items** |
| 07/09/2026 | Generate the Fifteen Sections view from `SECTION_DEFS` rather than hand-writing it | **PROPOSED** |
| 07/09/2026 | Move pricing off a SAR base (company is in Jordan; market regional then global) | **YOUR CALL — which base currency?** |
| 07/09/2026 | Revisit ZATCA as the first tax adapter | **PROPOSED** |
| 07/09/2026 | Clear `+966` and `Asia/Riyadh` defaults from the /super console | **PROPOSED** |
| 07/09/2026 | Build P4b, the record engine, before more hand-built slices | **PROPOSED — the highest-leverage item on this page** |


---

## The spec, subsection by subsection

**THIS TABLE EXISTS BECAUSE THIS FILE DID NOT HAVE ONE, and its absence hid the size of
what is left.** Everything above tracks PHASES and, inside P4a, SLICES. Neither answers
"which subsections are built" — so from this file alone the roughly fifty pending ones
were invisible, and the four visibly-empty sections read as the whole gap. They are not.

**The authority is `docs/superpowers/specs/2026-08-30-erp-multi-industry-program-design.md`,
phases P2 to P7.** It is the ONLY document that enumerates the target subsections.
`docs/erp-guide.md` DESCRIBED THE PRE-RESTRUCTURE PRODUCT — its own heading said "the
twelve departments" — and was deleted on 07/09/2026 for exactly that reason: a file that
describes a shape the product left behind is read as the target by whoever finds it
first.

**EVERY ROW BELOW WAS CHECKED AGAINST THE CODE on 07/09/2026, not copied from prose.**
That is the discipline this file keeps failing: four separate figures in it were stale on
the day they were read, and each had been carried forward rather than measured. When you
change this table, grep for the thing; do not trust the row above.

**Counts as at 07/09/2026: 42 subsections declared** in `SECTION_DEFS` (17 roots, 59 keys
in `ALL_SECTION_KEYS`, so 59 minus 17); the spec expects roughly 50 more. **THIS SAID 46
AND 46 WAS WRONG, in the paragraph that had just finished telling you to grep rather than
trust the row above** — and wrong in the flattering direction, claiming more built than
exists. Re-measured by deriving children as `ALL_SECTION_KEYS` minus the root keys, which
cannot drift from the defs because it is computed from them. **This said 41 when first
written, one hour after the paragraph above warned about carrying numbers forward** — the first count came from a `grep -A 8` that
truncated every section with more than a few children. Re-measured by parsing the block. Four sections render nothing and hold no permission area — Manufacturing
& Production, Assets & Equipment, Quality & HSE, Reports & BI.

### The fifteen, subsection by subsection

**SOURCE OF THE LIST: the "The Fifteen Sections" artifact** (published 03/09/2026), which
enumerates the programme design's target subsections and is the only place they were ever
written out in full. **SOURCE OF EVERY STATUS: the code, re-checked 07/09/2026.** The two
are kept apart deliberately {M} the artifact is hand-written HTML and had drifted badly by the
time it was read back: it still showed Tendering as "renders nothing" four days after all
five of its subsections shipped, and roughly twenty-five of its greyed bullets were green.
**Do not copy a status from it. Copy the list, then grep.**

Legend: ✅ built · 🟡 built with a named gap (see the functionality file) · ⬜ not built.

#### Main {M} `main` ✅  ·  Tasks {M} `tasks` ✅
Neither is a blueprint section. Main is the home surface and deliberately has no children;
Tasks holds the board and its settings.

#### §1 CRM & Sales {M} `crm-sales` ✅ 10 / 10
Tickets ✅ · Customers ✅ · Quotations ✅ · Live view ✅ · Settings ✅ · Leads &
opportunities pipeline ✅ · Customer 360 ✅ · Sales orders ✅ · Contracts register ✅ ·
Pricing & catalogue, customer rates ✅ · Dashboard ✅

**THIS ROW READ 10 / 10 WHILE HALF OF ONE BULLET DID NOT EXIST.** "Sales orders &
contracts register" was one tick covering two records, and only the contracts half was
built: there was no sales-order collection anywhere in `src`, and a contract carries a
value with no lines. The order function looked absorbed — quotation lines, contract
value, project milestones — and for an order raised from an accepted quotation it
genuinely was. **A call-off against a framework contract was not**: no new quotation,
no movement in the contract's value, and nowhere to put it but a new project.

The record shipped 08/09/2026 (`crmSales.orders`, catalogue 177 → 181, eight goldens,
`docs/functionality/sales-orders.md`). The two bullets are separated above so one tick
can never again stand for two records.

#### §2 Tendering & Estimating {M} `tendering` ✅ 5 / 5
Tender register ✅ · BOQ grid with rate library ✅ · Bid documents & clarifications ✅ ·
Bid review & approval ✅ · Handover to Projects as budget baseline ✅

#### §3 Projects {M} `projects` ✅ 13 / 13
Project list ✅ · SLA ✅ · Overtimes ✅ · Planner ✅ · Settings ✅ · WBS/Gantt with
critical path ✅ · Daily site reports 🟡 (photographs display now; still no addendum) ·
Earned value ✅ · Variations & change orders ✅ · Cost codes ✅ · Billing milestones &
retention ✅ · Closure, punch list, warranty 🟡 (closing sets a date and does nothing else)
· Resource planning ✅

**Resource planning shipped 08/09/2026** and is a JOIN rather than new data —
`assigneeIds`, each plan's `resources` and the engine's `start`/`end` were all already
stored, and nothing read more than one plan at a time. It mints no permission key
(`projects.planner.view` opens it) and stores nothing.
`docs/functionality/resource-planning.md` is the file. **The photographs on a site
report also render now**, where before they uploaded, stored, and appeared only as file
names inside the edit dialog — invisible to every reader of the report afterwards,
which is its only audience.

#### §4 Engineering & Documents {M} `engineering-docs` 🟡 7 / 9
Document register ✅ · RFQ ✅ · Live view ✅ · Settings ✅ · Transmittals ✅ · RFI
register with ball-in-court ✅ · Submittal register ✅ · **EBOM & specs ⬜ · Technical
library ⬜**

**ALL THREE ARE ENGINE TYPES, NOT HAND-BUILT SCREENS**, which is what P4b was for.
Transmittals shipped with the engine itself (08/09/2026) and RFIs and submittals are
P4b PHASE 2 — declared as rows, with no new field kind, no new verb and not one line of
engine code. They are also the check that the declaration is GENERAL rather than shaped
around the first type: an RFI carries a select whose value is refused unless the type
offers it, and a submittal's ladder branches three ways out of one status and loops back
on itself.

**Nobody but the owner and Admin can open them yet.** No starter role and no archetype
holds an `engine.*` key, and no screen can grant one — `StudioRoles` draws its grid from
`AREAS`, which by construction holds no engine key. That is phase 3's type management,
and it applies to all three.

#### §5 Procurement & Subcontracting 🟡 8 / 8 (all built; five carry named gaps)
Suppliers ✅ · Purchase requisitions ✅ · Supplier RFQ & quote comparison 🟡 (an award
creates no purchase order) · Purchase orders with expediting 🟡 (a chase sends nothing) ·
Subcontracts, certificates, retention 🟡 (`Paid` is a status nothing sets; no bill is
raised) · GRN with 3-way match 🟡 (exact, no tolerance; order level not line level) ·
Dashboard 🟡 (one widget of four) · Supplier qualification & rating ✅

**THAT LAST ONE WAS MARKED ⬜ AND WAS LARGELY BUILT** — the mirror of §1's sales orders,
which was marked ✅ and half missing. `suppliers.ts` has carried the `qualify` verb,
the assessment, the document register with expiry states and the scorecards, with a
screen for all of it. Its one real gap was the file: `mediaId` was stored from the day
the register shipped and **nothing ever wrote to it**, so a supplier's insurance
certificate was a reference and two dates with the certificate somewhere else. Fixed
08/09/2026 through the private-media route the tender pack already used.

**A status file can be wrong in both directions, and this section had one of each.**
Grep for the thing before trusting a tick or a blank.

#### §6 Inventory & Warehouse 🟡 4 / 8
Stock ✅ · Items ✅ · Project sheets ✅ · Stocktaking 🟡 (an engine register as of
08/09/2026: planned, counted, reviewed, adjusted — and **Review goes back to Counting**,
because a variance nobody believes is recounted rather than adjusted, which is the whole
control a stocktake exists to be. But **`Adjusted` MOVES NO STOCK** — the register records
that a count happened and what it found; the adjustment is Inventory's own write and is
not wired to this) · **Locations & bins ⬜ · Batch & serial lifecycle ⬜ · Adjustment
approval ⬜ · Valuation method ⬜ · Dashboard ⬜**

#### §7 Manufacturing & Production 🟡 3 / 6
**BOM & routing 🟡 (both are engine registers as of 08/09/2026 — a BOM's
components are one long text field, not a line table that explodes into demand;
nothing consumes a routing) · Work orders ✅ · MRP & capacity planning ⬜ · Shop-floor terminal to
timesheets ⬜ · Production QC ⬜ · Dashboard ⬜**
The section RENDERS NOW — it left `NO_SCREEN_YET` on 08/09/2026 with four engine
registers under it (work orders, bills of materials, work stations, production batches).

#### §8 Field Operations & Service 🟡 8 / 10
Schedule ✅ · Tracking ✅ · Settings ✅ · Service orders & job cards ✅ · Maintenance
contracts (AMC) ✅ · Preventive-maintenance plans 🟡 (the plan is a schedule; **nothing
generates the visits**) · Installed base ✅ · **Dispatch board ⬜ · Mobile field view with
e-signature ⬜ · Dashboard ⬜**

Four engine registers, 08/09/2026. The three left are the bespoke ones: a dispatch board
and a mobile field view are both on the spec's own "never stretch the engine to cover
this" list. See §10 for the caveat that applies to every engine register.

#### §9 Logistics & Fleet 🟡 5 / 6
Shipments (AWB) ✅ · Deliveries with POD 🟡 (register built; `receivedBy` is a typed name
and **not a signature** — that needs the mobile field view) · Trips & routing 🟡 (trips
recorded; **no routing**) · Fleet register & compliance 🟡 (the two expiry dates are
stored; **nothing warns before one lapses**, so a vehicle with expired insurance still
reads In service) · **Customs & freight, landed cost ⬜ · Dashboard ⬜**

It was the thinnest built section in the product; three engine registers, 08/09/2026.

#### §10 Assets & Equipment 🟡 3 / 4
Allocation to deals with internal hire rates 🟡 (the register holds `hireRate`; **nothing
allocates or charges**) · **Utilisation & cost charged to deals ⬜** · Equipment
maintenance ✅ · Calibration ✅

**It rendered NOTHING until 08/09/2026** — an equipment register, maintenance and
calibration, all engine types.

**THE CAVEAT THAT APPLIED TO EVERY ENGINE REGISTER IS HALF CLOSED, 08/09/2026.** It read:
*no archetype holds an `engine.*` key and no screen can grant one*, because `StudioRoles`
draws its grid from `AREAS` and an engine key is minted from a row — so every register was
reachable by the owner and Admin alone. By then that gated **twenty-two** registers across
six sections rather than the eleven this paragraph was written about.

**The roles screen offers them now.** `grantableTypeAreas` projects the studio's own
record types into the `Area` shape at runtime and the roles route returns them beside
`AREAS`; nothing is added to `ALL_PERMISSIONS`, which stays a closed compile-time set with
`isEnginePermission` as its one escape hatch. Grouped under the section each register lives
in, so NCRs appear beside the rest of Quality & HSE. `tests/crud.mjs` pins the whole round
trip, because each half passed on its own while the feature did not work: the screen must
offer the key, `cleanPermissions` must not silently drop it, and the register must then
open for somebody holding that key and nothing else.

**AND THE ARCHETYPES HOLD THEM NOW TOO, 08/09/2026 — the caveat is closed.** Eight of the
eleven shapes name the SECTIONS whose registers they own, at a level, rather than listing
register names: twenty-nine registers against eleven shapes would be three hundred
decisions that go stale the moment a register is added, which is the same reason ~2,900
hand-written permission lists were rejected for eleven shapes in the first place. A
register added under Quality & HSE reaches every shape that owns that section with nobody
remembering to.

**It expands against the studio's OWN types**, not the built-in list, so a studio that
declares its own register under a section finds the shapes that own it already able to
open it. `money` picks up none of the twenty-nine, deliberately — nothing in them is a
controller's to keep — and with no studio in hand `permissionsFor` still returns the
declared shape alone, because inventing keys for types a studio does not hold would grant
rights to registers that do not exist.

**What is still open:** a register has no attachments, no comments and no audit trail —
Phase 3's type management is what closes that. And the seeded roles are a COPY taken when
the department is created (the BOQ rate rule), so a studio seeded BEFORE this landed keeps
the roles it has; `scripts/migrate/departmental-roles.mjs` is the only mover and it has
still never been run.

**EVERY ENGINE SECTION HAS A DASHBOARD, 08/09/2026 — one panel, not five.** Five of the
seven sections carrying a "Dashboard ⬜" hold nothing but engine registers (Manufacturing,
Assets, Quality & HSE, Field Operations, Logistics), so the generic section page now shows
each register's status breakdown and what is past its date. `platform/engine/summary.ts`
is pure and `tests/engine-summary.mjs` asserts the arithmetic; the route mints **no
permission key** and could not sensibly hold one — every figure is derived from rows the
reader can already open, so the totals move with the reader exactly as customer 360's do.

**TWO RULES IN IT WERE GUESSES AND BOTH WERE WRONG ON THE FIRST REGISTER THEY MET.**
"An ending is a status in the last third of the ladder" made `Closed` OPEN on the
four-status permit register, so every closed permit would have been chased forever; an
ending is now a status the type declares no move OUT of, which is real structure the
register cannot work without. And "chase any past date field" reported every issued permit
overdue on its `validFrom` — the day work was allowed to START. A deadline is matched by
what a deadline is CALLED now, which degrades safely: a field it does not recognise is not
chased, a gap somebody notices rather than an alarm they learn to ignore.

**Verified in the sandbox, not just asserted**: three NCRs, two of them past their action
date, rendering worst-first with the field's own label and the third correctly absent.

#### §11 Quality & HSE 🟡 7 / 8
ITPs ✅ · Inspection & test records ✅ · NCR / CAPA ✅ · Audits ✅ · HSE incidents 🟡
(register built; **no LTIFR** — `daysLost` is stored and nothing computes a rate) ·
Permits to work & toolbox talks ✅ · Certifications ✅ · **Dashboard ⬜**

Three more engine registers, 08/09/2026. **An ITP is a PLAN and a test report is a
RECORD**, and they are separate registers on purpose: collapsing them leaves a studio
unable to answer the only question an auditor asks — not what you intended to check, but
what you checked and what it said. A test report keeps `result` and status apart for the
same reason: the result is what the test said, the status is how far the paperwork has
got, and a failed test nobody has signed off is a different thing from a failed test that
has been witnessed and rejected.

**Two gaps named rather than implied away.** Nothing raises an NCR from a failed test —
the two registers sit beside each other and are not linked. And `Expiring` on a
certificate is a status somebody SETS, not one anything computes: nothing reads
`expiresOn`, so a certificate that lapsed last month still reads Valid until a person
notices. The vehicle and training registers carry the identical gap, stated in all three.

**It rendered NOTHING until 08/09/2026** and now has five registers, all engine types —
declared as rows, no new engine code. See the caveat under §10; it applies here too.

#### §12 Human Resources 🟡 5 / 10
Employees ✅ · Leave & employee requests 🟡 (vacations exist; the wider request model does
not) · Recruitment ✅ · Performance ✅ · Training & skills ✅ · **Attendance ⬜ ·
Manpower planning ⬜ · Payroll runs, allowances, deductions ⬜ · Payslips and bank/WPS
files ⬜ · Payroll posting to the ledger ⬜**

Three engine registers, 08/09/2026 — candidates, appraisals and training records. Each
carries the ending a real one needs: a candidate is Rejected (the company's decision) or
Withdrawn (theirs), because a register recording only "closed" cannot tell a studio it
keeps losing people at the offer stage; an appraisal goes back from Manager review to
Self-assessment; a training record returns from Expired to Completed, since a safety
ticket is renewed rather than re-earned. **Hiring a candidate creates no employee** and
**nothing warns before a ticket lapses** — both named rather than implied away.
Attendance is deliberately NOT a register: it is a daily high-volume record and wants its
own model. Payroll is the largest remaining piece and is bespoke.
The artifact's note here {M} *"a department IS a top-level section"* {M} **is reversed**:
departments are their own records under Administration as of 06/09/2026.

#### §13 Finance & Accounting 🟡 11 / 18
Cash ✅ · Ledger ✅ · Payables ✅ · Fixed assets ✅ · Settings ✅ · Payment as an
allocatable record ✅ · Retention & progress billing (IPC) ✅ · Budgets & commitment
control 🟡 (at project level only, not in the ledger) · Multi-currency 🟡 (daily FX and
rate-at-approval; no revaluation) · P&L and balance sheet 🟡 (both built 08/09/2026; **no
cash flow** — it needs operating/investing/financing classification nothing records) ·
Dimensions on every journal line ✅ (deal, project, cost code, department — carried,
cut by, and reconciling; 08/09/2026) · **Periods & close ⬜ · Credit notes ⬜ · Tax
engine, ZATCA adapter, WHT ⬜ · Bank reconciliation ⬜ · Cash-flow forecast and PDCs ⬜ ·
Letters of guarantee & credit ⬜** · Auto-posting from every module ✅ (08/09/2026)
**The largest single body of unbuilt work in the programme.**

**"LEDGER ✅" WAS THE WORST ENTRY THIS FILE HAS CARRIED.** The module was written,
typed and guarded — and imported by NOTHING: no route, no caller anywhere in `src`.
A whole double-entry book the product could not open. It has a door as of 08/09/2026
(`/api/studios/<slug>/finance/ledger`) and Gate A posts to it for the first time.
`docs/functionality/ledger.md` is the file.

**AUTO-POSTING IS DONE, 08/09/2026 — all five documents.** `postInvoice`, `postExpense`,
`postBill`, `postBillPayment` and `postPayment` had been written complete and imported by
NOTHING since the ledger was built. Each now has a caller at the moment that makes its
entry true: an invoice on Draft → Sent, a bill on receipt (**not** on approval — approval
authorises payment; the debt is owed from the day the supplier's invoice arrives), an
expense on creation (it has no states — the money has already left), and both payment
kinds when the payment is recorded. `autoPost` never fails the document: the invoice was
issued, that happened, so a ledger refusal is RETURNED for the caller to surface rather
than allowed to undo a write that already succeeded.

**AND IT FOUND A BUG THAT COULD NOT FIRE BEFORE.** A payment id is `pay1`, `pay2`…
numbered WITHIN its invoice, so every invoice has a `pay1`; `alreadyPosted` matched on
kind and id alone, so **the second invoice's first payment was refused `already-posted`
and never reached the books** — real money missing, silently. Unreachable while the
posting functions had no callers at all. The source id carries its parent now
(`<invoiceId>:pay1`), and no migration was needed for the same reason the bug existed:
nothing had ever posted a payment. `tests/finance-posting.mjs` pins all of it, including
that exact case.

**IT STILL HAS NO SCREEN.** The ledger is reachable only through
`/api/studios/<slug>/finance/ledger`.

#### §14 Reports & BI ⬜ 0 / 5
**Executive dashboard ⬜ · Report builder ⬜ · Saved, scheduled & exported reports ⬜ ·
Analytics ⬜ · KPI targets & alert rules ⬜**  {M}  renders nothing.

#### §15 Administration & Settings 🟡 4 / 10
People ✅ · Access ✅ · Studio settings ✅ · Master data 🟡 (locations and departments
only) · **Currencies and units of measure ⬜ · Numbering series and cost codes ⬜ ·
Categories and industry taxonomy ⬜ · Flow templates ⬜ · Integrations & API ⬜ ·
Notification templates & print formats ⬜**
The artifact's footer {M} *"all four of its keys sit in `NO_SCREEN_YET`… hardcoded standalone
entries"* {M} **is reversed**: the fold landed 03/09/2026 and Administration is an ordinary
gated section.

#### Where that leaves the programme

| | Built | Target | |
|---|---|---|---|
| Complete | 2 sections | CRM & Sales, Tendering | |
| Partial | 6 sections | Projects, Procurement, Administration, Engineering, Field Service, Finance | |
| One subsection only | 2 sections | Logistics, HR | |
| Renders nothing | 4 sections | Manufacturing, Assets, Quality & HSE, Reports | |
| **Subsections** | **58 built** | **130 in the target list** | **45%** |

**The four empty sections are NOT the gap.** They are 23 of the **72** outstanding
subsections. The other **49** sit inside sections that already render and read as finished.

**THE SUMMARY ROW ABOVE FIRST READ 42 / ~110 / 38%, AND ALL THREE WERE WRONG.** 42 is the
count of declared keys in `SECTION_DEFS`, which is a different unit from the artifact's
subsection list — CRM declares 7 keys and covers 10 target subsections — so the row divided
one thing by another. 110 was a guess. The figures here are the sum of the fifteen rows
above, which are themselves checked against code. Same failure as the 46-that-was-42, one
level up: a total invented rather than added.

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

**THE COMPANY IS BASED IN JORDAN. THE MARKET IS REGIONAL, THEN GLOBAL. NO SINGLE
COUNTRY IS TO BE NAMED ANYWHERE IN THE PRODUCT.** Stated by the user 07/09/2026, and
recorded here because two rounds of assumption preceded it: the product carried Saudi
defaults nobody had chosen, and I then guessed at the reason rather than asking. Neither
the defaults nor the guess were the user's.

Finance is jurisdiction-neutral by design decision D5 of the programme spec — *a
configurable tax engine, not a Saudi tax module* — and the tenant-facing ERP holds to
that: a studio sets its own currency, amounts convert through the daily FX table, and the
rate that routed an approval is stored on the record.

**BUT THE DEFAULTS WERE SAUDI, AND DEFAULTS ARE WHAT EVERY STUDIO ACTUALLY GETS.** Measured
07/09/2026, worst first:

Selling in one's own currency is a business decision rather than a jurisdiction leaking
into the product, and the two must not be conflated — but the decision is nowhere recorded,
so anybody re-reading it later would have to infer it from a constant.

**ONE OF THEM IS AN OUTRIGHT BUG.** `src/app/api/studios/[slug]/nova/route.ts` puts
*"Money is in SAR"* into the system prompt of EVERY tenant, whatever currency that studio
set. A studio trading in euros has an assistant told otherwise, and it will read amounts
back in the wrong unit. That line should take the studio's own currency, which the context
already holds.
| Bank reconciliation, cash-flow forecast, PDCs, LGs | ⬜ |
| Auto-posting from every module | ⬜ |

### P4a — the hand-built sections ✅ complete 07/09/2026

All five, slice by slice, in the table further up this file.

### P4b — the record engine 🟡 phase 1 on `main`

A record type declared as data; the engine supplies list, card, create and edit, workflow,
attachments, comments, audit, live updates and permission filtering. **Roughly 50 of the
remaining subsections ride it**, which is why it precedes P5.

**Phase 1 shipped one built-in type end to end** — `transmittal`, seeded at studio creation
under Engineering & Documents. Two collections (`recordTypes`, `engineRecords`, one for
every instance of every type because a collection per type would need a deploy per type),
the `engine.<typeKey>.<verb>` permission namespace (structural, so **the catalogue is
unchanged at 177**, and `cleanPermissions` no longer drops such a grant silently), one
route (`/api/studios/<slug>/records/<typeKey>`, the type from the URL and never the body),
one generic screen, the sub-section planted in the same write as the type row, and seven
goldens. `docs/functionality/record-engine.md` is the file.

**Phase 2 is the second and third built-in types** — the registers P5's Engineering &
Documents needs beside transmittals — which is what proves the declaration is general
rather than shaped around one example. **Phase 3 is tenant self-service:** a studio
declaring its own types through a screen, which is the whole reason the declaration is a
row, and which brings type deletion and the orphaned-grant report with it.

**THE ROLLOUT CONSEQUENCE:** `seedBuiltinTypes` runs inside `createStudio` and nowhere
else, so no existing studio has the built-in type and no read path can catch it up — the
catch-up would be gated on `engine.transmittal.view`, which no existing role holds.
`scripts/migrate/seed-builtin-types.mjs` is the way in (dry-run by default, additive,
idempotent, and `plant-sections.mjs` first on an old studio). **It has not been run against
live or the sandbox.**

Bespoke screens the spec says it must never be stretched to cover: BOQ grid, Gantt, cost
sheet, dispatch board, shop-floor terminal, MRP and capacity planner, mobile field view,
payroll run, financial statements, report builder. **Two of those are already built by
hand** — the BOQ grid and the Gantt — which is the line holding where the spec drew it.

### P5 — engine-driven sections ⬜ barely begun

| Section | Built | Missing |
|---|---|---|
| `modules/finance/finance.ts:53` | **`DEFAULT_VAT_RATE = 15`** — the Saudi rate, applied to every studio's invoices and quotations. Overridable per invoice; **there is no per-studio setting.** Jordan is 16, the UAE 5, Egypt 14. | ⬜ **OPEN — the worst of these.** A wrong number on real financial documents, not a label. |
| `api/studios/[slug]/nova/route.ts` | Told every tenant *"Money is in SAR"* and *"invoices carry 15% VAT"*, whatever that studio had set. | ✅ **FIXED 07/09/2026** — takes the studio's currency, says nothing when unset, and interpolates `DEFAULT_VAT_RATE` so prompt and code cannot drift. |
| `api/pricing/route.ts:17` | `const BASE = "SAR"` — nompany's own price list is authored in riyal and every currency converts from it. | ⬜ **OPEN — commercial decision.** |
| `landing/views/PricingView.js:68` | The public pricing page opens on SAR. | ⬜ OPEN — follows the base above. |
| `super/.../packages/page.js:48,50` | Packages and tiers priced `SAR `. | ⬜ OPEN — follows the base above. |
| `super/.../settings/profile/page.js:142,146` | Placeholder phone `+966 55 000 0000`; timezone defaults to `Asia/Riyadh`. | ⬜ OPEN — cosmetic, in nompany's own console. |
| Programme spec D5 | **ZATCA named as the first tax adapter.** Nothing is built — `ZATCA` appears nowhere in `src`. | ⬜ **OPEN — revisit.** A clearance-model regime with cryptographic stamping is an expensive way to prove an abstraction for a market you are not selling to first. |

**NOT A PROBLEM, and worth separating so it is not "fixed" by mistake:** `Money.js` and
`Currency.js` render the riyal glyph *when the currency is SAR*, because that symbol has no
usable font glyph. That is correct support for one currency among many, not a country
assumption. Supporting SAR is right; **defaulting to it is what was wrong.**

**Also found in the same sweep, and unrelated to any country:** Nova's system prompt still
described the **pre-restructure twelve departments** — naming Technical for quotations,
Quality for the controlled document register and Operations for locations, none of which
has been true since P0. Every tenant asking Nova how to do something was being sent to a
nav that does not exist. Fixed in the same commit, and it now names the fifteen sections
and says which four render nothing.


| Item | State |
|---|---|
| **Reports & BI** — executive dashboard, report builder, KPI targets, alert rules | ⬜ section renders nothing |
| **Administration master data** | 🟡 Locations and Departments built; currencies, UoM, numbering series, cost codes, categories, industry taxonomy pending |
| Integrations and API, notification templates, print formats | ⬜ |
| **Templates B–G activation** — one real deal per template, end to end | ⬜ only Template A is exercised |
| Readiness — performance pass, onboarding, spreadsheet import, docs | ⬜ |

### What that adds up to

The spec sizes the programme at **≈65.5 weeks**. Done: P0 (2) + P1 (5) + P2 (8.5) + P4a
(14) ≈ **29.5**. Remaining: P3's statutory half, **the rest of P4b (4, of which phase 1 is done)**, P5 (8), P6 (11), P7 (6) — call
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

Deferred (ledgered): the project's
children attaching on create, score-members-by-`createdAt`, `dept`/`hasStage` on backfilled
engagements, routing the best-effort miss through observability, and the reconcile job.

---

## Gates

A gate is a promise the build keeps, not a milestone anybody declares.

| Gate | Exit criteria | State |
|---|---|---|
| **A** | Golden responses recorded · permission matrix exhaustive · hop counts pinned · CI enforcing all three | ✅ **green** |
| **B** | Zero direct `readCol` in service code · ≤2 hops per module request · goldens unchanged throughout | 🟡 **2 of 3, and 2 of 3 criteria now have NO INSTRUMENT** — Gate A was deleted 08/09/2026 and it was what measured the hop ceilings and the goldens. `readCol` is a source grep and still holds. |
| **C** *(W3)* | Every module `.tsx`, departmental structure, no cross-imports outside declared seams | ⬜ not started |

### Gate B, in detail

| Criterion | Target | Now |
|---|---|---|
| `readCol` in service code | 0 | ✅ **0** |
| Hops — `/api/studios/[slug]` | ≤2 | ✅ **2 waves** *(was 8)* |
| Hops — `…/sales` | ≤2 | **3 waves** *(was 8)* — 3 is the structural floor |
| Goldens unchanged | — | ⚫ **N/A** — there are no goldens. All 379 were deleted with Gate A on 08/09/2026, on the owner's instruction; `tests/routes.mjs` and `tests/crud.mjs` replace it and pin no response bodies. |

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
