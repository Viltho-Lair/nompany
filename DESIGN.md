# Design Guidelines

This document is the single source of truth for design decisions across the project. All design information is recorded here.

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
