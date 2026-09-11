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
  // DIGEST → { studioId, keyId } for every live API key, so a request
  // carrying one costs ONE lookup rather than a scan of every studio.
  // It is global because the whole point is to find the studio FROM the
  // secret; it holds no secret itself — a digest is not reversible — and
  // no permission. What it does hold is the mapping, so it is written in
  // the same act as the register and removed in the same act as a
  // revocation, or a revoked key would still resolve to a studio.
  apiKeyIndex: `${P}g:api-keys`,
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
  // THE DAILY GREETING shown across the top of every studio. Platform-level and
  // outside every cascade, the same lifecycle as novaConfig beside it: one small
  // document the console edits, read by every studio, owned by no tenant.
  greetingConfig: `${P}g:greetingConfig`,
  // TODAY'S GENERATED WORDS for the greeting's automated messages — the day it
  // belongs to, and one entry per message id. Separate from greetingConfig
  // deliberately: the config is what a person typed and changes when they say
  // so, this is derived output that turns over on its own at midnight, and
  // writing them together would mean every generation racing every edit.
  greetingToday: `${P}g:greetingToday`,
  // WHICH GOOGLE CALENDAR THE CONSOLE SHOWS. One small object — the calendar's
  // id, its name and timezone, and who connected it. Platform-level, no
  // cascade, the same lifecycle as novaConfig.
  //
  // IT HOLDS NO CREDENTIAL, and that is the whole point of the design: the
  // calendar is read by impersonating pg-gateway@, so there is no access token
  // to encrypt, no refresh token to protect and no expiry to track. See
  // docs/superpowers/specs/2026-09-03-super-google-calendar-design.md §3.
  googleCalendar: `${P}g:googleCalendar`,
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
  // A CONNECTED CALENDAR ACCOUNT, one per provider. Keyed under the USER and not
  // under a studio because the Google or Microsoft account is the person's, not
  // the tenant's — they connect once and it works in every studio they belong
  // to, and it dies with them via the u:<id>:* prefix.
  //
  // ITS OWN KEY, NOT A FIELD ON THE COLLABORATOR ROW. s:<sid>:collaborators is
  // one key holding the whole list and every write to it is a compare-and-set;
  // an hourly per-person token refresh landing there would contend with every
  // membership edit in the studio, for a value no other reader of that row wants.
  calendarConnection: (userId: string, provider: string) =>
    `${P}u:${userId}:cal:${provider}`,
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
// TWO SITES ARE COUNTED NOW, and the website keeps the original key.
//
// Every day of history under `stat:day:<date>` IS website traffic — SiteTracker
// has only ever been mounted on the public layout — so re-keying it would strand
// the whole record under a name nothing reads, which is the tender register's
// mistake at a larger scale. The ERP gets a new namespace beside it instead, and
// "www" resolves to the historic key by construction rather than by a comment
// somebody has to remember.
export type StatSite = "www" | "erp";
const statDay = (isoDate: string) => `${P}stat:day:${isoDate}`;

