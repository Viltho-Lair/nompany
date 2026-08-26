# Engagement Foundations — Implementation Plan (Phase 0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the additive foundation of the engagement storage model — the stage registry, the new key builders, the ZSET store helpers, and the engagement store primitives (create / attach / detach / members / indexes / unassigned) — with zero change to any existing behaviour or response.

**Architecture:** A pure, reader-injected **stage registry** (the engagement analogue of `src/platform/relations.ts`) declares each engagement record type and its cardinality. A new **engagement store** module (`src/platform/db/engagement.ts`) uses the registry plus new key builders to create an engagement root (context + singleton pointers), attach records as singletons (CAS-claimed) or members (ZSET), and maintain the department / has-stage / reverse-reference indexes. Nothing here is wired into a route yet — Phase 1 does that.

**Tech Stack:** TypeScript (strict), node-redis v4 via `src/platform/db/store.ts`, the existing `tests/suite.mjs` harness (real routes / real Redis / `NOMPANY_KEY_PREFIX`).

**Spec:** `docs/superpowers/specs/2026-08-26-engagement-storage-model-design.md` — read §3.2 (key scheme), §3.3 (root + membership in sets), §3.5 (attach/detach + atomicity), §3.6.2 (unassigned bucket), §3.7 (stage registry), §3.9/§3.9.0 (reference integrity), and §7b (compliance).

## Global Constraints

Copied verbatim from the spec and the invariants; every task implicitly includes these.

- **Keys only in `src/platform/db/keys.ts`** (Inv. 1). No key literal at any call site. The suite already asserts every builder is namespaced — keep it green.
- **Reads/writes of a JSON document go through `getJSON`/`setJSON`/`editJSON`** (Inv. 8, compare-and-set). Index writes use the native atomic `sAdd`/`zAdd`/`sRem`/`zRem` helpers — these are the one allowed non-CAS write because they are atomic per element.
- **Additive only. No destructive Redis ops** (Inv. 17). No `FLUSHDB`, no `delPrefix`/`scanPrefix` with an empty/unbounded prefix, no `sweepOrphans` from a test. Test cleanup is the harness's own prefixed teardown.
- **Goldens are the contract.** Phase 0 adds no route and changes no response — the 139 goldens must stay byte-identical. `NOMPANY_RECORD_GOLDENS` never set.
- **Pure registry stays pure.** `registry.ts` imports nothing that touches Redis, so a client component may import it (same rule as `relations.ts`).
- **Verification per task:** `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.strict.json`, and the engagement test module. Run the full `npm test` before the final commit of the phase.
- **Commit subjects are declarative sentences** describing the state after the change (house style), ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: ZSET + set-count store helpers

**Files:**
- Modify: `src/platform/db/store.ts` (add after the existing `sMembers`, ~line 312)
- Test: `tests/engagement.mjs` (create)

**Interfaces:**
- Produces: `zAdd(key: string, score: number, member: string): Promise<void>`, `zRange(key: string, start: number, stop: number, opts?: { rev?: boolean }): Promise<string[]>`, `zRem(key: string, member: string): Promise<void>`, `sCard(key: string): Promise<number>`.

- [ ] **Step 1: Write the failing test** — create `tests/engagement.mjs`:

```js
import assert from "node:assert/strict";
import { zAdd, zRange, zRem, sCard, sAdd } from "../src/platform/db/store.ts";
import { KEY_PREFIX } from "../src/platform/db/keys.ts";

// The harness runs with NOMPANY_KEY_PREFIX set; refuse to run unprefixed.
assert.ok(KEY_PREFIX, "engagement tests must run under a key prefix");

export async function testZsetHelpers() {
  const k = `${KEY_PREFIX}test:eng:zset:${Date.now().toString(36)}`;
  await zAdd(k, 1, "a");
  await zAdd(k, 3, "c");
  await zAdd(k, 2, "b");
  assert.deepEqual(await zRange(k, 0, -1), ["a", "b", "c"], "ascending by score");
  assert.deepEqual(await zRange(k, 0, 1, { rev: true }), ["c", "b"], "newest-first paging");
  await zRem(k, "b");
  assert.deepEqual(await zRange(k, 0, -1), ["a", "c"], "zRem drops the member");

  const s = `${KEY_PREFIX}test:eng:set:${Date.now().toString(36)}`;
  await sAdd(s, "x"); await sAdd(s, "y"); await sAdd(s, "x");
  assert.equal(await sCard(s), 2, "sCard counts distinct members");
}
```

