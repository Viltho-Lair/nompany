# UI/UX Overhaul

**Brief:** redesign the frontend to align with the main website's styling, using **Tailwind CSS + shadcn/ui + MUI**, and execute the design tokens, component taxonomy and progressive loading exactly as specified in `UIDesignSystem_Checklist.pdf`.

This document is organised to mirror the checklist, section for section, so every item is traceable to a state and an action.

---

## 0. Where the frontend is today

| Measurement | Value | Checklist consequence |
|---|---|---|
| Client JS | 3.54 MB raw / **1.06 MB gz**, 51 chunks | Perceived latency §2 |
| `"use client"` files | **131 of 320** | Nothing streams; everything waits on hydration |
| `loading.js` files | **0** | No progressive loading anywhere |
| `<Suspense>` boundaries | **0** | Same |
| Skeletons in the 12 studio modules | **0** | The checklist's headline requirement is unmet |
| Largest module component | `StudioSales.js`, 69 KB, one file | Tables, dialogs, filters and fetching all in one client bundle |
| Colour token systems | **4, disjoint** | §1 |
| Spacing / elevation / radius / type scales as tokens | **none** | §1 |
| shadcn primitives present | 13 of ~40 needed | §2 |
| `components.json` | `"tsx": false`, `"cssVariables": false` | Emits the wrong file type and hardcoded colours |
| `tailwind.config` | `.js`, literal hexes | Checklist asks for `.ts` with tokens bound |
| MUI RTL | ~~not installed~~ **done 22/08/2026** | `MuiRtlProvider` — second cache, `stylisPlugins: [prefixer, rtlPlugin]`, layer preserved, split out of the shared chunk |

The four token systems:

