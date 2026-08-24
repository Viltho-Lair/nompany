// WHAT EACH REDIS COLLECTION BECOMES IN SQL SERVER.
//
// This is the transcription of docs/database-migration-mssql.md §2 into data the
// backfill can drive itself with. It is deliberately DECLARATIVE — a table of
// facts, not code — so that the design doc and the migration cannot silently
// disagree: a reviewer can diff this file against §2 line by line.
//
// Two kinds of source:
//   • PLATFORM registries  — the g:* documents (users, studios, …). Explicit,
//     because their target tables are relational and hand-shaped in the doc.
//   • OPERATIONAL collections — the 32 section-scoped collections. GENERIC: every
//     one follows the same (Id, StudioId, SectionId, CreatedAt, DeletedAt, Extra)
//     pattern, so they are driven by SECTION_COLLECTIONS + the table-name map
//     below rather than 32 hand-written column lists. The doc's own escape hatch
//     — "unknown fields land in Extra, and every field found there after cutover
//     is a candidate for promotion" — is what makes the generic path faithful
//     rather than lossy.

import { REG, S, U, SECTION_COLLECTIONS } from "@/platform/db/keys";

// ---- platform registries → tables -----------------------------------------
// `key` is the Redis key (already namespaced by keys.ts); `shape` says how the
// value is laid out. "array" is a JSON array of rows; "map" is an object keyed
// by id whose values are the rows; "object" is a single 1:1 document.
export const PLATFORM = [
  { key: REG.users, table: "User", shape: "array", idField: "id" },
  { key: REG.studios, table: "Studio", shape: "array", idField: "id" },
  { key: REG.superAdmins, table: "SuperAdmin", shape: "array", idField: "id" },
  { key: REG.joinRequests, table: "JoinRequest", shape: "array", idField: "id" },
  { key: REG.questionnaires, table: "Questionnaire", shape: "array", idField: "id" },
  { key: REG.packages, table: "Package", shape: "array", idField: "id" },
  { key: REG.tiers, table: "Tier", shape: "array", idField: "id" },
  { key: REG.erpServices, table: "ErpService", shape: "array", idField: "id" },
];

// ---- per-user satellites → tables (1:1 and 1:N; die with the user) ---------
// Reached by explicit key builder per user id, not by SCAN, because their shape
// is known and each is exactly one key. `via(userId)` returns the Redis key.
export const USER_SATELLITES = [
  { via: U.profile, table: "UserProfile", shape: "object", ownerField: "UserId" },
  { via: U.verification, table: "UserVerification", shape: "object", ownerField: "UserId" },
  { via: U.questionnaire, table: "UserQuestionnaire", shape: "object", ownerField: "UserId" },
  { via: U.devices, table: "UserDevice", shape: "array", ownerField: "UserId", idField: "id" },
  { via: U.studioVisits, table: "StudioVisit", shape: "map", ownerField: "UserId", keyName: "StudioId", valueName: "Visits" },
];

// ---- per-studio, studio-level collections → tables -------------------------
// These live directly under s:<id>:* rather than under a section.
export const STUDIO_LEVEL = [
  { via: S.collaborators, table: "Collaborator", idField: "id" },
  { via: S.sections, table: "Section", idField: "id" },
  { via: S.roles, table: "Role", idField: "id" },
  { via: S.notifications, table: "Notification", idField: "id" },
];

// ---- operational collection name → SQL table -------------------------------
// One entry per collection named in SECTION_COLLECTIONS (keys.ts). Pascal-cased,
// singular, matching the doc's table list §2.3. A collection missing here is a
// hard error at startup, not a silent skip — a new collection must be mapped on
// purpose, the same rule keys.ts enforces for new key builders.
export const COLLECTION_TABLE = {
  salesTickets: "SalesTicket",
  salesClients: "SalesClient",
  salesServices: "SalesService",
  generatedDocuments: "GeneratedDocument",
  quotations: "Quotation",
  rfqs: "Rfq",
  projects: "Project",
  slas: "Sla",
  overtimes: "Overtime",
  deliveries: "Delivery",
  inventoryStock: "InventoryStock",
  inventoryVendors: "InventoryVendor",
  inventoryItems: "InventoryItem",
  projectSheets: "ProjectSheet",
  materialOrders: "MaterialOrder",
  awbShipments: "AwbShipment",
  awbAirlines: "AwbAirline",
  vacations: "Vacation",
  certifications: "Certification",
  invoices: "Invoice",
  expenses: "Expense",
  accounts: "Account",
  journalEntries: "JournalEntry",
  bills: "Bill",
  fixedAssets: "FixedAsset",
  locations: "Location",
  permits: "Permit",
  shifts: "Shift",
  trackingPositions: "TrackingPosition",
  tasks: "Task",
  qualityDocuments: "QualityDocument",
  qualityTypes: "QualityType",
  qualityRevisions: "QualityRevision",
  qualityAudit: "QualityAudit",
  qualityAcknowledgements: "QualityAcknowledgement",
};

// The three nested arrays the doc promotes to child tables (§2.3). A parent row
// carrying one of these fields emits one child row per element, the child
// pointing back at the parent's (verbatim) id. Anything not listed here stays as
// JSON on the parent — the promotion is reserved for the arrays that grow without
// bound and that people want to filter and total.
export const CHILD_ARRAYS = {
  quotations: [{ field: "lines", table: "QuotationLine", parentRef: "QuotationId" }],
  invoices: [{ field: "lines", table: "InvoiceLine", parentRef: "InvoiceId" }],
  projectSheets: [{ field: "rows", table: "SheetRow", parentRef: "SheetId" }],
};

// The flat set of every operational collection name, from the single source of
// truth in keys.ts. Used to (a) assert COLLECTION_TABLE is complete and (b) match
// a scanned key back to its collection.
export const ALL_COLLECTIONS = [...new Set(Object.values(SECTION_COLLECTIONS).flat())];

// Fail loudly at import if a collection has no table — the "a new literal is the
// third incident" rule from CLAUDE.md, applied to the migration map.
const unmapped = ALL_COLLECTIONS.filter((c) => !COLLECTION_TABLE[c]);
if (unmapped.length) {
  throw new Error(
    `migrate/mapping: no SQL table for collection(s): ${unmapped.join(", ")}. ` +
      "Add them to COLLECTION_TABLE (and docs/database-migration-mssql.md §2.3) — do not skip silently.",
  );
}
