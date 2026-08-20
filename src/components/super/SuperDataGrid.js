"use client";

import { useMemo } from "react";
import { DataGrid, gridClasses } from "@mui/x-data-grid";
import {
  GRID_FOOTER_HEIGHT,
  GRID_HEADER_HEIGHT,
  GRID_ROW_HEIGHT,
  GRID_TOOLBAR_HEIGHT,
  gridHeight,
} from "./gridMetrics";
import Icon from "@/app/super/_components/Icon";

// THE console's data grid. Every list a person actually works in — users,
// studios, orders — is one of these; the hand-rolled `<table>` in _components/ui
// is kept only for summary tables that have a footer to add up and nothing to
// sort.
//
// WHY sx AND NOT className. CLAUDE.md's rule is "prefer className over sx", and
// it holds everywhere the class lands on an element we render. It cannot hold
// here: these selectors address elements the Data Grid renders inside itself,
// which no className of ours ever reaches. `sx` is the seam MUI gives us, and
// its output lands in `@layer mui` — below Tailwind's utilities — so a
// className on the wrapper still wins over anything written below.
//
// EVERY VALUE IS A TOKEN. The grid's own palette (`--DataGrid-*`, the Material
// `divider`, `background.paper`) is overridden wholesale rather than partly,
// because a grid that inherits half its colours from MUI's default theme and
// half from ours is the surface where the two palettes visibly disagree —
// header background from one, row border from the other.
//
// EVERY BOX PROPERTY IS LOGICAL. `paddingInline`, `borderInlineEnd`,
// `marginInlineStart`. The Data Grid renders LTR inside Arabic pages today
// (stylis-plugin-rtl is not installed — see CLAUDE.md), so its internal layout
// does not mirror; what these rules control is our own padding and rules, and
// those mirror the moment the plugin lands rather than needing a second sweep.

const NoRows = ({ label = "Nothing here yet.", icon = "list" }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ad-muted)] text-[var(--ad-muted-foreground)]">
      <Icon name={icon} className="h-5 w-5" />
    </span>
    <p className="text-sm text-[var(--ad-muted-foreground)]">{label}</p>
  </div>
);

