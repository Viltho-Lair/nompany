# Engagement Backfill + Read Layer — Implementation Plan (Phase 1a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive an engagement layer from the EXISTING data — cluster every ticket→RFQ→quotation→project chain into an engagement root and populate its indexes — and expose a read view that assembles an engagement from that layer, **without changing any existing record, any route, or any response.** This proves the engagement model against real production chains before Phase 1b starts moving write paths.

**Architecture:** A pure, reader-injected clustering module (`src/platform/engagement/backfill.ts`) turns in-memory collections into engagement descriptors — same purity discipline as `relations.ts` and the Phase-0 registry. A backfill CLI writes those descriptors as engagement roots + member ZSETs + a record→engagement reverse index (all NEW `ENG.*`/`recEng` keys — nothing existing is touched), prefix-validated first and live-gated. A `readEngagementView` function reads that layer back and resolves each stage's records. Existing records keep their array collections and their own read paths untouched.

**Tech Stack:** TypeScript (strict), node-redis v4 via `src/platform/db/store.ts`, the Phase-0 engagement store (`src/platform/db/engagement.ts`), `src/platform/relations.ts` for the chain edges, the `tests/suite.mjs` harness under `NOMPANY_KEY_PREFIX`.

**Spec:** `docs/superpowers/specs/2026-08-26-engagement-storage-model-design.md` — §5.4 (backfill algorithm), §3.3 (root + membership), §3.5 (attach), §3.9.0 (embedded-row refs), §7b (compliance). Builds on Phase 0 (`docs/superpowers/plans/2026-08-26-engagement-foundations.md`, branch `engagement-phase-0`, merged/available).

## Global Constraints

- **READ-LAYER ONLY. No existing record, route, or response changes.** The backfill writes only NEW keys (`ENG.*`, and a new `recEng` reverse index); it never edits a `salesTickets`/`quotations`/`projects`/etc. row. The 139/144 goldens stay byte-identical; `NOMPANY_RECORD_GOLDENS` not set.
- **Keys only in `src/platform/db/keys.ts`** (Inv. 1).
- **Reads/writes via `getJSON`/`setJSON`/`editJSON`**; index writes via native atomic `zAdd`/`sAdd` (Inv. 8).
- **Additive & reversible. No destructive Redis ops** (Inv. 17). The backfill CLI is dry-run by default, refuses the live namespace without `--allow-live`, writes only with `--apply`, and can be fully undone by deleting the `ENG.*`/`recEng` keys it created (a bounded, explicit-key-list delete — never a broad scan). Validate under a `NOMPANY_KEY_PREFIX` before any live run.
- **The clustering module (`backfill.ts`) is PURE** — no Redis import; testable against plain arrays; importable by a client component.
- **Cluster with `relations.ts`, don't reinvent edges.** Use its declared ticket→rfq/quotation/project edges and the project→children reverse edges.
- **Idempotent & re-runnable:** running the backfill twice produces the same engagement layer (deterministic engagement ids derived from the chain head, not random), so a half-finished run is safe to resume.
- **Verify per task:** `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.strict.json`, and the new test module. Full `npm test` before the final commit.
- **Commit subjects are declarative sentences** (house style), ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Deterministic engagement id + `recEng` reverse-index key

**Files:**
- Modify: `src/platform/db/keys.ts` (add `ENG.recEng` builder; add `engagementFor(headType, headId)` deterministic id helper)
- Test: `tests/engagement-backfill.mjs` (create)

**Interfaces:**
- Produces: `ENG.recEng(studioId, type, recId): string` → `s:<sid>:rec-eng:<type>:<recId>` (value = engId); `deterministicEngId(headType: string, headId: string): string` → a stable `eng_…`-shaped id derived from the chain head (so re-running the backfill yields the same engagement id, not a new random one).

- [ ] **Step 1: Write the failing test** — create `tests/engagement-backfill.mjs`:

