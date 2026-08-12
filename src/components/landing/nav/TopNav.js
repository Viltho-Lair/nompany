"use client";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
import { LogoMark, Wordmark } from "../Logo";
import { MagneticButton } from "../ui/MagneticButton";
import { VIEWS } from "../views/views";
/* Navigation for the simulated router (TECHNIQUE 9).
   The active-tab pill is a shared `layoutId`, so switching tabs makes it
   glide between items instead of blinking on and off. */
export function TopNav({ view, onNavigate, locale = "en" }) {
    const { scrollY } = useScroll();
    const [condensed, setCondensed] = useState(false);
    // Single boolean flip, not a per-pixel state update.
    useMotionValueEvent(scrollY, "change", (v) => {
        const next = v > 24;
        setCondensed((prev) => (prev === next ? prev : next));
    });
    return (<motion.header initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT_EXPO }} className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <motion.nav animate={{
            backgroundColor: condensed
                ? "color-mix(in oklab, var(--color-ink-soft) 82%, transparent)"
                : "color-mix(in oklab, var(--color-ink-soft) 30%, transparent)",
            borderColor: condensed ? "var(--color-line)" : "transparent",
            paddingTop: condensed ? 8 : 12,
            paddingBottom: condensed ? 8 : 12,
        }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }} className="flex w-full max-w-6xl items-center gap-1.5 rounded-full border px-2.5 backdrop-blur-xl sm:gap-4 sm:px-5">
        <button onClick={() => onNavigate("overview")} className="flex shrink-0 items-center gap-2.5 pr-1 sm:pr-2" aria-label="Nompany home">
          <LogoMark size={26} priority/>
          <Wordmark className="hidden sm:block"/>
        </button>

        {/* Tabs */}
        <div className="ml-auto flex items-center gap-1 rounded-full bg-ink/40 p-1">
          {VIEWS.map((v) => {
            const isActive = v.id === view;
            return (<button key={v.id} onClick={() => onNavigate(v.id)} aria-current={isActive ? "page" : undefined} className={`relative rounded-full px-2 py-1.5 text-xs font-medium transition-colors duration-300 sm:px-3.5 sm:text-sm ${isActive ? "text-white" : "text-fg-muted hover:text-fg"}`}>
                {isActive && (<motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-gradient-to-r from-iris to-violet" transition={{ type: "spring", stiffness: 380, damping: 32 }}/>)}
                <span className="relative z-10">{v.label}</span>
              </button>);
        })}
        </div>

        {/* Log in — a real route in this app, not one of the in-page views, so
            it is an anchor rather than a tab. */}
        <a href={`/${locale}/login`} aria-label="Log in" className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-2 text-xs font-medium text-fg-muted transition-colors duration-300 hover:border-iris/50 hover:text-fg focus-visible:ring-2 focus-visible:ring-iris-bright focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none sm:px-4 sm:text-sm">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-0.5">
            <path d="M6.5 2.5h5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-5M9 8H2.5m0 0 2.5-2.5M2.5 8 5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">Log in</span>
        </a>

        <div className="hidden md:block">
          <MagneticButton variant="ghost" strength={8} className="px-5 py-2 text-xs" onClick={() => onNavigate("contact")}>
            Book a demo
          </MagneticButton>
        </div>
      </motion.nav>
    </motion.header>);
}
