# P0 — The 15-section restructure · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the product from 12 departments to the blueprint's 15 sections (plus Main and Tasks), on the current Redis store, without losing a single grant or a single record.

**Architecture:** Three namespaces change and they cost wildly different amounts, which is what shapes every task below. **Section keys** are a field on the section row — records point at `sectionId`, a minted ULID, so a rename never touches a record. **Permission keys** are stored as literal strings inside every role's `permissions` array, so a rename without a migration silently strips every grant. **Labels** are pure display. On top of those, five bodies of data genuinely change owner and have their `sectionId` reassigned.

**Tech Stack:** TypeScript · Redis (unchanged in this phase) · the existing `tests/` suites · `scripts/migrate/`

**Spec:** `docs/superpowers/specs/2026-08-30-erp-multi-industry-program-design.md` (§4 P0)

**This is the only phase permitted to move the goldens.** P1 inherits the baseline P0 leaves and must not move it.

---

## Global Constraints

- **Keys are built only in `src/platform/db/keys.ts`** (invariant 1). The restructure map is a new module beside it; never a literal at a call site.
- **Membership authorises; the URL never does** (invariant 2). New sections change nothing about that.
- **Default deny** (invariant 4). This is why Task 3 exists: an unmigrated grant does not degrade, it disappears.
- **Nobody grants what they do not hold** — `escalates()`, both doors (invariant 5).
- **A right nothing can exercise is a bug** (invariant 16). New sections get permission keys only when a screen enforces them; the empty ones (`manufacturing`, `reports`) get **no keys at all** in P0.
- **Writes go through `editArr`/`editJSON`** (invariant 8). The migration scripts are no exception.
- **No database is destroyed without two confirmations** (invariant 17). P0 renames and reassigns; it deletes nothing. Export first, act by explicit list, re-scan to prove.
- **`docs/functionality/*.md` updated in the same commit** as any behaviour change.
- Commit subjects are declarative sentences describing the state after the change.
- **Arabic is not optional.** Every new and renamed section needs its `src/shared/studio/sections.ts` entry in the same commit as the rename, or an Arabic studio shows English sidebar rows.
- `NOMPANY_RECORD_GOLDENS` is set **exactly once**, in Task 9, and never again.

**Verification command set, run at every commit:**

```bash
NOMPANY_TEST_SESSION=p0 npm test
```

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build
```

---

## File Structure

| File | Responsibility |
|---|---|
| `src/platform/db/restructure.ts` | **Create.** The map, as data: `SECTION_KEY_MAP`, `PERMISSION_KEY_MAP`, `COLLECTION_MOVES`. Pure, no Redis. The single source both the code sweep and the data migration read. |
| `src/platform/db/keys.ts` | **Modify.** `SECTION_DEFS` becomes the 17 roots; `SECTION_COLLECTIONS` re-keyed. |
| `src/platform/access/catalogue.ts` | **Modify.** Area keys and groups renamed; new sections' areas added. |
| `src/platform/access/resolve.ts` | **Modify.** Reads a stored permission through the alias map, so a role written before the rename still resolves. |
| `src/platform/engagement/registry.ts` | **Modify.** Each stage's `sectionKey` and `permission` follow the map. |
| `src/shared/studio/sections.ts` | **Modify.** English and Arabic names for all 17 roots and their children. |
| `scripts/migrate/restructure-sections.mjs` | **Create.** Renames section-row keys, plants new sections, rewrites role permission arrays, reassigns the five moved collections. Idempotent. |
| `scripts/migrate/restructure-verify.mjs` | **Create.** Read-only proof: no retired key survives, no role lost a grant, no record is orphaned. |
| `tests/restructure.mjs` | **Create.** Unit tests for the map, plus the architectural assertion that no retired key survives anywhere in `src/`. |
| `tests/suite.mjs` | **Modify.** Register the new suite. |
| `docs/functionality/sections.md` | **Create.** What the 15 sections are and which own what. |

---

## Task 1: The map, as data

**Files:**
- Create: `src/platform/db/restructure.ts`, `tests/restructure.mjs`
- Modify: `tests/suite.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `SECTION_KEY_MAP: Record<string, string>`, `PERMISSION_KEY_MAP: Record<string, string>`, `COLLECTION_MOVES: { collection: string; from: string; to: string }[]`, and the helpers `mapSectionKey(old: string): string` and `mapPermissionKey(old: string): string`. Every later task reads these and hardcodes nothing.

**Why the map is data:** the same map has to drive four different things — the code sweep, the section-row rename, the role rewrite, and the verification. Four hand-maintained copies is how one of them drifts, and the one that drifts is the one that silently drops a grant.

- [ ] **Step 1: Write the failing test**

Create `tests/restructure.mjs`:

