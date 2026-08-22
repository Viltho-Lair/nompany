"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { reduced } from "./tokens";

/**
 * Fade-and-rise as the element scrolls into view.
 *
 * PROMOTED OUT OF `components/Reveal.js`, unchanged in behaviour, because Wave 4
 * gives every department a dashboard and every dashboard wants its cards to
 * arrive rather than appear. Library-free on purpose: the landing has
 * `motion/react` for its choreography, the studio has this, and the studio's
 * chunk stays free of the library.
 *
 * `translate-y` rather than `translate-x`: a rise reads the same in Arabic and
 * in English, where a slide does not. There is deliberately no direction prop.
 *
 * REDUCED MOTION SHOWS IMMEDIATELY rather than never — the content is the point;
 * the animation was only ever the manner of its arrival.
 */
export default function Reveal({
  children,
  className = "",
  /** Milliseconds. Stagger a row of cards by passing `i * 80`. */
  delay = 0,
  /** How much must be on screen before it fires, 0..1. */
  amount = 0.15,
}: {
  children?: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          // Once shown, stop watching: scrolling past a revealed card should
          // cost nothing for the rest of the session.
          io.unobserve(entry.target);
        }
      },
      { threshold: amount },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [amount]);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
