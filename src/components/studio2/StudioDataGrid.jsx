"use client";

// THE studio's dense-table Data Grid — the client-side, sortable, paginated
// equivalent of the hand-rolled `<table>`s the department screens grew. It mirrors
// the console's SuperDataGrid (src/components/super/SuperDataGrid.js) but wears
// STUDIO tokens: the console's `--ad-*` variables resolve to nothing outside
// `.admindek`, so painting a studio grid with them is the exact trap CLAUDE.md
// warns about (a console-scoped token carried into a studio screen resolves to
// nothing and still builds). Colours here come from `--geex-*`, the studio's
// slate/white-alpha foreground ladder, and the brand scale.
//
// LOADED VIA nextDynamic AT EACH USE SITE, never statically. @mui/x-data-grid is
// heavy; the studio's department screens are code-split (`nextDynamic`) and the
// largest chunk is measured against a hard ceiling. Importing this straight into
// StudioFinance/StudioInventory would fold the grid into that department's initial
// chunk. Instead each screen does
//   const StudioDataGrid = nextDynamic(() => import(".../StudioDataGrid"),
//     { ssr: false, loading: () => <StudioDataGridSkeleton … /> });
// exactly the way StudioDate loads MuiDate — so the Data Grid lands in its own
// async chunk that only a screen actually rendering a grid ever fetches.
//
// WHY sx AND NOT className. CLAUDE.md's rule is "prefer className over sx", and it
// holds everywhere a class lands on an element WE render. It cannot hold here:
// these selectors address elements the Data Grid renders inside itself, which no
// className of ours reaches. `sx` is the seam MUI gives us, and its output lands
// in `@layer mui` — below Tailwind's utilities — so a className on the wrapper
// still wins over anything written below. The theme-varying colours are set as
// CSS variables on the wrapper (via Tailwind's `dark:` variant) and read by `sx`
// as `rgb(var(--sg-*))`, so dark mode flips through the existing `.dark` class
// without a MUI theme round-trip.
//
// EVERY BOX PROPERTY IS LOGICAL (paddingInline, borderInlineEnd). The grid renders
// LTR inside Arabic pages today (stylis-plugin-rtl is not installed — see
// CLAUDE.md), so its internal layout does not mirror; logical props on OUR padding
// and rules mirror the moment the plugin lands rather than needing a second sweep.

import { useMemo } from "react";
import { DataGrid, gridClasses } from "@mui/x-data-grid";
import { Icon } from "@/components/studio2/icons";
import {
  GRID_HEADER_HEIGHT,
  GRID_ROW_HEIGHT,
  GRID_FOOTER_HEIGHT,
  gridHeight,
} from "./StudioDataGrid.skeleton";

const NoRows = ({ label = tr.nothingHereYet, icon = "list" }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[var(--geex-faint)] dark:bg-white/5">
      <Icon name={icon} className="h-5 w-5" />
    </span>
    <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
  </div>
);

export default function StudioDataGrid({
  rows,
  columns,
  getRowId,
  // Sized from the page size, not the data: a page showing 8 of 200 and a page
  // showing the last 3 must not be different heights, or the footer jumps.
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  emptyLabel,
  emptyIcon,
  ariaLabel,
  className = "",
  // A caller's own sx is MERGED, never substituted — spreading it over a computed
  // `sx` silently drops every rule below it.
  sx: sxOverride,
  ...rest
}) {
  const sx = useMemo(
    () => ({
      // MUI's own grid variables, pointed at ours.
      "--DataGrid-containerBackground": "transparent",
      "--DataGrid-rowBorderColor": "var(--geex-border)",
      "--DataGrid-overlayHeight": `${GRID_ROW_HEIGHT * 4}px`,

      border: "none",
      color: "rgb(var(--sg-fg))",
      fontFamily: "inherit",
      fontSize: "0.875rem",

      [`& .${gridClasses.columnHeaders}`]: {
        borderBottom: "1px solid var(--geex-border)",
      },
      [`& .${gridClasses.columnHeader}`]: {
        paddingInline: "0.75rem",
        outlineOffset: -2,
      },
      [`& .${gridClasses.columnHeaderTitle}`]: {
        // The same micro-label the rest of the studio uses for a column name.
        fontSize: "0.6875rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "rgb(var(--sg-muted))",
      },
      [`& .${gridClasses.columnSeparator}`]: { display: "none" },

      [`& .${gridClasses.cell}`]: {
        paddingInline: "0.75rem",
        borderTop: "none",
        borderBottom: "1px solid var(--geex-border)",
        display: "flex",
        alignItems: "center",
        outlineOffset: -2,
      },
      [`& .${gridClasses.cell}:focus, & .${gridClasses.cell}:focus-within`]: {
        outline: "2px solid rgb(var(--sg-brand))",
      },
      [`& .${gridClasses.columnHeader}:focus, & .${gridClasses.columnHeader}:focus-within`]: {
        outline: "2px solid rgb(var(--sg-brand))",
      },

      [`& .${gridClasses.row}:hover`]: {
        backgroundColor: "rgb(var(--sg-fg) / 0.04)",
      },
      [`& .${gridClasses.row}.Mui-selected`]: {
        backgroundColor: "rgb(59 130 246 / 0.10)",
      },
      [`& .${gridClasses.row}.Mui-selected:hover`]: {
        backgroundColor: "rgb(59 130 246 / 0.16)",
      },
      // The last row's rule would double up with the panel's own bottom edge.
      [`& .${gridClasses.row}--lastVisible .${gridClasses.cell}`]: {
        borderBottom: "none",
      },

      [`& .${gridClasses.footerContainer}`]: {
        minHeight: GRID_FOOTER_HEIGHT,
        borderTop: "1px solid var(--geex-border)",
        paddingInline: "0.75rem",
      },
      [`& .${gridClasses.overlay}`]: { backgroundColor: "transparent" },

      // The pagination count ("11–20 of 214") is a figure too, so it renders
      // tabular-mono like every other number in the studio and stops twitching as
      // you page.
      [`& .${gridClasses.footerContainer} .MuiTablePagination-displayedRows`]: {
        fontVariantNumeric: "tabular-nums",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      },
      "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
        color: "rgb(var(--sg-muted))",
        fontSize: "0.75rem",
      },
      "& .MuiIconButton-root": { color: "rgb(var(--sg-muted))" },
      "& .MuiIconButton-root.Mui-disabled": { color: "rgb(var(--sg-muted))", opacity: 0.4 },
    }),
    [],
  );

  // `slots` must be a STABLE object — an inline `{ noRowsOverlay: () => … }` is a
  // new component type every render, so React unmounts and remounts the empty
  // state on each keystroke of a search box that feeds the grid.
  const slots = useMemo(
    () => ({ noRowsOverlay: () => <NoRows label={emptyLabel} icon={emptyIcon} /> }),
    [emptyLabel, emptyIcon],
  );

  return (
    <div
      // The theme-varying colours the `sx` above reads. Set here (not in the MUI
      // theme) so they flip through the existing `.dark` class. `--sg-fg` is
      // slate-900 → white, `--sg-muted` slate-500 → slate-400, `--sg-brand`
      // brand-700 → brand-300 — the same pairs the hand-rolled tables used.
      className={`w-full [--sg-fg:15_23_42] [--sg-muted:100_116_139] [--sg-brand:29_78_216] dark:[--sg-fg:255_255_255] dark:[--sg-muted:148_163_184] dark:[--sg-brand:147_197_253] ${className}`}
      style={{ height: gridHeight(pageSize) }}
    >
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
  );
}
