# Main Rollup (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Back the Main executive dashboard's on-read derivation with a per-studio Redis rollup, so an entitled-tier Main load reads one `HGETALL` instead of six collection reads — behind a default-off flag with instant rollback.

**Architecture:** A per-studio hash `S.mainAgg(studioId)` holds integer create-counts keyed `\`${sectionId}:day:${YYYY-MM-DD}\``. A best-effort `hIncrBy` on the write path (`addRow`) keeps the current day fresh; a fail-closed nightly cron recomputes the truth (`hSet`) and prunes stale fields (`hDel`). Behind `MAIN_ROLLUP_READ`, `readAggregate` reconstructs the same `ExecutiveAggregate` from the hash, visibility-filtered. An oracle proves rollup == on-read to the unit before any cutover.

**Tech Stack:** Redis (via `src/platform/db/store.ts` atomic hash wrappers), TypeScript (`src/platform/db/**`, `src/modules/main/**`), Next.js route handlers for the cron.

**Spec:** `docs/superpowers/specs/2026-08-25-main-rollup-phase2-design.md` — read it alongside this plan.

## Global Constraints

- **Keys are built only in `src/platform/db/keys.ts`** — `S.mainAgg` is the one new builder (invariant 1).
- **Visibility survives aggregation (invariant 2):** the hash stores every section's counts; `readAggregate` reconstructs a series **only** for sections `ctx.seen(...)` allows. No count for an unseen section reaches the client.
- **The updater is best-effort:** it runs fire-and-forget from `addRow`, swallows its own errors, and never blocks or fails the write. A miss is corrected by the nightly reconcile.
- **UTC day boundaries everywhere** — `new Date().toISOString().slice(0,10)` — matching Phase 1's UTC bucketing.
- **The cron fails closed (invariant 15):** `cronDenied(request)` first; a missing `CRON_SECRET` refuses.
- **No broad-scan destruction (invariant 17):** prune by explicit `hDel` of named fields only; never `FLUSH*`, never a prefix/empty scan, never `sweepOrphans` from a test. The reconcile is rebuild-and-replace of known fields.
- **Atomic hash ops (invariant 8):** the updater is `hIncrBy` (a counter, not a collection write); the reconcile `hSet`s computed cache values. No blind whole-collection write.
- **One subscriber per process (invariant 13):** the updater is inline in the write path; it adds no Redis subscriber.
- **Flag default OFF.** CI keeps it off, so the Phase-1 goldens and the on-read path stay the contract. The `executive:{widgets,locked}` response shape and `MainDashboard` are unchanged.
- **Tests** run against real Redis under `NOMPANY_KEY_PREFIX`; never `FLUSH*`/`sweepOrphans`.
- **Verification (every task):** `npm run test:integration` (or `test:gate-a` where noted) · `npx tsc --noEmit` · `npx tsc --noEmit -p tsconfig.strict.json`. The full `npm test` exceeds the subagent Bash timeout — run the targeted suite foreground, or background it and wait.
- **Siblings import relatively** within a folder; `platform/db` has no barrel. The write path stays a **platform-only** dependency (`addRow` → `./mainAgg`, never into `modules/**`).
- **Commit subjects are declarative sentences.** Branch `main`; commit per task; do NOT push (the controller pushes).

---

## File Structure

| File | Create/Modify | Responsibility |
|---|---|---|
| `src/platform/db/keys.ts` | Modify | Add `S.mainAgg(studioId)` builder. |
| `src/platform/db/mainAgg.ts` | Create | The canonical `MAIN_AGG_SOURCES`, `utcDay`/`aggField` helpers, and the best-effort `bumpMainAgg` updater. Platform-only deps. |
| `src/platform/db/sections.ts` | Modify | One fire-and-forget `bumpMainAgg` call in `addRow`. |
| `src/platform/db/store.ts` | Modify | Add an `hSet(key, field, value)` wrapper (the reconcile needs it; none exists). |
| `src/app/api/cron/main-rollup/route.ts` | Create | The fail-closed nightly reconcile. |
| `vercel.json` | Modify | Register the daily cron. |
| `src/modules/main/executive.ts` | Modify | Import `MAIN_AGG_SOURCES`; add the flag-gated rollup-read branch + count→series pure helpers. |
| `tests/suite.mjs` | Modify | Updater, reconcile, count-helper, oracle, and bleed assertions. |

