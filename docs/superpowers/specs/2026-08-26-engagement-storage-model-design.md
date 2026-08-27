# Engagement Storage Model — design

**Status:** model approved and all open decisions resolved (2026-08-26). SLA held pending rules; cross-engagement analytics approach chosen (dept-index + mainAgg), detailed design deferred. Ready for an implementation plan.
**Supersedes nothing.** Extends `src/platform/relations.ts`, the repository seam (`src/platform/db/repo.ts`), and the plan in `docs/performance-audit.md`. The SQL end-state is `docs/database-migration-mssql.md`.

Companion visuals (viewing only; this doc is the source of record):
- Current-state map — every entity, relations, composition cardinalities, read cost.
- Target storage blueprint — the layout this spec formalises.

---

## 1. Problem

The data model has three faults, all measured, all traced to one storage trait.

1. **No engagement identity.** Ticket → RFQ → quotation → project is a chain of upward keys; there is no single record for "the deal." So a standalone quotation re-enters client info by hand, a project copies the client name off the ticket, and deleting a ticket hard-cascades because children only know their parent.
2. **Copies drift.** `project.title`, `project.clientName`, `project.value`, `project.quotationNumber` are snapshotted from the quotation at open time and go stale — the code itself comments one "STILL STORED, AND STILL WRONG."
3. **Every read is a whole-collection scan.** Each collection is one Redis key holding one JSON array; there is no index, no `WHERE`, no pagination. Displaying one invoice reads the whole `invoices` array *and* the whole `projects` array and `.find()`s in JS (`src/modules/finance/finance.ts` `listInvoices`). Cost is O(collection size), not O(1), and grows without bound.

The memory alarm is unrelated to record count: ~76% of the dataset is base64 image blobs in Redis (`docs/performance-audit.md` §3). The client-bundle budget (`1529/1600`) is unrelated to Redis entirely.

## 2. Goal

One **engagement** is the source of truth for a deal. Enter from any stage, in any order; every stage optional; the flow only *alerts*, never *blocks*. Records read shared facts live and never keep permanent copies; documents and money freeze at the moment they are sent. Reaching one record is one keyed lookup. Multi-tenant isolation and cascade are preserved. The layout maps 1:1 onto SQL so the later migration is an adapter swap, not a rewrite.

## 3. The model

### 3.1 Three storage tiers — the classification every create applies

Every stored thing is exactly one of:

- **Tier A — Engagement record.** Owned by one engagement (ticket, rfq, quotation, project, sheet, order, delivery, shipment, task, overtime, invoice, expense; optionally bill/asset/journal). Keyed individually, carries `engagementId`, attaches to the engagement root, reads context live, freezes only its own documents.
- **Tier B — Shared reference.** Studio-wide catalogue and people (client, service, vendor, item, account, airline, collaborator, role, section, certification, location, quality docs, studio settings). Referenced by id and read **live**; never owned by, never copied into, one engagement.
- **Tier C — Infrastructure.** Registries, indexes, streams, TTL keys (users, studios, packages, tiers, sessions, otp, chat, fx, counters, events, audit, `ix:*`). Unchanged — except blobs move to Vercel Blob.

This classification is the rule agents learn: on any create, answer A / B / C; that answer decides the key, the indexes, and what may be copied.

### 3.2 Key scheme

Tenant prefix `s:<StudioID>:*` is unchanged — data isolation and cascade-by-prefix hold.

```
# Tier A — engagement + its records
s:<sid>:eng:<engId>                 the engagement root (context + stage pointers)
s:<sid>:rec:<type>:<recId>          ONE record, ONE key  → reach in one hop
s:<sid>:dept:<type>                 ZSET of recIds by createdAt → department screens, paged
s:<sid>:eng-ix:has:<type>          SET of engIds that have this stage → "no project" filters

# Tier B — shared reference (studio-wide)
s:<sid>:ref:<type>:<refId>          client, item, vendor, account, airline, cert, location, …
s:<sid>:collaborators | roles | sections | settings   small, read-whole (unchanged)

# Tier C — infrastructure (unchanged)
g:users | g:studios | g:packages | …    ix:email | ix:slug | ix:collab | …
s:<sid>:events (stream)   s:<sid>:counters (hash)   otp: | chat: | fx: (TTL)
blob → Vercel Blob   (out of Redis — the 76% memory fix)
```

