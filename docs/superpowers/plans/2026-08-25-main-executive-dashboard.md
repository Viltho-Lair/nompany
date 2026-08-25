# Main Executive Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the studio owner's Main "front door" into an executive dashboard — a free floor of headline tiles with gated executive widgets over it — shipping on-read first, with a shared filter/drill/export shell every other dashboard will inherit.

**Architecture:** Main renders the existing free-floor tiles unchanged, plus new gated executive widgets read through one aggregate seam (`readAggregate(ctx)`). Phase 1 backs the seam with on-read derivation and ships Main. Phase 2 (a separate plan) swaps the seam's body for a Redis rollup behind a rollup-equals-on-read oracle. Every executive widget is double-gated: section **visibility** (a section the viewer can't see is never read) and analytics-tier **entitlement** (render vs locked teaser).

**Tech Stack:** Next.js 16 / React 19, TypeScript (for `src/modules/**` and `src/platform/**`), Redis (live, shared, prefixed in tests), the in-house dependency-free SVG chart kit (`src/components/charts`), the existing widget-entitlement registry (`src/lib/dashboardWidgets.ts`).

**Spec:** `docs/superpowers/specs/2026-08-25-main-executive-dashboard-design.md` — the plan argues from the spec; executors read both.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec and `CLAUDE.md`.

- **Keys are built only in `src/platform/db/keys.ts`** — never a literal, never a template at a call site (invariant 1). Phase 2 only.
- **A section the viewer cannot see is never read** — not read and hidden, not read at all; no row, name, count, or section leaks to a non-member (invariant 2). This survives aggregation: the rollup is stored per-section and filtered on read.
- **Access is resolved once** in `effectivePermissions` / `studioContext`; no route re-derives it (invariant 3). **Default deny** (invariant 4).
- **CollaboratorID is the identity inside a studio**, never UserID (invariant 6) — the "awaiting you" queue addresses CollaboratorIDs.
- **A right nothing can exercise is a bug** (invariant 16) — no dead controls (this is why the v1 FilterBar omits currency/branch).
- **No destructive Redis op** (`FLUSHDB`/`FLUSHALL`, `delPrefix("")`, `scanPrefix("")`, `sweepOrphans()` from a test) — ever. Deletes are by explicit key list only (invariant 17). Phase 2's cron prunes by explicit `HDEL` of named fields.
- **Cron fails closed** — a missing `CRON_SECRET` refuses (invariant 15). Phase 2 only.
- **Charts:** the bespoke SVG kit only — no new chart library, and charts must stay non-hydrating (`nextId()` is a module counter; client hydration would mismatch). `motion/react` may not be imported outside `src/components/landing/`.
- **Dates** render through `fmtDate`/`fmtDateTime` from `src/lib/format.js` — never a raw `toLocale*` in `src/components/studio2` (Gate A block 6 fails the build otherwise).
- **Tokens:** charts draw with `--chart-1..5` on `:root`; skeletons use `.skel`/`.skel-text`/`.skel-circle`; numbers use `.num`. Never `--ad-chart-*` (retired to `/super` aliases).
- **The free floor stays out of the widget registry** — `DASHBOARD_WIDGETS` governs paid widgets only; the headline tiles and feed are always shown.
- **Bundle budget:** largest chunk ≤ 250 KB gz, total client JS ≤ 1600 KB gz. `scripts/bundle-budget.mjs` fails the build otherwise.
- **Goldens are the contract:** if an API response body changes, it is wrong until deliberately re-recorded in its own commit with a stated reason. `NOMPANY_RECORD_GOLDENS` is never set in CI. Adding fields to the Main response is a deliberate golden re-record.
- **Hop counts are part of the contract** — a route gaining Redis round trips fails the build.
- **Tests** run against real routes and real Redis under `NOMPANY_KEY_PREFIX`; never call `sweepOrphans()` or any `FLUSH` from a test.
- **Verification (every task, no exceptions):** `npm test` · `npx tsc --noEmit` · `npx tsc --noEmit -p tsconfig.strict.json` · `npx next build`.
- **Siblings import each other relatively** (`./keys`), never through the alias; `platform/db` has no barrel.
- **Commit subjects are declarative sentences** describing the state after the change ("Main knows which executive widgets a tier bought"), not conventional-commit prefixes.

---

## Scope of this plan

