# Design Guidelines

This document is the single source of truth for design decisions across the project. All design information is recorded here.

## Styling stack

Three layers, app-wide. Reach for them in this order:

1. **Tailwind CSS** — the default. Layout, spacing, colour, responsive and dark
   variants. The palette lives in [`tailwind.config.js`](tailwind.config.js) as
   `brand-*` / `steel-*` / `accent-*` / `geex-*`; use those tokens, not raw hex.
2. **shadcn/ui** — for structural primitives we want to own the source of
   (tables, drawers, dialogs). Configured in [`components.json`](components.json)
   (new-york, `tsx: false` — this is a **JS** project, so components land as
   `.jsx`). `cssVariables` is **off**: shadcn components are hand-adapted to the
   slate/dark palette above rather than driven by shadcn theme tokens. They live
   in [`src/components/ui`](src/components/ui) and use the `cn()` helper from
   [`src/lib/utils.js`](src/lib/utils.js).
3. **MUI** — for complex behaviour that isn't worth rebuilding (data grids,
   pickers, menus, autocomplete). Core only (`@mui/material` + emotion); no
   icons package — the studio has its own set in
   [`icons.js`](src/components/studio/icons.js).

### How the three coexist

Mounted app-wide by [`MuiProvider`](src/components/MuiProvider.js) in the root
layout, with the theme in [`muiTheme.js`](src/lib/muiTheme.js):

- **Tailwind beats MUI — via an explicit layer order.**
  `AppRouterCacheProvider` runs with `enableCssLayer: true`, so every MUI rule is
  wrapped in `@layer mui`. That alone is *not* enough: unlayered CSS outranks
  layered CSS, so leaving Tailwind unlayered would let its **preflight** win too
  — and preflight's `input { padding:0; border:0 }` collapses MUI text fields to
  ~23px with the wrong border colour. So [`globals.css`](src/app/globals.css)
  splits Tailwind across named layers and orders them around `mui`:

  ```
  tw-base  <  tw-components  <  mui  <  tw-utilities
  ```

  Preflight sits *below* MUI (MUI keeps its own component styles) while
  utilities sit *above* it (so `className` still wins with no `!important` and
  no `sx`). **Prefer `className` over `sx`.**

  Note Tailwind v3 owns the `@layer` at-rule, so a plain
  `@layer a, b, c;` ordering statement gets rewritten — the surviving
  `@layer mui;` between the components and utilities blocks is what pins MUI's
  position. Verify with a production build if you touch this: the compiled CSS
  must show `tw-base` → `tw-components` → `@layer mui;` → `tw-utilities`, in
  that order, and the stylesheet must load before emotion's runtime
  `<style data-emotion>` tags.
- **Dark mode is the existing `.dark` class.** The theme sets
  `cssVariables: { colorSchemeSelector: "class" }`, so MUI emits light vars under
  `:root` and dark vars under `.dark` — the same class `ThemeToggle` and the
  no-flash script already toggle on `<html>`. No extra provider, no React state,
  no hydration mismatch.
- **No `<CssBaseline />`.** Tailwind's preflight is the reset, and `globals.css`
  owns `<body>` (dark gradient backdrop, font stack, heading colours). MUI's
  baseline on top would fight all three.
- **Fonts** are wired to the `--font-display` / `--font-body` CSS variables
  rather than literal families, so MUI text picks up the Arabic typeface
  automatically when `[dir="rtl"]` swaps them.

**Known gap — MUI in RTL.** Emotion needs `stylis-plugin-rtl` to mirror MUI's
own generated styles, and it isn't installed. Fonts and Tailwind classes flip
correctly; MUI's internal padding/positioning will not. Add the plugin before
putting MUI components on an Arabic screen. **This is now live on `/ar/account`,
whose form fields are MUI `TextField`s** — the notched outline label and the
`nompany.com/` start adornment stay left-anchored under `dir="rtl"`.

## Account hub (`/[locale]/account`)

A full-screen app surface, not a marketing page: [`Footer`](src/components/Footer.js)
returns `null` on this route (`isBare`, the same idiom as the contact page), so
only the site `Nav` sits above it.

[`AccountHome`](src/components/public/AccountHome.js) follows the **Google
Account "stack" grammar**, remapped onto the palette above. The metrics are
taken from Google's own CSS, not eyeballed:

