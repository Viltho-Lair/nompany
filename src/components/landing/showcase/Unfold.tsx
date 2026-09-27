"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

/* ==================================================================
   THE SCREEN UNFOLDS AS YOU SCROLL TO IT.

   It rests tilted back, like a laptop lid half open under the letter,
   and comes flat and full-size by the time its top reaches the upper
   third of the window — tied to the scroll position, not to a timer, so
   it moves exactly as fast as the reader does and reverses when they do.

   The tilt is written into the server's HTML as a transform, never as a
   hidden state: the screen is visible, merely angled, before any script
   runs. A spring sits between the scroll and the transform so a flick of
   the wheel is smoothed rather than stepped. Off under reduced motion.
================================================================== */

export function Unfold({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.28"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.35 });
  const rotateX = useTransform(progress, [0, 1], [26, 0]);
  const scale = useTransform(progress, [0, 1], [0.88, 1]);
  const y = useTransform(progress, [0, 1], [40, 0]);

  return (
    <div ref={ref} style={{ perspective: 1800 }}>
      <motion.div
        style={reduce ? undefined : { rotateX, scale, y, transformOrigin: "50% 0%", willChange: "transform" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
