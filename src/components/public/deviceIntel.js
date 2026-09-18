"use client";

import {
  DEVICE_EVENT_COOKIE, DEVICE_EVENT_MAX_AGE_SEC, FINGERPRINT_PUBLIC_KEY, FINGERPRINT_REGION,
} from "@/shared/deviceIntel";

// FINGERPRINT, IN THE BROWSER — the half that identifies this browser and
// leaves the event id where the sign-in routes can read it. What the id is
// USED for is decided on the server (platform/auth/deviceIntel.ts), which asks
// Fingerprint about the event itself; nothing here is trusted by anything.
//
// THE AGENT IS IMPORTED ON DEMAND, from the sign-in and sign-up pages only.
// It is ~15 KB and the studio's first load is already over its budget, so a
// static import — or a provider around the app — would make every tenant page
// pay for something only the door uses. `import()` in a client module is a real
// lazy boundary (CLAUDE.md, the bundle budget), and it is started once and
// reused by every call on the page.

let agent = null;
let pending = null;
let startedAt = 0;

// Refreshed well inside the server's window, so an event is never judged stale
// between being read here and being checked there.
const REFRESH_AFTER_MS = (DEVICE_EVENT_MAX_AGE_SEC - 2 * 60) * 1000;

function startAgent() {
  if (!agent) {
    agent = import("@fingerprint/agent").then((Fingerprint) =>
      Fingerprint.start({ apiKey: FINGERPRINT_PUBLIC_KEY, region: FINGERPRINT_REGION }));
    // A failed load is not cached: the next call may be on a network that works.
    agent.catch(() => { agent = null; });
  }
  return agent;
}

function writeEvent(eventId) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEVICE_EVENT_COOKIE}=${encodeURIComponent(eventId)}; Path=/; Max-Age=${DEVICE_EVENT_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

/**
 * Identify this browser once, or again once the last event is near its limit.
 * Resolves to the event id, or "" when the agent is blocked or fails — which
 * the server reads as "no event", never as an error the person sees.
 */
export function identifyDevice() {
  if (typeof window === "undefined") return Promise.resolve("");
  if (pending && Date.now() - startedAt < REFRESH_AFTER_MS) return pending;
  startedAt = Date.now();
  pending = startAgent()
    .then((fp) => fp.get({ timeout: 8000 }))
    .then((result) => {
      writeEvent(result.event_id);
      // The installation check asks for this line; production keeps its console quiet.
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console -- development only, and the way the agent is verified.
        console.info("[fingerprint] visitor_id", result.visitor_id, "event_id", result.event_id);
      }
      return result.event_id;
    })
    .catch((error) => {
      // An ad blocker is the usual reason, and the sign-in carries on without it.
      console.warn("[fingerprint] device not identified:", error?.code || error?.message || error);
      pending = null;
      return "";
    });
  return pending;
}

/**
 * Wait for the event before a sign-in request goes out — but never long. The
 * page starts identifying on mount, so this is nearly always already settled;
 * when it is not, a slow agent costs the person at most `ms`.
 */
export function deviceEventReady(ms = 3000) {
  return Promise.race([identifyDevice(), new Promise((resolve) => setTimeout(() => resolve(""), ms))]);
}