```js
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ENG, deterministicEngId, KEY_PREFIX } from "../src/platform/db/keys.ts";

assert.ok(KEY_PREFIX, "backfill tests must run under a key prefix");

export function testKeysAndDetId() {
  const P = KEY_PREFIX;
  assert.equal(ENG.recEng("s1", "invoice", "i1"), `${P}s:s1:rec-eng:invoice:i1`);
  const a = deterministicEngId("ticket", "tk_9");
  const b = deterministicEngId("ticket", "tk_9");
  assert.equal(a, b, "same head → same engagement id (idempotent backfill)");
  assert.notEqual(a, deterministicEngId("ticket", "tk_10"), "different head → different id");
  assert.match(a, /^eng_/, "engagement-id shaped");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => { for (const t of [testKeysAndDetId]) { await t(); console.log(`ok ${t.name}`); } })()
    .catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 2: Run to verify it fails** — preload the repo loader via `--import` and run under `NOMPANY_KEY_PREFIX` (as Phase 0's tests do). Expected: FAIL — `ENG.recEng`/`deterministicEngId` not exported.

- [ ] **Step 3: Write minimal implementation** — in `keys.ts`, add to the `ENG` object: `recEng: (studioId, type, recId) => \`${P}s:${studioId}:rec-eng:${type}:${recId}\`,`. Then add a deterministic id builder near `makeId` (it must NOT use `Date.now()`/`Math.random()` — it derives from the head so it is stable):

```ts
import { createHash } from "node:crypto";
// A stable engagement id for a chain, derived from its head record so re-running
// the backfill maps the same chain to the same engagement (idempotent, spec §5.4).
export function deterministicEngId(headType: string, headId: string): string {
  const h = createHash("sha1").update(`${headType}:${headId}`).digest("hex").slice(0, 12);
  return `eng_${h}`;
}
```

- [ ] **Step 4: Run to verify it passes** — module prints `ok testKeysAndDetId`; both `tsc` clean; the builder-namespacing suite still green with the new `ENG.recEng`.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/keys.ts tests/engagement-backfill.mjs
git commit -m "The key scheme maps a record back to its engagement, deterministically per chain"
```

---

### Task 2: Pure clustering — chains → engagement descriptors

**Files:**
- Create: `src/platform/engagement/backfill.ts`
- Test: `tests/engagement-backfill.mjs`

**Interfaces:**
- Consumes: `deterministicEngId` (Task 1); `EDGES`/`NODES` from `src/platform/relations.ts` (chain edges).
- Produces: `type EngagementDescriptor = { engId: string; ref: string; context: Record<string, unknown>; singletons: { ticket: string|null; approvedQuotation: string|null; project: string|null }; members: Record<string, string[]> }`; `buildEngagements(collections: Record<string, Record<string,unknown>[]>): EngagementDescriptor[]` — pure, no Redis.

- [ ] **Step 1: Write the failing test** — add to `tests/engagement-backfill.mjs`:

```js
import { buildEngagements } from "../src/platform/engagement/backfill.ts";

export function testCluster() {
  const collections = {
    salesTickets: [{ id: "tk_1", clientId: "c1", clientName: "Acme", title: "Roof", ref: "ACME-001",
                     contactName: "Sam", location: { city: "X" }, industry: "Eng", urgency: "Normal", deadline: "2027-01-01" }],
    salesClients: [{ id: "c1", name: "Acme" }],
    rfqs: [{ id: "rfq_1", ticketId: "tk_1" }],
    quotations: [{ id: "quo_1", ticketId: "tk_1", createdAt: "2026-01-01" },
                 { id: "quo_2", ticketId: "tk_1", createdAt: "2026-02-01" }],
    projects: [{ id: "pro_1", ticketId: "tk_1", quotationId: "quo_2" }],
    invoices: [{ id: "inv_1", projectId: "pro_1" }, { id: "inv_2", projectId: "pro_1" }],
  };
  const descs = buildEngagements(collections);
  assert.equal(descs.length, 1, "one engagement for the one chain");
  const d = descs[0];
  assert.equal(d.singletons.ticket, "tk_1");
  assert.equal(d.singletons.project, "pro_1");
  assert.deepEqual(d.members.quotations.sort(), ["quo_1", "quo_2"], "both quotations are members");
  assert.deepEqual(d.members.invoices.sort(), ["inv_1", "inv_2"], "project's invoices attach to the engagement");
  assert.equal(d.context.clientId, "c1", "live client ref carried as context");
  assert.equal(d.ref, "ACME-001", "engagement takes the ticket ref");
}
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** — `src/platform/engagement/backfill.ts`. Cluster from each ticket (the chain head); orphan quotations/projects with no ticket get their own engagement. Use `relations.ts` edge keys (`ticketId`, `projectId`, `quotationId`) rather than hardcoding:

