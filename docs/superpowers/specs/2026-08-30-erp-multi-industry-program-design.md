# The multi-industry ERP program — design

**Date:** 30/08/2026 · **Status:** approved in brainstorming, awaiting spec review
**Source documents:** `ERP_Master_Blueprint.md` (v1.0, 30 Aug 2026) and
`ERP_System_Blueprint.xlsx` (Overview · ERP Sections · Subsections · Section × Action Coverage).

This spec converts the blueprint into a program this codebase can execute. The blueprint
is the *what*; this is the *how*, against what is actually built today. Where the two
disagree about naming, the codebase's names win (engagement = deal, studio = tenant),
exactly as the blueprint's §6 instructs.

---

## 1 — Decisions taken

Every one of these was answered by the owner during brainstorming on 30/08/2026. They are
recorded here because each closes a question that would otherwise be re-litigated, and
several are expensive to reverse.

| # | Decision | Consequence |
|---|---|---|
| D1 | **Full blueprint scope.** All 15 sections, all 95 subsections, all 7 templates. No pilot cut. | ~62–68 weeks of sequential work. Timeline is the dependent variable; scope is fixed. |
| D2 | **Template A (Contracting / Project) first.** | Build order is A-shaped; B–G activate later off the same container. |
| D3 | **Engine before surface.** | Nothing new appears in the nav until the deal container is real. |
| D4 | **Full 15-section restructure**, not additive, and **done in full BEFORE the store swap** as its own phase (P0). | Section keys change and permission keys remap. Records are NOT rewritten by a rename — they carry `sectionId`, a ULID on the section row — so only the twelve collections that change owner have their `sectionId` reassigned. The expensive half is the permission keys, which roles store as literal strings: see P0's plan. Sequencing it ahead of P1 is what keeps "goldens byte-identical" a true pass condition for the migration — see §3.3. |
| D5 | **Finance is statutory and jurisdiction-neutral**, worldwide, with country adapters (ZATCA first). | A configurable tax engine, not a Saudi tax module. |
| D6 | **Cloud SQL for PostgreSQL 18**, pulled forward *before* Finance. Everything moves to SQL; Redis becomes cache, pub/sub and the event stream only. | `CLAUDE.md`'s "SQL Server next" is superseded and corrected in the same commit as P1. |
| D7 | **Only test/demo studios hold live data.** | Migration needs an export and a proof, not a zero-downtime dual-read window. |
| D8 | **One company per tenant.** Branch is a reporting dimension, not a legal entity. | One base currency per tenant, one tax registration. Group structures buy two subscriptions. |
| D9 | **Tenant flow editor ships with the product**, not after. | §2.6 of the blueprint is in scope, including checkpoint stages. |
| D10 | **Attachments via Vercel Blob** — create the store, ship the already-tested media work. | Unblocks site photos, PODs, drawings, signatures. Half a week, not a build. |
| D11 | **Timesheets and payroll both in scope.** | Law 7 needs timesheets; payroll is a section-sized build scheduled in P6. |
| D12 | **No package gating.** Everything included, priced by headcount. | No per-section entitlement plumbing anywhere in the program. |
| D13 | **Record engine extracted after the first four hand-built sections**, then drives ~50 registers. | The abstraction is generalised from real screens, never guessed. |
| D14 | **Approval-workflow engine built in P2**, not P7. | Eight documents across five phases share one implementation. |
| D15 | **Solo + Claude, strictly sequential.** | One plan, one track, each phase verified before the next begins. |

---

## 2 — Where the product actually stands

Measured against the blueprint's 15 sections, roughly **28% of the surface exists** — but it
is the expensive 28%: multi-tenancy, a 102-key permission model, real-time, audit, atomic
writes, and the first two phases of the engagement spine.

**Section coverage today:** CRM & Sales ~30% · Tendering 0% · Projects ~35% · Engineering &
Documents ~40% · Procurement ~25% (inside Inventory) · Inventory ~65% · Manufacturing 0% ·
Field Service ~15% · Logistics ~20% (AWB only) · Assets ~20% (financial only) · Quality &
HSE ~12% (documents only) · HR ~20% (no timesheets, no payroll) · Finance ~35% · Reports &
BI ~25% · Administration ~45%.

**The engine gap is larger than the surface gap.** Against the blueprint's eight laws:

