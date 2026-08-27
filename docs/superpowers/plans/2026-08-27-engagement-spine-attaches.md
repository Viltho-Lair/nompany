# The Spine Attaches to Its Engagement on Create — Implementation Plan (Phase 1b-rest)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the ticket dual-write (Phase 1b-i) to the rest of the spine — when an **RFQ**, a **quotation**, or a **project** is created, attach it to its engagement, same deterministic-id / same-clustering / guarded-best-effort / response-byte-identical discipline. Converted records join the ticket's engagement; an internal (ticket-less) quotation mints its own; opening a project also records the approved quotation.

**Architecture:** Three small helpers in `engagement.ts` (attach-to-ticket-engagement, mint-quotation-engagement, set-approved-quotation), each reusing Phase-0/1a primitives, wired into the existing create paths (`requestRfq`, `convertRfq`/`createQuotation`, `openProject`) with the same guarded try/catch the ticket dual-write uses. No response changes; the backfill reconciles any miss.

**Tech Stack:** TypeScript, the Phase-0/1a engagement store, the technical + projects modules, the `tests/suite.mjs` harness.

**Spec:** `docs/superpowers/specs/2026-08-26-engagement-storage-model-design.md` §3.5, §5. Builds on Phase 0 + 1a + 1b-i (all on `main`).

## Global Constraints

- **DUAL-WRITE, ADDITIVE, GUARDED.** Every create path's existing record write and return value are UNCHANGED and byte-identical. The engagement attach is added after it, wrapped so it can NEVER fail the create (best-effort; backfill reconciles). 144 goldens byte-identical; `NOMPANY_RECORD_GOLDENS` not set — a changed golden is a STOP.
- **Deterministic ids — consistency with the backfill + 1b-i.** A record created against a ticket attaches to `deterministicEngId("ticket", ticketId)`; an internal quotation mints `deterministicEngId("quotation", quotationId)` — the exact ids the backfill computes.
- **Singular registry types** (rfq/quotation/project) — the Phase-0 `attachRecord`/`ENG.members` vocabulary.
- **Keys only in keys.ts (Inv. 1); writes via the engagement store (attachRecord/applyDescriptor/editJSON).**
- **Hop-count contract:** as in 1b-i, no hop/command assertion covers these POST create routes — confirm per task; if one does and rises, STOP and report (accept deliberately or batch, never silent drift).
- **Verify per task:** `npx tsc --noEmit`, strict `tsc`, the relevant module tests + a new engagement-attach assertion, and the FULL `npm test` before the phase's final commit. Run the suite ALONE (namespace lock-contention hangs it; `tests/exclusive.mjs`).
- **Commit subjects declarative** (house style), ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: The attach helpers

**Files:**
- Modify: `src/platform/db/engagement.ts` (add `attachToTicketEngagement`, `attachQuotationEngagement`, `setApprovedQuotation`)
- Test: `tests/engagement-spine.mjs` (create)

**Interfaces:**
- Consumes: `attachRecord`, `applyDescriptor`, `readEngagement`, `editJSON`, `Engagement` (this file); `deterministicEngId` (`../db/keys`); `buildEngagements` (`../engagement/backfill`).
- Produces:
  - `attachToTicketEngagement(studioId: string, type: string, recId: string, ticketId: string): Promise<void>` — `attachRecord(studioId, deterministicEngId("ticket", ticketId), type, recId)`.
  - `attachQuotationEngagement(studioId: string, quotation: Record<string,unknown>, client: Record<string,unknown> | null): Promise<string>` — for an internal (no-`ticketId`) quotation: build a one-quotation descriptor via `buildEngagements({ quotations: [quotation], salesClients: client ? [client] : [] })`, `applyDescriptor`, return the engId (`deterministicEngId("quotation", quotation.id)`).
  - `setApprovedQuotation(studioId: string, engId: string, quotationId: string): Promise<void>` — `editJSON` the root, set `singletons.approvedQuotation = quotationId`, bump `updatedAt`; no-op (leave as-is) if the root is absent.

- [ ] **Step 1: Write the failing test** — `tests/engagement-spine.mjs`:

