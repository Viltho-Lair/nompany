// NOVA'S CAPABILITY CATALOGUE — everything the assistant can be allowed to do.
//
// One client-safe registry (no Redis, no service imports) that is the single
// source for two things: the /super → Application → Nova switchboard renders its
// rows from here, and the server's tool builder turns each ENABLED ∩ PERMITTED
// entry into a tool the model may call. Metadata only — the mapping from a
// capability to the actual service function lives server-side in the tool
// builder, so this file may be imported by the console UI without dragging a
// department module (and its Redis) into the client.
//
// Drawn from the capability research (23/08/2026). TWO GATES sit above any of
// these: the studio's package must include Nova at all (plan.novaEnabled), and
// the capability must be switched on in the console. A third, live, gate is the
// asking user's own permission — `permissionKey` — checked when the tool runs,
// so enabling a capability never grants it to someone who lacks the right.
//
// `permissionKey: null` means the underlying service is membership-only or
// self-gating (it scopes to the caller inside its own write), so there is no
// leaf right to check — e.g. reading your own notifications, marking them read,
// reporting your own position.

export type NovaCapabilityKind = "read" | "action";

export type NovaCapability = {
  key: string;                 // stable id — the switchboard stores this, the tool builder maps it
  label: string;               // what the console operator and the tool description read
  department: string;          // grouping in the switchboard
  kind: NovaCapabilityKind;
  permissionKey: string | null;// the leaf right checked live, or null for membership/self-gated
  defaultOn: boolean;          // the built-in default when the switchboard has no explicit value
  scope?: "own" | "all";       // informational: whose records (reads)
  writes?: boolean;            // an action that mutates — requires the prepare→confirm→submit flow
};

