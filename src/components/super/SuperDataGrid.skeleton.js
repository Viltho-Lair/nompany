import { Card } from "@/app/super/_components/ui";
import {
  GRID_FOOTER_HEIGHT,
  GRID_HEADER_HEIGHT,
  GRID_ROW_HEIGHT,
  GRID_TOOLBAR_HEIGHT,
} from "./gridMetrics";

// The placeholder for a SuperDataGrid, shaped from the same metrics the grid is
// built from — same 44px header, the same number of 52px rows the page size will
// show, same footer. Swap one for the other and nothing on the page moves.
//
// It takes the grid's OWN `columns`, not a row count, so the bars land under the
// headings they belong to: a 130px status column gets a 130px column of pills
// and the eye can already see the shape of the table it is waiting for. Give a
// column `skeleton: "avatar" | "pill" | "number"` to say what kind of thing
// lands there; anything else draws a text bar.
//
// The card head is drawn with `.ad-card-head` itself rather than a hand-measured
// box. That class owns the padding, so the placeholder head and the real head
// are the same height BY CONSTRUCTION — the alternative is a magic `84px` here
// that silently stops matching the first time the card's padding changes.
//
// Accessibility: `aria-busy` and the label sit on the REGION. The bars are
// `aria-hidden`, so a screen reader hears "loading users" once rather than forty
// anonymous graphics.

function Bar({ kind, width }) {
  if (kind === "avatar") {
    return (
      <span className="flex items-center gap-3">
        <span className="skel skel-circle block h-8 w-8 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="skel skel-text block h-2.5 w-24" />
          <span className="skel skel-text mt-1.5 block h-2 w-32 opacity-70" />
        </span>
      </span>
    );
  }
  if (kind === "pill") {
    return <span className="skel block h-5 w-16 rounded-full" />;
  }
  // A number bar is narrower and end-aligned, because numeric columns are
  // end-aligned in the grid and a placeholder sitting on the wrong side of the
  // cell is a shift waiting to happen.
  if (kind === "number") {
    return (
      <span className="flex justify-end">
        <span className="skel skel-text block h-2.5 w-12" />
      </span>
    );
  }
  return <span className="skel skel-text block h-2.5" style={{ width: width || "70%" }} />;
}

export default function SuperDataGridSkeleton({
  columns = [],
  rows = 10,
  // "head" mirrors a CardHead (title, sub, and search/filter controls beside it)
  // — the shape every list screen in this console uses. "toolbar" is the shorter
  // strip SuperDataGrid renders when it is handed one. "none" for a bare grid.
  chrome = "head",
  actions = 2,
  label = "Loading",
  className = "",
}) {
  const cols = columns.length
    ? columns
    : [{ field: "a", flex: 1 }, { field: "b", flex: 1 }, { field: "c", flex: 1 }];

  const template = cols.map((c) => (c.flex ? `${c.flex}fr` : `${c.width || 140}px`)).join(" ");

  return (
    <Card className={`overflow-hidden ${className}`} role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}…</span>

      {chrome === "head" ? (
        <div className="ad-card-head">
          <div className="min-w-0 flex-1">
            {/* 1rem title, 0.75rem sub — the two lines CardHead actually draws. */}
            <span className="skel block h-4 w-40 rounded-md" />
            <span className="skel skel-text mt-2 block h-2.5 w-64 max-w-full opacity-70" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {Array.from({ length: actions }, (_, i) => (
              // Field height: .ad-input is 0.625rem of padding either side of a
              // 14px line, plus its border — 43px.
              <span key={i} className="skel block h-[43px] w-40 rounded-xl" />
            ))}
          </div>
        </div>
      ) : chrome === "toolbar" ? (
        <div className="flex items-center justify-between gap-3 px-4" style={{ minHeight: GRID_TOOLBAR_HEIGHT }}>
          <span className="skel block h-9 w-64 max-w-[50%] rounded-xl" />
          <span className="skel block h-9 w-28 rounded-full" />
        </div>
      ) : null}

      <div
        className="grid items-center gap-4 border-b border-[var(--ad-border)] px-6"
        style={{ gridTemplateColumns: template, height: GRID_HEADER_HEIGHT }}
      >
        {cols.map((c, i) => (
          <span key={c.field || i} className="skel skel-text block h-2 w-16 opacity-70" />
        ))}
      </div>

      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="grid items-center gap-4 px-6"
          style={{
            gridTemplateColumns: template,
            height: GRID_ROW_HEIGHT,
            borderBottom: r === rows - 1 ? "none" : "1px solid var(--ad-border)",
          }}
        >
          {cols.map((c, i) => (
            <Bar key={c.field || i} kind={c.skeleton} width={c.skeletonWidth} />
          ))}
        </div>
      ))}

      <div
        className="flex items-center justify-end gap-4 border-t border-[var(--ad-border)] px-4"
        style={{ minHeight: GRID_FOOTER_HEIGHT }}
      >
        <span className="skel skel-text block h-2 w-24" />
        <span className="skel skel-circle block h-7 w-7" />
        <span className="skel skel-circle block h-7 w-7" />
      </div>
    </Card>
  );
}