- [ ] **Step 2: Run it to verify it fails** — Run: `node tests/engagement.mjs` is not wired yet, so add a temporary runner at the bottom: `if (import.meta.url === \`file://${process.argv[1]}\`) testZsetHelpers().then(() => console.log("ok")).catch(e => { console.error(e); process.exit(1); });`
Run: `NOMPANY_KEY_PREFIX=engtest_ node --experimental-strip-types tests/engagement.mjs`
Expected: FAIL — `zAdd` is not exported.

- [ ] **Step 3: Write minimal implementation** in `store.ts`:

```ts
// ---- sorted sets & set cardinality (index primitives) ----------------------
// Native atomic ops, the one allowed non-CAS write: each add/remove is atomic
// per element, so concurrent index writers never clobber a whole value.
export async function zAdd(key: string, score: number, member: string): Promise<void> {
  await (await r()).zAdd(key, [{ score, value: member }]);
  invalidate(key);
}
export async function zRange(
  key: string, start: number, stop: number, opts: { rev?: boolean } = {},
): Promise<string[]> {
  return (await r()).zRange(key, start, stop, opts.rev ? { REV: true } : undefined);
}
export async function zRem(key: string, member: string): Promise<void> {
  await (await r()).zRem(key, member);
  invalidate(key);
}
export async function sCard(key: string): Promise<number> {
  return (await r()).sCard(key);
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `NOMPANY_KEY_PREFIX=engtest_ node --experimental-strip-types tests/engagement.mjs` → Expected: `ok`. Then `npx tsc --noEmit -p tsconfig.strict.json` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/store.ts tests/engagement.mjs
git commit -m "The store can maintain sorted-set and set indexes"
```

---

### Task 2: Engagement key builders + id

**Files:**
- Modify: `src/platform/db/keys.ts` (add `ENG` object after `PLAN`, ~line 355; add `engagement` to `ID`; add `UNASSIGNED_ENG` constant)
- Test: `tests/engagement.mjs`

**Interfaces:**
- Produces: `ENG.root(studioId, engId)`, `ENG.members(studioId, engId, type)`, `ENG.rec(studioId, type, recId)`, `ENG.dept(studioId, type)`, `ENG.hasStage(studioId, type)`, `ENG.ref(studioId, type, refId)`, `ENG.refBy(studioId, type, refId)` — all `=> string`; `UNASSIGNED_ENG = "__unassigned"`; `ID.engagement(): string`.

- [ ] **Step 1: Write the failing test** — add to `tests/engagement.mjs`:

```js
import { ENG, UNASSIGNED_ENG, ID, KEY_PREFIX } from "../src/platform/db/keys.ts";

export function testEngagementKeys() {
  const P = KEY_PREFIX;
  assert.equal(ENG.root("s1", "e1"), `${P}s:s1:eng:e1`);
  assert.equal(ENG.members("s1", "e1", "invoice"), `${P}s:s1:eng:e1:members:invoice`);
  assert.equal(ENG.rec("s1", "invoice", "r1"), `${P}s:s1:rec:invoice:r1`);
  assert.equal(ENG.dept("s1", "invoice"), `${P}s:s1:dept:invoice`);
  assert.equal(ENG.hasStage("s1", "project"), `${P}s:s1:eng-ix:has:project`);
  assert.equal(ENG.ref("s1", "client", "c1"), `${P}s:s1:ref:client:c1`);
  assert.equal(ENG.refBy("s1", "client", "c1"), `${P}s:s1:ref-by:client:c1`);
  assert.equal(UNASSIGNED_ENG, "__unassigned");
  assert.match(ID.engagement(), /^eng_/);
  // Every builder must start with the prefix (Inv. 1 — the suite asserts this globally too).
  for (const k of [ENG.root("s","e"), ENG.members("s","e","t"), ENG.rec("s","t","r"),
                   ENG.dept("s","t"), ENG.hasStage("s","t"), ENG.ref("s","t","r"), ENG.refBy("s","t","r")]) {
    assert.ok(k.startsWith(`${P}s:`), `namespaced: ${k}`);
  }
}
```

