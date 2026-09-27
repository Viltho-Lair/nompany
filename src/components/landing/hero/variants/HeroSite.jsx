"use client";
import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { heroCopy } from "@/shared/marketing/hero";
import { tourCopy } from "@/shared/marketing/tour";
import { Forward } from "@/components/landing/site/Chrome";
import { useSite } from "@/components/landing/site/locale";
import { ShaderField } from "@/components/landing/site/ShaderField";
import { Cta, GlassWindow, SPRING_SOFT, Shot, useReadyReveal } from "@/components/landing/site/primitives";

// The window flies in from the page's far side, turned away, and settles. Its
// direction follows the language: the far side is the right in English and the
// left in Arabic. Module constants, so a re-render is not a new target.
const WINDOW_IN = {
  ltr: { opacity: [0, 1], x: [140, 0], rotateY: [-40, 0], filter: ["blur(18px)", "blur(0px)"] },
  rtl: { opacity: [0, 1], x: [-140, 0], rotateY: [40, 0], filter: ["blur(18px)", "blur(0px)"] },
};
const HEADLINE_IN = { opacity: [0, 1], y: [26, 0], filter: ["blur(18px)", "blur(0px)"] };
// The field fades up out of the black once the intro has lifted.
const FIELD_IN = { opacity: [0, 1] };

/**
 * THE HERO LOOKS BACK. The field bends toward the cursor, and the product
 * window tilts toward it as well: a real screen in glass, standing at an
 * angle, that straightens and comes forward as the page is scrolled.
 *
 * THE H1 IS ONE TEXT NODE — the copy module's string, rendered as a string —
 * because a tag-stripping extractor reads per-word or per-letter spans as
 * separate tokens. It arrives out of focus as a whole instead.
 *
 * NOTHING STARTS INVISIBLE IN THE HTML: see primitives.jsx. Every reveal here
 * is a keyframe animation over an element the server rendered settled.
 */
export function HeroSite() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { locale, rtl } = useSite();
  const tr = heroCopy(locale);
  const tour = tourCopy(locale);
  const side = rtl ? -1 : 1;

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const textO = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const sRotY = useTransform(scrollYProgress, [0, 0.55], [-16 * side, 0]);
  const sRotX = useTransform(scrollYProgress, [0, 0.55], [7, 0]);
  const sScale = useTransform(scrollYProgress, [0, 0.55], [1, 1.05]);

  // The cursor is physical, so the tilt toward it is too, in either language.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tx = useSpring(px, { stiffness: 110, damping: 18 });
  const ty = useSpring(py, { stiffness: 110, damping: 18 });
  const rotY = useTransform([sRotY, tx], ([a, b]) => a + b * 6);
  const rotX = useTransform([sRotX, ty], ([a, b]) => a - b * 5);
  const windowTransform = useMotionTemplate`perspective(1800px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${sScale})`;

  function move(e) {
    if (reduce || e.pointerType !== "mouse") return;
    px.set((e.clientX / window.innerWidth - 0.5) * 2);
    py.set((e.clientY / window.innerHeight - 0.5) * 2);
  }

  const badge = useReadyReveal(0.05);
  const headline = useReadyReveal(0.15, HEADLINE_IN);
  const lead = useReadyReveal(0.55);
  const ctas = useReadyReveal(0.7);
  const windowIn = useReadyReveal(0.45, rtl ? WINDOW_IN.rtl : WINDOW_IN.ltr, SPRING_SOFT);
  const note = useReadyReveal(1);
  const field = useReadyReveal(0, FIELD_IN);

  return (
    <section ref={ref} onPointerMove={move} className="relative min-h-[100dvh] overflow-hidden">
      <div {...field} className="absolute inset-0">
        <ShaderField />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-[#07070a]" />

      <div className="relative mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-14 px-6 pb-24 pt-32 md:px-10 md:pt-36 lg:min-h-[100dvh] lg:grid-cols-12 lg:gap-6 lg:pb-16">
        <motion.div style={reduce ? undefined : { y: textY, opacity: textO }} className="lg:col-span-7">
          <p
            {...badge}
            className="inline-flex min-h-8 items-center rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-white/75 ring-1 ring-inset ring-white/10 backdrop-blur-md"
          >
            {tr.badge}
          </p>
          <h1
            {...headline}
            className="mt-7 text-[2.55rem] font-medium leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-[3.6rem] xl:text-[4.2rem] rtl:leading-[1.25] rtl:tracking-normal"
          >
            {tr.h1}
          </h1>
          <p {...lead} className="mt-7 max-w-[52ch] text-[16px] leading-relaxed text-[#9d9dab] md:text-[17px]">
            {tr.lead}
          </p>
          <div {...ctas} className="mt-10 flex flex-wrap items-center gap-3">
            <Cta href={`/api/intent?locale=${locale}`}>
              {tr.ctaPrimary}
              <Forward />
            </Cta>
            <Cta href="#record" variant="ghost">
              {tr.ctaSecondary}
            </Cta>
          </div>
        </motion.div>

        <div className="relative lg:col-span-5" style={{ perspective: 1800 }}>
          <div {...windowIn} className="lg:w-[150%]">
            <motion.div style={reduce ? undefined : { transform: windowTransform }} className="will-change-transform ltr:origin-left rtl:origin-right">
              <GlassWindow url="nompany.com/qimam/crm-sales-pipeline">
                <Shot name="pipeline" alt={tour.heroAlt} priority sizes="(min-width: 1024px) 60vw, 100vw" />
              </GlassWindow>
            </motion.div>
          </div>
          <p {...note} className="mt-5 text-[12px] text-white/35 lg:ps-2">
            {tour.sampleNote}
          </p>
        </div>
      </div>
    </section>
  );
}
