"use client";

import { useCallback, useRef, useState } from "react";
import { dirFor } from "@/shared/locale";
import { LandingLocaleProvider } from "@/components/landing/locale";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/landing/nav/TopNav";
import { PointerProvider } from "@/components/landing/providers/PointerProvider";
import { ContactView } from "@/components/landing/views/ContactView";
import { OverviewView } from "@/components/landing/views/OverviewView";
import { ViewTransition } from "@/components/landing/views/ViewTransition";
import { VIEW_ORDER } from "@/components/landing/views/views";

/* ==================================================================
   The public landing page.

   THE PRELOADER IS GONE, and that is the point of this file's shrinking.
   It was a full-screen overlay shipped INSIDE the HTML and dismissed only
   by JavaScript, so the first thing in the document was a curtain and the
   page behind it was unreachable to anything that does not run scripts.
   Google renders JavaScript; ChatGPT, Claude and Perplexity's crawlers do
   not — they were served a loading screen and nothing else. The settled
   state is the server-rendered first frame now, which is the same rule the
   hero follows and the reason nothing on it starts at opacity 0.

   The `phase` state went with it: there is no loading phase to be in, and
   the body-overflow lock that froze the page behind the curtain has
   nothing left to freeze.

   PRICING LEFT TOO — it is `/[locale]/pricing`, a real server-rendered
   route, because a view has no address and the price list was invisible to
   every engine. What remains here is the home page and the contact view,
   and contact becomes a route when it has a backend that actually sends.
================================================================== */

export default function LandingPage({ locale = "en" }) {
  const [view, setView] = useState("overview");
  // +1 = moving right through the tab order, -1 = moving back.
  const [direction, setDirection] = useState(1);

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

        <TopNav view={view} onNavigate={navigate} locale={locale} />

        <ViewTransition viewKey={view} direction={direction}>
          {view === "overview" && <OverviewView />}
          {view === "contact" && <ContactView />}
        </ViewTransition>

        <Footer onNavigate={navigate} locale={locale} />
      </PointerProvider>
      </LandingLocaleProvider>
    </div>
  );
}