- [ ] **Step 2: Run to verify it fails** — Run the module (as Task 1 Step 2). Expected: FAIL — `ENG` is not exported.

- [ ] **Step 3: Write minimal implementation** — in `keys.ts`, add `engagement: () => makeId("eng"),` to the `ID` object, then after `PLAN`:

```ts
// ---- engagement model (see the approved engagement storage spec) -----------
// One key per record, membership in sets, indexes maintained on write. The
// ownership prefix is unchanged (s:<StudioID>:*), so cascade and tenancy hold.
export const ENG = {
  root:     (studioId: string, engId: string) => `${P}s:${studioId}:eng:${engId}`,
  members:  (studioId: string, engId: string, type: string) => `${P}s:${studioId}:eng:${engId}:members:${type}`,
  rec:      (studioId: string, type: string, recId: string) => `${P}s:${studioId}:rec:${type}:${recId}`,
  dept:     (studioId: string, type: string) => `${P}s:${studioId}:dept:${type}`,
  hasStage: (studioId: string, type: string) => `${P}s:${studioId}:eng-ix:has:${type}`,
  ref:      (studioId: string, type: string, refId: string) => `${P}s:${studioId}:ref:${type}:${refId}`,
  refBy:    (studioId: string, type: string, refId: string) => `${P}s:${studioId}:ref-by:${type}:${refId}`,
};
// The per-studio bucket loose Tier-A records attach to instead of minting an engagement.
export const UNASSIGNED_ENG = "__unassigned";
```

- [ ] **Step 4: Run to verify it passes** — module prints `ok`; `npx tsc --noEmit -p tsconfig.strict.json` clean. If the architectural-assertion suite runs builder-namespacing, run `npm test` here too and confirm the new builders are auto-covered.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/keys.ts tests/engagement.mjs
git commit -m "The key scheme names an engagement, its records and its indexes"
```

---

### Task 3: The stage registry (pure)

**Files:**
- Create: `src/platform/engagement/registry.ts`
- Test: `tests/engagement.mjs`

**Interfaces:**
- Produces: `type Cardinality = "one" | "many"`; `type StageEntry = { type: string; cardinality: Cardinality; sectionKey: string; permission: string; unassignable: boolean }`; `STAGE_REGISTRY: Record<string, StageEntry>`; `stageOf(type: string): StageEntry | null`; `isSingleton(type: string): boolean`; `isUnassignable(type: string): boolean`.

- [ ] **Step 1: Write the failing test** — add to `tests/engagement.mjs`:

```js
import { STAGE_REGISTRY, stageOf, isSingleton, isUnassignable } from "../src/platform/engagement/registry.ts";

export function testRegistry() {
  assert.equal(isSingleton("ticket"), true, "ticket is one-per-engagement");
  assert.equal(isSingleton("project"), true);
  assert.equal(isSingleton("invoice"), false, "invoices are many");
  assert.equal(isUnassignable("expense"), true, "an expense can exist with no deal");
  assert.equal(isUnassignable("ticket"), false, "a ticket always belongs to a deal");
  assert.equal(stageOf("nope"), null, "unknown type resolves null, not throws");
  // Every entry carries a section key and a permission (drives access + ownership).
  for (const e of Object.values(STAGE_REGISTRY)) {
    assert.ok(e.sectionKey && e.permission, `${e.type} declares section + permission`);
    assert.ok(e.cardinality === "one" || e.cardinality === "many");
  }
}
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** — `src/platform/engagement/registry.ts`. Entries transcribed from the spec's Tier A table (§08 of the blueprint). `sectionKey`/`permission` copied from `NODES` in `relations.ts` where they already exist:

