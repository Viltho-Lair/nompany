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
| **2** | `src/ui` primitives + **form controls** + overlays | 🟡 **in progress** | ✅ 13 shadcn primitives in `components/ui` · ❌ **Field wrapper** · ❌ StatusPill · ❌ MUI date picker · ❌ MUI Autocomplete (still `Combo.js`) · **← the fields work is here** |
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