| Element | Spec | Token |
| --- | --- | --- |
| Content column | `888px`, centred | `max-w-[888px]` |
| Page title | `1.75rem` / 500 / lh 1.286 | matches the Studio "Title" size |
| Stack item | `min-height:56px`, `padding:12px 16px`, `gap:12px` | `ROW` |
| Stack corners | first 20px top · last 20px bottom · middle 4px | `first:`/`last:` variants |
| Gaps | 2px between rows · 16px between groups | `gap-[2px]` · `gap-4` |
| Row label / value | `1rem`/500 · `0.875rem`/400 muted, ellipsis | `ROW_LABEL` / `ROW_VALUE` |
| Page / row surface | `#f0f4f9` / `#fff` | `steel-50` / `white` |
| Active nav pill | `primary-container` on `on-primary-container`, 48px, full radius | `brand-100` on `brand-800` |
| Buttons | Material pill, 40px, sentence case | `PILL` |
| Form fields | Material outlined + notched floating label, 56px | MUI `<TextField size="medium">` |

The stack radius trick relies on `first:`/`last:` carrying a pseudo-class, which
outranks the base `rounded-[4px]`; a lone row matches both and ends up fully
rounded. Rows are built from one `Row` component whose `as` prop swaps the tag
(div / button / link) without changing the metrics.

## Typography

### Studio font sizes

| Role    | Size      | Line-height | Notes                          |
| ------- | --------- | ----------- | ------------------------------ |
| Title   | `1.75rem` | 1.25        | Page / section titles          |
| Heading | `1rem`    | 1.4         | Sub-headings within a section  |
| Normal  | `0.875rem`| 1.5         | Body / default text            |

**These are the only three font sizes allowed in the Studio.**

### How it's enforced

Rather than editing every page, the scale is enforced globally in
[`src/app/globals.css`](src/app/globals.css) under the `html.studio-chrome`
scope (Studio only — the public site is unaffected). Tailwind's text-size
utilities are collapsed into the three buckets:

- **Title (1.75rem):** `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`
- **Heading (1rem):** `text-base`, `text-lg`
- **Normal (0.875rem):** `text-sm`, `text-xs` (and the default for elements
  with no size utility)

Substring matching (`[class*="…"]`) also catches responsive variants
(`sm:text-2xl`, `lg:text-lg`, …). Arbitrary sizes like `text-[11px]` are left
untouched to avoid colliding with arbitrary colours (`text-[#hex]`); avoid
introducing new arbitrary text sizes in Studio code.

### Studio typeface

- **English / LTR:** **Cabin** (Google Fonts) is the font for *all* Studio text,
  including display headings. Enforced in [`globals.css`](src/app/globals.css)
  under `html.studio-chrome` — the `.font-display` utility is overridden there so
  nothing in the Studio escapes Cabin.
- **Arabic / RTL:** when the Studio is switched to Arabic (`dir="rtl"` on
  `<html>`), the font family becomes
  `var(--font-display), Saira, system-ui, sans-serif`.
- The **public site** is unaffected and keeps Saira (display) + IBM Plex (body).

## Color palette

Slate + royal-blue ERP palette (source: `erp_color_palette.pdf`), tuned for data-dense screens. Mapped onto Tailwind `brand-*` (blue) and `steel-*` (slate).

| Role | Light | Dark |
| --- | --- | --- |
| App background | `#F8FAFC` | `#0F172A` |
| Surface / cards | `#FFFFFF` | `#1E293B` |
| Primary text | `#0F172A` | `#F8FAFC` |
| Secondary text | `#475569` | `#94A3B8` |
| Borders / lines | `#E2E8F0` | `#334155` |
| Primary brand (UI) | `#2563EB` | `#3B82F6` |

**Semantic:** success `#059669` (Approved) · warning `#D97706` (Pending) · danger `#E11D48` (Failed) · info `#0284C7` (In Progress). In dark mode use these at ~15% opacity for backgrounds, full strength for text/icons.

**Logo / brand mark:** the four-petal pinwheel logo (`public/brand/logo-icon.png`) uses **orange `#F7941D`** (three petals) + **sky-blue `#38B8E8`** (one petal). These are the identity colors — distinct from the UI primary brand royal-blue. Use orange+cyan for the mark; royal-blue for UI controls.

## Controls

### Language switcher

