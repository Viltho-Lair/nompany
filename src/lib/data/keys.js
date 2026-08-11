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
export const SECTION_DEFS = [
  { key: "sales", name: "Sales" },
  { key: "technical", name: "Technical" },
  { key: "projects", name: "Projects" },
  { key: "inventory", name: "Inventory" },
  { key: "hr", name: "Human Resources" },
  { key: "finance", name: "Finance" },
  { key: "operations", name: "Operations" },
  { key: "website", name: "Website" },
  { key: "tasks", name: "Tasks" },
];

// Which operational collections belong to which section KEY. Every record in
// these collections carries { studioId, sectionId } and dies with its section.
export const SECTION_COLLECTIONS = {
  sales: ["salesClients", "salesTickets"],
  technical: ["rfqs", "quotations"],
  projects: ["projects", "projectSheets", "overtimes", "slas"],
  inventory: ["inventoryVendors", "inventoryItems", "inventoryStock", "deliveries", "materialOrders"],
  hr: ["departments", "positions", "certifications", "vacations"],
  finance: ["invoices", "expenses"],
  operations: ["locations", "permits", "shifts"],
  website: ["services", "careers", "previousProjects", "galleryImages", "reviews", "messages", "applications", "signatures", "docImages"],
  tasks: ["tasks"],
};

// ---- studio slug rules -----------------------------------------------------
// The slug IS the studio's address (nompany.com/<slug>) and its tenant handle.
export const RESERVED_SLUGS = new Set([
  "www", "api", "studio", "super", "account", "login", "signup", "admin", "join",
  "app", "mail", "onboarding", "subscribe", "pricing", "contact", "about", "team",
  "careers", "terms", "features", "verify", "reset", "forgot", "en", "ar",
  "robots", "sitemap", "manifest", "icon", "favicon", "brand", "_next",
]);
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;
export function isValidSlug(slug) {
  const s = String(slug || "");
  return SLUG_RE.test(s) && !RESERVED_SLUGS.has(s);
}
