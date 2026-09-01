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
// A stable engagement id for a chain, derived from its head record so re-running
// the backfill maps the same chain to the same engagement (idempotent, spec §5.4).
// No clock, no randomness — deliberately the opposite of makeId() above.
//
// The hash itself lives in ./engagementId, not here, and deliberately does NOT
// use node:crypto — see that file for why. Short version: THIS module is
// reachable from a "use client" component (Hero.js imports ENG/MEDIA/IX; see
// the superSession comment below for the same constraint on that key), and
// node:crypto has no browser shim. Two attempts to reach it from here — a lazy
// `require("node:crypto")`, then a plain ESM re-export of a module that
// imported it — BOTH measured +130 KB gz on the client bundle and broke the
// budget ceiling, because webpack resolves a module's dependency graph before
// any tree-shaking pass can prove an export unreached. ./engagementId's SHA-1
// is dependency-free instead, verified to match crypto.createHash("sha1")
// byte-for-byte on the same input.
export { deterministicEngId } from "./engagementId";
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
  // A project plan — the scheduler document opened from a project or the planner
  // app. Server-minted (unlike the board's client-side ids) because a plan is a
  // studio-level record that both doors list.
  plan: () => makeId("pln"),
  row: (collection: string) => makeId(collection.slice(0, 3)),
  // An engagement — the umbrella a Tier-B record (project, job, …) opens over
  // the Tier-A records it draws in. See the approved engagement storage spec.
  engagement: () => makeId("eng"),
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
  // WHICH NOVA CAPABILITIES ARE SWITCHED ON, platform-wide. One small object
  // edited in /super → Application → Nova; qualifies every studio's Nova the way
  // catalogSettings qualifies every package. Platform-level, no cascade.
  novaConfig: `${P}g:novaConfig`,
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
  // LAST-SEEN / LAST-LOGIN, moved OFF the g:users registry row (R6). touchLastSeen
  // fires on every authenticated request and used to READ and, every few minutes
  // per user, REWRITE the whole shared registry through a compare-and-set — the
  // hottest CAS contention in the system, since every presence stamp serialised
  // behind every other writer to g:users. Two timestamps do not belong on a row
  // shared by every user, so they live in this tiny per-user document instead. It
  // dies with the user via the u:<id>:* prefix; like u:<id>:sessions it is not
  // (yet) in the SQL export mapping.
  activity: (userId: string) => `${P}u:${userId}:activity`,
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
  // THE BLOB OBJECT'S PATHNAME — a SECOND namespace, and the one the bytes
  // actually live in now. `blob()` above namespaces the Redis record; for the
  // whole time the bytes were base64 inside that record, prefixing it was
  // enough. It is not any more. Vercel Blob has no equivalent of
  // NOMPANY_KEY_PREFIX, so an unprefixed pathname puts a test run's objects in
  // the live store beside production's — the identical fault this block's
  // header describes, committed a second time in a store that did not exist
  // when that header was written.
  //
  // It is worse here than it was in Redis, because the two halves are swept by
  // different mechanisms: delPrefix reaps the test run's RECORD, and nothing
  // reaps the OBJECT it named. The result is precisely the leak deleteMedia
  // calls "unreachable and unreclaimable" — billed forever, with the only
  // pointer to it deleted. tests/blob-sweep.mjs is the other half of the fix,
  // and it can only find those objects because this prefix is here.
  object: (id: string) => `${P}media/${id}`,
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
  // THE MAIN ROLLUP — a hash of per-section, per-day counts (see
  // platform/db/mainAgg.ts), so the executive Overview reads one HGETALL
  // instead of re-reading every tracked collection. Under the studio prefix,
  // so it cascades with the studio for free.
  mainAgg: (studioId: string) => `${P}s:${studioId}:mainagg`,
};

// ---- per-section keys (die with the section) -------------------------------
export const SEC = {
  prefix: (studioId: string, sectionId: string) => `${P}s:${studioId}:sec:${sectionId}:`,
  col: (studioId: string, sectionId: string, name: string) => `${P}s:${studioId}:sec:${sectionId}:c:${name}`,
};

