# UI/UX Overhaul — Progress

**What this is:** live state against [`ui-ux-overhaul.md`](ui-ux-overhaul.md). That
file is the plan (its §9 is the phase sequence, §10 the definition of done); this one
is where we actually are. Updated when a phase item closes, not on a schedule — the
sibling of [`progress.md`](progress.md), which tracks the wave plan.

**Last updated:** 23/08/2026.

> **Why this exists.** The login and studio field work was drifting into ad-hoc
> decisions instead of executing the documented plan. This sheet is the correction:
> every UI/UX change now maps to a phase and a definition-of-done line, and nothing
> is "done" until its line here says so.

---

## The short answer

| | |
|---|---|
| **Plan** | `ui-ux-overhaul.md` — 7 phases (§9), 15 definition-of-done lines (§10) |
| **Genuinely done** | None end-to-end. Pieces of phases 0, 3 and 4 landed with Wave 4 work |
| **In progress** | **Phase 2 — form controls** (the field system), starting now |
| **Not started** | Phases 1 (token layer), 6 (a11y), the motion techniques |

The honest headline: the visible frontend has **not** been overhauled yet. Wave 4
delivered some pieces the plan also needs (RTL, skeletons, the code-split, the shared
chart/number tokens), but the **token layer, the `src/ui` form controls, skeletons
everywhere, and the component split** — the substance — are still ahead.

---

## Phases (§9)

| Phase | Work | State | Evidence / what's left |
|---|---|---|---|
| **0** | Foundations + CI gates | 🟡 partial | ✅ `stylis-plugin-rtl` installed & asserted · ✅ bundle budget in CI · ❌ contrast test in CI · ❓ `components.json` / `jsconfig.json` unverified |
| **1** | Token layer (primitives + semantics + spacing/elevation/radius/type) | 🟢 mostly done | ✅ **the two-layer architecture exists** — a `primitives` block (raw palette atoms) and a `semantics` block (role tokens `--geex-surface`/`-inset`/`-border`/`-ink`/`-muted`/`-faint`) that reference them, documented in `globals.css`; dark mode is the semantics choosing different atoms · ✅ **surface hex literals tokenised** (53 across 22 screens, value-identical) · ✅ **applied to the shared primitives** (`ui.js`, `Field`, `Combo`, data grid) so every screen inherits ink/muted/faint from one place · ❌ still ahead: the spacing/elevation/radius/type scales as formal tokens, and the per-screen text-colour migration (incremental; slate-500/400 & slate-700 pairs have no role yet) |
| **2** | `src/ui` primitives + **form controls** + overlays | ✅ **done** | ✅ shared floating **`Field`** (`components/fields`) · ✅ **MUI date picker** (`StudioDate`, dd/MM/yyyy, dynamic-imported) · ✅ rolled across **all 12 studio departments** · ✅ **71 placeholders removed** · `Combo` is already MUI Autocomplete · ✅ **`StatusPill`** unifies every status badge (`components/studio2/StatusPill.jsx`) — one component behind 68 verified-identical (kind, status) pairs across 11 screens, tones as data |
| **3** | Skeletons everywhere + `loading.tsx` + Suspense | 🟡 partial | ✅ `ScreenSkeleton`, `ChartSkeleton`, shared `.skel` · ✅ studio departments code-split · only **3** `loading.*` files; not per-segment, not "everywhere" |
| **4** | Component split per module (Sales first) + toast | 🟡 partial | ✅ studio departments are `nextDynamic()` (chunk split) · ❌ the 1,000-line `Studio*.js` screens not decomposed into `src/ui` + module parts · ❌ toast layer |
| **5** | MUI Data Grid on the dense grids + pagination contract | ✅ **done** | `StudioDataGrid` (dynamic-imported, studio-tokened, RTL-safe, modelled on `SuperDataGrid`) now backs **Finance invoices, Inventory items, Sales tickets, Projects** — native sort, paginated footer, columns/formats/actions preserved, `StatusPill` reused. HR **People** deliberately left as its profile-card layout (avatars, cert pills, inline documents — not a dense table). Budget unmoved: largest chunk **197 KB** (Data Grid vendor code was already shared via `/super`). |
| **6** | Accessibility pass (keyboard, ARIA, RTL, 4.1–4.3) | 🟢 mostly done | ✅ RTL shell + MUI mirror + logical props · ✅ **focus management** — `useFocusTrap` behind the shared Dialog, Nova panel, Settings dialogs (trap + return-focus + Escape + `aria-modal`/labelled) · ✅ **skip-to-content** + landmark labels · ✅ icon-button label sweep (found all already labelled) · ✅ `:focus-visible` rings on custom controls · ✅ Nova announces the settled answer once (not the typewriter) · ❌ automated contrast test in CI still to add |
| **7** | Additions (§8) | 🟡 ongoing | Nova, notification producers etc. tracked in `w4-dashboards-and-motion.md` |

---

## Definition of done (§10) — live

