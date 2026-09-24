// DOWNLOAD EVERYTHING — one file holding every record a studio has, for its
// owner. The owner's rules (24/09/2026) promise it twice: a shut-down studio's
// owner "sees only pay and download everything", and the Terms (1.4, §5 and
// §12) let an owner export at any time while the account exists, closed or shut
// down included. The deletion at day 365 is not run before this exists.
//
// EVERY ROW IS READ THROUGH `readCol`, the one door that opens sealed client
// fields (invariant 18), so the owner gets their clients' details in the clear
// and nothing here ever handles a sealed token or a key. What is read is exactly
// what the studio's own screens read.
//
// WHERE THE ROWS ARE: every section the studio holds, and in each, the
// collections SECTION_COLLECTIONS files there — plus `engineRecords` under each
// register's own `engine-<typeKey>` section, which that compile-time map cannot
// name. Filed-only and switched-off sections are included: switching a
// department off hides it, and its rows are still the owner's.
//
// WHAT IS LEFT OUT, deliberately: secrets (API keys, the e-invoicing secret),
// sessions, and nompany's own billing record. Uploaded files are LISTED with
// their names, sizes and the address that serves them to a member — the bytes
// would make one file of unbounded size.

import { listSections, collectionsForKey, readCol } from "@/platform/db/sections";
import { getJSON, readArr } from "@/platform/db/store";
import { S } from "@/platform/db/keys";
import { getStudioById } from "@/modules/main/studios";
import { listMediaForStudio, getMedia } from "@/lib/media";

const ENGINE_SECTION = /^engine-/;

/** The studio record without anything that is a credential. */
function studioSummary(studio: Record<string, unknown>) {
  const { einvoiceSettings, ...rest } = studio;
  const einvoice = einvoiceSettings && typeof einvoiceSettings === "object"
    ? Object.fromEntries(Object.entries(einvoiceSettings as Record<string, unknown>).filter(([k]) => !/secret|key|token/i.test(k)))
    : undefined;
  return { ...rest, ...(einvoice ? { einvoiceSettings: einvoice } : {}) };
}

export async function exportStudio(studioId: string) {
  const studio = await getStudioById(studioId);
  if (!studio) return null;

  const sections = await listSections(studioId);
  const records: { section: string; name: string; enabled: boolean; collections: Record<string, unknown[]> }[] = [];
  for (const section of sections) {
    const names = new Set(collectionsForKey(section.key));
    if (ENGINE_SECTION.test(section.key)) names.add("engineRecords");
    const collections: Record<string, unknown[]> = {};
    for (const name of names) {
      const rows = await readCol(studioId, section.id, name);
      if (rows.length) collections[name] = rows;
    }
    if (Object.keys(collections).length) {
      records.push({ section: section.key, name: section.name, enabled: section.enabled !== false, collections });
    }
  }

  const [members, roles, settings, mediaIds] = await Promise.all([
    readArr(S.collaborators(studioId)),
    readArr(S.roles(studioId)),
    getJSON(S.settings(studioId)),
    listMediaForStudio(studioId),
  ]);
  const files: { id: string; filename: string; contentType: string; size: number; createdAt: string; path: string }[] = [];
  for (const id of mediaIds) {
    const m = await getMedia(id);
    if (m) files.push({ id, filename: m.filename, contentType: m.contentType, size: m.size, createdAt: m.createdAt, path: `/api/media/${id}` });
  }

  return {
    exportedAt: new Date().toISOString(),
    format: "nompany-studio-export/1",
    studio: studioSummary(studio as unknown as Record<string, unknown>),
    members,
    roles,
    settings,
    sections: sections.map((s) => ({ id: s.id, key: s.key, name: s.name, parentId: s.parentId || null, enabled: s.enabled !== false })),
    records,
    files,
  };
}