// ---- per-project documents -------------------------------------------------
// A project's Kanban board is ONE JSON document, not a row collection: the
// board screen is a single zustand store whose whole state is read and written
// as a unit, so a document keyed by the project matches the client exactly and
// keeps every board write to one compare-and-set. Under the studio prefix, so
// it dies with the studio for free; removeProject also deletes it explicitly so
// a deleted project leaves no board behind (deletion is children-first).
export const PROJECT = {
  board: (studioId: string, projectId: string) => `${P}s:${studioId}:project:${projectId}:board`,
};

// ---- project plans (studio-level; die with the studio) ---------------------
// A plan is created from a project but is NOT section-scoped: it must be
// viewable from the project with no Operations grant, AND listed by the planner
// app under Operations. So it lives at the studio level, not under either
// section — `index` is one array of summaries the app and a project both read
// (the project filters by projectId), and `doc` is the full scheduler document
// per plan. Both die with the studio; removeProject also clears a project's
// plans explicitly (children-first).
export const PLAN = {
  index: (studioId: string) => `${P}s:${studioId}:plans`,
  doc: (studioId: string, planId: string) => `${P}s:${studioId}:plan:${planId}`,
};

// A studio's editable WBS TEMPLATES — the presets a new plan starts from. Seeded
// once from the built-in set, then owned and edited by the studio in the planner
// like a plan. Same studio-level shape as PLAN: one index of summaries, one doc
// (the plan-shaped { meta, tasks }) per template. Die with the studio.
export const PLAN_TEMPLATE = {
  index: (studioId: string) => `${P}s:${studioId}:plan-templates`,
  doc: (studioId: string, templateId: string) => `${P}s:${studioId}:plan-template:${templateId}`,
};

