// THE ONLY PART OF A DOCUMENT'S APPEARANCE THAT IS THE STUDIO'S.
//
// Everything else moved into globals.css. It had lived here as a JS string
// because a headless Chromium with no network and no build step had to be
// handed a self-contained stylesheet; that Chromium is gone, and a hand-written
// imitation of the app's design is exactly the thing that kept drifting from
// it. What is left here is what globals.css cannot know: the paper a particular
// studio prints on, and how much of it to leave blank.

const SIZES = { A4: { w: 210, h: 297 }, Letter: { w: 216, h: 279 } };

const mm = (v, fallback) => `${Number(v) > 0 ? Number(v) : fallback}mm`;

/**
 * The @page rule for one document, plus the same measurements as variables so
 * the sheet on screen is the same shape as the sheet that comes out.
 *
 * `@page` is honoured by the print engine and ignored by the screen; the
 * variables are honoured by the screen and overridden to nothing in print. The
 * two never fight because each is invisible to the other.
 */
export function printCss(letterhead) {
  const size = SIZES[letterhead?.pageSize === "Letter" ? "Letter" : "A4"];
  const m = letterhead?.margins || {};
  const top = mm(m.top, 28);
  const right = mm(m.right, 18);
  const bottom = mm(m.bottom, 22);
  const left = mm(m.left, 18);

  return `
@page { size: ${size.w}mm ${size.h}mm; margin: ${top} ${right} ${bottom} ${left}; }
.doc-sheet {
  --doc-width: ${size.w}mm;
  --doc-top: ${top}; --doc-right: ${right}; --doc-bottom: ${bottom}; --doc-left: ${left};
}
`;
}
