// The grid's dimensions, in one place.
//
// This file exists so a skeleton can be WRONG-PROOF. A placeholder is only worth
// having if the real thing lands exactly where it stood; the moment the row
// height is written as `52` in the grid and `52` again in the skeleton, the two
// are one careless edit away from a layout shift that nobody will connect back
// to the skeleton. Both import these instead.
//
// The numbers themselves come from `.ad-table` in super.css: 0.75rem of padding
// either side of an uppercase 11px header is 44px, and 0.875rem either side of a
// 14px row is 52px. A Data Grid sitting beside a summary table should keep the
// same rhythm.

export const GRID_HEADER_HEIGHT = 44;
export const GRID_ROW_HEIGHT = 52;
export const GRID_FOOTER_HEIGHT = 52;
export const GRID_TOOLBAR_HEIGHT = 56;

// The height a grid occupies for `rows` rows, toolbar and footer included. Used
// by the skeleton to reserve the exact box, and by the grid itself so the two
// agree by construction rather than by coincidence.
export function gridHeight(rows, { toolbar = true, footer = true } = {}) {
  return (
    (toolbar ? GRID_TOOLBAR_HEIGHT : 0) +
    GRID_HEADER_HEIGHT +
    rows * GRID_ROW_HEIGHT +
    (footer ? GRID_FOOTER_HEIGHT : 0)
  );
}
