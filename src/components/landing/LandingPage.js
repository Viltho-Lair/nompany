"use client";

import { dirFor } from "@/shared/locale";
import { LandingLocaleProvider } from "@/components/landing/locale";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { SiteFooter } from "@/components/landing/chrome/SiteFooter";
import { TopNav } from "@/components/landing/nav/TopNav";
import { PointerProvider } from "@/components/landing/providers/PointerProvider";
import { OverviewView } from "@/components/landing/views/OverviewView";

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

   THE SIMULATED ROUTER IS GONE TOO, and with it the last in-page view.
   Pricing left first — `/[locale]/pricing`, because a view has no address
   and the price list was invisible to every engine. Contact has followed
   it to `/[locale]/contact`, on the release condition this file's own
   comment set: a route the day it has a backend that actually sends,
   never before, because a URL for a form that discards every enquiry
   advertises the lie. `/api/contact` sends.

   So there is ONE thing left to render, and the `view` state, the
   direction, `VIEW_ORDER` and `ViewTransition` are all deleted rather
   than kept switching between a single option.

   NO `<main>` REPLACES ViewTransition's. It rendered a `motion.main`
   INSIDE the `<main className="flex-1">` that `[locale]/layout.js`
   already wraps every page in, so the home page shipped two nested main
   landmarks — a document may have one, and it may not contain another.
   The landmark comes from the layout; this renders the page.
   (`MarketingShell` still nests one, which is the same defect on the
   five routes it dresses. Left alone here deliberately: it is older than
   this change and belongs in a commit that says so.)
================================================================== */

export default function LandingPage({ locale = "en", customers = null }) {
  return (
    // DIRECTION FOLLOWS THE LOCALE. This was pinned to `ltr`, which overrode the
    // `dir` the locale layout sets above it — so /ar drew the whole marketing
    // page left-to-right and no amount of translation would have shown.
    <div dir={dirFor(locale)} className="landing-page relative min-h-screen">
      <LandingLocaleProvider locale={locale}>
      <PointerProvider>
        {/* Always-on ambient layer. */}
        <AmbientBackground />

        <TopNav locale={locale} />

        {/* NO TOP PADDING, unlike `MarketingShell`: the nav is fixed over the
            hero here by design, where every other public page starts below it.
            That one difference is why this page does not reuse that shell. */}
        <OverviewView customers={customers} />

        <SiteFooter locale={locale} />
      </PointerProvider>
      </LandingLocaleProvider>
    </div>
  );
}
