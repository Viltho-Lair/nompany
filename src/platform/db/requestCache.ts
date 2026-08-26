// ONE REQUEST, ONE READ PER KEY.
//
// Rendering a Sales screen fetches seventeen values and fourteen of them are
// distinct: `g:users`, the collaborator list and the clients collection are each
// read twice, by different functions that have no idea the other one ran. Nobody
// wrote that duplication deliberately — it is what happens when a screen is
// assembled from independently-correct pieces.
//
// SCOPED TO A REQUEST, AND NOT ONE MOMENT LONGER. A cache that outlives the
// request is a cache that can serve one studio's row to another, and there is no
// invalidation discipline careful enough to make that safe in a multi-tenant
// product. AsyncLocalStorage gives exactly the lifetime wanted: the map is
// created when the request starts, is invisible to every other request, and is
// garbage the moment it ends.
//
// THE MAP HOLDS PROMISES, NOT VALUES, which is the part that matters most. Two
// reads of the same key inside one `Promise.all` start before either finishes,
// so a value-cache would still send both commands; caching the in-flight promise
// collapses them into one. Most of this codebase's duplicate reads are
// concurrent, not sequential.
//
// WRITES INVALIDATE, ALWAYS. Every function in store.js that touches a key drops
// it from the map, whatever its type — a Map.delete costs nothing, and reasoning
// about which types getJSON can observe is exactly the kind of cleverness that
// is right today and wrong after the next change.
//
// WHAT IS DELIBERATELY NOT CACHED: editJSON's own read. Compare-and-set has to
// see the value as it ACTUALLY stands at the instant of the write, so it reads
// through getRaw rather than getJSON and never consults this. Serving that read
// from a cache would defeat the mechanism the whole write path is built on.

import { AsyncLocalStorage } from "node:async_hooks";

// THE MAP HOLDS PROMISES OF UNKNOWN, and `unknown` is the honest element type:
// a key's value is whatever was stored under it, and the caller who asked for it
// is the only one who knows. `cachedRead` is generic so that knowledge survives
// the round trip instead of being flattened to `any` at the cache boundary.
type CacheMap = Map<string, Promise<unknown>>;

const storage = new AsyncLocalStorage<CacheMap>();

/** Run `fn` with a fresh per-request cache. Outside one, nothing is cached. */
export function withRequestCache<T>(fn: () => T): T {
  return storage.run(new Map(), fn);
}

/**
 * Read through the cache, or straight past it when there is no request scope.
 *
 * Outside a request — a cron job, a test calling a service directly — there is
 * no store and `load()` simply runs. That is the honest behaviour: a cache with
 * no defined lifetime should not exist rather than guess at one.
 */
export function cachedRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  const map = storage.getStore();
  if (!map) return load();

  const hit = map.get(key);
  // The cast is the seam, and it is narrow: whatever `load` returns for a key is
  // what was stored under it, so the only way to be wrong here is to call
  // cachedRead twice for one key with two different loaders — which would be a
  // bug about the key, not about the type.
  if (hit) return hit as Promise<T>;

  // Stored BEFORE the await, so a second caller arriving while this is still in
  // flight joins it instead of starting another.
  const pending = load().catch((error) => {
    // A failed read must not be remembered as an answer. Dropping it means the
    // next attempt is a real one rather than a replay of the failure.
    map.delete(key);
    throw error;
  });
  map.set(key, pending);
  return pending;
}

/**
 * Read MANY keys, sharing the request cache and collapsing the misses into ONE
 * flight.
 *
 * This is what turns an N+1 into a single hop. `cachedRead` already dedupes a key
 * read twice, but a list of DISTINCT keys — every employee's profile — is still N
 * separate commands. Here the keys already cached are served from their in-flight
 * promises, and the ones that are NOT are handed to `loadMissing` as one batch (an
 * MGET in the store), whose result is then sliced back into a per-key promise each
 * — so a later single-key `cachedRead` of one of them joins this flight instead of
 * issuing its own command.
 *
 * `loadMissing` MUST return one value per key it was given, in the same order.
 * Outside a request scope there is nothing to cache, so the whole set is loaded.
 */
export function cachedReadMany<T>(
  keys: string[],
  loadMissing: (missing: string[]) => Promise<T[]>,
): Promise<T[]> {
  const map = storage.getStore();
  if (!map) return loadMissing(keys);

  const missing = keys.filter((k) => !map.has(k));
  if (missing.length) {
    // ONE flight for every miss. Stored before the await, like cachedRead, so a
    // concurrent reader of any of these keys joins it rather than starting another.
    const batch = loadMissing(missing).catch((error) => {
      // A failed batch must not be remembered as an answer for any of its keys.
      for (const k of missing) map.delete(k);
      throw error;
    });
    missing.forEach((k, i) => map.set(k, batch.then((values) => values[i])));
  }
  return Promise.all(keys.map((k) => map.get(k) as Promise<T>));
}

/** Forget these keys. Called by every write path in store.js. */
export function invalidate(...keys: (string | string[] | null | undefined)[]): void {
  const map = storage.getStore();
  if (!map) return;
  for (const key of keys.flat()) if (key) map.delete(key);
}

/** How the request went, for the completion line. Null outside a request. */
export function cacheStats(): { keys: number } | null {
  const map = storage.getStore();
  return map ? { keys: map.size } : null;
}
