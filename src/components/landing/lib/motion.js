/* ------------------------------------------------------------------
   A single source of truth for motion. Every component pulls its
   easing/spring from here so the whole page feels like one system
   instead of a pile of individually-tuned animations.
------------------------------------------------------------------ */
/* THE TWO CURVES NOW LIVE IN `components/motion/tokens.ts`, because the studio
   eases things too and must not import this file — everything else here is a
   `motion/react` variant object, and that library is the one thing the studio's
   chunk is kept clear of. Re-exported rather than restated: two copies of a
   cubic-bezier drift the moment one is tuned. */
// IMPORTED AND RE-EXPORTED, not re-exported alone: `export ... from` creates
// no local binding, and `fadeUp` below eases with EASE_OUT_EXPO. Written the
// short way first, this file built cleanly and threw "EASE_OUT_EXPO is not
// defined" in the browser — a .js file has no type checker to notice.
import { EASE_OUT_EXPO, EASE_SOFT } from "@/components/motion/tokens";
export { EASE_OUT_EXPO, EASE_SOFT };
/** Springs. Low-stiffness/high-damping = premium, not bouncy-toy. */
export const SPRING_SOFT = {
    type: "spring",
    stiffness: 120,
    damping: 20,
    mass: 0.9,
};
export const SPRING_SNAPPY = {
    type: "spring",
    stiffness: 340,
    damping: 30,
    mass: 0.6,
};
/** Used for cursor-tracking values (magnetic button, mascot eyes, tilt). */
export const SPRING_CURSOR = {
    type: "spring",
    stiffness: 150,
    damping: 18,
    mass: 0.4,
};
/** Generic fade-up entrance, driven by a parent's `staggerChildren`. */
export const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: EASE_OUT_EXPO },
    },
};
/** Parent orchestrator: children animate in sequence, not all at once. */
export const stagger = (staggerChildren = 0.08, delayChildren = 0) => ({
    hidden: {},
    show: {
        transition: { staggerChildren, delayChildren },
    },
});
/** Shared viewport config: fire once, slightly before the element is centred. */
export const VIEWPORT = { once: true, amount: 0.35, margin: "0px 0px -10% 0px" };
