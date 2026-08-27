# The Client Belongs to the Engagement — Implementation Plan (Increment 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the client a property of the **engagement**, captured wherever the deal starts and read live by every stage — so a project opened from an internal quotation carries the client, and no record holds a copy that can drift.

**Architecture:** The ticket's find-or-create-client-and-fold-in-contact-and-site logic becomes one shared helper. Quotation creation gains the same full client block and runs through it, so an internal quotation always resolves to a real Client record. The engagement context carries `clientId`; the **name is resolved live at read time** from that record, with the stored `clientName` only a fallback for a client that has no row yet. `openProject` reads its client from the engagement rather than the ticket, and attaches the project to the engagement the quotation actually belongs to.

**Tech Stack:** TypeScript (strict), the sales/technical/projects modules, the Phase-0/1a engagement store, `tests/suite.mjs` + `tests/gate-a.mjs`.

**Why this exists (the bug that prompted it):** "Project Home Invasion" (`pro_mt9pi5hjdjgsla`) has `clientId: ""`. Its quotation Q-0002 has `clientId: sal_mt8i9py030ux1s` → "Abdullah Abu Hamad". `openProject` sources the client only from `ticketFacts(quote.ticketId)`, and an internal quotation has no ticket. Separately, `buildEngagements`' orphan branch copies `q.clientName` without resolving `q.clientId`, so all six internal-quotation engagements on live carry an empty client name.

## Global Constraints

- **The client is referenced, never copied.** `clientId` is the fact; the display name is resolved from the Client record at read time — the `composeTicket` pattern already used in Sales. A stored `clientName` is a fallback for free-text only, never preferred over a live lookup.
- **Every stage reads through the engagement.** No stage may reach sideways into a sibling record for the client. `openProject` must not read the ticket for it.
- **Never duplicate** (house rule): the ticket's client handling is extracted, not copied, before the quotation uses it.
- Keys only in `src/platform/db/keys.ts`. Access resolved once; gate inside service functions.
- **Goldens:** any response that changes is re-recorded **deliberately, in its own commit, with the reason stated**, and only the goldens that genuinely move. `NOMPANY_RECORD_GOLDENS` is never committed as set. Task 1 must move **none**.
- **No live writes.** This increment fixes behaviour and read-time resolution; repairing the existing "Project Home Invasion" row is a separate, user-gated action.
- **Verify per task:** `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.strict.json`, plus the task's tests. Full `npm test` **run alone** (concurrent suites deadlock — `tests/exclusive.mjs`) before the final commit.
- **Commit subjects are declarative sentences** (house style), ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Extract the client helper (pure refactor, zero behaviour change)

**Files:**
- Modify: `src/modules/sales/salesClients.ts` (add the helper beside `normaliseClientName`/`clientSlug`)
- Modify: `src/modules/sales/sales.ts` (`createTicket` calls it)
- Test: `tests/suite.mjs`

**Interfaces:**
- Produces: `resolveClientFor(scope, { clientId, clientName, industry, contact, site, collaboratorId }): Promise<Client | null>` — finds the client by name (case-insensitive) or by explicit id, creates it when absent (requires a name), then folds the contact and the site into it, leaving everything else alone. Returns the client, or `null` when there is neither a usable name nor a matching id.

- [ ] **Step 1: Read `createTicket`** in `src/modules/sales/sales.ts` — the block from "Upsert the client by name" through the contacts/locations fold. That block, verbatim in behaviour, is what moves. `upsertContact` and `upsertLocation` (same file) move with it or become imports; keep them one implementation, not two.

- [ ] **Step 2: Write the failing test** — in `tests/suite.mjs`, near the existing sales-client coverage, call `resolveClientFor` directly and assert: an unknown name creates a client with a slug `code`; the same name in different case matches the existing one rather than creating a second; a contact and a site are folded in; folding again with the same contact does not duplicate it; and no other field of the client is disturbed.

- [ ] **Step 3: Run to verify it fails** — Expected: FAIL, `resolveClientFor` is not exported.