- **Law 1 (one container)** — satisfied. `platform/engagement/` exists.
- **Law 2 (flow is data)** — *absent*. No templates, no template store, no industry
  taxonomy. `STAGE_REGISTRY` is a hardcoded list of 14 entries and the flow is implicit in
  code. Thirteen of those are blueprint types; the fourteenth is `overtime`, which the
  blueprint replaces with the wider `timesheet`. The target vocabulary is 19.
- **Law 3 (entry at any point)** — *partial and incorrect*. Identity is derived from a
  record chain. The blueprint requires that to become a lookup helper only, with an alias
  table, so a deal is never re-rooted when an earlier-stage record arrives later.
- **Law 4 (facts owned once)** — *partial*. Live-context is specified; the nine-fact context
  object with the contribution rule and precedence order is not built.
- **Law 5 (status derived)** — *absent*. No `statusChain`; status comes off record fields.
- **Law 6 (money append-only)** — *partial*. Invoice numbers survive deletes and the ledger
  is post/reverse only, both correct. But `payment` is an embedded array rather than a
  record, so it cannot be allocated across documents, cannot be a `keep` type, and cannot
  be reported on.
- **Law 7 (cost completeness)** — *absent, and it is the most serious gap in the product*.
  Labour is captured as `overtimes` only; normal hours are nowhere. There is no equipment
  usage cost and no unassigned pen. **Every profit figure the product currently displays is
  fiction by the blueprint's own standard.**
- **Law 8 (recurring = long-lived deal)** — *partial*. SLA carries visit allowances; there is
  no `contract` entity, no schedule-generated jobs, no renewal.

**Six stage types are missing** — `contract`, `job`, `timesheet`, `inspection`,
`change_order`, `payment` — and they are precisely the types templates B, D, E, F and G are
built out of. The registry today supports Template A, partially.

---

## 3 — Target architecture

### 3.1 Store

**Cloud SQL for PostgreSQL 18** becomes the store of record. (If 18 is not GA on Cloud SQL in
the chosen region, 17 is the fallback — nothing in this program depends on an 18-only
feature.)

Schema rules, pinned because violating any of them is expensive later:

- UTF8 encoding, ICU collation.
- **All money `NUMERIC(19,4)`. No floating point anywhere, ever.**
- `tenant_id` leads every primary and secondary index. It is the tenancy boundary made
  physical, not a filter.
- **`json` — NOT `jsonb` — for stored row payloads.** This was corrected while planning P1
  and it is not a preference. `jsonb` normalises key order (by length, then bytewise), and
  this product's golden responses pin key order: `addRow` writes `id` before the spread
  precisely because `JSON.stringify` emits insertion order, and moving that one line once
  failed 34 goldens. `jsonb` would fail them on every row, silently and permanently. `json`
  is text-faithful. The cost is no GIN index, which is not a real cost — every query this
  product makes filters on a named field, and an expression index on `payload->>'field'`
  works on `json` and serves exactly the vocabulary `repo.ts` already declares.
- **`jsonb` remains correct for bags nothing round-trips into a pinned response** — flow
  template definitions, section settings. The rule is: if it is serialised back to a client,
  it is `json`.
- Postgres is still the right choice over MySQL for the reason that survives the above:
  document-shaped records port largely as-is, and expression indexes, partial indexes and
  transactional DDL have no MySQL equivalent.
- Existing ULID string IDs are preserved unchanged. New tables with no legacy id may use
  native `uuidv7()`.
- Every table carries `created_at`, `updated_at`, `created_by_collaborator_id` and
  `row_version`. **`row_version` is how invariant 8 survives the move** — optimistic
  concurrency replaces the `editArr`/`editJSON` compare-and-set, and the function patch in
  `updateRow` becomes a conditional UPDATE guarded on the version.
- **Transactional DDL** is load-bearing for P1: schema creation and the bulk load either
  land entirely or roll back entirely, so a failed migration leaves nothing half-built.
- **Row-level security on `tenant_id`, as defence in depth only.** Access is still resolved
  once in `effectivePermissions` (invariant 3). RLS exists so that a forgotten tenant
  predicate is a database error rather than a cross-tenant leak.
- Partial and expression indexes where the query shapes want them.

**What Redis keeps:** the event stream (XADD strictly before publish — invariants 12–14
unchanged), pub/sub fan-out, the request-scoped cache, sessions, rate limits and
idempotency keys. It stops being a store of record.