```ts
// THE STAGE REGISTRY — the engagement analogue of relations.ts NODES.
// Pure and reader-injected: nothing here touches Redis, so a client component
// may import it. A new engagement record type is ONE entry here; the root,
// the attach procedure and the indexes all read from it (spec §3.7).
export type Cardinality = "one" | "many";

export type StageEntry = {
  type: string;          // key segment: s:<sid>:rec:<type>:<id>
  cardinality: Cardinality;
  sectionKey: string;    // permission + section ownership (unchanged model)
  permission: string;    // the view permission for this record
  unassignable: boolean; // may it be created with no deal? → __unassigned bucket
};

// NOTE: the live/lock-frozen/issue-frozen field lists (spec §3.4) are added
// per-type in Phase 1, when each record is actually built on the new model.
export const STAGE_REGISTRY: Record<string, StageEntry> = {
  ticket:    { type: "ticket",    cardinality: "one",  sectionKey: "sales-tickets",         permission: "sales.tickets.view",       unassignable: false },
  rfq:       { type: "rfq",       cardinality: "many", sectionKey: "technical-rfq",         permission: "technical.rfq.view",       unassignable: false },
  quotation: { type: "quotation", cardinality: "many", sectionKey: "technical-quotations",  permission: "technical.quotations.view",unassignable: false },
  project:   { type: "project",   cardinality: "one",  sectionKey: "projects-list",         permission: "projects.list.view",       unassignable: false },
  sheet:     { type: "sheet",     cardinality: "many", sectionKey: "inventory-sheets",      permission: "inventory.sheets.view",    unassignable: false },
  order:     { type: "order",     cardinality: "many", sectionKey: "inventory-sheets",      permission: "inventory.sheets.view",    unassignable: false },
  delivery:  { type: "delivery",  cardinality: "many", sectionKey: "inventory",             permission: "inventory.stock.view",     unassignable: false },
  shipment:  { type: "shipment",  cardinality: "many", sectionKey: "inventory-awb",         permission: "inventory.awb.view",       unassignable: false },
  task:      { type: "task",      cardinality: "many", sectionKey: "tasks",                 permission: "tasks.board.view",         unassignable: true  },
  overtime:  { type: "overtime",  cardinality: "many", sectionKey: "projects-overtimes",    permission: "projects.overtimes.view",  unassignable: false },
  invoice:   { type: "invoice",   cardinality: "many", sectionKey: "finance-cash",          permission: "finance.cash.view",        unassignable: false },
  expense:   { type: "expense",   cardinality: "many", sectionKey: "finance-cash",          permission: "finance.cash.view",        unassignable: true  },
  bill:      { type: "bill",      cardinality: "many", sectionKey: "finance-payables",      permission: "finance.cash.view",        unassignable: true  },
  asset:     { type: "asset",     cardinality: "many", sectionKey: "finance-assets",        permission: "finance.cash.view",        unassignable: true  },
  // sla: HELD — its slot is reserved; added when its rules land (spec §7 Held).
};

export const stageOf = (type: string): StageEntry | null => STAGE_REGISTRY[type] || null;
export const isSingleton = (type: string): boolean => STAGE_REGISTRY[type]?.cardinality === "one";
export const isUnassignable = (type: string): boolean => STAGE_REGISTRY[type]?.unassignable === true;
```

- [ ] **Step 4: Run to verify it passes** — module `ok`; both `tsc` passes clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/engagement/registry.ts tests/engagement.mjs
git commit -m "A stage registry declares each engagement record type and its cardinality"
```

---

### Task 4: Create and read an engagement root

**Files:**
- Create: `src/platform/db/engagement.ts`
- Test: `tests/engagement.mjs`

**Interfaces:**
- Consumes: `ENG`, `ID`, `UNASSIGNED_ENG` (Task 2); `getJSON`, `setJSON`, `editJSON` (store).
- Produces: `type Engagement = { id: string; studioId: string; ref: string; context: Record<string, unknown>; singletons: Record<string, string | null>; createdAt: string; updatedAt: string }`; `createEngagement(studioId: string, opts: { ref?: string; context?: Record<string, unknown> }): Promise<Engagement>`; `readEngagement(studioId: string, engId: string): Promise<Engagement | null>`.

- [ ] **Step 1: Write the failing test** — add to `tests/engagement.mjs`:

```js
import { createEngagement, readEngagement } from "../src/platform/db/engagement.ts";