```js
import {
  SECTION_KEY_MAP, PERMISSION_KEY_MAP, COLLECTION_MOVES,
  mapSectionKey, mapPermissionKey,
} from "../src/platform/db/restructure.ts";
import { SECTION_DEFS, ALL_SECTION_KEYS } from "../src/platform/db/keys.ts";
import { AREAS } from "../src/platform/access/index.ts";

export async function testEveryOldSectionKeyIsAccountedFor(t) {
  // The twelve departments' keys as they stand before the rename. Every one must
  // map somewhere — a key that maps nowhere is a section whose records nobody
  // has decided the fate of.
  const before = [
    "main", "sales", "sales-tickets", "sales-clients", "sales-live", "sales-settings",
    "technical", "technical-quotations", "technical-rfq", "technical-live", "technical-settings",
    "projects", "projects-list", "projects-sla", "projects-overtimes", "projects-settings",
    "inventory", "inventory-stock", "inventory-vendors", "inventory-items", "inventory-sheets", "inventory-awb",
    "hr", "hr-employees",
    "finance", "finance-cash", "finance-ledger", "finance-payables", "finance-assets", "finance-settings",
    "operations", "operations-schedule", "operations-tracking", "operations-planner", "operations-settings",
    "quality", "quality-documents",
    "tasks", "tasks-settings",
  ];
  for (const key of before) {
    t.equal(typeof mapSectionKey(key), "string", `${key} maps somewhere`);
    t.equal(mapSectionKey(key).length > 0, true, `${key} maps to a real key`);
  }
}

export async function testEveryMappedTargetActuallyExists(t) {
  // A map that points at a key SECTION_DEFS does not define is a section that
  // renders nowhere and a grant nobody can hold.
  for (const [from, to] of Object.entries(SECTION_KEY_MAP)) {
    t.equal(ALL_SECTION_KEYS.includes(to), true, `${from} -> ${to} exists in SECTION_DEFS`);
  }
}

export async function testEveryMappedPermissionTargetIsARealArea(t) {
  const areaKeys = new Set(AREAS.map((a) => a.key));
  for (const [from, to] of Object.entries(PERMISSION_KEY_MAP)) {
    const area = to.split(".").slice(0, -1).join(".");
    t.equal(areaKeys.has(area) || areaKeys.has(to), true, `${from} -> ${to} names a real area`);
  }
}

export async function testMapIsIdempotent(t) {
  // Running the migration twice must be safe, so a key that has ALREADY been
  // renamed maps to itself rather than to nothing.
  for (const to of Object.values(SECTION_KEY_MAP)) {
    t.equal(mapSectionKey(to), to, `${to} maps to itself`);
  }
}

export async function testTheFiveMovesAreDeclared(t) {
  const moved = COLLECTION_MOVES.map((m) => m.collection).sort();
  t.equal(
    moved.join(","),
    ["awbAirlines", "awbShipments", "generatedDocuments", "locations", "permits",
     "plans", "qualityAcknowledgements", "qualityAudit", "qualityDocuments",
     "qualityRevisions", "qualityTypes", "quotations"].sort().join(","),
    "every collection that changes owner is declared",
  );
}

export async function testNoRetiredSectionKeySurvivesInSource(t) {
  // THE ARCHITECTURAL ASSERTION. A literal "sales-tickets" left behind in a
  // module looks up a section that no longer exists, and getSectionByKey returns
  // null — which every call site reads as "no section", i.e. an empty screen
  // with no error. Grep is the only thing that finds these.
  const { execSync } = await import("node:child_process");
  const retired = Object.keys(SECTION_KEY_MAP).filter((k) => SECTION_KEY_MAP[k] !== k);
  for (const key of retired) {
    const hits = execSync(
      `git grep -l -- '"${key}"' src || true`, { encoding: "utf8" },
    ).trim();
    t.equal(hits, "", `no source file still names the retired key "${key}"\n${hits}`);
  }
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs`
Expected: FAIL — `Cannot find module '../src/platform/db/restructure.ts'`.

- [ ] **Step 3: Write the map**

Create `src/platform/db/restructure.ts`:

```ts
// THE 12 → 15 RESTRUCTURE, AS DATA.
//
// The same map has to drive four separate things: the source sweep, the
// section-row rename, the rewrite of every role's stored permission array, and
// the verification that proves all three. Four hand-maintained copies is how one
// of them drifts, and the one that drifts is the one that quietly drops a grant
// — which, under default deny (invariant 4), is a person locked out with no
// error anywhere.
//
// IDEMPOTENT BY CONSTRUCTION: every target maps to itself, so the migration can
// be re-run and a half-finished run can be finished.

// ---- sections --------------------------------------------------------------
// A SECTION KEY RENAME DOES NOT TOUCH A SINGLE RECORD, and it is worth knowing
// why before reading the list: rows carry `sectionId` — a minted ULID on the
// section ROW — not the key. So renaming is one field per studio, and the
// expensive-looking half of this restructure is the cheap half. The expensive
// half is PERMISSION_KEY_MAP below.
export const SECTION_KEY_MAP: Record<string, string> = {
  // Main and Tasks survive the blueprint's fifteen. Main is the home surface and
  // Tasks is a cross-cutting control (the `task` type wraps every stage), so
  // neither is a blueprint section and neither is renamed.
  main: "main",
  tasks: "tasks",
  "tasks-settings": "tasks-settings",

  // Sales becomes CRM & Sales and GAINS quotations (blueprint §3.1).
  sales: "crm-sales",
  "sales-tickets": "crm-sales-tickets",
  "sales-clients": "crm-sales-clients",
  "sales-live": "crm-sales-live",
  "sales-settings": "crm-sales-settings",
  "technical-quotations": "crm-sales-quotations",

  // Technical becomes Engineering & Documents and gains the controlled-document
  // register from Quality (blueprint §3.4 owns document records; §3.11 keeps
  // inspections, NCR, audits, incidents and permits).
  technical: "engineering-docs",
  "technical-rfq": "engineering-docs-rfq",
  "technical-live": "engineering-docs-live",
  "technical-settings": "engineering-docs-settings",
  "quality-documents": "engineering-docs-register",

  // Projects keeps its key and gains the planner, which is project scheduling
  // and was only ever in Operations because that is where it was built.
  projects: "projects",
  "projects-list": "projects-list",
  "projects-sla": "projects-sla",
  "projects-overtimes": "projects-overtimes",
  "projects-settings": "projects-settings",
  "operations-planner": "projects-planner",

  // Inventory keeps its key; its label widens to Inventory & Warehouse. Vendors
  // and material orders move to Procurement, which is where buying lives.
  inventory: "inventory",
  "inventory-stock": "inventory-stock",
  "inventory-items": "inventory-items",
  "inventory-sheets": "inventory-sheets",
  "inventory-vendors": "procurement-suppliers",

  // AWB is goods in movement, which is Logistics (blueprint §3.9).
  "inventory-awb": "logistics-shipments",

  // Operations splits. What remains of it IS field service: the rota that
  // dispatches crews and the tracking that follows them.
  operations: "field-service",
  "operations-schedule": "field-service-schedule",
  "operations-tracking": "field-service-tracking",
  "operations-settings": "field-service-settings",

  // Quality widens to Quality & HSE. Permits to work were an Operations tab and
  // are a QHSE register (blueprint §3.11).
  quality: "quality-hse",

  // HR and Finance keep their keys; only their labels widen.
  hr: "hr",
  "hr-employees": "hr-employees",
  finance: "finance",
  "finance-cash": "finance-cash",
  "finance-ledger": "finance-ledger",
  "finance-payables": "finance-payables",
  "finance-assets": "finance-assets",
  "finance-settings": "finance-settings",
};

// ---- permissions -----------------------------------------------------------
// THE DANGEROUS HALF. A role stores `permissions: string[]` of literal keys, and
// cleanPermissions DROPS keys it does not recognise. So renaming an area without
// rewriting every stored role does not fail loudly — it silently empties the
// role, and default deny turns that into a studio where nobody can open
// anything and no error is logged anywhere. resolve.ts therefore reads through
// this map (Task 3) BEFORE the rename lands, so an unmigrated role keeps working
// either way.
export const PERMISSION_KEY_MAP: Record<string, string> = {
  "sales.tickets": "crmSales.tickets",
  "sales.clients": "crmSales.clients",
  "sales.live": "crmSales.live",
  "sales.settings": "crmSales.settings",
  "sales.dashboard": "crmSales.dashboard",
  "technical.quotations": "crmSales.quotations",
  "technical.rfq": "engineeringDocs.rfq",
  "technical.live": "engineeringDocs.live",
  "technical.settings": "engineeringDocs.settings",
  "technical.dashboard": "engineeringDocs.dashboard",
  "quality.documents": "engineeringDocs.register",
  "quality.dashboard": "qualityHse.dashboard",
  "operations.planner": "projects.planner",
  "operations.schedule": "fieldService.schedule",
  "operations.tracking": "fieldService.tracking",
  "operations.settings": "fieldService.settings",
  "operations.dashboard": "fieldService.dashboard",
  "inventory.vendors": "procurement.suppliers",
  "inventory.awb": "logistics.shipments",
  // Unchanged areas are listed so the map is total and mapPermissionKey never
  // has to guess. Omitting them would make "not in the map" ambiguous between
  // "unchanged" and "forgotten".
  "inventory.stock": "inventory.stock",
  "inventory.items": "inventory.items",
  "inventory.sheets": "inventory.sheets",
  "inventory.dashboard": "inventory.dashboard",
  "projects.list": "projects.list",
  "projects.sla": "projects.sla",
  "projects.overtimes": "projects.overtimes",
  "projects.settings": "projects.settings",
  "projects.dashboard": "projects.dashboard",
  "hr.employees": "hr.employees",
  "hr.vacations": "hr.vacations",
  "hr.dashboard": "hr.dashboard",
  "finance.cash": "finance.cash",
  "finance.ledger": "finance.ledger",
  "finance.payables": "finance.payables",
  "finance.assets": "finance.assets",
  "finance.settings": "finance.settings",
  "finance.dashboard": "finance.dashboard",
  "tasks.board": "tasks.board",
  "tasks.settings": "tasks.settings",
  "people.members": "administration.members",
  "studio.settings": "administration.settings",
};

// ---- collections that change owner -----------------------------------------
// THE ONLY PART OF P0 THAT REWRITES RECORDS. Each of these rows carries a
// `sectionId` pointing at the section it currently belongs to; a move rewrites
// that one field to the new section's id. `from` and `to` are section KEYS; the
// migration resolves them to ids per studio.
export const COLLECTION_MOVES: { collection: string; from: string; to: string }[] = [
  { collection: "quotations",              from: "technical-quotations", to: "crm-sales-quotations" },
  { collection: "generatedDocuments",      from: "technical-quotations", to: "crm-sales-quotations" },
  { collection: "qualityDocuments",        from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "qualityTypes",            from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "qualityRevisions",        from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "qualityAudit",            from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "qualityAcknowledgements", from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "awbShipments",            from: "inventory-awb",        to: "logistics-shipments" },
  { collection: "awbAirlines",             from: "inventory-awb",        to: "logistics-shipments" },
  { collection: "plans",                   from: "operations-planner",   to: "projects-planner" },
  { collection: "permits",                 from: "operations",           to: "quality-hse" },
  { collection: "locations",               from: "operations",           to: "administration" },
];

const selfMap = (m: Record<string, string>) => {
  // Every target maps to itself, which is what makes a re-run safe and a
  // half-finished run finishable.
  const out = { ...m };
  for (const to of Object.values(m)) out[to] = to;
  return out;
};

const SECTIONS_TOTAL = selfMap(SECTION_KEY_MAP);
const PERMISSIONS_TOTAL = selfMap(PERMISSION_KEY_MAP);

export const mapSectionKey = (key: string): string => SECTIONS_TOTAL[key] ?? key;

/** Maps a stored permission key, verb suffix and all: `sales.tickets.view`. */
export const mapPermissionKey = (key: string): string => {
  if (PERMISSIONS_TOTAL[key]) return PERMISSIONS_TOTAL[key];
  const cut = key.lastIndexOf(".");
  if (cut < 0) return key;
  const area = key.slice(0, cut), verb = key.slice(cut + 1);
  const mapped = PERMISSIONS_TOTAL[area];
  return mapped ? `${mapped}.${verb}` : key;
};
```