**Connection pooling is a design item, not an afterthought.** Vercel's serverless runtime
plus Cloud SQL requires a pooler (PgBouncer in transaction mode, or the Cloud SQL connector
with a pooled configuration). Transaction-mode pooling constrains prepared statements and
session state, so the repository implementation is written for it from the first line
rather than discovered under load.

### 3.2 The seam that makes this affordable

Wave 2's Seam B already put **every** module behind `repo<T>(collection)` — zero direct
`readCol` in service code, across all 13 modules. Swapping Redis for Postgres is therefore
principally **one new implementation of one existing interface**, not thirteen module
rewrites. This single fact is what makes D6 a five-week phase instead of a five-month one.

### 3.3 The verification contract, restated for SQL

- **The 139 golden responses must come out byte-identical through P1.** They are the
  instrument that proves a store swap changed no behaviour. If a golden moves during P1,
  the migration is wrong — not the golden.
- **This is exactly why P0 exists.** Renamed section keys appear in response payloads, so a
  restructure bundled into P1 would change goldens *and* change the store at once, and the
  detector would be gone. P0 re-records the goldens deliberately, in its own commit, with a
  stated reason — and P1 then has a clean baseline it must not move. Further deliberate
  re-recording happens only in P2/P3, where response shapes genuinely change.
- **Hop counting becomes query counting.** The existing ceiling discipline is preserved:
  a route regressing from 2 statements to 8 fails the build.
- `npm test`, `tsc --noEmit`, `tsc --noEmit -p tsconfig.strict.json`, `next build` and the
  bundle budget stay green at every phase boundary.
- Each functionality ships its `docs/functionality/*.md` file in the same commit, ending in
  "Not built yet" for what remains — per the project's own rule.

---

## 4 — The phases

### P0 — The restructure (≈2 weeks)

The 12 → 15 section move, in full, on the current Redis store. Done first and alone (D4),
for the reason §3.3 gives: it is the only phase allowed to move the goldens, so P1 inherits
a clean baseline.

**The section map.** Records carry `sectionId` — a ULID on the section row — not the section
key, so **a rename touches no record**; it is one field per studio. What does rewrite records
is the twelve collections that change owner. And the genuinely dangerous half is neither:
roles store permission keys as literal strings and `cleanPermissions` drops what it does not
recognise, so the rename must be preceded by an alias in `effectivePermissions` or every
studio silently loses every grant and default deny locks it out with nothing logged.

Nine sections keep their key and change only their label; six are new;
five bodies of existing data move to a different owner. Main and Tasks survive alongside the
blueprint's fifteen — Main is the home surface and Tasks is a cross-cutting control, and
neither is a blueprint section.

| Today | Becomes | Note |
|---|---|---|
| `main` | Main | Unchanged. Not a blueprint section. |
| `sales` | **CRM & Sales** (`crm-sales`) | Gains Quotations. |
| — | **Tendering & Estimating** (`tendering`) | New. |
| `technical` | **Engineering & Documents** (`engineering-docs`) | Keeps RFQ; gains the document register. |
| `projects` | **Projects** (`projects`) | Key unchanged; gains the planner. |
| — | **Procurement & Subcontracting** (`procurement`) | New. Receives orders/vendors from Inventory. |
| `inventory` | **Inventory & Warehouse** (`inventory`) | Key unchanged, label widens. |
| — | **Manufacturing & Production** (`manufacturing`) | New, empty until P6. |
| `operations` | **Field Operations & Service** (`field-service`) | Operations splits; keeps schedule and tracking. |
| — | **Logistics & Fleet** (`logistics`) | New. Receives AWB. |
| — | **Assets & Equipment** (`assets`) | New. Operational register beside Finance's fixed assets. |
| `quality` | **Quality & HSE** (`quality-hse`) | Loses documents, gains inspections/NCR/HSE in P5. |
| `hr` | **Human Resources** (`hr`) | Key unchanged. |
| `finance` | **Finance & Accounting** (`finance`) | Key unchanged. Keeps Fixed Assets as the financial face. |
| — | **Reports & BI** (`reports`) | New, empty until P7. |
| People / Access | **Administration & Settings** (`administration`) | Absorbs members, roles, master data. |
| `tasks` | Tasks | Unchanged. Not a blueprint section. |

