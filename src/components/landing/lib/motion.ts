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
/** Generic rise entrance, driven by a parent's `staggerChildren`.
 *
 * IT NO LONGER FADES, AND THE NAME IS KEPT ON PURPOSE — every call site still
 * reads `fadeUp`, and renaming it across the marketing site would have turned a
 * correctness fix into a diff nobody could review.
 *
 * WHY IT CHANGED. `hidden` was `{ opacity: 0, y: 24 }`, and `motion/react`
 * writes a component's initial variant into the SERVER-RENDERED style
 * attribute. Combined with `whileInView`, that meant most of the marketing
 * site shipped as `style="opacity:0"` and became readable only once JavaScript
 * had run and an intersection observer had fired. Google renders JavaScript;
 * ChatGPT, Claude and Perplexity's crawlers do not.
 *
 * It was measured on the pricing page, where it mattered most: the cards
 * carrying every plan name, band and figure were all invisible in the HTML —
 * so the page went to the trouble of rendering /super's prices on the server
 * and then hid them behind an observer. The whole reason that page exists is
 * that no engine had ever seen a price.
 *
 * The movement is kept and the disappearing is dropped: translate only, from a
 * fully opaque resting state. Anything that genuinely wants to fade in — a
 * decorative layer carrying no text — should say `opacity` at its own call
 * site, where somebody has to think about what is being hidden. */
export const fadeUp = {
    hidden: { y: 24 },
    show: {
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
