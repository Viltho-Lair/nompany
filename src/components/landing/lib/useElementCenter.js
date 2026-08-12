"use client";
import { useEffect, useState } from "react";
import { motionValue } from "motion/react";
/**
 * Tracks an element's centre in viewport coordinates as MotionValues.
 *
 * Reads are batched into a single rAF callback and only run while
 * `enabled` is true (the caller gates this on `useInView`), so an
 * off-screen mascot costs nothing while the user scrolls.
 */
export function useElementCenter(ref, enabled = true) {
    const [center] = useState(() => ({ cx: motionValue(0), cy: motionValue(0) }));
    useEffect(() => {
        if (!enabled)
            return;
        let frame = 0;
        const measure = () => {
            frame = 0;
            const rect = ref.current?.getBoundingClientRect();
            if (!rect)
                return;
            center.cx.set(rect.left + rect.width / 2);
            center.cy.set(rect.top + rect.height / 2);
        };
        // All reads happen in one place → no interleaved read/write thrashing.
        const request = () => {
            if (!frame)
                frame = requestAnimationFrame(measure);
        };
        measure();
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request);
        return () => {
            window.removeEventListener("scroll", request);
            window.removeEventListener("resize", request);
            if (frame)
                cancelAnimationFrame(frame);
        };
    }, [ref, enabled, center]);
    return center;
}
