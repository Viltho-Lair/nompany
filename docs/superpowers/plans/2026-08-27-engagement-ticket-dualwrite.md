# Ticket Creation Mints Its Engagement — Implementation Plan (Phase 1b-i)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a sales ticket is created, also write its engagement layer — **dual-write**: the ticket keeps its existing array-collection write unchanged, and alongside it we create/attach the engagement (root + singleton + indexes), using the SAME deterministic id and the SAME clustering logic the backfill uses, so a live-created ticket and a backfilled one are indistinguishable. No response changes.

**Architecture:** `createTicket` (sales.ts), after `Tickets.create`, reuses `buildEngagements` on the just-created ticket (+ its client) to produce a one-ticket descriptor and `applyDescriptor` to persist it. This is the first write-path increment of Phase 1b; RFQ/quotation/project attaches follow in 1b-ii…iv. The engagement write is **best-effort and reconcilable** (same discipline as `bumpMainAgg`): the ticket is authoritative; a missed engagement write is healed by re-running the backfill. The record response is byte-identical — the engagement write is a side effect.

**Tech Stack:** TypeScript, the Phase-0/1a engagement store (`src/platform/db/engagement.ts`) and clustering (`src/platform/engagement/backfill.ts`), the sales module (`src/modules/sales/sales.ts`), the `tests/suite.mjs` harness.

**Spec:** `docs/superpowers/specs/2026-08-26-engagement-storage-model-design.md` §3.5 (attach), §5 (dual-write during transition), §7b (compliance). Builds on Phase 0 + Phase 1a (both on `main`).

## Global Constraints

- **DUAL-WRITE, ADDITIVE.** The existing ticket write (`Tickets.create` + client fold + ref) is UNCHANGED. The engagement write is added ALONGSIDE it — never replacing, never editing the ticket after the fact beyond what the current code already does. No other existing record is touched.
- **Response byte-identical.** `createTicket`'s return value and every golden that exercises ticket creation stay identical. `NOMPANY_RECORD_GOLDENS` not set. If a golden changes, STOP — the engagement write must be a pure side effect.
- **Deterministic id — consistency with the backfill.** The engagement id is `deterministicEngId("ticket", ticket.id)` (via `buildEngagements`), so a live-created ticket lands on the SAME engagement a backfill would compute. Re-running the backfill over it is idempotent.
- **Best-effort, reconcilable (Inv. 8 spirit + spec §3.5).** The engagement write is wrapped so a failure logs and is swallowed — it must NEVER fail the ticket create (the ticket is the authority; the backfill reconciles a miss). Match how `bumpMainAgg` is fired from `addRow`.
- **Keys only in keys.ts (Inv. 1); writes via setJSON/zAdd (through `applyDescriptor`).**
- **Verify per task:** `npx tsc --noEmit`, strict `tsc`, the sales tests + a new engagement-on-create test, and the FULL `npm test` before the final commit — Gate A 144 goldens byte-identical, hop counts unregressed (the added write must not change the ASSERTED hop count of the ticket-create route; if it does, that is a real regression to surface, not to absorb).
- **Commit subjects declarative** (house style), ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: An engagement-on-create helper, reusing the backfill

**Files:**
- Modify: `src/platform/db/engagement.ts` (add `attachTicketEngagement`)
- Test: `tests/engagement-oncreate.mjs` (create)