```js
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import { createEngagement, attachRecord, readEngagementView,
         attachToTicketEngagement, attachQuotationEngagement, setApprovedQuotation } from "../src/platform/db/engagement.ts";
assert.ok(KEY_PREFIX, "must run under a key prefix");

export async function testSpineHelpers() {
  const sid = `s_${Date.now().toString(36)}`;
  // a ticket engagement exists (as 1b-i would have made it)
  const ticketEng = deterministicEngId("ticket", "tk_1");
  await attachRecord(sid, await mkTicketRoot(sid, "tk_1"), "ticket", "tk_1"); // helper below
  // attach an rfq and a converted quotation to the ticket's engagement
  await attachToTicketEngagement(sid, "rfq", "rfq_1", "tk_1");
  await attachToTicketEngagement(sid, "quotation", "quo_1", "tk_1");
  await setApprovedQuotation(sid, ticketEng, "quo_1");
  const view = await readEngagementView(sid, ticketEng);
  assert.deepEqual(view.members.rfq, ["rfq_1"]);
  assert.deepEqual(view.members.quotation, ["quo_1"]);
  assert.equal(view.singletons.approvedQuotation, "quo_1", "approved quotation recorded");
  // an internal quotation mints its own engagement
  const engId = await attachQuotationEngagement(sid, { id: "quo_9", clientName: "Acme", number: "Q-9" }, null);
  assert.equal(engId, deterministicEngId("quotation", "quo_9"));
  const v2 = await readEngagementView(sid, engId);
  assert.deepEqual(v2.members.quotation, ["quo_9"]);
}

// createEngagement mints a random id; the ticket engagement needs the deterministic one,
// so seed the root the way 1b-i does — via attachTicketEngagement's own path is cleaner,
// but for this unit we just need a root at the deterministic id:
async function mkTicketRoot(sid, ticketId) {
  const { attachTicketEngagement } = await import("../src/platform/db/engagement.ts");
  return attachTicketEngagement(sid, { id: ticketId, clientName: "Acme", ref: "ACME-001" }, { id: "c1", name: "Acme" });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => { for (const t of [testSpineHelpers]) { await t(); console.log(`ok ${t.name}`); } })()
    .catch((e) => { console.error(e); process.exit(1); });
}
```

> Note: `attachTicketEngagement` (from Phase 1b-i) already exists and returns the deterministic ticket engId — reuse it to seed the ticket root, rather than `createEngagement` (which mints a random id). Adjust the test's seed accordingly if cleaner.

- [ ] **Step 2: Run to verify it fails** — loader preload, under `NOMPANY_KEY_PREFIX`. Expected: FAIL — helpers not exported.

- [ ] **Step 3: Write minimal implementation** — append to `engagement.ts`:

