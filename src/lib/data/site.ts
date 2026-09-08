// PLATFORM SITE CONTENT — nompany's own public marketing site.
//
// This is NOT tenant data: it belongs to the platform, sits outside every
// cascade, and no user or studio owns it. Keys live under `g:site:*`, matching
// the other global registries.
//
// (Studios have no public site of their own. The `website` section and the
// /c/<slug> profile it powered were removed on 2026-08-12 — nompany.com hosts
// only the platform's own marketing site.)

import { readArr, editArr, editJSON, getJSON } from "@/platform/db/store";
import type { Row } from "@/platform/db/store";
import { SITE } from "@/platform/db/keys";

const COLLECTIONS = new Set([
  "services", "careers", "previousProjects", "galleryImages",
  "reviews", "messages", "applications",
]);

export async function getSiteCollection(name: string) {
  if (!COLLECTIONS.has(name)) throw new Error(`Unknown site collection: ${name}`);
  return readArr(SITE.collection(name));
}

// Atomic: `messages` and `applications` are written by the PUBLIC forms, so two
// visitors submitting at the same moment is the normal case, not the edge case.
export async function addSiteRow(name: string, row: Record<string, unknown>) {
  if (!COLLECTIONS.has(name)) throw new Error(`Unknown site collection: ${name}`);
  // Minted outside editArr's closure — see catalog.ts's updateCatalogItem for why:
  // the closure may run once per CAS retry, so an id minted inside it would be
  // whichever round happened to win, not a fixed identifier for this row.
  const mintedId = row.id || `${name.slice(0, 3)}_${Date.now().toString(36)}`;
  return editArr(SITE.collection(name), (rows: Row[]) => {
    const record = { id: mintedId, ...row };
    return { next: [record, ...rows], result: record };
  });
}

// PATCH ONE ROW IN PLACE, under compare-and-set (invariant 8).
//
// `addSiteRow` PREPENDS, so calling it a second time with an id that already
// exists writes a DUPLICATE rather than updating anything — which is what the
// contact route did on its first draft when it tried to flip `notified` after
// a successful send, and it would have produced two of every enquiry that
// actually got through.
//
// The patch is a FUNCTION for the reason `updateRow` takes one: "mark this
// notified" has to stay a mark under contention, not a snapshot of the row as
// it looked before some other writer touched it. A missing id is not an error —
// the row may legitimately have been deleted between the write and the mark —
// so it answers null and the caller carries on.
export async function updateSiteRow(
  name: string,
  id: string,
  patch: (row: Row) => Row,
) {
  if (!COLLECTIONS.has(name)) throw new Error(`Unknown site collection: ${name}`);
  return editArr(SITE.collection(name), (rows: Row[]) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) return { next: rows, result: null };
    const next = rows.slice();
    next[i] = patch(next[i]);
    return { next, result: next[i] };
  });
}

// Brand / contact / marketing copy for the public pages. Returns {} until the
// owner console writes some — the pages fall back to lib/site.js + i18n.
export async function getSiteSettings() {
  return (await getJSON<Record<string, unknown>>(SITE.settings)) || {};
}

export async function updateSiteSettings(patch: Record<string, unknown>) {
  return editJSON(SITE.settings, (cur: Record<string, unknown> | null) => {
    const next = { ...(cur || {}), ...patch };
    return { next, result: next };
  });
}
