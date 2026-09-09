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

**THREE OF THESE FIVE WERE NOT DEAD, and the audit that listed them checked the
prose rather than the dependants.** Acting on it 08/09/2026 found that only two
describe nothing: the other three document code that still ships, and deleting
them would have left a live `/super` screen, a live CLI and eleven live
documents citing files that no longer exist. The rule the house style already
states — trace every caller before a removal — applies to documents as well as
to functions, and this table is what happens when it is skipped.

| File | Lines | Why | Acted |
|---|---|---|---|
| `docs/erp-guide.md` | 239 | Described the pre-restructure product; its own heading said "the twelve departments". | **DELETED 07/09/2026** |
| `DOCUMENTATION.md` | 229 | Describes an in-studio **Documentation section that was removed**: `src/lib/documentation.js`, `DocumentationGuide.js` and the `documentation` permission node are all gone. Verified: nothing in `src` references any of them, and nothing but this table linked to the file. | **DELETED 08/09/2026** |
| `docs/database-migration-mssql.md` | 396 | "Redis to Microsoft SQL Server" — neither end is real. **But it is the design of record for a subsystem that still ships:** `platform/db/migrate/{mapping,emit}.ts` cite it in comments AND in an error message, `components/super/MigrationScreen.js` RENDERS its filename to a super admin, and `emit.ts` writes `-- Authoritative DDL: docs/database-migration-mssql.md §2` into every generated `.sql` — pinned by `tests/goldens/migration.export.dump.json`. | **KEPT.** The document is not the dead thing; see F below. |
| `scripts/migrate/README.md` | 317 | "Redis to SQL Server backfill (CLI)" — the premise is wrong. But `backfill.mjs` exists, and this is the only documentation of it and of the `/api/super/migration/export` route behind the console's "Export database" button. | **KEPT.** Wrong premise, live subject. |
| `docs/README.md` | 60 | Surveyed 20/08/2026 at "12 departments" with Redis latency figures. **It already opens with a banner saying so** ("A DATED SNAPSHOT, NOT CURRENT TRUTH… read it for the reasoning, never for a number"), it defers to this file and to `CLAUDE.md` by name, and every one of its twelve index entries resolves — it is the only map of `docs/`. Its "153 today" was re-measured to 170. | **KEPT AND CORRECTED.** |

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
| `2026-09-07-marketing-site-rebuild-design.md` (360) | **BUILT 08/09/2026.** Ten pages per locale on one shared chrome, a real contact backend, the consent-gated featured-companies chain, nightly platform figures, a claims register, and a content-hash sitemap. Not built: real product screenshots (the pipeline exists; Playwright is deliberately not a dependency) and the per-company sentence on `/customers`. |
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

**AN ELEVENTH, FOUND 08/09/2026 AND NOT YET ACTED ON — and it is the mirror of
everything above.** The other ten were plans that did not exist in the code. This
is code that exists for a plan that does not.

**A SQL SERVER MIGRATION SUBSYSTEM IS STILL SHIPPING**, for a migration that never
happened, to a database this product has never used. Redis is gone and the target
was Postgres, so neither end of it is real — and it is not a stale document, it is
five live pieces:

| Piece | What it is |
|---|---|
| `src/platform/db/migrate/{mapping,emit,transform}.ts` | The extract/transform/emit core. `mapping.ts` names the mssql design doc in an ERROR MESSAGE. |
| `src/app/api/super/migration/export/…` | A super-admin route that streams a `.sql` file. |
| `src/components/super/MigrationScreen.js` | A console screen at `/super → Application → Database migration`, which RENDERS `docs/database-migration-mssql.md` to the operator as its "design of record". |
| `scripts/migrate/backfill.mjs` | The CLI wrapper, plus `scripts/migrate/README.md` describing it. |
| `tests/goldens/migration.export.dump.json` | A golden pinning `-- Authoritative DDL: docs/database-migration-mssql.md §2` in the emitted SQL. |

**This is why category A above was wrong about three files.** The audit read the
documents and judged them dead; the documents are the only description of code
that is still in the product and still reachable by a super admin. Deleting them
would have left the screen, the CLI and the generated SQL citing files that do not
exist — worse than the stale prose, because a citation to nothing cannot even be
corrected by reading it.

`COLLECTION_TABLE` also earns its keep independently: `next build` refuses when a
new collection is missing from it, which has caught `contracts`, `tenders` and
`recordTypes`. **Removing the subsystem must not remove that guard.**