```ts
export async function attachToTicketEngagement(
  studioId: string, type: string, recId: string, ticketId: string,
): Promise<void> {
  await attachRecord(studioId, deterministicEngId("ticket", ticketId), type, recId);
}

// An internal (ticket-less) quotation mints its OWN engagement — the backfill's
// orphan-quotation path, reused so a live internal quotation and a backfilled one match.
export async function attachQuotationEngagement(
  studioId: string, quotation: Record<string, unknown>, client: Record<string, unknown> | null,
): Promise<string> {
  const [descriptor] = buildEngagements({
    quotations: [quotation], salesClients: client ? [client] : [],
  });
  await applyDescriptor(studioId, descriptor);
  return descriptor.engId;
}

export async function setApprovedQuotation(
  studioId: string, engId: string, quotationId: string,
): Promise<void> {
  await editJSON<Engagement, void>(ENG.root(studioId, engId), (eng) => {
    if (!eng) return { result: undefined };  // root absent → reconcile will build it
    return { next: { ...eng, singletons: { ...eng.singletons, approvedQuotation: quotationId }, updatedAt: nowISO() } };
  });
}
```
Import `deterministicEngId` from `./keys` and `buildEngagements` from `../engagement/backfill` (both already imported by earlier work — reuse, don't duplicate the import). Match the real `editJSON` `{ next }/{ result }` `EditOutcome` shape (see `claimSingleton`).

- [ ] **Step 4: Run to verify it passes** — module `ok`; both `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/engagement.ts tests/engagement-spine.mjs
git commit -m "The engagement store can attach the spine's records and mark the approved quotation"
```

---

### Task 2: RFQ creation attaches to the ticket's engagement

**Files:**
- Modify: the RFQ-create function (find it — `requestRfq`/`createRfq` in `src/modules/technical/rfqs.ts` or `src/modules/sales/sales.ts`; it sets `rfq.ticketId`)
- Test: `tests/suite.mjs`

- [ ] **Step 1:** Read the RFQ-create path; confirm where the `rfq` (with `ticketId`) is created and the studio is in scope.
- [ ] **Step 2: Write the failing test** — after the real RFQ-create in suite.mjs's technical/RFQ coverage, assert `readEngagementView(studio.id, deterministicEngId("ticket", rfq.ticketId)).members.rfq` includes the new rfq id.
- [ ] **Step 3: Run to verify it fails.**
- [ ] **Step 4: Implement** — after the rfq is created, add the guarded attach:
```ts
  try { await attachToTicketEngagement(studio.id, "rfq", rfq.id, rfq.ticketId); } catch { /* best-effort */ }
```
Import `attachToTicketEngagement` from `@/platform/db/engagement`. Confirm no hop assertion covers the RFQ-create route (report if one rises).
- [ ] **Step 5: Run to verify it passes** (targeted), then Commit:
```bash
git commit -am "Requesting an RFQ attaches it to the ticket's engagement"
```

---

### Task 3: Quotation creation attaches (converted → ticket engagement; internal → its own)

**Files:**
- Modify: the quotation-create paths — `convertRfq` (converted, has `ticketId`) and `createQuotation` (internal, no `ticketId`), in `src/modules/technical/quotations.ts`/`technical.ts`
- Test: `tests/suite.mjs`

- [ ] **Step 1:** Read both paths. `convertRfq` produces a quotation carrying `ticketId`; `createQuotation` (internal) produces one with `clientId`/`clientName` and no `ticketId`.
- [ ] **Step 2: Write the failing tests** — (a) convert an RFQ → assert the quotation is a member of the ticket's engagement; (b) create an internal quotation → assert it mints its own engagement at `deterministicEngId("quotation", quo.id)` with itself as member.
- [ ] **Step 3: Run to verify they fail.**
- [ ] **Step 4: Implement** —
  - In `convertRfq`, after the quotation is created: `try { await attachToTicketEngagement(studio.id, "quotation", quo.id, quo.ticketId); } catch {}`.
  - In `createQuotation` (internal), after the quotation is created and only when it has NO `ticketId`: `try { await attachQuotationEngagement(studio.id, quo, client ?? null); } catch {}` (resolve `client` from `clientId` if present, else null). Import both helpers.
  Confirm no hop assertion covers these routes.
- [ ] **Step 5: Run to verify they pass** (targeted), then Commit:
```bash
git commit -am "A quotation attaches to its engagement — the ticket's, or its own when internal"
```

---

### Task 4: Opening a project attaches it and records the approved quotation

**Files:**
- Modify: `openProject` in `src/modules/projects/projects.ts` (creates a project carrying `ticketId` + `quotationId`)
- Test: `tests/suite.mjs`

- [ ] **Step 1:** Read `openProject`; confirm the created `project` carries `ticketId` and `quotationId`, and the studio is in scope.
- [ ] **Step 2: Write the failing test** — open a project → assert `readEngagementView(studio.id, deterministicEngId("ticket", project.ticketId))` has `singletons.project === project.id` AND `singletons.approvedQuotation === project.quotationId`.
- [ ] **Step 3: Run to verify it fails.**
- [ ] **Step 4: Implement** — after the project is created:
```ts
  try {
    const engId = deterministicEngId("ticket", project.ticketId);
    await attachToTicketEngagement(studio.id, "project", project.id, project.ticketId);
    await setApprovedQuotation(studio.id, engId, project.quotationId);
  } catch { /* best-effort */ }
```
Import `deterministicEngId` (`@/platform/db/keys`), `attachToTicketEngagement` + `setApprovedQuotation` (`@/platform/db/engagement`). `attachRecord`'s singleton claim throws on a second project — but a project is opened once per ticket, and the guard swallows a re-attach; confirm the existing "already has a project" business rule still fires from the project module, not from the engagement attach. Confirm no hop assertion covers the route.
- [ ] **Step 5: Run to verify it passes** (targeted), then Commit:
```bash
git commit -am "Opening a project attaches it to the engagement and records the approved quotation"
```

---

### Task 5: CI wiring + full-suite proof

**Files:**
- Modify: `tests/suite.mjs` (register `tests/engagement-spine.mjs` the way the other engagement modules are registered)

- [ ] **Step 1:** Register `tests/engagement-spine.mjs`'s exports (sibling import, section header, `ok()` adapter, integration suite under the prefix), mirroring `engagement-oncreate.mjs`.
- [ ] **Step 2: Run the FULL `npm test`** (alone) — the spine helper tests plus the four create-path assertions (Tasks 2–4) plus all prior engagement tests execute and pass; Gate A 144/144, 0 failures; matrix + hops unregressed. Also `tsc`, strict `tsc`, `next build`.
- [ ] **Step 3: Commit:**
```bash
git commit -am "CI runs the engagement spine-attach tests"
```

---

## Self-Review

**Spec coverage:** rfq/quotation/project attach on create §5 → T2/T3/T4; internal-quotation own engagement §3.3 → T3; approved-quotation pointer §3.3 → T4; helpers → T1; CI → T5. **Deferred (correctly out of scope):** the project's children (invoices/orders/etc.) attaching on create (a later increment); the Phase-1a cleanup (score-by-`createdAt`, `dept`/`hasStage`, observability, reconcile job).

**Placeholder scan:** T1 carries full code; T2–T4 are guarded one-liners against named existing create functions the executor reads first.

**Type consistency:** `attachToTicketEngagement(studioId, type, recId, ticketId)`, `attachQuotationEngagement(studioId, quotation, client)`, `setApprovedQuotation(studioId, engId, quotationId)` defined in T1, consumed in T2–T4.

**The risks flagged for executors:** (1) each create path may have a hop-count assertion — confirm per task, STOP if one rises. (2) `openProject`'s singleton attach must not usurp the module's own "one project per ticket" rule — the engagement attach is a mirror, guarded; the authoritative refusal stays in `openProject`. (3) resolve the internal quotation's `client` correctly (from `clientId` if set, else the free-text `clientName` with `client = null`).
