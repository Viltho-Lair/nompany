"use client";
import { motion } from "motion/react";
import { RISE, RISE_SMALL, useInViewReveal } from "./primitives";
import type { HTMLAttributes, ReactNode } from "react";

// The keyframe objects stay module constants (see primitives.jsx): a fresh
// object on every render reads to Motion as a new target and restarts it.
const KEYFRAMES: Record<string, typeof RISE> = { rise: RISE, small: RISE_SMALL };

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
export function Reveal({ as = "div", delay = 0, variant = "small", className, children, ...rest }: {
  as?: "div" | "section" | "article" | "aside" | "header" | "footer" | "li" | "ul" | "ol" | "p" | "h1" | "h2" | "h3";
  delay?: number; variant?: "rise" | "small"; className?: string; children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd">) {
  const reveal = useInViewReveal(delay, KEYFRAMES[variant] || RISE_SMALL, 0.2);
  // One motion element per tag; they take the same props, so the div's type stands for all of them.
  const Tag = (motion as unknown as Record<string, typeof motion.div>)[as] || motion.div;
  return (
    <Tag {...rest} {...reveal} className={className}>
      {children}
    </Tag>
  );
}
