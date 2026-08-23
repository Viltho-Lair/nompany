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
| **Not started** | Phases 1 (token layer), 5 (Data Grid), 6 (a11y), most of 2 and 3 |

The honest headline: the visible frontend has **not** been overhauled yet. Wave 4
delivered some pieces the plan also needs (RTL, skeletons, the code-split, the shared
chart/number tokens), but the **token layer, the `src/ui` form controls, skeletons
everywhere, and the component split** — the substance — are still ahead.

---

## Phases (§9)

| Phase | Work | State | Evidence / what's left |
|---|---|---|---|
| **0** | Foundations + CI gates | 🟡 partial | ✅ `stylis-plugin-rtl` installed & asserted · ✅ bundle budget in CI · ❌ contrast test in CI · ❓ `components.json` / `jsconfig.json` unverified |
| **1** | Token layer (primitives + semantics + spacing/elevation/radius/type) | ⬜ not started | Tokens still live in `globals.css :root` as `--doc-*` / `--geex-*` / `--chart-*`; no `primitives`/`semantics` layer, hex literals remain (`dark:bg-[#20202c]` etc. across the studio) |
| **2** | `src/ui` primitives + **form controls** + overlays | 🟢 **mostly done** | ✅ shared floating **`Field`** (`components/fields`) · ✅ **MUI date picker** (`StudioDate`, dd/MM/yyyy, dynamic-imported) · ✅ rolled across **all 12 studio departments** · ✅ **71 placeholders removed** · `Combo` is already MUI Autocomplete · ❌ StatusPill still to unify |
| **3** | Skeletons everywhere + `loading.tsx` + Suspense | 🟡 partial | ✅ `ScreenSkeleton`, `ChartSkeleton`, shared `.skel` · ✅ studio departments code-split · only **3** `loading.*` files; not per-segment, not "everywhere" |
| **4** | Component split per module (Sales first) + toast | 🟡 partial | ✅ studio departments are `nextDynamic()` (chunk split) · ❌ the 1,000-line `Studio*.js` screens not decomposed into `src/ui` + module parts · ❌ toast layer |
| **5** | MUI Data Grid on the 5 dense grids + pagination contract | ⬜ not started | `x-data-grid` installed; only `/super`'s `SuperDataGrid` uses it — the 5 studio grids do not |
| **6** | Accessibility pass (keyboard, ARIA, RTL, 4.1–4.3) | 🟡 partial | ✅ RTL shell + MUI mirror + logical props in auth · ❌ keyboard audit, ARIA sweep, contrast |
| **7** | Additions (§8) | 🟡 ongoing | Nova, notification producers etc. tracked in `w4-dashboards-and-motion.md` |

---

## Definition of done (§10) — live

- [ ] Every colour resolves through a semantic token; zero hex literals outside a primitives file — **no** (hex literals throughout the studio)
- [~] Type scale applied; refs/quantities/currency/IDs in `mono` `tabular-nums` — `.num` exists and is shared; scale not enforced
- [ ] 8px spacing scale enforced; both density modes working and persisted — density modes not built
- [ ] z-index map defined once, honoured by Tailwind and MUI — no
- [~] Radii sm/md/lg applied universally — `rounded-geex` used; not a formal scale
- [~] All five taxonomy groups in `src/ui/` — many primitives exist in `components/ui`; **no Field wrapper, no StatusPill**
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
| **analytics gating** (`analyticsLevelOf`, `analyticsAllows`) | ✅ done | `lib/analytics`, rungs basic/simple/moderate/advanced; tier carries `analyticsLevel` via planOf |
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
- **Tiers now carry an analytics rung** — `/super` → Tiers has a "Dashboard analytics"
  select (basic/simple/moderate/advanced), stored on the tier and read first by
  `planOf`. As a bridge for tiers saved before the editor existed, `planOf` also
  resolves the rung from the tier's NAME (a tier named "Advanced" grants the advanced
  rung), so paid-rung locking is live now, not inert. **Check:** set a tier's rung in
  the console and confirm a studio on it sees the matching widgets vs locked teasers.

**Local dev note:** `RESEND_API_KEY` isn't in `.env.local`, so `localhost:3000` can't
email OTPs/notifications — sign-in codes have to be read from Redis. Add the key to send
locally.