export const STAT = {
  // `day` USED TO BE EXPORTED HERE and is not any more: once every reader took a
  // site, nothing in src called it, and Gate A's "every key builder is read by
  // something" caught it in the same run that recorded the new goldens. A
  // builder nothing reads is invariant 16 one layer down — a key that can be
  // built and never is. `statDay` survives as the private spelling of the
  // website's historic key, which is what `siteDay` returns for "www".
  siteDay: (site: StatSite, isoDate: string) =>
    (site === "erp" ? `${P}stat:day:erp:${isoDate}` : statDay(isoDate)),
  // CITIES GET THEIR OWN KEY rather than more fields in the day hash. That hash
  // is capped at 300 fields with an overflow bucket, and it holds the page,
  // continent and device counters — a few hundred cities a day would push the
  // PAGES into overflow, so a cardinality the world decides would silently eat a
  // cardinality we control.
  cities: (site: StatSite, isoDate: string) =>
    (site === "erp" ? `${P}stat:city:erp:${isoDate}` : `${P}stat:city:${isoDate}`),
  visitors: (isoDate: string) => `${P}stat:vis:${isoDate}`,
  // Everything past the per-day field ceiling lands here rather than minting a
  // new field. A page that shows up in this bucket is either a typo or an
  // attempt to grow the hash.
  OVERFLOW_FIELD: "pv:__other",
  MAX_FIELDS_PER_DAY: 300,
  // Its own cap, on its own key. Generous because a city is a real reading and
  // the long tail is the interesting part of a traffic map; bounded because the
  // field name comes from a header and is therefore chosen by the world.
  OVERFLOW_CITY: "__other",
  MAX_CITIES_PER_DAY: 500,
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
  // The contact form, per IP. The SECOND endpoint an unauthenticated caller can
  // make write — and unlike traffic ingest, what it writes is an email into a
  // person's inbox, so an unthrottled one is a relay pointed at the owner.
  // Deliberately NOT the credential counters: a contact submission is not a
  // failed login, and borrowing those would let somebody lock themselves out of
  // their own account by filling in a form five times.
  contactIp: (ip: string) => `${P}rl:contact:i:${String(ip || "unknown")}`,

  // The job application form, per IP. The THIRD such endpoint, and the only one
  // that accepts a FILE from an unauthenticated caller — so its window is
  // tighter than the contact form's. Somebody applies for one job, occasionally
  // two; three in an hour is not a candidate.
  applyIp: (ip: string) => `${P}rl:apply:i:${String(ip || "unknown")}`,

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
  // WHO IN THIS STUDIO LETS COLLEAGUES SEE WHEN THEY ARE BUSY — CollaboratorIDs,
  // per invariant 6. A SEPARATE KEY from the person's calendar connection
  // (u:<id>:cal:<provider>) on purpose: cascade-by-prefix destroys this list with
  // its studio while leaving the connection alone, which is the right outcome for
  // somebody who leaves one studio and stays in another. A flag on the connection
  // could not express "shared here, not there" at all.
  calendarShare: (studioId: string) => `${P}s:${studioId}:calendarShare`,
  // LAW 2 — FLOW TEMPLATES AND INDUSTRIES AS DATA A TENANT OWNS.
  //
  // The seven built-in templates and twenty-five industries are SEEDS, in
  // platform/engagement/. These two keys hold what a studio changed: a clone, a
  // reordered stage list, an industry this trade needs that the seed never had.
  // Adding an industry has to be a row rather than a release, and a key is what
  // makes that true.
  //
  // Stored as OVERRIDES, not as a full copy of the seed. A studio that edits
  // one template does not fork the other six — so a later correction to a
  // built-in still reaches every studio that never touched it, and the ones
  // that did keep exactly what they changed.
  flowTemplates: (studioId: string) => `${P}s:${studioId}:flow-templates`,
  industries:    (studioId: string) => `${P}s:${studioId}:industries`,
  notifications: (studioId: string) => `${P}s:${studioId}:notifications`,
  // A STUDIO'S API KEYS — the DIGEST of each, never the key. Beside the
  // flow templates because it is the same kind of thing: studio-wide
  // configuration that belongs to no section, so it needs no section row.
  // A collection would have needed one, and `administration-settings` is
  // declared for ordering and never planted.
  apiKeys:       (studioId: string) => `${P}s:${studioId}:api-keys`,
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
    // THE FUNNEL COMES FIRST, because it is the front of the process: a lead
    // exists before there is a ticket worth opening, and the board is where a
    // studio looks to decide what to work on today. It owns NO COLLECTION — the
    // deals on it are salesTickets, read where they live, the same arrangement
    // Live view and Contracts have. Deleting this section takes no records.
    { key: "crm-sales-pipeline", name: "Pipeline" },
    { key: "crm-sales-tickets", name: "Tickets" },
    { key: "crm-sales-clients", name: "Customers" },
    // THREE PRE-SALES TOOLS MOVED HERE FROM ENGINEERING & DOCUMENTS (tier 5):
    // the RFQ queue, its live view and the quotation numbering. They are how a
    // quotation gets made, and a quotation is a sales act. RE-PARENTED, NOT
    // RENAMED — the keys keep their `engineering-docs-` prefix on purpose:
    // rows are filed by section id, roles grant by area, notification hrefs and
    // live watch keys name these keys, and a rename would break all of that
    // and need a migration. The sidebar groups by parentId, so a studio shows
    // them here once `scripts/migrate/restructure-sections.mjs` re-parents its
    // rows (a new studio is seeded this way). The two whose names collide with
    // Sales' own rows are named for what they are.
    { key: "engineering-docs-rfq", name: "RFQ" },
    { key: "crm-sales-quotations", name: "Quotations" },
    // THE REGISTER, NOT THE ROWS. Contracts and change orders were built as
    // records in P2 with routes and no screen, and they stay in the
    // `crm-sales-quotations` collection below — a contract is what a won
    // quotation becomes, and the two are read together. What this section owns
    // is the DESTINATION: somewhere to go and look at them, and a right that
    // says who may. It deliberately owns no collection, exactly as Live view
    // does, so deleting it takes no records with it.
    { key: "crm-sales-contracts", name: "Contracts" },
    // THE ORDER REGISTER. Same shape as Contracts above and for the same
    // reason — a destination and a right, with the rows under quotations.
    { key: "crm-sales-orders", name: "Sales orders" },
    { key: "crm-sales-live", name: "Live view" },
    { key: "engineering-docs-live", name: "Quotations live view" },
    { key: "crm-sales-settings", name: "Settings" },
    { key: "engineering-docs-settings", name: "Quotation settings" },
  ] },

  // THE FIRST OF TENDERING'S FIVE. The root was declared for ordering alone at
  // the restructure — "a nav row that opens nothing is worse than an absent
  // one" — and was hidden by NO_SCREEN_YET until it had one. The register is
  // that screen; the BOQ grid, bid documents, bid approval and the handover to
  // Projects follow.
  { key: "tendering", name: "Tendering & Estimating", children: [
    { key: "tendering-register", name: "Tender register" },
    // The library is a register in its own right — the studio's rates, kept
    // between bids — so it gets a nav row. The BILL of quantities does not: a
    // bill belongs to one tender and is reached from it, the same way a
    // ticket's profile is reached from the ticket list.
    { key: "tendering-rates", name: "Rate library" },
  ] },

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
    // RFQ, Live view and Settings moved under CRM & Sales (tier 5) — see the
    // note there. Their keys still start `engineering-docs-`, deliberately.
  ] },

  // Procurement starts with the supplier master, which is the one part of it
  // that already exists — it was Inventory's Vendors screen.
  { key: "procurement", name: "Procurement & Subcontracting", children: [
    { key: "procurement-requisitions", name: "Requisitions" },
    { key: "procurement-rfq", name: "Supplier quotes" },
    { key: "procurement-expediting", name: "Expediting" },
    { key: "procurement-subcontracts", name: "Subcontracts" },
    { key: "procurement-receiving", name: "Receiving" },
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
    // and the studio's work-week shading — on its own grant. Shifts live under
    // the field-service ROOT section and are read through that door, so this
    // key gates that screen and its writes rather than owning them; what it
    // does own is `jobs`, the short-form execution unit dispatched from here
    // (see SECTION_COLLECTIONS below).
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
    // ACCESS ARRIVES LATE, and that is why it is the one new seeded key in the
    // fold. The roles screen existed throughout the restructure but was never a
    // section: it was a hardcoded nav row gated on canAdminister, a mechanism
    // nothing else in the nav uses. Giving it a section and an area of its own
    // is what lets a studio hand role management to somebody without making
    // them an admin — escalates() still decides what any of them may grant.
    { key: "administration-access", name: "Access" },
    // MASTER DATA OWNS LOCATIONS NOW (SECTION_COLLECTIONS below). It is the
    // studio's own reference records rather than any department's, which is
    // why a location belongs here and not on the rota that happens to use one.
    { key: "administration-master", name: "Master data" },
    { key: "administration-settings", name: "Studio settings" },
  ] },

  { key: "tasks", name: "Tasks", children: [
    { key: "tasks-settings", name: "Task settings" },
  ] },
];

