// THE DOORBELL, ON POSTGRES.
//
// This module used to be Redis pub/sub, and its shape is unchanged: publishers
// ring a channel, one connection per process listens, and delivery fans out in
// memory to however many handlers that process holds. What changed underneath
// is the transport — and one property of the old one is genuinely gone, so it
// is stated here rather than discovered.
//
// WHY NOT LISTEN/NOTIFY, which is the obvious Postgres analogue. Two reasons,
// both structural. NOTIFY is bound to a session, and this deployment pools in
// transaction mode, where a session is not yours between statements. And the
// only path Vercel has to the database is the Cloud Run gateway, which is a
// stateless request/response door — there is no connection to hold a LISTEN on.
// So the doorbell is a POLL of the events table, by primary-key range, which
// is the cheapest read Postgres has.
//
// WHAT THAT COSTS: latency. A Redis publish reached a subscriber in about a
// millisecond; a poll reaches one in up to BUS_POLL_MS. What it does NOT cost
// is correctness — invariant 12 said the stream is truth and pub/sub is only a
// doorbell, and a doorbell that rings a second late still rings. The stream
// itself (platform/realtime/events.ts, through xAdd/xAfter) carries the ids a
// client resumes from, and that path is exact.
//
// WHY ONE POLLER PER PROCESS, NOT ONE PER SUBSCRIBER — the same reason invariant
// 13 gave for one Redis subscriber connection, and it survives the move intact.
// A poller per handler would multiply an identical query by the number of open
// SSE streams, which on a busy studio is dozens of connections all asking the
// same question. One loop asks once for every channel this process cares about
// and fans the answer out in memory.
import { pgQuery } from "@/platform/db/pg";
import { KEY_PREFIX } from "@/platform/db/keys";
import { log } from "@/platform/http/observability";

// ---- channels --------------------------------------------------------------
// Namespaced away from the key space (`s:` `u:` `g:` …) on purpose: a channel is
// not a key, and no cascade should ever match one.
//
// BUT IT CARRIES THE KEY PREFIX, and that is new. A Redis channel was
// ephemeral — nothing persisted it, so a test run's channels vanished with the
// publish. Here a publish is a ROW in a shared table, and an unprefixed channel
// is a row no namespace sweep can find: `delPrefix("test_x_")` matched
// `test_x_s:<id>:events` and left `ev:s:<id>` behind, permanently, on every run.
// The prefix is what makes a channel belong to the namespace that created it.
//
// It is read through keys.ts rather than assembled here, because that module is
// where a namespaced name is allowed to be built (invariant 1).
export const CH = {
  studio: (studioId: string) => `${KEY_PREFIX}ev:s:${studioId}`,
  user: (userId: string) => `${KEY_PREFIX}nt:u:${userId}`,
  super: `${KEY_PREFIX}ev:super`,
};

// ---- the per-process registry ----------------------------------------------
// Pinned to globalThis because Next's dev server re-evaluates modules on every
// hot reload. Without this, each edit would leak another poller and every
// message would be delivered once per surviving copy.
const GLOBAL_KEY = Symbol.for("nompany.bus");

/** What one handler is handed. A published payload is JSON and nothing more. */
export type BusHandler = (payload: unknown) => void;

type Registry = {
  handlers: Map<string, Set<BusHandler>>;
  /** Per-channel high-water mark: the last event id this process has delivered. */
  cursors: Map<string, string>;
  timer: ReturnType<typeof setTimeout> | null;
  /** Set while a tick is in flight, so a slow query cannot overlap itself. */
  ticking: boolean;
};

// A SYMBOL-KEYED GLOBAL, AND ONE CAST TO REACH IT. Hanging the registry off
// globalThis is the whole mechanism — Next's dev server re-evaluates modules on
// every change, and a module-level Map would be a NEW map each time while the
// old timer kept running, so every message would arrive once per surviving
// copy. `Symbol.for` yields a plain `symbol` rather than a `unique symbol`, so
// it cannot name a property in a type; a symbol index signature is the shape
// that does, and it is applied here rather than at each use.
type SymbolStore = { [key: symbol]: Registry | undefined };

/** How often the poller asks. Small enough to feel live, large enough to be free. */
export const BUS_POLL_MS = Number(process.env.BUS_POLL_MS) || 1000;

/** Most rows one tick will take, so a backlog cannot become one enormous query. */
const MAX_PER_TICK = 500;

// Kept as the poller's identity for logs. It named a Redis CLIENT SETNAME once;
// there is no connection to name any more, but the invariant it stood for —
// there should never be more than one of these per running process — is the
// same one the single timer below enforces.
export const SUB_NAME = "nompany-bus-sub";

function registry(): Registry {
  const g = globalThis as unknown as SymbolStore;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      // channel → Set<handler>. The set IS the refcount: a channel is polled
      // when its first handler arrives and dropped when its last one leaves.
      handlers: new Map(),
      cursors: new Map(),
      timer: null,
      ticking: false,
    };
  }
  return g[GLOBAL_KEY]!;
}

