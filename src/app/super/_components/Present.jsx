"use client";

import { useEffect, useState } from "react";

/* THE CLOCK AND THE PRESENT BUTTON, IN THE HEADER — the owner's instruction.
   ------------------------------------------------------------------
   Both sat in the Pulse wall's own top row while the wall was the only
   full-bleed screen. The console header is above every screen now, so the
   wall carried a second row of chrome under the first; these moved up into it.

   `present` IS EXPORTED because the wall still answers `F`. One function, two
   ways in — a copy in the wall would be free to drift (the wake lock is the
   half a copy would forget). */

export async function present() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch { /* refused without a gesture, or unsupported — the page is unharmed */ }
  // A wall's whole job is to stay lit. Best-effort: the lock is refused when
  // the tab is not visible, and dropped whenever it is hidden, which is fine —
  // nobody is watching a hidden wall.
  try { await navigator.wakeLock?.request("screen"); } catch { /* best-effort */ }
}

// Rendered on the CLIENT only, after mount. A server-rendered clock is wrong by
// the time it arrives and mismatches on hydration, so the first paint is empty
// and the first tick lands on the next frame.
export function ConsoleClock() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    const first = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => { cancelAnimationFrame(first); clearInterval(id); };
  }, []);
  return (
    <span className="num min-w-[4.5rem] text-center text-sm" style={{ color: "var(--ad-muted-foreground)" }}>
      {clock}
    </span>
  );
}

export function PresentButton() {
  return (
    <button
      type="button"
      onClick={present}
      title="Present — full screen (F on Pulse)"
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-[var(--ad-accent)]"
      style={{ borderColor: "var(--ad-border)" }}
    >
      <span aria-hidden="true">⛶</span>
      Present
    </button>
  );
}