Individual keys, not a smarter array, because an array cannot be reached, indexed, or paged without loading all of it. One key per record is the only shape where "give me invoice X" is one lookup, and it is exactly one SQL row later. `dept` and `eng-ix` are the secondary indexes SQL would otherwise build.

### 3.3 The engagement root, and where membership lives

The root holds the deal's identity **and the rarely-changing singleton pointers only**.
Many-cardinality membership does **not** live on the root — that would make the root a hot
key, every new order/invoice/task contending on one compare-and-set (the exact whole-document
contention of invariants 8–9, relocated). Many-members live in native Redis **SETs**, appended
with `SADD` (atomic, no CAS, no contention).

```
s:<sid>:eng:<engId> = {                     // small, rarely written
  id, studioId, ref,                        // deal handle (see §3.8 for ref generation)

  context: {                                // LIVE — the single source of the deal's identity
    clientId: <refId> | null,               // → ref:client (read live); OR the inline fields below
    clientName, industry,                    // inline fallback until a Client record exists, then promoted
    contact: { name, email, phone, … },
    site: { name, country, city, url },
    urgency, title, deadline,
  },

  singletons: {                             // the "at most one" stages — cheap to hold, rarely change
    ticket:            <recId> | null,       // 1
    approvedQuotation: <recId> | null,       // 1
    project:           <recId> | null,       // 1
  },

  createdAt, updatedAt,                      // NO engagement-level `status` — see below
}
```

**The engagement has no `status` of its own.** A deal's sales status *is* its ticket's status
(Lead → Opportunity → Closed Won/Lost); its delivery status *is* its project's stage. A separate
engagement status would be a third overlapping concept with no independent meaning. A single
"where is this deal" label for the engagement list is **derived** from the stage records
(has-project → in delivery; ticket closed → closed), never stored. "Closed" is likewise derived
from the ticket's closed status; archiving (moving a closed deal's records into `dept:<type>:archived`
to keep active screens fast) keys off that derived state.

```

# many-cardinality membership — one SET per (engagement, type), appended atomically
s:<sid>:eng:<engId>:members:<type>   = SET of recIds   # rfqs, quotations, invoices, orders,
                                                       # deliveries, shipments, tasks, overtimes, expenses
```

Which types are singletons vs members, and their live/frozen fields, are **not hardcoded
here** — they come from the stage registry (§3.7), so a new type is a registry entry, not an
edit to this shape.

### 3.4 The copy law — live context vs frozen documents

Three rules, not two. There are **two distinct freeze mechanisms**; conflating them was a
bug in the first draft.

- **Context is LIVE, on the engagement.** Client, contact, site, industry, urgency, title.
  Stored once on the root (or on the shared Client it references via `clientId`). Every stage
  reads it through `engagementId`; none stores its own copy. Changing it once updates every
  stage. This removes the drift in §1.2.
- **Documents & money are LOCK-FROZEN, on the record — reversibly.** Quotation prices, invoice
  lines, PO amounts are **mutable while the record is unlocked**. **Locking takes a snapshot**;
  the locked values are what a client holds and cannot drift. **Unlocking** (rare, and a
  separate right from editing — the `technical.quotations.unlock` pattern) makes the record
  mutable again; editing and re-locking takes a **fresh** snapshot. A record therefore carries
  a series of snapshots over its life, one per lock — not a single one-way freeze.
- **Issue-context is ISSUE-FROZEN, one-way.** A field like an invoice's `clientName` is read
  **live** from the engagement while the record is a Draft, and snapshotted onto the record at
  the moment it is issued, frozen thereafter. This one is not reversible — it is the record of
  who was billed, as named then.

Per-entity assignments (which fields are live, lock-frozen, or issue-frozen) come from the
stage registry (§3.7) and are normative.

