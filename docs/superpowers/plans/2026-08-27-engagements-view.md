# The Engagements View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/<slug>/engagements` — the first screen that reads the engagement layer. A list of the studio's deals and a drill-in block per deal, where each stage card is filtered by the permission that stage already declares, so every department reads its own part of the same engagement.

**Architecture:** A `createdAt`-scored ZSET index makes enumerating a studio's engagements O(page). A new read module (`src/modules/main/engagements.ts`) turns that index plus `readEngagementView` into a list and a block, filtering stages through the stage registry's own `permission`. Two GET routes serve them. A non-section route in the studio page renders the screen, reached from a nav entry above People. Read-only.

**Tech Stack:** TypeScript (strict), the Phase-0/1a engagement store, `src/platform/access` (catalogue + `can`/`requirePermission`), Next.js App Router, the `tests/suite.mjs` + `tests/gate-a.mjs` harness.

**Spec:** `docs/superpowers/specs/2026-08-27-engagements-view-design.md` — read it first; it is the binding authority. It builds on `docs/superpowers/specs/2026-08-26-engagement-storage-model-design.md`.

## Global Constraints

- **The safety property is the point of this feature.** The view must never reveal a record the viewer could not already see on that record's own department screen. Every stage is filtered by the permission the stage registry declares. A stage the viewer lacks rights for is **omitted from the payload entirely** — not nulled, not counted, not hinted at.
- **Keys only in `src/platform/db/keys.ts`** (invariant 1). The new `ENG.index` builder included; no key literal at a call site.
- **Access resolved once** in `effectivePermissions`; no route re-derives it (invariant 3). **Default deny** (invariant 4). Gate inside the service functions, not only at the route.
- **Reads only.** The one write this plan adds is the `ZADD` maintaining the index, which is additive and reconcilable by the backfill. No existing record is edited.
- **Goldens:** the existing 144 must stay **byte-identical**. The two new routes ADD goldens — FOUR cases as built (144 → 148): list, block, notfound and forbidden, the last two pinning `statusFor` and the safety property at the HTTP boundary. Recording them is deliberate, in its own commit, with the reason stated. `NOMPANY_RECORD_GOLDENS` is never set in CI.
- **The catalogue grows by one key** (`engagements.view`): 121 → 122, and one area (41 → 42). Two deliberate tripwires fire and BOTH must be updated as visible acts, never silenced: the size assertion in `tests/gate-a.mjs` (bump it AND append to its history comment), and the `owner.roles` golden, which carries the whole catalogue so the Access screen can render the grid — a grantable right absent from it could never be granted (invariant 16). Re-record that ONE golden in its own commit, stating the reason; every other golden must stay byte-identical.
- **Bundle:** the screen loads through `nextDynamic()` so it lands in its own chunk; the largest-chunk ceiling is 250 KB gz and the total 1600 KB.
- **Verify per task:** `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.strict.json`, plus the task's tests. Run the FULL `npm test` **alone** before the final commit (concurrent suites deadlock on the shared namespace — `tests/exclusive.mjs`).
- **Commit subjects are declarative sentences** (house style), ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: The engagement index

**Files:**
- Modify: `src/platform/db/keys.ts` (add `index` to the existing `ENG` object)
- Modify: `src/platform/db/engagement.ts` (`applyDescriptor`, `createEngagement`)
- Test: `tests/engagement-view.mjs` (create)

**Interfaces:**
- Produces: `ENG.index(studioId: string): string` → `s:<sid>:eng-index`; every root-creating path adds its engagement to that ZSET scored by `Date.parse(createdAt)`.

- [ ] **Step 1: Write the failing test** — create `tests/engagement-view.mjs`:

