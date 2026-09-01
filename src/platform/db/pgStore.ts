// THE DOCUMENT STORE, IN POSTGRES — every primitive store.ts used to reach
// Redis for, answered by the `documents` and `events` tables instead.
//
// store.ts is now a facade over this file: same names, same signatures, same
// return shapes, so none of its ~109 call sites changed. Everything that was a
// Redis key is a row in `documents`, keyed by the identical string
// platform/db/keys.ts already builds. `collection_rows` is NOT this file's
// table — that is pgRows.ts, it is tenant-scoped, and it goes through
// withTenant. These keys are platform-scoped (`u:<id>:profile` belongs to an
// account, `g:studios` to the platform), there is no tenant column to key a
// policy on, and Redis enforced nothing either — so they go through pgQuery.
//
// ---- the six decisions that shape everything below -------------------------
//
// 1. `value` IS `json`, NEVER `jsonb`. jsonb normalises key order (length,
//    then bytewise) and this product's golden responses pin key order. `json`
//    stores the text verbatim, so a document written by JSON.stringify comes
//    back in the order it was written. Every mutation below therefore happens
//    in JavaScript and is written back whole, rather than being edited in SQL:
//    Postgres has no concatenation operator on `json` at all (`||` is
//    jsonb-only), so the SQL route would mean casting through jsonb, which is
//    the one thing this column exists to avoid.
//
// 2. AN EXPIRED ROW READS AS ABSENT EVERYWHERE. Every read carries
//    `expires_at IS NULL OR expires_at > now()`, so correctness never waits on
//    a sweeper — the sweeper (purgeExpired, at the foot of this file) only
//    reclaims space. Redis deleted an expired key for us; Postgres will not,
//    which is why the predicate is a rule here and not an optimisation.
//
// 3. COMPARE-AND-SET IS `row_version`, AND IT DID NOT WEAKEN (invariant 8).
//    Redis compared a SHA-1 of the stored string inside a Lua script; here a
//    writer carries the version it read in its WHERE clause, so a concurrent
//    write makes it miss and re-apply rather than silently discard the other
//    writer's change. `updateRow`-style function patches are re-applied on each
//    attempt, never computed once. See `cas` below for why one statement still
//    hands back the value that is actually there — one round trip per attempt,
//    exactly as the Lua script gave.
//
// 4. BACKOFF STAYS SMALL AND FLAT (invariant 9). Every contended round has
//    exactly one winner, so N writers need N rounds — a queue draining, not a
//    livelock. Exponential backoff would idle the row while writers that could
//    progress waited.
//
// 5. THE HASH/SET/SORTED-SET/HLL SHAPES ARE JSON INSIDE THAT ONE `value`, and
//    each is mutated through the same compare-and-set as any other document.
//    Redis gave those types server-side atomicity (HINCRBY, SADD, ZADD) which
//    a whole-value rewrite does not — the compare-and-set is what replaces it,
//    and it is strictly stronger than the read-modify-write it would otherwise
//    have degraded into. Twenty concurrent hIncrBy still land twenty.
//
// 6. TWO PLACES ARE STRICTLY BETTER THAN WHAT THEY REPLACE, and both are
//    called out where they happen: `claim` is an INSERT ... ON CONFLICT rather
//    than a SETNX plus a race window, and `pfAdd`/`pfCount` are an EXACT set
//    rather than a HyperLogLog's ~0.81% estimate.
//
// SIBLINGS IMPORT EACH OTHER RELATIVELY (`./pg`, `./keys`, `./requestCache`) —
// CLAUDE.md's rule, and the reason `platform/db` has no barrel. `@/platform/http`
// is a different platform folder, so it goes through the alias, exactly as
// pgRows.ts does.
import { pgQuery } from "./pg";
import { TBL } from "./keys";
import { cachedRead, cachedReadMany, invalidate } from "./requestCache";
import { log } from "@/platform/http/observability";

const D = TBL.docs;
const C = TBL.docCols;
const EV = TBL.events;
const EC = TBL.eventCols;

// THE ABSENCE PREDICATE, in one place. Written as a function of the alias
// rather than a constant because half these statements join `documents` to
// itself (see `cas`) and an unqualified column there is ambiguous.
const live = (alias = "") => {
  const col = `${alias}${C.expiresAt}`;
  return `(${col} IS NULL OR ${col} > now())`;
};

// A TTL, AS AN EXPIRY INSTANT. `make_interval(secs => ...)` rather than string
// concatenation into an `interval` literal — the seconds are a bind parameter
// like every other value in this file, never text spliced into SQL.
const expiryAt = (param: string) => `now() + make_interval(secs => ${param}::float8)`;

/** A row in a collection. Repositories narrow this; the store never does. */
export type Row = Record<string, unknown>;

// The stored document, as it comes back. `row_version` being present is what
// says "this row exists" — `value` cannot, because a document may legitimately
// hold JSON `null`, which is indistinguishable from an absent row once parsed.
type Stored = { value: unknown; version: number | null };

const ABSENT: Stored = { value: null, version: null };

// THE RAW READ, deliberately NOT through the request cache. A compare-and-set
// must see the value as it actually stands at the instant of the write, never a
// remembered one — the same rule editJSON's Redis ancestor followed by reading
// through getRaw instead of getJSON.
async function readStored(key: string): Promise<Stored> {
  const { rows } = await pgQuery<{ value: unknown; version: number }>(
    `SELECT ${C.value} AS value, ${C.version} AS version FROM ${D} WHERE ${C.key} = $1 AND ${live()}`,
    [key],
  );
  return rows.length ? { value: rows[0].value, version: rows[0].version } : ABSENT;
}

// ---- JSON documents --------------------------------------------------------
export async function getJSON<T = unknown>(key: string): Promise<T | null> {
  // THE ONE READ FUNNEL, so this is the one place the request cache attaches.
  // editJSON deliberately does NOT come through here — see requestCache.ts.
  return cachedRead<T | null>(key, async () => {
    const { value, version } = await readStored(key);
    return version == null ? null : (value as T);
  });
}

