"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { heroCopy } from "@/shared/marketing/hero";
import { SPRING_SOFT } from "@/components/landing/lib/motion";
import { ScreenShot } from "@/components/landing/showcase/ScreenShot";
import { tourCopy } from "@/shared/marketing/tour";

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

   A REAL SCREEN, NOT A DRAWING (26/09/2026). This settled into
   DashboardAssembly, a synthetic dashboard with figures that were "part of
   the drawing"; the owner asked for the real product. It is the sales
   pipeline now, captured from the sample company by scripts/screenshots.mjs
   in the visitor's language and theme, and captioned as sample data.
================================================================== */

export function HeroV1Assembly({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const tour = tourCopy(locale);
  const reduceMotion = useReducedMotion();
  // A GENTLE TILT TOWARDS THE CURSOR, sprung so it never snaps. Pointer
  // position is a fraction of the frame, -0.5..0.5 on each axis.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-3, 3]), { stiffness: 120, damping: 18 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [2.5, -2.5]), { stiffness: 120, damping: 18 });
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const untilt = () => { px.set(0); py.set(0); };

  // max-w-6xl, THE SAME COLUMN AS EVERY SECTION BELOW IT. This was 7xl, so the
  // headline began 57px to the left of the copy under it at 1265px and further
  // at anything wider — and the hero is where the eye decides where the page's
  // left edge IS, so every section after it read as indented rather than the
  // hero reading as wide. A hero deliberately wider than the body is a real
  // choice; this was not one, it was the third of four container widths that
  // had accumulated on one page.
  //
  // The comment above this one was briefly a JSX comment sitting beside the
  // root element, which does not parse — a `return (` takes ONE expression, and
  // a comment before it is a second. Same mistake this repo has made before.
  return (
    /* THE WORDS, THEN THE PRODUCT AT FULL WIDTH (26/09/2026). Side by side, the
       screen got half a column beside a three-line headline and could not be
       read; stacked, it is the width of the page and every figure on it is
       legible — which is the whole reason for showing a real one. */
    <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 lg:pt-28 lg:pb-24">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
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

        <p className="mx-auto mt-6 max-w-2xl text-lg text-fg-muted">{tr.lead}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/api/intent?locale=${locale}`}
            className="inline-flex items-center rounded-full bg-gradient-to-br from-iris to-violet px-6 py-3 text-sm font-medium text-white shadow-lg shadow-iris/25 transition-transform hover:scale-[1.02]"
          >
            {tr.ctaPrimary}
          </Link>
          {/* "See how it works" scrolls to the tour of real screens, which is
              exactly what it promises. */}
          <a
            href="#tour"
            className="surface inline-flex items-center rounded-full px-6 py-3 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            {tr.ctaSecondary}
          </a>
        </div>

        <p className="mt-5 text-xs text-fg-dim">{tr.footnote}</p>
      </div>

      {/* THE VISUAL COLUMN IS A REAL SCREEN, so it is no longer aria-hidden: its
          alt text says what the pipeline shows, which a screen-reader user is
          owed as much as anybody. On a phone it is the same image, full width —
          readable because it is a 2x capture, not a scaled-down drawing.

          THE ENTRANCE IS SCALE, NEVER OPACITY, so the frame is present in the
          server-rendered HTML at full opacity and merely arrives at its final
          size — and it is dropped entirely under reduced motion rather than
          shortened, because a settle-in is exactly the kind of movement the
          setting is asking not to see. The tilt follows a mouse only, and is
          off under reduced motion too. */}
      <div className="relative z-0 mt-14 lg:mt-16">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.97 }}
          animate={{ scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : SPRING_SOFT}
        >
          <div onPointerMove={tilt} onPointerLeave={untilt} style={{ perspective: 1200 }}>
            <motion.div style={reduceMotion ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}>
              {/* A glow behind the frame, in the brand's two colours. */}
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-iris/30 via-violet/20 to-transparent blur-2xl" />
              <ScreenShot name="pipeline" locale={locale} path="/crm-sales-pipeline" alt={tour.heroAlt} priority sizes="(min-width: 1200px) 1100px, 100vw" />
            </motion.div>
          </div>
        </motion.div>
        {/* SAID IN WORDS: the screen is real, the company in it is not. A
            visitor has no other way to know the figures are sample data rather
            than nompany's own, or a customer's. */}
        <p className="mt-4 text-center text-[11px] text-fg-dim">
          {tour.sampleNote}
        </p>
      </div>
    </section>
  );
}