**Out of this plan (ops handoff):** spec slice 4 — flipping `MAIN_ROLLUP_READ=on` in production after the read-only parity check — is a deploy/ops step for the user, not a code task. It is documented at the end.

---

### Task 1: The key builder and the shared source list

**Files:**
- Modify: `src/platform/db/keys.ts` (the `S` object, ~263-299)
- Create: `src/platform/db/mainAgg.ts`
- Modify: `src/modules/main/executive.ts` (replace its local `ACTIVITY_SOURCES`, ~64-72, with an import)
- Test: `tests/suite.mjs`

**Interfaces:**
- Produces: `S.mainAgg(studioId): string`; `MAIN_AGG_SOURCES: { section: string; fallback: string|null; collection: string }[]`; `utcDay(iso?: string): string`; `aggField(sectionId: string, day: string): string`. Consumed by Tasks 2, 3, 4.

- [ ] **Step 1: Write the failing test** in `tests/suite.mjs`:
```js
import { S } from "@/platform/db/keys";
import { MAIN_AGG_SOURCES, utcDay, aggField } from "@/platform/db/mainAgg";

console.log("\n== Main rollup: key builder and source list");
ok("S.mainAgg is namespaced under the studio", S.mainAgg("stud_1").endsWith("s:stud_1:mainagg"), S.mainAgg("stud_1"));
ok("six tracked sources", MAIN_AGG_SOURCES.length === 6, String(MAIN_AGG_SOURCES.length));
ok("sources carry the tracked collections", MAIN_AGG_SOURCES.map((s) => s.collection).includes("salesTickets"));
ok("utcDay is a YYYY-MM-DD string", /^\d{4}-\d{2}-\d{2}$/.test(utcDay("2026-08-25T09:00:00Z")) && utcDay("2026-08-25T23:59:59Z") === "2026-08-25");
ok("aggField composes id and day", aggField("sec_1", "2026-08-25") === "sec_1:day:2026-08-25");
```

- [ ] **Step 2: Run to verify it fails.** `npm run test:integration` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement.** In `keys.ts`, add to the `S` object: `mainAgg: (studioId: string) => \`${P}s:${studioId}:mainagg\`,`. Create `src/platform/db/mainAgg.ts`:
```ts
// THE MAIN ROLLUP — write-side. The canonical list of what the executive Overview
// aggregates, plus the best-effort updater. Kept in platform (not modules/main) so
// the write path (addRow) stays a platform-only dependency. The READ side
// (executive.ts) imports MAIN_AGG_SOURCES from here so the two never drift.
import { S } from "./keys";
import { hIncrBy } from "./store";

export const MAIN_AGG_SOURCES: { section: string; fallback: string | null; collection: string }[] = [
  { section: "sales-tickets", fallback: "sales", collection: "salesTickets" },
  { section: "technical-quotations", fallback: "technical", collection: "quotations" },
  { section: "technical-rfq", fallback: "technical", collection: "rfqs" },
  { section: "projects-list", fallback: "projects", collection: "projects" },
  { section: "inventory-items", fallback: "inventory", collection: "inventoryItems" },
  { section: "tasks", fallback: null, collection: "tasks" },
];

const TRACKED_COLLECTIONS: ReadonlySet<string> = new Set(MAIN_AGG_SOURCES.map((s) => s.collection));

/** The UTC day (YYYY-MM-DD) of an ISO instant, or of now. Matches Phase 1 bucketing. */
export function utcDay(iso?: string): string {
  return (iso ? new Date(iso) : new Date()).toISOString().slice(0, 10);
}

/** The hash field for a section's count on a day. Keyed by sectionId (§2). */
export function aggField(sectionId: string, day: string): string {
  return `${sectionId}:day:${day}`;
}

/**
 * BEST-EFFORT. Fired fire-and-forget from addRow after a row is written. Never
 * throws, never awaited on the write's critical path. Only the six tracked
 * collections count; a miss is corrected by the nightly reconcile.
 */
export async function bumpMainAgg(studioId: string, sectionId: string, collection: string): Promise<void> {
  try {
    if (!TRACKED_COLLECTIONS.has(collection)) return;
    await hIncrBy(S.mainAgg(studioId), aggField(sectionId, utcDay()), 1);
  } catch {
    // swallow — the reconcile is the source of truth, and a rollup miss must
    // never surface on the write that already succeeded.
  }
}
```
In `executive.ts`, delete the local `ACTIVITY_SOURCES` (~64-72) and instead `import { MAIN_AGG_SOURCES } from "@/platform/db/mainAgg";`, then replace every `ACTIVITY_SOURCES` reference with `MAIN_AGG_SOURCES` (same shape, so behaviour is identical — golden-neutral).

