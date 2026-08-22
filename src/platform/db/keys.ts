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
//  • Nothing outside src/platform/db builds these keys by hand.
//  • User-scoped data lives ONLY under u:<UserID>:* — never on a studio.
//  • Studio-scoped data lives ONLY under s:<StudioID>:* — never on a user.
//  • Deletion happens ONLY through src/platform/db/cascade.ts.

// ---- key namespace ---------------------------------------------------------
// EVERY key this module builds starts with P, which is empty in normal use.
//
// It exists so the integration suite can run against the real Redis — the same
// client, the same repositories, the same code paths — inside a namespace of
// its own, and then delete that namespace wholesale. Isolation is PHYSICAL:
// with a prefix set there is no key a test can name that a real studio also
// uses, so a bug in a test cannot reach live data even in principle.
//
// Two locks, because the failure mode here is catastrophic and silent — a
// production runtime picking this up would appear to lose every studio at once:
//   • it must be asked for explicitly (the variable is unset by default), and
//   • it is ignored outright when NODE_ENV is "production".
export const KEY_PREFIX =
  process.env.NODE_ENV === "production" ? "" : (process.env.NOMPANY_KEY_PREFIX || "");
const P = KEY_PREFIX;

// ---- identifiers -----------------------------------------------------------
export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
export const ID = {
  user: () => makeId("usr"),
  studio: () => makeId("std"),
  collaborator: () => makeId("col"),
  section: () => makeId("sec"),
  subsection: () => makeId("sub"),
  // A named bundle of permissions, per studio. See modules/people/roles.js.
  role: () => makeId("rol"),
  media: () => makeId("med"),
  questionnaire: () => makeId("qst"),
  package: () => makeId("pkg"),
  tier: () => makeId("tir"),
  erpService: () => makeId("svc"),
  qpage: () => makeId("qpg"),
  question: () => makeId("qsn"),
  chatRoom: () => makeId("cht"),
  row: (collection: string) => makeId(collection.slice(0, 3)),
};

// ---- global registries -----------------------------------------------------
export const REG = {
  users: `${P}g:users`,
  studios: `${P}g:studios`,
  superAdmins: `${P}g:superAdmins`,
  joinRequests: `${P}g:joinRequests`,
  // Questionnaire DEFINITIONS authored in /super — the forms themselves, not
  // anyone's answers. Platform-level like the studio registry, because a
  // questionnaire belongs to a route rather than to a studio or a user.
  questionnaires: `${P}g:questionnaires`,
  // What a studio can BUY. Platform-level, like the studio registry: a package
  // or tier is offered by nompany, not owned by any one studio.
  packages: `${P}g:packages`,
  tiers: `${P}g:tiers`,
  // The ERP services a tier is made of — a shared catalogue so two tiers can
  // name the same service and mean it.
  erpServices: `${P}g:erpServices`,
  // What people think of nompany. One field per user, so a rating is inherently
  // unique to them and re-rating replaces rather than accumulates. Platform-
  // level because the opinion is about the product, not about a studio.
  ratings: `${P}g:ratings`,
  // Catalogue-wide settings that belong to no single package — the yearly
  // discount the public pricing page applies. One small object, platform-level
  // like the packages it qualifies.
  catalogSettings: `${P}g:catalogSettings`,
  // THE PLATFORM EVENT LOG — the /super console's equivalent of a studio's
  // s:<StudioID>:events. A Redis Stream, capped and cursor-addressable, so the
  // console resumes exactly like a studio board does. It is platform data: it
  // outlives every studio and every user, and no cascade touches it (a studio
  // being deleted is itself one of the things it records).
  events: `${P}g:events`,
  // The console's own audit trail. /super actions belong to no studio — changing
  // a plan, assigning a platform role, rewriting the catalogue — so they cannot
  // live under one, and they must outlive any studio they touched.
  audit: `${P}g:audit`,
  // Notifications addressed to nompany's OWNERS. The studio-side equivalent is
  // s:<StudioID>:notifications, which cascades with its studio; this one does
  // not, for the same reason g:events does not.
  superNotifications: `${P}g:superNotifications`,
};

// ---- per-user keys (1:1 / 1:N satellites; die with the user) ---------------
export const U = {
  prefix: (userId: string) => `${P}u:${userId}:`,
  profile: (userId: string) => `${P}u:${userId}:profile`,
  verification: (userId: string) => `${P}u:${userId}:verification`,
  questionnaire: (userId: string) => `${P}u:${userId}:questionnaire`,
  sessions: (userId: string) => `${P}u:${userId}:sessions`,
  // Trusted devices are USER data (this person's remembered browsers), so they
  // live under the user prefix and die with the user automatically.
  devices: (userId: string) => `${P}u:${userId}:devices`,
  // How often THIS person has opened each studio: a hash of StudioID -> count.
  // It is a property of the person, not of any studio, so it belongs under the
  // user prefix and is reaped by the user cascade like everything else here.
  studioVisits: (userId: string) => `${P}u:${userId}:studioVisits`,
};