```js
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ENG, KEY_PREFIX, deterministicEngId } from "../src/platform/db/keys.ts";
import { createEngagement, attachTicketEngagement } from "../src/platform/db/engagement.ts";
import { zRange } from "../src/platform/db/store.ts";

assert.ok(KEY_PREFIX, "engagement-view tests must run under a key prefix");

export async function testIndex() {
  const sid = `s_${Date.now().toString(36)}`;
  assert.equal(ENG.index(sid), `${KEY_PREFIX}s:${sid}:eng-index`);

  // A root created through the live dual-write path is indexed.
  const engId = await attachTicketEngagement(
    sid,
    { id: "tk_1", clientName: "Acme", ref: "ACME-001", createdAt: "2026-01-01T00:00:00Z" },
    { id: "c1", name: "Acme" },
  );
  assert.equal(engId, deterministicEngId("ticket", "tk_1"));
  assert.deepEqual(await zRange(ENG.index(sid), 0, -1), [engId], "indexed on create");

  // Idempotent: re-applying the same engagement does not duplicate it.
  await attachTicketEngagement(
    sid,
    { id: "tk_1", clientName: "Acme", ref: "ACME-001", createdAt: "2026-01-01T00:00:00Z" },
    { id: "c1", name: "Acme" },
  );
  assert.deepEqual(await zRange(ENG.index(sid), 0, -1), [engId], "re-apply does not duplicate");

  // createEngagement indexes too, so no root-creating primitive misses it.
  const bare = await createEngagement(sid, { ref: "ENG-1" });
  const all = await zRange(ENG.index(sid), 0, -1);
  assert.ok(all.includes(bare.id), "createEngagement indexes its root");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => { for (const t of [testIndex]) { await t(); console.log(`ok ${t.name}`); } })()
    .catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 2: Run to verify it fails** — preload the repo loader (`tests/loader.mjs`) via node's `--import` flag and run under a non-empty `NOMPANY_KEY_PREFIX`, exactly as the other engagement test modules are run. Expected: FAIL — `ENG.index` is not a function.

- [ ] **Step 3: Write minimal implementation** — in `keys.ts`, add to the `ENG` object:

```ts
  // EVERY engagement this studio has, newest first, scored by createdAt — so
  // listing a studio's deals is one ZRANGE instead of re-reading salesTickets
  // and re-deriving the clustering the engagement layer already did. Scored by
  // the timestamp rather than insertion order because that is what lets a later
  // report ask for a date range (ZRANGEBYSCORE) without reading a collection.
  index: (studioId: string) => `${P}s:${studioId}:eng-index`,
```

In `engagement.ts`, inside `applyDescriptor`, after the root is written:

```ts
  // The one place a root becomes listable. Every create path funnels through
  // applyDescriptor (ticket dual-write, internal quotation, the backfill), so
  // this single line indexes them all; ZADD per id keeps a re-run idempotent.
  await zAdd(ENG.index(studioId), Date.parse(String(d.context.createdAt || "")) || Date.now(), d.engId);
```

and, in `createEngagement`, after `setJSON`:

```ts
  await zAdd(ENG.index(studioId), Date.parse(eng.createdAt) || Date.now(), id);
```

> The descriptor carries no `createdAt` of its own; the fallback to `Date.now()` keeps ordering sane for a root whose source row had none. If `EngagementDescriptor` gains a `createdAt` later, prefer it here.

- [ ] **Step 4: Run to verify it passes** — the module prints `ok testIndex`; `npx tsc --noEmit` and the strict config are both clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/keys.ts src/platform/db/engagement.ts tests/engagement-view.mjs
git commit -m "A studio's engagements are listable, newest first"
```

---

### Task 2: The `engagements.view` permission

**Files:**
- Modify: `src/platform/access/catalogue.ts` (one new area)
- Test: `tests/engagement-view.mjs`

**Interfaces:**
- Produces: the permission key `engagements.view`, part of `ALL_PERMISSIONS` and of the `PermissionKey` union.

- [ ] **Step 1: Write the failing test** — append to `tests/engagement-view.mjs`:

