"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// The console's live connection — one per tab, opened on the shell.
//
// Same shape and same reasoning as the studio's LiveProvider (see the long note
// there): a single EventSource, an in-memory fan-out, hidden tabs released
// after a grace period, and a manual retry for the case the browser refuses to
// retry itself. The console's feed is simpler in one respect — no per-event
// permission filtering, because an owner sees everything — so the only things
// it distributes are platform events and notifications.

const SuperLiveContext = createContext(null);

const HIDDEN_GRACE_MS = 60_000;
const BACKOFF_MS = [3_000, 8_000, 20_000, 45_000];

export function useSuperLive() {
  return useContext(SuperLiveContext);
}

export default function SuperLiveProvider({ children }) {
  const [status, setStatus] = useState("connecting");
  const [notifications, setNotifications] = useState([]);

  const source = useRef(null);
  const cursor = useRef("");
  const listeners = useRef(new Set());
  const attempt = useRef(0);
  const timers = useRef({ hide: null, retry: null });

  const subscribe = useCallback((handler) => {
    listeners.current.add(handler);
    return () => listeners.current.delete(handler);
  }, []);

  useEffect(() => {
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

      const qs = cursor.current ? `?since=${encodeURIComponent(cursor.current)}` : "";
      const es = new EventSource(`/api/super/stream${qs}`);
      source.current = es;

      es.addEventListener("ready", (m) => {
        if (!alive) return;
        attempt.current = 0;
        try {
          cursor.current = JSON.parse(m.data).cursor || cursor.current;
        } catch {
          /* keep the cursor we had */
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
        for (const handler of [...listeners.current]) {
          try {
            handler(e);
          } catch (err) {
            console.error("[super-live] listener failed:", err);
          }
        }
      });

      es.addEventListener("notif", (m) => {
        if (!alive) return;
        try {
          const n = JSON.parse(m.data);
          setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, 100)));
        } catch {
          /* ignore an unreadable frame */
        }
      });

      es.addEventListener("bye", () => {});

      es.onerror = () => {
        if (!alive) return;
        // The browser is already retrying — an ordinary recycle, not a fault.
        if (es.readyState === EventSource.CONNECTING) return;
        // Given up for good (most often an expired console session, which lasts
        // a working day). Retry with backoff so the tab recovers by itself.
        disconnect();
        setStatus("offline");
        const wait = BACKOFF_MS[Math.min(attempt.current++, BACKOFF_MS.length - 1)];
        timers.current.retry = setTimeout(connect, wait);
      };
    }

    const onVisibility = () => {
      clearTimeout(timers.current.hide);
      if (document.hidden) {
        timers.current.hide = setTimeout(() => {
          disconnect();
          clearRetry();
          setStatus("connecting");
        }, HIDDEN_GRACE_MS);
      } else if (!source.current) {
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
  }, []);

  const value = useMemo(
    () => ({ status, subscribe, notifications, setNotifications }),
    [status, subscribe, notifications],
  );

  return <SuperLiveContext.Provider value={value}>{children}</SuperLiveContext.Provider>;
}
