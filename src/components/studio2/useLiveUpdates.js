"use client";

import { useEffect, useRef } from "react";

// LIVE UPDATES for a studio board.
//
// The board keeps the load() it already had. This hook only answers "is there
// anything new?" and calls load() when the answer concerns THIS board — so a
// page refetches when its own data really moved, and never on a timer.
//
// Why polling a cursor rather than a socket: the question is tiny and the answer
// is usually "nothing", so it costs a fraction of refetching the board, needs no
// third-party service, and cannot run up a bill. When the studio outgrows it,
// only this file changes — a socket would push the same "something changed"
// signal into the same load().
//
// Two things keep it cheap:
//  • A HIDDEN TAB POLLS NOTHING. Most open tabs are background tabs; they cost
//    nothing until someone looks at them, and catch up the moment they do.
//  • The cursor means the server answers "nothing" with an empty list rather
//    than re-sending state.
const POLL_MS = 30_000;

/**
 * @param {string} slug     the studio
 * @param {string} watch    a section key ("tasks", "finance", …) or "people"
 * @param {Function} onChange  called when something this board shows has changed
 */
export default function useLiveUpdates(slug, watch, onChange) {
  // Held in refs so a re-render with a new closure never restarts the poll loop.
  const cursor = useRef(null);
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    if (!slug || !watch) return undefined;

    let alive = true;
    let timer = null;

    // People/permission changes are studio-wide and carry no section; section
    // events carry the key of the section they happened in.
    const concerns = (e) => (watch === "people" ? e.scope === "people" : e.section === watch);

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(poll, POLL_MS);
    };

    async function poll() {
      if (!alive) return;
      // Nobody is looking — don't spend a request. The visibility listener
      // brings us straight back when they return.
      if (typeof document !== "undefined" && document.hidden) return schedule();

      try {
        const qs = cursor.current ? `?since=${encodeURIComponent(cursor.current)}` : "";
        const res = await fetch(`/api/studios/${slug}/events${qs}`, { cache: "no-store" });
        if (!alive) return;
        if (res.ok) {
          const out = await res.json();
          if (!alive) return;
          cursor.current = out.cursor || cursor.current;
          if (Array.isArray(out.events) && out.events.some(concerns)) latest.current?.();
          // The server had more than it would send at once — come straight back
          // rather than leaving the board a poll interval behind.
          if (out.truncated) return void poll();
        }
      } catch {
        // Offline, navigating away, or a blip. The next tick tries again; there
        // is nothing to tell the user about a background check that missed.
      }
      schedule();
    }

    // The first call carries no cursor: it just adopts the studio's current
    // position, so opening a board never replays history.
    poll();

    const onVisibility = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slug, watch]);
}