**Not proposed as a deletion here, because it is the owner's call and it is one
commit's worth of tracing:** a console screen, a route, a CLI, a golden and a
build-time guard that must survive. Recorded so it is decided rather than
rediscovered.

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
| 07/09/2026 | Delete the five dead documents in category A | **PARTLY DONE 08/09/2026 — two were dead and are gone; three document live code and were kept. See A.** |
| 07/09/2026 | Top-up seeded roles for departments that already exist | **PROPOSED** |
| 07/09/2026 | Studio Settings points at Master data when the industry changes | **PROPOSED** |
| 07/09/2026 | Fix Nova's hardcoded "Money is in SAR" to use the studio currency | **DONE** |
| 07/09/2026 | Fix Nova's prompt naming the pre-restructure twelve departments | **DONE** |
| 07/09/2026 | Make the VAT rate a per-studio setting; stop defaulting to 15 | **PROPOSED — highest priority of the country items** |
| 07/09/2026 | Generate the Fifteen Sections view from `SECTION_DEFS` rather than hand-writing it | **PROPOSED** |
| 07/09/2026 | Move pricing off a SAR base (company is in Jordan; market regional then global) | **YOUR CALL — which base currency?** |
| 07/09/2026 | Revisit ZATCA as the first tax adapter | **CHANGED TO: build a jurisdiction-neutral WHT engine instead; no ZATCA adapter** (09/09/2026 — the company is in Jordan and sells across the region as a generalist SME tool, so a Saudi e-invoicing adapter is a COUNTRY INTEGRATION rather than a tax engine. Withholding shipped; ZATCA is not started and is not next.) |
| 09/09/2026 | Close an accounting period and refuse postings dated in it | **DONE** |
| 09/09/2026 | Give the ledger a screen — it had none, and fell through to Cash | **DONE** |
| 09/09/2026 | Pay records, payroll runs and posting the wage bill to the ledger | **DONE** |
| 09/09/2026 | Attendance as a daily sweep rather than an engine register | **DONE** |
| 09/09/2026 | A studio-wide cost code library, copied into a project rather than referenced | **DONE** |
| 09/09/2026 | Open the six hard-coded classification lists to the studio, defaults never removable | **DONE** |
| 09/09/2026 | Notifications become a token plus its facts; the bell chooses the language | **DONE** |
| 09/09/2026 | API keys as a second proof of an identity, narrowed by the holder's current rights | **DONE** |
| 09/09/2026 | Webhooks alongside the API keys | **DEFERRED — the inbound half shipped; nothing calls out to a studio's endpoint, and it is named in docs/functionality/api-keys.md rather than left implied** |
| 09/09/2026 | Per-studio print formats beside the notification wording | **DEFERRED — a document still prints through the browser's own stylesheet; named in docs/functionality/notifications.md** |
| 09/09/2026 | A cross-section executive dashboard, built on the export's dataset catalogue | **DONE** |
| 09/09/2026 | Sell the board's analysis rather than its figures — Reports joins the widget registry | **DONE** |
| 09/09/2026 | The studio's daily greeting becomes a BAND OF MESSAGES, and the automated ones are written by the AI key | **DONE** (the first version was one message picked from seven lines I hand-wrote, and the owner's question — "who writes it tomorrow?" — had no good answer: nobody did, and the same seven repeated weekly. An automated message now calls the platform AI key set in Application → Nova, once per server day for the whole platform, cached against the date and falling back to the old rotation when there is no key or the call fails. A written message is typed words. Several share one box and cycle every five seconds with a dot each. Colour is per message: house ramp or one-to-six custom stops on fill and border, hex literals only because the strings reach a `linear-gradient()` in every studio. `docs/functionality/greeting.md` is the file; `tests/greeting-model.mjs` is the coverage. Migration is in `cleanConfig` — the old single message becomes one automated or one written message, so nothing a tenant sees changes until a key is set.) |
| 09/09/2026 | Daily greeting is renamed BROADCAST and moves onto the Pulse wall, with the AI key beside it | **DONE** (the console menu row and `/super/application/greeting` are gone; Pulse's bottom bar — which had one dead item — now switches between two panes of one route, sliding rather than navigating so the wall keeps its polls and its map. The AI key form was extracted from NovaSwitchboard into `NovaCredentials` and is drawn in BOTH places: one stored credential, one form, two screens, because being sent to the other tab to find it is the bug this closes. The code, routes and storage keys still say `greeting` — renaming `g:greetingConfig` would strand every studio's configuration for a label nobody reads.) |
| 09/09/2026 | A broadcast is a RECORD WITH A LADDER, and a dismissal belongs to one send | **DONE** (the owner reported it: a second message never appeared to anyone who had closed the first. Dismissal was keyed on the DAY and closed the whole band, so closing it once hid everything sent for the rest of it. `active: true|false` became Draft/Sent with a `sentAt` stamp — the RFQ shape — and the key is `<id>:<sentAt>`, so closing one hides one, a later send still arrives, and re-sending reaches the people who closed the first version. The band re-reads every minute and on tab focus, because a band that only read on mount reaches nobody already sitting in a studio; instant push would mean an event per studio per send and `emitPlatform` only reaches the console's channel. The console is a register of rows opening one at a time rather than every editor stacked at once.) |
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

#### §4 Engineering & Documents {M} `engineering-docs` ✅ 9 / 9
Document register ✅ · RFQ ✅ · Live view ✅ · Settings ✅ · Transmittals ✅ · RFI
register with ball-in-court ✅ · Submittal register ✅ · EBOM & specs ✅ · Technical
library ✅

**ALL THREE ARE ENGINE TYPES, NOT HAND-BUILT SCREENS**, which is what P4b was for.
Transmittals shipped with the engine itself (08/09/2026) and RFIs and submittals are
P4b PHASE 2 — declared as rows, with no new field kind, no new verb and not one line of
engine code. They are also the check that the declaration is GENERAL rather than shaped
around the first type: an RFI carries a select whose value is refused unless the type
offers it, and a submittal's ladder branches three ways out of one status and loops back
on itself.

**THAT IS NO LONGER TRUE, 08/09/2026.** This said *"nobody but the owner and Admin can
open them yet — no archetype holds an `engine.*` key and no screen can grant one"*. Both
halves are fixed: the roles screen offers a studio's own record types (`grantableTypeAreas`)
and eight of the eleven archetypes name the SECTIONS whose registers they own, so a seeded
departmental role arrives holding them. See §10's note for the detail.

**EBOM and the technical library landed 08/09/2026**, both engine types. `ebom` is its own
key rather than a reuse of Manufacturing's `bom`: an engineering BOM and a manufacturing
one are different documents at different stages — what the design says against what the
shop builds — and collapsing them would lose exactly the discrepancy an engineering change
is raised about. **Parts are one long text field and that is stated rather than implied
away**: the engine has no line-table field kind, so nothing explodes an EBOM into demand.
The library holds a CATALOGUE and no files — two statuses, Current and Withdrawn, because
nobody approves a copy of BS 8110 but a superseded standard an engineer is still working
from is exactly the failure worth recording.

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

#### §6 Inventory & Warehouse ✅ 9 / 9
Stock ✅ · Items ✅ · Project sheets ✅ · Stocktaking 🟡 (an engine register as of
08/09/2026: planned, counted, reviewed, adjusted — and **Review goes back to Counting**,
because a variance nobody believes is recounted rather than adjusted, which is the whole
control a stocktake exists to be. But **`Adjusted` MOVES NO STOCK** — the register records
that a count happened and what it found; the adjustment is Inventory's own write and is
not wired to this) · Locations & bins ✅ (09/09/2026) · Batch & serial lifecycle ✅
(09/09/2026) · Adjustment approval ✅ (09/09/2026) · Dashboard ✅ · Valuation method ✅
(09/09/2026)

**THE HEADING SAID 6 / 8 OVER A LIST OF NINE, AND ONE OF THE NINE WAS ALREADY BUILT.**
`InventoryDashboard` has rendered on the section root since before the restructure —
"a place of its own: its own dashboard rather than a redirect", gated on
`canViewDashboard` — and this line carried it as ⬜ anyway. Counted against the list it
sits above, from the code, not from the prose.

**INVENTORY KNEW HOW MANY AND NEVER WHERE OR WHICH.** Two registers landed together
because they are the same shape: a BIN says where a unit is, a BATCH says which run it
came from and when it stops being usable, and both are LABELS rather than quantities —
what is in one is the sum of the movements naming it. `splitBy` is shared, not copied,
because two answers to "how much is in each X" would be free to disagree about what a
movement means, and the split summing to the company total is the one property either
feature can break invisibly. Proven both ways in the sandbox: 4 + 2 + 5 = 11 across bins,
12 + 8 + 10 = 30 across batches.

**PUTTING STOCK AWAY IS MOVING IT, and there is ONE writer.** A net-zero pair of
movements — `-qty` where it was, `+qty` where it went, each naming the other end —
generalised over the field so the batch register reassigns through the identical code.
Rewriting a movement's bin would be rewriting history in a ledger that is append-only
precisely so a balance can be re-derived.

**A BIN SITS IN ADMINISTRATION'S LOCATION**, not in a list Inventory invented: a second
list of places would be free to disagree with the first about where the company works,
which is what the departments register exists to stop happening to the org chart. Neither
register mints a permission key — both answer to `inventory.stock`, the right somebody
already holds to move what sits in the bin or carries the label.

**A NEGATIVE BIN IS REPORTED AND A SHORT MOVE IS REFUSED, and they are not in tension.**
A negative means stock left the building and the paperwork lagged — the company total is
right and only the split is behind, so refusing would stop a warehouse whose shelves are
correct. A move is somebody at a shelf saying they are carrying five units off it; if the
records say three, one of the two is wrong and moving five would bury it.

**`no-date` AND `empty` ARE STATES, NOT MISSING DATA.** Plenty of stock is batch-tracked
for traceability and never expires, and an invented expiry is worse than none because
everything downstream believes it; a batch used up before it went off is nobody's problem,
and colouring it red buries the ones still on a shelf. FEFO suggests the soonest-expiring
usable batch and never enforces — a system that refused every other batch is one people
work around by not recording the batch at all, losing the traceability it exists for.

**SERIALS WERE A JOIN NOBODY HAD MADE.** `item.serials` and a sheet's allocation have both
existed for as long as Inventory has; nothing put them together, so "is this unit spoken
for" meant opening every sheet in the studio. Three states and no more — `held`,
`allocated`, `gone` — because a state nothing writes lies about being supported.

**WHAT IS HONESTLY MISSING is in both files' "Not built yet":** a goods receipt creates no
batch and names no bin, and issuing consumes neither, so both registers are populated
deliberately rather than as a side effect of ordinary work. That is the next slice, and it
is the one that makes the pair routine.

**A LEVEL IS NOT A VALUE.** Inventory has always known how many of a thing it holds —
stock is the sum of its movements, appended and never edited — and never what they cost, so
a studio could say "eleven pumps" and not what appears on a balance sheet. Two methods,
FIFO and weighted average, because the answer genuinely differs and neither is wrong: a
product that silently picked would be putting a number on somebody's accounts they never
chose. The policy is a STUDIO setting beside `currency` and the numbering — the figure
lands on a balance sheet, and whoever signs that is not the person who runs the warehouse.

**THE COST IS ON THE ORDER, NOT THE MOVEMENT**, and that join is what makes the choice
real. A movement records `sourceType: "order"` and its `sourceId`; the purchase order's
line for that item holds what was paid. Without it every receipt would value at the item's
single `unitCost` and the two methods would agree on everything — a setting that changed no
number, which is worse than not offering it. Verified in the sandbox against two real
receipts at 100 and 200: after issuing five, **FIFO says 1,000 and average says 750**, and
the route flags `preview: true` when a caller asks for the method the studio has not chosen.

**Uncosted units are counted and reported.** A receipt with no order behind it and no item
cost values at nothing, so a studio whose history predates cost tracking gets a total that
is honestly too low rather than a confident wrong one.

**`adjustStock` WAS THE ONE WRITE IN INVENTORY WITH NO DOCUMENT BEHIND IT.** A bill has a
supplier's invoice and a receipt has a lorry; an adjustment is a person typing a number
into the ledger every on-hand figure in the section is summed from, asking only
`inventory.stock.create` — the right somebody needs to count shelves, and therefore held by
more people than should be able to write off a container. Its own comment said so.

**P2's approval engine's FIFTH document type**, not a fifth engine. Catalogue 184 → 186
(`inventory.stock.approve`/`approveHigh`, extras on the stock area). Invariant 7 twice: the
raiser never signs — refused for the OWNER in the suite — and nobody signs two steps of one
record. The stock moves on the LAST signature and not before.

**ITS FIRST STEP IS NOT ALWAYS-ON, unlike a bill's or a requisition's.** Counting a shelf
and correcting it by one happens dozens of times a week; a signature for that means either a
queue nobody clears or a studio switching the control off. 1000 is where a correction stops
being a correction, and it is the studio's dial.

**AND WIRING IT FOUND A GATE THAT FAILED OPEN.** Routed through `resolveApprovalPlan`, the
plan came back `ok: false` for any studio with no currency — which is every studio, since
`createStudio` has never set one — and `needsApproval` read a refusal as "nobody has to
sign". Every adjustment of every size applied immediately with the control switched off and
nothing saying so. An adjustment has NO currency (its value is units times the item's own
cost, already in the studio's money), so the plan is built directly now and a plan that
cannot be built REFUSES the write. "No signature required" and "we cannot tell whether one
is required" are opposite answers, and a gate that fails open is worse than none because
somebody believes in it.

#### §7 Manufacturing & Production 🟡 6 / 6 (all built; two carry named gaps)
BOM & routing 🟡 (**a BOM explodes now** — `bomLines` names Registered Items and quantities,
09/09/2026 — but **nothing consumes a routing** and there are still no operations) · Work
orders ✅ · MRP & capacity planning ✅ (09/09/2026) · Shop-floor terminal 🟡 (09/09/2026 —
runs and QC are recorded; **the hours never reach timesheets**, so the subsection's own name
is half true) · Production QC ✅ (09/09/2026) · Dashboard ✅ (the planning screen is the
section root, and it is what a dashboard here would show)

The section RENDERS NOW — it left `NO_SCREEN_YET` on 08/09/2026 with four engine
registers under it (work orders, bills of materials, work stations, production batches).

**FOUR REGISTERS AND NOTHING JOINED THEM, which is what "an engine register is not a
feature" means in practice.** Work orders, BOMs, work stations and production batches each
held their rows and no two of them met: a BOM's components were one long text field, so
nothing could explode a demand, and a work order's `station` was a string nothing compared
against a station's own `capacityPerDay`. The section rendered and answered no question a
factory asks.

**TWO JOINS, AND THEY ARE THE FEATURE.** `bomLines` turns a work order for 40 pumps into
demand in the stock ledger's own units, netted against what is held and what is on order;
and a station's day has a size, so the orders pointed at it fit or do not.
`manufacturing.planning.view` is the section's FIRST declared right — every other right
over it is structural, minted from an engine row. **Catalogue 192 → 193, measured**; this
file and CLAUDE.md have both quoted 186 since the adjustment-approval commit, six stale.

**THE JOIN KEY IS THE PRODUCT NAME**, stated rather than hidden: both sides are engine
records whose fields are studio-defined, so there is no id between them. An order matching
no BOM is REPORTED and so is one with no quantity — a requirement nobody can see is worse
than one nobody has, because the buyer believes the list is complete. A second BOM for one
product is not blended in: that is a revision nobody retired, and adding both would double
every requirement, which is the one arithmetic error a buyer cannot spot by eye.

**A SURPLUS IS NOT A NEGATIVE SHORTFALL** and an unrated station says NULL rather than
nought — dividing by nought to avoid saying "we do not know how long this takes" prints
Infinity on a shop-floor screen.

**THE TERMINAL RECORDS THE TWO THINGS THE REGISTERS COULD NOT.** How long a run took (one
open run per person, closed only by the person who opened it, and NULL rather than zero
while it is open) and whether the batch was any good. A fail without a reason is refused,
the verdict is the LATEST check rather than a tally, and **an unchecked batch is null, not
a pass** — "not checked" and "checked and fine" are opposite facts about a batch about to
be shipped.

**AND THE TYPE KEY WAS `workorder`, NOT `workOrder`.** `rowsOf` answers an unknown type
with an empty list by design, so the first draft rendered a planning screen reporting a
factory with nothing to buy, and nothing failed. The numbering catalogue's near miss in a
second place; `tests/mrp-model.mjs` reads the keys out of the source and asserts each is
declared.

#### §8 Field Operations & Service ✅ 10 / 10
Schedule ✅ · Tracking ✅ · Settings ✅ · Service orders & job cards ✅ · Maintenance
contracts (AMC) ✅ · Preventive-maintenance plans 🟡 (the plan is a schedule; **nothing
generates the visits**) · Installed base ✅ · Dispatch board ✅ (09/09/2026) · Mobile field
view with e-signature ✅ (09/09/2026) · Dashboard ✅

Four engine registers, 08/09/2026. **The three the spec's own "never stretch the engine to
cover this" list reserved are done** — and one of them was never missing:
`OperationsDashboard` has rendered on this section since before the restructure, and this
line carried it as ⬜ anyway. Same defect as Inventory's, found the same way.

**THE BOARD AND THE FIELD VIEW ARE THE SAME JOBS FROM OPPOSITE ENDS.** A dispatcher looks
at everybody on one day; a technician looks at themselves across the days that are still
open. Neither mints a permission key, neither owns a collection, and neither writes
anything the jobs route did not already write — the board is read-only, because staffing a
job is editing the job and a second write path would be two ways to staff one.

**THE BOARD ANSWERS WHAT A CALENDAR STRUCTURALLY CANNOT.** A job with nobody on it looks
identical to a job with a full crew on a schedule; `assignedToCollaboratorIds` is an array
and nothing had ever asked whether one person is on two jobs at once; and `strandedJobs` is
the case no day view can show — scheduled last Tuesday, still on nobody, invisible because
the day it sits on is one nobody opens any more. Clashes are SHOWN and never refused: a
dispatcher deliberately overlaps a handover.

**A SIGNATURE IS NOT A STATUS**, which is the whole design of the field view. A technician
finishes with the householder out and the job is genuinely complete and genuinely unsigned;
folding the two together would either block completion on somebody being present or claim a
signature that does not exist. `awaitingSignature` is the state nothing in this product
could name before — work that has been done and cannot be proved. The mark is a canvas and
three pointer handlers rather than a library, stored through the PRIVATE media route.

**AND OPENING THAT DOOR FOUND THE JOB LIFECYCLE HAD NEVER WORKED.**
`PATCH /operations/jobs` passed the whole request body where `setJobStatus` takes a status
STRING, so `isStatus` was asked of an object, answered false, and every transition returned
`{ error: "status" }`. No job could leave `scheduled`: `completedAt` was never stamped and
Template D's signoff billing trigger could never fire.

**IT IS THE CHANGE ORDER'S BUG A SECOND TIME** — there the body went where
`answerChangeOrder` expects a BOOLEAN, and an object being truthy meant a rejection
APPROVED the variation. Same shape, opposite symptom, and neither reachable by the
compiler, because a route handler's `body` is not statically typed. So
`tests/restructure.mjs` refuses the shape by name now, **and it found a THIRD on its first
run**: `answerTimesheet(ctx, id, body)` takes a boolean, so rejecting a timesheet approved
it. Three fixed, one guard, and the guard is the durable half.

See §10 for the caveat that applies to every engine register.

#### §9 Logistics & Fleet 🟡 6 / 6
Shipments (AWB) ✅ · Deliveries with POD 🟡 (register built; `receivedBy` is a typed name
and **not a signature** — that needs the mobile field view) · Trips & routing 🟡 (trips
recorded; **no routing**) · Fleet register & compliance 🟡 (the two expiry dates are
stored; **nothing warns before one lapses**, so a vehicle with expired insurance still
reads In service) · Customs & freight, landed cost ✅ (09/09/2026) · Dashboard ✅ (the
engine register panel, 08/09/2026)

**A PURCHASE ORDER SAYS WHAT THE SUPPLIER CHARGED**, and freight, duty, insurance and
clearance are paid to other people on other invoices for the same goods. A studio valuing
stock at the order price alone understates what it holds — for an importing contractor,
routinely by a fifth — and quoting from that cost quotes below what the material really
cost to get. Catalogue 183 → 184 (`logistics.landedCost`), its own area because booking an
air waybill and reconciling a duty invoice against an order are different jobs.

**IT REACHES THE VALUATION, which is what stops it being a calculator.** `landedUnitCosts`
returns the same `orderId:itemId` key `stockValuation` already builds, so the landed cost
overlays the supplier price without either side knowing the other's shape. Verified in the
sandbox end to end: ten units at 100 valued at **1,000, then 1,200 once 150 freight and 50
duty were recorded** — unit cost 100 → 120.

**THE SHARES SUM TO THE CHARGE EXACTLY.** Three lines splitting 100 gives 33.33 three
times, which is 99.99, so a studio's landed total would be a penny short of what it paid on
every shipment forever; the last line takes the remainder. **Two bases, value and quantity**
— and weight is deliberately NOT offered, because a freight invoice is priced on it and no
line in this product carries one. Offering it and approximating by value is what every ERP
that stores two bases and offers three ends up doing.

**Charges with nothing to land on are REPORTED, not swallowed.** A free-of-charge shipment
still cost freight; with no value to allocate on, the money comes back as `unallocated`
rather than vanishing or dividing by nought.

It was the thinnest built section in the product; three engine registers, 08/09/2026.

#### §10 Assets & Equipment ✅ 4 / 4
Allocation to deals with internal hire rates ✅ · Utilisation & cost charged to deals ✅ ·
Equipment maintenance ✅ · Calibration ✅

**THE REGISTER HELD `hireRate` SINCE IT SHIPPED AND NOTHING READ IT** — its own declaration
said so: *"nothing consumes it yet — charging a deal for utilisation is its own slice."*
That slice landed 09/09/2026. A contractor that owns its plant and does not charge it to
jobs reports every job as more profitable than it is and meets the fleet's real cost as a
lump nobody can attribute.

**Catalogue 182 → 183 (`assets.utilisation`)**, its own area by the test `projects.costs`
passed: the equipment register is a list of what the company owns, and what that plant is
CHARGING each job is commercial information a yard foreman has no business reading.

**Two rules decide whether the numbers are real.** Days are INCLUSIVE at both ends — a
machine out and back the same day was on that job for a day, and an exclusive count makes
single-day hires free. And a machine cannot be on two jobs at once: the clash check is
inclusive at both ends and re-run on every EDIT, because extending a hire is how a machine
ends up double-charged. An open-ended allocation blocks everything after it. The rate is
COPIED when the machine goes out, so editing the register later cannot re-price a hire
already reported on a job — the BOQ rate rule.

**Verified in the sandbox**: two machines at 500 and 800/day across two deals — Riyadh 15
days / 9,000, Jeddah 5 days / 2,500 — with an overlapping booking refused 409 and the day
after allowed.

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

#### §11 Quality & HSE ✅ 8 / 8
ITPs ✅ · Inspection & test records ✅ · NCR / CAPA ✅ · Audits ✅ · HSE incidents 🟡
(register built; **LTIFR and TRIFR land 08/09/2026** — see below) ·
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

**`daysLost` WAS STORED ON EVERY INCIDENT SINCE THE REGISTER SHIPPED AND NOTHING READ IT.**
A rate needs a numerator and a denominator; the incident register held one and Projects'
timesheets held the other, in different sections, and nothing joined them. It is joined
now: `modules/quality/safety.ts` is pure, `tests/safety-model.mjs` asserts the arithmetic,
and a panel on the Quality & HSE page shows LTIFR, TRIFR, days lost and the kind
breakdown. **No permission key** — both halves are gated already (`engine.incident.view`
and `projects.list.view`), and a third right over records two others govern would be free
to disagree with both.

**NULL RATHER THAN ZERO, THREE WAYS, and each sends somebody somewhere different.** A
reader holding no Projects right gets the incident COUNTS and no rate (`no-hours-access`),
because hours are payroll-adjacent and a rate computed over records they cannot open would
leak the thing the gate is for. A period nobody booked hours in gets no rate either
(`no-hours`) — a "0.0 LTIFR" over it is a safety claim the data does not support. A period
with hours and no incidents is a REAL zero (`no-incidents-yet`), which is the good case and
the one a studio most wants to be able to state.

**Overtime counts as hours worked.** Excluding it would shrink the denominator and inflate
every rate — in exactly the periods a site was busiest, which is when the rate matters
most. And an undated incident is in no window at all, because a rate that changes with
whichever quarter is on screen is not a rate.

**Verified in the sandbox**: four incidents (two lost-time, one medical, one near miss)
against 300,000 hours rendering LTIFR 6.7, TRIFR 10.0 and 15 days lost.

#### §12 Human Resources ✅ 10 / 10 (one carries a named gap)
Employees ✅ · Leave & employee requests 🟡 (vacations exist; the wider request model does
not) · Recruitment ✅ · Performance ✅ · Training & skills ✅ · Attendance ✅ (09/09/2026) ·
Manpower planning ✅ (09/09/2026) · Payroll runs, allowances, deductions ✅ (09/09/2026) ·
Payslips and bank/WPS files 🟡 (**the bank file is a plain CSV, not a bank's own SIF/WPS
layout, and a payslip is a table on screen with nothing printable**) · Payroll posting to
the ledger ✅ (09/09/2026)

**`hr.employees.salary` HAS EXISTED SINCE THE CATALOGUE WAS WRITTEN, LABELLED "See pay and
salary", AND NOTHING IN THIS PRODUCT STORED A SALARY.** The right reveals identity and
passport numbers — its own comment says so — so a studio granting somebody "see pay" got
passport numbers and no pay. Invariant 16 from the inside: a right naming something nothing
can exercise it against. Catalogue 193 → 200 across payroll and attendance.

**A PAY RECORD IS NOW AND A RUN IS A SNAPSHOT.** The run copies the amounts and freezes
them, so a rise next month cannot rewrite last month's payslip — the rule the approval
engine follows by storing the FX rate on the bill it routed. `hr.payroll` is NOT
`hr.employees.salary`: that one shows one person's record to somebody who may already read
it, this opens the whole company's wage bill, and it is deliberately unscoped because a
departmental slice of a run is a partial total nobody can reconcile against the ledger.

**UNPAID LEAVE IS PRO-RATED ON THE BASIC ALONE.** An allowance for a car does not stop
because somebody took a week unpaid, and doing it on the gross — the common shortcut —
silently docks the wrong amount. **A net below nought is reported, never clamped**, because
clamping forgives the difference and leaves the ledger short by exactly what nobody noticed.
Invariant 7 at the transition: the preparer never approves, whichever rights they hold.

**FINANCE POSTS, HR RECORDS.** `postPayroll` sits beside `postBill`, debiting Salaries for
the GROSS — posting the net understates the wage bill by exactly the deductions, which makes
payroll look like it fell in the month somebody took a loan. `2200 Payroll Payable` needs no
migration: the chart self-seeds missing codes on every read.

**AND THE SEAM WAS WRONG WHERE THE MODEL WAS RIGHT.** `money()` in `ledger.ts` means CENTS →
money, and the first draft used it as a rounder on totals already in money — dividing the
wage bill by a hundred into an entry of 35 against 33.02, refused as unbalanced.
`tests/crud.mjs` caught it on its first run, which is the whole argument for the end-to-end
case existing beside the pure one.

**ATTENDANCE IS DELIBERATELY NOT AN ENGINE REGISTER**, as this file said before it was
built: one row per person per day, so forty people write eight hundred rows a month, and the
engine's shape is wrong for something taken in one sweep. **A day nobody marked is NOT an
absence** — the sheet was not taken, and treating it as one would dock pay for a
supervisor's paperwork — and **a day nobody worked cannot carry hours**. Scoped where
payroll is not, because a supervisor marks their own team every morning.

**MANPOWER IS A DEMAND, NOT AN ASSIGNMENT.** It says a project wants four site engineers and
deliberately not which four; naming people would make it a roster, and the dispatch board
already is one for work that exists. Supply is counted from ROLES rather than a second list,
and short and spare are two fields because one is a hiring decision and the other a
reassignment.

**WHAT IS HONESTLY LEFT:** payroll takes its unpaid days from the VACATION register, not
from attendance, so an hourly employee still cannot be paid from recorded hours — the join
this was all meant to make possible is not made.

Three engine registers, 08/09/2026 — candidates, appraisals and training records. Each
carries the ending a real one needs: a candidate is Rejected (the company's decision) or
Withdrawn (theirs), because a register recording only "closed" cannot tell a studio it
keeps losing people at the offer stage; an appraisal goes back from Manager review to
Self-assessment; a training record returns from Expired to Completed, since a safety
ticket is renewed rather than re-earned. **Hiring a candidate creates no employee** and
**nothing warns before a ticket lapses** — both named rather than implied away.
(That paragraph closed with "attendance wants its own model" and "payroll is the largest
remaining piece". Both landed on 09/09/2026. The sentences are replaced rather than deleted,
because the reasoning in them is why each was built the way it was.)
The artifact's note here {M} *"a department IS a top-level section"* {M} **is reversed**:
departments are their own records under Administration as of 06/09/2026.

#### §13 Finance & Accounting ✅ 18 / 18
Cash ✅ · Ledger ✅ · Payables ✅ · Fixed assets ✅ · Settings ✅ · Payment as an
allocatable record ✅ · Retention & progress billing (IPC) ✅ · Budgets & commitment
control 🟡 (at project level only, not in the ledger) · Multi-currency 🟡 (daily FX and
rate-at-approval; no revaluation) · P&L and balance sheet 🟡 (both built 08/09/2026; **no
cash flow** — it needs operating/investing/financing classification nothing records) ·
Dimensions on every journal line ✅ (deal, project, cost code, department — carried,
cut by, and reconciling; 08/09/2026) · Credit notes ✅ (08/09/2026) · Periods & close ✅
(09/09/2026) · Tax engine & WHT ✅ (09/09/2026, **ZATCA deliberately dropped — see below**) ·
Bank reconciliation ✅ (09/09/2026) · Cash-flow forecast and PDCs ✅ (09/09/2026) · Letters of
guarantee & credit ✅ (09/09/2026) · Auto-posting from every module ✅ (08/09/2026)

**IT WAS THE LARGEST SINGLE BODY OF UNBUILT WORK IN THE PROGRAMME, and the five closed on
09/09/2026.** Catalogue 200 → 201 (`finance.ledger.close`); the other four mint nothing.

**THE LEDGER HAD NO SCREEN.** `finance-ledger` had no branch in `StudioFinance`'s view
switch and fell through to the CASH screen, so a studio granted `finance.ledger.view` opened
a page of INVOICES while the trial balance, the journal and both statements were computed by
a route nothing in the product called. Both halves were individually valid — a switch with
no case, a default returning a real screen — which is why nothing failed, and it is the
project `/costs` routing bug in a second place: **a section that silently renders the wrong
screen is how a right ends up exercising nothing** (invariant 16).

**AND `saveFinanceSettings` HAD NO CALLER**, complete since the module was written, so a
studio's cash categories were whatever the defaults said and could not be changed. The same
defect the five posting functions carried, found the same way — by needing one of them.

**THE PERIOD LOCK LIVES IN `postEntry`**, the one door every entry passes through, because a
check in each of the seven posting functions is seven chances to add an eighth without it.
It refuses the POSTING and not the document: rolling a late invoice into the next open
period would put September's revenue in November. A close is a LOCK, NOT A CHECKLIST — a
studio that cannot close until everything is perfect never closes — but it NAMES what is
dated in the month and unposted, which is what turns a button into a decision. Reopening is
allowed and RECORDED, because a period that can never be reopened turns one honest mistake
into a permanent wrong number; a reopening without a REASON is the one thing refused.

**WITHHOLDING SITS BESIDE THE TOTAL, NOT INSIDE IT.** VAT is added and WHT is deducted;
modelling one as a negative rate of the other produces an invoice for the wrong amount and a
receivable that never clears. The base is the SUBTOTAL — taxing the tax is wrong by exactly
the VAT rate, eight-tenths of a per cent on 16/5, small enough never to be noticed — and
`applies: false` is not `amount: 0`. The CERTIFICATE is the asset, so the reclaim list is
what to CHASE rather than what was withheld.

**NO ZATCA ADAPTER, AND THAT IS A DECISION.** This product is based in Jordan and sells
across the region as a generalist SME tool, so a Saudi e-invoicing adapter is a country
integration rather than a tax engine — building it now would be building for a market this
is not in. Recorded in the ledger at the end of this file.

**RECONCILIATION IS A PAIRING, NOT A CALCULATION**, and its three states are three different
problems: matched, on the statement and not in the books (the fix is a POSTING), and in the
books and not on the statement (the fix is usually TIME — calling it an error sends somebody
chasing a cheque in the post). NOTHING IS MATCHED AUTOMATICALLY: two payments of 500 in one
week are indistinguishable by amount, and an automatic pairing would reconcile the wrong two
and leave two real discrepancies cancelling out. The amounts must match EXACTLY, because a
tolerance would pair 500 with 499.50 and hide a bank charge of fifty pence.

**A CHEQUE REPLACES ITS INVOICE, IT DOES NOT ADD TO IT** — reading each document's
outstanding is what stops the forecast counting one receipt twice. Overdue money lands in
the first bucket rather than being dropped, the closing balance is cumulative because a net
positive week can still be the week the account goes under, and a null shortfall says only
that nothing in the horizon takes it under.

**`expired` IS NOT `released` ON A GUARANTEE, AND THE DIFFERENCE IS MONEY.** Expiry does not
return the margin; somebody has to ask for it back. A register conflating them would tell a
studio its cash was free while the bank still held it.

**AND `money()` IN `ledger.ts` MEANS CENTS → MONEY.** Payroll's first posting used it as a
rounder on totals already in money, dividing the wage bill by a hundred into an entry of 35
against 33.02 — refused as unbalanced, and caught by `tests/crud.mjs` on its first run. The
pure model was right and the seam was wrong, which is the argument for the end-to-end case
existing beside the pure one.

**CREDIT NOTES, 08/09/2026 — because an issued invoice is not editable and must not be.**
It has gone to a client and posted to the ledger, and a client holding INV-0007 for 1,200
must keep holding one. Until now a studio's only options were to cancel the whole invoice
(wrong when nine tenths of it was right) or edit it (wrong always) — `editInvoice` refuses
a Sent invoice by name, and this is what that refusal has been pointing at.

**No permission key.** A credit note is Cash's content the way a variation is a contract's,
so it answers to `finance.cash.*`. There is **no PUT and no DELETE**: an issued note has
posted and gone to a client, and editing one is the exact thing credit notes exist to stop
anybody doing to an invoice. A draft is cancelled; an issued one is corrected by another
note.

**The headroom is checked at RAISE and again at ISSUE.** Nothing stops a studio drafting
two full-value notes, and it is the second ISSUE that has to refuse — checking only at
create would let both through and take the receivable negative. A draft credits nothing and
reserves nothing, so an unfinished note can neither move the books nor block a real one.

**AND THE LIVE HALF FOUND A DOUBLE-POSTING BUG THAT THE PURE HALF COULD NOT.**
`postEntry` kept its own inline list of source kinds and `credit-note` was not on it: the
dispatcher accepted the kind, `postEntry` did not recognise it, fell back to `"manual"`,
and stored an entry whose source said manual. So `alreadyPosted` could never match — **the
same credit note would post again on every attempt**, reducing the receivable once more
each time, with nothing refusing it and no symptom but a journal full of manual entries
nobody had keyed. Two hand-written lists is what allowed it; `POSTABLE` derives itself from
`ENTRY_SOURCE_KINDS` now, and the suite asserts the two differ by exactly `manual`.

**It posts the exact reverse, proportionally.** Debit Revenue and VAT Payable, credit
Receivable, split at the INVOICE's own rate rather than today's — the tax being given back
is the tax that was charged. The net is derived by subtraction so the two always sum to the
gross; deriving both independently is how a rounded pair ends up a cent short and the entry
refuses to balance. `outstanding` is against the NET: 1,200 invoiced, 200 credited, 1,000
paid is SETTLED, and reporting 200 still due would chase money already given back.


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

#### §14 Reports & BI ✅ 6 / 6
Exported reports ✅ (08/09/2026) · Report builder ✅ (09/09/2026) · Saved reports ✅
(09/09/2026, **scheduling not built** — nothing runs a report on a timetable) · KPI targets
✅ (09/09/2026, **alerts not delivered** — a breached target is red on the screen and
notifies nobody) · Executive dashboard ✅ (09/09/2026) · Analytics ✅ (09/09/2026, **and
it was largely already built** — see below)

**THE BOARD IS THE ONE QUESTION NO SECTION DASHBOARD IN THIS PRODUCT CAN ANSWER.** Fourteen
sections have their own dashboard and nothing put them side by side; and every one of them
reports TODAY, so whether a figure MOVED could not be asked at all. Eight tiles, each
against the same length of time before it. `docs/functionality/executive-dashboard.md` is
the file.

**IT IS BUILT ON `modules/reports/datasets`, WHICH ALREADY EXISTED**, so it mints no second
list of where the numbers live — a tile naming its own collection would be free to disagree
with the export and the report builder about what "invoices" means. Four datasets joined
that catalogue because the board needed them (deals, quotations, purchase orders, leave),
which the export and the builder gain in the same change. No permission key.

**THE PREVIOUS WINDOW IS THE SAME LENGTH, NOT "LAST MONTH".** Comparing thirty days to
thirty-one reports a 3% fall that is the calendar rather than the company, and comparing a
part-finished month to a whole one reports a collapse every first of the month. And nothing
divides by nought: a period following one with no activity has NO percentage — the company
did not grow infinitely, it started — so `change` is null and the screen says so in words.
Both periods at nought is a different statement, and is flat.

**ANALYTICS WAS MARKED ⬜ AND WAS MOSTLY BUILT, which is the third stale claim this file has
carried.** `lib/dashboardWidgets` is a registry of gated widgets across eight dashboards,
`planOf` resolves a tier's master switch, its explicit per-widget selection and its
name-derived rung, and `useWidgetVisible` is the gate every dashboard already asks. What
was genuinely missing is that Reports & BI sat OUTSIDE it. It is the ninth section in the
registry now: **the figures are free** — a tile is a sum of records the reader can already
open, and charging for arithmetic somebody could do by hand is charging for nothing — and
**the analysis is sold**, `reports.movement` at the first paid rung and `reports.window`
one above it.

**THE GATE FAILS OPEN AND THAT CUTS BOTH WAYS.** A key the registry does not list answers
true, which is right for a widget added before it is registered and dangerous for one
removed: deleting `reports.movement` would silently make it free on every studio and
nothing else would notice. `tests/executive-model.mjs` is what notices.

**THE BUILDER IS BUILT ON THE EXPORT'S CATALOGUE AND MINTS NOTHING.** A report names a data
set, and a data set already declares its columns and the right its own section requires —
so a report cannot reach a field nobody published or a register the reader could not open,
and both gates come free. A saved report confers nothing: it is a QUESTION, and the answer
is computed against the reader's own access every time it runs, which is what makes a
shared report list safe.

**THE ROW-LOADING PATH IS SHARED WITH THE EXPORT, not copied.** Two copies would be two
places that resolve a section, ask the second gate, and know `total` is DERIVED — and the
day one gained a data set the other would export a column of blanks. Not hypothetical: the
empty Total column `DERIVE` exists to fix was exactly that.

**WHAT IT REFUSES TO SAY IS THE INTERESTING HALF.** A column with nothing numeric
aggregates to NULL rather than nought; `n` travels with every aggregate, because an average
over three of ten rows is a real average of a different population; an empty grouping value
is its own group rather than a dropped row; and a capped list says it was capped.

**A TARGET IS A SAVED REPORT PLUS A LINE**, reusing the builder rather than growing a
second query language — so there is exactly one definition of each number. **`unknown` is a
real state and it is NOT a breach**: a report that measured nothing this period is a sales
target with no closed deals yet, and calling that breached raises an alarm about an absence
of data while calling it met is the same mistake in the more dangerous direction. A reader
who cannot open the register sees `unknown` too. Deleting a report leaves its targets
`unknown` rather than cascading.

**THE TWO OUTSTANDING WERE NOT COUNTED AWAY, AND BOTH CLOSED ON 09/09/2026.** This
paragraph said "`useAnalyticsLevel` exists; nothing behind it does", and that was wrong
when it was written: `lib/dashboardWidgets` gates real widgets on eight dashboards through
it. What was true is that Reports & BI sat outside the registry. See §14's entry above.

**IT RENDERS NOW, and `NO_SCREEN_YET` IS EMPTY** — Reports & BI was the last entry. It is
the one section whose content is not records, so the first thing it does is the thing every
ERP buyer asks for on day one and nobody had: get the data out. Eight data sets, CSV,
columns DECLARED rather than discovered — an export that spread whatever the row held would
start carrying a field the day somebody added one.

**TWO GATES, AND BOTH ARE REAL.** Catalogue 181 → 182 (`reports.exports.view`). That right
opens the surface; each data set still asks the right its own section already required, so
exporting invoices needs `reports.exports.view` AND `finance.cash.view`. Asserted from both
directions in `tests/crud.mjs`: the export right alone reaches no register, and a section
right alone confers no export. Reading your own work and downloading the whole collection
are different powers, and a studio can now say so.

**A SERVER COMPONENT, deliberately.** An export is a LINK, not a fetch — and the repo's
lint budget is at 141 of 142, where 89 of those warnings are the fetch-on-mount pattern
every other panel uses. This screen added none.

**TWO DEFECTS FOUND BY OPENING IT.** `total` is DERIVED and never stored, so the first
export produced an empty Total column on every line — worse than not offering the column, because
a spreadsheet of invoices with no amounts reads as a broken export rather than as missing
data. And the UTF-8 BOM had to be verified by BYTES: `Response.text()` strips a leading BOM
per spec, so the first check said it was absent when it was there. Excel on Windows reads a
UTF-8 CSV as the system codepage without one, which matters for a product whose studios are
largely Arabic.

#### §15 Administration & Settings ✅ 10 / 10
People ✅ · Access ✅ · Studio settings ✅ · Master data ✅ (eight tabs) · Numbering series ✅
(08/09/2026) · Currencies and units of measure ✅ (09/09/2026) · Cost codes ✅ (09/09/2026) ·
Categories and industry taxonomy ✅ (09/09/2026) · Flow templates ✅ (**already built** — see
below) · Integrations & API ✅ (09/09/2026, **API keys only; no webhooks**) · Notification
templates & print formats ✅ (09/09/2026, **notification wording only; no print formats**)

**THE COST CODE LIBRARY IS THE STUDIO'S STANDARD BREAKDOWN.** Every project invented its
own — one job called it "Earthworks", the next "EW" — and nothing was wrong with any single
project while the studio still could not ask what it spends on earthworks, because that
compares codes ACROSS projects. A code is COPIED into a budget, never referenced, so
editing the library re-prices nothing and deleting a row breaks no running job; which is
why the format is strict, since matching is a string comparison and a trailing space makes
two codes that look identical and never add up. Its drift report is the point of it, and it
is deliberately not a refusal. `administration.master.*`, no new key.

**SIX CLOSED LISTS WERE HARD-CODED IN FIVE MODULES.** Thirty-four industries with no room
for "Freight forwarding"; five leave types with no study leave; four location kinds, so a
hospital group filing "Ward" got "Site". And every service silently replaced what it did
not recognise — the record saved, looked right and was wrong. The defaults MOVED into
`administration/taxonomy` rather than being copied, the units precedent, so there is one
list per axis. No new key: it rides on `administration.settings`.

**FLOW TEMPLATES WERE MARKED ⬜ AND WERE FULLY BUILT** — store, model, service, route and an
editor in Studio settings, seven templates with stage counts, billing triggers, usage
counts, duplicate and revert, and twenty-five industries each mapped to a default. Verified
by opening it rather than by reading the code. **That is the second stale ⬜ in this file
and the third stale claim found this session**; the pattern is worth more than the
correction.

**API KEYS ARE AN AUTHENTICATION PATH, so they live in `platform/auth`.** A key names a
COLLABORATOR and the request then runs the identical path a browser request runs — same
context, same membership, same `effectivePermissions`. What it adds is a NARROWING, and
`effectiveScopes` is the whole security model: scopes are checked against the creator's
rights at minting, and that check is worthless alone because rights SHRINK, so a key may do
the INTERSECTION of its scopes with what its owner may do RIGHT NOW.

**AND THE NARROWING HAD TO MOVE, which is the finding worth keeping.** The first version
narrowed AFTER the module context was built — `{ ...context, access: scoped }` — and it was
wrong in a way that looked right: `canManage`, `nav`, `manage` and every per-block flag are
DERIVED inside the builder, so a key holding one HR permission received a payload computed
as if it were the owner. 91 of 91 nav entries, `canManage: true`. Nothing failed; the
response was simply the wrong one. It is invariant 3's "no route re-derives it" from the
other side, and it was found by issuing a key and reading what came back.

**A NOTIFICATION IS A TOKEN PLUS ITS FACTS NOW, and the words are chosen on DISPLAY.** Nine
call sites handed `notifyCollaborators` an English literal, so an Arabic studio's bell was
entirely English and no studio could change a word. Fifteen templates in both languages,
overridable per language. Every row written before this still reads: they hold a literal and
no params, and `renderNotice` returns exactly that. **Print formats are NOT built** — a
document prints through the browser's own stylesheet with no per-studio header or terms.
**NINETEEN CALL SITES MINTED A REFERENCE AND EVERY PREFIX WAS A STRING LITERAL.** A studio
whose invoices have always been "SI" got "INV", and there was no screen, no setting and no
way round it — the numbering series every ERP buyer asks about first. All of them go
through `nextReference`, which is what made this one change rather than nineteen: sixteen
series are configurable now, on a third Master data tab, stored on the studio record beside
`currency` and the approval chains. (**Seventeen, measured** —
`grep 'key: "' numbering.ts` — this said sixteen from the day it was written. Quotations
are not among them: Technical has carried its own per-sequence numbering since before this
existed, and folding it in is a migration rather than a tab.)

**A RENAME STARTS A NEW SEQUENCE AND RENUMBERS NOTHING**, which is what makes it safe to
offer at all. `bumpCounter` is keyed on the prefix, so documents already issued keep the
name they were issued under and the new prefix begins at its own first number. Proven in
the sandbox both ways: INV-0001, INV-0002 → rename → SI-000500, SI-000501 → rename back →
**INV-0003, INV-0004**, resuming past the old high-water mark rather than reissuing
INV-0001. Six references, all distinct. Invariant 10.

**THE FIRST DRAFT OF THE CATALOGUE WOULD HAVE RENAMED DOCUMENTS ON DEPLOY.** It guessed
"RFQ" and "SR" where the product actually mints SRQ and DSR — and a studio that has set
nothing falls back to whatever the catalogue says, so every existing studio's requests for
quotation and site reports would have changed prefix silently. No test could catch that;
reading the nineteen call sites did, and the note in `numbering.ts` says to do it again
when a series is added.

**A PREFIX IS REFUSED, NOT COERCED.** A hyphen inside one makes `highestIssued` parse every
existing reference as nought and the next create reissue a number a client already holds —
invariant 10 broken by a punctuation mark — so the rules live in a pure module the screen
and the server both refuse on, and the studio hears about its own edit in words about the
edit. Two series may not share a prefix either: the numbers would be correct (one counter,
nothing reissued) and interleaved so nobody could use them.

**`UNITS` WAS EIGHT STRINGS IN INVENTORY AND `createItem` SILENTLY REPLACED ANYTHING
ELSE WITH THE FIRST OF THEM.** So a merchant selling cement in bags got "pcs", a stockist
counting tonnes got "pcs", and neither was told — the item saved and looked right. That is
worse than a refusal, and it is the same defect the numbering series had one register
along: a compile-time list standing in for a studio's own reference data.
`modules/administration/units` is the registry, the shape numbering already uses, and it
is the fourth Master data tab.

**THE DEFAULTS ARE NEVER REMOVABLE**, which is what makes adding safe. Taking one out
would orphan every item already measured in it, and an item whose unit is not offered
cannot be edited without changing something nobody meant to change. A shipped default
therefore has no remove button — absent rather than disabled, because a control that is
always refused should not be drawn — and only the studio's ADDITIONS are stored, so a
later change to a default still reaches every studio.

**REFUSED ON WRITE WITH EVERY REASON NAMED.** No commas or quotes, because the item list
exports as CSV and a comma inside a unit breaks the row; internal spaces are fine, since
"sq ft" is a unit; and case-insensitively unique, because "Kg" beside "kg" is a choice
nobody can make correctly and then divides every grouping in half. Proven in the sandbox
end to end: "bag" added, saved, offered by the item form, and an item created holding it,
while `furlong` still coerced to `pcs` and three bad lists refused by name.

**CURRENCIES ARE THE OTHER HALF OF THAT BULLET AND WERE NOT MOVED.** A studio's base
currency, its favourites and the daily FX table have worked in Studio settings since P2's
approval engine needed them. Moving a working screen onto this one is a visibility
decision each time, and there is nothing to add: the bullet is closed where the two halves
actually live rather than by relocating one of them.

The artifact's footer {M} *"all four of its keys sit in `NO_SCREEN_YET`… hardcoded standalone
entries"* {M} **is reversed**: the fold landed 03/09/2026 and Administration is an ordinary
gated section.

#### Where that leaves the programme

| | Built | Target | |
|---|---|---|---|
| Every subsection built | **15 sections — all of them** | CRM & Sales, Tendering, Projects, Engineering, Procurement, Inventory, Manufacturing, Field Service, Logistics, Assets, Quality & HSE, Human Resources, Finance & Accounting, Reports & BI, Administration & Settings | |
| Partial | none | | |
| Renders nothing | 0 sections | `NO_SCREEN_YET` is empty | |
| **Subsections** | **132 built** | **132 in the target list** | **100%** |

**THE ROW ABOVE SAID 58 / 130 / 45% AND THE THREE ROWS ABOVE IT WERE A SNAPSHOT OF A
DIFFERENT FORTNIGHT** — four sections rendering nothing, Logistics and HR at one
subsection each, Assets and Quality not counted as built at all. Every figure here is the
sum of the fifteen §-headings above it, re-added at this commit rather than carried
forward; when one of those moves, this moves in the same edit or it is wrong again.

**THERE IS NO GAP LEFT IN THE SUBSECTION LIST — 132 of 132, 09/09/2026.** That is a count
of subsections that RENDER and are reachable, not a claim that each is finished: every
functionality file's "Not built yet" still stands, and several of the last seven shipped
with a named half missing — no webhooks beside the API keys, no print formats beside the
notification wording, no scheduling on a saved report, no alert on a breached target. The
honest summary is that every section now has every subsection the programme named, and the
depth inside them is what the wave plan is for.

**TWO OF THE LAST SEVEN TURNED OUT TO BE ALREADY BUILT** — flow templates entirely, and
analytics substantially. Both were marked ⬜ here. A ⬜ is a claim like any other figure in
this file and decays the same way; the rule at the top of CLAUDE.md — treat every figure as
a measurement with a date — applies to the checkboxes too.

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
| **Administration master data** | 🟡 Locations, Departments, numbering series and units of measure built; currencies live in Studio settings; cost codes, categories, industry taxonomy pending |
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

---

## Decision ledger — 09/09/2026

Rows are never removed. A decision nobody can see is a decision that gets argued again.

| Decision | State | What it means |
|---|---|---|
| **Administration & Settings is not a section** | ✅ DONE | The owner's instruction: it carries system settings and adds nothing as a department. Fourteen sections now. Its four screens (People, Access, Master data, Studio settings) moved to a **Settings surface** at `/<slug>/settings`, reached from the sidebar footer. Absent from the nav tree, from `liveDepartments`, from `/platform`'s copy and from Nova's product description. |
| **…and its section ROWS stay** | ✅ DONE | `administration-master` owns `locations`, `departments`, `costCodeLibrary`; `administration-settings` owns `recordTypes`; seven modules resolve them as foreign sections. Deleting the rows would strand live tenant data and fail nothing. `SYSTEM_SECTION_KEYS`/`isSystemSection` is the seam; `testAdministrationIsNotASectionButItsRowsSurvive` asserts the collections did not move. **No migration ran.** |
| **Finance › Settings had no screen** | ✅ FIXED | The nav row fell through to the **Cash** screen — a studio granted `finance.settings.view` opened a page of invoices — while `saveFinanceSettings` had no caller anywhere in the product, complete and validated since the module was written. `FinanceSettingsPanel` is the screen: cash categories and withholding rules, both languages. |
| **`assets.utilisation` had no screen** | ✅ FIXED | Route, module and refusal rules all complete; nothing in the product fetched them, so plant could be allocated only by calling the API by hand and the equipment register's `hireRate` had never been read. `StudioPlantAllocation` is the screen, and it is the Assets root now, with the engine registers kept below it. `listAllocations` gained the fleet's names so the report stops speaking in ids. |
| **The record engine's register was table-only** | ✅ FIXED | One generic screen renders **31 built-in types** across five sections, and it had no search, filter, sort, paging or export. All five added, client-side over the type's own record set, with the reasoning for when that stops being right written into the file. Export is CSV with a BOM, and exports what is **filtered**, not what is paged. |
| **"No starter role holds an engine right"** | ❌ WAS STALE | Measured: **zero** of the 91 section keys a seeded studio holds is unreachable by all eleven archetypes. The claim in CLAUDE.md was true when written and had stopped being true. The guard CLAUDE.md kept asking for by name now exists — `testEverySectionWithAScreenIsReachableBySomeSeededRole`, a shrink-only count, measured against a real studio's key list **plus the stored parent map** (without it `quality-hse` reads as unreachable and is not). |
| **Quality & HSE has no catalogue area** | ⬜ NOT A DEFECT | Flagged as one, then withdrawn on reading the code. Its eight registers carry structural `engine.*` rights and the safety panel's two halves are gated already (`engine.incident.view`, `projects.list.view`); the route says so and gives the reason. A third right over records two others govern would be free to disagree with both. |
| **`logistics.landedCost` and `inventory/valuation` have no screen** | ⬜ OPEN | Same shape as the two fixed above — complete route and module, no component fetches either. Not built in this pass. |
| **Field Operations' root is still the un-split Operations screen** | ⬜ OPEN | Locations and permits moved in the data (`COLLECTION_MOVES`); the screen that renders them did not follow. |

| **A studio says what it does at creation** | ✅ DONE | The trade was asked for in Studio settings, AFTER the fact, so a studio's first hour was spent in a product that knew nothing about the company. `createStudio` takes it now. Verified: a contractor stores the trade, seeds 12 service actions (exactly its matrix row) and 14 departments — Estimation & Tendering, Site Execution, Civil Works, MEP… — where before it got only the universal back office. Declining stays a real answer and gates nothing. |
| **The two industry lists become one** | ✅ FIXED | `INDUSTRIES` keys by slug and picks a deal's flow template; `FIELD_ACTION_MATRIX` keys by display name and is what a studio STORES. Same twenty-five trades, four spelled differently, **joined by nothing** — so a studio's own trade could not be resolved to its own flow and every deal silently fell back to Template A. `IndustryEntry.field` is the join, held 1:1 both ways by `testTheTwoIndustryListsAreOneList`. |
| **Sections are gated by trade** | ✅ DONE | Every studio was shown all fourteen whatever it does. `shared/tradeSections` joins the owner's Section × Action matrix with the trade's own flow stages. 8–14 sections, mean 11.8, twenty of twenty-five switching something off; a contractor still gets all fourteen. **Every row is still written** — only `enabled` changes, because not planting a section strands the rows written under it. |
| **…and the matrix needed one correction to be usable** | ⬜ RECORDED | Joined naively — a section is on if ANY of its actions match — it switched **Sales off for contractors and manufacturers** (CRM covers one action in the sheet) and gave a bank Manufacturing (Testing & Inspection is covered by three sections). Thirteen of fourteen on for almost every trade: the same as no gating. So each action resolves to ONE primary section. The owner corrected two: Training is HR's, Consulting & Advisory is Projects'. |
| **An engine register follows its section** | ✅ FIXED | `plantTypeSection` hardcoded `enabled: true` and runs AFTER the section array is written, so a consultancy came out with Manufacturing off and its four registers on — and StudioFrame promotes a visible child whose parent is hidden, so they would have appeared loose at the top of the nav. Eighteen such rows, found by reading the seeded studio back rather than by any test. |
| **A record can name another record** | ✅ FIXED | `reference` was a declared field kind with a `refType` since the engine shipped and **nothing ever read it** — the register drew a hand-typed id in a text box. Resolved server-side, one read per referenced type, **gated on the reader's own right over the target** so a link cannot leak a register they were refused. Three answers, three facts: found, deleted, not yours to open. Four registers now name what they are about. |
| **A rejected test raises the nonconformance** | ✅ DONE | The blueprint's own words for the inspection register. `platform/engine/rules`: a trigger, an action, and fifteen refusals — each one a rule that would otherwise fail SILENTLY (`"Reject"` for `"Rejected"` looks exactly like a register nobody has tripped). Fires on ARRIVAL, never on presence; a second arrival raises nothing while the first consequence exists. Verified: NCR-0001 carrying the inspector's own findings, linked to TES-0001. |
| **A rule runs with the STUDIO's authority** | ⬜ RECORDED | The inspector who rejects a test holds `engine.testreport.edit` and not `engine.ncr.create`; requiring the actor's right would mean the rule never fires for the people who trigger it. The escalation closes at the other door — declaring a rule must require the right to create where it creates — and **there is no such door yet**, because `Types.create` has one caller. `ruleProblem` is where that refusal goes when the type editor lands. |
| **A changed declaration reaches studios that have the type** | ✅ FIXED | `seedBuiltinTypes` skips by key, which was the whole story while a declaration never changed after shipping. It changed today, so every existing studio would have gone without the new fields and the rule, silently, for ever. `reconcileBuiltinTypes` compares the `version` that has been on the schema all along and nothing read. Verified against a studio aged back to v1. **Not run against live.** |
| **Time-based rules** | ⬜ OPEN | "Certificates with expiry alerts" needs something that runs when nothing happened. It belongs with `cron/daily-notices`, beside `expiringPermitNotices`, which already does exactly this shape against `EXPIRING_MILESTONES` with the milestone as the dedupe. A fifth producer, not new machinery. |
| **Per-studio rule and type authoring** | ⬜ OPEN | No route. `Types.create` has one caller and there is no update path, so a studio cannot declare a type or a rule of its own. `typeProblem` and `ruleProblem` are both written and waiting for that door. |
| **Offering the trade gate to EXISTING studios** | ⬜ OPEN | The gate runs only in `createStudio`. Existing studios get nothing automatically, deliberately: `enabled: false` deletes no data, but a section vanishing overnight is a support ticket rather than gratitude. The right shape is the one departments already use — offer what the trade suggests, apply nothing. |

**How the API-only routes were found**, because the method is the reusable part: sweep every
`src/app/api/studios/[slug]/**/route.ts` off disk and ask which component fetches each path.
A route with no caller fails nothing — `tsc` is happy, the route answers correctly to
anybody who asks, and the only symptom is a right on the access grid that cannot be
exercised (invariant 16, from the screen end rather than the catalogue end). Four turned up;
two are fixed here and two are listed above.


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
