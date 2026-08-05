// Readable URL slugs for public detail pages. Slugs come from the English
// title; the id is the fallback (and a stable tiebreaker). Detail routes match
// on slug OR id, so links never break even when a title changes or two records
// share a title.

export function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-") // keep latin + arabic, collapse the rest
    .replace(/^-+|-+$/g, "");
}

export function projectSlug(p) {
  return slugify(p?.title_en || p?.title_ar) || p?.id || "";
}

export function serviceSlug(s) {
  return slugify(s?.title_en || s?.title_ar) || s?.id || "";
}

// Find a record in `rows` whose slug (via `slugFn`) or id matches `param`.
export function findBySlug(rows, param, slugFn) {
  if (!Array.isArray(rows)) return null;
  return rows.find((r) => slugFn(r) === param) || rows.find((r) => r.id === param) || null;
}