- [ ] **Step 4: Register the suite**

Add `restructure.mjs` to the list in `tests/suite.mjs`, following the shape the `engagement-*.mjs` entries already use.

- [ ] **Step 5: Run the tests**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs`
Expected: the first four PASS. `testEveryMappedTargetActuallyExists`, `testEveryMappedPermissionTargetIsARealArea` and `testNoRetiredSectionKeySurvivesInSource` FAIL — `SECTION_DEFS` and the catalogue have not moved yet, and the source sweep has not happened. **Leave them failing; Tasks 2, 4 and 5 turn them green.** Record in the commit message that three cases are red by design.

- [ ] **Step 6: Commit**

```bash
git add src/platform/db/restructure.ts tests/restructure.mjs tests/suite.mjs
git commit -m "The restructure is written down as one map, and three assertions wait for it"
```

---

## Task 2: SECTION_DEFS becomes seventeen roots

**Files:**
- Modify: `src/platform/db/keys.ts` (`SECTION_DEFS`, `SECTION_COLLECTIONS`)

**Interfaces:**
- Consumes: nothing at runtime — this task is data.
- Produces: `SECTION_DEFS` with 17 roots; `SECTION_COLLECTIONS` re-keyed by the new section keys. `ALL_SECTION_KEYS` follows automatically.

**A section gets no children in P0 unless a screen exists.** `manufacturing` and `reports` are declared as roots with no children and no permission areas, because a right nothing can exercise is a bug (invariant 16) and a nav row that opens nothing is worse than an absent one. They become real in P6 and P7.

- [ ] **Step 1: Rewrite SECTION_DEFS**

Replace the `SECTION_DEFS` array in `src/platform/db/keys.ts` with the 17 roots. Preserve the existing comments that explain *why* a child exists (the `finance-cash` rename warning, the HR note about Users/Careers, the Quality full-screen note) — move each comment to wherever its subject now lives. Add new comments only where a decision was made:

```ts
export const SECTION_DEFS = [
  { key: "main", name: "Main" },

  // SALES BECAME CRM & SALES AND GAINED QUOTATIONS. The blueprint puts the
  // quotation in §3.1 because the offer is a sales act; Tendering contributes
  // its BOQ face in P4a, on the same record.
  { key: "crm-sales", name: "CRM & Sales", children: [
    { key: "crm-sales-tickets", name: "Tickets" },
    { key: "crm-sales-clients", name: "Customers" },
    { key: "crm-sales-quotations", name: "Quotations" },
    { key: "crm-sales-live", name: "Live view" },
    { key: "crm-sales-settings", name: "Settings" },
  ] },

  // NO CHILDREN YET, AND THAT IS DELIBERATE. Tendering's five subsections land
  // in P4a. A nav row that opens nothing is worse than an absent one, so this
  // root is declared for ordering and nothing else until then.
  { key: "tendering", name: "Tendering & Estimating" },

  { key: "projects", name: "Projects", children: [
    { key: "projects-list", name: "Project list" },
    { key: "projects-sla", name: "SLA" },
    { key: "projects-overtimes", name: "Overtimes" },
    // The planner is project scheduling. It sat under Operations only because
    // that is where it was built.
    { key: "projects-planner", name: "Planner" },
    { key: "projects-settings", name: "Settings" },
  ] },

  // TECHNICAL BECAME ENGINEERING & DOCUMENTS AND GAINED THE CONTROLLED REGISTER.
  // The blueprint's §3.4 owns document records; §3.11 keeps inspections, NCRs,
  // audits, incidents and permits. The register is the technical truth, not the
  // quality evidence.
  { key: "engineering-docs", name: "Engineering & Documents", children: [
    { key: "engineering-docs-register", name: "Document register" },
    { key: "engineering-docs-rfq", name: "RFQ" },
    { key: "engineering-docs-live", name: "Live view" },
    { key: "engineering-docs-settings", name: "Settings" },
  ] },

  // Procurement starts with the supplier master, which is the one part of it
  // that already exists — it was Inventory's Vendors screen.
  { key: "procurement", name: "Procurement & Subcontracting", children: [
    { key: "procurement-suppliers", name: "Suppliers" },
  ] },

  { key: "inventory", name: "Inventory & Warehouse", children: [
    { key: "inventory-stock", name: "Stock" },
    { key: "inventory-items", name: "Items" },
    { key: "inventory-sheets", name: "Project sheets" },
  ] },

  { key: "manufacturing", name: "Manufacturing & Production" },

  // WHAT REMAINS OF OPERATIONS IS FIELD SERVICE: the rota that dispatches crews
  // and the tracking that follows them. The planner went to Projects, permits to
  // Quality & HSE, locations to Administration.
  { key: "field-service", name: "Field Operations & Service", children: [
    { key: "field-service-schedule", name: "Schedule" },
    { key: "field-service-tracking", name: "Tracking" },
    { key: "field-service-settings", name: "Settings" },
  ] },

  { key: "logistics", name: "Logistics & Fleet", children: [
    { key: "logistics-shipments", name: "Shipments" },
  ] },

  { key: "assets", name: "Assets & Equipment" },

  // Quality widens to Quality & HSE. It keeps permits to work, which were an
  // Operations tab and are a QHSE register.
  { key: "quality-hse", name: "Quality & HSE" },

  { key: "hr", name: "Human Resources", children: [
    { key: "hr-employees", name: "Employees" },
  ] },

  { key: "finance", name: "Finance & Accounting", children: [
    // finance-cash is deliberately NOT renamed. Every existing invoice and
    // expense carries its SectionID, and while a key rename does not orphan a
    // record, the name is still what the drill-down and the insights read.
    { key: "finance-cash", name: "Cash" },
    { key: "finance-ledger", name: "Ledger" },
    { key: "finance-payables", name: "Payables" },
    { key: "finance-assets", name: "Fixed assets" },
    { key: "finance-settings", name: "Settings" },
  ] },

  { key: "reports", name: "Reports & BI" },

  // Administration absorbs People and Access, which were screens without
  // sections, plus the master data that used to be Operations' locations tab.
  { key: "administration", name: "Administration & Settings", children: [
    { key: "administration-members", name: "People" },
    { key: "administration-master", name: "Master data" },
    { key: "administration-settings", name: "Studio settings" },
  ] },

  { key: "tasks", name: "Tasks", children: [
    { key: "tasks-settings", name: "Task settings" },
  ] },
];
```

- [ ] **Step 2: Re-key SECTION_COLLECTIONS**

Rewrite every key of `SECTION_COLLECTIONS` through `SECTION_KEY_MAP`, keeping each existing comment with its collection. The moved collections land under their new owners:

```ts
export const SECTION_COLLECTIONS = {
  "crm-sales-tickets": ["salesTickets"],
  "crm-sales-clients": ["salesClients"],
  // The quotation's generated documents travel WITH the quotation — the
  // filled-in thing belongs to the record it is about; Quality owns the blank.
  "crm-sales-quotations": ["quotations", "generatedDocuments"],
  "engineering-docs-rfq": ["rfqs"],
  "engineering-docs-register": ["qualityDocuments", "qualityTypes", "qualityRevisions",
    "qualityAudit", "qualityAcknowledgements"],
  "projects-list": ["projects"],
  "projects-sla": ["slas"],
  "projects-overtimes": ["overtimes"],
  "projects-planner": ["plans"],
  "procurement-suppliers": ["inventoryVendors"],
  inventory: ["deliveries"],
  "inventory-stock": ["inventoryStock"],
  "inventory-items": ["inventoryItems"],
  "inventory-sheets": ["projectSheets", "materialOrders"],
  "logistics-shipments": ["awbShipments", "awbAirlines"],
  hr: ["vacations"],
  "hr-employees": ["certifications"],
  "finance-cash": ["invoices", "expenses"],
  "finance-ledger": ["accounts", "journalEntries"],
  "finance-payables": ["bills"],
  "finance-assets": ["fixedAssets"],
  "field-service": ["shifts"],
  "field-service-tracking": ["trackingPositions"],
  "quality-hse": ["permits"],
  administration: ["locations"],
  tasks: ["tasks"],
};
```

- [ ] **Step 3: Run the map tests**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs`
Expected: `testEveryMappedTargetActuallyExists` now PASSES. The permission and source-sweep cases still fail.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: many errors, all of them literal section keys in modules that Task 5 sweeps. **Do not fix them here** — record the count and move on; Task 5 is where they go.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/keys.ts
git commit -m "There are fifteen sections, and two that are not sections"
```

---

## Task 3: Permissions resolve through the map, before anything is renamed

**Files:**
- Modify: `src/platform/access/resolve.ts`
- Test: `tests/restructure.mjs`, `tests/access.test.mjs`

**Interfaces:**
- Consumes: `mapPermissionKey` from Task 1.
- Produces: `effectivePermissions` returning the mapped key set regardless of which vintage of key a role has stored.

**This is the task that prevents the lockout.** A role stores literal permission strings. `cleanPermissions` drops unrecognised ones. Rename the areas without this, and every studio's roles empty themselves, default deny takes over, and nobody can open anything — with no error logged, because nothing failed. The alias goes in **first**, so both vintages resolve, and the data migration in Task 7 becomes a tidy-up rather than a cliff.

- [ ] **Step 1: Write the failing test**

Add to `tests/restructure.mjs`:

```js
import { effectivePermissions } from "../src/platform/access/resolve.ts";