```js
import { ALL_PERMISSIONS, AREAS } from "../src/platform/access/catalogue.ts";

export function testPermissionKey() {
  assert.ok(ALL_PERMISSIONS.includes("engagements.view"), "engagements.view is a real key");
  const area = AREAS.find((a) => a.key === "engagements");
  assert.ok(area, "the engagements area exists");
  assert.deepEqual([...area.verbs], ["view"], "view only — v1 is read-only");
  assert.ok(!area.scoped, "not scoped: the department lens does that job");
}
```
Add `testPermissionKey` to the runner list at the bottom of the file.

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — no `engagements` area.

- [ ] **Step 3: Write minimal implementation** — in `catalogue.ts`, add to the `OWN_AREAS` literal (the hand-declared list, NOT the dashboard spread — the file's own comment explains that a spread widens the literal and degrades `PermissionKey`):

```ts
  // THE ENGAGEMENT VIEW. One key, and deliberately unscoped: what a person sees
  // inside an engagement is decided stage by stage by the permission each stage
  // already declares in platform/engagement/registry.ts, so an own/department/all
  // dimension here would be a second mechanism for the same thing.
  { key: "engagements", group: "Engagements", label: "Engagements", verbs: ["view"] },
```

- [ ] **Step 4: Run to verify it passes** — `ok testPermissionKey`; both `tsc` configs clean. Run the permission-matrix suite and confirm it now covers **122** keys and stays green (the matrix enumerates `ALL_PERMISSIONS`, so the new key is picked up with no edit).

- [ ] **Step 5: Commit**

```bash
git add src/platform/access/catalogue.ts tests/engagement-view.mjs
git commit -m "Seeing engagements is a right an owner can grant"
```

---

### Task 3: The read layer

**Files:**
- Modify: `src/platform/engagement/registry.ts` (add `collection` to each entry)
- Create: `src/modules/main/engagements.ts`
- Test: `tests/engagement-view.mjs`

**Interfaces:**
- Consumes: `ENG.index` (Task 1), `engagements.view` (Task 2), `readEngagementView`, `STAGE_REGISTRY`, `mainContext`.
- Produces:
  - `StageEntry.collection: string` — the source collection for a stage type (`ticket` → `salesTickets`, `invoice` → `invoices`, …), so the type→collection vocabulary lives in the registry rather than in a third hand-maintained copy.
  - `visibleStageTypes(access): string[]`
  - `listEngagements(ctx, opts?: { limit?: number; cursor?: number }): Promise<{ engagements: Row[]; nextCursor: number | null } | Refusal>`
  - `engagementBlock(ctx, engId): Promise<{ engagement: Block } | Refusal>`

  where `Row = { id, ref, clientName, title, createdAt, stages: string[] }` (no `status` — a derived status
  needs the per-stage reads the list deliberately avoids; only `Block` computes one) and
  `Block = { id, ref, context: { clientName, title, industry, deadline }, status, cards: StageCard[] }` with
  `StageCard = { type, label, present, count, ref?, summary?, href? }`.

- [ ] **Step 1: Write the failing test** — append to `tests/engagement-view.mjs`. This test carries the spec's safety property, so it is the one that matters most:

```js
import { listEngagements, engagementBlock, visibleStageTypes } from "../src/modules/main/engagements.ts";

export function testVisibleStageTypes() {
  // A Sales-only reader sees the ticket stage and nothing of Finance's.
  const salesOnly = new Set(["engagements.view", "sales.tickets.view"]);
  const types = visibleStageTypes(salesOnly);
  assert.ok(types.includes("ticket"), "sales.tickets.view reveals the ticket stage");
  assert.ok(!types.includes("invoice"), "no finance right, no invoice stage");
  assert.ok(!types.includes("project"), "no projects right, no project stage");

  // Finance sees its own and not Sales'.
  const finance = new Set(["engagements.view", "finance.cash.view"]);
  assert.ok(visibleStageTypes(finance).includes("invoice"));
  assert.ok(!visibleStageTypes(finance).includes("ticket"));
}
```

The list/block behaviour needs a seeded studio, so it is exercised in `tests/suite.mjs` (Task 6) where the seeding helpers live. Note that here and move on — do not build a second seeding harness.

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation.**

First, in `registry.ts`, add `collection` to the `StageEntry` type and to every entry — `ticket: "salesTickets"`, `rfq: "rfqs"`, `quotation: "quotations"`, `project: "projects"`, `sheet: "projectSheets"`, `order: "materialOrders"`, `delivery: "deliveries"`, `shipment: "awbShipments"`, `task: "tasks"`, `overtime: "overtimes"`, `invoice: "invoices"`, `expense: "expenses"`, `bill: "bills"`, `asset: "fixedAssets"`. Keep the module pure — this is data, no imports.

Then create `src/modules/main/engagements.ts`:

```ts
// THE ENGAGEMENT VIEW'S READ LAYER.
//
// One screen assembles a deal from the engagement layer instead of from six
// department screens. The rule this file exists to enforce is the spec's safety
// property: it may never surface a record the reader could not already see on
// that record's own screen. So every stage is filtered by the permission the
// stage registry declares for it, and a stage the reader lacks is dropped from
// the payload entirely — not nulled, not counted.
import { requirePermission, can } from "@/platform/access";
import type { PermissionKey, PermissionSet } from "@/platform/access/catalogue";
import { STAGE_REGISTRY } from "@/platform/engagement/registry";
import { ENG } from "@/platform/db/keys";
import { zRange } from "@/platform/db/store";
import { readEngagement, readEngagementView } from "@/platform/db/engagement";
import { getSectionByKey } from "@/platform/db/sections";
import { repo } from "@/platform/db/repo";

const PAGE = 25;

/** The stage types this reader may see at all. The department lens, in one line. */
export function visibleStageTypes(access: PermissionSet): string[] {
  return Object.values(STAGE_REGISTRY)
    .filter((e) => can(access, e.permission as PermissionKey))
    .map((e) => e.type);
}

// A deal's status is not stored (the storage spec removed it deliberately): it
// is the project's stage when there is a project, else the ticket's status,
// else the quotation's. Derived here, never written.
function statusOf(cards: StageCard[]): string {
  const of = (t: string) => cards.find((c) => c.type === t && c.present)?.summary;
  return of("project") || of("ticket") || of("quotation") || "Draft";
}

export type StageCard = {
  type: string; label: string; present: boolean; count: number;
  ref?: string; summary?: string; href?: string;
};

/** One page of this studio's engagements, newest first. */
export async function listEngagements(
  ctx: { studio: { id: string; slug?: string }; access: PermissionSet },
  { limit = PAGE, cursor = 0 }: { limit?: number; cursor?: number } = {},
) {
  const denied = requirePermission(ctx.access, "engagements.view");
  if (denied) return denied;

  const visible = new Set(visibleStageTypes(ctx.access));
  const ids = await zRange(ENG.index(ctx.studio.id), cursor, cursor + limit - 1, { rev: true });

  const engagements = [];
  for (const engId of ids) {
    const view = await readEngagementView(ctx.studio.id, engId);
    if (!view) continue;
    const stages = stagesPresent(view).filter((t) => visible.has(t));
    // An engagement this reader can see no stage of is not theirs to list.
    if (!stages.length) continue;
    engagements.push({
      id: engId,
      ref: String((view.context.ref as string) || ""),
      clientName: String(view.context.clientName || ""),
      title: String(view.context.title || ""),
      createdAt: String(view.context.createdAt || ""),
      stages,
    });
  }
  return { engagements, nextCursor: ids.length === limit ? cursor + limit : null };
}

/** Which stage types this engagement actually has. */
function stagesPresent(view: { singletons: Record<string, string | null>; members: Record<string, string[]> }): string[] {
  const out: string[] = [];
  for (const [type, id] of Object.entries(view.singletons)) if (id && STAGE_REGISTRY[type]) out.push(type);
  for (const [type, ids] of Object.entries(view.members)) if (ids.length && STAGE_REGISTRY[type]) out.push(type);
  return out;
}

/** One engagement, as cards — only the stages this reader may see. */
export async function engagementBlock(
  ctx: { studio: { id: string; slug?: string }; access: PermissionSet },
  engId: string,
) {
  const denied = requirePermission(ctx.access, "engagements.view");
  if (denied) return denied;

  const root = await readEngagement(ctx.studio.id, engId);
  if (!root) return { error: "notfound" };
  const view = await readEngagementView(ctx.studio.id, engId);
  if (!view) return { error: "notfound" };

  const visible = new Set(visibleStageTypes(ctx.access));
  const present = new Set(stagesPresent(view));
  // Nothing here is theirs to read.
  if (![...present].some((t) => visible.has(t))) return { error: "forbidden" };

  const cards: StageCard[] = [];
  for (const entry of Object.values(STAGE_REGISTRY)) {
    if (!visible.has(entry.type)) continue;               // withheld, not blanked
    const ids = idsFor(view, entry.type);
    const card: StageCard = {
      type: entry.type, label: entry.label ?? entry.type,
      present: ids.length > 0, count: ids.length,
    };
    if (ids.length) Object.assign(card, await summarise(ctx, entry, ids));
    cards.push(card);
  }
  return {
    engagement: {
      id: engId,
      ref: String(root.ref || ""),
      context: root.context,
      status: statusOf(cards),
      cards,
    },
  };
}

function idsFor(
  view: { singletons: Record<string, string | null>; members: Record<string, string[]> },
  type: string,
): string[] {
  const one = view.singletons[type];
  if (one) return [one];
  return view.members[type] || [];
}

// The one-line summary per stage: read only the collection of a stage that both
// exists and is visible. `cardinality: "one"` stages summarise their single row;
// a "many" stage summarises its newest and carries the count.
async function summarise(
  ctx: { studio: { id: string }; },
  entry: { type: string; collection: string; sectionKey: string },
  ids: string[],
) {
  const section = await getSectionByKey(ctx.studio.id, entry.sectionKey);
  if (!section) return {};
  const rows = await repo(entry.collection).find({
    studio: ctx.studio, section, where: { id: { in: ids } },
  });
  const row = rows[rows.length - 1] as Record<string, unknown> | undefined;
  if (!row) return {};
  return {
    ref: String(row.ref || row.number || row.reference || row.id || ""),
    summary: String(row.status || row.stage || ""),
  };
}
```

> `STAGE_REGISTRY` entries carry no `label` today; either add one alongside `collection` in this task (preferred — one line per entry, e.g. `label: "Sales ticket"`) or fall back to the type as the code above does. Pick one and be consistent.

- [ ] **Step 4: Run to verify it passes** — `ok testVisibleStageTypes`; both `tsc` configs clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/engagement/registry.ts src/modules/main/engagements.ts tests/engagement-view.mjs
git commit -m "An engagement reads as a list row and a block of stage cards"
```

---

### Task 4: The two GET routes

**Files:**
- Create: `src/app/api/studios/[slug]/main/engagements/route.ts`
- Create: `src/app/api/studios/[slug]/main/engagements/[engId]/route.ts`
- Test: covered by Task 5's goldens and Task 6's suite assertions.

**Interfaces:**
- Consumes: `listEngagements`, `engagementBlock` (Task 3); `mainContext` (`src/modules/main/main.ts`).
- Produces: `GET /api/studios/[slug]/main/engagements` → `{ engagements, nextCursor }`; `GET …/[engId]` → `{ engagement }`.

- [ ] **Step 1: Read the sibling route** — `src/app/api/studios/[slug]/main/route.ts` — for the exact `currentUser` → `mainContext` → `refused()` shape, the `runtime`/`dynamic` exports, and how it maps `notfound` to 404 and everything else to 403. Mirror it; do not invent a new shape.

- [ ] **Step 2: Write the list route** (`…/main/engagements/route.ts`) following that shape: resolve the user, build `mainContext`, return the context's refusal if any, then call `listEngagements(main, { cursor })` reading `cursor` from the query string, and return its refusal (403, or 404 for `notfound`) or its payload as JSON.

- [ ] **Step 3: Write the block route** (`…/main/engagements/[engId]/route.ts`) the same way, passing `engId` from the awaited params to `engagementBlock`.

- [ ] **Step 4: Verify** — both `tsc` configs clean; `npx next build` succeeds and lists the two new routes.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/studios/[slug]/main/engagements"
git commit -m "The engagement list and one engagement are readable over HTTP"
```

---

### Task 5: Goldens for the new routes

**Files:**
- Modify: `tests/gate-a.mjs` (two new cases)
- Create: two files under `tests/goldens/`

- [ ] **Step 1: Add the cases** — in `tests/gate-a.mjs`, near the other Main cases, seed a person who holds `engagements.view` plus one department right, then capture both routes. Follow the file's existing idiom exactly — `personWith([...], alias, {})`, `signIn`, `shot(name, await capture(HANDLER.GET, req(path), P))` — and name the goldens `main.engagements.list` and `main.engagements.block`.

- [ ] **Step 2: Add an `ok()` assertion beside them** proving the safety property at the HTTP boundary: a person **without** `finance.cash.view` gets a block whose serialised body contains no invoice card. Assert on the payload, e.g. that no card has `type === "invoice"`.

- [ ] **Step 3: Record the two goldens deliberately** — run the recorder once locally (`NOMPANY_RECORD_GOLDENS=1`) so the two new files are written, then confirm `git status` shows **only** the two new golden files and **no modification to any existing golden**. If an existing golden changed, STOP — that is a regression, not a recording.

- [ ] **Step 4: Verify** — re-run Gate A with the recorder OFF: 148 cases, 148 files, 0 failures.

- [ ] **Step 5: Commit** — its own commit, with the reason in the body (the contract: goldens change only deliberately):

```bash
git add tests/gate-a.mjs tests/goldens
git commit -m "Gate A records the engagement view's two responses"
```

---

### Task 6: The screen, its route and its nav entry

**Files:**
- Create: `src/components/studio2/StudioEngagements.js`
- Modify: `src/app/studio/[[...segments]]/page.js` (dynamic import + early return)
- Modify: `src/components/studio2/StudioFrame.js` (nav entry above People)
- Test: `tests/suite.mjs` (list/block behaviour, using the existing seeding helpers)

- [ ] **Step 1: Write the failing suite assertions** — in `tests/suite.mjs`, beside the existing engagement blocks, seed a studio with a ticket-headed chain (client, ticket, quotation, project) and assert, through the real service functions:
  - `listEngagements` returns the engagement newest-first with its visible stage types;
  - `engagementBlock` returns cards for present stages and marks absent ones `present: false`;
  - **the safety property** — a collaborator with `engagements.view` but no `finance.cash.view` gets no `invoice` card, and a collaborator with neither `engagements.view` nor any stage right is refused outright.

- [ ] **Step 2: Run to verify they fail** (the screen does not exist yet; the service assertions should already pass from Task 3 — if they do, that is the read layer proving itself, and only the screen work remains).

- [ ] **Step 3: Build the screen** — `StudioEngagements.js`, a client component that fetches `/api/studios/<slug>/main/engagements`, renders the list (ref, client, title, a badge per visible stage — no status column, `listEngagements` does not return one), and on selecting a row fetches `…/engagements/<engId>` and renders the block: a context header plus one card per stage. **A card with `present: false` renders as an optional next step** ("No project yet"), never as "N/A" or an empty row. Follow the existing studio screens for table/skeleton idiom, use the shared `.skel` classes, and keep MUI to the three approved uses.

- [ ] **Step 4: Wire the route** — in `page.js`, add the dynamic import beside the other screens:

```js
const StudioEngagements = nextDynamic(
  () => import("@/components/studio2/StudioEngagements"),
  { loading: () => <ScreenSkeleton /> },
);
```

and an early return BEFORE the section lookup, in the same place `documentation` and `sales-live` are handled:

```js
  // ENGAGEMENTS IS NOT A SECTION, deliberately. Making it one would give Main a
  // child, and sectionViewable's "a heading with neither areas nor children has
  // nothing to protect" fallthrough is the only reason Main is visible to every
  // member — a child would gate the parent and hide Main from everybody without
  // the engagements right. So it rides its own key, checked here.
  if (requested === "engagements") {
    if (!can(access, "engagements.view")) notFound();
    return (
      <LiveProvider slug={studio.slug}>
        <StudioEngagements slug={studio.slug} />
      </LiveProvider>
    );
  }
```

- [ ] **Step 5: Wire the nav** — in `StudioFrame.js`, add to the `admin` array **above** the People entry:

```js
    { href: `/${studio.slug}/engagements`, key: "engagements", label: "Engagements", show: me.canSeeEngagements },
```

and pass that flag through from the page the way `canAdminister` already travels, resolved as `can(access, "engagements.view")`. Do NOT touch `SECTION_AREAS` or `SECTION_DEFS`.

- [ ] **Step 6: Verify** — the suite assertions pass; `tsc` both configs; `npx next build`; and `node scripts/bundle-budget.mjs` shows the largest chunk still under 250 KB gz and the total under 1600 KB.

- [ ] **Step 7: Commit**

```bash
git add src/components/studio2/StudioEngagements.js "src/app/studio/[[...segments]]/page.js" src/components/studio2/StudioFrame.js tests/suite.mjs
git commit -m "A studio can read its engagements at /engagements"
```

---

### Task 7: CI wiring and the full-suite proof

**Files:**
- Modify: `tests/suite.mjs` (register `tests/engagement-view.mjs`)

- [ ] **Step 1:** Register the module's exports exactly as `tests/engagement.mjs`, `engagement-backfill.mjs`, `engagement-oncreate.mjs` and `engagement-spine.mjs` are registered — sibling import, a `console.log("== …")` header, the `ok()` try/catch adapter, inside the prefixed integration suite.

- [ ] **Step 2: Run the FULL `npm test` alone** and confirm: the engagement-view tests execute and pass; **Gate A is 148/148 with 0 failures**; the permission matrix covers 122 keys; hop counts unregressed. Then `tsc` both configs and `npx next build`.

- [ ] **Step 3: Commit**

```bash
git add tests/suite.mjs
git commit -m "CI runs the engagement view's tests"
```

---

## Self-Review

**Spec coverage (§ → task):** location/routing §3 → T6; the permission key §4 → T2; the department lens and the safety property §4 → T3 (logic), T5 (HTTP boundary), T6 (service level); the index §5 → T1; the read layer §6 → T3; the routes §7 → T4; the screen §8 → T6; testing and contracts §9 → T5, T6, T7. **Deliberately deferred per §10:** actions on the block, full stage detail, the project's children, and the ledgered engagement-layer cleanup.

**Placeholder scan:** none. The two judgement calls are called out inline rather than left vague — the `createdAt` fallback in T1, and whether `STAGE_REGISTRY` gains a `label` in T3 (pick one, be consistent).

**Type consistency:** `visibleStageTypes`, `listEngagements`, `engagementBlock`, `StageCard`, `StageEntry.collection` are defined in T3 and consumed unchanged by T4, T5 and T6; `ENG.index` is defined in T1 and used in T3.

**Risks flagged for the executor:**
1. **Do not make Engagements a section.** Adding a child to Main flips `sectionViewable("main")` from its `return !own` fallthrough to `children.some(...)` and hides Main from every member without the new right. The early return in `page.js` exists to avoid exactly that.
2. **Recording goldens must add two files and modify none.** If an existing golden moves, stop — the response of an existing route changed, which this plan does not do.
3. **`repo().find({ where: { id: { in: ids } } })`** must be checked against the repository's actual `Where` vocabulary before relying on it; if `in` is unsupported for `id`, read the collection and filter in memory for v1 and note it, rather than widening the seam here.
