"use client";

import { useEffect, useRef } from "react";
import { EASE_OUT_EXPO, reduced, sample } from "./tokens";

/**
 * A number that rolls up to its value.
 *
 * MOVED OFF `motion/react` when it was promoted out of `components/landing/ui`.
 * The landing already pays for that library and would not have minded, but the
 * studio's KPI cards want the same effect and the studio's chunk does not carry
 * it — importing the old one into a dashboard would have added ~30 KB gzipped to
 * every studio route to animate four numbers. What it did (a MotionValue driving
 * a text node) is a `requestAnimationFrame` loop and a bezier sampler, so that is
 * what this is.
 *
 * THE TEXT NODE IS PATCHED DIRECTLY, not held in state. Sixty renders a second
 * for a number that is decoration would re-render whatever card contains it; the
 * value React rendered is the FINAL one, so a re-render from any other cause
 * repaints the settled figure rather than an interrupted count.
 *
 * That also means the server renders the destination, not zero: a crawler, a
 * reader with JavaScript off, and anyone whose OS asks for reduced motion all
 * see the real figure.
 *
 * `duration` and `delay` are SECONDS, matching the library call this replaced —
 * the hero's assembly is choreographed in seconds and `Reveal`'s milliseconds
 * are the odd one out. Changing either would silently retime the landing.
 */
export function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.6,
  delay = 0,
  className = "",
  /** Start when scrolled into view instead of on mount. */
  onView = false,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Seconds. */
  duration?: number;
  /** Seconds. */
  delay?: number;
  className?: string;
  onView?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const out = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = out.current;
    if (!el) return;

    const fmt = (v: number) =>
      v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

    // Nothing to do: the settled value is already in the DOM from the server.
    if (reduced()) return;

    let raf = 0;
    let start = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      if (!start) start = now;
      const t = Math.min(1, (now - start) / (duration * 1000));
      el.textContent = fmt(sample(EASE_OUT_EXPO, t) * to);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    const run = () => {
      el.textContent = fmt(0);
      raf = requestAnimationFrame(tick);
    };

    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(run, delay * 1000);
    };

    if (!onView || typeof IntersectionObserver === "undefined") {
      arm();
    } else {
      const host = ref.current;
      if (!host) return;
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            io.disconnect();
            arm();
          }
        },
        // 0.6 — the figure should be properly on screen before it starts, or
        // the count finishes above the fold and the reader arrives to a static
        // number having missed the point of it.
        { threshold: 0.6 },
      );
      io.observe(host);
      return () => {
        cancelled = true;
        io.disconnect();
        window.clearTimeout(timer);
        cancelAnimationFrame(raf);
      };
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to, decimals, duration, delay, onView]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      <span ref={out}>
        {to.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
      </span>
      {suffix}
    </span>
  );
}