- [ ] Every colour resolves through a semantic token; zero hex literals outside a primitives file — **no** (hex literals throughout the studio)
- [~] Type scale applied; refs/quantities/currency/IDs in `mono` `tabular-nums` — `.num` exists and is shared; scale not enforced
- [ ] 8px spacing scale enforced; both density modes working and persisted — density modes not built
- [ ] z-index map defined once, honoured by Tailwind and MUI — no
- [~] Radii sm/md/lg applied universally — `rounded-geex` used; not a formal scale
- [~] All five taxonomy groups in `src/ui/` — many primitives exist in `components/ui`; **`Field` wrapper and `StatusPill` now shipped**; the rest still to formalise
- [~] Every async surface has a shape-matched skeleton; no spinners; no layout shift — started (`ScreenSkeleton`, `ChartSkeleton`); not everywhere
- [ ] All action + validation states defined once per component — needs the Field wrapper (§3.2)
- [~] `transition duration-200 ease-in-out` standard; reduced-motion respected — reduced-motion respected; transitions not standardised
- [ ] 4.5:1 text / 3:1 UI contrast verified in CI — no contrast test
- [ ] Every workflow keyboard-completable, grids included — not audited
- [~] ARIA verified; RTL correct including MUI — RTL/MUI mirror done; ARIA not swept
- [~] Tokens in Tailwind; shadcn owns primitives; MUI limited to Grid/pickers/Autocomplete — partial; MUI pickers/Autocomplete not adopted yet
- [x] Studio route under 400 KB gzipped — **197 KB** (bundle budget enforces it)
- [ ] `explain()` surfaced on every permission-disabled control — no

Legend: `[x]` done · `[~]` partial · `[ ]` not started.

---

## Dashboards & motion (`w4-dashboards-and-motion.md`)

The dashboards are the other half of the redesign and live in their own plan, not
in `ui-ux-overhaul.md`'s phases — so they were missing here. Tracked now, against
that document's §2.4 (every Finance data-point), §9 (the build steps) and the
thirteen motion techniques.

| Piece | State | Evidence / what's left |
|---|---|---|
| **Chart kit** (`components/charts`) | ✅ done | Promoted to shared TS, `--chart-*` ramp on `:root`, direction-aware, server-rendered, no library |
| **Motion primitives** (`components/motion`) | ✅ done | `Reveal`, `CountUp`, house curves — library-free, fenced from `motion/react` |
| **`dashboard/` primitives** (Widget, StatRow, DashGrid, locked teaser) | ✅ done | `components/dashboard`, composing the existing StatTile/WidgetTitle + charts |
| **analytics gating** (per-component selection) | ✅ done | A tier sells dashboards by SELECTION: a master switch (`analyticsEnabled`) + a per-section list of components (`dashboardWidgets`), authored in `/super → Tiers`. One shared registry (`lib/dashboardWidgets`, `DASHBOARD_WIDGETS`) is the source both the editor and every dashboard read; the gate is set-membership via `useWidgetVisible()`. The four rungs (`lib/analytics`) survive only as the fallback a tier with no explicit selection derives from (`enabledWidgets`), incl. the tier-NAME bridge in `planOf`. Gate A block 9 ties the registry to the dashboards. |
| **Per-department dashboards** | 🟢 done for 7 | Finance, Sales, Technical, Projects, Inventory, HR, Operations — each a data-dense `<Dept>Dashboard` on real data with paid-rung locking. Tasks keeps its stats header; Main/custom sections still the placeholder |
| **Technical & Sales dashboards** | ✅ done | Built on the existing `salesAnalytics`/`technicalAnalytics`, unused no more |
| **Finance 1a dashboard** (AR aging, DSO, collection, income/expense, mix) | ✅ done | `FinanceDashboard`, wired into StudioFinance, on the Finance 1a analytics, with paid-rung locking via a shell context (no extra hops) |
| **Motion techniques 1–5, 7, 9** across the shells | ⬜ not started | Step 8 — after the dashboards settle |

So: the **drawing foundation is done** (charts + motion), and **not one department
dashboard exists yet** — every section is still the empty placeholder. This is the
single largest remaining piece of the visible redesign, and it needs the browser
pane for sign-off the same way the login does.

---

## Now — Phase 2, the field system

The slice in flight, and the decisions that set it (yours, 23/08/2026):

- **One shared floating-label `Field`** — text / number / email / textarea / select /
  date — label floats on focus or when filled, hint line, error line (§3.2 states),
  **no visible placeholder**. Library-free (focus state + CSS transition), so the
  studio can use it without breaching the `motion/react` fence.
- **Dates = MUI**, per §2.2. Install `@mui/x-date-pickers`; the picker renders
  **dd/mm/yyyy** and slots into the `Field`. The 29 native `<input type="date">` in
  the studio convert to it.
- **The custom `components/public/DatePicker.js` is deleted** — it was dead code (zero
  importers), and the rule is reuse what exists, don't recreate.
- **Placeholders removed** — 71 across the studio forms; the floating label and the
  hint line carry what they used to.