// ---- OTP challenges (NOT user-scoped, deliberately) ------------------------
// A challenge must work BEFORE the requester is authenticated, so it cannot
// live under u:<UserID>:*. It is ephemeral auth state, not user data, and Redis
// EX expires it for free (nothing to clean up, nothing to cascade).
export const OTP = {
  challenge: (challengeId: string) => `${P}otp:${challengeId}`,
};

// ---- live chat rooms (ephemeral, like OTP: owned by nobody) ----------------
// A conversation between someone inside a studio and nompany. It is NOT studio
// data and NOT user data — it is never kept, so it deliberately lives outside
// every prefix: no cascade has to know about it, and Redis' own TTL is the only
// retention policy there is. Ending a chat leaves a short grace window so both
// sides can download the transcript, and then it is gone for good.
//
//   chat:room:<RoomID>        the room document (messages included)
//   chat:room:<RoomID>:held   the NX claim that makes "accept" first-wins
//   chat:live                 the set of room ids currently in play
export const CHAT = {
  room: (roomId: string) => `${P}chat:room:${roomId}`,
  held: (roomId: string) => `${P}chat:room:${roomId}:held`,
  live: `${P}chat:live`,
};

// ---- foreign-exchange rates (a shared daily snapshot, owned by nobody) -----
// ExchangeRate-API quotes every currency against ONE base per call, so the
// platform caches a single USD-based table and derives every other pair from it
// by division. It belongs to no user and no studio — it is the same number for
// everybody — so like OTP and CHAT it lives outside the ownership prefixes and
// no cascade has to know about it.
//
//   fx:usd    the cached payload (rates + the API's own next-update stamp)
//   fx:lock   the NX claim that makes "refetch" first-wins, so a burst of page
//             loads at midnight UTC still spends exactly one API call
export const FX = {
  snapshot: `${P}fx:usd`,
  lock: `${P}fx:lock`,
};

// ---- idempotency -----------------------------------------------------------
// ONE ANSWER PER KEY, so a retry cannot bill twice.
//
// A network timeout does not tell the client whether the write happened. Its
// only options are to retry — and risk a second invoice, a second payment, a
// second ticket — or not to, and risk having lost the first. An idempotency key
// makes the retry safe: the second request is answered with the recorded
// response of the first rather than executed again.
//
// SCOPED TO THE CALLER, not global. The key is chosen by the client, so a key
// that only named itself would let one user replay — or worse, claim — another
// user's response by guessing a UUID. The identity is folded into the hash, so
// the same string from two people is two different records.
//
// Ownerless and TTL'd, like OTP and FX: it belongs to a request rather than to a
// studio, and no cascade should have to know it exists.
//
//   idem:<sha256(identity|method|path|key)>   the recorded {status, body}, or
//                                             an in-flight marker
export const IDEM = {
  record: (digest: string) => `${P}idem:${digest}`,
};

// ---- uploaded files --------------------------------------------------------
// Platform-scoped, and NAMESPACED like everything else. It was built from a
// bare literal in lib/media.js, which meant the integration suite wrote real
// blobs into the live key space — the same fault as the orphan sweep's, with a
// smaller blast radius and the same cause: a key built outside this module.
//
// NB these do not cascade. A studio deleted today strands its files, which is
// tracked as its own finding; the fix is to move studio-owned blobs under
// S.media (declared below, still unused) and out of Redis entirely.
export const MEDIA = {
  blob: (id: string) => `${P}g:media:${id}`,
};

// ---- nompany's own public site (owned by nobody, outside every cascade) ----
// Platform content, not tenant data: services, careers, the reviews wall, the
// messages the contact form leaves. These lived as a template literal inside
// lib/data/site.ts, which put them OUTSIDE the namespace and outside the
// "every key builder is namespaced" assertion — that walks the groups in this
// file and cannot see a key built anywhere else. Same escape route lib/media
// took, and the same consequence: a test run writing into the live site.
export const SITE = {
  collection: (name: string) => `${P}g:site:${name}`,
  settings: `${P}g:site:settings`,
};

