// NEXT'S SERVER START-UP HOOK — error tracking and nothing else.
//
// Node only. The edge runtime runs nothing of ours that can fail in a way worth
// reporting, and the Node SDK cannot load there. The import is DYNAMIC so an
// edge bundle never contains it. `platform/http/sentry.ts` says what is sent
// and what is scrubbed; with no SENTRY_DSN it does nothing at all.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startErrorTracking } = await import("./platform/http/sentry");
  startErrorTracking();
}

// Every error thrown while the server renders a page or answers a route,
// including the pages `withRequest` does not wrap. An error `withRequest`
// already reported is the same object and the SDK sends it once.
export async function onRequestError(...args: unknown[]) {
  // The build's prerender is not a request anybody made — see startErrorTracking.
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { captureRequestError } = await import("./platform/http/sentry");
  (captureRequestError as (...a: unknown[]) => void)(...args);
}
