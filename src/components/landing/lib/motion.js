/* ------------------------------------------------------------------
   A single source of truth for motion. Every component pulls its
   easing/spring from here so the whole page feels like one system
   instead of a pile of individually-tuned animations.
------------------------------------------------------------------ */
/** Expressive deceleration — the house curve for entrances. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];
/** Symmetric curve for loops and state swaps. */
export const EASE_SOFT = [0.65, 0, 0.35, 1];
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
