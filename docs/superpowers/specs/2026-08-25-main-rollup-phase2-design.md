# Main executive dashboard — Phase 2: the Redis rollup — design

**Date:** 25/08/2026
**Status:** design, approved to plan. Nothing built yet.
**Depends on:** `docs/superpowers/specs/2026-08-25-main-executive-dashboard-design.md`
(Phase 1, shipped). Phase 1 built the executive widgets on-read behind a seam
(`readAggregate` in `src/modules/main/executive.ts`) precisely so Phase 2 could
swap the read path without touching a widget. This document is that swap.

---

## 0. What Phase 1 left ready, and what this adds

Phase 1 reads the four executive figures on every Main load by fetching up to six
collections (`salesTickets`, `quotations`, `rfqs`, `projects`, `inventoryItems`,
`tasks`) through `readIfVisible`, deriving activity/trends/ribbon in memory. It is
correct and, thanks to the Phase-1 fix-wave short-circuit, only runs for a tier
that entitles at least one Main widget. But it is the heaviest read in the app, and
it recomputes from full record lists every time.

Phase 2 introduces a **per-studio rollup** — a small Redis hash of daily
create-counts per section — kept fresh by a best-effort updater on the write path
and corrected nightly by a reconcile cron. `readAggregate`, behind an environment
flag, reads the rollup in **one `HGETALL`** instead of six list reads. The seam's
signature and every consumer are unchanged; only its body changes.

**The rollup accelerates the executive widgets only.** Three things deliberately
stay on-read, because the rollup is the wrong shape for them:

- **The free-floor headlines** (open tickets, outstanding, …) are *current-state*
  counts, not *daily-flow* counts — different data. They remain `headlines()`'s
  own reads.
- **The "awaiting you" queue** is *per-viewer* — it depends on the viewer's
  CollaboratorID through `enrichTask` — so it cannot be pre-aggregated per studio.
  It stays `awaitingQueue(ctx)` on-read.
- **The seven department dashboards** derive from lists their own screen already
  holds; they need no rollup.

So Phase 2 is Main-only, and within Main it serves activity, trends and the ribbon.

---

## 1. Decisions locked before design (25/08/2026)

| # | Question | Answer |
|---|---|---|
| 1 | How the rollup stays fresh on writes | **Inline best-effort in the write path.** `addRow` fires a fire-and-forget updater after the write, like the notification producers — never blocks or fails the write; the cron corrects any miss |
| 2 | Cutover from on-read to rollup | **Flag-gated rollout.** An env flag makes `readAggregate` read the rollup; default OFF until populated and the oracle passes, then ON, with instant rollback to on-read |
| 3 | Scope | **Main only**, and within Main only the studio-level widgets (activity, trends, ribbon). Awaiting-you and the free floor stay on-read (technical necessity, §0) |
| 4 | Ownership | The key and both writers are **`backend-db`**'s; the cron wiring and the flag are **`devops`**'s; the read reconstruction and the oracle are shared with **`data-scientist`**. Analytics code never mints the key (invariant 1) |

---

## 2. The rollup key

- **Built only in `src/platform/db/keys.ts`** (invariant 1), one builder:
  `S.mainAgg(studioId) → \`${P}s:${studioId}:mainagg\``. A single Redis **hash** per
  studio.
- **Fields are per section, per day** so counting is atomic and visibility survives
  aggregation:
  - `\`${sectionKey}:day:${YYYYMMDD}\`` → an integer **create-count** for that
    section on that day. One field per (section, day).
  - `meta:refreshedAt` → ISO timestamp of the last reconcile, for Phase 1's §3.4
    "Data as of …" stamp.
- The tracked sections are exactly Phase 1's `ACTIVITY_SOURCES` keys
  (`sales-tickets`, `technical-quotations`, `technical-rfq`, `projects-list`,
  `inventory-items`, `tasks`). Retention is **90 days** of daily fields per section
  — enough for the 30-day activity window and the month-over-month trend with
  margin.
- **Why per-day integer fields, not a JSON array:** an integer field is incremented
  with an atomic `HINCRBY`, so the updater needs no read-modify-write and no
  compare-and-set (invariant 8 is about blind whole-collection writes; this is a
  counter, not a collection). `HGETALL` returns the whole hash in one hop; the read
  reconstructs the per-section daily series from the `:day:` fields. Pruning is an
  explicit `HDEL` of named stale fields (invariant 17), never a scan.

Everything the rollup stores is a **count** — never a row, a name, or a body. A
count for a section is still information about that section, which is why the
**read** (§5), not the store, is where visibility is enforced.

---