// BATCHED JSON READ — one statement for many keys, so a list of distinct
// documents costs one round trip instead of one per key (R9: the
// getProfile-per-employee N+1). `= ANY($1)` is Postgres's MGET, and it is the
// same shape: one command, one result set, absent keys reading as null.
//
// Routed through the request cache like getJSON: keys already in flight are
// reused, and only the genuine misses go on the wire.
export async function getJSONMany<T = unknown>(keys: string[]): Promise<(T | null)[]> {
  if (!keys.length) return [];
  return cachedReadMany<T | null>(keys, async (missing) => {
    const { rows } = await pgQuery<{ key: string; value: unknown }>(
      `SELECT ${C.key} AS key, ${C.value} AS value FROM ${D} WHERE ${C.key} = ANY($1::text[]) AND ${live()}`,
      [missing],
    );
    // ORDER IS THE CALLER'S, NOT THE DATABASE'S. cachedReadMany's contract is
    // one value per key IN THE ORDER GIVEN, and a SELECT ... = ANY() promises
    // no order at all — so the result is indexed and read back positionally
    // rather than assumed to line up.
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return missing.map((k) => (byKey.has(k) ? (byKey.get(k) as T) : null));
  });
}

// A BLIND WHOLE-VALUE WRITE, which is what SET was: it lands unconditionally
// and it CLEARS ANY EXPIRY, exactly as Redis's SET (without KEEPTTL) did.
// Legitimate only where the write depends on nothing it overwrites; everything
// else goes through editJSON.
export async function setJSON(key: string, value: unknown): Promise<void> {
  await writeDoc(key, value, null);
  invalidate(key);
}

// Self-expiring JSON document (OTP challenges). The expiry is an instant in
// `expires_at`, and every read filters on it, so the challenge is unreadable
// the moment it lapses whether or not anything has reclaimed the row.
export async function setJSONEx(key: string, value: unknown, ttlSec: number): Promise<void> {
  await writeDoc(key, value, ttlSec);
  invalidate(key);
}

async function writeDoc(key: string, value: unknown, ttlSec: number | null): Promise<void> {
  await pgQuery(
    `INSERT INTO ${D} (${C.key}, ${C.value}, ${C.expiresAt})
     VALUES ($1, $2::json, ${ttlSec == null ? "NULL" : expiryAt("$3")})
     ON CONFLICT (${C.key}) DO UPDATE
        SET ${C.value}      = EXCLUDED.${C.value},
            ${C.expiresAt}  = EXCLUDED.${C.expiresAt},
            ${C.updatedAt}  = now(),
            ${C.version}    = ${D}.${C.version} + 1`,
    ttlSec == null ? [key, JSON.stringify(value)] : [key, JSON.stringify(value), ttlSec],
  );
}

// Re-arm (or shorten) the expiry on a key that already exists. editJSON with
// keepTTL leaves the countdown where it was, which is right for a challenge and
// wrong for anything whose TTL means "idle for this long" — a live chat room
// has to start counting again on every message. Returns false when the key is
// already gone, which is how a caller learns its TTL elapsed mid-write.
export async function touchTTL(key: string, ttlSec: number): Promise<boolean> {
  const { rowCount } = await pgQuery(
    `UPDATE ${D} SET ${C.expiresAt} = ${expiryAt("$2")}, ${C.updatedAt} = now()
      WHERE ${C.key} = $1 AND ${live()}`,
    [key, ttlSec],
  );
  return rowCount === 1;
}

// Atomic single-use consume: returns true only for the caller that removed it,
// so two parallel verifications of the same code can never both succeed. A
// DELETE reports how many rows it actually removed, and only one of two
// concurrent deletes can remove the same row — the guarantee is the database's,
// not this function's.
//
// The `live()` predicate is why an ALREADY-EXPIRED code cannot be consumed: the
// row may still be sitting there, but it reads as absent, so this answers false
// rather than handing a lapsed challenge to whoever asked first.
export async function consume(key: string): Promise<boolean> {
  invalidate(key);
  const { rowCount } = await pgQuery(
    `DELETE FROM ${D} WHERE ${C.key} = $1 AND ${live()}`,
    [key],
  );
  return rowCount === 1;
}

// Fixed-window counter: increment, and set the window on the FIRST hit only.
// Returns the running count so callers can compare against their limit.
//
// ONE STATEMENT, WHERE REDIS NEEDED TWO. `INCR` then `EXPIRE if n === 1` had a
// window in which a process dying between the two left an immortal counter;
// INSERT ... ON CONFLICT does both indivisibly. An expired row is treated as
// the start of a fresh window — it read as absent, so it must count as one.
export async function incrWithTTL(key: string, ttlSec: number): Promise<number> {
  const stale = `(${D}.${C.expiresAt} IS NOT NULL AND ${D}.${C.expiresAt} <= now())`;
  const { rows } = await pgQuery<{ n: string }>(
    `INSERT INTO ${D} (${C.key}, ${C.value}, ${C.expiresAt})
     VALUES ($1, '1'::json, ${expiryAt("$2")})
     ON CONFLICT (${C.key}) DO UPDATE
        SET ${C.value}     = (CASE WHEN ${stale} THEN 1
                                   ELSE (${D}.${C.value}::text)::numeric + 1 END)::text::json,
            ${C.expiresAt} = CASE WHEN ${stale} THEN ${expiryAt("$2")} ELSE ${D}.${C.expiresAt} END,
            ${C.updatedAt} = now(),
            ${C.version}   = ${D}.${C.version} + 1
     RETURNING ${C.value}::text AS n`,
    [key, ttlSec],
  );
  invalidate(key);
  return Number(rows[0].n);
}

// Seconds left on a key: -1 when it has no expiry, -2 when it is gone. A
// lockout is only useful if the caller can say HOW LONG for, and the expiry the
// row is already carrying is that answer — there is nothing to store separately.
export async function ttlOf(key: string): Promise<number> {
  const { rows } = await pgQuery<{ ttl: number }>(
    `SELECT CASE WHEN ${C.expiresAt} IS NULL THEN -1
                 ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (${C.expiresAt} - now()))))::int END AS ttl
       FROM ${D} WHERE ${C.key} = $1 AND ${live()}`,
    [key],
  );
  return rows.length ? rows[0].ttl : -2;
}