// ---- public website traffic (owned by nobody; deliberately never expires) --
// One hash per day plus one HyperLogLog per day. Traffic history is the one
// thing that only gets more useful with age — this spring is only interesting
// next to last spring — so nothing here has a TTL, and both shapes are BOUNDED
// instead: the hash caps its field count (see hIncrBounded) and the HLL is
// constant-size whatever the visitor count.
//
// Namespaced like everything else, so the integration suite cannot write into
// the real record. In production P is empty and the key is unchanged, so there
// is no migration.
export const STAT = {
  day: (isoDate: string) => `${P}stat:day:${isoDate}`,
  visitors: (isoDate: string) => `${P}stat:vis:${isoDate}`,
  // Everything past the per-day field ceiling lands here rather than minting a
  // new field. A page that shows up in this bucket is either a typo or an
  // attempt to grow the hash.
  OVERFLOW_FIELD: "pv:__other",
  MAX_FIELDS_PER_DAY: 300,
};

// ---- rate limiting (ephemeral counters, owned by nobody) -------------------
// NB: `normEmail` is declared further down as a const arrow function. That is
// fine here because it is only dereferenced when the builder is CALLED, by
// which time the module is fully evaluated.
export const RL = {
  otpEmail: (email: string) => `${P}rl:otp:e:${normEmail(email)}`,
  otpIp: (ip: string) => `${P}rl:otp:i:${String(ip || "unknown")}`,
  // /super sign-in, per IP. The console has exactly one door and a handful of
  // legitimate attempts a day, so the window can be far tighter than the
  // subscriber-facing limits.
  superLoginIp: (ip: string) => `${P}rl:super:i:${String(ip || "unknown")}`,
  // Public traffic ingest, per IP. The only endpoint in the product that an
  // unauthenticated caller can make WRITE, so it is the only one where "how
  // often" has to be enforced rather than assumed.
  trackIp: (ip: string) => `${P}rl:track:i:${String(ip || "unknown")}`,

  // FAILED CREDENTIAL ATTEMPTS — password sign-in and password reset.
  //
  // Three counters rather than one, and the SPREAD between them is the design:
  // a single per-email limit would hand anybody a way to lock a named person
  // out of their own account just by typing that address wrong on purpose. See
  // platform/auth/attempts.js for which limit catches which attack.
  attemptPair: (ip: string, email: string) => `${P}rl:cred:p:${String(ip || "unknown")}:${normEmail(email)}`,
  attemptIp: (ip: string) => `${P}rl:cred:i:${String(ip || "unknown")}`,
  attemptEmail: (email: string) => `${P}rl:cred:e:${normEmail(email)}`,
  // How many times this source has already been locked out. Outlives the
  // counters, so the lockout gets longer each time rather than resetting to
  // fifteen minutes forever.
  attemptStrikes: (ip: string) => `${P}rl:cred:x:${String(ip || "unknown")}`,
};

// ---- per-studio keys (die with the studio) ---------------------------------
export const S = {
  prefix: (studioId: string) => `${P}s:${studioId}:`,
  // How many live chats this studio has opened, by calendar month. One hash
  // under the studio prefix, so it dies with the studio and needs no cascade,
  // and one field per YYYY-MM, so last month's total survives as a record
  // rather than being reset over.
  chatUsage: (studioId: string) => `${P}s:${studioId}:chatUsage`,
  collaborators: (studioId: string) => `${P}s:${studioId}:collaborators`,
  sections: (studioId: string) => `${P}s:${studioId}:sections`,
  roles: (studioId: string) => `${P}s:${studioId}:roles`,
  settings: (studioId: string) => `${P}s:${studioId}:settings`,
  notifications: (studioId: string) => `${P}s:${studioId}:notifications`,
  // HOW MANY REFERENCES OF EACH KIND HAVE EVER BEEN ISSUED — a hash, one field
  // per prefix ("INV", "PO", "ACME"). It exists because "the next number" is
  // the one thing in this product that CANNOT be derived from the records:
  // deleting the newest invoice makes the highest surviving reference go
  // backwards, and the next create would then reissue a number a client is
  // already holding. A tally only ever moves forward, so it cannot.
  // Under the studio prefix, so it dies with the studio like everything else.
  counters: (studioId: string) => `${P}s:${studioId}:counters`,
  // WHO DID WHAT, AND WHEN. A Redis Stream like the event log, and for the same
  // reasons: ordered, capped, and addressable by cursor.
  //
  // It is NOT the event log, though the two look alike. Events answer "what
  // changed, so I can refetch" and are read by every open tab; this answers "who
  // changed it", is read by an admin after the fact, and records the actor, the
  // address they came from and the request id that ties it to the server logs.
  // An event is discarded once seen; an audit entry is the point.
  //
  // Under the studio prefix, so it cascades with the studio for free — a deleted
  // studio must not leave a record of its people behind.
  audit: (studioId: string) => `${P}s:${studioId}:audit`,
  // The studio's EVENT LOG (a Redis Stream, not a JSON array). Ordered, capped,
  // and addressable by cursor — it is what "what changed since I last looked?"
  // reads. Under the studio prefix, so it cascades with the studio for free.
  events: (studioId: string) => `${P}s:${studioId}:events`,
};

