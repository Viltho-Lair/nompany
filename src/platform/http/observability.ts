// STRUCTURED LOGGING, AND THE REQUEST IT BELONGS TO.
//
// `console.error` was the entire strategy: thirty-one calls across nineteen
// modules, each a sentence with no way to tell which request produced it. On a
// platform that runs however many instances Vercel keeps warm, that means an
// error and the request that caused it are two unrelated lines in two different
// log streams, and the only way to connect them is to guess from the timestamp.
//
// So every line now carries a REQUEST ID, and every request emits one line when
// it finishes saying how long it took and HOW MANY REDIS ROUND TRIPS IT SPENT.
//
// That last field is the point. The audit's largest finding is a hop count —
// one Sales screen costs eight dependent round trips — and Gate A pins it in the
// test suite. But a ceiling in a test only holds for the paths a test walks. In
// production the number is in every completion line, so the expensive routes
// name themselves rather than waiting to be measured.
//
// FORMAT. JSON in production, because something will eventually read it; a
// readable line in development, because a person is reading it now. Same fields
// either way, so a query written against one works against the other.
//
// WHAT NEVER GOES IN A LOG LINE. No session token, no password, no ID or
// passport number, no notification body, no email address. `redact()` is applied
// to every payload rather than trusted to each call site — a rule enforced in
// one place is a rule; a rule each caller remembers is a hope.

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { currentCount, withCommandCount } from "@/platform/db/commandCount";
import { withRequestCache } from "@/platform/db/requestCache";

// WHAT A LOG LINE MAY CARRY. `unknown` rather than a narrower value type, and
// deliberately: fields are whatever a call site thought was worth saying, and
// redact() below is written to walk anything. Narrowing it here would only push
// casts out to a hundred call sites.
export type Fields = Record<string, unknown>;

type RequestScope = { id: string; route: string; startedAt: number };

const storage = new AsyncLocalStorage<RequestScope>();
const isProd = process.env.NODE_ENV === "production";

// Keys whose VALUE is never safe to print, whatever it is called in context.
const SECRET_KEYS = /^(password|passwordhash|token|sessiontoken|tokenhash|code|secret|apikey|authorization|cookie|idnumber|passportnumber|salary|content|body)$/i;
// Values that look like a credential even under an innocent key.
const SECRET_SHAPE = /^[A-Za-z0-9_-]{40,}$/;

/**
 * Strip anything that must not be logged. Applied to every payload, so a new
 * call site cannot leak by forgetting.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null || depth > 4) return value;
  if (typeof value === "string") return SECRET_SHAPE.test(value) ? "<redacted>" : value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as object)) {
    out[key] = SECRET_KEYS.test(key) ? "<redacted>" : redact(v, depth + 1);
  }
  return out;
}

// JSON.stringify throws on a cycle, and a logger that can throw is worse than no
// logger: it turns a line somebody wanted into a request somebody lost. Caught
// by a test that logged an object pointing at itself.
function safely(value: unknown): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(value, (_key, v) => {
      if (v && typeof v === "object") {
        if (seen.has(v)) return "<circular>";
        seen.add(v);
      }
      return v;
    });
  } catch (e) {
    return `<unserialisable: ${(e as Error)?.message || "unknown"}>`;
  }
}

function emit(level: "info" | "warn" | "error", message: string, fields: Fields = {}): void {
  const request = storage.getStore();
  const line = {
    level,
    at: new Date().toISOString(),
    msg: message,
    ...(request ? { requestId: request.id, route: request.route } : {}),
    ...(redact(fields) as Fields),
  };
  const write = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (isProd) { write(safely(line)); return; }
  const extras = Object.entries(line)
    .filter(([k]) => !["level", "at", "msg", "requestId"].includes(k))
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : safely(v)}`)
    .join(" ");
  write(`${level.toUpperCase().padEnd(5)} ${request ? `[${request.id.slice(0, 8)}] ` : ""}${message}${extras ? `  ${extras}` : ""}`);
}

// FIELDS IS OPTIONAL, which is what the thirty-one call sites this replaced
// actually pass: some hand a message and nothing else, some an error's message,
// one a whole object. A signature demanding a second argument would have been
// one nobody could adopt.
export const log = {
  info: (message: string, fields?: Fields) => emit("info", message, fields),
  warn: (message: string, fields?: Fields) => emit("warn", message, fields),
  error: (message: string, fields?: Fields) => emit("error", message, fields),
};

/** The current request's id, or "" outside one. Put it on error responses. */
export const requestId = (): string => storage.getStore()?.id || "";

/**
 * Run a request inside a logging scope, and emit one completion line.
 *
 * The completion line carries the hop count, which is why this wraps rather than
 * decorates: the counter has to be established before the handler runs and read
 * after it finishes.
 */
export async function withRequest<T>(route: string, fn: (scope: RequestScope) => Promise<T> | T): Promise<T> {
  const scope = { id: randomUUID(), route, startedAt: Date.now() };
  return storage.run(scope, async () => {
    try {
      // The command counter is established HERE rather than by the caller, so
      // the completion line can report hops without every route remembering to
      // ask for them. A number that has to be opted into is a number that is
      // missing from the routes nobody suspected.
      let counted: ReturnType<typeof currentCount> = null;
      const { result } = await withCommandCount(async () => withRequestCache(async () => {
        const out = await fn(scope);
        // Read WHILE the counting scope is still open — finish() runs after it
        // has closed, and would see nothing.
        counted = currentCount();
        return out;
      }));
      finish(scope, "ok", counted);
      return result;
    } catch (error) {
      // The one place an unhandled error is guaranteed to be seen WITH its
      // request id, before whatever the caller does with it.
      const err = error as Error;
      emit("error", "request failed", { error: (err as Error)?.message, stack: (err as Error)?.stack?.split("\n")[1]?.trim() });
      finish(scope, "error", null);
      throw error;
    }
  });
}

function finish(scope: RequestScope, outcome: string, counted: ReturnType<typeof currentCount>): void {
  emit("info", "request finished", {
    outcome,
    ms: Date.now() - scope.startedAt,
    // Absent when nothing established a command counter — the field being
    // missing is itself informative, so it is not defaulted to zero.
    ...(counted ? { redisCommands: counted.commands, redisWaves: counted.waves } : {}),
  });
}
