// COUNTING REDIS ROUND TRIPS, so the count can be part of the contract.
//
// The audit's largest finding is not a bug in any one file: rendering one Sales
// screen costs EIGHT dependent Redis round trips, measured at 1421ms, where the
// same fifteen keys fetched in one batch cost 180ms. The hop count is the
// defect — it survives any amount of co-location, because each hop supplies the
// key the next one needs.
//
// A number nobody measures goes back up. So the count is asserted per route in
// the suite, exactly like a response body: a route that regresses from two hops
// to eight fails the build rather than being discovered in production six weeks
// later.
//
// HOW IT ATTACHES. `withCommandCount` runs its callback inside an
// AsyncLocalStorage scope; the Redis client is wrapped in a Proxy that reports
// each call into whatever scope is active. Outside a scope there is no store and
// nothing is recorded — so production pays one property lookup per command,
// against a network round trip, which is not a cost worth optimising away.
//
// WHAT COUNTS AS A HOP. One command sent to Redis. `Promise.all` of six GETs is
// six commands but ONE round trip in wall-clock terms, so the counter records
// both: `commands` is the total, and `waves` counts how many times the code
// waited — which is the number that actually predicts latency. A wave is closed
// whenever a command resolves and no other command is in flight.

import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage();

// Connection management and event wiring are not round trips.
const NOT_A_COMMAND = new Set([
  "duplicate", "connect", "quit", "disconnect", "on", "off", "once",
  "removeListener", "emit", "isOpen", "isReady", "options",
]);

/**
 * Run `fn` with a command counter attached.
 *
 * RE-ENTRANT ON PURPOSE. A nested call JOINS the counter already running rather
 * than starting a fresh one, and the reason is a bug this actually had:
 *
 * withRequest() opens a counting scope so every route can report its hops in the
 * completion line without opting in. Gate A's hop test ALSO opens one, around
 * the route it is measuring. The moment routes started going through the wrapper
 * those two nested — and because a fresh store shadowed the outer one, every
 * command was counted into the inner scope and the test's counter read zero.
 *
 * What makes that worse than a wrong number is the assertion beside it:
 * `waves <= 12` is satisfied by zero. The ceiling check went on passing, for a
 * route that was no longer being measured at all, and only "the studio route is
 * measured at all" — a guard whose entire job is to disbelieve a suspiciously
 * clean result — noticed. Hence joining: nesting now aggregates, so the inner
 * log line and the outer test see the same true number.
 *
 * @returns {Promise<{result: any, commands: number, waves: number, names: string[]}>}
 */
export async function withCommandCount(fn) {
  const existing = storage.getStore();
  if (existing) {
    const before = existing.commands;
    const beforeWaves = existing.waves;
    const beforeNames = existing.names.length;
    const result = await fn();
    return {
      result,
      // What THIS scope contributed, so a nested reader still describes itself
      // rather than everything that happened to be in flight around it.
      commands: existing.commands - before,
      waves: existing.waves - beforeWaves,
      names: existing.names.slice(beforeNames),
    };
  }

  const store = { commands: 0, waves: 0, inFlight: 0, names: [] };
  const result = await storage.run(store, fn);
  return { result, commands: store.commands, waves: store.waves, names: store.names };
}

/** The counter for the current scope, or null outside one. */
export function currentCount() {
  const store = storage.getStore();
  return store ? { commands: store.commands, waves: store.waves, names: [...store.names] } : null;
}

function opened(name) {
  const store = storage.getStore();
  if (!store) return null;
  store.commands += 1;
  store.names.push(name);
  // A wave opens when the first command starts with nothing else in flight.
  if (store.inFlight === 0) store.waves += 1;
  store.inFlight += 1;
  return store;
}

function closed(store) {
  if (store) store.inFlight -= 1;
}

/**
 * Wrap a node-redis client so every command reports itself.
 *
 * Deliberately a Proxy rather than a hand-written façade: node-redis exposes a
 * large and version-dependent surface, and a façade would silently stop counting
 * whichever method somebody reached for next.
 */
export function countingClient(client) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || typeof prop !== "string" || NOT_A_COMMAND.has(prop)) {
        return typeof value === "function" ? value.bind(target) : value;
      }

      return function counted(...args) {
        const store = opened(prop);
        let out;
        try {
          out = value.apply(target, args);
        } catch (e) {
          closed(store);
          throw e;
        }
        // scanIterator and friends return async iterables, not promises. They
        // are one logical hop from the caller's point of view; the SCAN cursor
        // loop underneath is the store's business, not the route's.
        if (!out || typeof out.then !== "function") {
          closed(store);
          return out;
        }
        return out.then(
          (v) => { closed(store); return v; },
          (e) => { closed(store); throw e; },
        );
      };
    },
  });
}
