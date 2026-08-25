# Main executive dashboard + the shared dashboard shell — design

**Date:** 25/08/2026
**Status:** design, approved to plan. Nothing built yet.
**Relationship to the wave plan:** this is the concrete design for the Main slice
of `docs/w4-dashboards-and-motion.md` §3 ("Main — add activity sparkline per
department, an 'awaiting you' queue, a 30-day event ribbon"), plus the shared
filter/drill/export shell that §3's remaining department dashboards will inherit.
It supersedes nothing in w4; it fills in the part w4 left as one bullet.

---

## 0. Why this document exists, and what it is not

A set of generic ERP-analytics files (`dashboard-analytics-guide.md`,
`agent-guidance-snippets.md`, `master-prompt.md`) proposed building a dashboard
layer from scratch on a SQL warehouse. nompany already has that layer, on Redis,
and further along than the files assume: a 0-KB server-rendered chart kit, a
40-widget entitlement registry with server-side tier gating, seven live
department dashboards, and a real Main "front door." So this design **mines the
generic files for the five things they genuinely add** and folds them into the
existing machinery rather than adopting them wholesale.

The five additive ideas, and where each lands here:

| Additive idea (from the generic guide) | Where it lands |
|---|---|
| Global filter bar (date-range presets) | §3.1 `FilterBar` |
| Drill-down as a hard rule | §3.2 drill helper (deep-link, not a new table) |
| Export (CSV / PNG / XLSX), filter-aware | §3.3 export |
| "Data as of …" freshness | §3.4, meaningful once §4 rollups exist |
| A written dashboard acceptance checklist | §8 |

What this is **not**: a rewrite of the Main module's backend contract, a new
permission model, or a second charting approach. The bespoke SVG kit stays (a
config-driven renderer would reintroduce the `nextId()` hydration mismatch the
kit's own comments warn against), and gauges/donuts stay in use (the generic
guide bans them; nompany uses `Donut`/`Radial` deliberately).

---

## 1. Decisions locked before design (25/08/2026)

| # | Question | Answer |
|---|---|---|
| 1 | What does this effort lead with? | **The Main executive dashboard**, with the shared shell built alongside it |
| 2 | Is the executive Main free or tiered? | **Free floor + gated widgets.** Today's headline tiles and feed stay free; the richer executive widgets gate behind the analytics rungs |
| 3 | Drill-down target from a Main KPI/segment | **Deep-link into the owning department screen, pre-filtered.** No new in-dashboard transaction table |
| 4 | Pre-aggregation | **Ship Main on-read first, then cut over to a Redis rollup as a fast-follow.** Both sides sit behind one aggregate seam (§4.0), so the cutover changes no widget. Main is the heaviest read, so it stays the right place to introduce the rollup — just not before something is on screen |
| 5 | Export formats (v1) | **CSV + chart PNG now; XLSX as a fast-follow** behind the `researcher` dependency gate |

---

## 2. The shape, top to bottom

```
StudioMain.js (client)
  ├─ free floor  ──────────────  headline StatTiles + recent feed   (unchanged, always shown)
  └─ Dashboard  ───────────────  gated executive widgets
        reads  /api/studios/[slug]/main
                    │
              main.ts headlines()/recent()  +  NEW deriveExecutive()
                    │
              THE AGGREGATE SEAM  readAggregate(ctx) → per-section activity + kpi
                    │
        ┌───────────┴────────────────────────┐
   v1: ON-READ                        fast-follow: ROLLUP (agg:main)
   derive from raw collections        one HGETALL, backed by:
   (what main.ts does today)            on-write updater (best-effort, backend-db)
        │                                reconcile cron (authoritative, devops)
        │                                     │
   ships first, on screen             cut over behind the oracle (§4.4):
                                       rollup must equal the on-read it replaces
```

Two independent axes gate every executive widget, and they are **not** the same
check:

- **Visibility** (invariant 2): a section the viewer cannot see is never read,
  never summarised, never sent — the rule `main.ts` already enforces through
  `seen()` / `readIfVisible()`. The rollup is stored **per section** precisely so
  this filter still applies after aggregation.
- **Entitlement** (analytics-is-paid): after visibility, the viewer's tier
  decides which executive widgets render versus show a locked teaser, through the
  existing `enabledWidgets(tier)` in `src/lib/dashboardWidgets.ts`.

A viewer who can see Finance but whose tier excludes the Finance executive widget
gets the locked teaser. A viewer who cannot see Finance at all gets **no tile and
no teaser** — the teaser would itself be a claim that Finance data exists.

---

## 3. The shared shell (built here, inherited by every future dashboard)

Lives in `src/components/dashboard/` beside the existing primitives
(`StatRow`, `Widget`, `DashGrid`, `LockedBody`). All server-first; client islands
only where interaction demands (filter state, sort, export click).

### 3.1 `FilterBar`

- **Main v1 offers date-range presets only:** This month / This quarter / This
  year / This fiscal year, resolved through `companySettings` (fiscal calendar +
  locale) so "this month" means the tenant's fiscal month, and dates render
  through `fmtDate` (en-GB default → dd/mm/yyyy). A custom range is a stretch, not
  v1.
- **Deliberately excluded from v1**, with reasons recorded so they are not
  re-litigated:
  - *Branch / entity* — studios have no branch concept; departments derive from
    sections (`src/lib/departments.ts`), not sites.
  - *Currency view* — per-studio main currency is the next FX phase; a
    currency-view control before that exists would be a dead control (invariant 16).
- The component takes its dimension set as config, so adding branch/currency later
  is a prop, not a rewrite.
- Filter state lives in the URL query so a filtered view is shareable and a reload
  is stable, and so a drill-down (§3.2) can carry the same range into the
  department screen.

### 3.2 Drill-down helper

- Every KPI card and every chart segment is clickable and resolves to a
  **deep-link into the owning department screen**, pre-filtered via a query param
  the screen reads (some screens already have `useFocusedRecord`; the rest gain a
  small query-param read). Example: Main's "Open tickets: 14" → the Sales screen
  with `?status=open`.
- **No in-dashboard transaction table.** The department screens already list,
  sort, filter and paginate their records; re-implementing that inside Main would
  duplicate exactly what "never duplicate" forbids.
- The helper is a pure function `drillHref(section, filter) → studio-relative
  path`, unit-tested, so a widget declares its drill target as data.

### 3.3 Export

- **`exportTable(rows, columns, format)`** — CSV now (native, zero dependency),
  respecting the active filter (it exports what the widget currently shows, not
  the unfiltered set).
- **Chart PNG** — serialise the existing SVG kit to a canvas and download. No new
  library; the kit is already SVG.
- **XLSX** — a fast-follow. It needs a library, which per house rules goes through
  `researcher` first (candidates: a zero-dependency SpreadsheetML writer vs a
  small lib; judged on bundle cost against the 250 KB chunk / 1500 KB total
  ceilings) before anything is added. CSV+PNG ship without waiting on it.
- Export honours the same visibility rule: it can only export data the viewer was
  already shown.

### 3.4 Freshness

- A **"Data as of …"** stamp per dashboard, fed by the rollup's `refreshedAt`
  (§4). Until the rollup lands it would read "just now" (on-read); with the rollup
  it reports the true aggregate age, which is the honest signal the generic guide
  asks for.

---

## 4. The aggregate seam and the rollup (fast-follow — backend-db + devops)

### 4.0 The seam — why the ordering is cheap to change

`deriveExecutive()` never reads collections or the rollup directly. It reads
through one function — `readAggregate(ctx)` — that returns per-section activity
series and KPI snapshots for the sections the viewer may see. Two implementations
sit behind it:

- **v1 (ships first): on-read.** `readAggregate` derives from the raw collections,
  exactly as `main.ts` does today. No new key, no updater, no cron — nothing on a
  write path. This is what puts Main on screen.
- **Fast-follow: the rollup.** `readAggregate` reads one `HGETALL` of `agg:main`.
  The widgets, the derivation, the API shape and the visibility/entitlement gates
  are **byte-identical** across the swap — only the seam's body changes.

The cutover is guarded by the §4.4 oracle: the rollup implementation must return
the same numbers as the on-read one it replaces, to the cent, before it goes live.
So the reordering the user asked for costs nothing structural — the seam is written
once, on-read first, rollup second.

The rest of §4 describes the fast-follow (rollup) implementation.

### 4.1 The key

- **Built only in `src/platform/db/keys.ts`** (invariant 1). One builder, e.g.
  `S.mainAgg(studioId)`, returning a single namespaced key per studio. Never a
  literal, never a template at a call site.
- **Shape: one Redis hash per studio.** Fields are per **section** so visibility
  can still filter after aggregation:
  - `${section}:activity` → last ~90 daily buckets `{ day, created, updated }`,
    feeding the 30-day per-department sparklines and the event ribbon.
  - `${section}:kpi:${period}` → the section's headline snapshot for a period
    (this month, last month, quarter, year), feeding period-delta widgets.
  - `meta:refreshedAt` → ISO timestamp for §3.4.
- One `HGETALL` is one hop — the whole point of the rollup, against the ~10-read
  fan-out Main does today.

### 4.2 The on-write updater (best-effort)

- Hooks the events `src/platform/db/sections.ts` already emits (`row.created` /
  `row.updated`) for the collections Main tracks, and increments the relevant day
  bucket for that section.
- **Best-effort, exactly like the notification producers**: the write already
  happened, so a failed aggregate update must never fail or slow the write. It is
  fire-and-forget with its own error boundary.
- Minted and owned by **`backend-db`**; analytics code (data-scientist) never
  writes a key (that would be a "billing/key leak" per the data-scientist agent).

### 4.3 The reconcile cron (authoritative)

- A nightly job, shaped like `src/app/api/cron/year-rollover/route.ts`, that
  **recomputes the rollup from source** and overwrites the incremental — so any
  drift between the best-effort updater and reality self-heals every night.
- **Fails closed** (invariant 15): a missing `CRON_SECRET` refuses; it never opens
  the door.
- **Prunes old buckets by explicit `HDEL` of named fields**, never a broad scan or
  prefix delete (invariant 17, and the "never delete against live Redis" memory).
  The reconcile is a rebuild-and-replace of known fields, not a flush.

### 4.4 The oracle

- Reconciliation is provable the way the trial balance is: a test computes each
  Main KPI **both** from the rollup and from the raw records, and asserts they
  agree **to the cent / to the count**. A rollup that disagrees with the source is
  a release blocker, not a rounding note.

---

## 5. Main's content

### 5.1 The free floor — unchanged

The eight headline `StatTile`s ("Needs you", "Open tickets", "Open RFQs", "Live
quotations", "Projects running", "Outstanding", "Tracked items", "People") and the
recent-activity feed already computed in `src/modules/main/main.ts`
(`headlines()`, `recent()`) stay exactly as they are: real, permission-scoped, and
**out of the widget registry** (the registry governs paid widgets; the free floor
is always shown). A section the viewer cannot see remains an **absent tile, never a
zero** — a zero is a claim.

### 5.2 The gated executive widgets (new)

Added as a new `main` section in the registry (§6). Each reads the rollup, is
double-gated (§2), and drills per §3.2:

| Widget | Reads | Proposed rung |
|---|---|---|
| **Per-department activity** — small-multiple sparklines, 30-day create/update volume per visible section | `${section}:activity` | simple |
| **Awaiting you** — a real deep-linked queue: tasks needing you + approvals pending + your RFQs/quotations awaiting decision (today this is a single `awaitingMe` count) | tasks routing + approvals + technical | simple |
| **30-day event ribbon** — a timeline of notable events across visible sections | `${section}:activity` + recent | moderate |
| **Headline trend** — period delta (▲/▼ %) + sparkline on each free-floor tile | `${section}:kpi:${period}` | simple |

The "Reads" column names the seam's outputs (§4.0). In v1 those are derived
on-read from the raw collections; after the cutover they are fields of `agg:main`.
The widget code does not know which. Rungs are a first proposal; final tagging is
mechanical once agreed, exactly as w4 §3 notes for the other departments.

### 5.3 The "awaiting you" queue (business-logic)

This is the one widget that is genuinely new logic, not just visualisation: it
spans Tasks (routing/authorities), approvals (the reviewer≠approver transitions),
and Technical (quotations/RFQs awaiting the viewer). It is assembled by
`business-logic`, reusing `enrichTask`/`readTaskAssignees` (as `main.ts` already
does for the count) and the signable state, so the queue can never disagree with
the boards it summarises. Each entry carries a `drillHref`.

---

## 6. Registry wiring

- Add `{ key: "main", label: "Overview" }` to `WIDGET_SECTIONS` in
  `src/lib/dashboardWidgets.ts`, and the §5.2 widgets to `DASHBOARD_WIDGETS` with
  frozen `key`s (`main.activity`, `main.awaiting-you`, `main.event-ribbon`,
  `main.headline-trend`).
- The `/super` tier editor renders the new group automatically (it maps
  `widgetsBySection()`), and the studio's locked-teaser card (`LockedBody`) names
  each un-bought widget — **no console change, no new gating code.** The existing
  `enabledWidgets(tier)` already resolves master-switch → explicit selection →
  rung fallback.

---

## 7. i18n hedge

The studio shell already sets `lang`/`dir` (w4 step-0 half), but there is no
translation dictionary and the seven existing dashboards are English literals.
This design **matches that convention** rather than gating Main on the multi-
thousand-string studio-i18n wave — but keeps every new user-facing label in the
registry's `label` field plus one small strings map, so the future extraction is
one or two files, not a component-wide hunt. Dates already route through `fmtDate`
(Gate A block 6 enforces no raw `toLocale*` in `studio2`).

---

## 8. Acceptance checklist (adapted from the generic guide §6, for qa-security)

A Main-dashboard slice is done only when:

- [ ] Only the existing chart primitives are used (no new banned/bespoke charts).
- [ ] Every KPI and chart segment drills to its department screen, pre-filtered.
- [ ] Main reads through the aggregate seam (§4.0). **v1:** the on-read seam is
      correct and reconciles with each department dashboard. **Cutover:** the
      rollup seam equals the on-read seam it replaces, **to the cent/count** (§4.4),
      before it goes live.
- [ ] The aggregate key is built only in `keys.ts` and is tenant-scoped; a
      cross-tenant read test passes; a viewer without a section receives **no**
      field for it from the rollup (visibility survives aggregation).
- [ ] Entitlement is enforced server-side; a below-rung widget renders a teaser,
      never a number.
- [ ] Empty / loading (skeleton) / error states exist for every widget.
- [ ] Export respects the active filter and the viewer's visibility.
- [ ] The reconcile cron fails closed and prunes by explicit key list only.
- [ ] Bundle budget still green (largest chunk ≤ 250 KB gz, total ≤ 1500 KB gz);
      goldens and hop counts unchanged except where deliberately re-recorded.

---

## 9. Sequence (slices, each shippable and green)

**Phase 1 — ship Main on-read:**

| Slice | Owner(s) | What | Gate before next |
|---|---|---|---|
| 1 | frontend-ui | The shared shell: `FilterBar`, drill helper, `exportTable`+PNG, "Data as of" | Reused by an existing dashboard without regression |
| 2 | data-scientist, business-logic | The aggregate seam (§4.0) with its **on-read** implementation; `deriveExecutive()`; the "awaiting you" queue; rung tagging | derive unit tests with worked examples; reconciles with the department dashboards |
| 3 | frontend-ui | The Main screen: free floor unchanged + gated executive widgets over the shell + seam | Renders, gated correctly (visibility × entitlement), drills correctly |
| 4 | qa-security | §8 checklist on the on-read Main: visibility survives the seam, entitlement, drill, export | All green — **Main ships here** |

**Phase 2 — cut over to the rollup (fast-follow):**

| Slice | Owner(s) | What | Gate before next |
|---|---|---|---|
| 5 | backend-db, devops | The rollup behind the seam: `agg:main` key + on-write updater + reconcile cron; swap the seam's body | The §4.4 oracle passes: rollup == the on-read it replaces, to the cent |
| 6 | qa-security | Post-cutover: tenant-bleed proof on the rollup, oracle green, hop count drops as expected | All green |
| 7 | researcher → frontend-ui | XLSX export | Dependency cleared + bundle green |

This is orchestrator-led: slices are sequenced, not concurrent on shared files.
Phase 1 stands entirely on its own — if Phase 2 never happens, Main still works,
just on-read. The generic files' agent snippets are **not** pasted verbatim (their
SQL / `EXPLAIN` / `agg_*`-table assumptions contradict the Redis reality and the
no-broad-scan invariants); the relevant guidance is captured in this spec instead,
which is the one source of truth for the slice.

---

## 10. What this does NOT change

- No change to the Main API response body's existing fields — `deriveExecutive()`
  adds fields; the goldens for existing fields stand (a golden change is wrong
  until deliberately re-recorded in its own commit).
- No new permission model. Visibility is still `sectionViewable` /
  `effectivePermissions`, resolved once (invariant 3). Entitlement is still
  `enabledWidgets`.
- No relaxation of an invariant. Keys in `keys.ts` only (1); a section a viewer
  can't see is never read, even from the rollup (2); CollaboratorID is the
  identity for "awaiting you" (6); a below-rung widget is a teaser, not a hidden
  number; the cron fails closed (15); no destructive Redis op without the two-
  confirmation rule (17).

---

## 11. Follow-ons (out of scope here, enabled by this)

Once the Main slice proves the shell + rollup pattern, the back half of w4 §3
becomes repetition of a settled pattern:

- The **missing department dashboards** — Quality (module is rich, dashboard is
  unmounted fragments, 0 widgets), Tasks (0 widgets), People/Access (0 widgets,
  paired into one dashboard).
- **Deepening the seven built dashboards** — drawing the metrics already computed
  but unrendered (e.g. Technical's completion scatter/timeline), plus applying the
  new shell (filter/drill/export) to each.
- Extending the rollup pattern to the other heavy-read departments as their tenant
  data grows.
- The **time-driven notification crons** (overdue invoices, expiring
  permits/documents) — the last gap in the notification producers (w4 §8B).
