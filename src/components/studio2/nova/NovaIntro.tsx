"use client";

import { useEffect, useRef, useState } from "react";
import { drawNovaIntro, NOVA_INTRO } from "@/components/studio2/nova/introFrames";

// THE FIRST TIME SOMEBODY OPENS NOVA, the Sitta logo becomes Nova's head at the
// top of the empty panel: about seven seconds, then the card folds away and
// `onDone` records that this browser has seen it. It sits ABOVE the help and the
// example questions rather than in front of them, so somebody who opened Nova to
// ask something can ask straight away. Typing a question replaces the empty state,
// and the card with it.
//
// Loaded through `nextDynamic` from NovaLauncher. Nobody pays for the canvas code
// until they open Nova, and after the first time nobody loads it at all.
//
// The fonts are the site's own (next/font variables), read from the canvas's
// computed style. A canvas has no CSS cascade, so `font-display` cannot help it:
// `document.fonts.load` asks for each face, and a frame drawn before it arrives
// uses the fallback and is replaced on the next one.
export default function NovaIntro({ label, skipLabel, onDone }: { label: string; skipLabel: string; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);

  useEffect(() => {
    const c = ref.current, g = c?.getContext("2d");
    if (!c || !g) return undefined;
    const css = getComputedStyle(c), v = (name: string) => css.getPropertyValue(name).trim();
    const stack = (name: string, rest: string) => (v(name) ? `${v(name)}, ${rest}` : rest);
    const opts = {
      backdrop: "night" as const,
      font: stack("--f-saira", '"Segoe UI", system-ui, sans-serif'),
      monoFont: stack("--f-geist-mono", "ui-monospace, monospace"),
      arabicFont: stack("--f-tajawal", '"Segoe UI", system-ui, sans-serif'),
    };
    if (document.fonts) for (const f of [`600 40px ${opts.font}`, `500 12px ${opts.monoFont}`, `700 12px ${opts.arabicFont}`]) document.fonts.load(f).catch(() => {});
    let raf = 0, closing = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const tau = Math.min(NOVA_INTRO.end, (now - start) / 1000);
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawNovaIntro(g, w, h, tau, opts, dpr);
      if (tau < NOVA_INTRO.end) raf = requestAnimationFrame(frame);
      else { setLeaving(true); closing = window.setTimeout(() => done.current(), 500); }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(closing); };
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#07070f] transition-[height,opacity,margin] duration-500 ease-out ${leaving ? "h-0 opacity-0" : "h-52 opacity-100"}`}
    >
      <canvas ref={ref} role="img" aria-label={label} className="block h-52 w-full" />
      <button
        type="button"
        onClick={() => done.current()}
        className="absolute end-2 top-2 rounded-md bg-white/10 px-2 py-1 text-[11px] font-500 text-white/80 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        {skipLabel}
      </button>
    </div>
  );
}