// ---- per-section keys (die with the section) -------------------------------
export const SEC = {
  prefix: (studioId: string, sectionId: string) => `${P}s:${studioId}:sec:${sectionId}:`,
  col: (studioId: string, sectionId: string, name: string) => `${P}s:${studioId}:sec:${sectionId}:c:${name}`,
};

// ---- indexes (uniqueness claims + O(1) lookups) ----------------------------
const normEmail = (e: unknown) => String(e || "").trim().toLowerCase();
export const IX = {
  email: (email: string) => `${P}ix:email:${normEmail(email)}`,     // → UserID (uniqueness of login email)
  slug: (slug: string) => `${P}ix:slug:${String(slug || "").toLowerCase()}`, // → StudioID
  owner: (userId: string) => `${P}ix:owner:${userId}`,              // → StudioID (0..1 owned studio)
  session: (token: string) => `${P}ix:session:${token}`,            // → UserID (EX = real expiry)
  // → SuperAdminID (EX = real expiry). Takes the DIGEST, not the token: this
  // module is imported by a client component, so it must not pull node:crypto
  // into the browser bundle. platform/auth/superAuth.js hashes before calling.
  superSession: (tokenHash: string) => `${P}ix:supersession:${tokenHash}`,
  collab: (userId: string) => `${P}ix:collab:${userId}`,            // SET of StudioIDs the user collaborates in
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
  // Quality owns the studio's controlled documents. Documents is a sub-section
  // like any other — grantable, with its own SectionID — but it OPENS FULL
  // SCREEN (see the studio router), the way the manual and the live views do,
  // because a document is read rather than navigated away from.
  { key: "quality", name: "Quality", children: [
    { key: "quality-documents", name: "Documents" },
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
  "sales-tickets": ["salesTickets", "generatedDocuments"],
  "sales-clients": ["salesClients"],
  // The service catalogue a ticket picks from. It needs real ids, so it is a
  // collection rather than a vocabulary list on the settings row. In the Old
  // System this was a GLOBAL `services` collection shared with the public
  // site; that site is gone, so Sales Settings owns it outright.
  "sales-settings": ["salesServices"],
  // technical
  // A quotation's generated documents — the cover letter, the terms, whatever
  // template was run against it. They live HERE rather than in Quality because
  // the filled-in thing belongs to the record it is about; Quality owns the
  // blank. Otherwise the controlled register, which exists to answer "what
  // governs this company", fills with transactional paperwork.
  "technical-quotations": ["quotations", "generatedDocuments"],
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
  // AWB tracking owns the shipments it follows and the airline registry that
  // resolves a waybill's 3-digit prefix to a carrier.
  "inventory-awb": ["awbShipments", "awbAirlines"],
  // hr — the reference list belongs to the Employees screen; vacations are
  // studio-wide HR settings.
  //
  // `departments` and `positions` are deliberately gone. A department is a
  // top-level SECTION (see lib/departments.js) and a position was a second name
  // for a role, which lives in s:<StudioID>:roles — neither is a collection any
  // more, and leaving the names here would keep minting empty keys for lists
  // nothing writes.
  hr: ["vacations"],
  "hr-employees": ["certifications"],
  // finance
  "finance-cash": ["invoices", "expenses"],
  // operations — Permits/Locations are tabs of the main screen, not sub-sections.
  operations: ["locations", "permits", "shifts"],
  // One last-known position per person, never a movement trail.
  "operations-tracking": ["trackingPositions"],
  // tasks
  tasks: ["tasks"],
  // quality — the controlled-document register and the studio's own document
  // taxonomy. Revisions, templates and the distribution log join them as the
  // screens that write them land; a name here before then is a key nothing
  // fills.
  "quality-documents": ["qualityDocuments", "qualityTypes", "qualityRevisions", "qualityAudit",
    "qualityAcknowledgements"],
};

// ---- studio slug rules -----------------------------------------------------
// The slug IS the studio's address (nompany.com/<slug>) and its tenant handle.
export const RESERVED_SLUGS = new Set([
  "www", "api", "studio", "super", "account", "login", "signup", "admin", "join",
  "app", "mail", "onboarding", "subscribe", "pricing", "contact", "about", "team",
  "careers", "terms", "features", "verify", "reset", "forgot", "en", "ar",
  "robots", "sitemap", "manifest", "icon", "favicon", "brand", "_next", "c", "q",
]);
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;
export function isValidSlug(slug: unknown): boolean {
  const s = String(slug || "");
  return SLUG_RE.test(s) && !RESERVED_SLUGS.has(s);
}