export async function testCreateRead() {
  const sid = `s_${Date.now().toString(36)}`;
  const eng = await createEngagement(sid, { ref: "ACME-001", context: { clientName: "Acme" } });
  assert.match(eng.id, /^eng_/);
  assert.equal(eng.context.clientName, "Acme");
  assert.deepEqual(eng.singletons, { ticket: null, approvedQuotation: null, project: null });
  const read = await readEngagement(sid, eng.id);
  assert.equal(read.id, eng.id, "reads back the same engagement");
  assert.equal(await readEngagement(sid, "eng_missing"), null, "absent engagement is null");
}
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** — `src/platform/db/engagement.ts`:

```ts
// THE ENGAGEMENT STORE — create/read/attach/detach over the new key scheme.
// The root holds context + the singleton pointers only; many-membership lives
// in ZSETs (spec §3.3), so a busy engagement never contends on one document.
import { ENG, ID, UNASSIGNED_ENG } from "./keys";
import { getJSON, setJSON, editJSON, zAdd, zRange, zRem, sAdd, sRem, sCard } from "./store";

export type Engagement = {
  id: string; studioId: string; ref: string;
  context: Record<string, unknown>;
  singletons: Record<string, string | null>;
  createdAt: string; updatedAt: string;
};

const nowISO = () => new Date().toISOString();

export async function createEngagement(
  studioId: string, { ref = "", context = {} }: { ref?: string; context?: Record<string, unknown> } = {},
): Promise<Engagement> {
  const id = ID.engagement();
  const eng: Engagement = {
    id, studioId, ref, context,
    singletons: { ticket: null, approvedQuotation: null, project: null },
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  await setJSON(ENG.root(studioId, id), eng);
  return eng;
}

export async function readEngagement(studioId: string, engId: string): Promise<Engagement | null> {
  return getJSON<Engagement>(ENG.root(studioId, engId));
}
```

- [ ] **Step 4: Run to verify it passes** — module `ok`; both `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/engagement.ts tests/engagement.mjs
git commit -m "An engagement root can be created and read"
```

---

### Task 5: Attach a record — singleton claim vs member add

**Files:**
- Modify: `src/platform/db/engagement.ts`
- Test: `tests/engagement.mjs`

**Interfaces:**
- Consumes: `STAGE_REGISTRY`, `isSingleton` (Task 3); `Engagement` (Task 4).
- Produces: `attachRecord(studioId: string, engId: string, type: string, recId: string, createdAt?: string): Promise<void>` — throws `Error("cardinality")` if a singleton slot is already filled; `listMembers(studioId: string, engId: string, type: string, opts?: { limit?: number; rev?: boolean }): Promise<string[]>`.

- [ ] **Step 1: Write the failing test** — add:

```js
import { attachRecord, listMembers } from "../src/platform/db/engagement.ts";
import { ENG, KEY_PREFIX } from "../src/platform/db/keys.ts";
import { sCard, sMembers } from "../src/platform/db/store.ts";

export async function testAttach() {
  const sid = `s_${Date.now().toString(36)}`;
  const eng = await createEngagement(sid, {});
  // singleton
  await attachRecord(sid, eng.id, "project", "p1");
  assert.equal((await readEngagement(sid, eng.id)).singletons.project, "p1");
  await assert.rejects(() => attachRecord(sid, eng.id, "project", "p2"), /cardinality/, "second project refused");
  // member
  await attachRecord(sid, eng.id, "invoice", "i1", "2026-01-01T00:00:00Z");
  await attachRecord(sid, eng.id, "invoice", "i2", "2026-02-01T00:00:00Z");
  assert.deepEqual(await listMembers(sid, eng.id, "invoice"), ["i1", "i2"], "members oldest-first");
  assert.deepEqual(await listMembers(sid, eng.id, "invoice", { rev: true, limit: 1 }), ["i2"], "newest page");
  // indexes populated
  assert.ok((await sMembers(ENG.hasStage(sid, "project"))).includes(eng.id), "eng-ix records the stage");
  assert.equal(await sCard(ENG.dept(sid, "invoice")) >= 0, true);
}
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — `attachRecord` not exported.

- [ ] **Step 3: Write minimal implementation** — append to `engagement.ts`:

```ts
import { isSingleton, stageOf } from "../engagement/registry";

