// Access-control model (client-safe — no Node imports, mirrors the
// authConstants/sectionAccessConstants split so the sidebar + admin tree can
// import it). This is the single source of truth for WHAT can be permissioned;
// WHO has each permission lives in the admin-editable grant store
// (settings.accessControl), resolved by `can()` below.
//
// A permission is a NODE + ACTION. Grants are attached to departments and/or
// individual users as "allow" | "deny"; deny always wins; default is deny;
// admin is unconditionally all-access. Nodes are independent (no parent→child
// cascade) — granting a section's dashboard never auto-grants its sub-sections.

import { ADMIN_TAG } from "@/lib/authConstants";

// Action vocabulary. `view`/`manage` apply to most nodes; the rest are named
// "functionalities" attached only to the nodes that have them.
export const ACT = {
  VIEW: "view",
  MANAGE: "manage",
  SEE_ALL: "see-all",                 // see every record in a section, not just your own
  SEE_COST: "see-cost",               // quotation cost figures (upper box + Free/Margin/Unit/Total)
  SUBMIT_PO: "submit-po",             // raise a PO submission from an approved ticket
  ISSUE_PROJECT_NUMBER: "issue-project-number", // Finance completes a PO task
  RECEIVE_SALES: "receive-sales",     // receive/answer website "Contact Sales" chats
  RECEIVE_SUPPORT: "receive-support", // receive/answer website "Contact Support" chats
  // NOTE: task approval + appointment are NOT access-gated — they are driven
  // entirely by who is assigned in Tasks → Task settings (see lib/tasks.js).
};

const V = ACT.VIEW, M = ACT.MANAGE;

// The permission tree. Each node: { key, label, actions[], children? }.
// `key`s reuse the existing section keys so server guards keep working when we
// switch enforcement over in Phase 2 (plus the new `hr` group).
export const ACCESS_TREE = [
  { key: "dashboard", label: "Main Dashboard", actions: [V] },
  { key: "tasks", label: "Tasks", actions: [V, M] },
  {
    key: "content", label: "Content", actions: [], children: [
      { key: "services", label: "Services", actions: [V, M] },
      { key: "previous-projects", label: "Previous Projects", actions: [V, M] },
      { key: "gallery", label: "Gallery", actions: [V, M] },
      { key: "content-statistics", label: "Website Statistics", actions: [V] },
    ],
  },
  {
    key: "projects", label: "Projects", actions: [V], children: [
      { key: "projects-list", label: "Project list", actions: [V, M, ACT.SEE_ALL] },
      { key: "projects-sla", label: "SLA", actions: [V, M] },
      { key: "projects-overtimes", label: "Overtimes", actions: [V, M] },
      { key: "projects-settings", label: "Projects Settings", actions: [V, M] },
    ],
  },
  {
    key: "technical", label: "Technical", actions: [V], children: [
      { key: "technical-quotations", label: "Quotations", actions: [V, M, ACT.SEE_COST, ACT.SEE_ALL] },
      { key: "technical-rfq", label: "RFQ", actions: [V, M] },
      { key: "technical-settings", label: "Technical Settings", actions: [V, M] },
      { key: "technical-live", label: "Live view", actions: [V] },
    ],
  },
  {
    key: "sales", label: "Sales", actions: [V], children: [
      { key: "sales-list", label: "Tickets", actions: [V, M, ACT.SEE_ALL, ACT.SUBMIT_PO] },
      { key: "sales-clients", label: "Clients", actions: [V, M] },
      { key: "sales-live", label: "Live view", actions: [V] },
      { key: "sales-settings", label: "Settings", actions: [V, M] },
    ],
  },
  {
    key: "operations", label: "Operations", actions: [V, M], children: [
      { key: "operations-settings", label: "Operations Settings", actions: [V, M] },
      { key: "operations-tracking", label: "Tracking", actions: [V, M] },
    ],
  },
  {
    key: "finance", label: "Finance", actions: [V, M, ACT.ISSUE_PROJECT_NUMBER], children: [
      { key: "cash", label: "Cash", actions: [V, M] },
      { key: "finance-settings", label: "Finance Settings", actions: [V, M] },
    ],
  },
  {
    key: "inventory", label: "Inventory", actions: [V], children: [
      { key: "inventory-stock", label: "Stock Management", actions: [V, M] },
      { key: "inventory-vendors", label: "Vendors", actions: [V, M] },
      { key: "inventory-items", label: "Registered Items", actions: [V, M] },
      { key: "inventory-sheets", label: "Project Sheets", actions: [V, M] },
      { key: "inventory-tracking", label: "Orders and Tracking", actions: [V] },
      { key: "inventory-awb", label: "AWB Tracking", actions: [V, M] },
    ],
  },
  {
    key: "hr", label: "Human Resources", actions: [V], children: [
      { key: "employees", label: "Employees", actions: [V, M] },
      { key: "users", label: "Users", actions: [V, M] },
      { key: "careers", label: "Careers", actions: [V, M] },
      { key: "applications", label: "Applications", actions: [V, M] },
    ],
  },
  {
    key: "inbox", label: "Inbox", actions: [], children: [
      { key: "messages", label: "Messages", actions: [V, M] },
      { key: "reviews", label: "Client Reviews", actions: [V, M] },
      { key: "chat", label: "Live Chat", actions: [V, ACT.RECEIVE_SALES, ACT.RECEIVE_SUPPORT] },
    ],
  },
  {
    key: "documentation", label: "Documentation", actions: [V], children: [
      { key: "documentation-settings", label: "Documentation Settings", actions: [V, M] },
    ],
  },
  {
    key: "settings", label: "Settings", actions: [], children: [
      { key: "company", label: "Company Info", actions: [V, M] },
      { key: "access", label: "Access Control", actions: [V, M] },
    ],
  },
];

