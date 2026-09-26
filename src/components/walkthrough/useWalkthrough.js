"use client";

import { useCallback, useEffect, useState } from "react";

// THE WALKTHROUGH'S STATE, shared by the account hub and the studio shell so
// the two cannot disagree about when a tour opens or what closing it means.
// The tour itself (Walkthrough.jsx) is loaded lazily; this is the few lines
// that decide whether to load it at all.
//
//   • `auto` — ask the server on mount, and open if this sign-in has not seen
//     the tour and the person has not turned it off;
//   • opening marks it SEEN for this sign-in, straight away, so a tab closed
//     halfway does not replay it on every page of the same sign-in;
//   • closing with the box ticked turns it OFF, on the profile, until the
//     person turns it back on — from /account or from a studio's menu.
const post = (tour, action) =>
  fetch("/api/identity/walkthrough", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tour, action }),
  }).catch(() => null);

export function useWalkthrough(tour, { auto = true } = {}) {
  const [open, setOpen] = useState(false);

  const start = useCallback(() => {
    setOpen(true);
    post(tour, "seen");
  }, [tour]);

  useEffect(() => {
    if (!auto) return undefined;
    let live = true;
    fetch("/api/identity/walkthrough", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d?.[tour]?.show) start(); })
      .catch(() => {}); // no tour is the safe answer to a failed read
    return () => { live = false; };
  }, [auto, tour, start]);

  const close = useCallback((dontShow) => {
    setOpen(false);
    if (dontShow) post(tour, "off");
  }, [tour]);

  // Turned back on and shown now — the studio menu's "Show the walkthrough".
  const restart = useCallback(async () => {
    await post(tour, "on");
    start();
  }, [tour, start]);

  return { open, start, close, restart };
}

export { post as postWalkthrough };