**Live context reads are permission-gated** (invariant 2, default-deny). A user sees a live
context field through the engagement only if they hold the permission for it; otherwise it is
withheld, never leaked. This has a consequence that *unifies* the issue-freeze with the access
model: a record that must stay usable by an audience that **lacks** the context's source
permission — a finance user reading who an **issued invoice** was billed to, without
`sales.clients.view` — must **issue-freeze that context onto itself** at the freeze moment. The
frozen `clientName` is then visible because it is *part of the invoice they may see*, not a live
cross-department read. So the registry declares, per record type, **which context each record
issue-freezes for its own audience**; everything else stays a gated live read. This makes the
permission model one addition, not a non-goal — see §8.

### 3.5 The attach procedure (create) — the one thing agents run

1. **Classify** — Tier A / B / C (from the registry, §3.7). Only A runs the rest.
2. **Find or mint the engagement** — use a given `engagementId`, else mint a new engagement and carry the client context onto its root. No stage is ever a prerequisite for another.
3. **Write the record** (authoritative) at `s:<sid>:rec:<type>:<id>` with `engagementId`, `type` and `sectionId` set (see §3.6); store only its own frozen data.
4. **Attach to the engagement** — the registry says whether `type` is a **singleton** or a **member**:
   - *singleton* → set `root.singletons.<type>`; if already filled, that is the cardinality rule firing ("this engagement already has a project") — refuse or alert, don't overwrite silently.
   - *member* → `SADD s:<sid>:eng:<engId>:members:<type> <recId>` (atomic, no root write).
   One place, driven by the registry — no module re-implements "one vs many".
5. **Index** — `ZADD dept:<type>` (department screen, paged) and, for a stage-defining type, `SADD eng-ix:has:<type> <engId>`. If the record references Tier B ids, `SADD` each `ref-by:<type>:<refId>` (§3.9).
6. **Emit event** — `XADD` before publish (invariant 12), carrying `{engagementId, type, recId}`, so open tabs patch the right engagement in place.

**Atomicity.** The record write (step 3) is the single source of truth. Steps 4–5 touch several
keys and are **not** one atomic CAS; they are best-effort and **reconcilable** — every index is
rebuildable by scanning `engagementId`/`type`/refs off the records, the same fire-and-forget +
nightly-reconcile pattern as `bumpMainAgg`. A crashed create leaves an authoritative record and
a stale index, never a lost record; reconcile repairs the index.

**Detach/delete** is the reverse and is the *"deleting this affects X, Y, Z"* answer: gather the
engagement's records (singletons + member sets), delete each record key, pull from `dept`,
`eng-ix` and `ref-by` indexes, then the root — children-first, idempotent, through `cascade.ts`.

### 3.6 Rendering out-of-sequence / partial engagements

- A department screen (Projects, Sales) reads its `dept:<type>` index — an engagement with no record of that type simply is not in it. Missing stage = missing row, for free.
- The unified engagement view draws a stage card only where `stages.<x>` is filled; empty slots render as optional next steps ("No project yet — open one?"), never as broken. A missing stage is an invitation.
- "Engagements with no project" is one read of `eng-ix:has:project`, not a scan.

### 3.6.2 The unassigned bucket — lone Tier A records

One well-known engagement per studio, `s:<sid>:eng:__unassigned`, that loose records attach to
instead of minting a fresh engagement. A type the registry marks `unassignable` (an ad-hoc
expense, a standalone task) may attach here; inherently deal-bound types (ticket, rfq, quotation,
project) never do. **Promotion is a SET move** — `SREM` from `__unassigned`'s member set, `SADD`
to the real engagement's, update the record's `engagementId`; no record data is rewritten, no
copy made. The bucket is never rendered as a deal — its records appear normally in department
screens (`dept:<type>`), just ungrouped until promoted. This blocks no create and mints no
one-record-engagement sprawl.

**Who may assign, and how.** Promotion is an edit to the record (`engagementId`) plus a
membership move, so it rides the existing permission model — no new authority: anyone who can
**edit that record's type** (`finance.cash.edit`, `tasks.board.edit`, …) **and can see the target
engagement**. (The registry may carry an optional per-type `assign` permission to tighten this;
default is edit-record + access-target.) The flow: an **"Assign to deal"** action on the loose
record → an engagement picker (search by ref/client/project) **or "start a new engagement"**
(collects context once, §3.6.3) → the SET move above, `eng-ix` update, event emit. The record
then reads the target's context live. The move is **audited** (studio audit stream), because
re-attributing an expense changes project profitability and must be traceable. Un-assign and
bulk-assign use the same move.

