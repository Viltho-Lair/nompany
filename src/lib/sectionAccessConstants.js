// Client-safe section-access constants + the permission check itself. Split
// out from lib/sectionAccess.js (which needs Node-only db.js for the
// admin-editable overrides) so client components — the sidebar, in
// particular — can import the check without pulling server code into the
// bundle. Mirrors the authConstants.js / auth.js split used elsewhere.

import { ADMIN_TAG } from "@/lib/authConstants";
import { can, ACT, nodeActions } from "@/lib/accessControl";

// Every section defaults to ADMIN-ONLY. Access for everyone else comes from
// granting their DEPARTMENT CODE to a section here (Studio → Settings → Section
// Access). Defaults deliberately list NO capability tag names (e.g. "Technical")
// — those are derived from section access in lib/employeeAuth.js, so listing
// them here would let a derived tag re-grant another section (over-grant).
export const DEFAULT_SECTION_ACCESS = {
  dashboard: [ADMIN_TAG],
  services: [ADMIN_TAG],
  "previous-projects": [ADMIN_TAG],
  gallery: [ADMIN_TAG],
  projects: [ADMIN_TAG],
  "projects-list": [ADMIN_TAG],
  "projects-sla": [ADMIN_TAG],
  "projects-overtimes": [ADMIN_TAG],
  "projects-settings": [ADMIN_TAG],
  careers: [ADMIN_TAG],
  applications: [ADMIN_TAG],
  messages: [ADMIN_TAG],
  reviews: [ADMIN_TAG],
  settings: [ADMIN_TAG],
  "content-statistics": [ADMIN_TAG],
  hr: [ADMIN_TAG],
  employees: [ADMIN_TAG],
  users: [ADMIN_TAG],
  access: [ADMIN_TAG],
  operations: [ADMIN_TAG],
  "operations-settings": [ADMIN_TAG],
  "operations-tracking": [ADMIN_TAG],
  finance: [ADMIN_TAG],
  cash: [ADMIN_TAG],
  "finance-settings": [ADMIN_TAG],
  technical: [ADMIN_TAG],
  "technical-quotations": [ADMIN_TAG],
  "technical-rfq": [ADMIN_TAG],
  "technical-settings": [ADMIN_TAG],
  "technical-live": [ADMIN_TAG],
  sales: [ADMIN_TAG],
  "sales-list": [ADMIN_TAG],
  "sales-clients": [ADMIN_TAG],
  "sales-live": [ADMIN_TAG],
  "sales-settings": [ADMIN_TAG],
  tasks: [ADMIN_TAG],
  inventory: [ADMIN_TAG],
  "inventory-stock": [ADMIN_TAG],
  "inventory-vendors": [ADMIN_TAG],
  "inventory-items": [ADMIN_TAG],
  "inventory-sheets": [ADMIN_TAG],
  "inventory-tracking": [ADMIN_TAG],
  "inventory-awb": [ADMIN_TAG],
  documentation: [ADMIN_TAG],
  "documentation-settings": [ADMIN_TAG],
  chat: [ADMIN_TAG],
};

// Sub-section key → its parent section's key. This is now used ONLY for visual
// grouping/indentation in the Section Access admin grid — it no longer affects
// access (there is no parent→child cascade; every key is granted on its own).
export const SECTION_PARENTS = {
  "projects-list": "projects",
  "projects-sla": "projects",
  "projects-overtimes": "projects",
  "projects-settings": "projects",
  "technical-quotations": "technical",
  "technical-rfq": "technical",
  "technical-settings": "technical",
  "technical-live": "technical",
  "sales-list": "sales",
  "sales-clients": "sales",
  "sales-live": "sales",
  "sales-settings": "sales",
  "inventory-stock": "inventory",
  "inventory-vendors": "inventory",
  "inventory-items": "inventory",
  "inventory-sheets": "inventory",
  "inventory-tracking": "inventory",
  "inventory-awb": "inventory",
  employees: "hr",
  users: "hr",
  careers: "hr",
  applications: "hr",
  cash: "finance",
  "finance-settings": "finance",
  "operations-settings": "operations",
  "operations-tracking": "operations",
  "documentation-settings": "documentation",
};

// Grouping for the Section Access admin page — mirrors StudioShell's NAV
// groups so admin can moderate access one category at a time.
export const SECTION_CATEGORIES = [
  { label: "Main", keys: ["dashboard"] },
  { label: "Tasks", keys: ["tasks"] },
  { label: "Company Website", keys: ["messages", "access", "services", "previous-projects", "gallery"] },
  { label: "Projects", keys: ["projects", "projects-list", "projects-sla", "projects-overtimes", "projects-settings"] },
  { label: "Operations", keys: ["operations", "operations-settings", "operations-tracking"] },
  { label: "Technical", keys: ["technical", "technical-quotations", "technical-rfq", "technical-settings", "technical-live"] },
  { label: "Sales", keys: ["sales", "sales-list", "sales-clients", "sales-live", "sales-settings"] },
  { label: "Finance", keys: ["finance", "cash", "finance-settings"] },
  { label: "Inventory", keys: ["inventory", "inventory-stock", "inventory-vendors", "inventory-items", "inventory-sheets", "inventory-tracking", "inventory-awb"] },
  { label: "Human Resources", keys: ["hr", "employees", "users", "careers", "applications"] },
  { label: "Documentation", keys: ["documentation", "documentation-settings"] },
  { label: "Inbox", keys: ["chat"] },
  { label: "Content", keys: ["settings", "reviews", "content-statistics"] },
];

// Build a `can()` subject from a user object. A user's grant-lookup codes are
// its department code + any extra access codes (surfaced by employeeAuth). We
// also fall back to the user's tags (minus admin) so an employeeAuth derivation
// probe — which passes raw codes as `tags` — resolves correctly. Per-user
// grants are keyed by the user's id.
export function subjectFromUser(user) {
  const tags = Array.isArray(user?.tags) ? user.tags : [];
  const codes = [];
  if (user?.departmentCode) codes.push(user.departmentCode);
  if (Array.isArray(user?.accessCodes)) codes.push(...user.accessCodes);
  if (codes.length === 0) codes.push(...tags.filter((t) => t && t !== ADMIN_TAG));
  return {
    isAdmin: tags.includes(ADMIN_TAG),
    departmentCodes: [...new Set(codes)],
    userId: user?.id || user?.userId,
  };
}

// True when the user may VIEW the given section/sub-section. Delegates to the
// grant resolver `can()` — access comes from grants attached to the user's
// department code(s) and/or the user personally (settings.accessControl). Admin
// always wins; nodes are independent (no parent→child cascade); default deny.
// `grants` is the object returned by getSectionAccess()/getAccessGrants().
export function canAccessSection(user, sectionKey, grants) {
  if (!user) return false;
  return can(subjectFromUser(user), sectionKey, ACT.VIEW, grants);
}

// True when the user may MANAGE (create / edit / delete) the given section —
// checks the `manage` action specifically (view alone is NOT enough). Admin
// always wins. Used to gate every mutating route + the manage UI controls.
export function canManageSection(user, sectionKey, grants) {
  if (!user) return false;
  // Some nodes have no distinct `manage` action (view-only sections like
  // inventory-tracking / live views) — for those, managing == viewing so we
  // don't lock out users who legitimately act on a view-only section.
  const action = nodeActions(sectionKey).includes(ACT.MANAGE) ? ACT.MANAGE : ACT.VIEW;
  return can(subjectFromUser(user), sectionKey, action, grants);
}
