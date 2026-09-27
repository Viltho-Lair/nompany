"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { tourCopy } from "@/shared/marketing/tour";

/* ==================================================================
   THE ROUTING SLIP — one record, start to finish, as the paper that
   travels with a file from desk to desk.

   The customers this page is for already know this object: a slip
   stapled to the front of a file, one row per department, each one
   stamped as the file leaves that desk. nompany's argument is that the
   record no longer needs re-typing at each desk, so the slip is the
   argument in the shape they already read. It replaced RecordJourney,
   whose stations, references and words it carries unchanged.

   THE SETTLED STATE IS EVERY ROW STAMPED, and that is what the server
   renders and what reduced motion keeps. Every stamp is always in the
   DOM; `initial={false}` means motion writes the resting frame into the
   HTML, never a hidden one. In view, the slip clears and the stamps
   land again one desk at a time, holds, and repeats — the count is
   DERIVED from a tick, so nothing is set inside the effect.
================================================================== */

const HOP_MS = 1050;
const HOLD = 3;

export function RoutingSlip({ locale }: { locale: string }) {
  const tr = tourCopy(locale);
  const stops = tr.journey;
  const reduce = useReducedMotion();
  const rtl = locale === "ar";
  const [tick, setTick] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || !inView) return;
    const id = setInterval(() => setTick((t) => t + 1), HOP_MS);
    return () => clearInterval(id);
  }, [reduce, inView]);

  const n = stops.length;
  const stamped = reduce || !inView ? n : Math.min(tick % (n + HOLD), n);
  const tilt = rtl ? 4 : -4;

  return (
    <div ref={ref} className="relative rounded-xl border border-line bg-ink-soft/60 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-display text-lg font-semibold tracking-tight text-fg rtl:tracking-normal">{tr.journeyTitle}</p>
        <span className="lh-ref shrink-0 text-[11px] text-fg-dim" dir="ltr">
          {stamped}/{n}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{tr.journeyLead}</p>

      <ol className="mt-4">
        {stops.map((s, i) => {
          const on = i < stamped;
          // The desk that just stamped, while the slip is moving — not at rest.
          const current = i === stamped - 1 && stamped < n && !reduce && inView;
          const code = /\d/.test(s.ref);
          return (
            <li
              key={s.key}
              className={`grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-2.5 transition-colors duration-500 ${current ? "bg-ink-card/70" : ""}`}
            >
              <span className="lh-ref text-[11px] text-fg-dim" dir="ltr">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <p className="truncate text-[11.5px] text-fg-dim">{s.dept}</p>
                <p className={`truncate text-sm font-medium transition-colors duration-500 ${on ? "text-fg" : "text-fg-muted"}`}>{s.label}</p>
              </div>
              {/* The empty box is where the desk stamps. It stays when the
                  stamp lands, the way the printed box on a slip does. */}
              <div className="relative flex h-8 w-[6.75rem] items-center justify-center">
                <span className="absolute inset-0 rounded-md border border-dashed border-line" aria-hidden="true" />
                <motion.span
                  className={`lh-stamp relative text-[10.5px] ${code ? "lh-ref" : ""}`}
                  dir={code ? "ltr" : undefined}
                  initial={false}
                  animate={on ? { opacity: 1, scale: 1, rotate: tilt } : { opacity: 0, scale: 1.45, rotate: tilt * 2 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : on
                        ? { type: "spring", stiffness: 720, damping: 26, mass: 0.7 }
                        : { duration: 0.25, ease: "easeOut" }
                  }
                >
                  {s.ref}
                </motion.span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
