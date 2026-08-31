// COUNTING ROUND TRIPS, WHICHEVER STORE ANSWERS THEM, so the count can stay
// part of the contract through the Postgres migration (P1) and not just up to it.
//
// The audit's largest finding is not a bug in any one file: rendering one Sales
// screen costs EIGHT dependent Redis round trips, measured at 1421ms, where the
// same fifteen keys fetched in one batch cost 180ms. The hop count is the
// defect — it survives any amount of co-location, because each hop supplies the
// key the next one needs. THAT DEFECT IS ABOUT ROUND TRIPS, NOT ABOUT REDIS —
// the identical mistake (fetch A, then use A to fetch B, then B to fetch C)
// costs exactly as much wall-clock time whether each fetch is a GET or a
// SELECT. So this module counts either: a Redis command increments `commands`,
// a SQL statement increments `queries`, and the ceiling asserted in Gate A is
// meaningful in whichever backend `DB_BACKEND` (sections.ts) has active —
// Redis today, Postgres after cutover, both under `parity`.
//
// A number nobody measures goes back up. So the count is asserted per route in
// the suite, exactly like a response body: a route that regresses from two hops
// to eight fails the build rather than being discovered in production six weeks
// later.
//
// HOW IT ATTACHES. `withCommandCount` runs its callback inside an
// AsyncLocalStorage scope; the Redis client is wrapped in a Proxy that reports
// each call into whatever scope is active, and pg.ts's `run()` reports each SQL
// statement into the identical scope through `countedQuery`. Outside a scope
// there is no store and nothing is recorded — so production pays one property
// lookup per command, against a network round trip, which is not a cost worth
// optimising away.
//
// TWO NAMES, NEVER ONE OVERLOADED FIELD. `commands` is Redis-only and `queries`
// is SQL-only, so a completion line (or a Gate A assertion) can always tell
// which store did the work, and a route split across both — nothing does this
// yet, but `parity` mode runs both stores for every call — reports each
// honestly instead of one number that means two different things depending on
// which environment variable happened to be set.
//
// `queries` ITSELF SPLITS INTO TWO KINDS, neither of them exposed as a separate
// top-level field: a CALLER's own statement (a route's SELECT/INSERT/UPDATE/
// DELETE) counts toward `queries` directly, while the transaction envelope
// pg.ts wraps around it (BEGIN, the `set_config` that sets the tenant, COMMIT,
// ROLLBACK) counts toward `envelope` instead. Both go through `countedQuery`
// so neither is invisible to the counter — see its header below for why only
// `queries` is what Gate A puts a ceiling on.
//
// WHAT COUNTS AS A HOP, for Redis. One command sent to Redis. `Promise.all` of
// six GETs is six commands but ONE round trip in wall-clock terms, so the
// counter records both: `commands` is the total, and `waves` counts how many
// times the code waited — which is the number that actually predicts latency. A
// wave is closed whenever a command resolves and no other command is in
// flight. `waves` STAYS REDIS-ONLY (see `opened` below) rather than being
// generalised to SQL: every existing wave ceiling in Gate A was measured
// against Redis round trips, and folding in the fixed BEGIN/COMMIT bookkeeping
// every `withTenant` call pays would move those ceilings the moment a route's
// backend flips to Postgres, for reasons that have nothing to do with the route
// doing more work. `queries` is the number built for that comparison instead.

import { AsyncLocalStorage } from "node:async_hooks";

// WHAT ONE COUNTING SCOPE HOLDS. `inFlight` is the only mutable-by-accident
// field here and it is the one that decides whether a wave opens, so it is named
// rather than inferred: a scope with a wrong inFlight reports plausible numbers.
//
// `names`/`keys` ARE SHARED ACROSS EVERY KIND — Redis commands, SQL data
// statements and SQL envelope statements all land in the same two lists, in the
// order they actually ran, because a trace (`NOMPANY_HOP_TRACE=1` in gate-a.mjs)
// is only useful if it shows the true sequence rather than three sequences a
// reader has to interleave by hand.
type Counter = {
  commands: number;
  queries: number;
  envelope: number;
  waves: number;
  inFlight: number;
  names: string[];
  keys: string[];
};

/** What a scope reports about itself. */
export type CountReport<T> = {
  result: T;
  commands: number;
  queries: number;
  envelope: number;
  waves: number;
  names: string[];
  keys: string[];
};

const storage = new AsyncLocalStorage<Counter>();

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
 */
export async function withCommandCount<T>(fn: () => T | Promise<T>): Promise<CountReport<T>> {
  const existing = storage.getStore();
  if (existing) {
    const before = {
      commands: existing.commands, queries: existing.queries,
      envelope: existing.envelope, waves: existing.waves,
    };
    const beforeNames = existing.names.length;
    const beforeKeys = existing.keys.length;
    const result = await fn();
    return {
      result,
      // What THIS scope contributed, so a nested reader still describes itself
      // rather than everything that happened to be in flight around it.
      commands: existing.commands - before.commands,
      queries: existing.queries - before.queries,
      envelope: existing.envelope - before.envelope,
      waves: existing.waves - before.waves,
      names: existing.names.slice(beforeNames),
      keys: existing.keys.slice(beforeKeys),
    };
  }

  const store: Counter = { commands: 0, queries: 0, envelope: 0, waves: 0, inFlight: 0, names: [], keys: [] };
  const result = await storage.run(store, fn);
  return {
    result, commands: store.commands, queries: store.queries, envelope: store.envelope,
    waves: store.waves, names: store.names, keys: store.keys,
  };
}

