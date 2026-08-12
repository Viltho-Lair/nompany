// RESTRUCTURED data model — key scheme, identifiers and entity constants.
// (See the approved ER plan / [[nompany-db-restructure]].)
//
// The ownership tree is ENCODED IN THE KEY HIERARCHY so that cascading deletion
// is prefix deletion:
//
//   g:*                                    global registries (users, studios, …)
//   u:<UserID>:*                           everything owned by ONE user
//   s:<StudioID>:*                         everything owned by ONE studio
//   s:<StudioID>:sec:<SectionID>:c:<name>  a section's operational collection
//   ix:*                                   uniqueness claims + lookup indexes
//
// RULES:
//  • Nothing outside src/lib/data builds these keys by hand.
//  • User-scoped data lives ONLY under u:<UserID>:* — never on a studio.
//  • Studio-scoped data lives ONLY under s:<StudioID>:* — never on a user.
//  • Deletion happens ONLY through src/lib/data/cascade.js.

// ---- identifiers -----------------------------------------------------------
export function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
export const ID = {
  user: () => makeId("usr"),
  studio: () => makeId("std"),
  collaborator: () => makeId("col"),
  section: () => makeId("sec"),
  subsection: () => makeId("sub"),
  grant: () => makeId("grt"),
  media: () => makeId("med"),
  row: (collection) => makeId(collection.slice(0, 3)),
};

// ---- global registries -----------------------------------------------------
export const REG = {
  users: "g:users",
  studios: "g:studios",
  superAdmins: "g:superAdmins",
  joinRequests: "g:joinRequests",
};

// ---- per-user keys (1:1 / 1:N satellites; die with the user) ---------------
export const U = {
  prefix: (userId) => `u:${userId}:`,
  profile: (userId) => `u:${userId}:profile`,
  verification: (userId) => `u:${userId}:verification`,
  questionnaire: (userId) => `u:${userId}:questionnaire`,
  sessions: (userId) => `u:${userId}:sessions`,
  // Trusted devices are USER data (this person's remembered browsers), so they
  // live under the user prefix and die with the user automatically.
  devices: (userId) => `u:${userId}:devices`,
};

// ---- OTP challenges (NOT user-scoped, deliberately) ------------------------
// A challenge must work BEFORE the requester is authenticated, so it cannot
// live under u:<UserID>:*. It is ephemeral auth state, not user data, and Redis
// EX expires it for free (nothing to clean up, nothing to cascade).
export const OTP = {
  challenge: (challengeId) => `otp:${challengeId}`,
};

// ---- rate limiting (ephemeral counters, owned by nobody) -------------------
// NB: `normEmail` is declared further down as a const arrow function. That is
// fine here because it is only dereferenced when the builder is CALLED, by
// which time the module is fully evaluated.
export const RL = {
  otpEmail: (email) => `rl:otp:e:${normEmail(email)}`,
  otpIp: (ip) => `rl:otp:i:${String(ip || "unknown")}`,
  // Public contact form, per IP — the one place an unauthenticated caller can
  // write anything.
  contactIp: (ip) => `rl:contact:i:${String(ip || "unknown")}`,
};

// ---- per-studio keys (die with the studio) ---------------------------------
export const S = {
  prefix: (studioId) => `s:${studioId}:`,
  collaborators: (studioId) => `s:${studioId}:collaborators`,
  sections: (studioId) => `s:${studioId}:sections`,
  grants: (studioId) => `s:${studioId}:grants`,
  tokens: (studioId) => `s:${studioId}:tokens`,
  settings: (studioId) => `s:${studioId}:settings`,
  notifications: (studioId) => `s:${studioId}:notifications`,
  activityLog: (studioId) => `s:${studioId}:activityLog`,
  // The studio's EVENT LOG (a Redis Stream, not a JSON array). Ordered, capped,
  // and addressable by cursor — it is what "what changed since I last looked?"
  // reads. Under the studio prefix, so it cascades with the studio for free.
  events: (studioId) => `s:${studioId}:events`,
  media: (studioId, mediaId) => `s:${studioId}:media:${mediaId}`,
  mediaPrefix: (studioId) => `s:${studioId}:media:`,
};

// ---- per-section keys (die with the section) -------------------------------
export const SEC = {
  prefix: (studioId, sectionId) => `s:${studioId}:sec:${sectionId}:`,
  col: (studioId, sectionId, name) => `s:${studioId}:sec:${sectionId}:c:${name}`,
};

// ---- indexes (uniqueness claims + O(1) lookups) ----------------------------
const normEmail = (e) => String(e || "").trim().toLowerCase();
export const IX = {
  email: (email) => `ix:email:${normEmail(email)}`,     // → UserID (uniqueness of login email)
  slug: (slug) => `ix:slug:${String(slug || "").toLowerCase()}`, // → StudioID
  owner: (userId) => `ix:owner:${userId}`,              // → StudioID (0..1 owned studio)
  session: (token) => `ix:session:${token}`,            // → UserID (EX = real expiry)
  stoken: (token) => `ix:stoken:${token}`,              // → StudioID (EX = time-limited access token)
  collab: (userId) => `ix:collab:${userId}`,            // SET of StudioIDs the user collaborates in
};
export { normEmail };