// Flat map key → node (with parentKey), for O(1) lookups + the admin grid.
export const NODE_INDEX = (() => {
  const idx = {};
  for (const top of ACCESS_TREE) {
    idx[top.key] = { ...top, parentKey: null };
    for (const child of top.children || []) idx[child.key] = { ...child, parentKey: top.key };
  }
  return idx;
})();

export function nodeActions(nodeKey) {
  return NODE_INDEX[nodeKey]?.actions || [];
}

// Resolve one permission. `subject` = { isAdmin, departmentCodes[], userId }.
// `grants` = { departments: { code: { node: { action: "allow"|"deny" } } },
//              users: { userId: { node: { action } } } }.
// Rules: admin ⇒ true; collect allow/deny from all the subject's departments +
// their per-user grants; a MANAGE grant implies VIEW; deny wins; else any allow.
export function can(subject, nodeKey, action = ACT.VIEW, grants) {
  if (!subject) return false;
  if (subject.isAdmin) return true;

  const codes = Array.isArray(subject.departmentCodes) ? subject.departmentCodes : [];
  const userId = subject.userId;
  const cells = [];
  const collect = (map) => {
    if (!map) return;
    const forNode = map[nodeKey];
    if (!forNode) return;
    if (action in forNode) cells.push(forNode[action]);
    // manage implies view
    if (action === ACT.VIEW && ACT.MANAGE in forNode) cells.push(forNode[ACT.MANAGE]);
  };
  for (const c of codes) collect(grants?.departments?.[c]);
  if (userId) collect(grants?.users?.[userId]);

  if (cells.includes("deny")) return false;
  return cells.includes("allow");
}

// Convenience: does the subject have VIEW on any node at all (used to decide a
// sensible landing page for non-admins).
export function firstVisibleNode(subject, grants) {
  for (const key of Object.keys(NODE_INDEX)) {
    if (can(subject, key, ACT.VIEW, grants)) return key;
  }
  return null;
}