A shared hover-/focus-expandable dropdown, [`src/components/LangMenu.js`](src/components/LangMenu.js),
used in two places (interaction mirrors the theme toggle — collapsed shows a
globe icon + current language code; hover reveals the options):

- **Main site** ([`Nav.js`](src/components/Nav.js)): options are locale links
  (`/en…`, `/ar…`) preserving the current sub-path. Replaces the old single
  language pill in both the header and the mobile overlay.
- **Studio** ([`StudioLangToggle.js`](src/components/studio/StudioLangToggle.js)):
  replaces the former LTR/RTL button. Options flip `dir`/`lang` on `<html>` and
  persist to `localStorage["studio-dir"]`. English is the default.

Languages: **English** (default) and **العربية**, each label shown in its own
script.

### Studio translation (i18n)

The Studio is being translated to **Arabic** (everyday, commonly-used business
Arabic). Mechanism:

- [`src/lib/studioI18n.js`](src/lib/studioI18n.js) — `StudioLangProvider`
  (wraps the panel in [`(panel)/layout.js`](src/app/studio/(panel)/layout.js)),
  `useStudioLang()` (`{ lang, setLang }`), and `useT()` → `t(englishText)`.
- [`src/lib/studioDict.js`](src/lib/studioDict.js) — `STUDIO_AR`, keyed by the
  **exact English string**. **Missing keys fall back to English**, so coverage
  grows module-by-module without breaking untranslated screens.
- The [language switcher](#language-switcher) drives it; Arabic also flips
  `dir=rtl` + the Arabic typeface (already wired). English is the default.

**Coverage status:** foundation + full Studio **shell** done, plus per-module
content for: **1)** Tasks + Notifications, **2)** Operations, **3)** Projects,
**4)** Sales, and **5)** Technical — now **complete** (dashboard, analytics,
quotation-copy settings, RFQ manager, quotations list, quotation
builder/viewer/preview, live view + the shared
[`ColumnPickerModal`](src/components/studio/ColumnPickerModal.js)); and **6)**
Inventory — also **complete** (dashboard, items, stock, project sheets, AWB
tracking + the shared
[`StudioCollectionManager`](src/components/studio/StudioCollectionManager.js) that
drives Vendors and every collection screen); and **7)** Finance (settings,
projects PO table, and the Cash section — sheets grid, spending analytics,
per-project lifetime drill-down). Printed/exported document bodies stay English
(the quotation PDF/Word and the Cash-sheet print layout are formal deliverables,
and the quotation export is migrating to the documents feature) — only the
studio-chrome controls around them are translated; and **8)** HR (employees
list, employee edit form with ID/passport scans, self-profile +
change-password, and the HR-settings vacation events). The HR landing was a
server component, so its cards were extracted into a client
[`HrDashboard`](src/components/studio/HrDashboard.js) — the pattern for
translating any server-rendered studio page; and **9)** Settings — the final
module (company settings, documentation-image admin, the access-control
permission tree, and the documentation guide's chrome). **All 9 modules are now
translated and live.** The documentation guide's **manual body** stays English
(authored help content — a documentation-localization effort of its own, like
the printed document bodies). Each screen wraps its strings with `t("…")` and
adds keys to `STUDIO_AR` (~1,228 keys). **Outstanding, non-module:** the queued
"SAR"→Riyal-symbol sweep across Super + Studio money displays.

### Studio icons (nav + notifications)

Five icons added to [`icons.js`](src/components/studio/icons.js) (24×24, `currentColor`, stroke style):

| Icon | Where used |
| --- | --- |
| `checkCircle` | "Appointed to a task" notification type (bell / center / settings) |
| `live` | Sales → Live view, Technical → Live view |
| `techService` | Technical section (top-level nav) |
| `money` | Sales section (top-level nav) |
| `gears` | Operations section (top-level nav) |

The **notification-settings toggle** was restyled (MUI-like): bordered track, elevated thumb with a subtle ring, and a small brand-blue check inside the thumb when on ([`NotificationSettings.js`](src/components/studio/NotificationSettings.js)).

### Sheet search bars

Operations → **Permits** and **Locations** sheets each have a search bar
(`SheetSearch` in [`OperationsReport.js`](src/components/studio/OperationsReport.js)):
an icon-prefixed input that filters the table live (permits by name/number/
assigned employee; locations by name/contact name/phone).
