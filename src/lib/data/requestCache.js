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

const storage = new AsyncLocalStorage();

/** Run `fn` with a fresh per-request cache. Outside one, nothing is cached. */
export function withRequestCache(fn) {
  return storage.run(new Map(), fn);
}

/**
 * Read through the cache, or straight past it when there is no request scope.
 *
 * Outside a request — a cron job, a test calling a service directly — there is
 * no store and `load()` simply runs. That is the honest behaviour: a cache with
 * no defined lifetime should not exist rather than guess at one.
 */
export function cachedRead(key, load) {
  const map = storage.getStore();
  if (!map) return load();

  const hit = map.get(key);
  if (hit) return hit;

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

/** Forget these keys. Called by every write path in store.js. */
export function invalidate(...keys) {
  const map = storage.getStore();
  if (!map) return;
  for (const key of keys.flat()) if (key) map.delete(key);
}

/** How the request went, for the completion line. Null outside a request. */
export function cacheStats() {
  const map = storage.getStore();
  return map ? { keys: map.size } : null;
}
