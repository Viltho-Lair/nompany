// COMPANION DECLARATION FOR motion.js.
//
// `checkJs: false` means TypeScript infers this module's shape from the plain
// JS rather than grading it, and the SPRING_* objects are plain object
// literals with no type annotation — so `type: "spring"` infers as `type:
// string`, which `motion/react`'s `Transition` (`type` is a literal union,
// `AnimationGeneratorType`) rejects the moment a `.tsx` passes one to
// `transition=`. HeroV1Assembly.tsx hit exactly this on SPRING_SOFT.
//
// A colocated `.d.ts` is TypeScript's own mechanism for a JS file whose
// exports need a real type without turning on `checkJs` for the whole tree
// (which would grade the other 271 browser files this task does not touch)
// or downgrading the new component to `.jsx` (which would drop noImplicitAny
// for it under tsconfig.strict.json). Kept minimal: only the shapes a `.tsx`
// caller actually touches.
import type { Transition } from "motion/react";

export { EASE_OUT_EXPO, EASE_SOFT } from "@/components/motion/tokens";

export const SPRING_SOFT: Transition;
export const SPRING_SNAPPY: Transition;
export const SPRING_CURSOR: Transition;

export const fadeUp: {
  hidden: { opacity: number; y: number };
  show: { opacity: number; y: number; transition: Transition };
};

export function stagger(
  staggerChildren?: number,
  delayChildren?: number
): { hidden: object; show: { transition: { staggerChildren: number; delayChildren: number } } };

export const VIEWPORT: { once: boolean; amount: number; margin: string };
