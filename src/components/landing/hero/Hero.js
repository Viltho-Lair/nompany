"use client";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT_EXPO, fadeUp, stagger } from "@/components/landing/lib/motion";
import { AnimatedHeadline } from "../text/AnimatedHeadline";
import { Typewriter } from "../text/Typewriter";
import { EmailCapture } from "../ui/EmailCapture";
import { DashboardAssembly } from "./DashboardAssembly";
import { DashboardSkeleton } from "./DashboardSkeleton";
/* The hero stitches together techniques 1b, 3, 4 and 5. */
const MODULES = [
    "Finance",
    "Human Resources",
    "Inventory",
    "Procurement",
    "Manufacturing",
];
export function Hero({ dataReady }) {
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
              Nompany 4.0 — now with agentic workflows
            </span>
          </motion.div>

          {/* TECHNIQUE 3a: masked staggered character reveal */}
          <AnimatedHeadline as="h1" lines={["The Operating System", "for Your Enterprise"]} highlight={{ 1: [1] }} delay={0.25} className="font-display text-4xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.65rem]"/>

          {/* TECHNIQUE 3b: cycling typewriter sub-headline */}
          <motion.p variants={fadeUp} className="text-lg text-fg-muted" style={{ minHeight: "3.5rem" }}>
            Run every corner of your business on one live data model. Manage
            your{" "}
            <span className="font-medium text-fg">
              <Typewriter words={MODULES}/>
            </span>
          </motion.p>

          {/* TECHNIQUE 5: magnetic CTA + validated email capture */}
          <motion.div variants={fadeUp} className="space-y-4">
            <EmailCapture />
            <p className="text-xs text-fg-dim">
              14-day sandbox · SOC 2 Type II · No card required
            </p>
          </motion.div>

          {/* Trust band */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-line pt-6">
            <span className="text-[11px] tracking-[0.16em] text-fg-dim uppercase">
              Trusted by
            </span>
            {["NORTHWIND", "ACME LOGISTICS", "VERTEX MFG", "HALO GROUP"].map((name) => (<span key={name} className="text-xs font-medium tracking-wide text-fg-dim transition-colors duration-300 hover:text-fg-muted">
                  {name}
                </span>))}
          </motion.div>
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
