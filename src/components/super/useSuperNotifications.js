"use client";

import { useCallback, useEffect, useState } from "react";
import { useSuperLive } from "@/components/super/SuperLiveProvider";

// The console's notifications, from both places they come from.
//
// The REST call answers "what was already waiting when I opened this"; the
// stream adds what arrives afterwards. Both are needed — a fresh load has
// streamed nothing, and a count built only from the stream would reset itself
// on every navigation.
//
// Shared by the header bell and the Notifications page so the two can never
// disagree about the count.

export default function useSuperNotifications() {
  const live = useSuperLive();
  const [stored, setStored] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const streamed = live?.notifications;
  const status = live?.status;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/super/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const out = await res.json();
      setStored(Array.isArray(out.notifications) ? out.notifications : []);
      setLoaded(true);
    } catch {
      // Keep what we had; the next reconnect tries again.
    }
  }, []);

  // Re-read whenever the stream (re)connects: a reconnect is precisely when
  // something may have been missed.
  useEffect(() => {
    if (status === "live") load();
  }, [status, load]);

  // Merge, newest first, without letting a notification carried by both sources
  // appear twice.
  const seen = new Set();
  const notifications = [];
  for (const n of [...(streamed || []), ...stored]) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    notifications.push(n);
  }
  notifications.sort((a, b) => String(b.at).localeCompare(String(a.at)));

  const unread = notifications.filter((n) => !n.readAt).length;

  const markAllRead = useCallback(async () => {
    const at = new Date().toISOString();
    // Optimistic — the count going to zero is the point of the button, and it
    // should not wait for a round trip.
    setStored((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: at })));
    live?.setNotifications?.((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: at })));
    try {
      await fetch("/api/super/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // The optimistic state stands; load() reconciles it.
    }
    load();
  }, [live, load]);

  return { notifications, unread, loaded, status, markAllRead, reload: load };
}