// Flat list of every seeded key, parents and children alike.
export const ALL_SECTION_KEYS = SECTION_DEFS.flatMap((d) => [d.key, ...(d.children || []).map((c) => c.key)]);

// ADMINISTRATION IS NOT A SECTION — the owner's instruction, 09/09/2026.
//
// It carries People, Access, Master data and Studio settings: the studio's own
// system configuration. None of it is a step in the flow of the product the way
// Projects or Finance are, and presenting it as a peer of the fourteen told
// every tenant that "Administration & Settings" was a department they run.
//
// THE ROWS STAY, AND THAT IS NOT A HALF-MEASURE. `administration-master` OWNS
// `locations`, `departments` and `costCodeLibrary`; `administration-settings`
// owns `recordTypes`; and seven modules resolve one or the other as a FOREIGN
// section (hr, inventory, operations, projects, quality, main, and the roles
// route). A row here is where a record is FILED — not what the nav calls a
// department. Deleting the rows would strand every location and every
// department in every live studio: the tender register's mistake, at the scale
// of the whole tenant base, and invariant 17's reason for existing.
//
// SO THIS LIST IS THE SEAM. Seeding, planting, cascade and every foreign-section
// lookup still see these keys, so nothing is stranded and no migration runs.
// Everything that PRESENTS a section as part of the product filters them out:
// the sidebar tree, the marketing site's department list, and the count that
// used to say fifteen. What replaces the nav rows is a Settings surface reached
// from the shell — same URLs, same rights, off the department list.
export const SYSTEM_SECTION_KEYS = [
  "administration",
  "administration-members",
  "administration-access",
  "administration-master",
  "administration-settings",
] as const;

