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
  return editArr(SITE.collection(name), (rows: Row[]) => {
    const record = { id: row.id || `${name.slice(0, 3)}_${Date.now().toString(36)}`, ...row };
    return { next: [record, ...rows], result: record };
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
