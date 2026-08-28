# Department list tables

The table a department screen shows when it lists its records — the sales tickets, the
technical quotations, the project list — and the three controls above it: search, filters,
columns.

## What it is

One component, `src/components/studio2/StudioDataGrid.jsx`, wrapping MUI's Data Grid in
studio tokens. It gives every list the same sortable headers, the same client-side paging,
the same empty state and the same row hover. It is **loaded through `nextDynamic` at every
use site, never statically** — `@mui/x-data-grid` is heavy and the studio's largest chunk is
measured against a hard ceiling, so the grid lands in its own async chunk that only a screen
actually rendering one ever fetches. Each use site pairs it with `StudioDataGridSkeleton`,
sized to that screen's default column count, so the box does not resize when the chunk lands.

Above it sit `Toolbar`, `FilterButton`, `FilterPanel` and `ColumnPicker` from
`src/components/studio2/ui.js`, and behind those, `useTablePrefs` in the same file.

Three screens use all of it: Sales' tickets, Technical's quotations, Projects' list.

## What it stores

**Nothing on the server.** Which columns you show and what you have filtered by are a
personal working preference — they say how one person likes to read a list — so they live in
that browser's `localStorage`, keyed by module and studio slug:

    nompany-<module>-cols:<slug>       an array of column KEYS
    nompany-<module>-filters:<slug>    the filter object, empty strings for unset

`useTablePrefs` owns both. Two rules are written down there once rather than three times:

- **The preference is read after mount**, never during render — `localStorage` does not exist
  on the server, and reading it during render makes the first paint disagree with the markup
  React sent.
- **Saved columns are filtered against the KEY list, never the labelled one.** The preference
  holds keys, so which column is which must not depend on the reader's language. Every screen
  therefore keeps a `*_COLUMN_KEYS` array (the contract) separate from a
  `*Columns(tr)` function (the copy).

A screen with a condition of its own wraps the hook's `has(key)` rather than reimplementing
it — Sales hides the RFQ column when the studio has no Technical section, which is not the
reader's choice to make.

## What it does

- **Sorts** on each column's `field`. Figures carry `type: "number"` so they sort by
  magnitude rather than lexically; a column reporting a derived status (Sales' RFQ) sets
  `sortable: false`, because there is no order worth having.
- **Pages** client-side, ten rows by default, 10/25/50 offered.
- **Filters and searches** in the screen, not the grid — a `useMemo` over the rows, so the
  count line above the table (`X of Y`) reports the filtered length against the total.
- **Flags a row** that is waiting on somebody: an unresolved ticket, an unfinished quotation,
  a project nobody has started. Drawn as an inset `box-shadow` through `getRowClassName`, so
  it costs no layout, reading a `--sg-flag` variable set on the wrapper so it flips in dark
  mode.
- **Opens the record** on a row click, and again from an always-drawn action cell at the end
  — the row is a grid row, not a link, so that cell is what carries keyboard reach.
- **Reports only.** Acting on a record happens on the record's own page or in its dialog.
  Quotations are the one exception: Lock, Unlock and Request approval sit in the action cell,
  because they act on the quotation without opening it.

**A deep link no longer rings a row.** `?ticket=`, `?project=`, `?quotation=` used to scroll
the row into view and ring it; client paging cannot scroll to a row that may sit on another
page. Projects and Technical instead OPEN the record the link names (the detail dialog, the
builder). Sales' tickets drop it — a ticket's page is a route, and the link goes there.

## Not built yet

- **Server-side paging and sorting.** Every list loads its department's whole collection and
  pages it in the browser. Fine at today's row counts; it is the first thing to change when a
  tenant's ticket list outgrows one response.
- **Export.** No CSV or print from any of the three lists.
- **Column widths and order are not preferences.** Which columns show is saved; how wide they
  are and what order they sit in is not — the order is the fixed `*_COLUMN_KEYS` order, and
  widths come from each column's `minWidth`/`flex`.
- **The other nine departments still hand-roll their tables.** Finance and Inventory use
  `StudioDataGrid` but have no filter panel or column picker; HR, Operations, Quality, Tasks,
  People, Access and Main list rows without the grid at all. Nothing about their behaviour is
  shared with this file yet.
- **The grid does not mirror in Arabic.** `StudioDataGrid` writes its own padding and rules
  with logical properties so they will mirror, but MUI's internal layout renders LTR inside
  an Arabic studio. See `language.md`.