```ts
// PURE clustering for the engagement backfill (spec §5.4). Walks each existing
// ticket→rfq/quotation/project chain and the project's children into one
// engagement descriptor. No Redis: a CLI (Task 3) turns these into keys.
import { deterministicEngId } from "../db/keys";

export type EngagementDescriptor = {
  engId: string; ref: string;
  context: Record<string, unknown>;
  singletons: { ticket: string | null; approvedQuotation: string | null; project: string | null };
  members: Record<string, string[]>;
};

const byField = (rows: Record<string, unknown>[], field: string, val: unknown) =>
  rows.filter((r) => r[field] === val);

export function buildEngagements(c: Record<string, Record<string, unknown>[]>): EngagementDescriptor[] {
  const tickets = c.salesTickets || [];
  const clients = c.salesClients || [];
  const clientById = new Map(clients.map((x) => [x.id as string, x]));
  const out: EngagementDescriptor[] = [];

  const memberTypes: [string, string][] = [
    ["rfqs", "rfqs"], ["quotations", "quotations"],
    ["invoices", "invoices"], ["expenses", "expenses"], ["orders", "materialOrders"],
    ["deliveries", "deliveries"], ["shipments", "awbShipments"], ["tasks", "tasks"],
    ["overtimes", "overtimes"], ["sheets", "projectSheets"],
  ];

  for (const t of tickets) {
    const engId = deterministicEngId("ticket", t.id as string);
    const project = byField(c.projects || [], "ticketId", t.id)[0] || null;
    const quotations = byField(c.quotations || [], "ticketId", t.id);
    // "the quotation this ticket is worth" — newest by createdAt (spec/relations rule).
    const approved = [...quotations].sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;

    const members: Record<string, string[]> = {};
    members.rfqs = byField(c.rfqs || [], "ticketId", t.id).map((r) => r.id as string);
    members.quotations = quotations.map((q) => q.id as string);
    if (project) {
      for (const [slot, coll] of memberTypes) {
        if (slot === "rfqs" || slot === "quotations") continue;
        members[slot] = byField(c[coll] || [], "projectId", project.id).map((r) => r.id as string);
      }
    }

    const client = clientById.get(t.clientId as string);
    out.push({
      engId, ref: (t.ref as string) || "",
      context: {
        clientId: (t.clientId as string) || null,
        clientName: client ? (client.name as string) : (t.clientName as string) || "",
        industry: (t.industry as string) || "", urgency: (t.urgency as string) || "",
        title: (t.title as string) || "", deadline: (t.deadline as string) || "",
        contact: { name: (t.contactName as string) || "" }, site: t.location || {},
      },
      singletons: { ticket: t.id as string, approvedQuotation: approved ? (approved.id as string) : null,
                    project: project ? (project.id as string) : null },
      members,
    });
  }

  // Orphan (internal) quotations with no ticket → their own engagement.
  for (const q of c.quotations || []) {
    if (q.ticketId) continue;
    const engId = deterministicEngId("quotation", q.id as string);
    out.push({
      engId, ref: (q.number as string) || "",
      context: { clientId: (q.clientId as string) || null, clientName: (q.clientName as string) || "",
                 industry: (q.industry as string) || "", title: (q.title as string) || "", deadline: (q.deadline as string) || "",
                 contact: {}, site: {} },
      singletons: { ticket: null, approvedQuotation: null, project: null },
      members: { quotations: [q.id as string] },
    });
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes** — module `ok testCluster`; both `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/engagement/backfill.ts tests/engagement-backfill.mjs
git commit -m "Existing chains cluster into engagement descriptors, purely"
```

---

### Task 3: Persist a descriptor + the read view

**Files:**
- Modify: `src/platform/db/engagement.ts` (add `applyDescriptor`, `readEngagementView`, `engagementOf`)
- Test: `tests/engagement-backfill.mjs`

**Interfaces:**
- Consumes: `EngagementDescriptor` (Task 2); Phase-0 `createEngagement`/`attachRecord`; `ENG.recEng` (Task 1).
- Produces: `applyDescriptor(studioId, d: EngagementDescriptor): Promise<void>` (writes root + members + `recEng` reverse index — idempotent); `engagementOf(studioId, type, recId): Promise<string|null>` (reverse lookup); `readEngagementView(studioId, engId): Promise<{ context; singletons; members: Record<string,string[]> } | null>` (assemble from the layer).

- [ ] **Step 1: Write the failing test** — add to `tests/engagement-backfill.mjs`:

```js
import { applyDescriptor, readEngagementView, engagementOf } from "../src/platform/db/engagement.ts";

