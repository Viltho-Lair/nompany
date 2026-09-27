"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { AnalyticsConsent } from "@/components/landing/chrome/AnalyticsConsent";
import { LandingLocaleProvider } from "@/components/landing/locale";
import { dirFor } from "@/shared/locale";
import { Grain, INTRO_KEY, Intro, SiteNav, Thread } from "./Chrome";
import { CurtainFooter } from "./Footer";
import { SiteProvider } from "./locale";

// THREE RULES, UNLAYERED, so they beat the base layer:
//  - an element marked `data-sm` is hidden only while <html> carries the boot
//    script's `data-site-motion` (see primitives.jsx for why it is never Motion's
//    `initial` that hides it);
//  - the intro only shows where motion is on and it has not been seen this
//    session — the boot script decides both before first paint;
//  - the base layer sets every h1-h4 in the old display face and brand navy,
//    and here they inherit the page's own face and ink instead.
const SITE_CSS =
  "html[data-site-motion] .site-root [data-sm]{opacity:0}" +
  "html:not([data-site-motion]) .site-intro,html[data-site-intro-seen] .site-intro{display:none}" +
  ".site-root :is(h1,h2,h3,h4){font-family:inherit;color:inherit}";

/**
 * THE PUBLIC SITE'S CHROME, MOUNTED ONCE by the `(site)` route group — the
 * header, the thread, the curtain footer, the grain and the analytics consent.
 * Dark only (the owner, 27/09/2026). The intro plays on the home page alone,
 * once a session; every other page is ready on arrival.
 */
export function SiteShell({ locale, children }) {
  const pathname = usePathname() || "";
  const isHome = /^\/(en|ar)\/?$/.test(pathname);
  const [counted, setCounted] = useState(false);
  const finish = useCallback(() => {
    setCounted(true);
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Private windows may refuse storage; the intro simply plays again.
    }
  }, []);
  const ready = counted || !isHome;

  // Tells the boot script the bundle arrived, so it leaves the motion mark on.
  useEffect(() => {
    window.__siteMotion = true;
  }, []);

  // The page does not scroll under the intro; it would scroll a page nobody can see.
  useEffect(() => {
    if (ready) return undefined;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [ready]);

  const rtl = locale === "ar";
  return (
    <SiteProvider value={{ locale, rtl, ready }}>
      <div
        dir={dirFor(locale)}
        lang={locale}
        className="site-root relative min-h-[100dvh] overflow-x-clip bg-[#07070a] text-[#ececf1] antialiased selection:bg-[#8b7cff]/30"
        style={{
          fontFamily: rtl
            ? "var(--f-readex), ui-sans-serif, system-ui, sans-serif"
            : "var(--f-geist), var(--f-readex), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <style>{SITE_CSS}</style>
        <AnimatePresence>{ready ? null : <Intro key="intro" onDone={finish} />}</AnimatePresence>
        <SiteNav />
        <Thread />
        {/* A <div>, not a <main>: [locale]/layout.js already gives every page the
            one main landmark a document may have. The landing locale provider
            is kept for the client components that read useLandingLocale (the
            pricing board, the contact form); SiteProvider is the site's own. */}
        <LandingLocaleProvider locale={locale}>
          <div className="relative z-10 bg-[#07070a]">{children}</div>
        </LandingLocaleProvider>
        <CurtainFooter />
        <Grain />
        <AnalyticsConsent locale={locale} />
      </div>
    </SiteProvider>
  );
}