**The five data moves** — these carry records, not just labels, and are the risk in P0:

1. `technical-quotations` → **CRM & Sales**. The blueprint puts Quotations in §3.1; Tendering
   contributes the BOQ face of the same record.
2. `technical-rfq` stays in **Engineering & Documents** — it is the internal
   Sales→Technical request, distinct from the *supplier* RFQ that Procurement gets in P4a.
3. `quality-documents` → **Engineering & Documents**. The controlled-document register is
   §3.4's, not §3.11's. Quality & HSE keeps inspections, NCR, audits, incidents and permits.
4. `inventory-awb` → **Logistics & Fleet**.
5. `operations-planner` → **Projects** (it is project scheduling); `operations` permits →
   **Quality & HSE** (permits to work); `operations` locations → **Administration** master
   data.

**Also in P0:** the permission catalogue remaps its ~102 keys onto the new section keys in
the same commit; the nav renders the new tree; **the Arabic copy is written for every new and
renamed section** (`src/shared/studio/`, one module per surface — no barrel); goldens are
re-recorded in their own commit with the reason stated.

**Procedure** — per invariant 17, twice-confirmed before it runs: export first, rewrite by
explicit key map, re-scan to prove the result. Never a broad-prefix operation.

**Acceptance:** every suite green; no record left pointing at a retired section key; the
permission matrix test passes on the new keys; goldens re-recorded once, deliberately, and
stable thereafter.

### P1 — Foundation (≈5 weeks)

The store swap, and nothing else. Postgres schema, the repository implementation, the full
data migration.

- Schema for every existing collection, per §3.1's rules.
- `repo<T>` implemented over Postgres; the Redis implementation retires from the write path.
- RLS policies, pooling, and the query-count harness replacing hop counting.
- Vercel Blob store created; the coded media work ships (D10).
- `CLAUDE.md` corrected: PostgreSQL 18, not SQL Server.

**Migration procedure** — per invariant 17, and twice-confirmed before it runs: export
first, load by explicit collection list inside a transaction, re-scan to prove the result.
Never a broad-prefix operation.

**Acceptance:** all 139 goldens **byte-identical** to the P0 baseline; query counts within
ceilings; every suite green.

### P2 — Engine (≈8.5 weeks)

The deal container per the eight laws, plus the approval engine (D14).

- `industries` (25 rows) and `flow_templates` (7 built-ins, tenant-clonable) as **stored,
  editable data** — Law 2. Adding an industry becomes a row, not a release.
- `deals`: permanent id minted by the first record, `template_id`, `industry_id`, and the
  **nine context facts** with the contribution rule and precedence
  `explicit edit > intent > execution > commitment`, every overwrite audited (Law 4).
- `deal_aliases`: today's deterministic derived ids become **lookup helpers only**, so a
  deal is never re-rooted when an earlier-stage record arrives late (Law 3). This is a
  direct correction to the shipped Phase 1b behaviour and is delivered as a compatibility
  layer, not a rewrite of the dual-writes already on `main`.
- `deal_members`: explicit membership replacing derived clustering; cardinality and
  `onDelete` enforced from the registry, per template.
- **No status column** — derived at read from `statusChain` (Law 5).
- The unassigned pen and promotion, so no cost record exists silently outside the system
  (Law 7).
- Template-driven deal screen: stage cards in template order, missing-stage **invitations**
  (never validation errors — the flow alerts, it never blocks), and the withheld-vs-empty
  distinction held absolutely: a withheld stage is **absent from the payload**, an empty one
  is `present: false`. The two must never look alike (§2.8).
- **Tenant flow editor** (D9): clone, reorder, add and remove vocabulary stages, insert
  named **checkpoint** stages backed by `task`, edit heads, status chain and billing
  trigger. Validation blocks only referential breakage; everything else warns.
- **The six new stage types**, in Template-A order of need: `contract` → `timesheet` →
  `change_order` → `inspection` → `payment` → `job`.
- **`timesheet` is the most important record in this phase.** Normal *and* overtime hours,
  per-employee overtime ratio, existing `overtimes` migrated in as entries, all capture
  paths writing one record, per-employee summaries as read-time views. Until it exists,
  Law 7 is unmet and no profit figure in the product is defensible.
- **Approval-workflow engine**: configurable chains with value limits per document type,
  reviewer ≠ approver enforced at the transition (invariant 7), `escalates()` semantics
  reused, generalised from the working quality-document review chain.

