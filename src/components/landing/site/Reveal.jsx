"use client";
import { motion } from "motion/react";
import { RISE, RISE_SMALL, useInViewReveal } from "./primitives";

// The keyframe objects stay module constants (see primitives.jsx): a fresh
// object on every render reads to Motion as a new target and restarts it.
const KEYFRAMES = { rise: RISE, small: RISE_SMALL };

/**
 * ONE BLOCK THAT ARRIVES OUT OF FOCUS AND SETTLES, for the reading pages —
 * the legal documents and careers — whose bodies are Server Components and so
 * cannot hold a motion element themselves. The children stay server-rendered;
 * this only wraps them.
 *
 * Nothing here is hidden by Motion's `initial`: `useInViewReveal` renders the
 * element settled into the server HTML and the boot script's CSS hides it only
 * where script runs, so a crawler reading the HTML reads every word.
 */
export function Reveal({ as = "div", delay = 0, variant = "small", className, children, ...rest }) {
  const reveal = useInViewReveal(delay, KEYFRAMES[variant] || RISE_SMALL, 0.2);
  const Tag = motion[as] || motion.div;
  return (
    <Tag {...rest} {...reveal} className={className}>
      {children}
    </Tag>
  );
}
