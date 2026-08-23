"use client";

import { useEffect } from "react";

// FOCUS MANAGEMENT FOR THE HAND-ROLLED OVERLAYS. The studio's `fixed inset-0`
// dialogs (the shared Dialog in ui.js, the Nova panel, the StudioSettings
// dialogs) are not Radix — they trap nobody and never restore focus, so a
// keyboard or screen-reader user Tabs straight out of an open dialog into the
// page behind it and, on close, is dropped at the top of the document. Radix's
// own dialogs (components/ui/dialog.tsx) already do this; these hand-rolled ones
// need it done by hand, and once here rather than copied into each.
//
// While `active`, Tab is confined to the focusables inside `ref`; on
// deactivation or unmount, focus returns to whatever element held it when the
// overlay opened. On activation the first focusable is focused — UNLESS the
// overlay already placed focus itself (e.g. an autoFocus input), which is left
// where it is so a search field keeps the caret it asked for.
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const visible = (el) => el.getClientRects().length > 0; // catches display:none and detached

export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    // Where focus goes back to on close, captured BEFORE we move it inward. For
    // a conditionally-mounted dialog this is the trigger button, which is still
    // in the DOM; a launcher that unmounts itself (Nova) restores focus its own
    // way and this is left as a harmless no-op on the detached node.
    const opener = document.activeElement;

    const focusables = () => Array.from(node.querySelectorAll(FOCUSABLE)).filter(visible);

    // Don't fight an autoFocus the overlay set for itself; only pull focus in
    // when it is still outside the dialog.
    if (!node.contains(document.activeElement)) {
      const list = focusables();
      (list[0] || node).focus();
    }

    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) { e.preventDefault(); return; }
      const first = list[0];
      const last = list[list.length - 1];
      const current = document.activeElement;
      // Focus escaped the dialog somehow (a click outside, browser chrome) —
      // pull it back to an edge rather than let Tab wander the page.
      if (!node.contains(current)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && current === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && current === last) { e.preventDefault(); first.focus(); }
    };

    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("keydown", onKey);
      // Return focus only if it is still inside the dialog (or nowhere) — if the
      // user has already clicked into the page, don't yank them back.
      const landed = document.activeElement;
      if (opener && typeof opener.focus === "function" && (node.contains(landed) || landed === document.body || landed === null)) {
        opener.focus();
      }
    };
  }, [ref, active]);
}