**Acceptance:** creating a project first and adding a ticket after yields ONE deal with the
same id and the ticket attached; no path duplicates a deal; a viewer lacking a stage's
permission gets no trace of it; status changes when and only when the leading present
stage's own status changes; a tenant can clone a template, reorder it, insert a checkpoint,
and subset validation holds.

### P3 — Money (≈7 weeks)

Statutory, jurisdiction-neutral, on SQL — which is why it follows P1 and not P2.

- **`payment` as a first-class allocatable record**, not an embedded array (Law 6).
- **Dimensions on every journal line**: deal, cost code, branch, department. This is what
  makes deal profitability reconcile to the ledger.
- **Periods and close**: open and closed periods, no posting into a closed period, year-end
  rollover into retained earnings.
- **Multi-currency**: transaction currency, base currency, rate-at-date off the existing
  daily FX table, realised and unrealised revaluation. One base currency per tenant (D8).
- **Statements from the ledger**: P&L, balance sheet, cash flow. Only trial balance exists
  today.
- **Budgets and commitment control** — an open PO is spent money the ledger cannot see;
  without this, project costing is blind until invoices arrive.
- **Retention and progress billing (IPC)** — non-negotiable for Template A.
- **Credit notes** as corrections, never edits (Law 6).
- **A configurable tax engine with country adapters.** ZATCA is the first adapter, not the
  model (D5). Withholding tax included.
- **Bank reconciliation, cash-flow forecast, post-dated cheques, letters of guarantee and
  credit.**
- **Auto-posting from every module**: invoice, bill, payment, expense, GRN/inventory,
  depreciation, payroll.

**Acceptance:** the deal card's profit figure reconciles to the ledger; a closed period
refuses a posting; a foreign-currency invoice revalues correctly at period end; the three
statements balance.

### P4a — The four hand-built sections (≈14 weeks)

Built by hand deliberately, so P4b's abstraction is extracted from real screens (D13).

- **CRM & Sales** (3w) — leads and opportunities pipeline, customer 360, quotations, sales
  orders and contracts register, pricing and catalog with customer-specific rates, dashboard.
