// The studio Data Grid's dimensions AND its loading placeholder, in one file with
// NO MUI import — so a screen can reserve the grid's box and static-import the
// skeleton without pulling @mui/x-data-grid into the department's initial chunk.
// The heavy StudioDataGrid is nextDynamic()'d separately; this is what stands in
// its place while that async chunk loads.
//
// WHY THE METRICS LIVE HERE. A placeholder is only worth having if the real grid
// lands exactly where it stood. The moment the row height is written as `52` in
// the grid and `52` again in the skeleton, the two are one careless edit away
// from a layout shift nobody connects back to the skeleton. Both import these.
// The numbers mirror the console's grid rhythm (gridMetrics.js): a 44px uppercase
// header and 52px rows, so a studio grid keeps the same beat as the console's.

export const GRID_HEADER_HEIGHT = 44;
export const GRID_ROW_HEIGHT = 52;
export const GRID_FOOTER_HEIGHT = 52;

// The height a grid occupies for `pageSize` rows, header and footer included.
// Used by the skeleton to reserve the exact box and by the grid itself so the two
// agree by construction rather than by coincidence.
export function gridHeight(pageSize, { footer = true } = {}) {
  return GRID_HEADER_HEIGHT + pageSize * GRID_ROW_HEIGHT + (footer ? GRID_FOOTER_HEIGHT : 0);
}

// Deterministic-but-varied cell widths, so a skeleton row reads as a row of data
// rather than a run of identical bars. Keyed off the column index alone — no
// Math.random(), which would make the server and client markup disagree.
const cellWidth = (i) => `${45 + ((i * 23) % 40)}%`;

// The placeholder. Shaped like the grid: a header rule, a run of striped rows,
// each column a shimmer bar, the whole thing exactly gridHeight(pageSize) tall so
// the swap to the real grid moves nothing. Reduced-motion drops the sweep (the
// `.skel::after` rule in globals.css), leaving a still box — which is the point.
export function StudioDataGridSkeleton({ columns = 6, pageSize = 10, rows = 6, ariaLabel = "Loading" }) {
  const shown = Math.min(rows, pageSize);
  return (
    <div
      aria-busy="true"
      aria-label={ariaLabel}
      className="w-full"
      style={{ height: gridHeight(pageSize) }}
    >
      <div
        className="flex items-center"
        style={{ height: GRID_HEADER_HEIGHT, borderBottom: "1px solid var(--geex-border)" }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 px-3">
            <div className="skel skel-text" style={{ width: "3.5rem" }} />
          </div>
        ))}
      </div>
      {Array.from({ length: shown }).map((_, r) => (
        <div
          key={r}
          className="flex items-center"
          style={{ height: GRID_ROW_HEIGHT, borderBottom: "1px solid var(--geex-border)" }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex-1 px-3">
              <div className="skel skel-text" style={{ width: cellWidth(i + r) }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default StudioDataGridSkeleton;