// LENGTHEN an existing window without restarting the count. `incrWithTTL` sets
// the expiry on the first hit only, which is right for a fixed window and wrong
// for an escalating lockout: tripping a limit has to be able to push the
// release further out while leaving the tally where it is.
//
// ONE STATEMENT, and the WHERE clause IS the comparison Redis needed a separate
// TTL read for: "already locked for at least this long" is exactly
// `expires_at >= now() + ttl`, so refusing it is a predicate rather than a
// round trip. A key with NO expiry gains one, which is what the Redis version
// did too (its `-1 >= ttlSec` was false, so it fell through to EXPIRE).
export async function extendTTL(key: string, ttlSec: number): Promise<boolean> {
  const { rowCount } = await pgQuery(
    `UPDATE ${D} SET ${C.expiresAt} = ${expiryAt("$2")}, ${C.updatedAt} = now()
      WHERE ${C.key} = $1 AND ${live()}
        AND (${C.expiresAt} IS NULL OR ${C.expiresAt} < ${expiryAt("$2")})`,
    [key, ttlSec],
  );
  return rowCount === 1;
}

export async function readArr<T = Row>(key: string): Promise<T[]> {
  return (await getJSON<T[]>(key)) || [];
}
export async function writeArr(key: string, rows: readonly unknown[]): Promise<void> {
  await setJSON(key, rows);
}

// COUNTS WHAT REDIS WOULD HAVE COUNTED, AND DELETES MORE THAN THAT. An expired
// row is already absent as far as every reader is concerned, so it must not
// appear in the count a caller uses to report "n keys removed" — but it is
// still occupying a page, and a cascade sweeping a prefix is the one moment it
// is cheapest to reclaim. So the DELETE is unconditional and the COUNT is not,
// which one RETURNING clause gives without a second statement.
export async function delKeys(...keys: (string | string[])[]): Promise<number> {
  const flat = keys.flat().filter(Boolean);
  if (!flat.length) return 0;
  invalidate(flat);
  let n = 0;
  // BATCHED AT 100, carried over from the Redis version. A single ANY() would
  // take the whole list, but a cascade can hand this thousands of keys and a
  // bind parameter that large is one statement nothing can be read out of when
  // it is slow. The batch size is the one thing about this that is arbitrary.
  for (let i = 0; i < flat.length; i += 100) {
    const { rows } = await pgQuery<{ live: boolean }>(
      `DELETE FROM ${D} WHERE ${C.key} = ANY($1::text[]) RETURNING ${live()} AS live`,
      [flat.slice(i, i + 100)],
    );
    n += rows.filter((r) => r.live).length;
  }
  return n;
}

// ---- atomic read-modify-write ----------------------------------------------
// A collection lives in ONE key holding the whole array, so "read it, change one
// row, write it back" loses data whenever two of those overlap: both read the
// same array, and the second write erases the first one's change. Two people
// ticking different checklist items, or two admins approving two different join
// requests, is enough.
//
// editArr/editJSON close that window with a COMPARE-AND-SET: we remember which
// VERSION the row was at when we read it, and the write only lands if the row
// is STILL at exactly that version. If someone else got in first our write is
// refused, and we re-read and re-apply — so the second writer builds on the
// first one's result instead of erasing it.
//
// WHAT CHANGED FROM REDIS, AND WHAT DID NOT. Redis compared a SHA-1 of the
// stored string inside a Lua script, because it had no version column and
// because the script was the lock. Postgres has `row_version`, so the compare
// is an ordinary WHERE clause and the atomicity is the statement's own — an
// UPDATE reports whether it matched, and two concurrent UPDATEs on one row
// cannot both match the same version. That is the same guarantee from a cheaper
// mechanism. What did NOT change: the cost is still one read plus one write per
// attempt, there is no lock, no extra row and no second connection.
//
// ORDERING IS STILL FREE. Postgres serialises writers on one row (the second
// waits on the first's row lock, then re-checks), so concurrent writers to one
// collection are ordered by the database itself. That is the FIFO-per-collection
// guarantee; it does not need a broker.
type CasReply = { wrote: number; actual: unknown; actual_version: number | null };

// ON A REFUSED WRITE THIS HANDS BACK THE VALUE THAT IS ACTUALLY THERE, so a
// retry does not need a second read — the property the Lua script had, kept.
//
// The trailing SELECT reads `documents` from the statement's own snapshot, so
// it does NOT see the CTE's write. That is exactly what is wanted: on a refusal
// it reports the committed value that beat us. (On a success the reported value
// is the pre-write one and is discarded unread.) A writer that commits DURING
// this statement can leave the snapshot one version stale, which costs one extra
// contended round and no correctness — the next attempt's snapshot has it.
//
// `$3` is the version we read, and 0 stands for "absent". The DO UPDATE's WHERE
// therefore never matches on 0 (versions start at 1), which is what makes
// create-if-absent expressible: if someone else created the row first, our write
// is refused and we retry against their value. The second disjunct reclaims a row
// that has EXPIRED — it reads as absent everywhere else, so it must be
// overwritable here regardless of the version it happens to be carrying.
async function cas(
  key: string, prevVersion: number | null, nextJson: string, keepTTL: boolean,
): Promise<{ ok: boolean; actual: Stored }> {
  const kept = `CASE WHEN $4::boolean AND ${D}.${C.expiresAt} > now() THEN ${D}.${C.expiresAt} ELSE NULL END`;
  const { rows } = await pgQuery<CasReply>(
    `WITH attempt AS (
       INSERT INTO ${D} (${C.key}, ${C.value}, ${C.expiresAt})
       VALUES ($1, $2::json, NULL)
       ON CONFLICT (${C.key}) DO UPDATE
          SET ${C.value}     = EXCLUDED.${C.value},
              ${C.expiresAt} = ${kept},
              ${C.updatedAt} = now(),
              ${C.version}   = ${D}.${C.version} + 1
        WHERE ${D}.${C.version} = $3::int
           OR (${D}.${C.expiresAt} IS NOT NULL AND ${D}.${C.expiresAt} <= now())
       RETURNING 1
     )
     SELECT (SELECT count(*) FROM attempt)::int AS wrote,
            d.${C.value}   AS actual,
            d.${C.version} AS actual_version
       FROM (VALUES (1)) AS anchor(x)
       LEFT JOIN ${D} d ON d.${C.key} = $1 AND ${live("d.")}`,
    [key, nextJson, prevVersion ?? 0, keepTTL],
  );
  const reply = rows[0];
  return {
    ok: reply.wrote === 1,
    actual: reply.actual_version == null ? ABSENT : { value: reply.actual, version: reply.actual_version },
  };
}

