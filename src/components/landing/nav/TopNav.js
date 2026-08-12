"use client";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
import { initialsOf } from "@/lib/initials";
import Skeleton from "@/components/Skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import { LogoMark, Wordmark } from "../Logo";
import { MagneticButton } from "../ui/MagneticButton";
import { VIEWS } from "../views/views";
/* Navigation for the simulated router (TECHNIQUE 9).
   The active-tab pill is a shared `layoutId`, so switching tabs makes it
   glide between items instead of blinking on and off. */
export function TopNav({ view, onNavigate, locale = "en" }) {
    const { scrollY } = useScroll();
    const [condensed, setCondensed] = useState(false);
    // Three states, never two — `undefined` means "still asking", so the header
    // shows a skeleton instead of flashing "Log in" at someone who is already
    // signed in and then swapping it for their avatar.
    const [account, setAccount] = useState(undefined);
    useEffect(() => {
        let alive = true;
        fetch("/api/identity/me", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
            if (!alive) return;
            setAccount(d?.user
                ? { name: d.profile?.fullName || "", email: d.user.email, photo: d.profile?.photo || "" }
                : null);
        })
            .catch(() => { if (alive) setAccount(null); }); // resolve to guest so the skeleton never hangs
        return () => { alive = false; };
    }, []);
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

        {/* Light / dark / system. Writes the same `theme` cookie the account
            hub and studio read, so the choice follows the visitor across every
            surface. Inherits `currentColor`, so it needs no landing-specific
            styling of its own. */}
        <div className="shrink-0 text-fg-muted">
          <ThemeToggle labels={{ theme: "Theme", light: "Light", dark: "Dark", system: "System" }} />
        </div>

        {/* Signed out → "Log in". Signed in → the person's avatar, linking to
            their account. While the answer is unknown, a skeleton in the same
            footprint so the header does not reflow when it resolves. */}
        {account === undefined ? (
            <Skeleton className="h-9 w-9 shrink-0" rounded="rounded-full" bg="bg-line"/>
        ) : account ? (
            <a href={`/${locale}/account`} aria-label={account.name || account.email || "Your account"} title={account.name || account.email} className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-iris-bright focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
              {account.photo ? (
                  // A stored data URI, so next/image would only get in the way.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.photo} alt="" className="h-9 w-9 rounded-full border border-line object-cover"/>
              ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-iris to-violet font-display text-xs font-semibold text-white">
                    {initialsOf(account.name || account.email)}
                  </span>
              )}
            </a>
        ) : (
            <a href={`/${locale}/login`} className="inline-flex shrink-0 items-center rounded-full border border-line px-3 py-2 text-xs font-medium text-fg-muted transition-colors duration-300 hover:border-iris/50 hover:text-fg focus-visible:ring-2 focus-visible:ring-iris-bright focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none sm:px-4 sm:text-sm">
              Log in
            </a>
        )}

        <div className="hidden md:block">
          <MagneticButton variant="ghost" strength={8} className="px-5 py-2 text-xs" href={`/${locale}/signup`}>
            Start free
          </MagneticButton>
        </div>
      </motion.nav>
    </motion.header>);
}