- **Tendering & Estimating** (3w) — tender register, **BOQ grid with rate library**, bid
  documents and clarifications, bid review and approval (on P2's engine), handover to
  Projects transferring the estimate as the budget baseline `sheet`.
- **Projects, deepened** (4w) — WBS/Gantt with dependencies and critical path, resource
  planning, daily site reports with photos, **earned value (EV/PV/AC/SPI/CPI)**, variations
  and change orders, **cost codes with budget / committed / actual / forecast**, billing
  milestones and retention, closure with punch list and warranty tracker.
- **Procurement & Subcontracting** (4w) — purchase requisitions, supplier RFQ and quote
  comparison with award, purchase orders with expediting, **subcontracts with payment
  certificates, retention and back-charges**, supplier qualification and rating, GRN with
  **3-way match**, dashboard.

### P4b — The record engine (≈4 weeks)

Extracted from P4a, not designed ahead of it.

A record type is **declared as data**: fields, list columns, card layout, status
transitions, permission key, deal stage type, `onDelete` class. The engine supplies list,
card, create and edit, workflow, attachments, comments, audit, live updates and permission
filtering. Roughly 50 of the remaining subsections ride it.

**Bespoke screens stay bespoke** and are named here so the engine is never stretched to
cover them: BOQ grid, Gantt, cost sheet, dispatch board, shop-floor terminal, MRP and
capacity planner, mobile field view, payroll run, financial statements, report builder.

### P5 — Engine-driven sections (≈8 weeks)

- **Engineering & Documents** (1.5w) — transmittals, RFI and submittal registers with
  ball-in-court, EBOM and specs, technical library. The document register and approval
  workflows already exist and are the strongest part of the current product.
- **Inventory completion** (1.5w) — locations and bins, batch and serial lifecycle,
  stocktaking and adjustment approval, valuation method, dashboard.
- **Assets & Equipment** (1.5w) — allocation to deals with internal hire rates, utilization
  and cost charged to deals, equipment maintenance, calibration. *Charging equipment to the
  deals that used it is a Law 7 requirement, not a nicety.*
- **Quality & HSE** (2w) — ITPs, inspection and test records, NCR/CAPA, audits, HSE
  incidents with LTIFR, permits to work and toolbox talks, certifications, dashboard.
- **Logistics & Fleet** (1.5w) — deliveries and shipments with POD, trips and routing, fleet
  register and compliance, customs and freight files with landed cost, dashboard.

### P6 — Other centres of gravity (≈11 weeks)

- **Human Resources, complete** (4w) — attendance, leave and employee requests, recruitment
  and onboarding, performance, training and skills, manpower planning, and **payroll**:
  salary runs, allowances, deductions, overtime drawn from timesheets, payslips, bank/WPS
  files, and payroll posting to the ledger (D11).
- **Field Operations & Service** (3.5w) — service orders and job cards, **dispatch board**,
  maintenance contracts (AMC), preventive-maintenance plans generating jobs, **mobile field
  view with e-signature**, installed base, dashboard. Activates Templates D and G.
- **Manufacturing & Production** (3.5w) — BOM and routing, work orders, **MRP and capacity
  planning**, **shop-floor terminal** writing timesheets, production QC, dashboard.
  Activates Template B.

### P7 — Cross-cutting and readiness (≈6 weeks)

- **Reports & BI** (2.5w) — executive dashboard, **report builder** with saved, scheduled
  and exported reports, analytics, KPI targets and alert rules.
- **Administration & Settings** (1.5w) — master data screens (currencies, UoM, numbering
  series, cost codes, categories, the industry taxonomy, the flow templates), integrations
  and API, notification templates and print formats.
- **Templates B–G activation** (1w) — industry map wired, per-template acceptance: for one
  real deal per template, the deal screen tells its whole story start to finish.
- **Readiness** (1w) — performance pass, onboarding and spreadsheet import, docs.

**Programme total: ≈62–68 weeks** (P0 2 + P1 5 + P2 8.5 + P3 7 + P4a 14 + P4b 4 + P5 8 + P6 11 + P7 6 ≈ 65.5). The band is honest, not decorative: P4a and P6 carry the
most estimation risk.

---

## 5 — Sequencing rationale

Three orderings were considered. Engine-first was chosen (D3) because the alternative —
filling empty sections quickly for demo surface — produces fifteen shallow sections resting
on a container that cannot cost or bill them, and every one of them then needs revisiting.
Finance-first was rejected only on dependency: dimensions, payment records and cost attach
are all engine decisions, so a Finance built first would be rebuilt.

Within that, Postgres precedes Finance (D6) because a statutory ledger with periods,
dimensions, multi-currency and three statements is the one subsystem Redis actively fights:
no joins, no cross-key transactions, and a trial balance that means reading every journal
entry into memory.

---

## 6 — Risks

| Risk | Mitigation |
|---|---|
| The alias and re-rooting correction touches Phase 1b dual-writes already on `main`. | Delivered as a compatibility layer over the existing deterministic ids, never a rewrite. The alias table makes both readings resolve to one deal. |
| A store migration silently changes behaviour. | The 139 goldens are the detector, and byte-identical output is P1's pass condition. |
| The record engine cannot express case fifty. | It is extracted from four real hand-built sections, and the ten bespoke screens are named in advance so the engine is never stretched over them. |
| Transaction-mode pooling breaks prepared statements under load. | The repository implementation targets transaction-mode pooling from the first line. |
| Scope this large drifts. | Every phase ends on a green four-command verification and a `docs/functionality` file per feature; phases are strictly sequential (D15). |
| Estimation error in P4a and P6. | Stated as a band. Re-estimated at each phase boundary against actuals, and this document is updated rather than quietly exceeded. |

---

## 7 — Not in this program

Stated in words, because a silent gap reads as a finished feature.

- **Multi-company per tenant** (D8). One legal entity per tenant; branch is a dimension.
  The column exists everywhere so enabling it later is a feature flag, not a migration.
- **Package and entitlement gating** (D12). Everything is included; pricing is by headcount.
- **New stage types as a tenant-configurable concept.** The vocabulary stays closed
  (blueprint §2.6.3); the escape hatch is the checkpoint stage backed by `task`.
- **Offline mobile.** The mobile field view is a responsive web surface, not a native app.

---

## 8 — Next step

This spec becomes implementation plans, one per phase, via the writing-plans skill. P0 and
P1 are written first and in full; later phases are planned at their own boundaries, when the
preceding phase's actuals are known.