// Raised when a key stayed contended for every attempt. Callers that surface it
// should answer 409 — "someone else changed this, try again" — rather than
// pretend the write landed.
export class ConflictError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`write conflict on ${key}`);
    this.name = "ConflictError";
    this.key = key;
  }
}
export const isConflict = (e: unknown): e is ConflictError =>
  (e as { name?: string })?.name === "ConflictError";

// Every contended round has exactly ONE winner, so N writers piling onto one key
// need up to N rounds to all get through. This is a queue draining, not a
// livelock — which is why the wait between attempts stays SMALL and flat.
// Exponential backoff would be actively wrong here: it would idle the key while
// writers that could have made progress sat waiting. 64 covers a burst far
// larger than any single nompany collection realistically sees, and costs
// nothing when uncontended (the loop exits on the first success).
const MAX_ATTEMPTS = 64;
const RETRY_JITTER_MS = 15;

/**
 * What `fn` may hand back: a write, or a decision not to write.
 *
 * TWO SHAPES, NOT ONE OPTIONAL FIELD. `{ result }` and `{ next, ... }` are
 * different answers — "I looked and there is nothing to do" versus "write this"
 * — and a single optional `next` would make `next: undefined` mean the first,
 * which is exactly the confusion `"next" in outcome` was written to avoid.
 *
 * `result` IS OPTIONAL ON THE WRITE, because plenty of writes have nothing to
 * hand back: a cascade deleting rows says `{ next }` and means it. Those
 * callers leave R as void, and `undefined` is the honest value for them.
 */
export type EditOutcome<V, R> = { result: R } | { next: V; result?: R };

// editJSON(key, fn) — fn receives the CURRENT value (null when the key is
// absent) and returns:
//   { next, result }  write `next`, then return `result` to the caller
//   { result }        decide not to write at all (a rejected update, a no-op)
// fn may run more than once, so it must be a pure function of what it is given.
// A `updateRow`-style function patch is therefore RE-APPLIED on each attempt,
// never computed once — which is what keeps "flip this field" a flip under
// contention rather than "set it to what I last saw".
export async function editJSON<V = unknown, R = unknown>(
  key: string,
  fn: (current: V | null) => EditOutcome<V, R> | Promise<EditOutcome<V, R>>,
  { keepTTL = false }: { keepTTL?: boolean } = {},
): Promise<R> {
  let stored = await readStored(key);                 // the only unconditional read
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const current = stored.version == null ? null : (stored.value as V);
    const outcome = (await fn(current)) || ({} as EditOutcome<V, R>);
    if (!("next" in outcome)) return outcome.result;

    const { ok, actual } = await cas(key, stored.version, JSON.stringify(outcome.next), keepTTL);
    if (ok) {
      // THE WRITE LANDED, so any cached copy of this key is now a lie. Note
      // that editJSON's own read above deliberately bypasses the cache: a
      // compare-and-set must see the value as it actually stands, never a
      // remembered one.
      invalidate(key);
      return outcome.result as R;
    }

    // Refused. The statement already told us what is there now, so re-apply
    // against that — no second read. The jitter only stops retries from
    // marching in lockstep.
    stored = actual;
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * RETRY_JITTER_MS)));
  }
  // Losing this many rounds in a row is not ordinary contention — it means a hot
  // spot worth knowing about, so say so rather than failing silently.
  log.error(`[pgStore] gave up after ${MAX_ATTEMPTS} contended attempts on ${key}`);
  throw new ConflictError(key);
}

// The array flavour: an absent key reads as [], matching readArr().
export async function editArr<T = Row, R = unknown>(
  key: string,
  fn: (rows: T[]) => EditOutcome<T[], R> | Promise<EditOutcome<T[], R>>,
  opts?: { keepTTL?: boolean },
): Promise<R> {
  return editJSON<T[], R>(key, (cur) => fn(Array.isArray(cur) ? cur : []), opts);
}

// ---- uniqueness claims / TTL indexes ---------------------------------------
// claim(key, value[, ttlSec]) → true if WE claimed it, false if taken.
//
// STRICTLY BETTER THAN THE SET NX IT REPLACES, and this is the one place worth
// saying so. `SET key v NX EX ttl` was already atomic in Redis, but reproducing
// it as read-then-write here would have opened a race that never existed;
// `INSERT ... ON CONFLICT DO NOTHING` is atomic in the database's own terms, and
// the ON CONFLICT DO UPDATE ... WHERE below adds something Redis could not do at
// all — an EXPIRED claim is reclaimed by the same statement that fails against a
// live one, so a lapsed slug hold never needs a sweeper before it can be retaken.
export async function claim(key: string, value: string, ttlSec?: number): Promise<boolean> {
  const expiry = ttlSec ? expiryAt("$3") : "NULL";
  const { rowCount } = await pgQuery(
    `INSERT INTO ${D} (${C.key}, ${C.value}, ${C.expiresAt})
     VALUES ($1, $2::json, ${expiry})
     ON CONFLICT (${C.key}) DO UPDATE
        SET ${C.value}     = EXCLUDED.${C.value},
            ${C.expiresAt} = EXCLUDED.${C.expiresAt},
            ${C.updatedAt} = now(),
            ${C.version}   = ${D}.${C.version} + 1
      WHERE ${D}.${C.expiresAt} IS NOT NULL AND ${D}.${C.expiresAt} <= now()`,
    ttlSec ? [key, JSON.stringify(String(value)), ttlSec] : [key, JSON.stringify(String(value))],
  );
  // A claim that landed changes what the index says, so anything remembering the
  // old answer is now wrong. A claim that did NOT land changes nothing — but
  // invalidating anyway costs a Map.delete and removes the need to be right
  // about which case this was.
  invalidate(key);
  return rowCount === 1;
}