### 3.6.3 Field sourcing — how create forms adapt in/out of sequence

The layer above storage. A record's create form is **composed from the record type + the
engagement's current state**, never hardcoded per entry-point. This is the fix for the New
Quotation problem, where a standalone quotation had no context source and so grew a second,
divergent field set (`clientId?/clientName?/industry?/deadline?` "internal only",
`technical/schema.ts`).

Every create field is exactly one kind, declared in the stage registry (§3.7):

- **Context field** — client, contact, site, industry, urgency, deadline, title. Lives on the
  **engagement**, never on the record. Read from it.
- **Record-own field** — the record's actual content (quotation tables/prices, invoice lines).
  Always entered.
- **Reference field** — a picker into Tier B (which client/item/vendor). Stores an id, reads
  the rest live.

Form composition:

- **In-sequence** (engagement already carries the context) → show **only record-own + reference
  fields**. Context is not asked and not re-validated.
- **Out-of-sequence** (engagement being born) → additionally collect the context fields **once** —
  they are *starting the engagement*, not "extra fields on this record." Stored on the engagement;
  every later record in the deal reads them and never asks again.

Mandatory-information source: the engagement if it has it; the user once, at engagement birth,
otherwise. The registry declares which context fields are mandatory to *start* an engagement (a
client — by id or typed name — and a title). A standalone-typed client name is inline context and
**promotes to a live `clientId`** the moment a Client is matched/created (the `clientId` OR
`clientName` rule, now held once on the engagement instead of re-declared on every record type
that needs a client).

Consequence: **one form per record type**, its context section appearing only when the engagement
cannot supply it — never two divergent field sets for one record again.

### 3.6.4 Cross-level fills the engagement must preserve (no-more-"N/A")

Today, screens avoid showing "N/A"/"—" for fields a record doesn't own by reaching to another
level. Every such fill must map to a source in the new model, or the gaps return. Three
directions, all preserved:

- **From a HIGHER level (child shows an ancestor's data).** RFQ/quotation/project show
  clientName/urgency/industry/deadline via `ticketFacts`; invoice/expense/order/delivery/task/
  permit show `projectNumber` via a project join; the sheet composes description/qty/model from
  the quotation + item. → **These become live reads from the engagement root** (context) and from
  the referenced parent record. `ticketFacts` returns `""` when there is no ticket — the exact
  cause of the standalone-quotation blanks — and the engagement root, which always exists,
  removes that gap.
- **From a LOWER level (parent shows a descendant's data).** Ticket "Value Quoted" (latest
  quotation total), ticket RFQ-status column, project progress (from the plan), profitability
  (from invoices/orders/expenses), Overview counts. → **Still live derivations**, now cheaper:
  the engagement's singleton pointers + member sets give O(1) access to the children instead of a
  scan; cross-engagement rollups use `dept:<type>` + `mainAgg` (§7).
- **SIDEWAYS (from shared reference).** Actor/assignee/holder **alias** ← Collaborator;
  vendorName ← Vendor; locationName ← Location. → **Unchanged** — live reads of Tier B.

Rule: no displayed field is ever a stored copy of another level's value (that is the drift in
§1.2). It is a live read of the engagement (context), a live derivation from the children, or a
live read of Tier B — with the record's own frozen documents the only thing it stores itself.

### 3.7 The stage registry — how new sections and functionality plug in

The engagement machinery is **declarative**, the way `relations.ts` is. There is no hardcoded
list of stages anywhere in the root, the attach procedure, or the indexes. One registry entry
per engagement-related type drives all of them:

```
STAGE_REGISTRY[type] = {
  type,                    // "invoice", "order", …  → key segment s:<sid>:rec:<type>:<id>
  cardinality,             // "one" (singleton on root) | "many" (member set)
  unassignable,            // may this be created with no deal? → __unassigned bucket (§3.6.2)
  sectionKey,              // permission + section ownership (unchanged model)
  permission,              // e.g. "finance.cash.view"
  copy:  { live[], lockFrozen[], issueFrozen[] },    // the copy law, per field (§3.4)
  form:  { context[], own[], reference[] },          // field sourcing for the create form (§3.6.3)
  lockable,                // does it have the reversible lock-freeze?
}
```

