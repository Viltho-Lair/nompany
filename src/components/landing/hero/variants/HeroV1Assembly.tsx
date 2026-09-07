"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { heroCopy } from "@/shared/marketing/hero";
import { SPRING_SOFT } from "@/components/landing/lib/motion";
import { DashboardAssembly } from "@/components/landing/hero/DashboardAssembly";

/* ==================================================================
   V1 — THE STUDIO ASSEMBLING ITSELF.
   Dark, badge pill, one-line headline, Start free / See how it works,
   and the product surface building itself in place beside the copy.

   THE COPY COLUMN CARRIES NO ENTRANCE ANIMATION, and that is the whole
   point of the variant rather than an omission. `motion/react` writes
   `initial` into the server-rendered style attribute, so an
   `initial={{ opacity: 0 }}` on a headline is `style="opacity:0"` in
   the HTML — which Google renders past and ChatGPT, Claude and
   Perplexity's crawlers do not. The motion lives on the visual column,
   which is decorative, and the words are settled from the first byte.

   SETTLES INTO A SYNTHETIC SCREEN FOR NOW. The spec calls for a real
   captured one; the screenshot pipeline is sequencing step 8, and this
   import is the single line that changes when it lands.
================================================================== */

export function HeroV1Assembly({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pt-20 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-28 lg:pb-24">
      <div className="relative z-10 max-w-xl">
        <span className="surface inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-fg-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
          {tr.badge}
        </span>

        {/* ONE TEXT NODE. */}
        <h1 className="mt-7 font-display text-4xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.65rem]">
          {tr.h1}
        </h1>

        <p className="mt-6 text-lg text-fg-muted">{tr.lead}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/signup`}
            className="inline-flex items-center rounded-full bg-gradient-to-br from-iris to-violet px-6 py-3 text-sm font-medium text-white shadow-lg shadow-iris/25 transition-transform hover:scale-[1.02]"
          >
            {tr.ctaPrimary}
          </Link>
          {/* NOT A DEAD LINK. It points at /platform once that page exists
              (sequencing step 3); until then it scrolls to the department
              marquee on this same page, which is the thing it promises. */}
          <a
            href="#departments"
            className="surface inline-flex items-center rounded-full px-6 py-3 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            {tr.ctaSecondary}
          </a>
        </div>

        <p className="mt-5 text-xs text-fg-dim">{tr.footnote}</p>
      </div>

      {/* THE VISUAL COLUMN IS DECORATIVE and may animate freely. It is not
          hidden on narrow viewports — it collapses: DashboardAssembly's own
          grid drops to a single column below `md`, so a phone gets one card
          rather than a scaled-down dashboard nobody can read.

          THE ENTRANCE IS SCALE, NEVER OPACITY, so the frame is present in the
          server-rendered HTML at full opacity and merely arrives at its final
          size — and it is dropped entirely under reduced motion rather than
          shortened, because a settle-in is exactly the kind of movement the
          setting is asking not to see. DashboardAssembly reads the same
          preference itself for its own tilt and float loops. */}
      <motion.div
        className="relative z-0 lg:pl-6"
        initial={reduceMotion ? false : { scale: 0.97 }}
        animate={{ scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : SPRING_SOFT}
        aria-hidden="true"
      >
        <DashboardAssembly />
      </motion.div>
    </section>
  );
}