// CACHED LIKE getJSON, and for a sharper reason. An index read is the FIRST half
// of every "resolve a name to an id" pair — ix:slug, ix:session, ix:owner — so
// it is exactly the read a prefetch is trying to get out of the critical path.
// Leaving it uncached made the studio prefetch cost an extra command rather than
// saving a wave: the value was fetched twice, once to warm and once for real.
//
// RETURNS THE STORED TEXT, which is what Redis's GET returned. A claim stores a
// string, so the parsed value is a string and comes straight back. Anything else
// under an index key — a document some other path wrote with setJSON — is
// re-serialised, because that is byte-for-byte what GET would have handed over.
export async function getIndex(key: string): Promise<string | null> {
  return cachedRead(key, async () => {
    const { value, version } = await readStored(key);
    if (version == null) return null;
    return typeof value === "string" ? value : JSON.stringify(value);
  });
}
export async function release(key: string): Promise<void> {
  invalidate(key);
  await pgQuery(`DELETE FROM ${D} WHERE ${C.key} = $1`, [key]);
}

// ---- sets (used for ix:collab:<UserID>) ------------------------------------
// An array of unique strings, mutated through the compare-and-set above.
//
// keepTTL ON EVERY ONE OF THESE, and on the hash, sorted-set and HLL writes
// below. SADD/ZADD/HINCRBY never touched a Redis key's TTL — only SET did — so
// a member added to an expiring set must not silently make that set immortal.
// editJSON's DEFAULT is to clear the expiry, because that is what SET did; every
// native-op equivalent has to say otherwise, explicitly, here.
const asSet = (cur: unknown): string[] => (Array.isArray(cur) ? cur.map(String) : []);

export async function sAdd(key: string, member: string): Promise<void> {
  const value = String(member);
  await editJSON<string[], void>(key, (cur) => {
    const members = asSet(cur);
    // ALREADY THERE MEANS NO WRITE — not merely cheaper, but one fewer version
    // bump for concurrent writers of the same set to lose a round against.
    if (members.includes(value)) return { result: undefined };
    return { next: [...members, value] };
  }, { keepTTL: true });
}
export async function sRem(key: string, member: string): Promise<void> {
  const value = String(member);
  await editJSON<string[], void>(key, (cur) => {
    const members = asSet(cur);
    if (!members.includes(value)) return { result: undefined };
    return { next: members.filter((m) => m !== value) };
  }, { keepTTL: true });
}
export async function sMembers(key: string): Promise<string[]> {
  return asSet(await getJSON(key));
}
export async function sCard(key: string): Promise<number> {
  return asSet(await getJSON(key)).length;
}

// ---- sorted sets (index primitives) ----------------------------------------
// Stored as `{ member, score }[]` kept in score order, ties broken by member —
// which is Redis's own ordering rule, and the reason zRange can answer by rank
// without sorting on every read.
type ZEntry = { member: string; score: number };

const asZ = (cur: unknown): ZEntry[] =>
  Array.isArray(cur)
    ? cur
      .filter((e): e is ZEntry => Boolean(e) && typeof e === "object")
      .map((e) => ({ member: String(e.member), score: Number(e.score) || 0 }))
    : [];

const byScore = (a: ZEntry, b: ZEntry) =>
  a.score - b.score || (a.member < b.member ? -1 : a.member > b.member ? 1 : 0);

export async function zAdd(key: string, score: number, member: string): Promise<void> {
  const value = String(member);
  await editJSON<ZEntry[], void>(key, (cur) => {
    const entries = asZ(cur);
    const existing = entries.find((e) => e.member === value);
    if (existing && existing.score === score) return { result: undefined };
    const next = entries.filter((e) => e.member !== value).concat({ member: value, score });
    next.sort(byScore);
    return { next };
  }, { keepTTL: true });
}

// RANK RANGES, INCLUSIVE AT BOTH ENDS, AND NEGATIVE COUNTS FROM THE END — the
// ZRANGE contract 21 call sites already depend on (`zRange(k, 0, -1)` is "all of
// it"). `rev` reverses the sequence FIRST and then applies the indices, exactly
// as ZRANGE ... REV does, so `zRange(k, 0, limit - 1, { rev: true })` is a
// newest-first page rather than an oldest-first one read backwards.
export async function zRange(
  key: string, start: number, stop: number, opts: { rev?: boolean } = {},
): Promise<string[]> {
  const entries = asZ(await getJSON(key));
  const members = entries.map((e) => e.member);
  if (opts.rev) members.reverse();

  const n = members.length;
  const from = start < 0 ? Math.max(0, n + start) : start;
  const to = stop < 0 ? n + stop : Math.min(stop, n - 1);
  if (from > to || from >= n || to < 0) return [];
  return members.slice(from, to + 1);
}

export async function zRem(key: string, member: string): Promise<void> {
  const value = String(member);
  await editJSON<ZEntry[], void>(key, (cur) => {
    const entries = asZ(cur);
    if (!entries.some((e) => e.member === value)) return { result: undefined };
    return { next: entries.filter((e) => e.member !== value) };
  }, { keepTTL: true });
}

// "Is anything still in this set" is the question a detach asks to decide
// whether an index entry may go. It reads one row either way here — the Redis
// note about ZCARD not materialising every member no longer describes a cost
// difference, because the members and the count live in the same document.
export async function zCard(key: string): Promise<number> {
  return asZ(await getJSON(key)).length;
}