export async function testAnOldStoredGrantStillResolves(t) {
  // A role written before the rename holds "sales.tickets.view". After the
  // rename the area is "crmSales.tickets". The person must still get in.
  const roles = [{ id: "r1", permissions: ["sales.tickets.view", "sales.tickets.create"], scopes: {} }];
  const eff = effectivePermissions({ roleIds: ["r1"] }, roles);
  t.equal(eff.has("crmSales.tickets.view"), true, "an old grant resolves to the new key");
  t.equal(eff.has("crmSales.tickets.create"), true, "every verb carries across");
}

export async function testANewStoredGrantResolvesUnchanged(t) {
  const roles = [{ id: "r1", permissions: ["crmSales.tickets.view"], scopes: {} }];
  const eff = effectivePermissions({ roleIds: ["r1"] }, roles);
  t.equal(eff.has("crmSales.tickets.view"), true, "a new grant resolves to itself");
}

export async function testAnUnknownGrantStillGrantsNothing(t) {
  // The alias must not become a hole. A key that maps to nothing maps to itself,
  // and a key nothing recognises still grants nothing (invariant 4).
  const roles = [{ id: "r1", permissions: ["nonsense.area.view"], scopes: {} }];
  const eff = effectivePermissions({ roleIds: ["r1"] }, roles);
  t.equal(eff.has("crmSales.tickets.view"), false, "nonsense grants nothing");
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs`
Expected: FAIL — `crmSales.tickets.view` is not in the set.

- [ ] **Step 3: Map on the way in**

In `src/platform/access/resolve.ts`, where a role's stored `permissions` array is folded into the effective set, pass each key through `mapPermissionKey` first. Add the comment explaining why:

```ts
// STORED GRANTS ARE READ THROUGH THE RESTRUCTURE MAP, and this is not
// belt-and-braces. A role stores literal permission strings; the P0 restructure
// renames the areas those strings name; and cleanPermissions DROPS keys it does
// not recognise. Without this line, the rename empties every role in every
// studio, default deny (invariant 4) takes over, and nobody can open anything —
// with nothing logged, because nothing failed.
//
// It stays after the data migration too. A role exported before the rename and
// re-imported after it is the same problem arriving later, and one map lookup is
// cheaper than the incident.
const granted = new Set(role.permissions.map(mapPermissionKey));
```

- [ ] **Step 4: Run the tests**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs`
Expected: all three PASS.

- [ ] **Step 5: Run the access suite — the 102-key matrix must be intact**

Run: `NOMPANY_TEST_SESSION=p0 node tests/access.test.mjs`
Expected: PASS. This suite is the permission matrix; a regression here is a security regression.

- [ ] **Step 6: Commit**

```bash
git add src/platform/access/resolve.ts tests/restructure.mjs
git commit -m "A grant written before the restructure still opens the door"
```

---

## Task 4: The permission catalogue moves

**Files:**
- Modify: `src/platform/access/catalogue.ts`
- Test: `tests/access.test.mjs`, `tests/restructure.mjs`

**Interfaces:**
- Consumes: nothing at runtime.
- Produces: `AREAS` keyed by the new area names, grouped by the new section labels; `PermissionKey` union follows.

**No new rights for empty sections.** `manufacturing`, `tendering`, `assets`, `reports` get **no areas** in P0. `administration` gets areas only for the screens that already exist (members, studio settings) plus `administration.master` for the locations screen that moves into it.

- [ ] **Step 1: Write the failing test**

Add to `tests/restructure.mjs`:

```js
export async function testNoAreaExistsForASectionWithNoScreen(t) {
  // A right nothing can exercise is a bug (invariant 16). These four sections
  // are declared for ordering and have no screens until P4a/P5/P6/P7.
  const empty = ["tendering", "manufacturing", "assets", "reports"];
  for (const key of empty) {
    const found = AREAS.filter((a) => a.key.startsWith(`${key}.`));
    t.equal(found.length, 0, `${key} has no rights yet: ${found.map((a) => a.key).join(",")}`);
  }
}

export async function testEveryAreaGroupIsARealSectionLabel(t) {
  const labels = new Set(SECTION_DEFS.map((d) => d.name));
  for (const area of AREAS) {
    t.equal(labels.has(area.group), true, `area ${area.key} is grouped under a real section (${area.group})`);
  }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs`
Expected: FAIL — groups are still "Sales", "Technical", "Operations".

- [ ] **Step 3: Rename the areas and their groups**

In `catalogue.ts`, apply `PERMISSION_KEY_MAP` to every area `key` and update each `group` to the new section label. **Every comment stays** — the reasoning about why `sales.tickets` has no delete, why lock and unlock are separate, why the ledger has no CRUD, why review and approve are two rights. Those comments are the value of this file.

Also update `DASHBOARD_MODULES`, whose tuples supply both the key prefix and the group label:

```ts
const DASHBOARD_MODULES = [
  ["crmSales", "CRM & Sales"], ["engineeringDocs", "Engineering & Documents"],
  ["projects", "Projects"], ["inventory", "Inventory & Warehouse"],
  ["procurement", "Procurement & Subcontracting"], ["hr", "Human Resources"],
  ["finance", "Finance & Accounting"], ["fieldService", "Field Operations & Service"],
  ["logistics", "Logistics & Fleet"], ["qualityHse", "Quality & HSE"],
] as const;
```

- [ ] **Step 4: Run both suites**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs && NOMPANY_TEST_SESSION=p0 node tests/access.test.mjs`
Expected: the two new cases PASS; the access matrix PASSES (Task 3's alias is what keeps it green).

- [ ] **Step 5: Commit**

```bash
git add src/platform/access/catalogue.ts tests/restructure.mjs
git commit -m "The access grid is grouped by the fifteen sections"
```

---

## Task 5: The source sweep

**Files:**
- Modify: every file `git grep` finds holding a retired section key or permission key (~350 occurrences across ~40 files, per the audit).

**Interfaces:**
- Consumes: `SECTION_KEY_MAP`, `PERMISSION_KEY_MAP`.
- Produces: a source tree in which no retired key appears.

**Mechanical, and dangerous exactly because it is mechanical.** `getSectionByKey` returns `null` for an unknown key, and every call site reads `null` as "no section" — an empty screen with no error. A missed literal therefore ships as a blank page, not as a crash. The architectural assertion from Task 1 is the only thing that finds them, which is why it was written first.

- [ ] **Step 1: List the work**

```bash
git grep -c -E '"(sales|technical|operations)(-[a-z]+)?"|"(sales|technical|operations|quality)\.[a-z]+' -- src | sort -t: -k2 -rn
```

Record the file list and the total. It is the checklist for this task.

- [ ] **Step 2: Sweep, file by file, in this order**

Order matters — later files import earlier ones, so a wrong rename surfaces at the import rather than three layers down:

1. `src/platform/engagement/registry.ts` — each stage's `sectionKey` and `permission`.
2. `src/platform/relations.ts`
3. `src/platform/db/cascade.ts`
4. `src/modules/*/**` — the thirteen module folders.
5. `src/components/**` and `src/app/**`.
6. `src/shared/studio/insights.ts`

For each file: apply the map, run `npx tsc --noEmit` on the way, and **read the surrounding comment** — several of these keys appear inside comments explaining why a record lives where it does, and those comments are now describing a different arrangement. Update the reason, never delete it.

- [ ] **Step 3: Run the architectural assertion**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs`
Expected: `testNoRetiredSectionKeySurvivesInSource` PASSES. If it names a file, that file is a blank screen waiting to happen — fix it rather than narrowing the assertion.

- [ ] **Step 4: Full typecheck and build**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build`
Expected: clean.

- [ ] **Step 5: Run the whole suite**

Run: `NOMPANY_TEST_SESSION=p0 npm test`
Expected: the access and integration suites PASS. **Gate A's goldens will FAIL** — section keys and names appear in payloads. That is expected and is Task 9's business. Record which goldens moved and confirm each diff is a name or key change and nothing else.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "No source file names a retired section"
```

---

## Task 6: The copy, in both languages

**Files:**
- Modify: `src/shared/studio/sections.ts`
- Create: nothing.

**Interfaces:**
- Consumes: `ALL_SECTION_KEYS`.
- Produces: an English and an Arabic name for all 17 roots and every child.

**An Arabic studio with an English sidebar is what this prevents.** The file's own header records that this was got wrong once, for the reason that section names are *stored* and therefore looked like tenant data. They are not: `SECTION_DEFS` defines them and nothing renames them, so they are code and they translate on display.

- [ ] **Step 1: Write the failing test**

Add to `tests/restructure.mjs`:

```js
import { sectionName } from "../src/shared/studio/sections.ts";
import { ALL_SECTION_KEYS } from "../src/platform/db/keys.ts";

export async function testEverySectionHasAnArabicName(t) {
  for (const key of ALL_SECTION_KEYS) {
    const ar = sectionName(key, "", "ar");
    t.equal(ar.length > 0, true, `${key} has an Arabic name`);
    t.equal(/[A-Za-z]/.test(ar), false, `${key}'s Arabic name is not English text (got "${ar}")`);
  }
}
```

Note the second assertion's exception list: `RFQ`, `SLA`, `AWB`, `BOQ` and `HSE` are initialisms an Arabic speaker says as-is. Add them to a permitted set inside the test rather than weakening the check.

- [ ] **Step 2: Run to verify it fails**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs`
Expected: FAIL — the new and renamed keys fall through to the English fallback.

- [ ] **Step 3: Write the copy**

Update the `ar` map in `src/shared/studio/sections.ts` for all 17 roots and their children. Carry across the existing translations for keys that only changed name, and keep the existing comment about `technical-rfq` staying an initialism — it now applies to `engineering-docs-rfq`.

New roots:

```ts
  "crm-sales": "المبيعات وإدارة العملاء",
  "tendering": "المناقصات والتسعير",
  "engineering-docs": "الهندسة والوثائق",
  "procurement": "المشتريات والمقاولات من الباطن",
  "inventory": "المخزون والمستودعات",
  "manufacturing": "التصنيع والإنتاج",
  "field-service": "العمليات الميدانية والخدمة",
  "logistics": "اللوجستيات والأسطول",
  "assets": "الأصول والمعدات",
  "quality-hse": "الجودة والسلامة",
  "finance": "المالية والمحاسبة",
  "reports": "التقارير وذكاء الأعمال",
  "administration": "الإدارة والإعدادات",
```

- [ ] **Step 4: Run the test**

Run: `NOMPANY_TEST_SESSION=p0 node tests/restructure.mjs`
Expected: PASS.

- [ ] **Step 5: Open an Arabic studio and look at it**

`npx tsc` and `next build` cannot catch a missing translation, and neither can a golden. Start the sandbox, switch to Arabic, and read the sidebar top to bottom.

```bash
npm run dev:sandbox
```

Verify through the browser pane at `localhost:3010/sandbox`: every sidebar row is Arabic, the nav mirrors right-to-left, and no row shows an English fallback.

- [ ] **Step 6: Commit**

```bash
git add src/shared/studio/sections.ts tests/restructure.mjs
git commit -m "Every section says its name in Arabic"
```

---

## Task 7: The data migration

**Files:**
- Create: `scripts/migrate/restructure-sections.mjs`, `scripts/migrate/restructure-verify.mjs`
- Modify: `scripts/migrate/README.md`

**Interfaces:**
- Consumes: `SECTION_KEY_MAP`, `PERMISSION_KEY_MAP`, `COLLECTION_MOVES`, `plantMissingSections`, `editArr`.
- Produces: two CLI scripts. `restructure-verify.mjs` is **read-only**.

**Four things happen per studio, in this order**, and the order is the safety property: sections are planted before anything is moved into them, and roles are rewritten before the old keys stop being aliased.

1. Rename each section row's `key` through the map.
2. Plant the new sections that have no predecessor (`tendering`, `manufacturing`, `assets`, `reports`, `procurement`, `logistics`, `administration` and their children).
3. Rewrite every role's `permissions` array through `mapPermissionKey`.
4. Reassign `sectionId` on the twelve moved collections.

**Nothing is deleted.** No section row is removed, no record is dropped. Invariant 17 applies and the script has no delete path at all.

- [ ] **Step 1: Write the migration script**

```js
// THE RESTRUCTURE, APPLIED. Idempotent — every step maps a target to itself —
// so a half-finished run is finished by re-running it, and a finished run is a
// no-op.
//
// NOTHING HERE DELETES. No section row is removed and no record is dropped:
// invariant 17 governs this file, and the honest way to obey it is to have no
// delete path at all rather than a guarded one.
//
// ORDER IS THE SAFETY PROPERTY. Sections are planted BEFORE anything is moved
// into them, and roles are rewritten BEFORE the alias in resolve.ts stops being
// the only thing keeping people logged in.
import { listStudios } from "../../src/modules/main/studios.ts";
import { listSections, plantMissingSections } from "../../src/platform/db/sections.ts";
import { editArr, readArr } from "../../src/platform/db/store.ts";
import { S, SEC } from "../../src/platform/db/keys.ts";
import {
  SECTION_KEY_MAP, COLLECTION_MOVES, mapSectionKey, mapPermissionKey,
} from "../../src/platform/db/restructure.ts";

const apply = process.argv.includes("--apply");
const say = (...a) => console.log(apply ? "" : "[dry-run]", ...a);

for (const studio of await listStudios()) {
  say(`studio ${studio.slug}`);

  // 1. RENAME. One field on the section row. Records point at sectionId, not at
  //    the key, so not a single record is touched by this step.
  if (apply) {
    await editArr(S.sections(studio.id), (rows) => ({
      next: rows.map((s) => ({ ...s, key: mapSectionKey(s.key) })),
      result: null,
    }));
  }

  // 2. PLANT. The sections with no predecessor. plantMissingSections is already
  //    idempotent and forward-only and re-derives the running order, which is
  //    what puts the new roots where they belong in the nav rather than at the
  //    end.
  if (apply) await plantMissingSections(studio.id);

  const sections = await listSections(studio.id);
  const idOf = (key) => sections.find((s) => s.key === key)?.id || null;

  // 3. ROLES. The dangerous one, and the reason resolve.ts aliases first: a
  //    role stores literal permission strings and cleanPermissions drops what it
  //    does not recognise, so an unmigrated role empties itself and default deny
  //    locks the studio out with nothing logged.
  if (apply) {
    await editArr(S.roles(studio.id), (rows) => ({
      next: rows.map((r) => ({ ...r, permissions: (r.permissions || []).map(mapPermissionKey) })),
      result: null,
    }));
  }

  // 4. MOVE. The only step that rewrites records — `sectionId` on each row of a
  //    collection that changed owner.
  for (const move of COLLECTION_MOVES) {
    const from = idOf(mapSectionKey(move.from)), to = idOf(mapSectionKey(move.to));
    if (!from || !to || from === to) continue;
    const key = SEC.col(studio.id, from, move.collection);
    const rows = await readArr(key);
    if (!rows.length) continue;
    say(`  ${move.collection}: ${rows.length} rows ${move.from} -> ${move.to}`);
    if (!apply) continue;

    const moved = rows.map((r) => ({ ...r, sectionId: to }));
    // Written to the destination first, then the source is emptied — so a crash
    // between the two duplicates rows rather than losing them, and a re-run
    // reconciles. The opposite order loses them.
    await editArr(SEC.col(studio.id, to, move.collection), (cur) => {
      const held = new Set(cur.map((r) => r.id));
      return { next: [...moved.filter((r) => !held.has(r.id)), ...cur], result: null };
    });
    await editArr(key, () => ({ next: [], result: null }));
  }
}
console.log(apply ? "applied" : "dry run complete — re-run with --apply");
process.exit(0);
```

- [ ] **Step 2: Write the read-only verifier**

```js
// THE PROOF, READ-ONLY. Three questions, each of which has a wrong answer that
// is silent: a retired key still on a section row, a role that lost a grant, a
// record pointing at a section that no longer holds its collection.
import { listStudios } from "../../src/modules/main/studios.ts";
import { listSections } from "../../src/platform/db/sections.ts";
import { readArr } from "../../src/platform/db/store.ts";
import { S, SEC, SECTION_COLLECTIONS, ALL_SECTION_KEYS } from "../../src/platform/db/keys.ts";
import { SECTION_KEY_MAP } from "../../src/platform/db/restructure.ts";

const retired = new Set(Object.keys(SECTION_KEY_MAP).filter((k) => SECTION_KEY_MAP[k] !== k));
let bad = 0;

for (const studio of await listStudios()) {
  const sections = await listSections(studio.id);

  for (const s of sections) {
    if (retired.has(s.key)) { bad++; console.error(`RETIRED KEY ${studio.slug}/${s.key}`); }
    if (!ALL_SECTION_KEYS.includes(s.key)) { bad++; console.error(`UNKNOWN KEY ${studio.slug}/${s.key}`); }
  }
  for (const key of ALL_SECTION_KEYS) {
    if (!sections.some((s) => s.key === key)) { bad++; console.error(`MISSING ${studio.slug}/${key}`); }
  }

  const roles = await readArr(S.roles(studio.id));
  for (const r of roles) {
    const empty = (r.permissions || []).length === 0 && r.id !== "role_admin";
    if (empty) { bad++; console.error(`EMPTY ROLE ${studio.slug}/${r.name}`); }
  }

  for (const s of sections) {
    for (const collection of SECTION_COLLECTIONS[s.key] || []) {
      const rows = await readArr(SEC.col(studio.id, s.id, collection));
      for (const row of rows) {
        if (row.sectionId !== s.id) {
          bad++; console.error(`ORPHAN ${studio.slug}/${s.key}/${collection}/${row.id}`);
        }
      }
    }
  }
}
console.log(bad ? `${bad} problems` : "clean");
process.exit(bad ? 1 : 0);
```

- [ ] **Step 3: Dry-run against the test namespace**

```bash
NOMPANY_KEY_PREFIX=test_p0_ node scripts/migrate/restructure-sections.mjs
```

Read the output. Confirm the row counts per move look right before applying anything.

- [ ] **Step 4: Apply and verify against the test namespace**

```bash
NOMPANY_KEY_PREFIX=test_p0_ node scripts/migrate/restructure-sections.mjs --apply
```

```bash
NOMPANY_KEY_PREFIX=test_p0_ node scripts/migrate/restructure-verify.mjs
```

Expected: `clean`.

- [ ] **Step 5: Run it twice to prove idempotence**

```bash
NOMPANY_KEY_PREFIX=test_p0_ node scripts/migrate/restructure-sections.mjs --apply && NOMPANY_KEY_PREFIX=test_p0_ node scripts/migrate/restructure-verify.mjs
```

Expected: `clean` again, with no rows reported as moved the second time.

- [ ] **Step 6: Document the runbook and commit**

```bash
git add scripts/migrate/ && git commit -m "The restructure can be applied and proved, and it deletes nothing"
```

---

## Task 8: The nav and the router

**Files:**
- Modify: `src/app/studio/[[...segments]]/` router, `src/components/studio2/` nav components

**Interfaces:**
- Consumes: the new `SECTION_DEFS` and area keys.
- Produces: a sidebar showing 17 roots in order, and routes that reach every screen at its new path.

**A section with no children and no areas must not render a clickable row.** `sectionViewable` already treats a section with no areas and no viewable children as having nothing to protect — confirm that this makes `tendering`, `manufacturing`, `assets` and `reports` absent rather than present-and-empty.

- [ ] **Step 1: Write the failing test**

Add to `tests/restructure.mjs`:

```js
export async function testEmptySectionsDoNotRender(t) {
  const nav = navFor({ permissions: new Set(["crmSales.tickets.view"]) });
  for (const key of ["tendering", "manufacturing", "assets", "reports"]) {
    t.equal(nav.some((n) => n.key === key), false, `${key} has nothing to open and does not render`);
  }
}

export async function testSectionsRenderInDefOrder(t) {
  const nav = navFor({ permissions: new Set(["*"]) });
  const keys = nav.map((n) => n.key);
  t.equal(keys.indexOf("crm-sales") < keys.indexOf("projects"), true, "CRM & Sales precedes Projects");
  t.equal(keys.indexOf("administration") > keys.indexOf("finance"), true, "Administration is late in the list");
}
```

- [ ] **Step 2: Run to verify it fails, then update the router**

Point every route segment at its new section key. The screens themselves do not change — only which key opens them.

- [ ] **Step 3: Walk every screen in the sandbox**

```bash
npm run dev:sandbox
```

Open all 17 roots and every child in the browser pane. A missed literal from Task 5 shows here as a screen with no data and no error — this walk is what catches what the assertion could not.

- [ ] **Step 4: Commit**

```bash
git add -A src/app src/components tests/restructure.mjs
git commit -m "The sidebar shows fifteen sections, and the empty ones stay quiet"
```

---

## Task 9: Re-record the goldens, once

**Files:**
- Modify: `tests/goldens/**`

**This is the only commit in P0 or P1 that sets `NOMPANY_RECORD_GOLDENS`.** It exists because renamed section keys and names appear in response payloads. Every diff must be a key or a name, and nothing else — a changed shape, a changed order, a changed count is a bug from an earlier task, not a golden to re-record.

- [ ] **Step 1: Run Gate A and capture the diffs**

```bash
NOMPANY_TEST_SESSION=p0 node tests/gate-a.test.mjs > /tmp/p0-golden-diffs.txt 2>&1 || true
```

- [ ] **Step 2: Read every diff**

For each failing golden, confirm the change is a section key or a section name. **Stop and investigate** any diff that changes a field's presence, a key's position, an array's length or a numeric value. Do not proceed until every diff is explained in one sentence.

- [ ] **Step 3: Re-record**

```bash
NOMPANY_RECORD_GOLDENS=1 NOMPANY_TEST_SESSION=p0 node tests/gate-a.test.mjs
```

- [ ] **Step 4: Review the recorded diff before committing**

```bash
git diff --stat tests/goldens
```

```bash
git diff tests/goldens | head -200
```

Confirm the count of changed files matches the count of failures from Step 1.

- [ ] **Step 5: Run everything clean**

```bash
NOMPANY_TEST_SESSION=p0 npm test
```

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build && node scripts/bundle-budget.mjs
```

Expected: all green.

- [ ] **Step 6: Commit alone, with the reason stated**

```bash
git add tests/goldens
git commit -m "The goldens carry the fifteen section names

Re-recorded deliberately and once. Every diff is a section key or a section
name and nothing else; the shapes, orders, counts and values are unchanged,
which is what makes P1's byte-identical requirement meaningful."
```

---

## Task 10: The live migration and the docs

**Requires the user's confirmation twice** before the live run, per invariant 17.

- [ ] **Step 1: Write `docs/functionality/sections.md`**

What the 15 sections are, which stage types and collections each owns, which are declared but empty, and — in words — what is **not built yet**: Tendering, Manufacturing, Assets and Reports have no screens; Procurement holds only the supplier master; Quality & HSE holds only permits.

- [ ] **Step 2: Update `docs/progress.md` and `CLAUDE.md`'s department list**

`CLAUDE.md` names "Twelve departments: Main, Sales, Technical, …". Replace with the 15 sections plus Main and Tasks.

- [ ] **Step 3: Dry-run against live**

```bash
node scripts/migrate/restructure-sections.mjs
```

- [ ] **Step 4: Ask for the first confirmation**

State: which studios, how many roles will be rewritten, how many rows move per collection, and that nothing is deleted. Wait for an explicit yes.

- [ ] **Step 5: Ask for the second confirmation with the exact scope**

Restate the studio count and the per-collection row counts from the dry run's own output. Wait for a second explicit yes.

- [ ] **Step 6: Apply and verify**

```bash
node scripts/migrate/restructure-sections.mjs --apply
```

```bash
node scripts/migrate/restructure-verify.mjs
```

Expected: `clean`.

- [ ] **Step 7: Log in and check a real studio**

Open the live studio, confirm the sidebar, confirm a non-admin role still opens what it opened before. **The role check is the important one** — it is the failure this whole phase was sequenced to avoid.

- [ ] **Step 8: Commit and push**

```bash
git add docs/ CLAUDE.md
git commit -m "The product has fifteen sections"
git push origin main
```

---

## Self-Review

**Spec coverage.** §4 P0's section map → Tasks 1, 2. The five data moves → Task 1's `COLLECTION_MOVES` (twelve collections across five moves) and Task 7 step 4. Permission catalogue remap → Tasks 3, 4. Arabic copy → Task 6. Nav → Task 8. Goldens re-recorded once with a stated reason → Task 9. Invariant 17 procedure → Tasks 7 and 10.

**Two corrections to the spec came out of planning, and both make P0 safer:**
1. The spec says the restructure rewrites "every stored record's `section_id`". It does not — records carry `sectionId`, a ULID on the section row, so a rename touches no record. Only the twelve moved collections are rewritten. The spec's §4 P0 wording needs this.
2. The spec does not mention that roles store literal permission keys. That is P0's one genuinely dangerous move, because `cleanPermissions` drops unknown keys and default deny turns a silent drop into a total lockout. Task 3 puts the alias in **before** the rename lands, which is why Task 3 precedes Task 4.

**Placeholder scan.** None. Every step names its file, its command and its expected output. Task 5 is deliberately a sweep rather than a code listing — the content is ~350 mechanical substitutions driven by a map that Task 1 defines exactly, and the architectural assertion is what proves it complete.

**Type consistency.** `SECTION_KEY_MAP`, `PERMISSION_KEY_MAP`, `COLLECTION_MOVES`, `mapSectionKey`, `mapPermissionKey` are defined in Task 1 and used under those names in Tasks 2, 3, 4, 5, 7. `plantMissingSections`, `listSections`, `editArr`, `readArr`, `S.sections`, `S.roles`, `SEC.col` all match their existing signatures in the codebase.

**One assertion is deliberately red across three tasks.** Task 1 writes `testEveryMappedTargetActuallyExists`, `testEveryMappedPermissionTargetIsARealArea` and `testNoRetiredSectionKeySurvivesInSource` before the code they check exists. Tasks 2, 4 and 5 turn them green in that order. This is intended and is recorded in Task 1 step 5 so a fresh implementer does not "fix" the test.