/** Is this key system configuration rather than one of the product's sections? */
export const isSystemSection = (key: string): boolean =>
  (SYSTEM_SECTION_KEYS as readonly string[]).includes(key);

// THE PRODUCT'S OWN SECTIONS — fourteen roots, plus Main and Tasks, which are
// not sections either (Main is the home surface, Tasks a cross-cutting control).
// Derived rather than hand-listed: a second copy would be free to disagree with
// SECTION_DEFS the first time one of them changed, which is the failure the
// fifteen-section restructure kept finding.
export const PRODUCT_SECTION_DEFS = SECTION_DEFS.filter((d) => !isSystemSection(d.key));
export const PRODUCT_SECTION_KEYS = ALL_SECTION_KEYS.filter((k) => !isSystemSection(k));

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
  // Contracts live with quotations rather than in a sub-section of their own,
  // because a contract is what a won quotation becomes and the two are read
  // together — the crm-sales-contracts REGISTER owns no collection, only the
  // destination. Its stage registry entry used to answer to the quotations
  // right for the same reason and no longer does: the register gave contracts
  // `crmSales.contracts.*`, so the entry names that and carries a `screenKey`
  // pointing at the register, while THIS line still says where the rows live.
  // SALES ORDERS SIT HERE TOO, and for the reason contracts do: an order is
  // read beside the offer it came from, and giving it a collection section
  // of its own would mean a section to plant on every existing studio
  // before a single order could be written. `crm-sales-orders` below is a
  // DESTINATION and owns nothing.
  "crm-sales-quotations": ["quotations", "generatedDocuments", "contracts", "changeOrders", "salesOrders"],
  // tendering. The register OWNS its records — unlike crm-sales-contracts,
  // which is a destination over somebody else's rows — so deleting the section
  // takes the tenders with it (invariant 11, children first).
  // The register owns the tenders AND their bills: a bill has no meaning apart
  // from the tender it prices, so deleting the section takes both (invariant
  // 11, children first).
  // THE PACK AND THE QUESTIONS BELONG TO THE TENDER, so they live in the
  // register's section with it and the bill — a document is reached from the
  // tender it belongs to, never from a register of its own.
  "tendering-register": ["tenders", "boqItems", "tenderDocuments", "tenderClarifications"],
  "tendering-rates": ["tenderRates"],
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
  // projects — the project list, and the labour booked against it. A timesheet
  // lives HERE rather than under `projects-overtimes` (which holds the older,
  // overtime-only record) because it is the full labour record for a deal
  // whether or not that deal is executed as a project: filing it under a
  // sub-section named for one kind of hour would hide the normal ones.
  // Inspections sit here for a reason that is a compromise and says so: they
  // belong to Quality & HSE, which is in NO_SCREEN_YET and holds no permission
  // areas by design — a right nothing can exercise is a bug (invariant 16) — so
  // filing them there would strand real rows under a section that renders
  // nothing and gates on no right. They move when Quality gets a screen.
  // The cost breakdown lives with the project it belongs to — it is reached
  // from one and from nowhere else, the way a bill is reached from its tender.
  "projects-list": ["projects", "timesheets", "inspections", "projectCosts", "projectMilestones", "siteReports"],
  "projects-sla": ["slas"],
  "projects-overtimes": ["overtimes"],
  // procurement — the supplier master, carried over from Inventory's Vendors
  // screen.
  // THE REQUEST THAT STANDS BEFORE A PURCHASE ORDER. Its own collection rather
  // than a status on `materialOrders`: an order that was never approved is a
  // contradiction, and a requisition that is refused must still be a record.
  "procurement-requisitions": ["requisitions"],
  // THE REQUEST AND THE ANSWERS ARE SEPARATE COLLECTIONS. A quote is another
  // party's document: it arrives on its own schedule and is written by whoever
  // opens the envelope, so nesting them on the request would make recording one
  // supplier's price a write to the row every other supplier is quoting against.
  "procurement-rfq": ["supplierRfqs", "supplierQuotes"],
  // THE PACKAGE AND ITS VALUATIONS ARE SEPARATE. A certificate is a periodic
  // document with its own number, status and back-charges; nesting them would
  // make writing one period a write to the record every other period is also
  // valued against.
  "procurement-subcontracts": ["subcontracts", "paymentCertificates"],
  // THE SCORECARDS ARE THEIR OWN COLLECTION AND THE DOCUMENTS ARE NOT.
  // Licences and insurance certificates are a handful per supplier and stop
  // arriving, so they sit on the record the way an order carries its chases.
  // A scorecard lands every period forever, which is precisely the "array that
  // grows without bound" the migration design refuses to nest.
  "procurement-suppliers": ["inventoryVendors", "supplierScorecards"],
  // inventory — Project Sheets owns the sheets and their orders sub-sheet,
  // matching the Old System, where Sheets lives under Inventory (not Projects).
  inventory: ["deliveries"],
  // WHICH MACHINE IS ON WHICH JOB. On the Assets ROOT rather than under one
  // of its engine registers: an allocation is about an asset and a deal, and
  // the equipment register is a list of what the studio owns rather than the
  // owner of what those things are doing.
  assets: ["assetAllocations"],
  // A BILL OF MATERIALS' LINES, on the Manufacturing ROOT rather than under
  // the BOM engine register. The register's rows live in `engineRecords`
  // under `engine-bom`, and a collection under a section only some studios
  // have planted would strand every line written before it — the tender
  // register's mistake. The root is always there.
  manufacturing: ["bomLines", "shopfloorRuns", "qcChecks"],
  // A SAVED REPORT IS A QUESTION, NOT AN ANSWER — it stores a spec and
  // nothing it computed, so the rows it can reach are always the reader's
  // own. A target is a line drawn across one.
  reports: ["savedReports", "kpiTargets"],
  // BINS SIT WITH THE MOVEMENTS THEY SPLIT. A bin balance is the stock
  // ledger grouped by bin, so the two must be written under one section or
  // a live update on one would never reach a screen watching the other.
  "inventory-stock": ["inventoryStock", "stockAdjustments", "stockBins", "stockBatches"],
  "inventory-items": ["inventoryItems"],
  // GOODS RECEIPTS SIT WITH THE ORDERS THEY ANSWER. `receiveOrder` is
  // Inventory's and writes them, so they are written where Inventory already
  // writes; Procurement's Receiving screen reads them through its foreign
  // `orders` section. Putting them under `procurement-receiving` would strand
  // every receipt the day the section was planted.
  "inventory-sheets": ["projectSheets", "materialOrders", "goodsReceipts"],
  // AWB tracking owns the shipments it follows and the airline registry that
  // resolves a waybill's 3-digit prefix to a carrier.
  "logistics-shipments": ["awbShipments", "awbAirlines"],
  // FREIGHT, DUTY AND HANDLING AGAINST A PURCHASE ORDER. On the Logistics
  // ROOT rather than under Shipments: a landed cost attaches to the ORDER the
  // goods came on, and an air waybill is one of several ways they might have
  // travelled. Putting it under the AWB register would strand every charge on
  // a shipment that arrived by sea.
  logistics: ["landedCosts"],
  // hr — the reference list belongs to the Employees screen; vacations are
  // studio-wide HR settings.
  //
  // `departments` and `positions` are deliberately not HR's. The org chart is
  // a collection again, but under `administration-master` above: reference data
  // that HR, Projects and Quality all read belongs to none of them, and
  // re-parenting a department widens an access scope. A position was a second
  // name for a role, which lives in s:<StudioID>:roles — that one is still gone
  // for good.
  hr: ["vacations"],
  // Pay records and payroll runs sit with the employees they belong to.
  "hr-employees": ["certifications", "payRecords", "payrollRuns", "attendance", "manpowerPlans"],
  // finance
  // Cash: what we billed, what we spent, and what actually moved. `payments`
  // lives beside the invoices it settles rather than under the ledger, because
  // a payment is a cash movement and the ledger holds the POSTINGS that describe
  // one — filing it there would put the event and its bookkeeping in the same
  // place and make the ledger the system of record for money it only reports on.
  // POST-DATED CHEQUES AND LETTERS OF GUARANTEE sit with Cash: both are money
  // in flight rather than ledger entries, and the forecast that reads them is
  // assembled from the receivables beside them.
  "finance-cash": ["invoices", "expenses", "payments", "creditNotes", "cheques", "guarantees"],
  // The chart of accounts and the journal. A journal entry is never edited once
  // posted — only reversed by a mirror entry — so there is no separate
  // "reversals" collection: a reversal is just another journalEntry.
  // A CLOSED MONTH is a row under the ledger it locks.
  "finance-ledger": ["accounts", "journalEntries", "accountingPeriods", "bankStatementLines"],
  // Payables: bills we owe vendors, with their own payment history. Assets: the
  // fixed-asset register — depreciation is derived, never stored, so there is no
  // schedule collection.
  "finance-payables": ["bills"],
  "finance-assets": ["fixedAssets"],
  // field-service — was Operations. LOCATIONS HAVE LEFT: Administration's
  // Master data screen exists now, so the condition this comment used to state
  // is met, and a collection is re-homed only into a section that can actually
  // open it. Permits stay until Quality & HSE has a screen, on the same rule.
  //
  // Operations still READS locations — a shift and a permit each name one —
  // through a foreign section on its context, the same way Finance reads
  // Projects. Reading a collection is not owning it; what moved is which
  // section deletes them.
  "field-service": ["shifts", "permits"],
  // A JOB IS DISPATCHED FROM THE SCHEDULE, so it is owned by the Schedule
  // sub-section rather than by the field-service root: a studio that deletes
  // Schedule is a studio that stopped dispatching, and its jobs should go with
  // it. Shifts stay on the root because they are coverage — who is at a place
  // for a stretch of time — which the Tracking and Settings tabs read too.
  "field-service-schedule": ["jobs"],
  // One last-known position per person, never a movement trail.
  "field-service-tracking": ["trackingPositions"],
  // administration — the studio's own reference records, owned by no department.
  // A LOCATION IS NOT THE ROTA'S. Shifts and permits each name one, which is
  // why it lived on the Field Operations screen that drew it; but a place the
  // studio works from outlives any one rota, and Quality's permits and
  // Projects' sites will want the same list. Master data owns it, Operations
  // reads it through a foreign section, and deleting Master data is what
  // deletes locations — which is exactly the coupling worth being deliberate
  // about, because shifts and permits hold ids into this collection.
  // DEPARTMENTS JOIN LOCATIONS, and for the same reason. A studio's org chart
  // is read by HR (whose records you may see), by Projects (who an assignment
  // belongs to) and by Quality (which department owns a controlled document) —
  // reference data three departments read belongs to none of them. It used to
  // be derived from the section list, which made every studio's org chart the
  // product's fifteen nav entries; see shared/departments/starters.ts.
  // AND THE COST CODE LIBRARY, for the third time the same argument: a
  // standard breakdown is read by Projects (which copies it into a budget)
  // and by Finance (which codes a bill against it) and is owned by neither.
  // It is a COLLECTION rather than a field of the studio record — the way
  // units and the numbering series went — because the studio record is read
  // on every request in the product and a library of two hundred codes would
  // be carried into all of them.
  "administration-master": ["locations", "departments", "costCodeLibrary"],
  // THE ENGINE'S TWO COLLECTIONS, and no more. A record type is a ROW, so a
  // collection per type would need a deploy per type — the thing runtime was
  // chosen to avoid. Instances are discriminated by `typeKey` inside
  // `engineRecords`. Invariant 1 is untouched: two builders, not one per type.
  //
  // UNDER `administration-settings` because a record TYPE is studio
  // configuration, not any one department's data — the same place the flow
  // templates and the studio's own settings live.
  //
  // THE RECORDS ARE NOT HERE, AND THEY WERE. They live under the type's OWN
  // planted section (`engine-<typeKey>`, per `platform/engine/sections.ts`),
  // which this map cannot name because it is compile-time and a type is a row.
  // They moved because a write publishes an event carrying the section it was
  // written under, and the stream route asks `sectionViewable` about that key:
  // under this one the question was `administration.settings`, so a member
  // holding exactly `engine.<typeKey>.view` heard nothing about their own
  // records while a settings-holder heard about records they may not read.
  //
  // NOTHING IS STRANDED BY BEING UNNAMEABLE HERE. This map answers "what to
  // READ", and `cascadeDeleteSection` deliberately does not use it — it calls
  // `pgDeleteAllForSection`, scoped by tenant and section id rather than by
  // catalogue, precisely so the keys `appendSection` mints at runtime are
  // reaped too. That decision was made for an earlier one-store survivor and it
  // is what makes a runtime section safe to store rows under at all.
  "administration-settings": ["recordTypes"],
  // tasks
  tasks: ["tasks"],
};