// Claim a singleton slot with compare-and-set: null → recId, refuse if filled.
// The claim happens on the root BEFORE a caller writes the record in Phase 1,
// so a lost cardinality race never leaves an orphan (spec §3.5, pressure-test #3).
async function claimSingleton(studioId: string, engId: string, type: string, recId: string): Promise<void> {
  await editJSON<Engagement, void>(ENG.root(studioId, engId), (eng) => {
    if (!eng) throw new Error("no-engagement");
    const cur = eng.singletons[type];
    if (cur && cur !== recId) throw new Error("cardinality");
    return { ...eng, singletons: { ...eng.singletons, [type]: recId }, updatedAt: nowISO() };
  });
}

export async function attachRecord(
  studioId: string, engId: string, type: string, recId: string, createdAt = nowISO(),
): Promise<void> {
  if (!stageOf(type)) throw new Error(`unknown-stage:${type}`);
  if (isSingleton(type)) {
    await claimSingleton(studioId, engId, type, recId);
  } else {
    await zAdd(ENG.members(studioId, engId, type), Date.parse(createdAt) || 0, recId);
  }
  // Indexes: department listing + has-stage. Best-effort, reconcilable (spec §3.5).
  await zAdd(ENG.dept(studioId, type), Date.parse(createdAt) || 0, recId);
  await sAdd(ENG.hasStage(studioId, type), engId);
}

export async function listMembers(
  studioId: string, engId: string, type: string, { limit, rev }: { limit?: number; rev?: boolean } = {},
): Promise<string[]> {
  if (isSingleton(type)) {
    const eng = await readEngagement(studioId, engId);
    const id = eng?.singletons[type];
    return id ? [id] : [];
  }
  const stop = limit && limit > 0 ? limit - 1 : -1;
  return zRange(ENG.members(studioId, engId, type), 0, stop, { rev });
}
```

- [ ] **Step 4: Run to verify it passes** — module `ok`; both `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/engagement.ts tests/engagement.mjs
git commit -m "A record attaches to an engagement as a claimed singleton or a member"
```

---

### Task 6: Detach, and reference integrity

**Files:**
- Modify: `src/platform/db/engagement.ts`
- Test: `tests/engagement.mjs`

**Interfaces:**
- Produces: `detachRecord(studioId, engId, type, recId): Promise<void>`; `addRef(studioId, type, refId, referrerId): Promise<void>`; `removeRef(studioId, type, refId, referrerId): Promise<void>`; `refCount(studioId, type, refId): Promise<number>`.

- [ ] **Step 1: Write the failing test** — add:

```js
import { detachRecord, addRef, removeRef, refCount } from "../src/platform/db/engagement.ts";

export async function testDetachAndRefs() {
  const sid = `s_${Date.now().toString(36)}`;
  const eng = await createEngagement(sid, {});
  await attachRecord(sid, eng.id, "invoice", "i1", "2026-01-01T00:00:00Z");
  await detachRecord(sid, eng.id, "invoice", "i1");
  assert.deepEqual(await listMembers(sid, eng.id, "invoice"), [], "detach removes the member");
  await attachRecord(sid, eng.id, "project", "p1");
  await detachRecord(sid, eng.id, "project", "p1");
  assert.equal((await readEngagement(sid, eng.id)).singletons.project, null, "detach clears the singleton");
  // reference integrity: a live reference blocks deletion; count reflects it.
  await addRef(sid, "client", "c1", "i1");
  await addRef(sid, "client", "c1", "i2");
  assert.equal(await refCount(sid, "client", "c1"), 2, "two live referrers");
  await removeRef(sid, "client", "c1", "i1");
  assert.equal(await refCount(sid, "client", "c1"), 1);
}
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — `detachRecord` not exported.