- [ ] **Step 4: Run to verify it passes.** `npm run test:integration`, then `npm run test:gate-a` (the executive refactor must stay golden-neutral — `owner.main.json`/`norole.main.json` unchanged), then `npx tsc --noEmit` and `npx tsc --noEmit -p tsconfig.strict.json`.

- [ ] **Step 5: Commit.**
```bash
git add src/platform/db/keys.ts src/platform/db/mainAgg.ts src/modules/main/executive.ts tests/suite.mjs
git commit -m "The Main rollup has a key and a single source of what it counts"
```

---

### Task 2: The best-effort updater on the write path

**Files:**
- Modify: `src/platform/db/sections.ts` (`addRow`, ~191-205)
- Test: `tests/suite.mjs`

**Interfaces:**
- Consumes: `bumpMainAgg`, `S.mainAgg`, `aggField`, `utcDay` (Task 1); `hGetAll` (`src/platform/db/store.ts`), `getSectionByKey`/`addRow` (`src/platform/db/sections.ts`).
- Produces: `addRow` now increments the rollup for tracked collections.

- [ ] **Step 1: Write the failing test** in `tests/suite.mjs` (seed a studio via the existing helpers — mirror the studio-creation block near the top of the suite):
```js
import { hGetAll } from "@/platform/db/store";
import { getSectionByKey, addRow } from "@/platform/db/sections";

console.log("\n== Main rollup: the write path increments the rollup");
{
  // `studio` is a seeded studio in scope (reuse the suite's fixture). Resolve the
  // sales-tickets section, add two tickets and one untracked row, check the hash.
  const sec = await getSectionByKey(studio.id, "sales-tickets");
  const today = utcDay();
  await addRow(studio.id, sec.id, "salesTickets", { title: "A", createdAt: `${today}T09:00:00Z` });
  await addRow(studio.id, sec.id, "salesTickets", { title: "B", createdAt: `${today}T10:00:00Z` });
  await addRow(studio.id, sec.id, "notes", { body: "untracked" }); // not a tracked collection
  const hash = await hGetAll(S.mainAgg(studio.id));
  ok("two tracked creates count as 2 on today's field", hash[aggField(sec.id, today)] === "2", JSON.stringify(hash));
  ok("an untracked collection writes no rollup field", !Object.keys(hash).some((f) => f.includes(":day:") && hash[f] !== "2"), JSON.stringify(hash));
}
```

- [ ] **Step 2: Run to verify it fails.** `npm run test:integration` — Expected: FAIL (no field written yet).

