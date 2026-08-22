// THE DOORBELL — "something just happened, go look".
//
// The event log (events.js) already answers "what changed since I last looked?"
// but only when somebody asks. This is the other half: a way to tell an OPEN
// connection to look NOW, so a change lands in under a second instead of at the
// end of a polling interval.
//
// WHY REDIS PUB/SUB AND NOT AN IN-PROCESS EventEmitter. An emitter is memory
// bound to ONE Node process. In production the app runs on however many
// instances Vercel decides to keep warm, and the person who made the change is
// almost never on the same instance as the people watching for it — so an
// emitter would deliver to a fraction of the audience, silently, and only ever
// fail in production where there is more than one instance. Redis already sits
// between every instance; it is the only thing they all share.
//
// WHY ONE CONNECTION PER PROCESS, NOT PER SUBSCRIBER. Under RESP2 a subscribed
// connection cannot run commands, so pub/sub needs a connection of its own. The
// obvious reading of that ("duplicate() per listener") would open one Redis
// connection per open browser tab, and connection count is the hard ceiling on
// this deployment — Redis Cloud Essentials caps it and the cap cannot be
// raised. So this module keeps EXACTLY ONE subscriber connection per process
// and does the fan-out itself, in memory, where it is free. A thousand tabs on
// one instance still cost one connection.
//
// Delivery is BEST-EFFORT and deliberately so. The stream is the truth; this is
// a notification about it. A publish that fails, or a message that arrives
// while a client is mid-reconnect, costs that client one replay from its
// cursor — never correctness. Nothing here is allowed to fail a write.

import { getRedisClient } from "@/platform/db/redis";
import { log } from "@/lib/observability";

// ---- channels --------------------------------------------------------------
// Namespaced away from the key space (`s:` `u:` `g:` …) on purpose: channels are
// not keys, nothing persists them, and no cascade should ever match one.
export const CH = {
  studio: (studioId) => `ev:s:${studioId}`,
  user: (userId) => `nt:u:${userId}`,
  super: "ev:super",
};

// ---- the per-process registry ----------------------------------------------
// Pinned to globalThis because Next's dev server re-evaluates modules on every
// hot reload. Without this, each edit would leak another subscriber connection
// and every message would be delivered once per surviving copy.
const GLOBAL_KEY = Symbol.for("nompany.bus");

// The subscriber connection's CLIENT SETNAME. There should never be more than
// one of these per running process.
export const SUB_NAME = "nompany-bus-sub";

function registry() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = {
      // channel → Set<handler>. The set IS the refcount: a channel is
      // SUBSCRIBEd when its first handler arrives and UNSUBSCRIBEd when its
      // last one leaves, so an idle instance holds no subscriptions at all.
      handlers: new Map(),
      // The single subscriber connection, as a promise so concurrent first
      // subscribers share one connect() instead of racing to open several.
      sub: null,
    };
  }
  return globalThis[GLOBAL_KEY];
}

// The dedicated subscriber connection. node-redis restores its own
// subscriptions after a reconnect (it replays them in the socket initiator
// before the handshake), which matters here because this Redis drops
// connections occasionally — the subscriptions come back without our help.
async function subscriber() {
  const reg = registry();
  if (!reg.sub) {
    reg.sub = (async () => {
      // Named so it is identifiable in CLIENT LIST. Connection count is the
      // ceiling on this deployment, so being able to see at a glance how many
      // of them are bus subscribers is worth the one option.
      const client = (await getRedisClient()).duplicate({ name: SUB_NAME });
      client.on("error", (err) => log.error(`[bus] subscriber error: ${err.message}`));
      await client.connect();
      return client;
    })().catch((err) => {
      // Let the next caller try again rather than caching a failed connect
      // forever — a client that arrives after Redis recovers should work.
      reg.sub = null;
      throw err;
    });
  }
  return reg.sub;
}

// One listener per channel, registered with Redis once. It hands the message to
// whichever handlers are currently registered — the set is read at delivery
// time, so a handler that unsubscribed a moment ago never hears anything.
function deliver(channel, raw) {
  const set = registry().handlers.get(channel);
  if (!set?.size) return;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return; // not ours, or truncated — there is nothing useful to do with it
  }
  for (const handler of [...set]) {
    try {
      handler(payload);
    } catch (e) {
      // One bad listener must not stop the others from being told.
      log.error(`[bus] handler failed on ${channel}: ${e.message}`);
    }
  }
}

/**
 * Listen on a channel. Returns an unsubscribe function that is safe to call
 * more than once — SSE teardown runs from both the abort signal and the normal
 * close path, and neither should have to know whether the other got there
 * first.
 *
 * @param {string} channel
 * @param {(payload: any) => void} handler
 * @returns {Promise<() => Promise<void>>}
 */
export async function subscribe(channel, handler) {
  const reg = registry();
  let set = reg.handlers.get(channel);

  if (!set) {
    set = new Set();
    reg.handlers.set(channel, set);
    // Register the handler BEFORE awaiting SUBSCRIBE, so a message that arrives
    // the instant the subscription lands is not dropped on the floor.
    set.add(handler);
    try {
      const client = await subscriber();
      await client.subscribe(channel, (raw) => deliver(channel, raw));
    } catch (e) {
      // Could not subscribe: drop the half-built entry so the next caller
      // retries from scratch instead of listening to a channel Redis never
      // heard about.
      set.delete(handler);
      if (!set.size) reg.handlers.delete(channel);
      throw e;
    }
  } else {
    set.add(handler);
  }

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    const current = reg.handlers.get(channel);
    if (!current) return;
    current.delete(handler);
    if (current.size) return; // others are still listening — keep the channel

    reg.handlers.delete(channel);
    try {
      const client = await subscriber();
      await client.unsubscribe(channel);
    } catch (e) {
      // The connection is already gone or going. The subscription dies with it,
      // which is the outcome we wanted anyway.
      log.error(`[bus] unsubscribe failed on ${channel}: ${e.message}`);
    }
  };
}

/**
 * Ring the doorbell. Uses the SHARED command connection, not the subscriber —
 * publishing is an ordinary command and needs no connection of its own.
 *
 * Never throws: callers publish immediately after a write that has already
 * succeeded, and losing the notification is not a reason to fail their request.
 *
 * @returns {Promise<number>} subscribers reached, or 0 if the publish failed
 */
export async function publish(channel, payload) {
  try {
    const client = await getRedisClient();
    return (await client.publish(channel, JSON.stringify(payload))) || 0;
  } catch (e) {
    log.error(`[bus] publish failed on ${channel}: ${e.message}`);
    return 0;
  }
}

// How many channels this process is currently subscribed to. Used by the tests
// to prove that tearing down every connection leaves nothing behind.
export function activeChannels() {
  return [...registry().handlers.keys()];
}