function deliver(channel: string, payload: unknown) {
  const set = registry().handlers.get(channel);
  if (!set) return;
  for (const handler of set) {
    // ONE BAD HANDLER MUST NOT SILENCE THE REST. A throwing handler used to
    // take the whole delivery with it, which on an SSE fan-out meant one
    // disconnected client stopping updates for everyone else on the channel.
    try { handler(payload); } catch (e) {
      log.error(`[bus] handler threw on ${channel}`, { error: (e as Error).message });
    }
  }
}

async function tick() {
  const reg = registry();
  // A tick that overruns its interval must not start a second copy of itself:
  // two in-flight queries would both read from the same cursor and deliver the
  // same rows twice.
  if (reg.ticking) return;
  const channels = [...reg.handlers.keys()];
  if (!channels.length) return;

  reg.ticking = true;
  try {
    // ONE QUERY FOR EVERY CHANNEL, not one per channel. `id > cursor` per
    // channel is expressed as a join against the cursors this process holds,
    // which keeps the round trip count at one however many studios this
    // instance is serving.
    const cursors = channels.map((c) => reg.cursors.get(c) ?? "0");
    const { rows } = await pgQuery<{ id: string; channel: string; payload: unknown }>(
      `SELECT e.id::text AS id, e.channel, e.payload
         FROM events e
         JOIN unnest($1::text[], $2::bigint[]) AS w(channel, cursor)
           ON w.channel = e.channel AND e.id > w.cursor
        ORDER BY e.id
        LIMIT ${MAX_PER_TICK}`,
      [channels, cursors],
    );
    for (const row of rows) {
      // The cursor advances BEFORE delivery. A handler that throws has already
      // been given its chance; replaying the row to it on the next tick would
      // turn one broken handler into an endless loop.
      reg.cursors.set(row.channel, row.id);
      deliver(row.channel, row.payload);
    }
  } catch (e) {
    // A failed poll is a missed doorbell, not a lost event — the row is still
    // in the table and the cursor did not move, so the next tick collects it.
    log.error(`[bus] poll failed`, { error: (e as Error).message });
  } finally {
    reg.ticking = false;
  }
}

function ensurePolling() {
  const reg = registry();
  if (reg.timer) return;
  // `unref` so a poller never holds a process open — a script that subscribes
  // and finishes should exit, not hang until someone clears the timer.
  const t = setInterval(() => { void tick(); }, BUS_POLL_MS);
  if (typeof (t as { unref?: () => void }).unref === "function") (t as { unref: () => void }).unref();
  reg.timer = t;
}

function stopPollingIfIdle() {
  const reg = registry();
  if (reg.handlers.size || !reg.timer) return;
  clearInterval(reg.timer);
  reg.timer = null;
}

/**
 * Listen on a channel. Returns an unsubscribe function that is safe to call
 * more than once — SSE teardown runs from both the abort signal and the normal
 * close path, and neither should have to know whether the other got there
 * first.
 */
export async function subscribe(channel: string, handler: BusHandler): Promise<() => Promise<void>> {
  const reg = registry();
  let set = reg.handlers.get(channel);

  if (!set) {
    set = new Set();
    reg.handlers.set(channel, set);
    // Register the handler BEFORE the first poll, so an event published the
    // instant the subscription lands is not dropped on the floor.
    set.add(handler);
    try {
      // START FROM NOW, NOT FROM THE BEGINNING. A new subscriber is asking
      // "tell me what happens next", and the channel may hold days of history.
      // Replay is the STREAM's job (events.ts, by Last-Event-ID), and it is a
      // different question with a different answer.
      const { rows } = await pgQuery<{ last: string | null }>(
        `SELECT max(id)::text AS last FROM events WHERE channel = $1`, [channel],
      );
      reg.cursors.set(channel, rows[0]?.last ?? "0");
    } catch (e) {
      // Could not establish a starting point: drop the half-built entry so the
      // next caller retries from scratch rather than listening from id 0 and
      // replaying the channel's whole history at one unlucky handler.
      set.delete(handler);
      if (!set.size) reg.handlers.delete(channel);
      throw e;
    }
    ensurePolling();
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
    reg.cursors.delete(channel);
    stopPollingIfIdle();
  };
}

/**
 * Ring the doorbell.
 *
 * Never throws: callers publish immediately after a write that has already
 * succeeded, and losing the notification is not a reason to fail their request.
 * That contract is why events.ts can write the stream first and ring second and
 * still be correct — the stream is the truth either way.
 *
 * @returns 1 when the notification was recorded, 0 when it was not. Redis
 * returned the number of subscribers reached; nothing can answer that here,
 * because the subscribers are other processes polling a table and this call
 * cannot see them. No caller in this codebase reads the number for anything
 * beyond "did it work", which is what it now says.
 */
export async function publish(channel: string, payload: unknown): Promise<number> {
  try {
    await pgQuery(`INSERT INTO events (channel, payload) VALUES ($1, $2::json)`,
      [channel, JSON.stringify(payload)]);
    return 1;
  } catch (e) {
    log.error(`[bus] publish failed on ${channel}`, { error: (e as Error).message });
    return 0;
  }
}

// How many channels this process is currently subscribed to. Used by the tests
// to prove that tearing everything down leaves nothing behind.
export function activeChannels() {
  return [...registry().handlers.keys()];
}
