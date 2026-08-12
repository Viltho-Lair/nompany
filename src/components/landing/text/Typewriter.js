"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
export function Typewriter({ words, typeSpeed = 62, deleteSpeed = 32, holdDuration = 1500, className = "", }) {
    const reduceMotion = useReducedMotion();
    const [wordIndex, setWordIndex] = useState(0);
    const [text, setText] = useState("");
    const [phase, setPhase] = useState("typing");
    const timer = useRef(undefined);
    useEffect(() => {
        if (reduceMotion)
            return;
        const word = words[wordIndex % words.length];
        const schedule = (fn, ms) => {
            timer.current = window.setTimeout(fn, ms);
        };
        if (phase === "typing") {
            if (text.length < word.length) {
                schedule(() => setText(word.slice(0, text.length + 1)), typeSpeed);
            }
            else {
                schedule(() => setPhase("deleting"), holdDuration);
            }
        }
        else if (phase === "deleting") {
            if (text.length > 0) {
                schedule(() => setText(word.slice(0, text.length - 1)), deleteSpeed);
            }
            else {
                setWordIndex((i) => (i + 1) % words.length);
                setPhase("typing");
            }
        }
        return () => window.clearTimeout(timer.current);
    }, [text, phase, wordIndex, words, typeSpeed, deleteSpeed, holdDuration, reduceMotion]);
    // Reduced motion: swap words with a plain cross-fade instead of typing.
    useEffect(() => {
        if (!reduceMotion)
            return;
        const id = window.setInterval(() => setWordIndex((i) => (i + 1) % words.length), 2600);
        return () => window.clearInterval(id);
    }, [reduceMotion, words.length]);
    if (reduceMotion) {
        return (<span className={className}>
        <AnimatePresence mode="wait">
          <motion.span key={wordIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {words[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </span>);
    }
    return (<span className={className}>
      {/* Live region announces the current module once it settles */}
      <span className="sr-only" aria-live="polite">
        {words[wordIndex]}
      </span>
      <span aria-hidden="true">{text}</span>
      <span aria-hidden="true" className="animate-caret ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[0.12em] bg-cyan"/>
    </span>);
}