This plan is **Phase 1 of the spec — it ships Main on-read.** Phase 2 (the Redis
rollup that replaces the seam's body behind the §4.4 oracle) is a **separate plan**
written once Phase 1 lands, because Phase 1 is complete, testable software on its
own: if Phase 2 never happens, Main still works, just on-read. The Phase-2 seam
points and the keys/sections/cron facts it will need are noted at the end of this
plan so nothing is lost.

**One deliberate divergence from the existing dashboards, recorded up front.** The
seven department dashboards gate widgets **client-side** (`useWidgetVisible()`),
sending the underlying lists to the browser regardless of tier — acceptable there
because the lists are the operational screen's own data. Main's executive widgets
are **new premium cross-module analytics the client has no other reason to hold**,
so this plan gates them **server-side in the Main route**: an unentitled tier never
receives the numbers, only the locked-widget keys (the spec's §2 "billing leak"
rule and the data-scientist agent's rule). This is intentional, not an oversight.

## File Structure (Phase 1)

| File | Create/Modify | Responsibility |
|---|---|---|
| `src/modules/main/executive.ts` | Create | The aggregate seam `readAggregate(ctx)` + `deriveExecutive()` — pure per-section activity + KPI derivation, on-read implementation. TypeScript, sibling of `main.ts`. |
| `src/modules/main/awaiting.ts` | Create | The cross-module "awaiting you" queue (tasks + approvals + technical), reusing existing routing/signable helpers. |
| `src/modules/main/main.ts` | Modify | Extend the main context/derivation entry points consumed by the route. |
| `src/app/api/studios/[slug]/main/route.ts` | Modify | Add the executive block + entitlement set to the response (deliberate golden re-record). |
| `src/lib/dashboardWidgets.ts` | Modify | Add the `main` section to `WIDGET_SECTIONS` and the executive widgets to `DASHBOARD_WIDGETS`. |
| `src/components/dashboard/FilterBar.jsx` | Create | Date-range presets (fiscal-aware), URL-query-backed state. Shared. |
| `src/components/dashboard/drill.ts` | Create | Pure `drillHref(section, filter)` → studio-relative path. Shared. |
| `src/components/dashboard/exportTable.ts` | Create | CSV serializer, filter-aware; chart PNG via canvas. Shared. |
| `src/components/studio2/MainDashboard.jsx` | Create | The Main executive dashboard: gated widgets over the free floor, mirroring the department-dashboard pattern. |
| `src/components/studio2/StudioMain.js` | Modify | Mount `MainDashboard` beneath the existing tiles/feed. |
| `tests/**` | Create | One assertion per behavior: derivation reconciliation, visibility survival, entitlement gating, drill href, CSV export. |

**Test locations.** Pure derivations and utility functions are asserted inline in
`tests/suite.mjs` in the `ok(label, cond, extra)` style (run with
`npm run test:integration`). Response-shape changes are pinned by the goldens in
`tests/goldens/*.json`, captured by `tests/gate-a.mjs` and run by `npm test`; a
Main-route change trips `owner.main.json` / `norole.main.json` and is re-recorded
deliberately with `NOMPANY_RECORD_GOLDENS=1 npm test` in its own commit.

---

### Task 1: Register the Main executive widgets

**Files:**
- Modify: `src/lib/dashboardWidgets.ts` (`WIDGET_SECTIONS` ~30-38; `DASHBOARD_WIDGETS` ~42-92)
- Test: `tests/suite.mjs` (registry block ~1186-1221)

**Interfaces:**
- Consumes: nothing new.
- Produces: four frozen widget keys — `main.activity`, `main.awaiting-you`, `main.headline-trend` (rung `simple`), `main.event-ribbon` (rung `moderate`) — and a `main` section, consumed by Tasks 4 and 8 and by the `/super` tier editor automatically.

- [ ] **Step 1: Write the failing test.** Add to the registry block in `tests/suite.mjs` (it already imports `widgetsForRung`, `WIDGET_KEYS`):

```js
console.log("\n== Main executive widgets join the registry");
ok("Overview is a section the tier editor lists", WIDGET_SECTIONS.some((s) => s.key === "main"));
ok("main.activity is a simple-rung widget", widgetsForRung("simple").includes("main.activity"));
ok("main.awaiting-you is simple too", widgetsForRung("simple").includes("main.awaiting-you"));
ok("main.event-ribbon needs moderate",
  !widgetsForRung("simple").includes("main.event-ribbon") && widgetsForRung("moderate").includes("main.event-ribbon"));
ok("the free headline tiles are NOT gated widgets", !WIDGET_KEYS.has("main.openTickets"));
```
Ensure `WIDGET_SECTIONS` is imported at the top of the block's imports if not already.

- [ ] **Step 2: Run to verify it fails.** Run: `npm run test:integration` — Expected: FAIL on "Overview is a section…" (main section absent).

- [ ] **Step 3: Implement.** In `src/lib/dashboardWidgets.ts`, add `{ key: "main", label: "Overview" }` as the **first** entry of `WIDGET_SECTIONS`, and append to `DASHBOARD_WIDGETS`:

```ts
  // Main (the executive overview — the free headline tiles & feed are NOT here;
  // the registry governs paid widgets, the floor is always shown)
  { key: "main.activity", label: "Department activity", section: "main", rung: "simple" },
  { key: "main.awaiting-you", label: "Awaiting you", section: "main", rung: "simple" },
  { key: "main.headline-trend", label: "Headline trends", section: "main", rung: "simple" },
  { key: "main.event-ribbon", label: "Activity ribbon", section: "main", rung: "moderate" },
```

- [ ] **Step 4: Run to verify it passes.** Run: `npm run test:integration` — Expected: PASS. Then `npx tsc --noEmit`.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/dashboardWidgets.ts tests/suite.mjs
git commit -m "The tier editor offers the studio Overview's executive widgets"
```

---

### Task 2: The pure executive derivations

**Files:**
- Create: `src/modules/main/executive.ts` (pure functions only in this task)
- Test: `tests/suite.mjs`

**Interfaces:**
- Consumes: nothing (pure; rows passed in).
- Produces: `activityByDay(rows, days?, asOf?) → { label: string; value: number }[]`; `periodDelta(rows, field, period) → { current: number; previous: number; deltaPct: number | null }`. Consumed by Task 4's seam.

- [ ] **Step 1: Write the failing test** in `tests/suite.mjs`:

```js
import { activityByDay, periodDelta } from "@/modules/main/executive";

console.log("\n== Main executive: pure derivations");
{
  const rows = [
    { id: "a", createdAt: "2026-08-25T09:00:00" },
    { id: "b", createdAt: "2026-08-25T18:00:00" },
    { id: "c", createdAt: "2026-08-24T10:00:00" },
    { id: "old", createdAt: "2026-01-01T00:00:00" },
  ];
  const series = activityByDay(rows, 30, "2026-08-25");
  ok("activity is one entry per day", series.length === 30, String(series.length));
  ok("today counts both of today's rows", series[29].value === 2, JSON.stringify(series[29]));
  ok("yesterday counts one", series[28].value === 1, JSON.stringify(series[28]));
  ok("a row outside the window is excluded", series.reduce((s, x) => s + x.value, 0) === 3, "old row leaked");

  const p = periodDelta(rows, "createdAt", { start: "2026-07-01", mid: "2026-08-01", end: "2026-09-01" });
  ok("period delta counts the current window", p.current === 3, String(p.current));
  ok("nothing in the prior window", p.previous === 0, String(p.previous));
  ok("a percentage on a zero base is null, not +100%", p.deltaPct === null, String(p.deltaPct));
}
```

- [ ] **Step 2: Run to verify it fails.** Run: `npm run test:integration` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `src/modules/main/executive.ts`:

```ts
// THE EXECUTIVE OVERVIEW — cross-section trends for the studio's front door.
// Pure derivations live here; readAggregate() (Task 4) is the seam the route
// reads through, so a rollup can back it later without touching a widget (spec
// §4.0). Every read still passes through main.ts's readIfVisible, so a section
// the viewer cannot see contributes nothing — not a zero, nothing (invariant 2).

import type { Row } from "@/platform/db/store";

type Dated = Row & { createdAt?: string; updatedAt?: string };

/**
 * Daily counts of rows CREATED in the last `days`, oldest-first, one entry per
 * day INCLUDING empty days so a sparkline has a stable x-axis. `asOf` is injected
 * rather than read from the clock so the function is testable.
 */
export function activityByDay(
  rows: Dated[],
  days = 30,
  asOf: string = new Date().toISOString().slice(0, 10),
): { label: string; value: number }[] {
  const end = new Date(`${asOf}T00:00:00`);
  const series: { label: string; value: number }[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    index.set(key, series.length);
    series.push({ label: key, value: 0 });
  }
  for (const r of rows) {
    if (!r.createdAt) continue;
    const at = index.get(r.createdAt.slice(0, 10));
    if (at !== undefined) series[at].value += 1;
  }
  return series;
}

/**
 * This-window vs prior-window counts of a dated flow, plus the signed delta as a
 * percentage — NULL when the prior window is empty, because a percentage on a
 * zero base is a lie, not "+100%". Windows are half-open [start,mid) and [mid,end).
 */
export function periodDelta(
  rows: Dated[],
  field: "createdAt" | "updatedAt",
  period: { start: string; mid: string; end: string },
): { current: number; previous: number; deltaPct: number | null } {
  let current = 0;
  let previous = 0;
  for (const r of rows) {
    const v = r[field];
    if (!v) continue;
    const d = v.slice(0, 10);
    if (d >= period.mid && d < period.end) current += 1;
    else if (d >= period.start && d < period.mid) previous += 1;
  }
  const deltaPct = previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
  return { current, previous, deltaPct };
}
```

- [ ] **Step 4: Run to verify it passes.** Run: `npm run test:integration`, then `npx tsc --noEmit -p tsconfig.strict.json` (this folder is strict TS).

- [ ] **Step 5: Commit.**
```bash
git add src/modules/main/executive.ts tests/suite.mjs
git commit -m "The Overview knows each department's 30-day activity and period trend"
```

---

### Task 3: The "awaiting you" cross-module queue

**Files:**
- Create: `src/modules/main/awaiting.ts`
- Test: `tests/suite.mjs`

**Interfaces:**
- Consumes: `MainContext` (from `main.ts`), `enrichTask`/`readTaskAssignees` (from `@/modules/tasks/taskRouting`), the pure ranker below.
- Produces: `rankQueue(items) → QueueItem[]` (pure, tested) and `awaitingQueue(ctx) → Promise<QueueItem[]>`. `QueueItem = { kind: "task"|"approval"|"quotation"|"rfq"; section: string; id: string; label: string; at: string }`. Consumed by Task 4.

- [ ] **Step 1: Write the failing test** (pure ranker only — the ctx reader is covered by the route golden in Task 4):

```js
import { rankQueue } from "@/modules/main/awaiting";

console.log("\n== Main executive: the awaiting-you queue orders by age");
{
  const items = [
    { kind: "task", section: "tasks", id: "t2", label: "Approve PO", at: "2026-08-20T00:00:00" },
    { kind: "quotation", section: "technical-quotations", id: "q1", label: "Q-1001", at: "2026-08-24T00:00:00" },
    { kind: "task", section: "tasks", id: "t1", label: "Review RFQ", at: "2026-08-10T00:00:00" },
  ];
  const ranked = rankQueue(items);
  ok("oldest waiting item is first", ranked[0].id === "t1", ranked[0].id);
  ok("newest waiting item is last", ranked[2].id === "q1", ranked[2].id);
  ok("nothing is dropped", ranked.length === 3, String(ranked.length));
}
```

- [ ] **Step 2: Run to verify it fails.** Run: `npm run test:integration` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `src/modules/main/awaiting.ts`. The reader mirrors `main.ts`'s `readIfVisible`/`awaitingMe` logic (main.ts:107-171) — read it first and reuse the same task-routing calls so the count on the tile and the list in the queue can never disagree:

```ts
// AWAITING YOU — the one cross-module executive widget that is new logic, not
// just a chart: the things across Tasks, approvals and Technical that are waiting
// on THIS collaborator (invariant 6: addressed by CollaboratorID). It reuses the
// exact routing main.ts already uses for its awaitingMe COUNT, so the list and the
// count agree by construction. A section the viewer cannot see is never read.

import { repo } from "@/platform/db/repo";
import { enrichTask, readTaskAssignees } from "@/modules/tasks/taskRouting";
import type { MainContext } from "./main";
import type { Task } from "@/modules/tasks/types";

export type QueueItem = {
  kind: "task" | "approval" | "quotation" | "rfq";
  section: string;
  id: string;
  label: string;
  at: string;
};

/** Oldest-waiting first (a queue drains from the front). Pure. */
export function rankQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export async function awaitingQueue(ctx: MainContext): Promise<QueueItem[]> {
  const meId = ctx.collaborator.id;
  const out: QueueItem[] = [];

  // Tasks waiting on me — the same enrichment main.ts uses for the count.
  const tasksSection = ctx.seen("tasks", null);
  if (tasksSection) {
    const settings = ctx.byKey["tasks-settings"] || ctx.byKey["tasks"];
    const assignees = readTaskAssignees(settings);
    const tasks = await repo<Task>("tasks").find({ studio: ctx.studio, section: tasksSection });
    for (const raw of tasks) {
      if (raw.status === "Done") continue;
      const t = enrichTask(raw, assignees, meId);
      const mineToDo = t.assigneeCollaboratorId === meId;
      const mineToApprove = (t.myAuthorities || []).some((c) => !t.approvals?.[c]?.approved);
      if (mineToDo || mineToApprove) {
        out.push({
          kind: mineToApprove ? "approval" : "task",
          section: "tasks",
          id: String(t.id),
          label: t.title,
          at: t.createdAt || "",
        });
      }
    }
  }

  // Quotations awaiting the viewer's action (Draft/Sent handled by Technical).
  const quotesSection = ctx.seen("technical-quotations", "technical");
  if (quotesSection) {
    const quotations = await repo("quotations").find({ studio: ctx.studio, section: quotesSection });
    for (const q of quotations) {
      if (q.status === "Draft" || q.status === "Sent") {
        out.push({ kind: "quotation", section: "technical-quotations", id: String(q.id), label: String(q.number || q.id), at: String(q.createdAt || "") });
      }
    }
  }

  return rankQueue(out);
}
```
Note: confirm `MainContext` exposes `seen`, `byKey`, `studio`, `collaborator` (it does — main.ts:47-55). If `find`'s row type needs `status`/`number`, add a local narrow type as `executive.ts` does.

- [ ] **Step 4: Run to verify it passes.** Run: `npm run test:integration`, then `npx tsc --noEmit -p tsconfig.strict.json`.

- [ ] **Step 5: Commit.**
```bash
git add src/modules/main/awaiting.ts tests/suite.mjs
git commit -m "The Overview gathers what is waiting on the person looking at it"
```

---

### Task 4: The aggregate seam + the entitlement-gated route block

**Files:**
- Modify: `src/modules/main/main.ts` (export `readIfVisible`; add nothing else)
- Modify: `src/modules/main/executive.ts` (add the impure `readAggregate` seam)
- Modify: `src/app/api/studios/[slug]/main/route.ts` (add the `executive` block, server-gated)
- Test: re-record `tests/goldens/owner.main.json`, `tests/goldens/norole.main.json`

**Interfaces:**
- Consumes: `activityByDay`, `periodDelta` (Task 2), `awaitingQueue` (Task 3), `enabledWidgets` (`@/lib/dashboardWidgets`), `planOf` (`@/lib/plans`).
- Produces: the response gains `executive: { widgets: Record<string, unknown>, locked: string[] }`. Consumed by Task 8.

- [ ] **Step 1: Export the reader.** In `src/modules/main/main.ts`, change `async function readIfVisible` (main.ts:91) to `export async function readIfVisible`. No behaviour change.

- [ ] **Step 2: Add the seam** to `src/modules/main/executive.ts`:

```ts
import { readIfVisible } from "./main";
import type { MainContext } from "./main";

// The sections Main tracks, and the collection each activity series counts.
const ACTIVITY_SOURCES: { section: string; fallback: string | null; collection: string }[] = [
  { section: "sales-tickets", fallback: "sales", collection: "salesTickets" },
  { section: "technical-quotations", fallback: "technical", collection: "quotations" },
  { section: "technical-rfq", fallback: "technical", collection: "rfqs" },
  { section: "projects-list", fallback: "projects", collection: "projects" },
  { section: "inventory-items", fallback: "inventory", collection: "inventoryItems" },
  { section: "tasks", fallback: null, collection: "tasks" },
];

export type ExecutiveAggregate = {
  activity: { section: string; series: { label: string; value: number }[] }[];
  ribbon: { label: string; value: number }[];
  trends: { key: string; current: number; previous: number; deltaPct: number | null }[];
};

/**
 * THE SEAM. deriveExecutive reads through here; Phase 2 swaps this body for one
 * HGETALL of the rollup with no widget change (spec §4.0). Every source is read
 * through readIfVisible, so an unreadable section yields null and contributes
 * nothing to activity, ribbon or trends.
 */
export async function readAggregate(
  ctx: MainContext,
  asOf: string = new Date().toISOString().slice(0, 10),
): Promise<ExecutiveAggregate> {
  const lists = await Promise.all(
    ACTIVITY_SOURCES.map((s) => readIfVisible(ctx, s.section, s.fallback, s.collection)),
  );
  const activity: ExecutiveAggregate["activity"] = [];
  const combined: (Row & { createdAt?: string })[] = [];
  const trends: ExecutiveAggregate["trends"] = [];
  const period = trailingTwoMonths(asOf);
  lists.forEach((rows, i) => {
    if (!rows) return; // not visible — nothing, not a zero
    const src = ACTIVITY_SOURCES[i];
    activity.push({ section: src.section, series: activityByDay(rows as Dated[], 30, asOf) });
    trends.push({ key: src.section, ...periodDelta(rows as Dated[], "createdAt", period) });
    combined.push(...(rows as (Row & { createdAt?: string })[]));
  });
  return { activity, ribbon: activityByDay(combined as Dated[], 30, asOf), trends };
}

/** Two calendar months ending at asOf: [start, mid) prior, [mid, end) current. */
function trailingTwoMonths(asOf: string): { start: string; mid: string; end: string } {
  const end = new Date(`${asOf}T00:00:00`);
  const mid = new Date(end.getFullYear(), end.getMonth(), 1);
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  // end is exclusive; push it one day past asOf so today is counted
  const endExclusive = new Date(end); endExclusive.setDate(end.getDate() + 1);
  return { start: iso(start), mid: iso(mid), end: iso(endExclusive) };
}
```
(Add `import type { Row } from "@/platform/db/store";` if not already present from Task 2.)

- [ ] **Step 3: Gate and attach in the route.** In `src/app/api/studios/[slug]/main/route.ts`, after `main` is built and before the existing `Response.json`, resolve the tier and gate server-side. Reuse the catalogue load the studio page uses — read `src/app/studio/[[...segments]]/page.js` around `planOf(studio, catalogues.packages, catalogues.tiers)` (page.js:175) and mirror that loader here:

```ts
import { planOf } from "@/lib/plans";
import { enabledWidgets } from "@/lib/dashboardWidgets";
import { readAggregate } from "@/modules/main/executive";
import { awaitingQueue } from "@/modules/main/awaiting";
// ... inside GET, after `const [figures, feed] = await Promise.all([...])`:
const plan = planOf(main.studio, packages, tiers); // packages/tiers from the same loader page.js uses
const entitled = enabledWidgets(plan);
const [agg, queue] = await Promise.all([readAggregate(main), awaitingQueue(main)]);
const widgets: Record<string, unknown> = {};
const locked: string[] = [];
const gate = (key: string, value: unknown) => { if (entitled.has(key)) widgets[key] = value; else locked.push(key); };
gate("main.activity", agg.activity);
gate("main.headline-trend", agg.trends);
gate("main.event-ribbon", agg.ribbon);
gate("main.awaiting-you", queue);
// add `executive: { widgets, locked }` to the returned Response.json object.
```
The gate sends numbers only for entitled keys; an unentitled tier receives just the `locked` key list (no figures leave the server).

- [ ] **Step 4: Verify the response shape** locally, then re-record the goldens deliberately (this is the sanctioned way — the body changed on purpose):

Run first (Expected: FAIL on `owner.main`/`norole.main`, body changed):
```bash
npm test
```
Then, in its own commit, re-record with a stated reason:
```bash
NOMPANY_RECORD_GOLDENS=1 npm test
```
Inspect the diff of `tests/goldens/owner.main.json`: `executive.widgets` should carry the four keys with data; `tests/goldens/norole.main.json`: `executive.widgets` arrays are **empty** (a no-role member sees no section) and no figure leaks. Confirm hop count did not regress beyond the added reads (Gate A reports it).

- [ ] **Step 5: Commit** (two commits — code, then the deliberate golden re-record):
```bash
git add src/modules/main/main.ts src/modules/main/executive.ts src/app/api/studios/[slug]/main/route.ts
git commit -m "The Overview endpoint serves executive widgets only to the tiers that bought them"
git add tests/goldens/owner.main.json tests/goldens/norole.main.json
git commit -m "Record the Main goldens with the executive block; no figures reach a no-role member"
```

---

### Task 5: The drill-down helper (shared shell)

**Files:**
- Create: `src/components/dashboard/drill.ts`
- Test: `tests/suite.mjs`

**Interfaces:**
- Produces: `drillHref(slug, sectionKey, filter?) → string`. Consumed by Tasks 8.

- [ ] **Step 1: Write the failing test:**
```js
import { drillHref } from "@/components/dashboard/drill";
console.log("\n== Shared shell: drill-down deep-links into the department screen");
ok("bare link is the section screen", drillHref("acme", "sales-tickets") === "/acme/sales-tickets", drillHref("acme", "sales-tickets"));
ok("a filter rides as a query", drillHref("acme", "sales-tickets", { status: "open" }) === "/acme/sales-tickets?status=open");
```
- [ ] **Step 2: Run to verify it fails.** Run: `npm run test:integration`.
- [ ] **Step 3: Implement** `src/components/dashboard/drill.ts`:
```ts
// Turn a dashboard figure into a link into the department screen that OWNS its
// rows, carrying an optional filter as a query the screen reads. No transaction
// table is duplicated inside a dashboard — the department screen already lists.
export function drillHref(slug: string, sectionKey: string, filter?: Record<string, string>): string {
  const base = `/${slug}/${sectionKey}`;
  if (!filter || Object.keys(filter).length === 0) return base;
  return `${base}?${new URLSearchParams(filter).toString()}`;
}
```
- [ ] **Step 4: Run to verify it passes.** Run: `npm run test:integration`, then `npx tsc --noEmit`.
- [ ] **Step 5: Commit.**
```bash
git add src/components/dashboard/drill.ts tests/suite.mjs
git commit -m "A dashboard figure can deep-link into the screen that owns its rows"
```

---

### Task 6: The shared shell — FilterBar + preset ranges

**Files:**
- Create: `src/components/dashboard/dateRange.ts` (pure preset logic)
- Create: `src/components/dashboard/FilterBar.jsx` (the control)
- Test: `tests/suite.mjs`

**Interfaces:**
- Produces: `presetRange(preset, asOf, fiscalStartMonth?) → { start: string; end: string }` where `preset ∈ "month"|"quarter"|"year"`; `<FilterBar value onChange />`. Consumed by Task 8.

- [ ] **Step 1: Write the failing test** (pure logic only — the JSX is verified in the browser in Task 8):
```js
import { presetRange } from "@/components/dashboard/dateRange";
console.log("\n== Shared shell: fiscal-aware preset ranges");
{
  const m = presetRange("month", "2026-08-25", 1);
  ok("this month starts on the 1st", m.start === "2026-08-01", m.start);
  ok("this month ends at next month's 1st (exclusive)", m.end === "2026-09-01", m.end);
  const y = presetRange("year", "2026-08-25", 1);
  ok("calendar year starts in January", y.start === "2026-01-01", y.start);
  const fy = presetRange("year", "2026-08-25", 4); // fiscal year starts April
  ok("a fiscal year starting in April rolls back to this April", fy.start === "2026-04-01", fy.start);
}
```
- [ ] **Step 2: Run to verify it fails.** Run: `npm run test:integration`.
- [ ] **Step 3: Implement** `src/components/dashboard/dateRange.ts`:
```ts
// Preset date windows for the dashboard FilterBar, fiscal-aware. Half-open
// [start, end): end is exclusive so "this month" and "next month" never overlap.
// asOf is injected for testability; fiscalStartMonth is 1..12 (1 = January).
export type Preset = "month" | "quarter" | "year";
export function presetRange(preset: Preset, asOf: string, fiscalStartMonth = 1): { start: string; end: string } {
  const d = new Date(`${asOf}T00:00:00`);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based
  if (preset === "month") {
    return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 1)) };
  }
  if (preset === "quarter") {
    const q = Math.floor(m / 3) * 3;
    return { start: iso(new Date(y, q, 1)), end: iso(new Date(y, q + 3, 1)) };
  }
  // year (fiscal): step back to the most recent fiscalStart on or before asOf
  const fs = fiscalStartMonth - 1;
  const startYear = m >= fs ? y : y - 1;
  return { start: iso(new Date(startYear, fs, 1)), end: iso(new Date(startYear + 1, fs, 1)) };
}
```
- [ ] **Step 4: Implement the control** `src/components/dashboard/FilterBar.jsx`. Keep it a thin client island; state lives in the URL query so a filtered view is shareable and a drill carries the range. Mirror the token/logical-property rules (`ps-`/`pe-`, `.num`); no `motion/react`:
```jsx
"use client";
import { useCallback } from "react";
// A row of preset buttons. `value` is one of "month" | "quarter" | "year";
// `onChange(preset)` lifts state to the dashboard, which reads the URL query.
const PRESETS = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
];
export default function FilterBar({ value = "month", onChange }) {
  const pick = useCallback((k) => onChange?.(k), [onChange]);
  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      {PRESETS.map((p) => (
        <button key={p.key} type="button" onClick={() => pick(p.key)}
          className={`rounded px-3 py-1 text-sm ${value === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
```
(Confirm the exact utility class names against an existing `studio2` control before finalising; match whatever the codebase already uses for a selected pill.)
- [ ] **Step 5: Run tests + typecheck + commit.**
```bash
npm run test:integration && npx tsc --noEmit
git add src/components/dashboard/dateRange.ts src/components/dashboard/FilterBar.jsx tests/suite.mjs
git commit -m "The dashboard shell offers fiscal-aware date presets"
```

---

### Task 7: The shared shell — CSV export

**Files:**
- Create: `src/components/dashboard/exportTable.ts`
- Test: `tests/suite.mjs`

**Interfaces:**
- Produces: `toCSV(rows, columns) → string` and `downloadCSV(filename, csv)` (browser side-effect). Consumed by Task 8. (Chart PNG and XLSX are noted as follow-ons at the plan's end; CSV is the v1 table export.)

- [ ] **Step 1: Write the failing test:**
```js
import { toCSV } from "@/components/dashboard/exportTable";
console.log("\n== Shared shell: CSV export escapes honestly");
{
  const rows = [{ name: "Acme, Inc", owed: 250 }, { name: 'He said "hi"', owed: 90 }];
  const csv = toCSV(rows, [{ key: "name", header: "Client" }, { key: "owed", header: "Owed" }]);
  ok("header row first", csv.split("\n")[0] === "Client,Owed", csv.split("\n")[0]);
  ok("a comma forces quoting", csv.includes('"Acme, Inc"'), csv);
  ok("an inner quote is doubled", csv.includes('"He said ""hi"""'), csv);
}
```
- [ ] **Step 2: Run to verify it fails.** Run: `npm run test:integration`.
- [ ] **Step 3: Implement** `src/components/dashboard/exportTable.ts`:
```ts
// CSV export for drillable tables, filter-aware (the caller passes the rows it
// currently shows, not the unfiltered set). Zero dependency; RFC-4180 quoting.
export type Column = { key: string; header: string };
export function toCSV(rows: Record<string, unknown>[], columns: Column[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(",")).join("\n");
  return body ? `${head}\n${body}` : head;
}
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```
- [ ] **Step 4: Run tests + typecheck + commit.**
```bash
npm run test:integration && npx tsc --noEmit
git add src/components/dashboard/exportTable.ts tests/suite.mjs
git commit -m "A drillable table exports the rows it is showing to CSV"
```

---

### Task 8: The MainDashboard component

**Files:**
- Create: `src/components/studio2/MainDashboard.jsx`
- Test: browser verification only (see below) — the arithmetic behind it is already asserted in Tasks 2-3; goldens cover the payload.

**Interfaces:**
- Consumes: `data.executive = { widgets, locked }` (Task 4), `drillHref` (Task 5), `FilterBar`/`presetRange` (Task 6), `toCSV`/`downloadCSV` (Task 7), the chart kit, `Widget`/`StatRow`/`DashGrid`, `StatTile`.
- Produces: `<MainDashboard slug executive me />` (default export). Consumed by Task 9.

- [ ] **Step 1: Implement**, mirroring `src/components/studio2/TechnicalDashboard.jsx` exactly (imports block at its lines 16-24, and the `<Widget ... locked=... lockedWhat=...>` shown-vs-teaser pattern). Here the gate is **server-side**: a widget key present in `executive.widgets` renders; a key in `executive.locked` renders the teaser; a key in neither (no visible section) is omitted.
```jsx
"use client";
import { StatTile } from "@/components/studio2/ui";
import { Widget, DashGrid } from "@/components/dashboard";
import { AreaChart, BarList, Sparkline, ChartFrame } from "@/components/charts";
import { drillHref } from "@/components/dashboard/drill";
import { fmtDate } from "@/lib/format";

// Server-gated: `executive.widgets[key]` present → render; key in
// `executive.locked` → teaser; neither → the viewer can't see that section, omit.
export default function MainDashboard({ slug, executive }) {
  const w = executive?.widgets || {};
  const locked = new Set(executive?.locked || []);
  const has = (k) => k in w;
  const show = (k) => has(k) || locked.has(k);

  return (
    <DashGrid>
      {show("main.activity") && (
        <Widget title="Department activity" hint="New records, last 30 days" span={2}
          locked={locked.has("main.activity")} lockedWhat="Department activity">
          {(w["main.activity"] || []).length ? (
            (w["main.activity"]).map((d) => (
              <div key={d.section} className="mb-2">
                <a href={drillHref(slug, d.section)} className="text-sm text-muted-foreground">{d.section}</a>
                <Sparkline data={d.series.map((s) => s.value)} />
              </div>
            ))
          ) : <p className="text-sm text-muted-foreground">No sections you can see yet.</p>}
        </Widget>
      )}

      {show("main.awaiting-you") && (
        <Widget title="Awaiting you" hint="Waiting on your action"
          locked={locked.has("main.awaiting-you")} lockedWhat="Awaiting you">
          {(w["main.awaiting-you"] || []).length ? (
            <ul>
              {(w["main.awaiting-you"]).map((q) => (
                <li key={q.id}>
                  <a href={drillHref(slug, q.section, { id: q.id })} className="flex justify-between text-sm">
                    <span>{q.label}</span><span className="num text-muted-foreground">{fmtDate(q.at)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Nothing is waiting on you.</p>}
        </Widget>
      )}

      {show("main.event-ribbon") && (
        <Widget title="Activity ribbon" hint="All departments, last 30 days" span={2}
          locked={locked.has("main.event-ribbon")} lockedWhat="Activity ribbon">
          <ChartFrame labels={(w["main.event-ribbon"] || []).map((d, i) => (i % 5 === 0 ? d.label : ""))} height={120}>
            <AreaChart height={120} labels={(w["main.event-ribbon"] || []).map((d) => d.label)}
              series={[{ name: "Events", data: (w["main.event-ribbon"] || []).map((d) => d.value), color: "rgb(var(--chart-1))" }]} />
          </ChartFrame>
        </Widget>
      )}
    </DashGrid>
  );
}
```
Confirm `Sparkline`'s and `Widget`'s exact prop names against `src/components/charts/index.tsx` and `src/components/dashboard/index.jsx` before finalising (the extraction confirms `Widget` takes `title`, `hint`, `span`, `locked`, `lockedWhat`). Add the `main.headline-trend` deltas onto the existing `StatTile`s in Task 9 rather than here, since the tiles live in `StudioMain`.

- [ ] **Step 2: Browser-verify** (per CLAUDE.md the sandbox can't complete OTP login, so verify what the pane can — the component renders its settled state server-side): `npm run dev:sandbox`, open `localhost:3010/sandbox`, and confirm the Overview renders the widgets with no console error and no layout hole. Assert the numbers via the Task 2-3 tests, not the animation (the pane can't observe a count-up).

- [ ] **Step 3: Commit.**
```bash
git add src/components/studio2/MainDashboard.jsx
git commit -m "The Overview draws its executive widgets, gated by what the tier bought"
```

---

### Task 9: Mount the dashboard in StudioMain, with headline trends

**Files:**
- Modify: `src/components/studio2/StudioMain.js` (fetch/consume ~22-36; tiles ~41-79)

**Interfaces:**
- Consumes: `data.executive` (Task 4), `MainDashboard` (Task 8).
- Produces: the mounted Overview.

- [ ] **Step 1: Consume the new field.** In `StudioMain.js`, extend the destructure (line 36) to `const { studio, me, headlines, recent, sections, nav, executive } = data;`.

- [ ] **Step 2: Apply headline trends to the tiles.** For each tile whose key matches a `main.headline-trend` entry (present only when entitled), pass a `delta`/`spark` to `StatTile` (confirm `StatTile` accepts them in `src/components/studio2/ui.js`; if not, that is a one-line prop addition to `StatTile` in the same commit). Trends are keyed by section (`t.key`), matching the `trends[].key` from the seam.

- [ ] **Step 3: Mount `MainDashboard`** beneath the existing tiles + feed:
```jsx
import MainDashboard from "@/components/studio2/MainDashboard";
// ...after the recent feed block:
{executive && <MainDashboard slug={slug} executive={executive} />}
```

- [ ] **Step 4: Verify.** `npm test && npx tsc --noEmit && npx next build`. Confirm the bundle budget still passes (`MainDashboard` pulls charts already in the studio chunk; no `motion/react`). Browser-verify as in Task 8.

- [ ] **Step 5: Commit.**
```bash
git add src/components/studio2/StudioMain.js src/components/studio2/ui.js
git commit -m "The studio front door mounts its executive Overview"
```

---

### Task 10: qa-security — the acceptance checklist

**Files:**
- Modify: `tests/suite.mjs` (integration assertions over the real Main route)

**Interfaces:**
- Consumes: the Main route handler (imported as gate-a/suite already import route handlers), two studios/tiers.

- [ ] **Step 1: Assert the two gates on the real route.** Following the suite's route-invocation pattern (`capture(MAIN.GET, req(...), ctx({slug}))`) and its two-studio setup, add:
```js
console.log("\n== Main executive: visibility × entitlement, server-side");
// (a) a no-role member gets the block but NO figures — visibility survives aggregation
{
  await signIn(memberUser.id);
  const res = await capture(MAIN.GET, req(`/api/studios/${slug}/main`), ctx({ slug }));
  const ex = res.body.executive;
  ok("a no-role member receives an executive block", !!ex);
  ok("...but every activity series is empty (no section leaked)", (ex.widgets["main.activity"] || []).length === 0, JSON.stringify(ex.widgets["main.activity"]));
  ok("...and no awaiting-you rows leak", (ex.widgets["main.awaiting-you"] || []).length === 0);
}
// (b) a below-rung tier sees the widget LOCKED, not a number (use a basic-tier studio)
{
  await signIn(basicOwner.id);
  const res = await capture(MAIN.GET, req(`/api/studios/${basicSlug}/main`), ctx({ slug: basicSlug }));
  ok("a basic tier does not receive moderate figures", !("main.event-ribbon" in res.body.executive.widgets));
  ok("...it receives the locked key instead", res.body.executive.locked.includes("main.event-ribbon"));
}
```
(Reuse or extend the suite's existing tier/studio fixtures; a basic-rung studio may already exist for the `enabledWidgets` block — grep the suite for a moderate/basic tier fixture before creating one.)

- [ ] **Step 2: Run.** `npm test` — Expected: PASS, and the goldens from Task 4 unchanged.

- [ ] **Step 3: Walk the §8 checklist** from the spec against the built dashboard; fix any gap in the owning task. Confirm: approved charts only; every KPI/segment drills; entitlement server-side; empty/loading/error states; export filter-aware; bundle green.

- [ ] **Step 4: Commit.**
```bash
git add tests/suite.mjs
git commit -m "The Overview proves no figure crosses a visibility or entitlement line"
```

---

## Phase 2 pointers (for the follow-up plan — not built here)

When Phase 1 lands, the rollup plan replaces only `readAggregate`'s body:

- **Key:** add one builder to `src/platform/db/keys.ts` beside the `S.*` group (keys.ts:263-299), e.g. `S.mainAgg: (studioId) => \`${P}s:${studioId}:mainagg\``. Built ONLY here (invariant 1). Store a hash, fields per section (`${section}:activity`, `${section}:kpi:${period}`, `meta:refreshedAt`).
- **On-write updater:** hook the events `src/platform/db/sections.ts` already emits — `emit(studioId, { type: TYPE.rowCreated|rowUpdated, sectionId, collection, rowId })` (sections.ts:203/226) — incrementing the day bucket. Best-effort, its own error boundary, never fails the write.
- **Reconcile cron:** shape it like `src/app/api/cron/year-rollover/route.ts` — `cronDenied(request)` first (fails closed on missing `CRON_SECRET`, invariant 15), full recompute-and-replace, prune old buckets by explicit `HDEL` of named fields (never a scan, invariant 17). Register its schedule in `vercel.json`.
- **Cut over** behind the oracle: a suite block computes each figure from the rollup AND from the on-read path and asserts equality to the cent/count before the seam is switched.
- **XLSX export** (fast-follow): route through `researcher` for a zero-dependency SpreadsheetML writer vs a small lib, judged on the 250 KB chunk / 1600 KB total budget, before adding anything.

## Self-review

- **Spec coverage:** §3.1 FilterBar → Task 6; §3.2 drill → Task 5, wired in Task 8; §3.3 export (CSV) → Task 7 (PNG/XLSX deferred, noted); §3.4 freshness → carried by the seam, surfaced when Phase 2 lands (on-read reads "just now"); §4.0 seam → Task 4; §5.1 free floor unchanged → Tasks 8-9 leave tiles/feed intact; §5.2 four widgets → Tasks 2-4-8; §5.3 awaiting-you → Task 3; §6 registry → Task 1; §8 checklist → Task 10; §2 double gate → Tasks 3-4 (visibility) + Task 4 (entitlement, server-side), proven in Task 10. Phase-2-only spec parts (§4.1-4.4) are out of scope by design and pointered above.
- **Placeholder scan:** no TBD/TODO; every code step carries real code; the two "confirm prop names against file X" notes point at named files with confirmed patterns, not vague instructions.
- **Type consistency:** `readAggregate`/`activityByDay`/`periodDelta`/`rankQueue`/`awaitingQueue`/`drillHref`/`presetRange`/`toCSV` names and signatures match across their producing and consuming tasks; the response field `executive: { widgets, locked }` is produced in Task 4 and consumed by the same names in Tasks 8-9-10.