- [ ] **Step 3: Implement.** In `sections.ts`, import `bumpMainAgg` from `./mainAgg`, and in `addRow`, after the existing `await emit(...)` line, add the fire-and-forget call (do NOT await it — it must not join the write's latency or failure path):
```ts
  await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name, rowId: row.id as string });
  void bumpMainAgg(studioId, sectionId, name); // best-effort rollup, never awaited (§3)
  return row;
```

- [ ] **Step 4: Run to verify it passes.** `npm run test:integration`. Because `void`-ed, the increment may race the assertion — if the test is flaky, `await bumpMainAgg(...)` explicitly INSIDE THE TEST after the addRows (not in addRow) to settle, or add a short `await` on a `hGetAll` retry; keep `addRow` itself using `void`. Then `npx tsc --noEmit` and the strict config.

- [ ] **Step 5: Commit.**
```bash
git add src/platform/db/sections.ts tests/suite.mjs
git commit -m "Creating a tracked record ticks the Main rollup, best-effort"
```

---

### Task 3: The fail-closed reconcile cron

**Files:**
- Modify: `src/platform/db/store.ts` (add `hSet` wrapper, near the other hash ops ~301-400)
- Create: `src/app/api/cron/main-rollup/route.ts`
- Modify: `vercel.json`
- Test: `tests/suite.mjs`

**Interfaces:**
- Consumes: `cronDenied` (`@/platform/auth/cronAuth`), `listStudios` (`@/modules/main/studios`), `listSections`/`readCol` (`@/platform/db/sections`), `hGetAll`/`hSet`/`hDel` (`@/platform/db/store`), `S.mainAgg`, `MAIN_AGG_SOURCES`, `aggField`.
- Produces: `GET` handler that rebuilds every studio's rollup to match live rows.

- [ ] **Step 1: Add the `hSet` wrapper** to `src/platform/db/store.ts`, following the atomic-op convention there (the module exposes `hIncrBy`, `hGetAll`, `hDel` but no plain set):
```ts
export async function hSet(key: string, field: string, value: string | number): Promise<number> {
  return (await r()).hSet(key, field, String(value));
}
```

- [ ] **Step 2: Write the failing test** in `tests/suite.mjs` (seed known rows, run the handler, check the rebuilt hash + auth):
```js
import { hSet as _hSetProbe } from "@/platform/db/store"; // ensures the wrapper exists
const ROLLUP = (await import("@/app/api/cron/main-rollup/route.ts")).GET;

console.log("\n== Main rollup: the reconcile rebuilds from live rows and fails closed");
{
  const prevSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-secret";
  const sec = await getSectionByKey(studio.id, "sales-tickets");
  const today = utcDay();
  // Seed three creates today, one 200 days ago (outside the 90-day horizon).
  await addRow(studio.id, sec.id, "salesTickets", { title: "1", createdAt: `${today}T01:00:00Z` });
  await addRow(studio.id, sec.id, "salesTickets", { title: "2", createdAt: `${today}T02:00:00Z` });
  await addRow(studio.id, sec.id, "salesTickets", { title: "3", createdAt: `${today}T03:00:00Z` });
  await addRow(studio.id, sec.id, "salesTickets", { title: "old", createdAt: "2026-01-01T00:00:00Z" });
  // Plant a stale field the reconcile must prune.
  await _hSetProbe(S.mainAgg(studio.id), aggField(sec.id, "2020-01-01"), 99);

  const authed = new Request("http://x/api/cron/main-rollup", { headers: { authorization: "Bearer test-secret" } });
  const res = await ROLLUP(authed);
  ok("reconcile returns ok", res.status === 200, String(res.status));
  const hash = await hGetAll(S.mainAgg(studio.id));
  ok("today's count is the 3 live creates in-window", hash[aggField(sec.id, today)] === "3", JSON.stringify(hash));
  ok("the out-of-horizon create is not in the rollup", !(aggField(sec.id, "2026-01-01") in hash), JSON.stringify(hash));
  ok("the planted stale field was pruned by name", !(aggField(sec.id, "2020-01-01") in hash), JSON.stringify(hash));
  ok("a refreshedAt stamp is set", typeof hash["meta:refreshedAt"] === "string" && hash["meta:refreshedAt"].length > 0);

  const denied = await ROLLUP(new Request("http://x/api/cron/main-rollup")); // no auth
  ok("reconcile refuses an unauthenticated request", denied.status === 401 || denied.status === 503, String(denied.status));
  process.env.CRON_SECRET = prevSecret;
}
```
Note: the "old" (2026-01-01) create is >90 days before a test run dated 2026-08-25+; if the suite's clock is near that seed, widen the offset. The intent: a create outside the 90-day horizon is excluded.

- [ ] **Step 3: Run to verify it fails.** `npm run test:integration` — Expected: FAIL (route module missing).

- [ ] **Step 4: Implement the cron.** Create `src/app/api/cron/main-rollup/route.ts`, mirroring `src/app/api/cron/year-rollover/route.ts` for the `cronDenied`/`withRequest`/`runtime`/`dynamic` boilerplate (open it to copy the exact `withRequest` import path):
```ts
import { cronDenied } from "@/platform/auth/cronAuth";
import { listStudios } from "@/modules/main/studios";
import { listSections, readCol } from "@/platform/db/sections";
import { hGetAll, hSet, hDel } from "@/platform/db/store";
import { S } from "@/platform/db/keys";
import { MAIN_AGG_SOURCES, aggField } from "@/platform/db/mainAgg";
// import { withRequest } from "<same path year-rollover uses>";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = cronDenied(request);
  if (denied) return denied;
  const now = new Date();
  const HORIZON = 90;
  const keepDays = new Set<string>();
  for (let i = 0; i < HORIZON; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    keepDays.add(d.toISOString().slice(0, 10));
  }
  const studios = await listStudios();
  let rebuilt = 0;
  for (const studio of studios as { id: string }[]) {
    const sid = studio.id;
    const sections = await listSections(sid);
    const byKey: Record<string, { id: string }> = Object.fromEntries(sections.map((s) => [s.key, s]));
    const fresh: Record<string, number> = {};
    for (const src of MAIN_AGG_SOURCES) {
      const sec = byKey[src.section] || (src.fallback ? byKey[src.fallback] : null);
      if (!sec) continue;
      const rows = await readCol(sid, sec.id, src.collection);
      for (const row of rows as { createdAt?: string }[]) {
        const day = row.createdAt ? String(row.createdAt).slice(0, 10) : "";
        if (!day || !keepDays.has(day)) continue;
        const f = aggField(sec.id, day);
        fresh[f] = (fresh[f] || 0) + 1;
      }
    }
    const key = S.mainAgg(sid);
    const existing = await hGetAll(key);
    for (const [f, v] of Object.entries(fresh)) await hSet(key, f, v);
    const stale = Object.keys(existing).filter((f) => f !== "meta:refreshedAt" && !(f in fresh));
    if (stale.length) await hDel(key, ...stale);
    await hSet(key, "meta:refreshedAt", now.toISOString());
    rebuilt += 1;
  }
  return Response.json({ ok: true, studios: rebuilt, at: now.toISOString() });
}
```
Wrap the body in `withRequest("cron/main-rollup", () => …)` exactly as `year-rollover` does if that file wraps its handler. In `vercel.json`, add to the `crons` array: `{ "path": "/api/cron/main-rollup", "schedule": "15 0 * * *" }`.

- [ ] **Step 5: Run to verify it passes.** `npm run test:integration`, then `npx tsc --noEmit` and the strict config.

- [ ] **Step 6: Commit.**
```bash
git add src/platform/db/store.ts "src/app/api/cron/main-rollup/route.ts" vercel.json tests/suite.mjs
git commit -m "A nightly cron rebuilds each studio's Main rollup and fails closed"
```

---

### Task 4: The flag-gated rollup read, and the oracle

**Files:**
- Modify: `src/modules/main/executive.ts` (`readAggregate` ~86-105; add pure count→series helpers)
- Test: `tests/suite.mjs`

**Interfaces:**
- Consumes: `hGetAll` (`store`), `S.mainAgg`, `MAIN_AGG_SOURCES`, the existing `trailingTwoMonths` (executive.ts), `ctx.seen`.
- Produces: `activitySeriesFromCounts(counts, days, asOf) → {label,value}[]`, `trendFromCounts(counts, period) → {current,previous,deltaPct}`, and a `readAggregate` that reads the rollup when `MAIN_ROLLUP_READ` is truthy.

- [ ] **Step 1: Write the failing test** for the pure helpers AND the oracle in `tests/suite.mjs`:
```js
import { activitySeriesFromCounts, trendFromCounts, readAggregate } from "@/modules/main/executive";

console.log("\n== Main rollup: count→series helpers match the row-based derivation");
{
  const counts = { "2026-08-25": 2, "2026-08-24": 1, "2026-07-15": 5 };
  const s = activitySeriesFromCounts(counts, 30, "2026-08-25");
  ok("series is one entry per day", s.length === 30, String(s.length));
  ok("today reads its count", s[29].value === 2, JSON.stringify(s[29]));
  ok("a day outside the window is excluded", s.reduce((a, x) => a + x.value, 0) === 3, "leaked");
  const t = trendFromCounts(counts, { start: "2026-07-01", mid: "2026-08-01", end: "2026-09-01" });
  ok("current window sums August", t.current === 3, String(t.current));
  ok("prior window sums July", t.previous === 5, String(t.previous));
  ok("delta is a real percentage", t.deltaPct === -40, String(t.deltaPct));
}

console.log("\n== Main rollup: the oracle — rollup equals on-read, to the unit");
{
  process.env.CRON_SECRET = "test-secret";
  const sec = await getSectionByKey(studio.id, "sales-tickets");
  const today = utcDay();
  await addRow(studio.id, sec.id, "salesTickets", { title: "x", createdAt: `${today}T04:00:00Z` });
  await (await import("@/app/api/cron/main-rollup/route.ts")).GET(
    new Request("http://x", { headers: { authorization: "Bearer test-secret" } }),
  );
  const ctx = /* build a mainContext for the studio owner — reuse the suite's helper */ await mainCtxFor(studio, owner);
  process.env.MAIN_ROLLUP_READ = ""; const onread = await readAggregate(ctx, today);
  process.env.MAIN_ROLLUP_READ = "true"; const rolled = await readAggregate(ctx, today);
  process.env.MAIN_ROLLUP_READ = "";
  ok("rollup activity equals on-read activity", JSON.stringify(rolled.activity) === JSON.stringify(onread.activity), "activity mismatch");
  ok("rollup trends equal on-read trends", JSON.stringify(rolled.trends) === JSON.stringify(onread.trends), "trends mismatch");
  ok("rollup ribbon equals on-read ribbon", JSON.stringify(rolled.ribbon) === JSON.stringify(onread.ribbon), "ribbon mismatch");
}
```
Note: `mainCtxFor` stands for however the suite builds a `MainContext` (via `mainContext(user, slug)` from `@/modules/main/main`). Use the real call; the owner sees all sections so on-read and rollup cover the same set.

- [ ] **Step 2: Run to verify it fails.** `npm run test:integration` — Expected: FAIL (helpers/branch missing).

- [ ] **Step 3: Implement** in `executive.ts`. Add the pure helpers:
```ts
/** A 30-day (or `days`) series from a day→count map, UTC, zero-filled. */
export function activitySeriesFromCounts(
  counts: Record<string, number>, days: number, asOf: string,
): { label: string; value: number }[] {
  const end = new Date(`${asOf}T00:00:00Z`);
  const out: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ label: key, value: counts[key] || 0 });
  }
  return out;
}

/** This-window vs prior-window sums of a day→count map; deltaPct null on a zero base. */
export function trendFromCounts(
  counts: Record<string, number>, period: { start: string; mid: string; end: string },
): { current: number; previous: number; deltaPct: number | null } {
  let current = 0, previous = 0;
  for (const [day, n] of Object.entries(counts)) {
    if (day >= period.mid && day < period.end) current += n;
    else if (day >= period.start && day < period.mid) previous += n;
  }
  const deltaPct = previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
  return { current, previous, deltaPct };
}
```
At the top of `readAggregate(ctx, asOf = …)`, before the existing on-read body, add the flag branch (reusing the file's `trailingTwoMonths`):
```ts
  const useRollup = String(process.env.MAIN_ROLLUP_READ || "").trim().toLowerCase() === "true";
  if (useRollup) {
    const hash = await hGetAll(S.mainAgg(ctx.studio.id));
    const bySection: Record<string, Record<string, number>> = {};
    for (const [field, val] of Object.entries(hash)) {
      const m = field.match(/^(.+):day:(\d{4}-\d{2}-\d{2})$/);
      if (!m) continue;
      (bySection[m[1]] ||= {})[m[2]] = Number(val) || 0;
    }
    const activity: ExecutiveAggregate["activity"] = [];
    const trends: ExecutiveAggregate["trends"] = [];
    const combined: Record<string, number> = {};
    const period = trailingTwoMonths(asOf);
    for (const src of MAIN_AGG_SOURCES) {
      const sec = ctx.seen(src.section, src.fallback); // visibility gate (invariant 2)
      if (!sec) continue;
      const counts = bySection[sec.id] || {};
      activity.push({ section: src.section, series: activitySeriesFromCounts(counts, 30, asOf) });
      trends.push({ key: src.section, ...trendFromCounts(counts, period) });
      for (const [d, n] of Object.entries(counts)) combined[d] = (combined[d] || 0) + n;
    }
    return { activity, ribbon: activitySeriesFromCounts(combined, 30, asOf), trends };
  }
  // ... existing on-read body unchanged ...
```
Add `import { hGetAll } from "@/platform/db/store";` and `import { S } from "@/platform/db/keys";` (and `MAIN_AGG_SOURCES` is already imported from Task 1). `ctx.seen` returns the `Section` (with `.id`) or null — confirm against `MainContext` in `main.ts`.

- [ ] **Step 4: Run to verify it passes.** `npm run test:integration`; confirm the oracle block passes (rollup == on-read). Then `npm run test:gate-a` (flag is off in CI, so goldens unchanged), `npx tsc --noEmit`, and the strict config.

- [ ] **Step 5: Commit.**
```bash
git add src/modules/main/executive.ts tests/suite.mjs
git commit -m "readAggregate reads the Main rollup behind a flag, proven equal to on-read"
```

---

### Task 5: qa — the rollup keeps tenant lines

**Files:**
- Modify: `tests/suite.mjs`

**Interfaces:**
- Consumes: the seeded studios, `readAggregate`, `mainContext`.

- [ ] **Step 1: Write the assertion** — flag ON, a member who cannot see a section receives no rollup figure for it:
```js
console.log("\n== Main rollup: visibility survives aggregation");
{
  // Seed a create in a section, populate the rollup via reconcile, then read as a
  // collaborator who lacks that section. Reuse the suite's no-role/limited member.
  process.env.CRON_SECRET = "test-secret";
  const sec = await getSectionByKey(studio.id, "sales-tickets");
  await addRow(studio.id, sec.id, "salesTickets", { title: "secret", createdAt: `${utcDay()}T05:00:00Z` });
  await (await import("@/app/api/cron/main-rollup/route.ts")).GET(new Request("http://x", { headers: { authorization: "Bearer test-secret" } }));
  const noRoleCtx = await mainCtxFor(studio, memberUser); // a member with no section grants
  process.env.MAIN_ROLLUP_READ = "true";
  const agg = await readAggregate(noRoleCtx, utcDay());
  process.env.MAIN_ROLLUP_READ = "";
  ok("a member without the section gets no activity series for it from the rollup",
    !agg.activity.some((a) => a.section === "sales-tickets"), JSON.stringify(agg.activity));
}
```

- [ ] **Step 2: Run.** `npm run test:integration` — Expected: PASS. Then `npm test` once (full suite) to confirm the whole branch is green with the flag off.

- [ ] **Step 3: Commit.**
```bash
git add tests/suite.mjs
git commit -m "The Main rollup gives a member nothing for a section they cannot see"
```

---

## Ops handoff — spec slice 4 (the production cutover)

This is NOT a code task; it is a deploy/ops sequence for the user, after Tasks 1–5 ship with the flag off:

1. Deploy (Tasks 1–3 live): the updater fills the rollup on writes; the nightly cron makes it authoritative. Every read is still on-read — no user-visible change.
2. Run the read-only parity check: for a sample of studios, compute each figure from the rollup and from on-read and confirm equality. (A short read-only script; do not write.)
3. Set `MAIN_ROLLUP_READ=true` in the production environment. Monitor.
4. Rollback if needed: unset `MAIN_ROLLUP_READ` — the on-read body is untouched, so it is instant.

## Self-review

- **Spec coverage:** §2 key/fields → Task 1 (id-keyed, `S.mainAgg`, `aggField`); §3 updater → Task 2 (best-effort `bumpMainAgg` in `addRow`); §4 reconcile → Task 3 (fail-closed cron, `hSet`+`hDel` prune, `vercel.json`); §5 flag-gated read → Task 4 (`MAIN_ROLLUP_READ`, visibility-filtered); §6 oracle → Task 4 (rollup==on-read); §7 invariants → Global Constraints + each task; §8 slices 1-3,5 → Tasks 1-5, slice 4 → ops handoff. Covered.
- **Placeholder scan:** the two `mainCtxFor(...)` references are explicitly flagged as "use the suite's real `mainContext(user, slug)` call" — a named real function, not a stub. No TBD/TODO; every code step carries real code.
- **Type consistency:** `S.mainAgg`, `MAIN_AGG_SOURCES`, `utcDay`, `aggField`, `bumpMainAgg`, `hSet`, `activitySeriesFromCounts`, `trendFromCounts` are named identically across producing and consuming tasks; the read branch returns the same `ExecutiveAggregate` shape (`activity`/`ribbon`/`trends`) the on-read body and every Phase-1 consumer already use.
