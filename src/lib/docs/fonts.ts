/**
 * Loading Google Fonts at runtime.
 *
 * The catalogue is ~1,950 families, so nothing is bundled. A family's webfont
 * is fetched from fonts.googleapis.com the first time it is needed — when it is
 * shown in the picker, or applied to text. Requests are batched into one
 * stylesheet per call and deduplicated across the session.
 *
 * Consequence: with no network, previously-unfetched families fall back to the
 * generic family in `fontStack()`.
 */

/** Families already requested this session, so nothing is fetched twice. */
const requested = new Set<string>();

/** Weights worth having for document text; anything else is a wasted download. */
const WEIGHTS = "400;700";

export const DEFAULT_FONT_FAMILY = "Inter";
export const DEFAULT_FONT_SIZE_PT = 11;

/** Point sizes offered in the size picker, matching the usual word-processor set. */
export const FONT_SIZES_PT = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96,
];

/**
 * A CSS font-family value for a Google family, with a generic fallback so text
 * stays readable while the webfont loads (or if it never does).
 */
export function fontStack(family: string, category?: string): string {
  const generic =
    category === "serif"
      ? "serif"
      : category === "monospace"
        ? "monospace"
        : category === "handwriting" || category === "display"
          ? "cursive"
          : "sans-serif";
  return `"${family}", ${generic}`;
}

/**
 * Ensures stylesheets exist for the given families. Safe to call repeatedly —
 * already-requested families are skipped, and everything new goes out as a
 * single css2 request.
 */
export function loadFonts(families: string[]): void {
  if (typeof document === "undefined") return;

  const missing = families.filter((family) => {
    if (family === "" || requested.has(family)) return false;
    requested.add(family);
    return true;
  });

  if (missing.length === 0) return;

  const params = missing
    .map(
      (family) =>
        `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${WEIGHTS}`,
    )
    .join("&");

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
  link.dataset.googleFonts = "";
  document.head.appendChild(link);
}
