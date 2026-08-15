"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// ONE LIVE CONNECTION PER TAB.
//
// Boards do not open connections; this does, once, and hands out subscriptions.
// That is not tidiness — it is a hard browser limit. Over HTTP/1.1 a browser
// allows only SIX connections to a domain, shared across every tab, and an open
// EventSource occupies one for as long as it lives. useLiveUpdates is called 21
// times across the studio boards and THREE times on the Main board alone, so a
// connection per hook would spend half the budget on one page and starve the
// app's ordinary requests — including the very refetches these events trigger.
//
// So: one EventSource, and an in-memory fan-out to however many boards are
// listening. The subscriber list is the same idea as the server-side bus, for
// the same reason.
//
// WHAT THE SERVER SENDS
//   ready   the log position — also stamped as the frame id, so the browser
//           always has a Last-Event-ID to resume from
//   change  something moved: { section, scope, collection, … }, never any data
//   notif   a notification addressed to this person
//   bye     an expected close (recycle / reauthorize / revoked)
//
// WHAT THIS ADDS ON TOP OF EventSource
//   • Hidden tabs disconnect. The polling version this replaces spent nothing
//     on a background tab, and that property was worth keeping: an open
//     connection holds a serverless invocation, so a wall of forgotten tabs is
//     a real cost. After a minute out of sight it lets go, and reconnects from
//     its cursor the moment it is looked at again.
//   • A fatal close is not retried forever. EventSource reconnects on its own
//     after a dropped connection, but gives up permanently on an HTTP error —
//     an expired session, say. That case is retried here with backoff, so the
//     tab recovers on its own once signing in again, instead of sitting dead.

const LiveContext = createContext(null);

// How long a tab may be hidden before the connection is released.
const HIDDEN_GRACE_MS = 60_000;
// Manual retry schedule for a connection the browser refused to retry itself.
const BACKOFF_MS = [3_000, 8_000, 20_000, 45_000];

export function useLive() {
  return useContext(LiveContext);
}

export default function LiveProvider({ slug, children }) {
  // "connecting" until the first `ready`; "offline" only once a fatal close has
  // happened, so the UI never cries wolf over an ordinary reconnect.
  const [status, setStatus] = useState("connecting");
  const [notifications, setNotifications] = useState([]);

  // Everything the connection needs lives in refs: none of it should re-render
  // a board, and none of it should restart the connection when it changes.
  const source = useRef(null);
  const cursor = useRef("");
  const listeners = useRef(new Map()); // watch key → Set<handler>
  const attempt = useRef(0);
  const timers = useRef({ hide: null, retry: null });

  // ---- fan-out ---------------------------------------------------------------
  const fire = useCallback((watch, event) => {
    const set = listeners.current.get(watch);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(event);
      } catch (e) {
        // One board throwing must not stop the others being told.
        console.error(`[live] listener failed for ${watch}:`, e);
      }
    }
  }, []);

  const subscribe = useCallback((watch, handler) => {
    let set = listeners.current.get(watch);
    if (!set) listeners.current.set(watch, (set = new Set()));
    set.add(handler);
    return () => {
      set.delete(handler);
      if (!set.size) listeners.current.delete(watch);
    };
  }, []);

  // ---- the connection --------------------------------------------------------
  useEffect(() => {
    if (!slug) return undefined;
    let alive = true;

    const clearRetry = () => {
      clearTimeout(timers.current.retry);
      timers.current.retry = null;
    };

    function disconnect() {
      source.current?.close();
      source.current = null;
    }

    function connect() {
      if (!alive || source.current) return;
      clearRetry();

      // The cursor rides in the query string here, not in Last-Event-ID: this
      // is a connection WE are opening (first load, or waking a hidden tab), and
      // a fresh EventSource has no Last-Event-ID to send. The browser's own
      // reconnects use the header, and the server accepts either.
      const qs = cursor.current ? `?since=${encodeURIComponent(cursor.current)}` : "";
      const es = new EventSource(`/api/studios/${slug}/stream${qs}`);
      source.current = es;

      es.addEventListener("ready", (m) => {
        if (!alive) return;
        attempt.current = 0;
        try {
          cursor.current = JSON.parse(m.data).cursor || cursor.current;
        } catch {
          /* keep whatever cursor we had */
        }
        setStatus("live");
      });

      es.addEventListener("change", (m) => {
        if (!alive) return;
        let e;
        try {
          e = JSON.parse(m.data);
        } catch {
          return;
        }
        if (m.lastEventId) cursor.current = m.lastEventId;
        // People/permission changes are studio-wide and carry no section;
        // section events carry the key of the section they happened in. Same
        // matching rule the polling version used.
        fire(e.scope === "people" ? "people" : e.section, e);
      });

      es.addEventListener("notif", (m) => {
        if (!alive) return;
        try {
          const n = JSON.parse(m.data);
          setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, 100)));
        } catch {
          /* ignore a frame we cannot read */
        }
      });

      // An expected close. The browser reconnects by itself for `recycle` and
      // `reauthorize`; `revoked` means this person no longer belongs here, and
      // the reconnect will be turned away — which is the enforcement, not a bug.
      es.addEventListener("bye", () => {});

      es.onerror = () => {
        if (!alive) return;
        // CONNECTING means the browser is already retrying on its own — the
        // ordinary end of a recycled connection. Nothing to do and nothing to
        // report; saying "offline" here would flash a warning every 4 minutes.
        if (es.readyState === EventSource.CONNECTING) return;

        // CLOSED means the browser has given up for good (an HTTP error, most
        // often an expired session). It will never retry, so we must.
        disconnect();
        setStatus("offline");
        const wait = BACKOFF_MS[Math.min(attempt.current++, BACKOFF_MS.length - 1)];
        timers.current.retry = setTimeout(connect, wait);
      };
    }

    // ---- hidden tabs ---------------------------------------------------------
    const onVisibility = () => {
      clearTimeout(timers.current.hide);
      if (document.hidden) {
        timers.current.hide = setTimeout(() => {
          disconnect();
          clearRetry();
          setStatus("connecting");
        }, HIDDEN_GRACE_MS);
      } else if (!source.current) {
        // Back in view: reconnect from the cursor, so the gap is replayed
        // rather than skipped.
        attempt.current = 0;
        connect();
      }
    };

    connect();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(timers.current.hide);
      clearRetry();
      disconnect();
    };
  }, [slug, fire]);

  const value = useMemo(
    () => ({ slug, status, subscribe, notifications, setNotifications }),
    [slug, status, subscribe, notifications],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