1. `--color-ink / --color-iris / --color-mint …` — the landing page (already a port of the main website's palette).
2. `--geex-page / --geex-surface / --geex-border` — the studio.
3. `--doc-background / --doc-card / --doc-primary …` — the Quality editor, in shadcn's vocabulary.
4. Literal hexes in `tailwind.config.js` — `brand`, `steel`, `accent`, `success`/`warning`/`danger`/`info`.

A status pill in Sales and a status pill in Quality get their colour from two different systems today.

---

## 1. Design tokens & visual foundations

### 1.0 First: settle the alignment question honestly

"Align with the main website" needs a decision made explicitly, because the two surfaces currently disagree on every foundational choice:

| | Main website (`nompany-main-website`) | ERP studio (today) |
|---|---|---|
| Ground | **dark-first** — `--color-ink #05070f` | light-first — `--geex-page #f4f5fa` |
| Brand | indigo `#6366f1`, bright `#818cf8` | royal blue `#2563eb` |
| Accents | violet `#a855f7`, cyan `#22d3ee`, mint `#34d399`, amber `#fbbf24` | purple `#8b3dde`, semantic four |
| Display face | **Sora** | **Saira** |
| Body face | **Inter** | IBM Plex Sans |
| Tailwind | v4 (`@theme`) | v3 (`extend`) |

**Recommendation: align the *language*, not the *ground*.** Adopt the main website's brand hue, accent family, easing curves and display face; keep the ERP light-first with a full dark mode. A marketing page is looked at for ninety seconds; an ERP is stared at for eight hours, and dark-first for dense data tables is a decision that should be the user's, not the brand's. This is also what the checklist implies when it distinguishes *"dense operational dashboards versus more spacious client-facing views."*

The Tailwind major mismatch (v4 vs v3) is not a blocker for tokens — CSS custom properties are portable. It is a blocker for sharing component code, which is why the repos stay separate.

### 1.1 Colour palette — primitive and semantic

Two layers, and only the second is ever used in a component.

**Primitives** (raw scales, never referenced directly by a component):

```ts
// tokens/primitives.ts — the only place a hex literal is allowed
indigo: { 50…950 }   // from the main website: 500 #6366f1, 400 #818cf8
slate:  { 50…950 }   // neutrals, blue-biased — chosen, not defaulted
violet, cyan, mint, amber, rose   // the main website's accent family
```

**Semantics** (what components use), as `<r g b>` triples so Tailwind's `<alpha-value>` modifiers keep working:

```css
:root {
  /* surfaces */
  --bg-app: 248 250 252;  --bg-surface: 255 255 255;  --bg-sunken: 241 245 249;
  --bg-overlay: 15 23 42;
  /* text */
  --fg: 15 23 42;  --fg-muted: 71 85 105;  --fg-subtle: 148 163 184;  --fg-on-brand: 255 255 255;
  /* brand */
  --brand: 99 102 241;  --brand-hover: 79 70 229;  --brand-subtle: 238 242 255;
  /* borders */
  --border: 226 232 240;  --border-strong: 203 213 225;  --border-focus: 99 102 241;
  /* STATE — semantic, never reused as an accent */
  --success: 5 150 105;  --success-subtle: 209 250 229;
  --warning: 217 119 6;  --warning-subtle: 254 243 199;
  --error:   225 29 72;  --error-subtle:   255 228 230;
  --info:    2 132 199;  --info-subtle:    224 242 254;
}
.dark { /* every token above, redefined — not inverted */ }
```

**Two rules that stop this drifting back into four systems:**
- A component may reference `--brand`, never `indigo-500`.
- State colour is separate from brand accent. A "Pending" pill is `--warning`; it never borrows the accent because it happens to be the same hue family.

**Retirement path.** `--geex-*` and `--doc-*` are re-pointed at the semantic layer rather than deleted, so no existing class changes meaning on the day of the switch. The Quality editor already proves this works — `tailwind.config.js` registers shadcn's vocabulary (`bg-card`, `text-muted-foreground`) against the studio's palette precisely so a port kept its shape and adopted the studio's colour. Do the same in reverse for `--geex-*`, then remove the aliases module by module.

### 1.2 Typography scale

Checklist: clean H1-H6 hierarchy, body ≥16px, **monospace for numerical data, inventory counts and system IDs**.

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 32 / 1.15 | 700 | page title |
| `h1` | 26 / 1.2 | 700 | screen title |
| `h2` | 21 / 1.25 | 700 | panel title |
| `h3` | 17 / 1.35 | 600 | card title |
| `h4` | 15 / 1.4 | 600 | group label |
| `body` | **16** / 1.6 | 400 | prose, form values |
| `body-sm` | 14 / 1.55 | 400 | dense table cells |
| `label` | 12 / 1.4 | 600, `0.06em`, uppercase | field labels |
| `caption` | 12 / 1.45 | 400 | helper text |
| `mono` | 13 / 1.5 | 400, `tabular-nums` | **references, quantities, currency, IDs, dates** |

Faces: **Sora** (display, from the main website), **Inter** (body, from the main website), **IBM Plex Mono** (data). Three families, `display: swap`, subset to Latin + Arabic where the face supports it.

The mono rule is not cosmetic in this product. Every screen shows reference numbers (`INV-0042`, `PO-…`), AWB waybills, quantities, stock counts, currency and SectionIDs. `tabular-nums` on every one of them is what makes a column of figures scannable, and today none of them have it.

Arabic keeps **Tajawal / IBM Plex Sans Arabic** — the existing `[lang="ar"]` override stays, because Sora has no Arabic coverage.

### 1.3 Spacing & grid

An **8px baseline with a 4px half-step** (Tailwind's default `0.25rem` scale is already this — the work is *using* it consistently, not redefining it).

Two density modes, which is the checklist's dense-vs-spacious distinction made real:

```css
[data-density="compact"] { --pad-cell: 8px 12px;  --pad-card: 16px; --row-h: 36px; --gap: 12px; }
[data-density="comfortable"] { --pad-cell: 12px 16px; --pad-card: 24px; --row-h: 48px; --gap: 16px; }
```

Operational screens (Tickets, Stock, AWB, Task board) default to `compact`; client-facing and settings screens to `comfortable`; the user can override it per studio and it persists via the existing `loadPref`/`savePref` helpers in `studio2/ui.js`.

Layout grid: 12 columns, 24px gutters, content max 1440px, forms max 720px, prose max 72ch.

### 1.4 Elevation & z-index

The checklist asks for a **z-index stack mapping**. There is none today — `z-` values are chosen ad hoc, which is why dialogs, the MUI portal layer, the sticky studio header and the notification panel have no defined order.

```css
--z-base: 0;  --z-sticky: 100;   /* studio header, table header row */
--z-dropdown: 200;               /* selects, cascading menus, column pickers */
--z-drawer: 300;                 /* side sheets */
--z-modal: 400;                  /* dialogs */
--z-popover: 500;                /* tooltips, popovers over modals */
--z-toast: 600;                  /* always on top */

--shadow-flat:    0 1px 2px rgb(var(--fg) / .04);                          /* table cards */
--shadow-raised:  0 1px 3px rgb(var(--fg) / .06), 0 4px 12px -4px rgb(var(--fg) / .08);
--shadow-sticky:  0 2px 8px -2px rgb(var(--fg) / .10);                     /* header on scroll */
--shadow-overlay: 0 12px 32px -8px rgb(var(--fg) / .18);                   /* dropdown, popover */
--shadow-modal:   0 24px 64px -12px rgb(var(--fg) / .28);
```

MUI must be told the same numbers (`theme.zIndex`) or its portals will fight the Tailwind layer. That is a one-time edit in `lib/muiTheme.js` and is exactly the kind of divergence the current setup has no defence against.

### 1.5 Border radii

```
--radius-sm: 4px    inputs, chips, table cells
--radius-md: 8px    buttons, cards, dropdowns
--radius-lg: 12px   panels, dialogs
--radius-full        avatars, pills, toggles
```

Applied universally. Today the studio uses `rounded-geex`, `rounded-full`, `rounded-xl` and `rounded-2xl` interchangeably, with pill-shaped buttons (`rounded-full`) next to 12px cards — a mismatch that reads as unconsidered rather than deliberate.

### 1.6 Bind the tokens in Tailwind

The checklist specifies `tailwind.config.ts` with custom values tied to generic variable names. Rename `tailwind.config.js` → `.ts` (it arrives with the TypeScript migration anyway) and replace every literal:

```ts
colors: {
  brand:   "rgb(var(--brand) / <alpha-value>)",
  surface: "rgb(var(--bg-surface) / <alpha-value>)",
  success: "rgb(var(--success) / <alpha-value>)",
  // …
}
```

After this, `bg-brand` in a component and `--brand` in a stylesheet are the same value, and dark mode is one block of redefinitions rather than a `dark:` variant on every class.

---

## 2. Component taxonomy & loading strategies

The taxonomy below is the checklist's, with each item's current state and its assigned library. **The library rule** (also the checklist's): Tailwind for layout/colour/spacing, **shadcn for anything we want to own the source of**, **MUI only for behaviour not worth rebuilding**.

### 2.1 Primitives

| Component | State | Owner |
|---|---|---|
| Button (5 variants × 3 sizes × 5 states) | class strings in `studio2/ui.js` | shadcn |
| Badge / status pill | 4 ad-hoc maps (`URGENCY_BADGE`, `URGENCY_TONE`, `URGENCY_DOT`, `TONE`) | shadcn — **one** `<StatusPill tone>` |
| Avatar | present | shadcn ✔ |
| Tooltip | present | shadcn ✔ |
| Separator | present | shadcn ✔ |
| Typography (`<Text>`, `<Heading>`, `<Mono>`) | none — raw class strings | shadcn |
| Icon | hand-rolled 11 KB set | keep (it is good, and it is why no MUI icons package is installed) |

### 2.2 Form controls

| Component | State | Owner |
|---|---|---|
| Text input / textarea | class strings | shadcn |
| **Date picker** | native `<input type="date">` | **MUI** — the checklist calls it *vital for scheduling*, and precise date/time is exactly what MUI ships that is not worth rebuilding |
| Select | present | shadcn |
| **Autocomplete / multi-select** | `Combo.js`, hand-rolled | **MUI Autocomplete** — used for client, vendor, item, assignee pickers |
| Switch, Radio group, Checkbox | ad hoc | shadcn |
| Field wrapper (label + control + error + helper) | none | shadcn — this is what §3.2 needs |

### 2.3 Data display

| Component | State | Owner |
|---|---|---|
| **Dense data table** — pagination, filtering, sorting, column pick, sticky header, row selection | hand-rolled **per module**, ~8 copies, none paginated | **MUI Data Grid** for the dense operational grids (Tickets, Stock, AWB, Employees, Invoices); shadcn `<Table>` for short static lists |
| Kanban board | `StudioTasks.js` with `@dnd-kit` | keep, extract to `ui/patterns/Board` |
| Statistic summary card | `StatTile` in `studio2/ui.js` | promote to `ui/patterns/StatCard` |
| Charts | hand-rolled SVG (`FunnelChart`, `BarBreakdown`, `TimelineChart`, `ScatterChart`) | keep — small, dependency-free, already good |
| **Empty state** | `Empty` exists, used inconsistently | one `<EmptyState>` with icon / title / body / action |
| Sheet viewer | `StudioSheetViewer.js`, 43 KB | keep as a pattern; it is genuinely bespoke |

Adopting MUI Data Grid is the single largest UI decision here, and it is the checklist's own recommendation (*"Excellent for dense, internal administrative interfaces"*). It also delivers, for free, three things the audit says are missing: pagination (gap #7), full keyboard grid navigation (§4.2), and virtualisation for large row counts.

### 2.4 Feedback & overlays

| Component | State | Owner |
|---|---|---|
| Modal / dialog | `Dialog` in `studio2/ui.js` | shadcn |
| **Side sheet / drawer** | `drawer.jsx` exists, barely used | shadcn — the right home for quick edits that today open a full modal |
| **Toast / snackbar** | **none anywhere** | shadcn (Sonner) — see §7 |
| Popover | present | shadcn ✔ |
| Confirm dialog | ad hoc per module | one `<ConfirmDialog>`, destructive variant |

**There is no toast in the product.** Every action today either silently succeeds or silently fails. This is also the missing half of the notification design (`security-and-notifications.md`).

### 2.5 Navigation

| Component | State | Owner |
|---|---|---|
| Collapsible sidebar | `StudioFrame.js` — good, DB-driven | keep, extract |
| **Breadcrumbs** | **none** — and the router has 4-segment URLs (`/<slug>/sales-tickets/<id>/quotations/<qid>`) with no way back | shadcn — **high value, low cost** |
| Tabs | ad hoc per module | shadcn |
| **Command palette (⌘K)** | none | shadcn (cmdk) — see §8 |
| Cascading dropdown | `DropdownMenu` present | shadcn ✔ |

### 2.6 Progressive loading — skeletons

The checklist's most concrete requirement, and the one currently unmet everywhere except the Quality module (`document-skeleton.tsx`, which is a good model to copy).

**Rule: every asynchronous surface ships a skeleton whose shape matches the content it replaces.** Not a spinner, not a blank panel.

```
app/studio/[[...segments]]/loading.tsx        → the shell: sidebar + header + content block
modules/<name>/ui/<Screen>.skeleton.tsx       → per module
```

Concrete shapes, using the checklist's own examples:

| Screen | Skeleton |
|---|---|
| AWB tracking | 8 table rows: waybill block, carrier block, status pill, date, progress bar |
| Employee roster | 6 profile cards: circular avatar, two text lines, role pill |
| Sales dashboard | 4 stat tiles + funnel block + leaderboard rows |
| Task board | 3 columns × 3 card outlines |
| Ticket profile | header block, 2 metadata columns, timeline of 4 items |
| Quotation builder | header, 6 line rows, totals block |

Implementation is the pairing the checklist implies and Next already supports:

```tsx
// server component — no "use client"
export default async function SalesScreen({ slug, view }) {
  const ctx = await salesContext(slug);            // resolved on the server, streamed
  return (
    <Shell>
      <Suspense fallback={<TicketTableSkeleton rows={12} />}>
        <TicketTable data={listTickets(ctx)} />     {/* promise passed down, awaited inside */}
      </Suspense>
    </Shell>
  );
}
```

The skeleton must **reserve the same box** as the content — same row height, same column widths, same card dimensions — or it trades a spinner for a layout shift, which the checklist explicitly calls out as the thing to mitigate.

**Every skeleton also needs**: `aria-busy="true"`, `aria-live="polite"` on the region, a `prefers-reduced-motion` variant with no pulse, and a minimum display time of ~200 ms so a fast response does not flash.

---

## 3. Interactive states & behaviour

### 3.1 Action states

Five states, defined once per variant in the shadcn component, never re-specified at a call site:

| State | Treatment |
|---|---|
| Default | token background, `--shadow-flat` |
| **Hover** | `--brand-hover`, `transition-colors duration-200 ease-in-out` |
| **Active / pressed** | one step darker + `scale-[0.98]` |
| **Focus** | `ring-2 ring-[rgb(var(--border-focus))] ring-offset-2` via `:focus-visible` — the checklist asks for *highly visible* rings |
| Disabled | `opacity-50 cursor-not-allowed`, `aria-disabled`, and **a tooltip saying why** |

That last point matters in this product specifically: a control is often disabled because of a *permission*, and `access.js` already has `explain()` — a function written to answer "why can't Sara lock a quotation?" in a sentence. **It has no UI.** Wiring `explain()` into the disabled-state tooltip is the highest-value UX addition in this whole document, and the backend already exists.

### 3.2 Validation states

| State | Treatment |
|---|---|
| Error | `border-[rgb(var(--error))]`, error text below the field, `aria-invalid`, `aria-describedby` |
| Success | subtle check, used only where confirmation matters (slug availability, code entry) |
| Helper | `caption` token, **directly under the field**, always rendered so the box does not jump when an error replaces it |
| Pending | inline spinner in the field's trailing slot (async slug check, reference lookup) |

Field-level errors, not a summary banner. Focus moves to the first invalid field on submit.

### 3.3 Micro-interactions

One duration scale, applied everywhere:

```
--dur-fast: 120ms   hover, focus ring
--dur-base: 200ms   the checklist's default — accordions, menus, buttons
--dur-slow: 320ms   drawers, dialogs, page transitions
--ease: cubic-bezier(0.4, 0, 0.2, 1)
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)   /* from the main website — shared curve */
```

Never `transition-all` on anything containing a table — it forces layout on every frame. Transition the properties that change. Every animation wrapped in `@media (prefers-reduced-motion: no-preference)`.

---

## 4. Accessibility

Currently unmeasured. The three checklist items, with what each needs here:

### 4.1 Contrast — 4.5:1 text, 3:1 UI

Verify every semantic token pair in **both themes** and fail CI on regression. Known suspects in the current palette: `text-slate-400` on `--geex-surface-2` (≈3.1:1 — fails), `--geex-border` at 7-8% alpha (≈1.2:1 against the surface — fails the 3:1 UI requirement), and amber-on-white status pills.

Add a token-pair contrast test to CI. It is ~40 lines and it is the only way this stays true.

### 4.2 Keyboard navigation

The checklist wants power users to work **entirely** by keyboard. Required:

- Logical DOM tab order (currently broken in several modules where dialogs render outside the flow).
- **Data-grid keys**: arrows, Home/End, PageUp/Down, Enter to open, Space to select, `/` to focus filter. MUI Data Grid provides these; the hand-rolled tables provide none.
- Focus trap in dialogs and drawers, focus restored to the trigger on close.
- Skip-to-content link in `StudioFrame`.
- `Esc` closes the topmost overlay only — today the notification panel and dialogs both listen on `window`.
- A visible focus ring everywhere, never `outline: none` without a replacement.

### 4.3 Screen readers

- Semantic HTML: `<table>` for tabular data (several modules use `<div>` grids), `<nav>`, `<main>`, `<button>` for buttons.
- `aria-expanded` on every disclosure (sidebar groups, filter panels, column pickers), `aria-current="page"` on the active nav row.
- `aria-live="polite"` for toasts and the notification bell count; `role="alert"` for errors.
- `aria-busy` on skeleton regions.
- Every icon-only button needs an `aria-label` — `NotificationBell` already does this correctly and is the pattern to copy.

**RTL.** ~~`stylis-plugin-rtl` is not installed~~ — installed and wired 22/08/2026: `MuiRtlProvider` gives an Arabic studio a second Emotion cache with `[prefixer, rtlPlugin]`, keeping `enableCssLayer` so the mirrored rules stay inside `@layer mui`, and it is loaded through `dynamic()` so an English tenant never fetches it. What is left is the other half: the migration from physical to logical properties (`ps-`/`pe-`/`ms-`/`me-`/`border-s-`) is uneven across the screens — 57 uses in `StudioSales.js`, 9 in `StudioFinance.js` — so it is enforced as each screen is rewritten, and wants a lint rule so it cannot drift back.

---

## 5. Architectural approach — three libraries, one system

The checklist's own division, made concrete for this repo:

**Tailwind — the engine.** Every layout, colour and spacing decision. Tokens bound in `tailwind.config.ts`. Nothing else sets a colour.

**shadcn/ui — the ownership model.** Primitives, form controls, overlays, navigation. Code lives in `src/ui/`, Radix underneath for accessibility. Fix `components.json` first (`"tsx": true`, `"cssVariables": true`) or every generated component arrives in the wrong format with hardcoded colours.

**MUI — the packaged ecosystem.** Exactly three things, because each is expensive to rebuild and none is bespoke: **Data Grid**, **Date/Time pickers**, **Autocomplete**. Themed through `lib/muiTheme.js` bound to the same CSS variables, `colorSchemeSelector: "class"` (already correct), `className` preferred over `sx`.

**The layer order is load-bearing and must not change:**

```css
@layer tw-base, tw-components, mui, tw-utilities;
```

Tailwind preflight *below* MUI, Tailwind utilities *above* it. `enableCssLayer` alone is not enough — unlayered preflight collapses MUI text fields. No `<CssBaseline />`. This is already documented in `DESIGN.md` and is the thing most likely to be broken by a well-meaning cleanup.

---

## 6. Component architecture

The taxonomy above is unimplementable while a module is one 69 KB client file. Each module splits four ways:

```
modules/sales/ui/
├─ SalesScreen.tsx           server — fetches, composes, owns Suspense boundaries
├─ TicketTable.tsx           client island — interaction only
├─ TicketTable.skeleton.tsx  matched shape
├─ TicketDialog.tsx          client island, dynamic() — not in the initial bundle
├─ TicketFilters.tsx         client island
└─ derive.ts                 pure — filters, totals, summaries. No React. Unit-tested.
```

Expected effect on the numbers in §0: the initial studio bundle drops to the shell + one table island; dialogs and builders load on interaction; `derive.ts` becomes testable without a DOM. Target **under 400 KB gzipped** for the studio route, from 1.06 MB.

This split is a **refactor, not a redesign**, and can land before any visual change — see `refactoring-strategy.md` §2.5.

---

## 7. The missing feedback layer

Three surfaces the product has no vocabulary for at all. Designed in `security-and-notifications.md`; listed here because they are UI work:

1. **Toasts** — every mutation gets one. Success is quiet and auto-dismisses; failure persists with a retry action. Today a failed save is indistinguishable from a successful one.
2. **Optimistic + rollback** — `NotificationBell.markAllRead` already does this correctly and is the only place in the product that does. Generalise it.
3. **Conflict and permission errors as first-class UI** — a 409 says "someone else changed this, reload", not a red 500. A 403 says *which* permission and offers `explain()`'s sentence.

---

## 8. Additions worth making while the system is being built

Cheap once the taxonomy exists, and each removes a real daily friction:

- **Command palette (⌘K)** — jump to any studio, section, ticket, project or client. This product has a 4-level URL structure and a 34-row sidebar; search is faster than navigation.
- **Breadcrumbs** — required by the checklist and genuinely absent from a router that produces `/<slug>/sales-tickets/<id>/quotations/<qid>`.
- **Saved views** — filters on the dense grids, persisted per person. `loadPref`/`savePref` already exist.
- **Density toggle** — §1.3, one line once the tokens are in.
- **Bulk actions** — row selection on the grids, then approve / assign / export. MUI Data Grid gives selection for free.
- **Print stylesheets** — the Quality editor already prints properly; quotations, invoices and delivery notes do not.
- **Empty states with an action** — every empty list should say what to do next, not just that it is empty.

---

## 9. Sequence

| Phase | Work | Ships |
|---|---|---|
| **0** | Fix `components.json`; delete `jsconfig.json`; install `stylis-plugin-rtl`; contrast test in CI; bundle budget in CI | 2 days |
| **1** | Token layer: primitives + semantics + spacing/elevation/radius/type. Re-point `--geex-*` and `--doc-*` as aliases. No visual change. | 1 week |
| **2** | `src/ui/` primitives + form controls + overlays, shadcn-generated, tokens applied. MUI theme bound to the same variables. | 2 weeks |
| **3** | **Skeletons everywhere** + `loading.tsx` + Suspense. Highest user-visible payoff, and independent of the rest. | 1.5 weeks |
| **4** | Component split per module (§6), one module per slice, Sales first. Toast layer lands here. | 4-6 weeks |
| **5** | MUI Data Grid on the five dense grids; pagination contract from `recommendations.md` gap #7. | 3 weeks |
| **6** | Accessibility pass: keyboard, ARIA, RTL completion, audit against 4.1-4.3. | 2 weeks |
| **7** | Additions in §8. | ongoing |

Phases 1-3 are independent of the TypeScript and database work and can run in parallel with them. Phase 4 shares the component split with `refactoring-strategy.md` Phase 5 — do it once, not twice.

---

## 10. Definition of done

The checklist, as acceptance criteria:

- [ ] Every colour in the app resolves through a semantic token; zero hex literals outside `tokens/primitives.ts`
- [ ] Type scale applied; body ≥16px; every reference, quantity, currency and ID rendered in `mono` with `tabular-nums`
- [ ] 8px spacing scale enforced; both density modes working and persisted
- [ ] z-index map defined once and honoured by Tailwind **and** MUI portals
- [ ] Radii sm/md/lg applied universally
- [ ] All five taxonomy groups implemented in `src/ui/`
- [ ] **Every async surface has a shape-matched skeleton**; no spinners; no layout shift on load
- [ ] All five action states and all four validation states defined once per component
- [ ] `transition duration-200 ease-in-out` standard; reduced-motion respected
- [ ] 4.5:1 text and 3:1 UI contrast verified in both themes, in CI
- [ ] Every workflow completable by keyboard alone, including the data grids
- [ ] ARIA verified; RTL correct including MUI
- [ ] Tokens bound in `tailwind.config.ts`; shadcn owns primitives; MUI limited to Data Grid, pickers and Autocomplete
- [ ] Studio route under 400 KB gzipped
- [ ] `explain()` surfaced on every permission-disabled control
