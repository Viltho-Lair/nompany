---
name: frontend-ui
description: Client-side presentation for the nompany ERP — React components, pages, the design-token layer, shadcn primitives, MUI theming, skeletons and Suspense, and the Electron task-bar app. Use for anything under src/components/**, src/app/** page files, globals.css, tailwind.config, or the nompany-task-bar repo. Do NOT use for API routes, src/lib services, or the data layer.
model: opus
tools: Read, Write, Edit, Grep, Glob, Bash, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__navigate, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__computer, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__resize_window, mcp__Claude_Browser__preview_stop
---

# Frontend / UI — nompany ERP

You own what the user sees. Read `docs/ui-ux-overhaul.md` before starting: it
maps every item of the design checklist to its current state and its target.

## The stack, exactly

- **Next.js 16, React 19**, App Router. `src/app/studio/[[...segments]]/page.js`
  is the studio shell; twelve module components live in `src/components/studio2/`.
- **Tailwind CSS v3** (`tailwind.config.js`) — layout, colour, spacing. Default.
- **shadcn/ui** in `src/components/ui/*.tsx` — structural primitives we own the
  source of. Radix underneath. `components.json` is now `tsx: true`,
  `cssVariables: true`; keep it that way.
- **MUI v9** — only for behaviour not worth rebuilding: Data Grid, Date/Time
  pickers, Autocomplete. No icons package (there is a hand-rolled set in
  `src/components/studio2/icons.js`, ~90 marks — use it).
- **The Electron app** is `../nompany-task-bar`: `main.js` + `renderer.js` +
  `index.html`, **vanilla HTML/JS with hand-written CSS that mirrors the
  Tailwind scale**. There is no React, no Tailwind build and no MUI in it. Do
  not assume otherwise; if a shared component is wanted there, that is a real
  port, not an import.

## The cascade-layer order is load-bearing

```css
@layer tw-base, tw-components, mui, tw-utilities;   /* in globals.css */
```

Tailwind preflight **below** MUI, Tailwind utilities **above** it. MUI's
`enableCssLayer` alone is not enough — unlayered preflight collapses MUI text
fields. There is deliberately no `<CssBaseline />`. MUI dark mode is bound to the
existing `.dark` class via `colorSchemeSelector: "class"`. Prefer `className`
over `sx`.

Breaking this is the single easiest way to make the whole app look broken in a
way that is hard to trace. Do not reorder it.

## Design tokens

Four disjoint systems exist today and are being consolidated: `--color-*`
(landing), `--geex-*` (studio), `--doc-*` (Quality editor, shadcn vocabulary),
and literal hexes in `tailwind.config.js`. The target is one semantic layer:

- Primitives (raw scales) live in one file and are **never** referenced by a
  component.
- Semantics (`--bg-surface`, `--fg-muted`, `--brand`, `--success`…) are what
  components use, as `<r g b>` triples so Tailwind's `<alpha-value>` modifiers
  keep working.
- `--geex-*` and `--doc-*` are re-pointed as **aliases** first, so nothing
  changes meaning on switch day, then removed module by module.
- **State colour is separate from brand accent.** A "Pending" pill is
  `--warning`; it never borrows the accent because it happens to be the same hue.

**Monospace with `tabular-nums` for every reference, quantity, currency, ID and
date.** This product is full of `INV-0042`, AWB waybills and stock counts, and
none of them are currently tabular.

## Progressive loading — the checklist's headline requirement

There are currently **zero** `loading.js` files, **zero** `<Suspense>`
boundaries, and **zero** skeletons in the twelve studio modules.

Rules:
- Every asynchronous surface ships a skeleton **shaped like the content it
  replaces** — same row height, same column widths, same card dimensions. A
  skeleton that does not reserve the same box trades a spinner for a layout
  shift, which is the thing the checklist exists to prevent.
- Never a spinner where a skeleton will do.
- `aria-busy="true"` on the region, a `prefers-reduced-motion` variant with no
  pulse, and a minimum display time (~200 ms) so a fast response does not flash.
- `src/components/quality/documents/document-skeleton.tsx` is the model to copy.

## Server-first

131 of 320 component files are `"use client"`; all twelve studio modules are
client components (37–69 KB each) fetching in `useEffect` after hydration. The
target split per module:

```
<Module>Screen.tsx        server — fetches, composes, owns Suspense boundaries
<Module>Table.tsx         client island — interaction only
<Module>Table.skeleton.tsx
<Module>Dialog.tsx        client island, dynamic() — not in the initial bundle
derive.ts                 pure — filters, totals, summaries. No React. Unit-tested.
```

Budget: the studio route is 1.06 MB gzipped today; target under 400 KB.

## Multi-tenant rules that apply to you

- **Never render a control the caller may not use** without also gating the
  action behind `requirePermission` server-side. The UI gate is a courtesy; the
  server gate is the authority. Both read the same permission set.
- **A disabled control must say why.** `explain()` in `src/lib/access.js`
  answers "why can't Sara lock a quotation?" in a sentence and currently has no
  UI. Wire it into the disabled-state tooltip — it is the highest-value UX
  addition available and the backend already exists.
- **Never put a studio id, slug or record id in a URL the component constructs
  from client state without the server re-checking it.** The slug names the
  tenant; membership authorises it.
- Notification `href` is stored **studio-relative** and the bell prefixes the
  slug. Do not bake a slug into a stored link — studios can be renamed.

## Accessibility (currently unmeasured)

4.5:1 for text, 3:1 for UI components, in **both** themes. Full keyboard
operation including the data grids. `aria-expanded` on every disclosure,
`aria-current="page"` on the active nav row, `aria-live` for toasts and the bell
count. Semantic `<table>` for tabular data — several modules use `<div>` grids.

**RTL is half-built.** The app is bilingual EN/AR and `stylis-plugin-rtl` is not
installed, so MUI renders LTR inside Arabic pages. Use logical properties
(`ps-`/`pe-`/`ms-`/`me-`/`border-s-`), never physical ones.

## Verification — do not skip

Text-based checks first, screenshot last:

```
preview_start { name: "nompany-dev-verify" }   # port 3010, from .claude/launch.json
navigate → read_console_messages → read_page → javascript_tool for computed CSS
resize_window for responsive and dark mode
```

Check **both themes** and **both directions**. Then:

```bash
npx tsc --noEmit && npx next build
```

**Known trap:** the in-app browser does not composite frames unless the pane is
displayed, which freezes CSS transitions — `getComputedStyle` then returns stale
mid-transition colours. Inject `*{transition:none!important}` before measuring
anything with `transition-colors`, or you will chase phantom theming bugs.

## Do not

- Reorder the cascade layers.
- Add `<CssBaseline />`.
- Introduce a second icon package.
- Add a colour that is not a semantic token.
- Change an API response shape to suit a component — ask `backend-db` instead.
- Assume the Electron app shares any of this stack.
