// Client-safe notification constants + helpers. Shared by the bell, the
// Notifications Center, the per-user settings page, and the server notify
// helper (lib/notify.js). No server imports.

// The kinds of personal notification a user can receive. Each is also a toggle
// on the per-user settings page. Delivery + return requests share one kind.
export const NOTIFICATION_KINDS = [
  { key: "task-appointed",    label: "Appointed to a task",             icon: "checkDouble", desc: "You were assigned to a task type in Task settings (covers existing open tasks)." },
  { key: "approval-awaiting", label: "Approval awaiting my sign-off",   icon: "checkDouble", desc: "A quotation approval is waiting for you (Sales or Management)." },
  { key: "po-awaiting",       label: "PO awaiting me",                  icon: "checkDouble", desc: "A client PO approval is waiting for you (Management)." },
  { key: "material-awaiting", label: "Vendor PO awaiting me",           icon: "checkDouble", desc: "A vendor purchase-order approval is waiting for you (Finance or Management)." },
  { key: "delivery-request",  label: "Delivery / return request for me", icon: "external",   desc: "A material delivery or return is assigned to you (Logistics)." },
  { key: "pm-assigned",       label: "Assigned as project manager",     icon: "projects",    desc: "You were made the manager/owner of a project." },
  { key: "comment",           label: "Comment on my record",            icon: "messages",    desc: "Someone commented on a ticket / quotation / project you own or handle." },
  { key: "mention",           label: "Mentioned in a comment",          icon: "messages",    desc: "Someone @mentioned you in a comment." },
];

export const KIND_ICON = Object.fromEntries(NOTIFICATION_KINDS.map((k) => [k.key, k.icon]));
export const KIND_LABEL = Object.fromEntries(NOTIFICATION_KINDS.map((k) => [k.key, k.label]));
const KIND_KEYS = new Set(NOTIFICATION_KINDS.map((k) => k.key));

// A kind is ON unless the user's prefs explicitly set it to false (default opt-in).
export function wantsKind(prefs, kind) {
  return !prefs || prefs[kind] !== false;
}

// Keep only known kind keys as booleans (used when saving prefs).
export function sanitizePrefs(prefs) {
  const out = {};
  if (prefs && typeof prefs === "object") {
    for (const k of KIND_KEYS) if (k in prefs) out[k] = prefs[k] !== false;
  }
  return out;
}

// Map a record's entityType → the sidebar nav item key its notification belongs
// to, so the sidebar can show per-item counters.
export function notifItemKey(entityType) {
  switch (entityType) {
    case "tasks": return "tasks";
    case "salesTickets": return "sales-list";
    case "quotations": return "technical-quotations";
    case "projects": return "projects-list";
    default: return entityType || "";
  }
}