// READ capabilities each re-check their OWN leaf key (the department GET is
// gated coarsely, so the aggregate over-shares — Nova tightens it). ACTION
// capabilities call the self-guarding service; `writes: true` marks the ones
// that need an explicit confirm before they fire.
export const NOVA_CAPABILITIES: NovaCapability[] = [
  // ---- Sales ----
  { key: "read.sales.tickets", label: "Sales tickets", department: "Sales", kind: "read", permissionKey: "sales.tickets.view", defaultOn: true, scope: "all" },
  { key: "read.sales.clients", label: "Clients", department: "Sales", kind: "read", permissionKey: "sales.clients.view", defaultOn: true, scope: "all" },
  { key: "action.sales.comment-ticket", label: "Comment on a ticket", department: "Sales", kind: "action", permissionKey: "sales.tickets.edit", defaultOn: true, writes: true },
  { key: "action.sales.create-ticket", label: "Raise a sales ticket", department: "Sales", kind: "action", permissionKey: "sales.tickets.create", defaultOn: false, writes: true },
  { key: "action.sales.create-client", label: "Add a client", department: "Sales", kind: "action", permissionKey: "sales.clients.create", defaultOn: false, writes: true },

  // ---- Technical ----
  { key: "read.technical.rfqs", label: "RFQs", department: "Technical", kind: "read", permissionKey: "technical.rfq.view", defaultOn: true, scope: "all" },
  { key: "read.technical.quotations", label: "Quotations", department: "Technical", kind: "read", permissionKey: "technical.quotations.view", defaultOn: true, scope: "all" },
  { key: "action.technical.request-rfq", label: "Raise an RFQ", department: "Technical", kind: "action", permissionKey: "technical.rfq.create", defaultOn: false, writes: true },

  // ---- Projects ----
  { key: "read.projects.list", label: "Projects", department: "Projects", kind: "read", permissionKey: "projects.list.view", defaultOn: true, scope: "all" },
  { key: "read.projects.slas", label: "SLA contracts", department: "Projects", kind: "read", permissionKey: "projects.sla.view", defaultOn: true, scope: "all" },
  { key: "read.projects.overtimes", label: "Overtime", department: "Projects", kind: "read", permissionKey: "projects.overtimes.view", defaultOn: true, scope: "all" },

  // ---- Tasks ----
  { key: "read.tasks.board", label: "Task board", department: "Tasks", kind: "read", permissionKey: "tasks.board.view", defaultOn: true, scope: "all" },
  { key: "action.tasks.advance-mine", label: "Advance my own task", department: "Tasks", kind: "action", permissionKey: null, defaultOn: true, writes: true },
  { key: "action.tasks.create", label: "Create a task", department: "Tasks", kind: "action", permissionKey: "tasks.board.create", defaultOn: false, writes: true },

  // ---- Quality ----
  { key: "read.quality.docs", label: "Controlled documents", department: "Quality", kind: "read", permissionKey: "quality.documents.view", defaultOn: true, scope: "all" },
  { key: "action.quality.create-doc", label: "Create a document draft", department: "Quality", kind: "action", permissionKey: "quality.documents.create", defaultOn: false, writes: true },

  // ---- HR ----
  { key: "read.hr.my-record", label: "My employee record", department: "HR", kind: "read", permissionKey: "hr.employees.view", defaultOn: true, scope: "own" },
  { key: "read.hr.employees", label: "Employees", department: "HR", kind: "read", permissionKey: "hr.employees.view", defaultOn: true, scope: "all" },
  { key: "read.hr.my-leave", label: "My leave", department: "HR", kind: "read", permissionKey: "hr.vacations.view", defaultOn: true, scope: "own" },
  { key: "action.hr.request-leave", label: "Request leave", department: "HR", kind: "action", permissionKey: "hr.vacations.create", defaultOn: true, writes: true },
  { key: "action.hr.cancel-leave", label: "Cancel my pending leave", department: "HR", kind: "action", permissionKey: "hr.vacations.view", defaultOn: true, writes: true },

  // ---- Finance ----
  { key: "read.finance.invoices", label: "Invoices", department: "Finance", kind: "read", permissionKey: "finance.cash.view", defaultOn: true, scope: "all" },
  { key: "read.finance.expenses", label: "Expenses", department: "Finance", kind: "read", permissionKey: "finance.cash.view", defaultOn: true, scope: "all" },
  { key: "read.finance.summary", label: "Finance summary", department: "Finance", kind: "read", permissionKey: "finance.cash.view", defaultOn: true, scope: "all" },
  { key: "read.finance.bills", label: "Bills / payables", department: "Finance", kind: "read", permissionKey: "finance.payables.view", defaultOn: true, scope: "all" },
  { key: "read.finance.assets", label: "Fixed assets", department: "Finance", kind: "read", permissionKey: "finance.assets.view", defaultOn: true, scope: "all" },
  { key: "action.finance.log-expense", label: "Log an expense", department: "Finance", kind: "action", permissionKey: "finance.cash.create", defaultOn: false, writes: true },
  { key: "action.finance.create-invoice", label: "Raise an invoice (draft)", department: "Finance", kind: "action", permissionKey: "finance.cash.create", defaultOn: false, writes: true },
  { key: "action.finance.create-bill", label: "Raise a bill", department: "Finance", kind: "action", permissionKey: "finance.payables.create", defaultOn: false, writes: true },

  // ---- Inventory ----
  { key: "read.inventory.items", label: "Items & stock", department: "Inventory", kind: "read", permissionKey: "inventory.items.view", defaultOn: true, scope: "all" },
  { key: "read.inventory.vendors", label: "Vendors", department: "Inventory", kind: "read", permissionKey: "inventory.vendors.view", defaultOn: true, scope: "all" },
  { key: "read.inventory.orders", label: "Purchase orders", department: "Inventory", kind: "read", permissionKey: "inventory.stock.view", defaultOn: true, scope: "all" },
  { key: "read.inventory.awb", label: "Shipments (AWB)", department: "Inventory", kind: "read", permissionKey: "inventory.awb.view", defaultOn: true, scope: "all" },

  // ---- Operations ----
  { key: "read.operations.permits", label: "Permits", department: "Operations", kind: "read", permissionKey: "operations.tracking.view", defaultOn: true, scope: "all" },
  { key: "read.operations.shifts", label: "Shifts & rota", department: "Operations", kind: "read", permissionKey: "operations.tracking.view", defaultOn: true, scope: "all" },
  { key: "action.operations.report-position", label: "Report my position", department: "Operations", kind: "action", permissionKey: null, defaultOn: true, writes: true },

  // ---- Everywhere ----
  { key: "read.main.home", label: "Home headlines", department: "Home", kind: "read", permissionKey: null, defaultOn: true, scope: "all" },
  { key: "read.notifications", label: "My notifications", department: "Home", kind: "read", permissionKey: null, defaultOn: true, scope: "own" },
  { key: "action.notifications.mark-read", label: "Mark notifications read", department: "Home", kind: "action", permissionKey: null, defaultOn: true, writes: true },
];

export const NOVA_CAPABILITY_KEYS: ReadonlySet<string> = new Set(NOVA_CAPABILITIES.map((c) => c.key));

// The switchboard config, as /super stores it: an explicit on/off per capability.
// A key that is absent falls back to the capability's built-in `defaultOn`.
export type NovaConfig = { enabled: Record<string, boolean> };

export const EMPTY_NOVA_CONFIG: NovaConfig = { enabled: {} };

/** Is this capability switched on, given the stored config? Explicit wins, else the default. */
export function capabilityEnabled(config: NovaConfig | null | undefined, cap: NovaCapability): boolean {
  const explicit = config?.enabled?.[cap.key];
  return typeof explicit === "boolean" ? explicit : cap.defaultOn;
}

/** The capabilities switched on, in registry order — what the tool builder starts from. */
export function enabledCapabilities(config: NovaConfig | null | undefined): NovaCapability[] {
  return NOVA_CAPABILITIES.filter((c) => capabilityEnabled(config, c));
}

/** Grouped by department, in first-seen order — what the switchboard renders. */
export function capabilitiesByDepartment(): { department: string; capabilities: NovaCapability[] }[] {
  const order: string[] = [];
  const by = new Map<string, NovaCapability[]>();
  for (const c of NOVA_CAPABILITIES) {
    if (!by.has(c.department)) { by.set(c.department, []); order.push(c.department); }
    by.get(c.department)!.push(c);
  }
  return order.map((department) => ({ department, capabilities: by.get(department)! }));
}
