"use client";

import { useCallback, useEffect, useRef } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { decide } from "@/lib/livePatch";

// PATCH ONE ROW INSTEAD OF REFETCHING THE BOARD.
//
// A board used to answer every live event by re-running its module's whole GET.
// One person renaming a ticket in a thirty-seat studio meant thirty full Sales
// payloads — every ticket, every client, every service, the vocabulary — for one
// changed field. That is finding H-6.
//
// The event now names the row, and /rows returns exactly what the list endpoint
// would have returned for it, so the board can replace one entry in the array it
// already has.
//
// ONLY `row.updated`, AND THAT IS THE WHOLE DISCIPLINE.
//
// An update cannot change a list's ORDER: these boards sort by createdAt, which
// an edit never touches, so replacing an element in place gives exactly the
// array a refetch would have. A CREATE or a DELETE changes the length and the
// order, and can change totals, counts and derived summaries elsewhere on the
// screen — so those still reload, and so does anything this hook does not
// recognise.
//
// FALLING BACK IS NOT A FAILURE MODE, IT IS THE DESIGN. Every path that is not
// certainly safe ends in load(): an unmapped collection, a fetch that failed, a
// row the server says is gone, an event with no id. The worst outcome is the
// behaviour we already had; the one outcome that must never happen is a board
// silently disagreeing with the server.

/**
 * @param {string} slug
 * @param {string} watch      section key to subscribe to
 * @param {object} opts
 * @param {Function} opts.load     full refetch, the fallback for everything
 * @param {Function} opts.setData  state setter holding the module payload
 * @param {object} opts.into       { [collection]: fieldName } — where each
 *                                 collection's rows live in that payload
 */
// Re-exported so a reader of the hook can find the rule it obeys.
export { decide };

export default function useLiveRows(slug, watch, { load, setData, into }) {
  // Held in a ref so a re-render with new closures never re-subscribes — the
  // same reason useLiveUpdates keeps its own.
  //
  // ASSIGNED IN AN EFFECT, NOT DURING RENDER. The first version of this wrote
  // the ref on the way past, which is the documented anti-pattern the hook next
  // door already explains: React may render a component twice and discard one
  // result, so a mutation made during render can belong to a render that never
  // happened. The linter caught it — in the file beside the comment warning
  // about it.
  //
  // Nothing is lost by waiting: the handler reads latest.current at EVENT time,
  // long after effects have run. No dependency array, deliberately, because this
  // must run after every render to hold the newest closure.
  const latest = useRef({ load, setData, into });
  useEffect(() => { latest.current = { load, setData, into }; });

  const onEvent = useCallback(async (event) => {
    const { load: reload, setData: setState, into: map } = latest.current;

    const call = decide(event, map);
    if (call.action !== "patch") return reload();
    const { field } = call;

    let row;
    try {
      const res = await fetch(
        `/api/studios/${slug}/rows?collection=${encodeURIComponent(event.collection)}&id=${encodeURIComponent(event.rowId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return reload();
      ({ row } = await res.json());
    } catch {
      return reload();
    }
    if (!row?.id) return reload();

    let placed = true;
    setState((prev) => {
      const list = prev?.[field];
      if (!Array.isArray(list)) { placed = false; return prev; }

      const at = list.findIndex((r) => r.id === row.id);
      // A row we are not holding is not an update from this board's point of
      // view — it may have become visible, or been filtered out before. Reload
      // rather than inventing a position for it.
      if (at === -1) { placed = false; return prev; }

      const next = [...list];
      next[at] = row;
      return { ...prev, [field]: next };
    });

    // setState's updater runs synchronously here, so `placed` is settled by now.
    if (!placed) reload();
  }, [slug]);

  useLiveUpdates(slug, watch, onEvent);
}
