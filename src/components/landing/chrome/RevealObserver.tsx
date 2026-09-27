"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* ==================================================================
   ONE OBSERVER FOR EVERY `data-reveal` ON THE PUBLIC SITE.

   It marks an element `data-in` the first time it enters the viewport,
   and globals.css animates it from its hidden state to its settled one.
   One IntersectionObserver for the page rather than one per section —
   the same reasoning as one EventSource per tab (invariant 14): a hook
   per component multiplies identical work by the number of components.

   IT ALSO SAYS IT ARRIVED (`__lhReveal`). The boot script in
   `(marketing)/layout.js` hides reveal-able elements before first paint
   and gives them back after 2.5s unless this has run — so a bundle that
   fails to load leaves a still page, never an empty one.

   A MUTATION OBSERVER WATCHES FOR NEW ONES, because the showcase sections
   arrive in their own chunks and a client navigation swaps the page under
   a chrome that stays mounted.
================================================================== */

declare global {
  interface Window { __lhReveal?: boolean }
}

export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    window.__lhReveal = true;
    const root = document.documentElement;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined";
    // Arriving by a client navigation from outside the marketing group, the
    // boot script never ran (React does not execute a script it inserts), so
    // the attribute is set here instead — a frame later than first paint,
    // which is the only cost.
    if (!still) root.setAttribute("data-lh-motion", "");
    if (still) {
      // Motion is off (reduced motion, or the boot script gave up): make sure
      // nothing is left waiting for an observer that is not coming.
      document.querySelectorAll("[data-reveal]").forEach((el) => el.setAttribute("data-in", ""));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const watch = (scope: ParentNode) =>
      scope.querySelectorAll("[data-reveal]:not([data-in])").forEach((el) => io.observe(el));

    // The first frame paints every element hidden; observing on the NEXT one
    // lets what is already on screen animate in rather than appear settled.
    const raf = requestAnimationFrame(() => watch(document));
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches("[data-reveal]:not([data-in])")) io.observe(n);
          watch(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { cancelAnimationFrame(raf); io.disconnect(); mo.disconnect(); };
  }, [pathname]);

  return null;
}
