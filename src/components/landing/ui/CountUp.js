"use client";
import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, } from "motion/react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
/* Numeric roll-up used by the KPI cards and the stats band.
   Renders a MotionValue directly as a text child → the DOM text node is
   patched imperatively, so React never re-renders while it counts. */
export function CountUp({ to, decimals = 0, prefix = "", suffix = "", duration = 1.6, delay = 0, className = "", 
/** Start when scrolled into view instead of on mount. */
onView = false, }) {
    const reduceMotion = useReducedMotion();
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });
    const value = useMotionValue(0);
    const text = useTransform(value, (v) => v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }));
    const shouldRun = onView ? inView : true;
    useEffect(() => {
        if (!shouldRun)
            return;
        if (reduceMotion) {
            value.set(to);
            return;
        }
        const controls = animate(value, to, {
            duration,
            delay,
            ease: EASE_OUT_EXPO,
        });
        return () => controls.stop();
    }, [shouldRun, to, duration, delay, value, reduceMotion]);
    return (<span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      <motion.span>{text}</motion.span>
      {suffix}
    </span>);
}
