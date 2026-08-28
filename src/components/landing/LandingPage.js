"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dirFor } from "@/shared/locale";
import { LandingLocaleProvider } from "@/components/landing/locale";
import { AnimatePresence } from "motion/react";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { Footer } from "@/components/landing/Footer";
import { Preloader } from "@/components/landing/Preloader";
import { TopNav } from "@/components/landing/nav/TopNav";
import { PointerProvider } from "@/components/landing/providers/PointerProvider";
import { ContactView } from "@/components/landing/views/ContactView";
import { OverviewView } from "@/components/landing/views/OverviewView";
import { PricingView } from "@/components/landing/views/PricingView";
import { ViewTransition } from "@/components/landing/views/ViewTransition";
import { VIEW_ORDER } from "@/components/landing/views/views";

/* ==================================================================
   The public landing page — the whole marketing site, which is a
   single page with three in-page views rather than three routes.

   It owns the three pieces of state the choreography depends on:
     phase      'loading' → 'live'   (preloader)
     dataReady  false → true         (skeleton hand-off)
     view       overview|pricing|…   (view transitions)

   The page is English-only and permanently dark, so it forces `ltr`
   and carries its own palette via `.landing-page` rather than
   inheriting the app's light/dark theming. `Nav`/`Footer` skip this
   route entirely — the page brings its own chrome.
================================================================== */

export default function LandingPage({ locale = "en" }) {
  const [phase, setPhase] = useState("loading");
  const [dataReady, setDataReady] = useState(false);
  const [view, setView] = useState("overview");
  // +1 = moving right through the tab order, -1 = moving back.
  const [direction, setDirection] = useState(1);
  const timers = useRef([]);

  // Freeze the page behind the preloader so nothing scrolls under it.
  useEffect(() => {
    document.body.style.overflow = phase === "loading" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const handleLoaded = useCallback(() => {
    setPhase("live");
    // Beat between "UI revealed as skeleton" and "data resolved".
    timers.current.push(window.setTimeout(() => setDataReady(true), 900));
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, []);

  // A ref mirrors `view` so navigate() can compare without a state updater
  // (state updaters must stay pure — no setDirection inside setView).
  const viewRef = useRef("overview");

  const navigate = useCallback((next) => {
    const current = viewRef.current;
    if (current === next) return;
    setDirection(VIEW_ORDER.indexOf(next) > VIEW_ORDER.indexOf(current) ? 1 : -1);
    viewRef.current = next;
    setView(next);
  }, []);

  return (
    // DIRECTION FOLLOWS THE LOCALE. This was pinned to `ltr`, which overrode the
    // `dir` the locale layout sets above it — so /ar drew the whole marketing
    // page left-to-right and no amount of translation would have shown.
    <div dir={dirFor(locale)} className="landing-page relative min-h-screen">
      <LandingLocaleProvider locale={locale}>
      <PointerProvider>
        {/* Always-on ambient layer, mounted once and never unmounted, so tab
            changes don't restart the drift loops. */}
        <AmbientBackground />

        <AnimatePresence>
          {phase === "loading" && <Preloader onComplete={handleLoaded} />}
        </AnimatePresence>

        <TopNav view={view} onNavigate={navigate} locale={locale} />

        <ViewTransition viewKey={view} direction={direction}>
          {view === "overview" && (
            <OverviewView dataReady={dataReady} onNavigate={navigate} />
          )}
          {view === "pricing" && (
            <PricingView onNavigate={navigate} locale={locale} />
          )}
          {view === "contact" && <ContactView />}
        </ViewTransition>

        <Footer onNavigate={navigate} locale={locale} />
      </PointerProvider>
      </LandingLocaleProvider>
    </div>
  );
}
