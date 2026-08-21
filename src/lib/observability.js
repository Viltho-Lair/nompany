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
import { currentCount, withCommandCount } from "@/lib/data/commandCount";
import { withRequestCache } from "@/lib/data/requestCache";

const storage = new AsyncLocalStorage();
const isProd = process.env.NODE_ENV === "production";

// Keys whose VALUE is never safe to print, whatever it is called in context.
const SECRET_KEYS = /^(password|passwordhash|token|sessiontoken|tokenhash|code|secret|apikey|authorization|cookie|idnumber|passportnumber|salary|content|body)$/i;
// Values that look like a credential even under an innocent key.
const SECRET_SHAPE = /^[A-Za-z0-9_-]{40,}$/;

/**
 * Strip anything that must not be logged. Applied to every payload, so a new
 * call site cannot leak by forgetting.
 */
export function redact(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (typeof value === "string") return SECRET_SHAPE.test(value) ? "<redacted>" : value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = SECRET_KEYS.test(key) ? "<redacted>" : redact(v, depth + 1);
  }
  return out;
}

// JSON.stringify throws on a cycle, and a logger that can throw is worse than no
// logger: it turns a line somebody wanted into a request somebody lost. Caught
// by a test that logged an object pointing at itself.
function safely(value) {
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
    return `<unserialisable: ${e?.message || "unknown"}>`;
  }
}

function emit(level, message, fields = {}) {
  const request = storage.getStore();
  const line = {
    level,
    at: new Date().toISOString(),
    msg: message,
    ...(request ? { requestId: request.id, route: request.route } : {}),
    ...redact(fields),
  };
  const write = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (isProd) { write(safely(line)); return; }
  const extras = Object.entries(line)
    .filter(([k]) => !["level", "at", "msg", "requestId"].includes(k))
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : safely(v)}`)
    .join(" ");
  write(`${level.toUpperCase().padEnd(5)} ${request ? `[${request.id.slice(0, 8)}] ` : ""}${message}${extras ? `  ${extras}` : ""}`);
}

export const log = {
  info: (message, fields) => emit("info", message, fields),
  warn: (message, fields) => emit("warn", message, fields),
  error: (message, fields) => emit("error", message, fields),
};

/** The current request's id, or "" outside one. Put it on error responses. */
export const requestId = () => storage.getStore()?.id || "";

/**
 * Run a request inside a logging scope, and emit one completion line.
 *
 * The completion line carries the hop count, which is why this wraps rather than
 * decorates: the counter has to be established before the handler runs and read
 * after it finishes.
 */
export async function withRequest(route, fn) {
  const scope = { id: randomUUID(), route, startedAt: Date.now() };
  return storage.run(scope, async () => {
    try {
      // The command counter is established HERE rather than by the caller, so
      // the completion line can report hops without every route remembering to
      // ask for them. A number that has to be opted into is a number that is
      // missing from the routes nobody suspected.
      let counted = null;
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
      emit("error", "request failed", { error: error?.message, stack: error?.stack?.split("\n")[1]?.trim() });
      finish(scope, "error", null);
      throw error;
    }
  });
}

function finish(scope, outcome, counted) {
  emit("info", "request finished", {
    outcome,
    ms: Date.now() - scope.startedAt,
    // Absent when nothing established a command counter — the field being
    // missing is itself informative, so it is not defaulted to zero.
    ...(counted ? { redisCommands: counted.commands, redisWaves: counted.waves } : {}),
  });
}