export async function testApplyAndRead() {
  const sid = `s_${Date.now().toString(36)}`;
  const [d] = buildEngagements({
    salesTickets: [{ id: "tk_1", clientId: "c1", clientName: "Acme", ref: "ACME-001", title: "Roof" }],
    salesClients: [{ id: "c1", name: "Acme" }],
    quotations: [{ id: "quo_1", ticketId: "tk_1", createdAt: "2026-01-01" }],
    projects: [{ id: "pro_1", ticketId: "tk_1" }],
    invoices: [{ id: "inv_1", projectId: "pro_1" }],
  });
  await applyDescriptor(sid, d);
  const view = await readEngagementView(sid, d.engId);
  assert.equal(view.context.clientName, "Acme");
  assert.equal(view.singletons.ticket, "tk_1");
  assert.equal(view.singletons.project, "pro_1");
  assert.deepEqual(view.members.quotations, ["quo_1"]);
  assert.deepEqual(view.members.invoices, ["inv_1"]);
  assert.equal(await engagementOf(sid, "invoice", "inv_1"), d.engId, "reverse index resolves");
  // Idempotent: re-applying yields the same view (no duplicate members).
  await applyDescriptor(sid, d);
  const again = await readEngagementView(sid, d.engId);
  assert.deepEqual(again.members.invoices, ["inv_1"], "re-apply does not duplicate");
}
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — `applyDescriptor` not exported.

- [ ] **Step 3: Write minimal implementation** — append to `engagement.ts`:

```ts
import type { EngagementDescriptor } from "../engagement/backfill";

// Persist a backfill descriptor as the engagement layer. Idempotent: the root is
// set (not appended), members are re-added to a set (ZADD is idempotent per id),
// and the reverse index is re-pointed. Writes only ENG.* / recEng keys — never an
// existing record (read-layer discipline, spec Phase 1a).
export async function applyDescriptor(studioId: string, d: EngagementDescriptor): Promise<void> {
  await setJSON(ENG.root(studioId, d.engId), {
    id: d.engId, studioId, ref: d.ref, context: d.context,
    singletons: d.singletons, createdAt: nowISO(), updatedAt: nowISO(),
  });
  for (const [type, ids] of Object.entries(d.members)) {
    for (const recId of ids) {
      await zAdd(ENG.members(studioId, d.engId, type), 0, recId);
      await setJSON(ENG.recEng(studioId, type, recId), d.engId);
    }
  }
  for (const [slot, recId] of Object.entries(d.singletons)) {
    if (recId) await setJSON(ENG.recEng(studioId, slot, recId), d.engId);
  }
}

export async function engagementOf(studioId: string, type: string, recId: string): Promise<string | null> {
  return getJSON<string>(ENG.recEng(studioId, type, recId));
}

// Assemble the engagement from the layer (root + every member set). Record
// bodies are resolved by the caller from their own collections — this returns ids.
export async function readEngagementView(
  studioId: string, engId: string,
): Promise<{ context: Record<string, unknown>; singletons: Record<string, string | null>; members: Record<string, string[]> } | null> {
  const root = await readEngagement(studioId, engId);
  if (!root) return null;
  const members: Record<string, string[]> = {};
  for (const type of ["rfqs", "quotations", "invoices", "expenses", "orders",
                      "deliveries", "shipments", "tasks", "overtimes", "sheets"]) {
    const ids = await zRange(ENG.members(studioId, engId, type), 0, -1);
    if (ids.length) members[type] = ids;
  }
  return { context: root.context, singletons: root.singletons, members };
}
```

- [ ] **Step 4: Run to verify it passes** — module `ok testApplyAndRead`; both `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/engagement.ts tests/engagement-backfill.mjs
git commit -m "A backfill descriptor persists as the engagement layer and reads back as a view"
```

---

### Task 4: The backfill CLI (prefix-safe, dry-run default, live-gated)

**Files:**
- Create: `scripts/migrate/backfill-engagements.mjs`
- Test: `tests/engagement-backfill.mjs` (an end-to-end test that seeds a prefixed studio, runs the backfill in-process, and checks the layer matches — no separate process needed)

**Interfaces:**
- Consumes: `buildEngagements` (Task 2), `applyDescriptor`/`readEngagementView` (Task 3), the repository reads for the source collections.
- Produces: a CLI with flags `--studio <id>` (optional; all studios otherwise), `--allow-live` (required to touch the empty-prefix namespace), `--apply` (required to write; dry-run prints a plan otherwise). Also an exported `backfillStudio(studioId, { apply }): Promise<{ engagements: number; records: number }>` so the test can drive it in-process.

- [ ] **Step 1: Write the failing test** — add `testBackfillStudio` to `tests/engagement-backfill.mjs`: seed a prefixed studio's ticket/quotation/project/invoice collections via the repository, call `backfillStudio(sid, { apply: true })`, then assert `readEngagementView` for the deterministic engId shows the ticket/project/quotation/invoice. (Follow how `tests/suite.mjs` seeds a studio + section collections; reuse those helpers rather than writing raw keys.)

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — `backfillStudio` not exported.