// ---- counters ---------------------------------------------------------------
// A hash of tallies: an object of string→string, because Redis hash values ARE
// strings and callers compare against `"2"`, not `2`. Keeping that keeps
// JSON.stringify's output unchanged for anything that echoes a hash back.
//
// MUTATED IN JAVASCRIPT, NOT IN SQL, and the reason is the column type rather
// than convenience: `json` has no concatenation or field-set operator (those are
// jsonb's), so an in-SQL edit would mean casting through jsonb — which reorders
// keys, which is the one thing this column exists to prevent. The compare-and-set
// is what replaces HINCRBY's server-side atomicity, and it is sufficient:
// twenty concurrent increments take at most twenty rounds and land twenty.
const asHash = (cur: unknown): Record<string, string> =>
  cur && typeof cur === "object" && !Array.isArray(cur)
    ? Object.fromEntries(Object.entries(cur as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
    : {};

// A NEW FIELD IS APPENDED, AN EXISTING ONE KEEPS ITS PLACE. Object spread
// preserves insertion order, so a hash read back after fifty increments has the
// same key order it had after the first — which is what makes the stored text
// stable rather than merely correct.
const withField = (h: Record<string, string>, field: string, value: string) => ({ ...h, [field]: value });

export async function hIncrBy(key: string, field: string, by = 1): Promise<number> {
  const name = String(field);
  return editJSON<Record<string, string>, number>(key, (cur) => {
    const h = asHash(cur);
    const n = (Number(h[name]) || 0) + by;
    return { next: withField(h, name, String(n)), result: n };
  }, { keepTTL: true });
}

// THE NEXT NUMBER IN A SEQUENCE THAT NEVER GOES BACKWARDS (invariant 10).
//
// A plain increment would do it, except for the studios that already hold
// records: their tally starts at zero and would hand out INV-0001 to a studio
// whose last invoice was INV-0042. So the caller passes a FLOOR — the highest
// reference it can see on the rows it already has in hand — and the counter is
// lifted to it before being stepped. That makes the first call self-seeding and
// every call after it a plain increment, with no migration to run.
//
// Read, compare and write are one compare-and-set, so two people creating an
// invoice in the same moment get two different numbers rather than both reading
// the same tally: the second one's write is refused against the first's version
// and re-applies against the number the first just wrote. Deleting the newest
// invoice cannot let the next create reissue a number a client already holds,
// because the stored tally is never lowered — the floor only ever raises it.
export async function bumpCounter(key: string, field: string, floor = 0): Promise<number> {
  const name = String(field);
  const base = Math.max(0, Math.floor(Number(floor) || 0));
  return editJSON<Record<string, string>, number>(key, (cur) => {
    const h = asHash(cur);
    const n = Math.max(Number(h[name]) || 0, base) + 1;
    return { next: withField(h, name, String(n)), result: n };
  }, { keepTTL: true });
}

// A TALLY THAT CANNOT GROW A NEW FIELD FOREVER.
//
// `hIncrBy` on a caller-supplied field name is unbounded by construction: the
// public traffic endpoint takes a page label from the request body, so anybody
// can invent as many distinct fields as they can send requests. A row is cheap
// and a table is not infinite, and this one document would grow without bound
// on a single curl loop.
//
// So: an existing field always counts; a NEW field counts only while the hash
// is under its ceiling, and everything past that folds into one overflow field.
// Real pages keep their own tallies, invented ones cost a single bucket, and
// nothing has to be maintained as the site's page list changes.
//
// The read, the compare and the write are one compare-and-set, so two requests
// arriving together cannot both see room for the last field.
export async function hIncrBounded(
  key: string,
  field: string,
  { max, overflow }: { max: number; overflow: string },
): Promise<number> {
  const name = String(field);
  return editJSON<Record<string, string>, number>(key, (cur) => {
    const h = asHash(cur);
    const target = name in h || Object.keys(h).length < max ? name : String(overflow);
    const n = (Number(h[target]) || 0) + 1;
    return { next: withField(h, target, String(n)), result: n };
  }, { keepTTL: true });
}

// ---- distinct counting -----------------------------------------------------
// AN EXACT SET, WHERE REDIS HELD A HYPERLOGLOG — a deliberate change, not a
// port that lost a property.
//
// PFADD/PFCOUNT answered "how many distinct visitors today" from a structure
// that costs about 12 KB however large the answer is, at ~0.81% standard error.
// That trade was worth taking when Redis was the whole of this product's storage
// and an unbounded SET was one anonymous curl loop away from filling the
// instance. It is not the trade here: the members live in one row of a table
// sized in gigabytes, the write path is already bounded by the same rate limits
// that guard every other public endpoint, and Postgres has no HyperLogLog
// without an extension this deployment does not carry.
//
// SO THE RETURNED COUNT IS NOW EXACT rather than an estimate within ~0.81%.
// Nothing depends on it being approximate; a caller comparing against a
// tolerance (tests/suite.mjs allows ±20 on 400) simply always passes now.
export async function pfAdd(key: string, member: string): Promise<number> {
  const value = String(member);
  return editJSON<string[], number>(key, (cur) => {
    const members = asSet(cur);
    // 1 when the structure changed, 0 when it did not — PFADD's own return.
    if (members.includes(value)) return { result: 0 };
    return { next: [...members, value], result: 1 };
  }, { keepTTL: true });
}
export async function pfCount(key: string): Promise<number> {
  return asSet(await getJSON(key)).length;
}

// ---- hashes ----------------------------------------------------------------
export async function hGetAll(key: string): Promise<Record<string, string>> {
  return asHash(await getJSON(key));
}
export async function hDel(key: string, ...fields: string[]): Promise<number> {
  if (!fields.length) return 0;
  const names = fields.map(String);
  return editJSON<Record<string, string>, number>(key, (cur) => {
    const h = asHash(cur);
    const present = names.filter((f) => f in h);
    if (!present.length) return { result: 0 };
    const next = { ...h };
    for (const f of present) delete next[f];
    return { next, result: present.length };
  }, { keepTTL: true });
}
// A PLAIN SET, next to `hIncrBy`/`hGetAll`/`hDel` above. The nightly rollup
// reconcile (api/cron/main-rollup) writes a computed total rather than a
// delta, so an increment is the wrong primitive for it — this is HSET, and it
// returns 1 for a field that did not exist and 0 for one that did, as HSET did.
export async function hSet(key: string, field: string, value: string | number): Promise<number> {
  const name = String(field);
  const next = String(value);
  return editJSON<Record<string, string>, number>(key, (cur) => {
    const h = asHash(cur);
    const isNew = name in h ? 0 : 1;
    if (!isNew && h[name] === next) return { result: 0 };
    return { next: withField(h, name, next), result: isNew };
  }, { keepTTL: true });
}

// SET THIS FIELD ONLY IF IT IS NOT ALREADY THERE — HSETNX, and the reason it
// has to be one indivisible step rather than an hGetAll followed by an hSet.
//
// Two callers need exactly this, and both are recording a DECISION that must
// not be overwritten by a concurrent one:
//   • ratings marks a user as having DECLINED to rate. Read-then-write turns a
//     real rating into a decline, or the reverse, depending on who wins.
//   • siteStats records the day's active count once. Read-then-write either
//     double-counts or overwrites a settled figure.
//
// No new mechanism: the whole hash is one `documents` row, so "only if absent"
// is a mutator that refuses when the field is present, riding the same
// compare-and-set every other hash op above uses. Returns true when it set the
// field, false when something was already there.
export async function hSetNX(key: string, field: string, value: string | number): Promise<boolean> {
  const name = String(field);
  const next = String(value);
  return editJSON<Record<string, string>, boolean>(key, (cur) => {
    const h = asHash(cur);
    if (name in h) return { result: false };
    return { next: withField(h, name, next), result: true };
  }, { keepTTL: true });
}

// ---- streams (the append-only event log) -----------------------------------
// The `events` table, one row per entry, `channel` holding what used to be the
// stream's key. INVARIANT 12 SURVIVES INTACT: `id` is a bigserial, monotonic per
// insert, so a reader resuming from Last-Event-ID asks for `id > cursor` and
// gets exactly what it missed.
//
// THE ID IS RENDERED "<n>-0", NOT "<n>", and that is load-bearing rather than
// decorative. A cursor's shape is validated as `/^\d+-\d+$/` in
// platform/realtime/events.ts before it is ever passed back in, and "0-0" is the
// sentinel a fresh client adopts to mean "start from now". A bare "42" fails that
// test, and a client resuming would silently be handed the whole log from the
// beginning instead of nothing — a replay storm that looks like a UI bug. Keeping
// the two-part shape means the cursor contract, the sentinel and every client
// already in the wild are unchanged; only the number in front of the dash comes
// from somewhere else now.
const streamId = (id: string | number) => `${id}-0`;

// The numeric half of a cursor. Anything unparseable — including "" — reads from
// the very start of the (already trimmed) log, which is what an empty cursor did.
const cursorSeq = (cursor: string) => {
  const n = /^(\d+)/.exec(String(cursor || ""));
  return n ? n[1] : "0";
};

export async function xAdd(key: string, fields: Record<string, unknown>, maxLen?: number): Promise<unknown> {
  // EVERY FIELD IS A STRING, exactly as XADD's wire format forced. xAfter's
  // return type promises Record<string, string> and readers compare against
  // string literals, so coercing here is what keeps that promise true rather
  // than accidentally true.
  const payload = Object.fromEntries(
    Object.entries(fields).map(([field, value]) => [field, String(value ?? "")]),
  );

  // TRIMMED IN THE SAME STATEMENT AS THE APPEND, so the log cannot grow without
  // bound even if nothing ever sweeps it. Approximate, like MAXLEN ~: the
  // cutoff is chosen from the snapshot taken before this row was inserted, so
  // the log settles at roughly `maxLen` rather than exactly it. Exact trimming
  // would cost a lock on the channel for every append, which is precisely the
  // contention an append-only log is supposed to be free of.
  const trim = maxLen
    ? `, cutoff AS (
         SELECT ${EC.id} FROM ${EV} WHERE ${EC.channel} = $1 ORDER BY ${EC.id} DESC OFFSET $3 LIMIT 1
       ), trimmed AS (
         DELETE FROM ${EV} WHERE ${EC.channel} = $1 AND ${EC.id} <= (SELECT ${EC.id} FROM cutoff)
       )`
    : "";

  const { rows } = await pgQuery<{ id: string }>(
    `WITH appended AS (
       INSERT INTO ${EV} (${EC.channel}, ${EC.payload}) VALUES ($1, $2::json) RETURNING ${EC.id}
     )${trim}
     SELECT ${EC.id}::text AS id FROM appended`,
    maxLen ? [key, JSON.stringify(payload), maxLen] : [key, JSON.stringify(payload)],
  );
  return streamId(rows[0].id);
}

/** One stream entry: its id, plus whatever fields were written into it. */
export type StreamEntry = { id: string } & Record<string, string>;

// Entries strictly AFTER `cursor`, oldest first — `id > $2`, so the caller never
// re-receives the entry it already has.
export async function xAfter(key: string, cursor: string, count: number): Promise<StreamEntry[]> {
  const { rows } = await pgQuery<{ id: string; payload: Record<string, string> }>(
    `SELECT ${EC.id}::text AS id, ${EC.payload} AS payload
       FROM ${EV} WHERE ${EC.channel} = $1 AND ${EC.id} > $2::bigint
      ORDER BY ${EC.id} LIMIT $3`,
    [key, cursorSeq(cursor), count],
  );
  return rows.map((r) => ({ id: streamId(r.id), ...(r.payload || {}) }));
}

// The newest id, or "0-0" for an empty log — what a fresh client adopts so it
// starts from "now" instead of replaying history it never needed.
export async function xLastId(key: string): Promise<string> {
  const { rows } = await pgQuery<{ id: string }>(
    `SELECT ${EC.id}::text AS id FROM ${EV} WHERE ${EC.channel} = $1 ORDER BY ${EC.id} DESC LIMIT 1`,
    [key],
  );
  return rows.length ? streamId(rows[0].id) : "0-0";
}

// ---- infrastructure invariants ---------------------------------------------
// THE SETTING THAT COULD LOSE DATA WITHOUT ANY CODE BEING WRONG — and the
// honest answer for Postgres is that it does not exist.
//
// This reported Redis's `maxmemory_policy`, because under an `allkeys-*` policy
// a full instance does not refuse writes: it silently deletes whatever it judges
// least recently used, which there meant live invoices, sessions and controlled
// documents. `noeviction` turned that into a loud write failure instead, and the
// check existed because the setting lived in a console rather than in this
// repository.
//
// POSTGRES HAS NO EVICTION AT ALL. A full disk refuses writes; it never chooses
// a row to drop. So `safe` is true for a stronger reason than a correctly-set
// option — there is no option to get wrong — and `policy` says "postgres" rather
// than echoing "noeviction", because claiming a setting that does not exist is
// how a check quietly stops meaning anything.
//
// WHAT IS STILL WORTH REPORTING is the size, which is what the sweep-orphans
// cron actually logs. `peakHuman` and `maxBytes` have no Postgres counterpart a
// query can see (peak usage is not retained, and the ceiling is the volume's,
// not the database's) — reported as such rather than filled in with a number
// that would look like a measurement.
export async function memoryPolicy() {
  const { rows } = await pgQuery<{ used: string; human: string }>(
    `SELECT pg_database_size(current_database())::text AS used,
            pg_size_pretty(pg_database_size(current_database())) AS human`,
  );
  return {
    policy: "postgres",
    safe: true,
    usedBytes: Number(rows[0]?.used) || 0,
    usedHuman: rows[0]?.human || "",
    peakHuman: "n/a (postgres retains no peak)",
    maxBytes: 0,
  };
}

// ---- prefix scan / delete (THE cascade primitive) --------------------------
// AN EMPTY PREFIX MATCHES THE ENTIRE KEYSPACE. `${""}*` is `*`, so scanPrefix("")
// enumerates every key and delPrefix("") deletes every key — in a single, shared,
// live database, that is the whole of it. It has happened: an ad-hoc script's
// delPrefix("") emptied production once, the exact hazard invariant 17 in CLAUDE.md
// is about. Moving the store to Postgres changed nothing about this: `key LIKE '%'`
// is every row exactly as `*` was every key.
//
// There is NO legitimate whole-keyspace scan in this product — every sweep is
// scoped (SWEEP_SCOPES) and every cascade targets an id — so an empty prefix is
// always a bug, never an intent. Refuse it BEFORE any query is built, so a bad
// call cannot even reach the database. A non-empty prefix (a key builder, or a
// test's own KEY_PREFIX like "test_") passes untouched: this guards the
// catastrophe, not the legitimate namespaced teardown.
function assertScopedPrefix(prefix: string, op: string): void {
  if (!prefix || !prefix.trim()) {
    throw new Error(
      `store.${op}: refusing an empty prefix — "${String(prefix)}*" matches every key in the ` +
        "shared database. Pass a scoped prefix built from keys.ts, never an empty string.",
    );
  }
}

// LIKE HAS WILDCARDS OF ITS OWN, AND A REAL PREFIX CONTAINS THEM. `_` matches any
// single character in LIKE, and `test_suite_` — the test namespace this suite runs
// under — has two of them: unescaped, that prefix would also match `testXsuiteY…`,
// so a test teardown could reach rows outside its own namespace. `%` and the escape
// character itself have the same problem. Escaped here, once, so every caller gets a
// literal prefix match; `ESCAPE '\'` on every statement that uses it.
const likePrefix = (prefix: string) => `${prefix.replace(/([\\%_])/g, "\\$1")}%`;

export async function scanPrefix(prefix: string): Promise<string[]> {
  assertScopedPrefix(prefix, "scanPrefix");
  // Live rows only — an expired row is absent to every other read in this file,
  // and a cascade must not be handed a key that nothing can any longer resolve.
  // delPrefix removes the expired ones anyway (see delKeys).
  const { rows } = await pgQuery<{ key: string }>(
    `SELECT ${C.key} AS key FROM ${D} WHERE ${C.key} LIKE $1 ESCAPE '\\' AND ${live()} ORDER BY ${C.key}`,
    [likePrefix(prefix)],
  );
  return rows.map((r) => r.key);
}

export async function delPrefix(prefix: string): Promise<number> {
  // Guarded here too — not only via scanPrefix — so the refusal names the delete
  // and a future refactor of delPrefix cannot lose the check.
  assertScopedPrefix(prefix, "delPrefix");
  const keys = await scanPrefix(prefix);
  return delKeys(keys);
}

// ---- the expiry sweeper ----------------------------------------------------
// THE HALF REDIS DID FOR FREE. Every read in this file treats a lapsed row as
// absent, so correctness never waited on this — but nothing reclaims the space
// either, and the high-churn keys are precisely the expiring ones (OTP
// challenges, rate-limit windows, session indexes). Left alone, `documents`
// accumulates dead rows forever.
//
// BOUNDED PER CALL, and by a subquery rather than a bare `DELETE ... WHERE
// expires_at <= now()`: an unbounded delete over a table that has never been
// swept takes a lock proportional to however long nobody ran it. `limit` makes
// each pass a predictable amount of work, and the caller runs it again while it
// keeps reporting a full batch.
//
// NOT AN INVARIANT-17 HAZARD, and worth saying why: the predicate is not a
// prefix and cannot be widened by an empty argument — it deletes only rows that
// have ALREADY expired, which every read in this file already treats as gone.
// There is no argument to this function that could make it touch a live row.
//
// NOTHING CALLS THIS YET. It is exported for the cron that should (the same
// route that runs sweepOrphans is the obvious home), and is deliberately left
// unwired rather than being invented into a schedule from here.
export async function purgeExpired(limit = 1000): Promise<number> {
  const { rowCount } = await pgQuery(
    `DELETE FROM ${D} WHERE ${C.key} IN (
       SELECT ${C.key} FROM ${D} WHERE ${C.expiresAt} IS NOT NULL AND ${C.expiresAt} <= now() LIMIT $1
     )`,
    [limit],
  );
  return rowCount;
}
