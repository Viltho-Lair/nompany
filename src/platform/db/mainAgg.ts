// THE MAIN ROLLUP — write-side. The canonical list of what the executive Overview
// aggregates, plus the best-effort updater. Kept in platform (not modules/main) so
// the write path (addRow) stays a platform-only dependency. The READ side
// (executive.ts) imports MAIN_AGG_SOURCES from here so the two never drift.
import { S } from "./keys";
import { hIncrBy } from "./store";

export const MAIN_AGG_SOURCES: { section: string; fallback: string | null; collection: string }[] = [
  { section: "crm-sales-tickets", fallback: "crm-sales", collection: "salesTickets" },
  // Quotations moved OUT from under Engineering & Documents to CRM & Sales
  // (restructure.ts's SECTION_KEY_MAP: technical-quotations -> crm-sales-
  // quotations), so its fallback parent moves with it.
  { section: "crm-sales-quotations", fallback: "crm-sales", collection: "quotations" },
  { section: "engineering-docs-rfq", fallback: "engineering-docs", collection: "rfqs" },
  { section: "projects-list", fallback: "projects", collection: "projects" },
  { section: "inventory-items", fallback: "inventory", collection: "inventoryItems" },
  { section: "tasks", fallback: null, collection: "tasks" },
];

const TRACKED_COLLECTIONS: ReadonlySet<string> = new Set(MAIN_AGG_SOURCES.map((s) => s.collection));

/** The UTC day (YYYY-MM-DD) of an ISO instant, or of now. Matches Phase 1 bucketing. */
export function utcDay(iso?: string): string {
  return (iso ? new Date(iso) : new Date()).toISOString().slice(0, 10);
}

/** The hash field for a section's count on a day. Keyed by sectionId (§2). */
export function aggField(sectionId: string, day: string): string {
  return `${sectionId}:day:${day}`;
}

/**
 * BEST-EFFORT. Fired fire-and-forget from addRow/addRows after rows are
 * written. Never throws, never awaited on the write's critical path. Only the
 * six tracked collections count; a miss is corrected by the nightly reconcile.
 *
 * `by` IS HOW MANY ROWS THAT WRITE ADDED, and it exists because addRows landed:
 * a batch is one write, so it fires this once, and a hard-coded 1 would have
 * counted an import of two hundred items as one. Vendors are not a tracked
 * collection so nothing was wrong the day it was added — which is exactly the
 * kind of latent miscount the reconcile would later have had to explain.
 */
export async function bumpMainAgg(studioId: string, sectionId: string, collection: string, by = 1): Promise<void> {
  try {
    if (!TRACKED_COLLECTIONS.has(collection) || by < 1) return;
    await hIncrBy(S.mainAgg(studioId), aggField(sectionId, utcDay()), by);
  } catch {
    // swallow — the reconcile is the source of truth, and a rollup miss must
    // never surface on the write that already succeeded.
  }
}
