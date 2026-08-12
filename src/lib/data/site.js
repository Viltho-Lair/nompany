// PLATFORM SITE CONTENT — nompany's own public marketing site.
//
// This is NOT tenant data: it belongs to the platform, sits outside every
// cascade, and no user or studio owns it. Keys live under `g:site:*`, matching
// the other global registries.
//
// (A subscriber studio's own website content is different — that lives in its
// `website` section, under s:<StudioID>:sec:<SectionID>:c:*.)

import { readArr, editArr, editJSON, getJSON } from "@/lib/data/store";

const COLLECTIONS = new Set([
  "services", "careers", "previousProjects", "galleryImages",
  "reviews", "messages", "applications",
]);

const key = (name) => `g:site:${name}`;

export async function getSiteCollection(name) {
  if (!COLLECTIONS.has(name)) throw new Error(`Unknown site collection: ${name}`);
  return readArr(key(name));
}

// Atomic: `messages` and `applications` are written by the PUBLIC forms, so two
// visitors submitting at the same moment is the normal case, not the edge case.
export async function addSiteRow(name, row) {
  if (!COLLECTIONS.has(name)) throw new Error(`Unknown site collection: ${name}`);
  return editArr(key(name), (rows) => {
    const record = { id: row.id || `${name.slice(0, 3)}_${Date.now().toString(36)}`, ...row };
    return { next: [record, ...rows], result: record };
  });
}

// Brand / contact / marketing copy for the public pages. Returns {} until the
// owner console writes some — the pages fall back to lib/site.js + i18n.
export async function getSiteSettings() {
  return (await getJSON(key("settings"))) || {};
}

export async function updateSiteSettings(patch) {
  return editJSON(key("settings"), (cur) => {
    const next = { ...(cur || {}), ...patch };
    return { next, result: next };
  });
}