- [ ] **Step 4: Implement** — move the block into `salesClients.ts` as `resolveClientFor`, and have `createTicket` call it. `createTicket`'s own error contract must not change: when the helper returns `null`, it still returns `{ error: "client" }` exactly as before.

- [ ] **Step 5: Verify** — both `tsc` configs; then the FULL `npm test` **alone**. **Every golden must be byte-identical** — this task changes no response. If one moves, the refactor was not behaviour-preserving: STOP and report.

- [ ] **Step 6: Commit**

```bash
git add src/modules/sales/salesClients.ts src/modules/sales/sales.ts tests/suite.mjs
git commit -m "One function finds a client and folds in what a deal knows about them"
```

---

### Task 2: A quotation captures the client the way a ticket does

**Files:**
- Modify: `src/modules/technical/technical.ts` (`createQuotation`)
- Modify: `src/modules/technical/schema.ts` (the quotation's client fields)
- Test: `tests/suite.mjs`

**Interfaces:**
- Consumes: `resolveClientFor` (Task 1).

- [ ] **Step 1: Read `createQuotation`** (~line 649). It already has `salesClientsSection` in scope and takes `clientId` **or** a typed `clientName` — today mutually exclusive, with no contact and no site.

- [ ] **Step 2: Write the failing test** — create an internal quotation supplying the full client block (client name, contact name/position/email/phone, site name/country/city/map link) and assert: the quotation comes back carrying a real `clientId`; a Client record exists with that name; its `contacts` contains the contact and its `locations` the site; and creating a second internal quotation for the same client name reuses the same client rather than creating a duplicate.

- [ ] **Step 3: Run to verify it fails.**

- [ ] **Step 4: Implement** — `createQuotation` accepts the same client block the ticket does: `clientId`/`clientName`, `contactName`, `contactPosition`, `contactEmail`, `contactPhone`, and a `location` object (`name`, `country`, `city`, `url`). Coerce them exactly as `createTicket` does (same `str()` caps). Run them through `resolveClientFor` and store the resulting `client.id` as the quotation's `clientId`.
  **The "clientId OR clientName, never both" rule ends here** — every quotation now resolves to a real Client record, so the free-text-only branch disappears. Update the comment in `src/modules/technical/schema.ts` that documents that rule: say what is true now, and why (a free-text client that never becomes a record is what left a project with no client at all). Keep `clientName` on the schema only if something still reads it as a fallback; if nothing does, remove it and trace the readers first.

- [ ] **Step 5: Verify** — both `tsc` configs; full `npm test` **alone**. The quotation response now carries a `clientId` where it may not have before, so **quotation goldens may move**. Re-record only those, and confirm no unrelated golden moved.

- [ ] **Step 6: Commit** — two commits: the change, then the golden re-record with its reason.

```bash
git commit -m "A quotation asks who the client is, in full"
git commit -m "Gate A records a quotation that knows its client"
```

---

### Task 3: The engagement carries the client, resolved live

**Files:**
- Modify: `src/platform/engagement/backfill.ts` (the orphan-quotation branch)
- Modify: `src/modules/main/engagements.ts` (resolve the name at read time)
- Test: `tests/suite.mjs`

- [ ] **Step 1: Write the failing test** — two parts. (a) `buildEngagements` given an internal quotation whose `clientId` names a client in `salesClients` produces a context whose `clientName` is that client's name — today it is `""`, which is the live bug. (b) `listEngagements`/`engagementBlock` show the client's **current** name after the Client record is renamed, without the engagement root being rewritten — proving resolution happens at read time, not write time.

- [ ] **Step 2: Run to verify both fail.**

- [ ] **Step 3: Implement.**
  - In `backfill.ts`, the orphan branch resolves the client through the same `clientById` map the ticket branch uses (`clientById.get(q.clientId)`), falling back to `q.clientName`. The two branches should read symmetrically; the asymmetry is what caused the bug.
  - In `engagements.ts`, resolve the display name at read time: when `context.clientId` names a Client row, use that row's current `name`; otherwise fall back to the stored `context.clientName`. Read the clients collection **once per request**, not per engagement. Comment why: a copied name drifts the moment somebody renames the client, and Sales already resolves it live in `composeTicket`.

- [ ] **Step 4: Verify** — both `tsc` configs; full `npm test` **alone**. The engagement goldens carry a client name, so `main.engagements.list`/`.block` may move; re-record only those.

- [ ] **Step 5: Commit**

```bash
git commit -m "An engagement names its client from the client's own record"
```

---

### Task 4: A project takes its client from the engagement

**Files:**
- Modify: `src/modules/projects/projects.ts` (`openProject`)
- Test: `tests/suite.mjs`

- [ ] **Step 1: Read `openProject`** (~line 250). It does `const t = factsFor(String(quote.ticketId || ""))` and then `clientId: t.clientId, clientName: t.clientName` — blank whenever the quotation is internal. It also attaches via `attachToTicketEngagement(studio.id, "project", project.id, project.ticketId)`, which with an empty `ticketId` resolves to a non-existent engagement, throws, and is swallowed by the guard — so the project never joins its engagement.

- [ ] **Step 2: Write the failing tests** — (a) open a project from an **internal** quotation and assert the project carries the quotation's client; (b) assert that project is a member of the quotation's own engagement (`deterministicEngId("quotation", quotationId)`), with `singletons.project` set; (c) the ticket-headed path still behaves exactly as before — same client, same engagement.

- [ ] **Step 3: Run to verify they fail.**

- [ ] **Step 4: Implement.**
  - Resolve the engagement first: `quote.ticketId` → `deterministicEngId("ticket", quote.ticketId)`, else `deterministicEngId("quotation", quote.id)`. Read that engagement and take the client from its **context**, not from `ticketFacts`.
  - Attach the project to **that** engagement, and set the approved-quotation pointer on it.
  - Keep storing `clientId`/`clientName` on the project row for now — the Projects screens and Finance's cash sheet read the raw row, and retiring those copies is the separate, already-catalogued drift item. Update the "STILL STORED, AND STILL WRONG" comment to say the source is now the engagement and what still blocks removing the copy.

- [ ] **Step 5: Verify** — both `tsc` configs; full `npm test` **alone**; project goldens may move (a project from an internal quotation now has a client) — re-record only those.

- [ ] **Step 6: Commit** — the change, then any golden re-record with its reason.

```bash
git commit -m "A project opened from a quotation knows whose work it is"
```

---

### Task 5: Prove it end to end

**Files:**
- Modify: `tests/suite.mjs`

- [ ] **Step 1: Write the whole-chain test** — build a deal the way the bug happened: create an internal quotation with the full client block, approve it, open a project from it. Assert the project carries the client, the engagement has ticket `null` / project set / quotation as a member, and the engagement view's block shows the client's name. Then rename the Client record and assert the view reports the **new** name without any engagement write — the live-resolution property, proven on the same chain that broke.

- [ ] **Step 2: Run the FULL `npm test` alone** — 0 failures, hop counts unregressed, only the goldens this increment deliberately re-recorded are different from the branch point. Then `tsc` both configs and `npx next build`.

- [ ] **Step 3: Commit**

```bash
git commit -m "CI proves a quotation-born deal carries its client"
```

---

## Self-Review

**Coverage:** the shared helper (T1) removes the duplication before it happens; the quotation captures the client (T2); the engagement holds it and resolves it live (T3); the project reads it from the engagement and attaches correctly (T4); the whole chain is proven, including the rename (T5).

**Placeholder scan:** none — each task names the exact function and the exact line region to read first.

**Risks flagged for the executor:**
1. **Task 1 must move no golden.** It is a pure extraction; a moved golden means behaviour changed and the task is wrong.
2. **`serviceIds` is out of scope here.** Increment 2 re-points services from `salesServices` to Studio Settings' Service Actions — do not touch it in this increment, and do not delete the field while wiring the client block.
3. **Do not repair live data.** "Project Home Invasion" keeps its blank client until a separate, user-approved action; this increment fixes the code path and read-time resolution only.
4. **`/super`'s Tier→ErpServices also uses the name `serviceIds`** and is unrelated to anything here — leave `catalog.ts`, `CatalogEditor.js`, `TiersScreen.js` alone.
