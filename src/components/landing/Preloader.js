"use client";
import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, } from "motion/react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
import { LogoMark } from "./Logo";
/* ==================================================================
   TECHNIQUE 1 — Initial state / loading animation
   A determinate progress bar + live percentage counter, then the whole
   panel wipes away to reveal the (skeleton) UI underneath.

   The counter is driven by a MotionValue rather than React state, so
   ticking from 0→100 costs zero re-renders.
================================================================== */
const STATUS_STEPS = [
    "Establishing secure session",
    "Synchronising ledgers",
    "Loading finance · HR · inventory",
    "Compiling real-time insights",
    "Ready",
];
export function Preloader({ onComplete }) {
    const reduceMotion = useReducedMotion();
    const progress = useMotionValue(0);
    const [statusIndex, setStatusIndex] = useState(0);
    // Displayed values derived from the single source MotionValue.
    const percent = useTransform(progress, (v) => Math.round(v));
    const barScale = useTransform(progress, [0, 100], [0, 1]);
    // Swap the status label at thresholds — the only state this component
    // updates while loading (4 renders total, not 60/second).
    useMotionValueEvent(progress, "change", (v) => {
        const next = Math.min(STATUS_STEPS.length - 1, Math.floor((v / 100) * STATUS_STEPS.length));
        setStatusIndex((prev) => (prev === next ? prev : next));
    });
    useEffect(() => {
        // Uneven `times` makes the fill feel like real work (bursts + pauses)
        // rather than a linear fake.
        const controls = animate(progress, [0, 24, 41, 68, 86, 100], {
            duration: reduceMotion ? 0.4 : 2.1,
            times: [0, 0.15, 0.32, 0.58, 0.78, 1],
            ease: EASE_OUT_EXPO,
            onComplete: () => {
                // Small beat at 100% before the wipe — reads as "done", not "cut".
                window.setTimeout(onComplete, reduceMotion ? 60 : 320);
            },
        });
        return () => controls.stop();
    }, [progress, onComplete, reduceMotion]);
    return (<motion.div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink" 
    // Exit: the panel lifts away as one plane (transform-only = cheap).
    exit={{ y: "-100%" }} transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}>
      {/* Ambient wash so the preloader shares the page's atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{
            background: "radial-gradient(60% 50% at 50% 45%, color-mix(in oklab, var(--color-iris) 22%, transparent), transparent 70%)",
        }}/>

      <motion.div className="relative flex w-[min(88vw,26rem)] flex-col items-center gap-8" exit={{ opacity: 0, y: -18, transition: { duration: 0.35 } }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: EASE_OUT_EXPO }} className="flex items-center gap-3">
          <LogoMark size={44} animated/>
          <span className="font-display text-2xl font-semibold tracking-tight">
            Nompany
          </span>
        </motion.div>

        {/* Percentage counter */}
        <div className="flex items-baseline gap-1 font-display tabular-nums">
          <motion.span className="text-6xl font-semibold tracking-tight text-gradient">
            {percent}
          </motion.span>
          <span className="text-2xl text-fg-dim">%</span>
        </div>

        {/* Progress bar — animates scaleX on the compositor, never width */}
        <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-line-soft">
          <motion.div className="h-full w-full origin-left rounded-full gpu" style={{
            scaleX: barScale,
            background: "linear-gradient(90deg, var(--color-iris), var(--color-violet) 55%, var(--color-cyan))",
        }}/>
        </div>

        {/* Status line */}
        <div className="h-5 overflow-hidden text-xs tracking-[0.18em] text-fg-dim uppercase">
          <motion.span key={statusIndex} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }} className="block">
            {STATUS_STEPS[statusIndex]}
          </motion.span>
        </div>
      </motion.div>
    </motion.div>);
}
