"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  transform as interpolate,
} from "motion/react";
import { homeCopy } from "@/shared/marketing/home";
import { tourCopy } from "@/shared/marketing/tour";
import { Forward } from "./Chrome";
import { DECK } from "./content";
import { useSite } from "./locale";
import { GlassWindow, SPRING, Shot, focusTransition } from "./primitives";

/**
 * SCREENS YOU CAN OPEN TODAY — a scroll-driven deck. Cards wait lying back at
 * the rear, rise to an upright crest in turn, then fold forward and fall away.
 * Pure transforms on a perspective stage; the scroll owns every frame, so it
 * can be scrubbed backwards and the deck reassembles.
 */
export function ScreensCascade() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { locale } = useSite();
  const tr = tourCopy(locale);
  const n = DECK.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [i, setI] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const k = Math.min(n - 1, Math.max(0, Math.round(v * (n - 1))));
    setI((prev) => (prev === k ? prev : k));
  });

  const heading = (
    <>
      <h2 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3.25rem] rtl:tracking-normal">{tr.tourTitle}</h2>
      <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-[#8f8f9c]">{tr.tourLead}</p>
    </>
  );

  if (reduce) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-32 md:px-10">
        {heading}
        <div className="mt-10 flex snap-x gap-4 overflow-x-auto pb-4">
          {DECK.map((k) => (
            <figure key={k} className="w-[80%] shrink-0 snap-start md:w-[46%]">
              <GlassWindow>
                <Shot name={k} alt={tr.screens[k].title} sizes="50vw" />
              </GlassWindow>
              <figcaption className="mt-3 text-[15px]">{tr.screens[k].title}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  }

  const s = tr.screens[DECK[i]];
  return (
    <section ref={ref} style={{ height: `${n * 65 + 60}vh` }} className="relative">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-6 px-6 md:px-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            {heading}
            <div className="relative mt-8 min-h-[120px] md:mt-12">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={DECK[i]}
                  initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -18, filter: "blur(8px)", transition: { duration: 0.2 } }}
                  transition={focusTransition(0)}
                >
                  <h3 className="text-[1.35rem] font-medium tracking-[-0.02em] md:text-[1.6rem] rtl:tracking-normal">{s.title}</h3>
                  <p className="mt-2 max-w-[42ch] text-[15px] leading-relaxed text-[#9a9aa8]">{s.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="mt-6 text-[12px] text-white/35">{tr.sampleNote}</p>
          </div>

          <div className="relative h-[40vh] md:h-[58vh] lg:col-span-7" style={{ perspective: "1600px" }}>
            {DECK.map((k, idx) => (
              <DeckCard key={k} name={k} alt={tr.screens[k].title} k={idx} n={n} p={scrollYProgress} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DeckCard({ name, alt, k, n, p }) {
  const step = 1 / (n - 1);
  const c = k * step;
  // THE KEYFRAMES RUN OUTSIDE 0..1 (a waiting card is two steps before its
  // crest). Handed to useTransform as ranges, Motion accelerates opacity
  // through a scroll timeline that throws on those offsets; as functions they
  // stay on the main thread, where this deck's transforms are anyway.
  const at = [c - 2 * step, c - step, c, c + step * 0.55, c + step];
  const rx = useTransform(p, interpolate(at, [64, 36, 0, -26, -64]));
  const y = useTransform(p, interpolate(at, [-34, -17, 0, 34, 118]));
  const z = useTransform(p, interpolate(at, [-340, -170, 0, -60, -190]));
  const opacity = useTransform(p, interpolate(at, [0.2, 0.55, 1, 0.9, 0]));
  const transform = useMotionTemplate`translate3d(0, ${y}%, ${z}px) rotateX(${rx}deg)`;
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: n - k }}>
      <motion.div style={{ transform, opacity, transformOrigin: "50% 62%" }} className="w-full will-change-transform">
        <GlassWindow>
          <Shot name={name} alt={alt} sizes="(min-width: 1024px) 55vw, 100vw" />
        </GlassWindow>
      </motion.div>
    </div>
  );
}

const PITCH = 52; // one pill (40px) and the gap under it (12px)

/**
 * THE DEPARTMENTS, TODAY — a scroll-pinned column of frosted pills that steps
 * one department at a time into the lit slot, while its name, in both
 * languages, settles beside it. The list is read from the software itself
 * (`liveDepartments`, on the server), so it cannot promise a department that
 * does not exist.
 */
export function Departments({ departments }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { locale, rtl } = useSite();
  const tr = homeCopy(locale);
  const n = departments.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [i, setI] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const k = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    setI((prev) => (prev === k ? prev : k));
  });
  const otherDir = rtl ? "ltr" : "rtl";
  const otherLang = rtl ? "en" : "ar";
  const otherFont = rtl ? undefined : { fontFamily: "var(--f-readex)" };

  const heading = (
    <>
      <h2 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3.25rem] rtl:tracking-normal">{tr.departmentsTitle}</h2>
      <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[#8f8f9c]">{tr.departmentsLead}</p>
      <Link href={`/${locale}/platform`} className="group mt-6 inline-flex items-center gap-2 text-[14px] text-[#c9c2ff] hover:text-white">
        {tr.departmentsCta}
        <Forward size={14} />
      </Link>
    </>
  );

  if (reduce || n === 0) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-32 md:px-10">
        {heading}
        <ul className="mt-10 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <li key={d.key} className="flex items-baseline justify-between gap-4 text-[15px]">
              <span>{d.name}</span>
              <span dir={otherDir} lang={otherLang} className="text-white/45" style={otherFont}>
                {d.other}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const d = departments[i];
  return (
    <section ref={ref} style={{ height: `${Math.round(n * 14 + 80)}vh` }} className="relative">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-8 px-6 md:px-10 lg:grid-cols-12 lg:gap-12">
          <div
            className="relative h-[30vh] overflow-hidden rounded-3xl ring-1 ring-inset ring-white/10 md:h-[64vh] lg:col-span-5"
            style={{ background: "radial-gradient(120% 90% at 15% 0%, rgba(139,124,255,0.42), rgba(52,40,140,0.28) 45%, rgba(12,12,20,1) 85%)" }}
          >
            <motion.ul animate={{ y: -i * PITCH }} transition={SPRING} className="absolute inset-x-6 top-1/2 -mt-5 flex flex-col items-start gap-3 md:inset-x-8">
              {departments.map((dep, k) => (
                <li
                  key={dep.key}
                  style={{ opacity: Math.max(0.12, 1 - Math.abs(k - i) * 0.17) }}
                  className={`h-10 max-w-full truncate rounded-full px-4 text-[14px] leading-10 backdrop-blur-md transition-[background-color,color,opacity] duration-300 ease-out ${
                    k === i ? "bg-[#ececf1] text-[#0b0b10]" : "bg-white/[0.07] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  }`}
                >
                  {dep.name}
                </li>
              ))}
            </motion.ul>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#12101f] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0c0c14] to-transparent" />
          </div>

          <div className="lg:col-span-7">
            {heading}
            <div className="relative mt-10 min-h-[140px] md:mt-14 md:min-h-[190px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={d.key}
                  initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -24, filter: "blur(10px)", transition: { duration: 0.2 } }}
                  transition={focusTransition(0)}
                >
                  <p className="text-[2.1rem] font-medium leading-[1.1] tracking-[-0.04em] md:text-[3.5rem] rtl:tracking-normal">{d.name}</p>
                  <p dir={otherDir} lang={otherLang} className="mt-3 text-[1.4rem] text-white/45 md:text-[2.1rem]" style={otherFont}>
                    {d.other}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
