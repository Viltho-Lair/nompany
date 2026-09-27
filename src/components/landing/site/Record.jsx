"use client";
import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { homeCopy } from "@/shared/marketing/home";
import { tourCopy } from "@/shared/marketing/tour";
import { JOURNEY_SHOT } from "./content";
import { useSite } from "./locale";
import { GlassWindow, SPRING, ScrollWords, Shot, focusTransition, useInViewReveal } from "./primitives";

const MONO = { fontFamily: "var(--f-geist-mono), ui-monospace, monospace" };
const LATIN = /^[\x20-\x7e]+$/;

/** WHAT IT IS — read into existence by the scroll. */
export function Statement() {
  const { locale } = useSite();
  const tr = homeCopy(locale);
  const title = useInViewReveal(0);
  return (
    <section className="relative px-6 py-32 md:px-10 md:py-44">
      <div className="mx-auto max-w-[1280px] md:ps-[8%]">
        <motion.h2 {...title} className="text-[15px] text-white/45">
          {tr.whatTitle}
        </motion.h2>
        <ScrollWords
          className="mt-6 max-w-[30ch] text-[1.7rem] font-medium leading-[1.2] tracking-[-0.025em] md:text-[2.6rem] lg:text-[3rem] rtl:leading-[1.5] rtl:tracking-normal"
          text={tr.whatBody}
        />
      </div>
    </section>
  );
}

/**
 * ONE RECORD, START TO FINISH — scroll-pinned. A lit node glides down a spine
 * of departments, the record's reference flips over tile by tile as it changes
 * hands, and the screen where each act happens settles in behind it. The
 * scroll IS the story: each step is where the same record is, not a new one.
 */
export function RecordJourney() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { locale } = useSite();
  const tr = tourCopy(locale);
  const stages = tr.journey;
  const n = stages.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [i, setI] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const k = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    setI((prev) => (prev === k ? prev : k));
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });
  const nodeY = useTransform(smooth, [0, 1], ["0%", "100%"]);

  const heading = (
    <>
      <h2 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[2.75rem] rtl:tracking-normal">{tr.journeyTitle}</h2>
      <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-[#8f8f9c]">{tr.journeyLead}</p>
    </>
  );

  if (reduce) {
    return (
      <section id="record" className="mx-auto max-w-[1280px] px-6 py-32 md:px-10">
        {heading}
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((s) => (
            <li key={s.key} className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-inset ring-white/[0.07]">
              <p className="text-[13px] text-[#b4aaff]" style={MONO}>
                {s.ref}
              </p>
              <p className="mt-3 text-[17px]">{s.dept}</p>
              <p className="mt-1 text-[14px] text-white/55">{s.label}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const stage = stages[i];
  const shot = JOURNEY_SHOT[stage.key];
  return (
    <section id="record" ref={ref} style={{ height: `${n * 80 + 40}vh` }} className="relative">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -start-40 top-1/2 size-[640px] -translate-y-1/2 rounded-full bg-[#8b7cff]/[0.07] blur-[120px]" />
        <div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-8 px-6 md:px-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col justify-center lg:col-span-4">
            {heading}
            <div className="relative mt-8 ps-8 md:mt-10">
              <div className="absolute bottom-[11px] start-[7px] top-[11px] w-px bg-white/10">
                <motion.div style={{ y: nodeY }} className="absolute inset-x-0 top-0 h-full">
                  <span className="absolute left-1/2 top-0 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b7cff] ring-4 ring-[#8b7cff]/20 shadow-[0_0_24px_6px_rgba(139,124,255,0.45)]" />
                </motion.div>
              </div>
              <ol className="space-y-2 md:space-y-3">
                {stages.map((s, k) => (
                  <li
                    key={s.key}
                    className={`text-[15px] leading-[22px] transition-colors duration-300 ease-out ${
                      k === i ? "text-[#ececf1]" : k < i ? "text-white/45" : "text-white/25"
                    }`}
                  >
                    {s.dept}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <RefTiles text={stage.ref} />
              <div className="relative h-8 min-w-[14rem] overflow-hidden text-end">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.p
                    key={stage.key}
                    initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -16, filter: "blur(8px)", transition: { duration: 0.2 } }}
                    transition={focusTransition(0)}
                    className="text-[18px] text-white/70 md:text-[20px]"
                  >
                    {stage.label}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
            <GlassWindow className="mt-6">
              <AnimatePresence initial={false}>
                <motion.div
                  key={shot}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.03, filter: "blur(12px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(12px)", transition: { duration: 0.35 } }}
                  transition={focusTransition(0)}
                >
                  <Shot name={shot} alt={`${stage.dept}: ${stage.label}`} sizes="(min-width: 1024px) 60vw, 100vw" />
                </motion.div>
              </AnimatePresence>
            </GlassWindow>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The reference, tile by tile, each character rolling over a beat after its
 * neighbour. A reference in Arabic script cannot be cut into tiles — its
 * letters join — so it changes as one piece instead.
 */
function RefTiles({ text }) {
  if (!LATIN.test(text)) {
    return (
      <div className="relative h-[1.4em] min-w-[6em] overflow-hidden rounded-lg bg-white/[0.045] px-4 text-[2rem] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] md:text-[3.25rem]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={text}
            className="grid h-full place-items-center"
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={SPRING}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
    );
  }
  const chars = text.toUpperCase().padEnd(8, " ").split("");
  return (
    <div aria-label={text} role="img" dir="ltr" className="flex gap-1 text-[2rem] font-medium md:text-[3.25rem]" style={MONO}>
      {chars.map((c, k) => (
        <span
          key={k}
          aria-hidden="true"
          className="relative inline-block h-[1.3em] w-[0.86em] overflow-hidden rounded-lg bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
        >
          <span className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-black/40" />
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={c}
              className="absolute inset-0 grid place-items-center text-[#ececf1]"
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ ...SPRING, delay: k * 0.035 }}
            >
              {c === " " ? " " : c}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </div>
  );
}