- **Proven on the "New ticket" form first**, screenshotted for sign-off, *then* rolled
  across all 12 departments and converged with the login field.

**Reuse, don't recreate:** shadcn primitives already in `components/ui` (input, label,
select, dialog, popover, …) are the building blocks; the `Field` composes them, it does
not reinvent them.

---

## Time-driven notifications (shipped, live)

A daily cron (`/api/cron/daily-notices`, 06:00 UTC) tells the people who can act
about **overdue invoices/bills** and **expiring ID/passport documents and permits**.
Fires once per record on fixed day-milestones (overdue 1/7/14/30/60/90; expiring
30/14/7/3/1/0), so no daily spam and no stored "already sent" state. Addressed by
permission (`finance.cash.view`, `finance.payables.view`, `hr.employees.view`,
`operations.tracking.view`; owner always). Pure producers in
`src/modules/main/timeNotices.ts`, recipient resolution `resolveHolders` in
`src/lib/studios.ts`, cron fails closed on missing `CRON_SECRET`.

**Check on live:**
- `CRON_SECRET` must be set in the Vercel env for the cron to run (it already is, if
  sweep-orphans/year-rollover run). To test now rather than wait for 06:00 UTC, hit
  the endpoint with the secret header, or create an invoice with a due date exactly
  1 day ago and run it.
- The bell links use studio-relative paths `finance/cash`, `finance/payables`,
  `hr/employees`, `operations/tracking` — confirm each opens the right screen.
- HR **certifications** expiry is not yet a notice (only ID/passport are) — a small
  follow-up if wanted.

## Check when you're signed in

Objective checks (build · both typecheck configs · full suite · Gate A · bundle) are
green throughout. These are the things that need a human eye, gathered as they came
up so nothing is lost. None blocks the build; each is a judgement call or a visual
confirmation.

**Visual passes (need the studio on screen):**
- The floating `Field` across every form — resting label centred, lifting on focus,
  the iris focus ring, in **both light and dark** and in **Arabic (RTL)**.
- The **MUI date picker** (`StudioDate`) — that dd/MM/yyyy reads right, the calendar
  opens cleanly inside a modal, and it sits at the correct height in the field box.
- The **Finance dashboard** (and the other department dashboards) — that the widgets
  read well and the **locked teasers** look right below a studio's tier.
- The **login** floating fields + entrance (the "elevate" pass).

**Deliberate small losses (confirm acceptable, else I restore):**
- Dropped **select empty-option wording** ("Unassigned", "— none —", "Me", "Anyone",
  "No role", …) — the floating label now carries the field name; the words are gone.
- A few **example placeholders** with nowhere to go were dropped rather than made hints
  (e.g. "e.g. Sara").
- Some **textareas** grew from 2–3 rows to the Field default of 4.
- A handful of **enum selects** gained a visible `*` (required) to suppress a blank option.
- **Search boxes** became floating Fields (label = former placeholder) rather than plain
  inputs.

**Left for a follow-up pass (not converted to Field, still functional):**
- `StudioProjects` **ProjectDetail edit grid** — uncontrolled `onBlur` fields (converting
  would change save-on-blur to save-on-keystroke); left intact.
- `StudioSheetViewer` **inline sheet-cell editors** — Field's box can't live in a table cell.
- `StudioSettings` **EditRow**-based settings rows (they already render their own label).
- Native controls Field doesn't model: identity-number lock inputs, file uploads,
  checkboxes/toggles, `type="time"` and `type="datetime-local"` inputs, one leftover
  `StudioSales` description textarea (line ~1095).
- **Tiers select dashboard components** — `/super` → Tiers has a master **"Dashboard
  analytics" switch** plus, when it's on, a **per-section checklist of components**
  (Sales, Technical, … Finance, Operations) with select-all/clear per section and a
  "tick up to a rung" preset. A studio sees a component iff the switch is on and the
  component is ticked; otherwise a locked teaser. Tiers saved before the checklist
  pre-fill from their rung (or tier name) so nothing regresses. **Check:** with a tier
  switched on and a few components ticked, confirm a studio on it shows exactly those
  widgets and locked teasers for the rest; toggle the switch off and confirm all paid
  widgets lock while the free KPI row stays.
- **Editor judgement calls (confirm acceptable):** a NEW tier defaults switch-**on**
  with an **empty** checklist (sells nothing until you tick — "basic" has no paid
  widgets anyway); toggling the switch off then on **remembers** the prior selection;
  section order is Sales→Operations (registry order), not the studio nav order; the
  rung-preset row is the only place the old rung vocabulary still shows.
- **Dead prop, follow-up chip open:** the 7 `Studio*` wrappers still pass a now-ignored
  `level={level}` into their dashboards (harmless; `useAnalyticsLevel` is the migration
  bridge). A spawned task removes it carefully (StudioSales also feeds SalesOverview).

**Local dev note:** `RESEND_API_KEY` isn't in `.env.local`, so `localhost:3000` can't
email OTPs/notifications — sign-in codes have to be read from Redis. Add the key to send
locally.