Consequences, which are the answer to *"what happens when I add a new section or new
functionality":*

- **New engagement functionality** (a new record type in a deal) = **one registry entry**. The
  root shape, the attach step, the indexes, and the copy law all read from it. No edit to the
  root schema, the attach code, or `cascade.ts`.
- **New non-engagement section** (an HR tool, a studio-level feature) = it is simply Tier B or
  C by the §3.1 classification and never touches the engagement machinery at all. It plugs in
  exactly as today: `SECTION_DEFS` + `SECTION_COLLECTIONS` + the permission catalogue.
- The registry is the engagement analogue of `relations.ts NODES/EDGES` and should live beside
  it, pure and reader-injected, so a client component can import it without pulling Redis in.

### 3.8 Engagement `ref` generation

The engagement carries the human handle the ticket used to (`ACME-001`). Generated per-client
via `nextUniqueRef` (invariant 10) **when a client is known**. When an engagement is minted
out-of-sequence with no client yet (a blank internal quotation), it takes a provisional
studio-scoped handle (e.g. `ENG-000123`) and is **re-reffed to the client series when a client
is attached/promoted** — the ref is a display handle, not an identity, so re-issuing it is safe;
`engagementId` is the stable identity everything points at.

### 3.9.0 Referencing an embedded row

Composition (`quotation → tables → rows`, `invoice → lines`) is a record's own inline structure,
not a graph edge — rows are not standalone records. When another record must point at a specific
row (a PO line fulfilling a quotation line), the row is referenced by its **stable id inside its
parent**: `{ quotationId, lineId }`. Any embedded child that is a reference target therefore
needs a stable `id` in its parent (`QuotationLine.id` already exists). The project sheet already
uses this exact pattern (keying its data by `rowId = QuotationLine.id`); PO lines adopt the same
`(sheetId/quotationId, lineId)` back-reference — this is what "PO → sheet-row / quotation-line"
means. No new graph node; a stored composite reference.

### 3.9 Reference integrity for Tier B

"Is this client / item / vendor still referenced?" (delete-refusal) must not be a scan. Each
Tier B reference carries a **reverse index** `ref-by:<type>:<refId>` = SET of referrer record
ids, maintained on attach (§3.5 step 5) and detach. Delete-refusal is then a single `SCARD`;
"where is this item used" is a `SMEMBERS`. This is the reverse index SQL would give a foreign
key for free.

### 3.6.1 Permissions dependency (records leave their section collection)

Records move from a section-scoped collection key to `rec:<type>:<id>`, so each record **carries
its `sectionId`** and `effectivePermissions` resolves against it exactly as today. The
permission model itself is unchanged (still a non-goal, §8) — this states the one field the move
depends on.

## 4. Verification strategy — testing on live Redis

Established mechanism (`NOMPANY_KEY_PREFIX`, `keys.ts:32`):

- The new schema and the same routes/repositories run under a test prefix (`test_…`) on the **same live Redis**. Physical isolation: no prefixed key collides with a real one.
- Cleanup is a **bounded** `delPrefix("test_…")` (`store.ts:510`) — `MATCH test_*` only. `assertScopedPrefix` (`store.ts:492`) refuses an empty/blank prefix at both scan and delete, before any Redis call, so a teardown can only remove its own namespace.
- Rails (invariant 17): tests run with `NODE_ENV` ≠ `production` and a non-empty prefix; never `FLUSHDB`, never `sweepOrphans()` from a test, never an empty/broad scan. Verification is read-only by default.
- Contract gates hold: golden responses, hop counts, the permission matrix, the bundle budget — a new-model route that regresses any of them fails the build.

## 5. Rollout — staged, reversible, live-safe

No big-bang cutover on shared Redis.

