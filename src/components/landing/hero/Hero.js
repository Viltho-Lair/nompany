"use client";
import { SECTION_DEFS } from "@/platform/db/keys";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT_EXPO, fadeUp, stagger } from "@/components/landing/lib/motion";
import { AnimatedHeadline } from "../text/AnimatedHeadline";
import { Typewriter } from "../text/Typewriter";
import { useLandingLocale } from "@/components/landing/locale";
import { landingDict } from "@/shared/landing";
import { sectionName } from "@/shared/studio/sections";
import { DashboardAssembly } from "./DashboardAssembly";
import { DashboardSkeleton } from "./DashboardSkeleton";
/* The hero stitches together techniques 1b, 3, 4 and 5. */
// THE DEPARTMENTS THE PRODUCT ACTUALLY HAS. Read from SECTION_DEFS — the same
// list that seeds every new studio — so the hero cannot drift from the software
// the way a hand-written array does. It previously promised Procurement and
// Manufacturing, which do not exist, while omitting Sales and Operations, which
// do.
//
// "Main" is dropped: it is the studio's home screen, not a department.
const modulesFor = (locale) => SECTION_DEFS.filter((d) => d.key !== "main").map((d) => sectionName(d.key, d.name, locale));
export function Hero({ dataReady }) {
  const locale = useLandingLocale();
  const tr = landingDict(locale);
    return (<section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pt-28 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-36 lg:pb-28">
      {/* ---------------- Copy column ---------------- */}
      <div className="relative z-10 max-w-xl">
        <motion.div variants={stagger(0.1)} initial="hidden" animate="show" className="space-y-7">
          <motion.div variants={fadeUp}>
            <span className="surface inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-fg-muted">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75"/>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint"/>
              </span>
              {tr.heroBadge}
            </span>
          </motion.div>

          {/* TECHNIQUE 3a: masked staggered character reveal */}
          <AnimatedHeadline as="h1" lines={[tr.heroLine1, tr.heroLine2]} highlight={{ 1: [1] }} delay={0.25} className="font-display text-4xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.65rem]"/>

          {/* TECHNIQUE 3b: cycling typewriter sub-headline */}
          <motion.p variants={fadeUp} className="text-lg text-fg-muted" style={{ minHeight: "3.5rem" }}>
            {tr.heroLead}{" "}
            <span className="font-medium text-fg">
              <Typewriter words={modulesFor(locale)}/>
            </span>
          </motion.p>

          {/* The work-email + Request demo pair was removed from the hero on
              2026-08-12; it is archived verbatim in /extracode.js. */}
          <motion.div variants={fadeUp} className="space-y-4">
            {/* SOC 2 Type II removed 2026-08-16: it names a certification that
                has to be audited and awarded, and claiming one you do not hold
                is the kind of line a buyer checks. */}
            <p className="text-xs text-fg-dim">
              {tr.freeSignup}
            </p>
          </motion.div>

          {/* The TRUST BAND was removed on 2026-08-16 — the four names on it were
              placeholders, and a logo wall of companies that are not customers
              says less than no logo wall. Archived verbatim in /extracode.js so
              it can come back the day there are real names to put on it. */}
        </motion.div>
      </div>

      {/* ---------------- Visual column ----------------
            TECHNIQUE 1b → 4: the skeleton occupies the exact final layout,
            then cross-fades into the self-assembling dashboard. Both are
            absolutely stacked during the swap so nothing reflows. */}
      <div className="relative z-0 lg:pl-6">
        <div className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            {dataReady ? (<motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}>
                <DashboardAssembly />
              </motion.div>) : (<motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: "blur(6px)" }} transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}>
                <DashboardSkeleton />
              </motion.div>)}
          </AnimatePresence>
        </div>
      </div>
    </section>);
}
