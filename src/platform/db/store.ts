// THE STORE'S PUBLIC DOOR. Every repository goes through these helpers; nothing
// else touches the database directly.
//
// THE IMPLEMENTATION MOVED TO POSTGRES; THIS FILE'S API DID NOT. Every primitive
// below used to be a Redis command issued from here. They are now rows in the
// `documents` and `events` tables, and pgStore.ts holds every line of the SQL
// that makes that true. This file is deliberately a FACADE over it rather than a
// second copy of its signatures: ~109 call sites import from `@/platform/db/store`
// and not one of them changed, and a re-export cannot drift from what it
// re-exports the way a hand-written wrapper can.
//
// WHY THE VALUES ARE `unknown` AND NOT `any`. What a key holds is decided by the
// repository that wrote it, and this layer has no way to know. `any` would let
// that ignorance travel: every caller would silently receive a value it could
// dereference however it liked, and the strictness this folder gained would stop
// at the first `getJSON`. `unknown` makes the caller say what it expects, which
// is where the knowledge actually is — so the generic parameter on each read is
// the honest form, defaulting to `unknown` for callers that do not care.
//
// Design notes, all still true after the move:
//  • JSON documents/arrays are plain string keys (the ones keys.ts builds), and
//    the stored column is `json` and never `jsonb` — jsonb normalises key order
//    and the goldens pin it.
//  • EVERY read-modify-write goes through editArr/editJSON (compare-and-set,
//    invariant 8). readArr/writeArr and getJSON/setJSON remain for pure reads
//    and for blind whole-value writes that depend on nothing they overwrite.
//    There is deliberately no `writeCol`.
//  • Retry backoff is small and FLAT, never exponential (invariant 9).
//  • Reference numbers only move forward (invariant 10) — see bumpCounter.
//  • An empty prefix is refused by both scanPrefix and delPrefix (invariant 17).
//  • Uniqueness claims are now `INSERT ... ON CONFLICT`, which is atomic in the
//    database's own terms rather than in a single-threaded server's.
//
// WHAT CHANGED IN BEHAVIOUR, both documented at their definitions in pgStore.ts:
//  • pfAdd/pfCount are an EXACT distinct count now, not a HyperLogLog estimate.
//  • memoryPolicy reports Postgres honestly — there is no eviction policy to get
//    wrong — instead of echoing a Redis setting that no longer exists.

// TYPES FIRST, and re-exported with `export type` rather than a bare `export`:
// this project builds under isolatedModules, where a type re-exported as a value
// is a runtime import of something that does not exist at runtime.
export type { Row, EditOutcome, StreamEntry } from "./pgStore";

export {
  // ---- JSON documents ------------------------------------------------------
  // getJSON is THE ONE READ FUNNEL, and therefore the one place the request
  // cache attaches. getJSONMany is its batched form: one statement for many
  // distinct keys, which is what turned the getProfile-per-employee N+1 (R9)
  // into a single round trip.
  getJSON,
  getJSONMany,
  setJSON,
  setJSONEx,
  readArr,
  writeArr,
  delKeys,

  // ---- TTLs ----------------------------------------------------------------
  // Expiry is a column now, and every read filters on it, so a lapsed key reads
  // as absent whether or not anything has reclaimed the row — correctness never
  // waits on a sweeper.
  touchTTL,
  consume,
  incrWithTTL,
  ttlOf,
  extendTTL,

  // ---- atomic read-modify-write (invariant 8) ------------------------------
  // A collection lives in ONE key holding the whole array, so "read it, change
  // one row, write it back" loses data whenever two of those overlap. editJSON
  // and editArr close that window with a compare-and-set on `row_version`, and
  // a function patch is re-applied on each attempt rather than computed once.
  editJSON,
  editArr,
  ConflictError,
  isConflict,

  // ---- uniqueness claims / TTL indexes -------------------------------------
  claim,
  getIndex,
  release,

  // ---- sets, sorted sets ---------------------------------------------------
  sAdd,
  sRem,
  sMembers,
  sCard,
  zAdd,
  zRange,
  zRem,
  zCard,

  // ---- counters and hashes -------------------------------------------------
  // bumpCounter is the one that carries invariant 10: a reference number only
  // ever moves forward, and the caller-supplied floor is what makes the first
  // call self-seeding for a studio that already holds records.
  hIncrBy,
  bumpCounter,
  hIncrBounded,
  hGetAll,
  hDel,
  hSet,
  hSetNX,

  // ---- distinct counting ---------------------------------------------------
  pfAdd,
  pfCount,

  // ---- streams (the append-only event log, invariant 12) -------------------
  // The id is still the client's cursor and still shaped "<n>-<m>", so
  // Last-Event-ID replay and the "0-0" start-from-now sentinel are unchanged.
  xAdd,
  xAfter,
  xLastId,

  // ---- infrastructure ------------------------------------------------------
  memoryPolicy,

  // ---- prefix scan / delete (THE cascade primitive) ------------------------
  // Both refuse an empty prefix before a query is built. `key LIKE '%'` is every
  // row exactly as `*` was every key, and an ad-hoc script's delPrefix("")
  // emptied production once.
  scanPrefix,
  delPrefix,
} from "./pgStore";