1. **Seam-first.** All reads/writes already route (or are routed) through `repo.ts`. Add an engagement-aware adapter behind it; call sites do not change.
2. **Dual-read during transition.** The adapter can read the old array-collection and the new per-key form, preferring the new when present, so a module migrates without a flag day.
3. **Module by module**, spine first: engagement root + ticket/rfq/quotation/project, proven under the test prefix (full suite + goldens + hop counts) before the next module. HR/Finance/etc. stay on today's storage until reached.
4. **Real-data migration** of existing keys runs guarded per invariant 17: export first, write new keys, verify by re-scan, delete old by explicit key-list — never a broad scan. Small today (dev-stage data), designed properly regardless.
   - **Backfill algorithm (undesigned detail to resolve).** Existing records are not yet grouped into engagements. Walk `relations.ts` from each `salesTicket` (and each orphan quotation/project with no ticket) to cluster the chain + its project's children into one engagement; mint an `Engagement`, lift the live context onto it, stamp `engagementId` onto every clustered record. Deterministic and re-runnable so a half-finished backfill is idempotent.
5. **Blobs to Vercel Blob** as an independent, shippable step (largest memory win, no model dependency).

## 6. SQL end-state (why this is a migration, not a rewrite)

Each `rec:<type>:<id>` key is one row in that type's table; `engagementId` and `studioId` are its foreign-key columns; `dept`/`eng-ix` are its indexes; the engagement root is an `Engagement` table. Streams, counters, OTP/chat/FX/rate-limit TTL keys stay in Redis (`docs/database-migration-mssql.md` §1). The repo seam swaps the engine underneath without the business logic noticing.

## 7. Decisions

**Confirmed (all resolved 2026-08-26):**
- engagement is a stored root · one key per record · live-context / lock-frozen / issue-frozen law · the attach procedure · SQL-shaped keys · live-prefix testing · blobs off Redis.
- **Drift fields → live** (`project.title / clientName / value / quotationNumber`). Yes.
- **Missing edges in scope.** PO → quotation-line/sheet-row (composite ref, §3.9.0) and `task→quotation`. Yes.
- **Finance links → optional stages.** `bill`, `fixedAsset`, `journalEntry` attach to the engagement as optional stages so project profitability can include them. Yes.
- **Owner → many studios.** Yes. Blast radius includes the **account switcher UI** — the user menu lists owned studios (plural owner set) **+** collaborations (`ix:collab:<UserID>`) together. Trace `ix:owner`, `createStudio`, `ownedStudioId`, billing, and every "my one studio" screen.
- **Engagement sprawl → the unassigned bucket** (§3.6.2). Per-studio `__unassigned` engagement, promotable by a SET move.
- **Cross-engagement analytics** reads via `dept:<type>` indexes + the existing `mainAgg` rollup — replacing whole-collection scans, so faster than today, not just equivalent.

**Surfaced by review, folded into the model (§3.3, §3.5, §3.6.2, §3.7, §3.9, §3.9.0) — no longer open:**
membership-in-SETs (root contention), index reconcile (multi-key atomicity), the stage registry
(extensibility), reverse indexes (Tier B integrity), lock-based reversible freeze, embedded-row
composite references, `sectionId` on records (permissions), backfill algorithm (§5.4).

**Held:** **SLA** — slot reserved on the root; awaiting rules (one per project or renewals? what it freezes vs reads live).

## 7b. Compliance & sequencing (agent directives, invariants, gates)

Audited against the 17 invariants, the Global Directives, both gates, and the global Do-Not list.
The design breaches no invariant; the *plan to build it* must honour the following or it would.

1. **Gate A first (hard block).** "Nothing in Wave 2+ starts before Gate A is green" — and Gate A
   is in progress. This restructure is Wave-2+/Gate-B-scale (it is the repository-seam endgame),
   so **implementation waits for Gate A**, and this initiative must be **placed in
   `docs/execution-plan.md`** and sequenced there. Designing now is fine; building now is not.
   It also *advances* Gate B (everything through the repo interface).
2. **Two-confirmation deletion (Inv. 17 / Do-Not 24/08/2026).** The cutover deletes old
   collection keys on the live shared instance. That step requires **two explicit user
   confirmations in the same exchange**, the second with the exact scope spelled out, then
   export-first → delete-by-explicit-key-list → re-scan. Never a broad/patterned prefix delete.
   Test-prefix teardown (bounded `delPrefix("test_")`, guarded by `assertScopedPrefix`) is exempt —
   it cannot touch real data.
