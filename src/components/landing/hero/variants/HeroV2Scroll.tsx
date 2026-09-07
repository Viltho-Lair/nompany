"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { heroCopy } from "@/shared/marketing/hero";
import { DashboardAssembly } from "@/components/landing/hero/DashboardAssembly";

/* ==================================================================
   V2 — SCROLL REVEAL.
   V1's copy, with the product frame tilted back at rest and flattening
   as the page scrolls, handing the hero off into the section below.

   THE FRAME'S RESTING STATE IS ITS SERVER-RENDERED STATE. The tilt is
   where the frame STARTS and scroll removes it — the frame is readable
   in the first frame and in the HTML, and scroll changes how it sits
   rather than whether it is there. A scroll-driven reveal that began
   at opacity 0 would be the defect this rebuild exists to fix, wearing
   a nicer coat.

   REDUCED MOTION UNBINDS RATHER THAN FLATTENS. `useScroll` is still
   called — hooks cannot be conditional — but its output is not
   consumed, so there is no transform, no per-frame matrix update, and
   nothing for the compositor to do.

   RULED OUT ON THE WAY HERE, and recorded so it is not revisited: the
   scroll-driven image-sequence treatment (hundreds of frames) is
   ruinous for LCP and mobile data, and every WebGL/shader hero would
   dominate INP on the page that matters most and would need CSP
   changes.
================================================================== */

export function HeroV2Scroll({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const reduceMotion = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: frame,
    offset: ["start 0.85", "start 0.15"],
  });
  const eased = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.6 });

  // FROM TILTED TO FLAT, never from absent.
  const rotateX = useTransform(eased, [0, 1], [14, 0]);
  const scale = useTransform(eased, [0, 1], [0.94, 1]);

  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 lg:pt-28 lg:pb-24">
      <div className="mx-auto max-w-3xl text-center">
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
      </div>

      <div ref={frame} className="mt-14 [perspective:1800px] lg:mt-20" aria-hidden="true">
        <motion.div
          className="gpu origin-top"
          style={reduceMotion ? undefined : { rotateX, scale, transformStyle: "preserve-3d" }}
        >
          <DashboardAssembly />
        </motion.div>
      </div>
    </section>
  );
}
