"use client";

import { useEffect, useRef } from "react";

// Shared "keep it live" hook: runs `fn` every `ms` milliseconds, pausing while
// the browser tab is hidden and resuming when it's visible again. It does NOT
// fire immediately — callers keep their own initial load (with a loading
// state) and pass a *silent* reloader here so background refreshes don't flash
// the UI. Used across the Studio so lists, dashboards, badges and analytics
// stay up to date without a manual refresh.
export const SYNC_EVENT = "megatech:sync";

// Fire a global sync — every useLivePoll listener re-runs its reloader at once.
// Used by the header Auto-Sync button (and its 20s auto-tick).
export function triggerSync() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SYNC_EVENT));
}

export function useLivePoll(fn, ms = 5000) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    let timer = null;
    const start = () => { if (!timer) timer = setInterval(() => saved.current(), ms); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVis = () => (document.hidden ? stop() : start());
    const onSync = () => saved.current();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(SYNC_EVENT, onSync);
    start();
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener(SYNC_EVENT, onSync); stop(); };
  }, [ms]);
}