export default function SuperDataGrid({
  rows,
  columns,
  // The grid is sized from the page size, not from the data: a page showing 8 of
  // 200 rows and a page showing the last 3 should not be different heights, or
  // the footer jumps every time someone pages to the end.
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  emptyLabel,
  emptyIcon,
  toolbar = null,
  getRowId,
  className = "",
  ariaLabel,
  // A caller's own sx is MERGED, never substituted. Spreading `...rest` over a
  // computed `sx` looks harmless and silently drops every rule below it — the
  // grid keeps MUI's default palette and only the caller's one line survives.
  sx: sxOverride,
  ...rest
}) {
  const sx = useMemo(
    () => ({
      // MUI's own grid variables, pointed at ours.
      "--DataGrid-containerBackground": "transparent",
      "--DataGrid-rowBorderColor": "var(--ad-border)",
      "--DataGrid-overlayHeight": `${GRID_ROW_HEIGHT * 4}px`,

      border: "none",
      color: "var(--ad-foreground)",
      fontFamily: "inherit",
      fontSize: "0.875rem",

      [`& .${gridClasses.columnHeaders}`]: {
        borderBottom: "1px solid var(--ad-border)",
      },
      [`& .${gridClasses.columnHeader}`]: {
        paddingInline: "1.5rem",
        outlineOffset: -2,
      },
      [`& .${gridClasses.columnHeaderTitle}`]: {
        // The same micro-label the rest of the console uses for a column name.
        fontSize: "0.6875rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--ad-muted-foreground)",
      },
      [`& .${gridClasses.columnSeparator}`]: { display: "none" },

      [`& .${gridClasses.cell}`]: {
        paddingInline: "1.5rem",
        borderTop: "none",
        borderBottom: "1px solid var(--ad-border)",
        display: "flex",
        alignItems: "center",
        outlineOffset: -2,
      },
      [`& .${gridClasses.cell}:focus, & .${gridClasses.cell}:focus-within`]: {
        outline: "2px solid var(--ad-ring)",
      },
      [`& .${gridClasses.columnHeader}:focus, & .${gridClasses.columnHeader}:focus-within`]: {
        outline: "2px solid var(--ad-ring)",
      },

      [`& .${gridClasses.row}:hover`]: {
        backgroundColor: "rgb(var(--ad-muted-rgb) / 0.6)",
      },
      [`& .${gridClasses.row}.Mui-selected`]: {
        backgroundColor: "rgb(var(--ad-primary-rgb) / 0.1)",
      },
      [`& .${gridClasses.row}.Mui-selected:hover`]: {
        backgroundColor: "rgb(var(--ad-primary-rgb) / 0.16)",
      },
      // The last row's rule would double up with the card's own bottom edge.
      [`& .${gridClasses.row}--lastVisible .${gridClasses.cell}`]: {
        borderBottom: "none",
      },

      [`& .${gridClasses.footerContainer}`]: {
        minHeight: GRID_FOOTER_HEIGHT,
        borderTop: "1px solid var(--ad-border)",
        paddingInline: "0.75rem",
      },
      [`& .${gridClasses.overlay}`]: {
        backgroundColor: "transparent",
      },

      // Figures are tabular WHEREVER they land in the grid. A column opts in by
      // setting `cellClassName: "ad-num"`; this makes the pagination counts
      // ("11–20 of 214") tabular too, so the footer stops twitching as you page.
      [`& .${gridClasses.footerContainer} .MuiTablePagination-displayedRows`]: {
        fontVariantNumeric: "tabular-nums",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      },

      "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
        color: "var(--ad-muted-foreground)",
        fontSize: "0.75rem",
      },
      "& .MuiIconButton-root": { color: "var(--ad-muted-foreground)" },
      "& .MuiIconButton-root.Mui-disabled": { color: "var(--ad-muted-foreground)", opacity: 0.4 },
      "& .MuiCheckbox-root": { color: "var(--ad-muted-foreground)" },
      "& .MuiCheckbox-root.Mui-checked": { color: "var(--ad-primary)" },
    }),
    [],
  );

  // `slots` has to be a STABLE object. An inline `{ noRowsOverlay: () => … }` is
  // a new component type on every render, so React unmounts and remounts the
  // empty state each time the parent re-renders — which, on a grid whose rows
  // come from a search box, is on every keystroke.
  const slots = useMemo(
    () => ({ noRowsOverlay: () => <NoRows label={emptyLabel} icon={emptyIcon} /> }),
    [emptyLabel, emptyIcon],
  );

  return (
    <div
      className={className}
      // The box is reserved from the page size, matching what the skeleton
      // reserved, so the swap from placeholder to grid moves nothing.
      style={{ height: gridHeight(pageSize, { toolbar: Boolean(toolbar) }) }}
    >
      {toolbar ? (
        <div
          className="flex flex-wrap items-center gap-2 px-4"
          style={{ minHeight: GRID_TOOLBAR_HEIGHT }}
        >
          {toolbar}
        </div>
      ) : null}
      <div style={{ height: gridHeight(pageSize, { toolbar: false }) }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={getRowId}
          columnHeaderHeight={GRID_HEADER_HEIGHT}
          rowHeight={GRID_ROW_HEIGHT}
          initialState={{ pagination: { paginationModel: { pageSize, page: 0 } } }}
          pageSizeOptions={pageSizeOptions}
          disableRowSelectionOnClick
          disableColumnMenu
          slots={slots}
          aria-label={ariaLabel}
          sx={sxOverride ? [sx, sxOverride] : sx}
          {...rest}
        />
      </div>
    </div>
  );
}
