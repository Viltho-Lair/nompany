"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
/* ==================================================================
   TECHNIQUE 9 — Page / section transitions
   Two coordinated pieces:

   1. AnimatePresence in `mode="wait"` — the outgoing view shrinks
      slightly and slides out *before* the incoming one arrives, so the
      two never overlap or fight for scroll height.
   2. A gradient panel that sweeps across the viewport during the swap,
      masking the hand-off and tying the two views together.

   `direction` (derived from tab order) decides which way things slide,
   so navigation has a consistent spatial model — forward is left,
   back is right.
================================================================== */
export function ViewTransition({ viewKey, direction, children, }) {
    const reduceMotion = useReducedMotion();
    // THE ENTER STATE DOES NOT FADE, and this one mattered more than any other
    // on the site: `motion.main` wraps the ENTIRE page, and `initial` is written
    // into the server-rendered style attribute — so the whole home page, h1
    // included, shipped inside `style="opacity:0"`. A tag-stripping extractor
    // still read the words, which is why it survived every check that counted
    // headings or grepped for text; anything that RENDERS without running
    // JavaScript saw an empty page.
    //
    // The slide, the scale and the blur all stay, so a view change still reads
    // as a view change. What is dropped is the only part that could make the
    // page not be there.
    const variants = {
        enter: {
            x: reduceMotion ? 0 : 64 * direction,
            scale: reduceMotion ? 1 : 0.98,
            filter: reduceMotion ? "blur(0px)" : "blur(6px)",
        },
        center: {
            opacity: 1,
            x: 0,
            scale: 1,
            filter: "blur(0px)",
            transition: { duration: reduceMotion ? 0.2 : 0.6, ease: EASE_OUT_EXPO },
        },
        exit: {
            opacity: 0, // an EXIT is safe: the element is leaving, and the server never renders this state
            // Shrink first, then leave — reads as "stepping back" out of the view.
            x: reduceMotion ? 0 : -64 * direction,
            scale: reduceMotion ? 1 : 0.965,
            filter: reduceMotion ? "blur(0px)" : "blur(6px)",
            transition: { duration: reduceMotion ? 0.15 : 0.4, ease: "easeIn" },
        },
    };
    return (<>
      <AnimatePresence mode="wait" 
    // Jump to the top only once the old view is fully gone, so the
    // user never sees the page scroll under a visible view.
    onExitComplete={() => window.scrollTo({ top: 0, behavior: "instant" })}>
        <motion.main key={viewKey} variants={variants} initial="enter" animate="center" exit="exit" className="will-change-transform">
          {children}
        </motion.main>
      </AnimatePresence>

      <SweepOverlay trigger={viewKey} direction={direction}/>
    </>);
}
/** Full-bleed gradient wipe that runs once per navigation. */
function SweepOverlay({ trigger, direction, }) {
    const reduceMotion = useReducedMotion();
    const isFirst = useRef(true);
    const [runId, setRunId] = useState(null);
    useEffect(() => {
        // Don't sweep on the initial mount — only on real navigations.
        if (isFirst.current) {
            isFirst.current = false;
            return;
        }
        setRunId(`${trigger}-${Date.now()}`);
    }, [trigger]);
    if (reduceMotion || !runId)
        return null;
    return (<div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <motion.div key={runId} className="absolute inset-y-0 -inset-x-1/4 gpu" initial={{ x: direction > 0 ? "-120%" : "120%", opacity: 0.9 }} animate={{ x: direction > 0 ? "120%" : "-120%", opacity: 0 }} transition={{ duration: 0.95, ease: EASE_OUT_EXPO }} style={{
            background: "linear-gradient(100deg, transparent 0%, color-mix(in oklab, var(--color-iris) 45%, transparent) 35%, color-mix(in oklab, var(--color-violet) 55%, transparent) 55%, transparent 100%)",
            filter: "blur(28px)",
        }}/>
    </div>);
}