// ---- studio slug rules -----------------------------------------------------
// The slug IS the studio's address (nompany.com/<slug>) and its tenant handle.
// EVERY SEGMENT THE PUBLIC SITE OWNS OR INTENDS TO OWN IS IN HERE, and this
// list had drifted badly. `platform`, `security`, `privacy` and `customers`
// were all takeable — but the dangerous ones were `projects`, `services`,
// `vendors` and `clients`, every one of which the proxy 308s to a marketing
// page. (`gallery` was a fifth until the redirect was dropped: reserving a
// word a studio might want, to keep links to a page nothing was likely to link
// to, was the wrong side of that trade.) A studio registering one would have been permanently
// redirected away from its own address by a table it could not see, and
// nothing in the product could have explained why.
//
// IT IS SPELLED OUT RATHER THAN DERIVED, deliberately. `shared/marketing/routes`
// knows all of these and could compute them, but this module is a LEAF on
// purpose — no imports at all, because a landing-page component imports a key
// builder and the cascade discipline rests on nothing here depending on
// anything else. The suite holds the two in step instead: the same guarantee,
// bought with an assertion rather than a dependency.
export const RESERVED_SLUGS = new Set([
  "www", "api", "studio", "super", "account", "login", "signup", "admin", "join",
  "app", "mail", "onboarding", "subscribe", "team", "verify", "reset", "forgot",
  "en", "ar", "robots", "sitemap", "manifest", "icon", "favicon", "brand",
  "_next", "c", "q",
  // the public site: built, retired, and reserved for later
  "about", "careers", "contact", "customers", "platform", "pricing", "privacy",
  "security", "terms",
  "clients", "features", "projects", "services", "vendors",
  "blog", "changelog", "docs", "help", "legal", "status", "support",
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