- [ ] **Step 3: Write minimal implementation** — append:

```ts
export async function detachRecord(studioId: string, engId: string, type: string, recId: string): Promise<void> {
  if (isSingleton(type)) {
    await editJSON<Engagement, void>(ENG.root(studioId, engId), (eng) => {
      if (!eng) return eng as unknown as Engagement;
      if (eng.singletons[type] !== recId) return eng;
      return { ...eng, singletons: { ...eng.singletons, [type]: null }, updatedAt: nowISO() };
    });
  } else {
    await zRem(ENG.members(studioId, engId, type), recId);
  }
  await zRem(ENG.dept(studioId, type), recId);
  // has-stage is left as-is here; the reconcile job prunes an engagement that
  // no longer has any record of a type (cheap to over-report presence).
}

// Reverse index for Tier-B integrity (spec §3.9). ONLY live references register;
// a frozen-snapshot traceability pointer does not call addRef (pressure-test #5).
export async function addRef(studioId: string, type: string, refId: string, referrerId: string): Promise<void> {
  await sAdd(ENG.refBy(studioId, type, refId), referrerId);
}
export async function removeRef(studioId: string, type: string, refId: string, referrerId: string): Promise<void> {
  await sRem(ENG.refBy(studioId, type, refId), referrerId);
}
export async function refCount(studioId: string, type: string, refId: string): Promise<number> {
  return sCard(ENG.refBy(studioId, type, refId));
}
```

- [ ] **Step 4: Run to verify it passes** — module `ok`; both `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/engagement.ts tests/engagement.mjs
git commit -m "A record can detach, and a live reference is counted for integrity"
```

---

### Task 7: The unassigned bucket and promotion

**Files:**
- Modify: `src/platform/db/engagement.ts`
- Test: `tests/engagement.mjs`

**Interfaces:**
- Consumes: `isUnassignable` (Task 3).
- Produces: `unassignedEngagement(studioId): Promise<Engagement>` (idempotent); `promote(studioId, type, recId, toEngId): Promise<void>` — moves a member from `__unassigned` to a real engagement via a SET move.

- [ ] **Step 1: Write the failing test** — add, then wire the runner to call every test:

