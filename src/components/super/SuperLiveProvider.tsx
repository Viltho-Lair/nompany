"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Notice } from "@/shared/notificationInbox";

/** A platform event as the console's stream carries it. */
export type SuperEvent = Record<string, unknown>;
type Handler = (e: SuperEvent) => void;
export type SuperLive = {
  status: string;
  connection: number;
  subscribe: (handler: Handler) => () => void;
  notifications: Notice[];
  setNotifications: Dispatch<SetStateAction<Notice[]>>;
};

// The console's live connection — one per tab, opened on the shell.
//
// Same shape and same reasoning as the studio's LiveProvider (see the long note
// there): a single EventSource, an in-memory fan-out, hidden tabs released
// after a grace period, and a manual retry for the case the browser refuses to
// retry itself. The console's feed is simpler in one respect — no per-event
// permission filtering, because an owner sees everything — so the only things
// it distributes are platform events and notifications.

const SuperLiveContext = createContext<SuperLive | null>(null);

const HIDDEN_GRACE_MS = 60_000;
const BACKOFF_MS = [3_000, 8_000, 20_000, 45_000];

export function useSuperLive() {
  return useContext(SuperLiveContext);
}

export default function SuperLiveProvider({ children }: { children?: ReactNode }) {
  const [status, setStatus] = useState("connecting");
  const [notifications, setNotifications] = useState<Notice[]>([]);
  // Counts every `ready`, recycles included — see the same counter in the
  // studio's LiveProvider: `status` goes live -> live on a reconnect, so it
  // cannot tell a reader to re-read what was missed while disconnected.
  const [connection, setConnection] = useState(0);

  const source = useRef<EventSource | null>(null);
  const cursor = useRef("");
  const listeners = useRef(new Set<Handler>());
  const attempt = useRef(0);
  const timers = useRef<{ hide: ReturnType<typeof setTimeout> | undefined; retry: ReturnType<typeof setTimeout> | undefined }>({ hide: undefined, retry: undefined });

  const subscribe = useCallback((handler: Handler) => {
    listeners.current.add(handler);
    return () => { listeners.current.delete(handler); };
  }, []);

  useEffect(() => {
    let alive = true;

    const clearRetry = () => {
      clearTimeout(timers.current.retry);
      timers.current.retry = undefined;
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

      es.addEventListener("ready", (m: MessageEvent) => {
        if (!alive) return;
        attempt.current = 0;
        try {
          cursor.current = JSON.parse(m.data).cursor || cursor.current;
        } catch {
          /* keep the cursor we had */
        }
        setStatus("live");
        setConnection((c) => c + 1);
      });

      es.addEventListener("change", (m: MessageEvent) => {
        if (!alive) return;
        let e: SuperEvent;
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

      es.addEventListener("notif", (m: MessageEvent) => {
        if (!alive) return;
        try {
          const n = JSON.parse(m.data) as Notice;
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

  const value = useMemo<SuperLive>(
    () => ({ status, connection, subscribe, notifications, setNotifications }),
    [status, connection, subscribe, notifications],
  );

  return <SuperLiveContext.Provider value={value}>{children}</SuperLiveContext.Provider>;
}
