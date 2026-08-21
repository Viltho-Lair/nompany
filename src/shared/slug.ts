// Readable URL slugs for public detail pages. Slugs come from the English
// title; the id is the fallback (and a stable tiebreaker). Detail routes match
// on slug OR id, so links never break even when a title changes or two records
// share a title.

export function slugify(str: string | null | undefined): string {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-") // keep latin + arabic, collapse the rest
    .replace(/^-+|-+$/g, "");
}

// The shape a slug is read off: an English title, an Arabic one, and an id to
// fall back to. Anything carrying those three can be slugged, which is why this
// is structural rather than a named record type.
export type Sluggable = { title_en?: string; title_ar?: string; id?: string };

export function projectSlug(p: Sluggable | null | undefined): string {
  return slugify(p?.title_en || p?.title_ar) || p?.id || "";
}

export function serviceSlug(s: Sluggable | null | undefined): string {
  return slugify(s?.title_en || s?.title_ar) || s?.id || "";
}

// Find a record in `rows` whose slug (via `slugFn`) or id matches `param`.
// GENERIC, so the row that comes back is the row that went in. Typing `rows` as
// an array of anything would hand every caller an `any` to carry onward, which
// is how a strict folder quietly stops being strict at its edges.
export function findBySlug<T extends { id?: string }>(
  rows: T[] | null | undefined,
  param: string,
  slugFn: (row: T) => string,
): T | null {
  if (!Array.isArray(rows)) return null;
  return rows.find((r) => slugFn(r) === param) || rows.find((r) => r.id === param) || null;
}