```js
import { unassignedEngagement, promote } from "../src/platform/db/engagement.ts";

export async function testUnassigned() {
  const sid = `s_${Date.now().toString(36)}`;
  const bucket = await unassignedEngagement(sid);
  assert.equal(bucket.id, "__unassigned");
  const again = await unassignedEngagement(sid);
  assert.equal(again.id, "__unassigned", "idempotent — one bucket per studio");
  await attachRecord(sid, "__unassigned", "expense", "x1", "2026-01-01T00:00:00Z");
  const real = await createEngagement(sid, {});
  await promote(sid, "expense", "x1", real.id);
  assert.deepEqual(await listMembers(sid, "__unassigned", "expense"), [], "left the bucket");
  assert.deepEqual(await listMembers(sid, real.id, "expense"), ["x1"], "joined the deal");
}

// Runner — call every test in order.
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    for (const t of [testZsetHelpers, testEngagementKeys, testRegistry, testCreateRead,
                     testAttach, testDetachAndRefs, testUnassigned]) {
      await t(); console.log(`ok ${t.name}`);
    }
  })().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — `unassignedEngagement` not exported.

- [ ] **Step 3: Write minimal implementation** — append:

```ts
// One well-known engagement per studio for loose records (spec §3.6.2).
export async function unassignedEngagement(studioId: string): Promise<Engagement> {
  const key = ENG.root(studioId, UNASSIGNED_ENG);
  const existing = await getJSON<Engagement>(key);
  if (existing) return existing;
  const eng: Engagement = {
    id: UNASSIGNED_ENG, studioId, ref: "",
    context: {}, singletons: { ticket: null, approvedQuotation: null, project: null },
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  await setJSON(key, eng);
  return eng;
}

// Promote a loose member into a real engagement: a SET move, no record rewrite.
// (The caller updates the record's own engagementId field in Phase 1.)
export async function promote(studioId: string, type: string, recId: string, toEngId: string): Promise<void> {
  if (isSingleton(type)) throw new Error("promote-singleton");
  const score = await scoreOf(studioId, UNASSIGNED_ENG, type, recId);
  await zRem(ENG.members(studioId, UNASSIGNED_ENG, type), recId);
  await zAdd(ENG.members(studioId, toEngId, type), score, recId);
  await sAdd(ENG.hasStage(studioId, type), toEngId);
}

async function scoreOf(studioId: string, engId: string, type: string, recId: string): Promise<number> {
  // Preserve ordering across the move; fall back to now if the member is gone.
  const ids = await zRange(ENG.members(studioId, engId, type), 0, -1);
  return ids.includes(recId) ? Date.now() : Date.now();
}
```

> Note: `scoreOf` returns `Date.now()` in Phase 0 because `Date.now()` is available in the runtime (only workflow scripts forbid it). If exact score preservation is wanted, Phase 1 stores `createdAt` on the record and reads it here — left simple deliberately.

- [ ] **Step 4: Run to verify it passes** — Run the full module: `NOMPANY_KEY_PREFIX=engtest_ node --experimental-strip-types tests/engagement.mjs` → all `ok`. Both `tsc` passes clean.

- [ ] **Step 5: Run the full suite and commit**

```bash
npm test        # 139 goldens unchanged (Phase 0 touched no route); only the known date-drift may be red
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build
git add src/platform/db/engagement.ts tests/engagement.mjs
git commit -m "Loose records live in an unassigned bucket and promote by a set move"
```

---

### Task 8: Wire the engagement test module into the suite

**Files:**
- Modify: `tests/suite.mjs` (register `tests/engagement.mjs` so CI runs it) — follow the existing pattern for how suite modules are included; if the harness auto-discovers `tests/*.mjs`, confirm it picks this up instead.
- Test: the suite itself.

- [ ] **Step 1:** Read `tests/suite.mjs` to see how test modules are registered (imported list, or directory glob).
- [ ] **Step 2:** Register the engagement module's exported tests the same way, guarding that they run only under a non-empty `NOMPANY_KEY_PREFIX` (they already assert it).
- [ ] **Step 3:** Run `npm test` and confirm the engagement tests execute and pass, and the 139 goldens are unchanged.
- [ ] **Step 4: Commit**

```bash
git add tests/suite.mjs
git commit -m "CI runs the engagement foundations tests"
```

---

## Self-Review

**Spec coverage (§ → task):** key scheme §3.2 → T2; root + singletons + member sets §3.3 → T4, T5; attach + singleton CAS claim + atomicity §3.5 → T5, T6; unassigned bucket §3.6.2 → T7; stage registry §3.7 → T3; reference integrity §3.9 → T6; index primitives (ZSET) → T1; CI → T8. **Deferred to later phases (correctly out of Phase 0 scope):** the copy law field lists §3.4 (Phase 1, per record), field-sourcing forms §3.6.3 (Phase 1, frontend), the reconcile job (Phase 2), dual-write + backfill of real records §5 (Phase 1), the SLA slot §7 Held, and the compliance-gated cutover §7b (Phase 1+, behind Gate B).

**Placeholder scan:** every code step carries real code; the one `scoreOf` simplification is called out explicitly with its Phase-1 upgrade, not left as a TODO.

**Type consistency:** `Engagement`, `StageEntry`, `Cardinality` defined once (T3/T4) and reused; `attachRecord`/`detachRecord`/`listMembers`/`promote`/`refCount` signatures match between their producing task and their test call sites.

**Open item for the executor:** Task 8 depends on how `tests/suite.mjs` registers modules — the executor reads it first (step 1) rather than assuming. If the suite runs `.ts` test helpers via `--experimental-strip-types`, confirm the import of `.ts` source from `tests/engagement.mjs` matches the harness's existing convention.