3. **Keys only in `keys.ts` (Inv. 1).** Every new family (`eng:`, `rec:`, `members:`, `dept:`,
   `eng-ix:`, `ref:`, `ref-by:`, `__unassigned`) is a **builder in `src/platform/db/keys.ts`** —
   never a literal at a call site. The suite's namespacing assertion must stay green.
4. **Golden responses & hop counts re-recorded deliberately (Gate A contract).** Reads moving to
   live context change response bodies and hop counts. Each change is re-recorded in its **own
   commit with a stated reason**; `NOMPANY_RECORD_GOLDENS` never set in CI.
5. **Agent ownership & shared-file handoff (Do-Not 20/08/2026 + handoff contract).** Decompose by
   owner — `backend-db` (keys/store/cascade/repo), `business-logic` (relations/sales chain/
   signables), `operations-integration` (HR/Finance/Inventory/Operations), `qa-security` (tests/
   matrix/hops), `frontend-ui` (the adaptive forms §3.6.3). Shared files (`keys.ts`, `store.ts`,
   `resolve.ts`, `catalogue.ts`, `suite.mjs`) are **sequenced, never edited concurrently**.
6. **Updates through `editJSON` (Inv. 8).** A record update is a compare-and-set on its own key,
   not a blind `setJSON`. Singleton-slot claims are CAS (`null→id`). Index writes use native
   atomic `SADD`/`ZADD` (consistent with the no-blind-overwrite rule).
7. **Researcher pass (rule 4 — consult `researcher` before adopting anything new).** Before build, a short `researcher` validation of the
   aggregate-root + Redis-secondary-index approach against alternatives — the pattern is grounded
   in `relations.ts`/the repo seam/the SQL-migration doc, not invented, but the directive asks.
8. **Reconcile cron fails closed (Inv. 15).** The index/`mainAgg` reconcile job refuses without
   `CRON_SECRET`; a missing secret never opens the door.

## 8. Non-goals

Not touching: the event-stream/pub-sub design, auth, or the twelve modules' business rules beyond
where a record's reads/writes move to the new keys. This spec is storage shape and the engagement
root only.

**One deliberate exception to "don't touch permissions":** the engagement introduces a single
access rule — live context reads are permission-gated (§3.4), and a record issue-freezes the
context its own audience is entitled to but may lack source-permission for. No other part of the
permission model changes.

## 9. Pressure-test log (adversarial review, 2026-08-26)

Findings from stress-testing the design, and their disposition.

**Resolved into the model:**
- *Orphan record from create ordering* — singleton stages **claim the slot (CAS on the root
  `null→id`) before writing the record**; members (SADD) are unaffected. (§3.5)
- *`dept` index leaks section scope / can't serve real filters* — dept indexes are the primary
  listing; **per-record scope filtering still applies on read**, and common filters get declared
  **secondary indexes** (`dept:<type>:<facet>`). "One index per type" is a floor. (§3.5)
- *Frozen-traceability references over-block deletion* — `ref-by` registers **only live**
  references; a frozen-snapshot traceability pointer (a quotation line's `itemId` beside frozen
  text) does not register, so deleting a discontinued item is not wrongly refused. (§3.9)
- *Migration split-brain* — a transitioning module **dual-writes** (old + new); reads prefer new;
  cut over only after backfill verified, then drop old. (§5)
- *Member sets unordered / no in-engagement paging* — member indexes are **ZSETs** scored by
  `createdAt`; the engagement view paginates within a type. (§3.3)
- *Context visibility* — **gated** (user's decision). Live context reads respect permission;
  records issue-freeze the context their audience needs. (§3.4, §8)
- *Engagement `status`* — **removed**; a deal's status is its ticket's, its delivery status is
  its project's stage, and a combined list label is derived, not stored; archiving keys off the
  derived closed state. (§3.3)

**Resolved (cont.):**
- *Multi-deal PO / delivery* — **no.** A project has many POs and many deliveries, but each
  belongs to **one** project/engagement — a normal single-engagement `many` member. No
  line-tagging. Principle: a record spans engagements only when its **lines** are independently
  deal-tagged — which is the **ledger/journal** (Tier B, per-line `engagementId` for P&L) and
  nothing in procurement/logistics.

**In reserve (lower severity, not yet worked):** client merge/dedup re-pointing; provisional-ref
re-issue race on concurrent promotion; notification addressing under the new keys.
