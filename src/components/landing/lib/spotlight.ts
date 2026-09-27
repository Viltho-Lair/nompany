import type { PointerEvent } from "react";

/* Feeds `.lh-spot` (globals.css) the cursor's position inside the element.
   It writes two custom properties straight onto the element rather than
   through state, so following the mouse costs no React render at all — and
   React leaves them alone, because they are not in any `style` prop it owns. */
export function spotlight(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}
