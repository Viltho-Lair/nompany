"use client";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
// ARABIC LETTERS JOIN, and a letter in its own `inline-block` box cannot join
// the one beside it — the browser draws every glyph in its isolated form and
// the word falls apart. Detected on the TEXT rather than on the locale, so a
// name written in Arabic inside an English page is handled too.
const JOINING = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
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
                // A gradient word animates as ONE unit, with the gradient on a
                // static child of the animated span rather than on an ancestor
                // of it. `background-clip: text` cannot paint through a
                // descendant that has its own transform / will-change — that
                // descendant gets its own compositing layer, so the clipped
                // background never reaches its glyphs and they render with the
                // inherited `transparent`. Keeping the transform strictly
                // OUTSIDE the gradient element is what makes it visible.
                if (isHighlighted) {
                    const d = delay + charIndex * 0.022;
                    charIndex += word.length;
                    return (<motion.span key={wordIndex} className="inline-block whitespace-nowrap will-change-transform" variants={charVariants} custom={d}>
                <span className="text-gradient">{word}</span>
                <span className="inline-block">&nbsp;</span>
              </motion.span>);
                }
                // A word of joining script animates as ONE unit. The stagger
                // still advances by its length, so a mixed headline keeps the
                // same rhythm either way.
                if (JOINING.test(word)) {
                    const d = delay + charIndex * 0.022;
                    charIndex += word.length;
                    return (<span key={wordIndex} className="inline-block whitespace-nowrap">
                <motion.span className="inline-block will-change-transform" variants={charVariants} custom={d}>
                  {word}
                </motion.span>
                <span className="inline-block">&nbsp;</span>
              </span>);
                }
                return (<span key={wordIndex} className="inline-block whitespace-nowrap">
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
