"use client";

import { useEffect, useRef, useState } from "react";

/* THE CONSOLE'S DROPDOWN, extracted so there is one of them.
   ------------------------------------------------------------------
   It lived inside `Header.js` and was not exported, so the Pulse chrome's own
   menu would have been a second copy of the same click-outside, the same Escape
   handler and the same popover tokens — free to drift the moment either was
   touched. Two dropdowns that close differently is the kind of difference nobody
   notices until one of them stops closing.

   IT CLOSES THREE WAYS and each is a real case: the trigger toggles it, a
   pointer down anywhere outside dismisses it, and Escape does — which is the one
   a keyboard user needs and the one a hand-rolled dropdown usually forgets. The
   panel itself closes on click because every item in it navigates or acts; a
   menu that stayed open behind a route change would reopen on the next screen.

   THE TRIGGER IS `contents`, not a box. The caller passes whatever it wants
   clickable — a brand block, a chip, an avatar — and the button contributes no
   layout of its own, so the menu can wrap something already positioned without
   moving it. */
export function Menu({ trigger, children, align = "end", width = 288, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="contents"
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          className={`absolute top-[calc(100%+8px)] z-50 overflow-hidden rounded-lg border shadow-lg ${
            align === "end" ? "end-0" : "start-0"
          }`}
          style={{
            width,
            backgroundColor: "var(--ad-popover)",
            borderColor: "var(--ad-border)",
            color: "var(--ad-popover-foreground)",
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** One row inside a `Menu`. Exported for the same reason the menu is. */
export const menuItem =
  "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--ad-accent)] text-start";

export default Menu;
