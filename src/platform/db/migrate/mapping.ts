// WHAT EACH REDIS COLLECTION BECOMES IN SQL SERVER.
//
// The transcription of docs/database-migration-mssql.md §2 into data the
// extract/emit can drive itself with — declarative on purpose, so a reviewer can
// diff it against §2 line by line. This is the SINGLE source: both the console
// export route and the scripts/migrate CLI import it, so the two cannot drift.
//
// Two kinds of source:
//   • PLATFORM registries  — the g:* documents (users, studios, …). Explicit,
//     because their target tables are relational and hand-shaped in the doc.
//   • OPERATIONAL collections — the 32 section-scoped collections. GENERIC: every
//     one follows the same (Id, StudioId, SectionId, …, Extra) pattern, so they
//     are driven by SECTION_COLLECTIONS + the table-name map rather than 32
//     hand-written column lists. The doc's own escape hatch — "unknown fields land
//     in Extra, a candidate for promotion after cutover" — is what makes the
//     generic path faithful rather than lossy.

import { REG, S, U, SECTION_COLLECTIONS } from "../keys";

export type DocShape = "array" | "map" | "object";

export interface PlatformSpec {
  key: string;
  table: string;
  shape: DocShape;
  idField: string;
}

// `key` is the Redis key (already namespaced by keys.ts); `shape` says how the
// value is laid out — "array" is a JSON array of rows, "map" an object keyed by
// id, "object" a single 1:1 document.
export const PLATFORM: readonly PlatformSpec[] = [
  { key: REG.users, table: "User", shape: "array", idField: "id" },
  { key: REG.studios, table: "Studio", shape: "array", idField: "id" },
  { key: REG.superAdmins, table: "SuperAdmin", shape: "array", idField: "id" },
  { key: REG.joinRequests, table: "JoinRequest", shape: "array", idField: "id" },
  { key: REG.questionnaires, table: "Questionnaire", shape: "array", idField: "id" },
  { key: REG.packages, table: "Package", shape: "array", idField: "id" },
  { key: REG.tiers, table: "Tier", shape: "array", idField: "id" },
  { key: REG.erpServices, table: "ErpService", shape: "array", idField: "id" },
];

export interface SatelliteSpec {
  via: (userId: string) => string;
  table: string;
  shape: DocShape;
  ownerField: string;
  keyName?: string;
  valueName?: string;
}

// Per-user satellites (1:1 and 1:N; die with the user). Reached by explicit key
// builder per user id, not by SCAN, because their shape is known.
export const USER_SATELLITES: readonly SatelliteSpec[] = [
  { via: U.profile, table: "UserProfile", shape: "object", ownerField: "UserId" },
  { via: U.verification, table: "UserVerification", shape: "object", ownerField: "UserId" },
  { via: U.questionnaire, table: "UserQuestionnaire", shape: "object", ownerField: "UserId" },
  { via: U.devices, table: "UserDevice", shape: "array", ownerField: "UserId" },
  { via: U.studioVisits, table: "StudioVisit", shape: "map", ownerField: "UserId", keyName: "StudioId", valueName: "Visits" },
];

export interface StudioLevelSpec {
  via: (studioId: string) => string;
  table: string;
}

// Per-studio, studio-level collections — directly under s:<id>:*, not a section.
export const STUDIO_LEVEL: readonly StudioLevelSpec[] = [
  { via: S.collaborators, table: "Collaborator" },
  { via: S.sections, table: "Section" },
  { via: S.roles, table: "Role" },
  { via: S.notifications, table: "Notification" },
];

// Operational collection name → SQL table (Pascal-cased, singular; doc §2.3). A
// collection missing here is a hard error at startup, not a silent skip — the
// same rule keys.ts enforces for new key builders.
export const COLLECTION_TABLE: Readonly<Record<string, string>> = {
  salesTickets: "SalesTicket",
  salesClients: "SalesClient",
  generatedDocuments: "GeneratedDocument",
  quotations: "Quotation",
  // P2's stage records. Each is a section-scoped collection like every other
  // name here, so it takes the generic (Id, StudioId, SectionId, …, Extra)
  // shape; the guard below is what forced them to be named at all — `contracts`
  // and `changeOrders` reached SECTION_COLLECTIONS before this map and made the
  // import throw, which is the guard doing exactly its job.
  contracts: "Contract",
  changeOrders: "ChangeOrder",
  timesheets: "Timesheet",
  inspections: "Inspection",
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

export interface ChildArraySpec {
  field: string;
  table: string;
  parentRef: string;
}

// The three nested arrays the doc promotes to child tables (§2.3). A parent row
// carrying one of these emits one child row per element, pointing back at the
// parent's verbatim id. Everything else stays JSON on the parent.
export const CHILD_ARRAYS: Readonly<Record<string, readonly ChildArraySpec[]>> = {
  quotations: [{ field: "lines", table: "QuotationLine", parentRef: "QuotationId" }],
  invoices: [{ field: "lines", table: "InvoiceLine", parentRef: "InvoiceId" }],
  projectSheets: [{ field: "rows", table: "SheetRow", parentRef: "SheetId" }],
};

// Every operational collection name, from the single source of truth in keys.ts.
export const ALL_COLLECTIONS: readonly string[] = [...new Set(Object.values(SECTION_COLLECTIONS).flat())];

// Fail loudly at import if a collection has no table — "a new literal is the
// third incident" (CLAUDE.md), applied to the migration map.
const unmapped = ALL_COLLECTIONS.filter((c) => !COLLECTION_TABLE[c]);
if (unmapped.length) {
  throw new Error(
    `db/migrate/mapping: no SQL table for collection(s): ${unmapped.join(", ")}. ` +
      "Add them to COLLECTION_TABLE (and docs/database-migration-mssql.md §2.3) — do not skip silently.",
  );
}