- [ ] **Step 3: Write minimal implementation** — `scripts/migrate/backfill-engagements.mjs`, modelled on the existing `scripts/migrate/plant-sections.mjs` (dry-run default, `--allow-live` gate, `assertScopedPrefix`-style safety). `backfillStudio` reads the source collections through the repository, runs `buildEngagements`, and (when `apply`) calls `applyDescriptor` for each. Dry-run returns/prints counts and a sample without writing. NEVER deletes; only `ENG.*`/`recEng` writes.

- [ ] **Step 4: Run to verify it passes** — `testBackfillStudio` green; both `tsc` clean; `node scripts/migrate/backfill-engagements.mjs` with no flags prints a dry-run plan and writes nothing.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate/backfill-engagements.mjs tests/engagement-backfill.mjs
git commit -m "A guarded CLI backfills existing chains into the engagement layer"
```

---

### Task 5: Parity check + CI wiring

**Files:**
- Modify: `tests/engagement-backfill.mjs` (add a parity test); `tests/suite.mjs` (register the module, same as Phase 0's Task 8)
- Test: the suite itself.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the failing parity test** — add `testParity`: seed a studio with a full chain (ticket + client + 2 quotations + project + 2 invoices + 1 task), run `backfillStudio(sid, { apply: true })`, then assert the engagement view's resolved records EQUAL what the existing read paths return — specifically: the view's client context equals the live client's name; `members.quotations` equals the ticket's quotations; `singletons.project` equals `projectFor(ticket)`; `members.invoices` equals the project's invoices. This is the "the layer matches today's data" proof.

- [ ] **Step 2: Run to verify it fails** (before wiring) then implement any resolver glue needed (no new production behaviour — just the test asserting equality).

- [ ] **Step 3: Wire into the suite** — register `tests/engagement-backfill.mjs`'s exports in `tests/suite.mjs` exactly as `tests/engagement.mjs` was wired in Phase 0 (Task 8): sibling import, section header, `ok(...)` per test, inside the integration suite so it runs under the prefix.

- [ ] **Step 4: Run the full suite** — `npm test`: the backfill tests execute and pass; 144 goldens byte-identical (this phase changed no route/response); permission matrix + hop counts unregressed. Both `tsc` and `npx next build` clean.

- [ ] **Step 5: Commit**

```bash
git add tests/engagement-backfill.mjs tests/suite.mjs
git commit -m "CI proves the backfilled engagement layer matches the live chains"
```

---

## The live backfill run (GATED — not a code task)

After this branch merges, the actual backfill against live studios is a **separate, user-confirmed operation**, not part of the plan's automated steps:
1. Dry-run against live read-only (`--allow-live`, no `--apply`) — prints the plan (how many engagements/records per studio). Read-only, safe.
2. Present the plan to the user; on explicit confirmation, run `--allow-live --apply`.
3. Re-scan to prove the layer, spot-check `readEngagementView` against a few known chains.
This writes only `ENG.*`/`recEng` keys and is reversible by deleting exactly those keys. No existing record is touched. (Invariant 17: additive, explicit-key, re-scan-proven.)

## Self-Review

**Spec coverage (§ → task):** backfill algorithm §5.4 → T2; deterministic/idempotent id §5.4 → T1; root+membership persistence §3.3/§3.5 → T3; reverse index for record→engagement → T1/T3; parity-with-live proof (the Phase-1a purpose) → T5; the gated live run → the section above (correctly NOT an automated step). **Deferred (correctly out of Phase 1a):** any write-path/route change (Phase 1b), `setApprovedQuotation` as a live op (Phase 1b — here `approvedQuotation` is derived by the backfill), dual-write (Phase 1b), tombstones/schemaVersion (later).

**Placeholder scan:** T1–T3 carry full code; T4/T5 describe the CLI and parity glue against existing patterns (`plant-sections.mjs`, Phase-0 Task 8) rather than restating them — an executor reads those two files first (named in the tasks).

**Type consistency:** `EngagementDescriptor` defined once (T2), consumed by T3/T4; `buildEngagements`/`applyDescriptor`/`readEngagementView`/`engagementOf`/`backfillStudio` signatures match between producer and caller.

**Executor notes:** (1) T4/T5 depend on how `tests/suite.mjs` seeds a studio and its section collections and how it registers modules — read it first (it was extended in Phase 0). (2) `deterministicEngId` must not use `Date.now()`/`Math.random()` — it derives from the head so the backfill is idempotent. (3) Everything here is additive; if any step would require editing an existing record, STOP — that belongs to Phase 1b, not 1a.
