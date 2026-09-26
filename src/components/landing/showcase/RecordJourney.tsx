"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { tourCopy } from "@/shared/marketing/tour";

/* ==================================================================
   ONE RECORD, START TO FINISH — the product's argument, drawn.

   Most companies re-type a deal at every department boundary. Here the
   same record carries through: the deal is priced, signed off, becomes a
   project, buys its materials and is billed. The stations are the
   departments that touch it; the references (Q-0001, PRJ-0001, PR-0001)
   are the sample company's own, so the drawing and the screenshots agree.

   A DIAGRAM, NOT A SCREEN, and it does not pretend to be one — no fake
   window chrome, no invented figures. It moves only while it is on
   screen, and under reduced motion every station is simply lit.
================================================================== */

const HOP_MS = 1500;
const COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#60a5fa", "#fbbf24", "#f472b6"];

export function RecordJourney({ locale }: { locale: string }) {
  const tr = tourCopy(locale);
  const reduce = useReducedMotion();
  const stops = tr.journey;
  const [tick, setTick] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // THE SETTLED STATE IS "EVERY STATION LIT", which is what the server
  // renders and what reduced motion keeps. In view, a tick walks the record
  // through the stations, holds on the last for a beat, and starts again —
  // the station is DERIVED from the tick, so nothing is set inside the effect.
  useEffect(() => {
    if (reduce || !inView) return;
    const id = setInterval(() => setTick((t) => t + 1), HOP_MS);
    return () => clearInterval(id);
  }, [reduce, inView]);
  const last = stops.length - 1;
  const at = reduce || !inView ? last : Math.min(tick % (stops.length + 2), last);

  const pct = stops.length > 1 ? (at / (stops.length - 1)) * 100 : 100;

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
      <p className="text-xs tracking-[0.16em] text-fg-dim uppercase">{tr.journeyEyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{tr.journeyTitle}</h2>
      <p className="mt-4 max-w-2xl text-fg-muted">{tr.journeyLead}</p>

      <div className="surface relative mt-12 overflow-hidden rounded-3xl px-6 py-10 sm:px-10">
        {/* The track and the part of it the record has travelled. */}
        <div className="absolute inset-x-10 top-[4.75rem] hidden h-px bg-line lg:block" aria-hidden="true" />
        <motion.div
          className="absolute top-[4.75rem] hidden h-px bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 lg:block ltr:left-10 rtl:right-10"
          aria-hidden="true"
          initial={false}
          animate={{ width: `calc((100% - 5rem) * ${pct / 100})` }}
          transition={{ duration: reduce ? 0 : HOP_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
        />

        <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
          {stops.map((s, i) => {
            const lit = i <= at;
            const here = i === at;
            return (
              <li key={s.key} className="flex items-start gap-4 lg:flex-col lg:items-center lg:text-center">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                  {here && !reduce && (
                    <motion.span
                      key={`${s.key}-${at}`}
                      className="absolute inset-0 rounded-full"
                      style={{ background: COLORS[i] }}
                      initial={{ opacity: 0.45, scale: 0.8 }}
                      animate={{ opacity: 0, scale: 1.6 }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="relative flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-500"
                    style={lit
                      ? { background: `${COLORS[i]}22`, borderColor: COLORS[i], color: COLORS[i] }
                      : { borderColor: "rgb(var(--line-rgb, 60 64 80) / 0.6)", color: "var(--fg-dim, #8b8fa3)" }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.14em] text-fg-dim uppercase">{s.dept}</p>
                  <p className={`mt-1 font-medium transition-colors duration-500 ${lit ? "text-fg" : "text-fg-muted"}`}>{s.label}</p>
                  <span
                    className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-[11px] transition-opacity duration-500 ${/\d/.test(s.ref) ? "font-mono" : "font-medium"}`}
                    style={{ background: `${COLORS[i]}1f`, color: COLORS[i], opacity: lit ? 1 : 0.35 }}
                    // A code (Q-0001) reads left to right in monospace; a word
                    // (صفقة) keeps its own script — monospace spaces Arabic
                    // out letter by letter.
                    dir={/\d/.test(s.ref) ? "ltr" : undefined}
                  >
                    {s.ref}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