**Interfaces:**
- Consumes: `buildEngagements` (`src/platform/engagement/backfill.ts`), `applyDescriptor` (this file).
- Produces: `attachTicketEngagement(studioId: string, ticket: Record<string,unknown>, client: Record<string,unknown> | null): Promise<string>` — builds the one-ticket descriptor and applies it; returns the engId. Never throws for a data reason (wrap internally is the CALLER's job — see Task 2 — this function itself is a thin, testable compose).

- [ ] **Step 1: Write the failing test** — `tests/engagement-oncreate.mjs`:

```js
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import { attachTicketEngagement, readEngagementView } from "../src/platform/db/engagement.ts";
assert.ok(KEY_PREFIX, "must run under a key prefix");

export async function testAttachTicketEngagement() {
  const sid = `s_${Date.now().toString(36)}`;
  const ticket = { id: "tk_9", clientId: "c1", clientName: "Acme", ref: "ACME-001", title: "Roof", industry: "Eng" };
  const client = { id: "c1", name: "Acme" };
  const engId = await attachTicketEngagement(sid, ticket, client);
  assert.equal(engId, deterministicEngId("ticket", "tk_9"), "deterministic id matches the backfill's");
  const view = await readEngagementView(sid, engId);
  assert.equal(view.singletons.ticket, "tk_9");
  assert.equal(view.context.clientName, "Acme");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => { for (const t of [testAttachTicketEngagement]) { await t(); console.log(`ok ${t.name}`); } })()
    .catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 2: Run to verify it fails** — preload the loader, run under `NOMPANY_KEY_PREFIX`. Expected: FAIL — `attachTicketEngagement` not exported.

- [ ] **Step 3: Write minimal implementation** — append to `engagement.ts`:

```ts
import { buildEngagements } from "../engagement/backfill";

// Dual-write helper: derive and persist the engagement for a just-created ticket,
// reusing the SAME clustering the backfill uses so a live ticket and a backfilled
// one are identical. Children (rfq/quotation/project) attach later as they're
// created (Phase 1b-ii+). Returns the deterministic engId.
export async function attachTicketEngagement(
  studioId: string, ticket: Record<string, unknown>, client: Record<string, unknown> | null,
): Promise<string> {
  const [descriptor] = buildEngagements({
    salesTickets: [ticket],
    salesClients: client ? [client] : [],
  });
  await applyDescriptor(studioId, descriptor);
  return descriptor.engId;
}
```

- [ ] **Step 4: Run to verify it passes** — module `ok`; both `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/engagement.ts tests/engagement-oncreate.mjs
git commit -m "A just-created ticket can get its engagement via the same clustering the backfill uses"
```

---

### Task 2: Wire the dual-write into `createTicket`

**Files:**
- Modify: `src/modules/sales/sales.ts` (`createTicket`, after the ticket is created)
- Test: `tests/suite.mjs` (extend the existing ticket-create coverage, or add an assertion block that a created ticket has an engagement)

**Interfaces:**
- Consumes: `attachTicketEngagement` (Task 1); the `client` already resolved in `createTicket`.

- [ ] **Step 1: Read `createTicket`** in `src/modules/sales/sales.ts` — find where `ticket` is created (`Tickets.create(...)`) and the `client` is in scope (it is — the upsert resolves `client` before the ticket write). Confirm the function returns `{ ticket }`.

- [ ] **Step 2: Write the failing test** — in `tests/suite.mjs`, near the existing sales-ticket coverage, after creating a ticket through the real `createTicket` path, assert the engagement layer exists:

```js
// dual-write: creating a ticket also mints its engagement (Phase 1b-i)
const engId = deterministicEngId("ticket", created.ticket.id);
const view = await readEngagementView(studio.id, engId);
ok("createTicket mints the ticket's engagement",
   view && view.singletons.ticket === created.ticket.id && !!view.context.clientName,
   JSON.stringify(view));
```
(Import `deterministicEngId` from `@/platform/db/keys` and `readEngagementView` from `@/platform/db/engagement` at the top of the block, matching how suite.mjs imports other helpers.)

- [ ] **Step 3: Run to verify it fails** — run the sales portion of `npm test` (or the whole suite). Expected: FAIL — no engagement for the created ticket.

- [ ] **Step 4: Write minimal implementation** — in `createTicket`, immediately after the ticket is created and before `return { ticket }`, add the guarded dual-write:

```ts
  // Dual-write the engagement layer (best-effort, reconcilable — the ticket is
  // the authority; a miss is healed by the backfill). Never fails the create.
  try {
    await attachTicketEngagement(studio.id, ticket, client);
  } catch (e) {
    log?.("engagement.attach.ticket.failed", { ticketId: ticket.id, error: String(e) });
  }
```
Import `attachTicketEngagement` from `@/platform/db/engagement` and use the module's existing logger (`log`/observability) — match how other best-effort side effects in this file report. If there is no logger in scope, swallow silently with a `// best-effort` comment rather than adding a new dependency.

- [ ] **Step 5: Run to verify it passes** — the new assertion passes; run the FULL `npm test`: **Gate A 144 goldens byte-identical** (the ticket response is unchanged), permission matrix green, and the ticket-create route's asserted **hop count is unchanged or the assertion is deliberately updated** (the added writes are new Redis commands — confirm whether the hop-count assertion counts them; if an asserted count rises, STOP and report so we decide whether to batch or accept). Also `tsc`, strict `tsc`, `next build`.

- [ ] **Step 6: Commit**

```bash
git add src/modules/sales/sales.ts tests/suite.mjs
git commit -m "Creating a sales ticket also mints its engagement, dual-written"
```

---

### Task 3: Wire the test module into CI

**Files:**
- Modify: `tests/suite.mjs` (register `tests/engagement-oncreate.mjs`, same convention as `tests/engagement.mjs`/`engagement-backfill.mjs`)

- [ ] **Step 1:** Register the module's exports the way the other engagement test modules are registered (sibling import, section header, `ok()` per test in the integration suite under the prefix).
- [ ] **Step 2:** Run `npm test`; confirm the on-create tests execute and pass and goldens are unchanged.
- [ ] **Step 3: Commit**

```bash
git add tests/suite.mjs
git commit -m "CI runs the engagement-on-create tests"
```

---

## Self-Review

**Spec coverage:** dual-write on ticket create §5 → T2; reuse of the backfill clustering for consistency §5.4 → T1; best-effort/reconcilable §3.5 → T2's guard; CI → T3. **Deferred (correctly out of 1b-i):** RFQ/quotation/project attaches (1b-ii…iv), `setApprovedQuotation` (1b-iv), the score-by-createdAt + `dept`/`hasStage` reconcile from Phase-1a's deferred minors (fold into the reconcile-job increment), centralizing the type vocabulary.

**Placeholder scan:** T1 carries full code; T2/T3 describe the wiring against named existing code the executor reads first (`createTicket`, how suite.mjs registers a module).

**Type consistency:** `attachTicketEngagement(studioId, ticket, client)` defined in T1, called in T2; `deterministicEngId`/`readEngagementView` are existing exports.

**The one risk to watch (flagged for the executor and the reviewer):** the ticket-create route now issues extra Redis writes (the engagement root + members + indexes). If Gate A asserts a hop/command count on that route, it may rise. That is not a golden change (the response is identical) but it IS a contract the plan must honor: confirm the asserted count, and either accept the rise deliberately (record why) or batch the engagement writes — do not silently let the assertion drift.