// ---- fixed section list (seeded at studio creation; appendable) ------------
//
// A section may own SUB-SECTIONS. Each is a row in the same
// s:<StudioID>:sections array carrying `parentId`, and each gets its own id
// (minted `sub_…`) — so a sub-section is grantable, owns collections and
// cascades exactly like a section, with no separate registry.
//
// The tree is ONE level deep by design: a sub-section may not have children.
// Shape mirrors the Old System's studio nav.
export const SECTION_DEFS = [
  { key: "main", name: "Main" },
  { key: "sales", name: "Sales", children: [
    { key: "sales-tickets", name: "Tickets" },
    { key: "sales-clients", name: "Clients" },
    { key: "sales-live", name: "Live view" },
    { key: "sales-settings", name: "Settings" },
  ] },
  { key: "technical", name: "Technical", children: [
    { key: "technical-quotations", name: "Quotations" },
    { key: "technical-rfq", name: "RFQ" },
    { key: "technical-live", name: "Live view" },
    { key: "technical-settings", name: "Settings" },
  ] },
  { key: "projects", name: "Projects", children: [
    { key: "projects-list", name: "Project list" },
    { key: "projects-sla", name: "SLA" },
    { key: "projects-overtimes", name: "Overtimes" },
    { key: "projects-settings", name: "Settings" },
  ] },
  { key: "inventory", name: "Inventory", children: [
    { key: "inventory-stock", name: "Stock Management" },
    { key: "inventory-vendors", name: "Vendors" },
    { key: "inventory-items", name: "Registered Items" },
    { key: "inventory-sheets", name: "Project Sheets" },
    { key: "inventory-awb", name: "AWB Tracking" },
  ] },
  // Employees is the only HR sub-section. The Old System's Users, Careers and
  // Applications are deliberately not carried over: login accounts are the
  // studio's Collaborator rows (People & requests), and recruitment is out of
  // scope here.
  { key: "hr", name: "Human Resources", children: [
    { key: "hr-employees", name: "Employees" },
  ] },
  { key: "finance", name: "Finance", children: [
    { key: "finance-cash", name: "Cash" },
    { key: "finance-settings", name: "Settings" },
  ] },
  { key: "operations", name: "Operations", children: [
    { key: "operations-tracking", name: "Tracking" },
    { key: "operations-settings", name: "Settings" },
  ] },
  { key: "tasks", name: "Tasks", children: [
    { key: "tasks-settings", name: "Task settings" },
  ] },
];

// Flat list of every seeded key, parents and children alike.
export const ALL_SECTION_KEYS = SECTION_DEFS.flatMap((d) => [d.key, ...(d.children || []).map((c) => c.key)]);

// Which operational collections belong to which section key. Every record in
// these collections carries { studioId, sectionId } and dies with its section.
//
// A collection is owned by the MOST SPECIFIC section that holds it, so deleting
// that sub-section takes its data with it. Collections that genuinely span a
// section's sub-sections stay on the parent — `deliveries` is raised from
// several places, and Operations' locations/permits/shifts are tabs of one
// screen rather than separate sub-sections.
export const SECTION_COLLECTIONS = {
  // sales
  "sales-tickets": ["salesTickets"],
  "sales-clients": ["salesClients"],
  // The service catalogue a ticket picks from. It needs real ids, so it is a
  // collection rather than a vocabulary list on the settings row. In the Old
  // System this was a GLOBAL `services` collection shared with the public
  // site; that site is gone, so Sales Settings owns it outright.
  "sales-settings": ["salesServices"],
  // technical
  "technical-quotations": ["quotations"],
  "technical-rfq": ["rfqs"],
  // projects
  "projects-list": ["projects"],
  "projects-sla": ["slas"],
  "projects-overtimes": ["overtimes"],
  // inventory — Project Sheets owns the sheets and their orders sub-sheet,
  // matching the Old System, where Sheets lives under Inventory (not Projects).
  inventory: ["deliveries"],
  "inventory-stock": ["inventoryStock"],
  "inventory-vendors": ["inventoryVendors"],
  "inventory-items": ["inventoryItems"],
  "inventory-sheets": ["projectSheets", "materialOrders"],
  // hr — the reference lists belong to the Employees screen; vacations are
  // studio-wide HR settings.
  hr: ["vacations"],
  "hr-employees": ["departments", "positions", "certifications"],
  // finance
  "finance-cash": ["invoices", "expenses"],
  // operations — Main/Employees/Permits/Locations are tabs, not sub-sections.
  operations: ["locations", "permits", "shifts"],
  // tasks
  tasks: ["tasks"],
};

// ---- studio slug rules -----------------------------------------------------
// The slug IS the studio's address (nompany.com/<slug>) and its tenant handle.
export const RESERVED_SLUGS = new Set([
  "www", "api", "studio", "super", "account", "login", "signup", "admin", "join",
  "app", "mail", "onboarding", "subscribe", "pricing", "contact", "about", "team",
  "careers", "terms", "features", "verify", "reset", "forgot", "en", "ar",
  "robots", "sitemap", "manifest", "icon", "favicon", "brand", "_next", "c",
]);
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;
export function isValidSlug(slug) {
  const s = String(slug || "");
  return SLUG_RE.test(s) && !RESERVED_SLUGS.has(s);
}
