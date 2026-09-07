"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { heroCopy } from "@/shared/marketing/hero";
import { liveDepartments } from "@/shared/marketing/departments";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";

/* ==================================================================
   V3 — CONTINUITY. The control: closest to the current site, and the
   thing the other two have to beat.

   THE ROTATION IS NOT IN THE H1. The headline is one text node, the
   same string V1 and V2 render. The rotating department sits beneath
   it in a paragraph whose FIRST department is server-rendered as real
   text — so a crawler reads a complete sentence and the rotation is an
   enhancement over it. A rotating word inside the H1 would make the
   server-rendered headline one arbitrary frame of an animation: a
   different defect from the split-character one, the same family.

   ELEVEN NAMES, NOT SIXTEEN. The current hero's typewriter streams
   every SECTION_DEFS entry but Main — which is Tasks, plus the four
   sections that render nothing. liveDepartments is the filter.
================================================================== */

const ROTATE_MS = 2200;

export function HeroV3Continuity({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const reduceMotion = useReducedMotion();
  const departments = liveDepartments(locale);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // NO ROTATION AT ALL under reduced motion — the first department stands,
    // which is a complete sentence rather than a degraded animation.
    if (reduceMotion) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % departments.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [reduceMotion, departments.length]);

  const current = departments[index] ?? departments[0];

  return (
    <section className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 text-center lg:pt-28 lg:pb-24">
      <span className="surface inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-fg-muted">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
        </span>
        {tr.badge}
      </span>

      <h1 className="mt-7 font-display text-4xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[4rem]">
        {tr.h1}
      </h1>

      {/* The rotating line. `min-h` reserves the row so a longer department name
          arriving cannot push the CTAs down — layout shift is a Core Web Vital,
          and a hero that jumps is the one place a visitor notices it. */}
      <p className="mt-5 flex min-h-[2.5rem] flex-wrap items-center justify-center gap-x-2 font-display text-xl text-fg-muted sm:text-2xl">
        <span>{tr.rotatingPrefix}</span>
        <span className="relative inline-flex">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.key}
              className="text-gradient font-semibold"
              initial={reduceMotion ? false : { y: 12 }}
              animate={{ y: 0 }}
              exit={reduceMotion ? undefined : { y: -12 }}
              // SPREAD, not passed through. The token is a `readonly` tuple —
              // one definition shared with the studio, which feeds the same
              // numbers to CSS — and a readonly tuple does not assign to the
              // mutable `number[]` the library's easing type wants. Copying it
              // is the honest fix; re-typing the token or writing the four
              // numbers out again are both worse.
              transition={{ duration: 0.42, ease: [...EASE_OUT_EXPO] }}
            >
              {current.name}
            </motion.span>
          </AnimatePresence>
        </span>
        {tr.rotatingSuffix ? <span>{tr.rotatingSuffix}</span> : null}
      </p>

      <p className="mx-auto mt-6 max-w-2xl text-lg text-fg-muted">{tr.lead}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/${locale}/signup`}
          className="inline-flex items-center rounded-full bg-gradient-to-br from-iris to-violet px-6 py-3 text-sm font-medium text-white shadow-lg shadow-iris/25 transition-transform hover:scale-[1.02]"
        >
          {tr.ctaPrimary}
        </Link>
        <a
          href="#departments"
          className="surface inline-flex items-center rounded-full px-6 py-3 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          {tr.ctaSecondary}
        </a>
      </div>

      <p className="mt-5 text-xs text-fg-dim">{tr.footnote}</p>
    </section>
  );
}