/** The counter for the current scope, or null outside one. */
export function currentCount(): Omit<CountReport<never>, "result"> | null {
  const store = storage.getStore();
  return store
    ? {
      commands: store.commands, queries: store.queries, envelope: store.envelope, waves: store.waves,
      names: [...store.names], keys: [...store.keys],
    }
    : null;
}

// WHICH KEY, not just which command. `waves` says how many times the code
// waited; only the key says WHY — whether the same value was fetched twice
// (which a request-scoped cache collapses) or seventeen different ones (which
// only batching helps). Designing W8 without this is guessing at which of the
// two problems you have.
//
// THREE KINDS, ONE SET OF PLUMBING. "commands" is a Redis command; "queries" is
// a caller's own SQL statement; "envelope" is the transaction bookkeeping pg.ts
// wraps around it. All three are reported into the trace (`names`/`keys`)
// identically, so nothing is invisible to a reader — only the numeric field
// they increment differs, and only "commands" ever opens a wave: see the
// module header for why generalising `waves` to SQL would move an existing
// Redis ceiling for reasons that have nothing to do with the route.
type CounterKind = "commands" | "queries" | "envelope";
type Handle = { store: Counter; kind: CounterKind } | null;

function opened(name: string, key: unknown, kind: CounterKind): Handle {
  const store = storage.getStore();
  if (!store) return null;
  store[kind] += 1;
  store.names.push(name);
  if (typeof key === "string") store.keys.push(key);
  if (kind === "commands") {
    // A wave opens when the first command starts with nothing else in flight.
    if (store.inFlight === 0) store.waves += 1;
    store.inFlight += 1;
  }
  return { store, kind };
}

function closed(handle: Handle): void {
  if (handle && handle.kind === "commands") handle.store.inFlight -= 1;
}

/**
 * Wrap a node-redis client so every command reports itself.
 *
 * Deliberately a Proxy rather than a hand-written façade: node-redis exposes a
 * large and version-dependent surface, and a façade would silently stop counting
 * whichever method somebody reached for next.
 */
// GENERIC, because a Proxy hands back exactly what it wrapped. Naming
// node-redis's client type here would mean naming its generic parameters too,
// and those change between versions for reasons that have nothing to do with
// counting commands — the wrapper does not care what it is wrapping.
export function countingClient<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || typeof prop !== "string" || NOT_A_COMMAND.has(prop)) {
        return typeof value === "function" ? value.bind(target) : value;
      }

      return function counted(...args: unknown[]) {
        const handle = opened(prop, args[0], "commands");
        let out;
        try {
          out = value.apply(target, args);
        } catch (e) {
          closed(handle);
          throw e;
        }
        // scanIterator and friends return async iterables, not promises. They
        // are one logical hop from the caller's point of view; the SCAN cursor
        // loop underneath is the store's business, not the route's.
        if (!out || typeof out.then !== "function") {
          closed(handle);
          return out;
        }
        return out.then(
          (v: unknown) => { closed(handle); return v; },
          (e: unknown) => { closed(handle); throw e; },
        );
      };
    },
  });
}

/**
 * Wrap one SQL statement so it reports into the active counting scope — the
 * SQL-side mirror of `countingClient` above, called from pg.ts's `run()` so
 * every statement that reaches Postgres (`pgQuery`, `pgTx`, `withTenant`,
 * `pgSchemaQuery`) is counted the same way, with no second door.
 *
 * `kind` is "data" for a CALLER's own statement — the SELECT/INSERT/UPDATE/
 * DELETE a route actually asked for, which is what `queries` counts — and
 * "envelope" for the transaction bookkeeping pg.ts wraps around it (BEGIN, the
 * `set_config` that sets the tenant, COMMIT, ROLLBACK). Both are reported so
 * neither is an invisible round trip; only "data" feeds `queries`, because the
 * envelope's cost tracks how many SEPARATE `withTenant` scopes a route happens
 * to open rather than how much it asked the database for — a route that reads
 * two collections inside one shared scope and one that opens two independent
 * scopes ask for the identical DATA, so a ceiling meant to catch "N times the
 * work" has to charge them the same `queries`, even though the second pays
 * more envelope. `envelope` is still reported (CountReport, the completion
 * line) so that difference is visible to a reader — just not to the ceiling.
 */
export function countedQuery<T>(
  name: string,
  key: string | undefined,
  fn: () => Promise<T>,
  kind: "data" | "envelope" = "data",
): Promise<T> {
  const handle = opened(name, key, kind === "data" ? "queries" : "envelope");
  return fn().then(
    (v) => { closed(handle); return v; },
    (e) => { closed(handle); throw e; },
  );
}
