"use client";

import { useEffect, useRef } from "react";
import { useLive } from "@/components/studio2/LiveProvider";

// LIVE UPDATES for a studio board.
//
// The board keeps the load() it already had. This hook only answers "is there
// anything new?" and calls load() when the answer concerns THIS board — so a
// page refetches when its own data really moved, and never on a timer.
//
// The signal now arrives over the studio's SSE connection (LiveProvider) rather
// than being fetched on a 30s cycle, so a change made by a colleague lands in
// well under a second instead of up to half a minute. The hook's shape is
// unchanged, deliberately: every board that called it still calls it the same
// way, and none of them had to learn anything about transports.
//
// The connection itself is NOT opened here. It is opened once per tab by
// LiveProvider and shared — see the note there about the browser's six
// connections per domain, which 21 call sites would otherwise exhaust.
//
// Still true, and still the point:
//  • A HIDDEN TAB COSTS NOTHING. The provider drops the connection after a
//    minute out of sight and replays from its cursor on return.
//  • The server sends "something changed", never the data itself, so the board
//    decides what to refetch and nothing here can go stale.

/**
 * @param {string} slug     the studio (kept for call-site compatibility; the
 *                          connection's studio comes from LiveProvider)
 * @param {string} watch    a section key ("tasks", "finance", …) or "people"
 * @param {Function} onChange  called when something this board shows has changed
 */
export default function useLiveUpdates(slug, watch, onChange) {
  const live = useLive();
  // Held in a ref so a re-render with a new closure never re-subscribes.
  //
  // ASSIGNED IN AN EFFECT, not during render. Writing a ref while rendering is
  // the documented anti-pattern: React is free to render a component twice and
  // throw one result away, so a mutation made on the way past may belong to a
  // render that never happened. The subscription below reads latest.current at
  // EVENT time, which is long after effects have run, so nothing is lost by
  // waiting — and no effect dependency array, deliberately: this must run after
  // every render, because the whole point is to hold the newest closure.
  const latest = useRef(onChange);
  useEffect(() => { latest.current = onChange; });

  const subscribe = live?.subscribe;

  // A board rendered OUTSIDE LiveProvider would simply never update — no error,
  // no failed request, just a screen that quietly stops being true. That is the
  // one failure this hook can have, and it already caught the two full-screen
  // Live views, which render outside StudioFrame. So say so, loudly, in dev.
  useEffect(() => {
    if (!live && process.env.NODE_ENV !== "production") {
      console.error(
        `[useLiveUpdates] "${watch}" is outside <LiveProvider>, so this board will never update. ` +
        `Wrap the page in LiveProvider (StudioFrame already does).`,
      );
    }
  }, [live, watch]);

  useEffect(() => {
    if (!subscribe || !watch) return undefined;
    // THE EVENT IS PASSED THROUGH. It carries { type, section, collection,
    // rowId }, and this line used to drop all of it — every board was told
    // "something changed" and could do nothing but refetch its whole module.
    //
    // Existing callers are unaffected: a handler that ignores the argument
    // behaves exactly as before, which is what lets boards adopt targeted
    // patching one at a time instead of all twenty-seven at once.
    return subscribe(watch, (event) => latest.current?.(event));
  }, [subscribe, watch]);
}
