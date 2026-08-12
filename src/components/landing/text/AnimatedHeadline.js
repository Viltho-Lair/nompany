"use client";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
// `custom` carries the per-character delay so the variant keeps ownership of
// duration + easing (a component-level `transition` prop would clobber them).
const charVariants = {
    hidden: { y: "110%", opacity: 0 },
    show: (delay) => ({
        y: "0%",
        opacity: 1,
        transition: { duration: 0.85, ease: EASE_OUT_EXPO, delay },
    }),
};
export function AnimatedHeadline({ lines, className = "", delay = 0, highlight = {}, as = "h1", }) {
    const reduceMotion = useReducedMotion();
    const Tag = motion[as];
    const label = lines.join(" ");
    if (reduceMotion) {
        return (<Tag className={className} aria-label={label}>
        {lines.map((line, i) => (<span key={i} className="block">
            {line}
          </span>))}
      </Tag>);
    }
    // Global character index keeps the stagger continuous across lines.
    let charIndex = 0;
    return (<Tag className={className} aria-label={label} initial="hidden" animate="show">
      {lines.map((line, lineIndex) => (<span key={lineIndex} 
        // The mask. `pb`/`-mb` give descenders room without leaking glyphs.
        className="block overflow-hidden pb-[0.14em] -mb-[0.14em]" aria-hidden="true">
          {line.split(" ").map((word, wordIndex) => {
                const isHighlighted = highlight[lineIndex]?.includes(wordIndex) ?? false;
                return (<span key={wordIndex} className={`inline-block whitespace-nowrap ${isHighlighted ? "text-gradient" : ""}`}>
                {word.split("").map((char, i) => {
                        const d = delay + charIndex * 0.022;
                        charIndex += 1;
                        return (<motion.span key={i} className="inline-block will-change-transform" variants={charVariants} custom={d}>
                      {char}
                    </motion.span>);
                    })}
                {/* Non-breaking space preserved outside the animated glyphs */}
                <span className="inline-block">&nbsp;</span>
              </span>);
            })}
        </span>))}
    </Tag>);
}