// ---- engagement model (see the approved engagement storage spec) -----------
// One key per record, membership in sets, indexes maintained on write. The
// ownership prefix is unchanged (s:<StudioID>:*), so cascade and tenancy hold.
export const ENG = {
  root:     (studioId: string, engId: string) => `${P}s:${studioId}:eng:${engId}`,
  members:  (studioId: string, engId: string, type: string) => `${P}s:${studioId}:eng:${engId}:members:${type}`,
  rec:      (studioId: string, type: string, recId: string) => `${P}s:${studioId}:rec:${type}:${recId}`,
  dept:     (studioId: string, type: string) => `${P}s:${studioId}:dept:${type}`,
  hasStage: (studioId: string, type: string) => `${P}s:${studioId}:eng-ix:has:${type}`,
  ref:      (studioId: string, type: string, refId: string) => `${P}s:${studioId}:ref:${type}:${refId}`,
  refBy:    (studioId: string, type: string, refId: string) => `${P}s:${studioId}:ref-by:${type}:${refId}`,
  // Reverse index: one EXISTING record → the engagement id it belongs to.
  // Value is the engId (from deterministicEngId), so the backfill can point a
  // record at its engagement without touching the record itself (read-layer
  // only — Phase 1a changes no existing record, route or response).
  recEng:   (studioId: string, type: string, recId: string) => `${P}s:${studioId}:rec-eng:${type}:${recId}`,
  // AN ALIAS: any historically-derived id → the one true deal id (§2.2, Law 3).
  //
  // Identity is minted ONCE, by whichever record opened the deal, and never
  // moves. But this codebase already mints deterministic ids from a record's
  // lineage (engagementIdForLineage), and those ids are in the wild — held by
  // the backfill, by rec-eng pointers, and by anything that derived one rather
  // than read it. Re-rooting a deal so a derived id keeps resolving is exactly
  // what Law 3 forbids, so the derived id becomes a LOOKUP HELPER instead: it
  // maps here, to the deal that actually exists.
  //
  // This is what makes "a more important record arrived late" a non-event. The
  // ticket raised after the project does not re-root anything; it attaches, and
  // whatever id somebody derived from it points at the same deal.
  alias:    (studioId: string, aliasId: string) => `${P}s:${studioId}:eng-alias:${aliasId}`,
  // EVERY engagement this studio has, newest first, scored by createdAt — so
  // listing a studio's deals is one ZRANGE instead of re-reading salesTickets
  // and re-deriving the clustering the engagement layer already did. Scored by
  // the timestamp rather than insertion order because that is what lets a later
  // report ask for a date range (ZRANGEBYSCORE) without reading a collection.
  index: (studioId: string) => `${P}s:${studioId}:eng-index`,
};
// The per-studio bucket loose Tier-A records attach to instead of minting an engagement.
export const UNASSIGNED_ENG = "__unassigned";

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
    // The document register OPENS FULL SCREEN (see the studio router), the
    // way the manual and the live views do, because a document is read
    // rather than navigated away from — carried over from when this was
    // Quality's own Documents sub-section.
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
    // The rota and the working week — the shift calendar, "schedule a shift"
    // and the studio's work-week shading — on its own grant. It owns no
    // collection: shifts live under the field-service root section (read
    // through that door), so this gates the SCREEN and its writes, not a
    // store of its own.
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

  // Employees is the only HR sub-section. The Old System's Users, Careers and
  // Applications are deliberately not carried over: login accounts are the
  // studio's Collaborator rows (People & requests), and recruitment is out of
  // scope here.
  { key: "hr", name: "Human Resources", children: [
    { key: "hr-employees", name: "Employees" },
  ] },

  { key: "finance", name: "Finance & Accounting", children: [
    // finance-cash is deliberately NOT renamed. Every existing invoice and
    // expense carries its SectionID, and while a key rename does not orphan a
    // record, the name is still what the drill-down and the insights read.
    { key: "finance-cash", name: "Cash" },
    { key: "finance-ledger", name: "Ledger" },
    // Wave 4 Finance 1b: what we owe (AP) and what we own (fixed assets), each
    // a section beside cash and the ledger, each with its own permission.
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

// Flat list of every seeded key, parents and children alike.
export const ALL_SECTION_KEYS = SECTION_DEFS.flatMap((d) => [d.key, ...(d.children || []).map((c) => c.key)]);

// Which operational collections belong to which section key. Every record in
// these collections carries { studioId, sectionId } and dies with its section.
//
// A collection is owned by the MOST SPECIFIC section that holds it, so deleting
// that sub-section takes its data with it. Collections that genuinely span a
// section's sub-sections stay on the parent — `deliveries` is raised from
// several places, and Field Service's shifts, Quality & HSE's permits and
// Administration's locations are each a tab of one screen rather than a
// separate sub-section.
export const SECTION_COLLECTIONS = {
  // crm-sales
  "crm-sales-tickets": ["salesTickets", "generatedDocuments"],
  "crm-sales-clients": ["salesClients"],
  // crm-sales-settings has no collection of its own any more: the service
  // catalogue that used to live here (`salesServices`) is gone — a ticket's
  // services now name the studio's own Service Actions
  // (`studio.serviceActions`, in Studio Settings), the same field Inventory
  // and Projects already read, rather than a Sales-owned collection.
  // The quotation's generated documents travel WITH the quotation — the
  // filled-in thing belongs to the record it is about; Quality owns the
  // blank. Otherwise the controlled register, which exists to answer "what
  // governs this company", fills with transactional paperwork. The ticket's
  // own generated documents (above) are a second, unrelated copy of the same
  // collection name, owned by the ticket they were generated against — a
  // ticket is not renamed into CRM & Sales, it already lived there.
  "crm-sales-quotations": ["quotations", "generatedDocuments"],
  // engineering-docs
  "engineering-docs-rfq": ["rfqs"],
  // The controlled-document register and the studio's own document taxonomy,
  // carried over from Quality's Documents sub-section — the register is the
  // technical truth now (blueprint §3.4); Quality keeps the evidence:
  // inspections, NCRs, audits, incidents, permits. Revisions, templates and
  // the distribution log join them as the screens that write them land; a
  // name here before then is a key nothing fills.
  "engineering-docs-register": ["qualityDocuments", "qualityTypes", "qualityRevisions",
    "qualityAudit", "qualityAcknowledgements"],
  // projects
  "projects-list": ["projects"],
  "projects-sla": ["slas"],
  "projects-overtimes": ["overtimes"],
  // procurement — the supplier master, carried over from Inventory's Vendors
  // screen.
  "procurement-suppliers": ["inventoryVendors"],
  // inventory — Project Sheets owns the sheets and their orders sub-sheet,
  // matching the Old System, where Sheets lives under Inventory (not Projects).
  inventory: ["deliveries"],
  "inventory-stock": ["inventoryStock"],
  "inventory-items": ["inventoryItems"],
  "inventory-sheets": ["projectSheets", "materialOrders"],
  // AWB tracking owns the shipments it follows and the airline registry that
  // resolves a waybill's 3-digit prefix to a carrier.
  "logistics-shipments": ["awbShipments", "awbAirlines"],
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
  // The chart of accounts and the journal. A journal entry is never edited once
  // posted — only reversed by a mirror entry — so there is no separate
  // "reversals" collection: a reversal is just another journalEntry.
  "finance-ledger": ["accounts", "journalEntries"],
  // Payables: bills we owe vendors, with their own payment history. Assets: the
  // fixed-asset register — depreciation is derived, never stored, so there is no
  // schedule collection.
  "finance-payables": ["bills"],
  "finance-assets": ["fixedAssets"],
  // field-service — was Operations. All three stay: permits and locations are
  // tabs of this screen, and the shift rota is the third. The blueprint puts
  // permits under Quality & HSE and locations under Administration's master
  // data, and they will go there — in the phase that BUILDS those screens.
  // Moving them now would strand real rows in sections that render nothing.
  "field-service": ["shifts", "permits", "locations"],
  // One last-known position per person, never a movement trail.
  "field-service-tracking": ["trackingPositions"],
  // tasks
  tasks: ["tasks"],
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

// ---- SQL identifiers (Postgres store swap) ---------------------------------
// SQL IDENTIFIERS ARE KEYS TOO. Invariant 1 says keys are built only here,
// never a literal and never a template at a call site — the reason was that a
// literal in lib/media.js once wrote real blobs from the test suite. A table
// name interpolated at a call site is the same failure with a bigger blast
// radius, so the table and its columns are named here and nowhere else.
export const TBL = {
  rows: "collection_rows",
  seq: "collection_rows_seq",
  cols: {
    tenant: "tenant_id", section: "section_id", collection: "collection",
    id: "id", seq: "seq", version: "row_version", payload: "payload",
    createdAt: "created_at", updatedAt: "updated_at",
  },

  // THE DOCUMENT STORE — where every former Redis key now lives. Its primary
  // key is a string built by the builders ABOVE this block, which is the whole
  // reason it needs no naming scheme of its own: `u:<id>:profile` was already a
  // namespaced hierarchy, and inventing a second one would mean rewriting every
  // call site to gain nothing. The TABLE name is named here for the same reason
  // `rows` is — a table name is a key, and a key literal at a call site is the
  // failure invariant 1 exists to stop.
  //
  // NOT UNDER ROW-LEVEL SECURITY, unlike `rows`, and that is not an oversight:
  // these keys are platform-scoped (`g:studios` belongs to the platform, a
  // profile to an account), so there is no tenant column to key a policy on.
  // pgSchema.sql's header says the same next to the table itself.
  docs: "documents",
  docCols: {
    key: "key", value: "value", expiresAt: "expires_at",
    createdAt: "created_at", updatedAt: "updated_at", version: "row_version",
  },

  // THE EVENT STREAM. `id` is a bigserial, and it is the client's cursor —
  // invariant 12 ("the stream is truth") survives the move because monotonic
  // insert ids give `Last-Event-ID` replay the same guarantee a Redis stream id
  // gave it. `channel` holds what used to be the stream's key.
  events: "events",
  eventCols: {
    id: "id", channel: "channel", payload: "payload", createdAt: "created_at",
  },
} as const;