## 3. The inline best-effort updater (backend-db)

- Hooks `addRow` in `src/platform/db/sections.ts` — the one place a row is created,
  which already emits `row.created`. After the row is written, if its
  (section, collection) is one of the six tracked pairs, fire:
  `HINCRBY S.mainAgg(studioId) \`${sectionKey}:day:${todayUTC}\` 1`.
- **Best-effort, exactly like the notification producers:** its own try/catch, no
  await that could fail the write, no ordering dependency. The row is already
  committed; a lost increment is not a data loss, only a temporary drift the nightly
  reconcile erases. This is why "best-effort" is safe here and would not be for the
  row write itself.
- **Day boundary is UTC** (`todayUTC = new Date().toISOString().slice(0,10)`), matching
  Phase 1's UTC bucketing so the updater and the derivations agree on which day a row
  falls in regardless of host timezone.
- Only `row.created` matters — the widgets count creations, not edits — so
  `updateRow`/`deleteRow` do not touch the rollup. (A deleted row leaves its create
  count; the reconcile recomputes from live rows nightly, so a deletion is corrected
  within a day. If same-day accuracy on deletes ever matters, the reconcile cadence
  drops, not the updater's shape.)

---

## 4. The reconcile cron (devops)

- A daily job shaped like `src/app/api/cron/year-rollover/route.ts`:
  `cronDenied(request)` first — **fails closed** when `CRON_SECRET` is unset
  (invariant 15) — then, per studio, recompute the true per-section daily
  create-counts from the live rows (bucket each tracked collection's `createdAt` by
  UTC day, last 90 days) and **`HSET`** the fields to those values, correcting any
  drift the best-effort updater accumulated. Set `meta:refreshedAt`.
- **Prune by explicit `HDEL` of named fields** only — the `:day:` fields older than
  90 days, computed by date, deleted by name. Never a scan, never a prefix delete,
  never `FLUSHDB` (invariant 17, and the "never delete against live Redis" rule).
  The reconcile is rebuild-and-replace of known fields, so it is idempotent and safe
  to re-run.
- Registered in `vercel.json` crons with its own schedule and `CRON_SECRET`.
- The reconcile is authoritative: after it runs, the rollup equals the source by
  construction. The updater's only job is to keep the current day fresh between
  reconciles.

---

## 5. The flag-gated read (backend-db + devops)

- An env flag — `MAIN_ROLLUP_READ` (`"on"` / unset) — owned by `devops`, default
  **off**. `readAggregate(ctx)` branches on it:
  - **off (default):** the current Phase-1 on-read body, unchanged.
  - **on:** `HGETALL S.mainAgg(studio.id)`, reconstruct the per-section daily series
    from the `:day:` fields, then derive **only for the sections `ctx.seen(...)`
    allows** — activity (last 30 days per visible section), trends (this-UTC-month
    sum vs last-month sum per visible section), ribbon (sum across visible sections
    per day). Read `refreshedAt` from `meta:refreshedAt`.
- **Visibility is enforced at the read, exactly as on-read is.** The hash holds every
  section's counts, but `readAggregate` reconstructs a series only for a section the
  viewer may see, so a viewer without Finance never receives a Finance figure from
  the rollup (invariant 2). Entitlement gating in the route (Phase 1) is untouched —
  the flag changes *where the numbers come from*, never *who may see them*.
- The seam returns the same `ExecutiveAggregate` shape either way, so `MainDashboard`,
  the route's entitlement gate, and the goldens are all unchanged.

**Rollout, on the live shared Redis with no dev database:**

1. Ship §3 (updater) + §4 (cron) with the flag **off**. The rollup begins filling on
   writes and is made authoritative by the first nightly reconcile — while every read
   still comes from on-read, so users see no change and nothing can regress.
2. Verify in production with a **read-only** parity check (a script, not a write):
   for a sample of studios, compute each figure from the rollup and from on-read and
   confirm equality. (Read-only stays the default — the "never delete against live
   Redis" rule.)
3. Flip `MAIN_ROLLUP_READ=on`. Monitor. **Rollback is instant** — unset the flag —
   because the on-read body never left.

---

## 6. The oracle

Reconciliation is provable the way Phase 1's derivations were, and it is the gate on
the cutover: a test seeds a studio with known rows across the tracked sections, lets
the updater run (or invokes the reconcile), then computes each figure **from the
rollup** and **from the raw records** and asserts they are equal **to the unit**
(counts) and **to the cent** where money is involved. A rollup that disagrees with
the source fails the build. This runs under the prefixed test namespace, never
against production keys.

---

## 7. Invariant compliance

- **1 — keys in `keys.ts` only.** `S.mainAgg` is the one new builder; the updater,
  cron and read all call it, none templates a key.
- **2 — visibility survives aggregation.** The store is studio-wide; the read
  includes only `ctx.seen` sections. No count for an unseen section reaches the
  client. Existence is never widened to contents.
- **8 — no blind whole-collection write.** The updater is an atomic `HINCRBY`
  (a counter, not a collection); the reconcile `HSET`s computed cache values, not
  tenant records.
- **13 — one subscriber per process.** The updater is inline in the write path; it
  adds no Redis subscriber, so the connection ceiling is untouched.
- **15 — cron fails closed.** `cronDenied` refuses a missing `CRON_SECRET`.
- **17 — no broad-scan destruction.** Pruning is `HDEL` of named fields; the reconcile
  is rebuild-and-replace of known fields. A whole-studio rollup purge, if ever needed,
  is a single explicit `DEL S.mainAgg(studioId)` of regenerable cache — and still
  subject to the two-confirmation rule if ever asked for in bulk.

---

## 8. Sequence (slices, each shippable and green)

| Slice | Owner(s) | What | Gate before next |
|---|---|---|---|
| 1 | backend-db | `S.mainAgg` key builder + the inline best-effort `HINCRBY` updater on `addRow` for the six tracked sections | A create increments the right `:day:` field; a thrown updater never fails the write (both asserted) |
| 2 | devops, backend-db | The reconcile cron (recompute + `HSET` + `HDEL` prune, fail-closed) + `vercel.json` registration | Cron rebuilds the rollup to match source; prunes by named `HDEL`; refuses without `CRON_SECRET` |
| 3 | backend-db, data-scientist | The flag-gated rollup-read branch in `readAggregate` (visibility-filtered) + the §6 oracle test | Oracle passes: rollup == on-read, to the unit; goldens unchanged (flag off in CI) |
| 4 | devops | Populate + read-only parity check in production, then flip `MAIN_ROLLUP_READ=on`; monitor | Parity holds in production; rollback path (unset flag) verified |
| 5 | qa-security | Tenant-bleed proof on the rollup read (no-role member gets nothing from it); hop-count drop confirmed (executive read 6→1 for an entitled tier) | All green |

Orchestrator-led; slices sequenced, not concurrent on shared files. CI keeps the
flag **off**, so goldens and the on-read path stay the contract until slice 4
deliberately flips it in production.

---

## 9. Acceptance checklist

- [ ] `S.mainAgg` is the only new key, built solely in `keys.ts`, tenant-scoped.
- [ ] The updater is best-effort: a write succeeds even if the rollup op throws.
- [ ] Day bucketing is UTC on both the updater and the read.
- [ ] The reconcile is authoritative and idempotent; prunes only by named `HDEL`;
      fails closed without `CRON_SECRET`.
- [ ] With the flag on, `readAggregate` returns figures identical to on-read for the
      same data — the oracle passes to the unit/cent.
- [ ] Visibility survives: a no-role member's executive block is still empty; a
      partial-access member sees only their sections' counts.
- [ ] Entitlement gating (route) and the `executive:{widgets,locked}` shape are
      unchanged; owner/norole goldens unchanged with the flag off.
- [ ] Hop count for an entitled-tier Main load drops (executive read 6→1); the free
      floor's reads are unaffected and that is expected.
- [ ] Rollback is a single flag flip back to on-read, verified.

---

## 10. What this does NOT change

- No change to any API response body (`readAggregate` returns the same
  `ExecutiveAggregate`); the Phase-1 goldens stand with the flag off, and stand with
  the flag on because the oracle proves the numbers identical.
- No new permission, no change to entitlement resolution, no change to `MainDashboard`.
- The free floor, the awaiting-you queue, and the seven department dashboards are
  untouched.
- No relaxation of an invariant; every point in §7 holds.

---

## 11. Follow-ons this enables or defers

- **The functional FilterBar on Main** (deferred from Phase 1) belongs here: once the
  read path is the rollup, honoring a date-range preset is a matter of the read
  summing a different window of `:day:` fields — no new derivation path. Wiring the
  FilterBar's URL-range through the route to `readAggregate` is the natural next
  slice after the cutover.
- **Extending the rollup pattern** to other heavy reads as tenant data grows (the
  free-floor current-state counts are a different, state-shaped rollup and their own
  decision).
- **Sub-daily freshness** (dropping the reconcile cadence, or an updater on more event
  types) only if a studio's create volume ever makes the nightly reconcile too coarse
  — not needed at current scale.
