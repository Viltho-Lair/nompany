import { log } from "@/platform/http/observability";
// SERVER-SENT EVENTS — the transport, with none of the app in it.
//
// One long-lived HTTP response per connected tab, over which the server writes
// text frames whenever it has something to say. The browser's own EventSource
// handles reconnection, so the client code that consumes this is small; the
// difficulty is all on this side, in the lifecycle.
//
// WHY SSE RATHER THAN WEBSOCKETS. Everything here travels one way — server to
// browser, "something changed, go look". SSE is plain HTTP: it needs no
// upgrade handshake, no separate server, no provider, and it carries the
// session cookie automatically, so authorisation is the same code as every
// other route. WebSockets would buy a return channel this app has no use for
// and cost an infrastructure dependency it does not have.
//
// THE FOUR THINGS THAT ACTUALLY BREAK, and what is done about them:
//
//  1. BUFFERING. A response that is assembled before it is returned arrives all
//     at once, at the end — which looks exactly like "real-time is broken". So
//     the Response is returned IMMEDIATELY and filled afterwards, and the
//     headers tell every intermediary not to buffer or transform it.
//  2. IDLE CONNECTIONS GET KILLED. Proxies, load balancers and phone networks
//     drop a connection that has been silent for a while, usually without
//     telling anyone. A heartbeat comment every 25s keeps it demonstrably
//     alive; EventSource ignores comment frames entirely.
//  3. THE PLATFORM HAS A CEILING. A serverless function cannot run forever
//     (300s here). Being cut off at the ceiling looks like an error; so the
//     server closes cleanly a good margin BEFORE it, and the browser reconnects
//     on its own. A close is normal operation, not a failure.
//  4. TEARDOWN RUNS TWICE. The abort signal and the timed close race each
//     other, and enqueueing to an already-closed controller throws. Everything
//     below is idempotent for that reason.

const ENCODER = new TextEncoder();

// Comfortably under the proxies that give up at 30s, and well under the 60s
// ones, without being chatty enough to matter: ~10 bytes, ten times a
// connection lifetime.
const HEARTBEAT_MS = 25_000;

// Close at 4 minutes against a 300s function ceiling. The 60s of headroom is
// deliberate: a close we choose is graceful and replays cleanly, a close the
// platform imposes is an error the client has to recover from.
const LIFETIME_MS = 240_000;

// How long the browser waits before reconnecting. The default is 3s and this
// restates it explicitly, because it is a number worth being deliberate about
// rather than inheriting.
const RETRY_MS = 3_000;

// Some corporate proxies will not release a response to the client until they
// have seen a couple of kilobytes of it, which would stall the first event
// behind an arbitrary amount of traffic. A padding comment costs one packet
// once per connection and removes the failure mode.
const PREAMBLE = `:${" ".repeat(2048)}\n\n`;

/**
 * Open an SSE response.
 *
 * `start` is called once with a connection handle and should return a cleanup
 * function (or a promise of one). Cleanup is guaranteed to run exactly once,
 * whichever way the connection ends.
 *
 * @param {Request} request  its `signal` is how we learn the client went away
 * @param {(conn: {
 *   send: (event: string, data: any, id?: string) => void,
 *   close: () => void,
 *   readonly open: boolean,
 * }) => (void | (() => void) | Promise<void | (() => void)>)} start
 */
export function sseResponse(request, start) {
  let controller = null;
  let closed = false;
  let cleanup = null;
  let heartbeat = null;
  let lifetime = null;

  const write = (chunk) => {
    if (closed || !controller) return;
    try {
      controller.enqueue(ENCODER.encode(chunk));
    } catch {
      // The client vanished between our check and this write. Nothing to
      // report — it is the ordinary way a connection ends.
      shutdown();
    }
  };

  function shutdown() {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(lifetime);
    try {
      // Cleanup is typically async (releasing a bus subscription). We do not
      // wait for it — the response is over either way — but an ignored
      // rejection here would surface as an unhandled one, so it is caught.
      Promise.resolve(cleanup?.()).catch((e) =>
        log.error(`[sse] cleanup failed: ${e.message}`),
      );
    } catch (e) {
      log.error(`[sse] cleanup failed: ${e.message}`);
    }
    try {
      controller?.close();
    } catch {
      // Already closed by the platform or by an aborted request. Fine.
    }
  }

  const conn = {
    // A frame the browser will hand to onmessage/addEventListener. The id
    // becomes the client's Last-Event-ID, which is what lets a reconnect resume
    // exactly where it left off — so it must be the real log cursor, never a
    // made-up counter.
    send(event, data, id) {
      let frame = "";
      if (id) frame += `id: ${id}\n`;
      if (event) frame += `event: ${event}\n`;
      frame += `data: ${JSON.stringify(data)}\n\n`;
      write(frame);
    },
    close: shutdown,
    get open() {
      return !closed;
    },
  };

  const stream = new ReadableStream({
    start(c) {
      controller = c;

      write(PREAMBLE);
      write(`retry: ${RETRY_MS}\n\n`);

      // If the client is already gone, don't bother setting anything up.
      if (request.signal.aborted) return shutdown();
      request.signal.addEventListener("abort", shutdown, { once: true });

      heartbeat = setInterval(() => write(`: ping\n\n`), HEARTBEAT_MS);

      // Tell the client this close is expected before making it, so a
      // deliberate recycle is never mistaken for a fault.
      lifetime = setTimeout(() => {
        conn.send("bye", { reason: "recycle" });
        shutdown();
      }, LIFETIME_MS);

      // NOT awaited: the Response must go back to the client now. Anything slow
      // in here (permission lookups, replay) happens while the connection is
      // already open, rather than delaying the headers behind it.
      Promise.resolve()
        .then(() => start(conn))
        .then((fn) => {
          cleanup = typeof fn === "function" ? fn : null;
          // The connection may have ended while start() was still running, in
          // which case shutdown() already ran and never saw this cleanup.
          if (closed) {
            Promise.resolve(cleanup?.()).catch(() => {
              /* nothing left to unwind */
            });
            cleanup = null;
          }
        })
        .catch((e) => {
          log.error(`[sse] start failed: ${e.message}`);
          shutdown();
        });
    },
    cancel: shutdown,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform matters as much as no-cache: it tells intermediaries not
      // to compress, and a compression buffer is a buffer like any other.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // For any nginx-family proxy in the path, the explicit "do not buffer".
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * The cursor a reconnecting client is resuming from. The browser sends it
 * automatically as a header; the query fallback is for the first connection
 * after a soft navigation, where the client knows its cursor but EventSource
 * has not been given one yet.
 */
export function resumeCursor(request) {
  return (
    request.headers.get("last-event-id") ||
    new URL(request.url).searchParams.get("since") ||
    ""
  );
}
