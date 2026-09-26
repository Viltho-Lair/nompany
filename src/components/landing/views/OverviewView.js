"use client";
import dynamic from "next/dynamic";
import { useLandingLocale } from "@/components/landing/locale";
import { HeroV1Assembly } from "../hero/variants/HeroV1Assembly";
import { DepartmentMarquee } from "../hero/DepartmentMarquee";
import { WhatItIs, DepartmentsGlance, PricingTeaser } from "../sections/HomeSections";
import { CtaBand, GradientRule } from "../sections/CtaBand";

/* THE SHOWCASE LOADS IN ITS OWN CHUNKS. This is a CLIENT module, so each
   `dynamic()` here is a real lazy boundary (HeavyScreens.jsx explains why the
   same call in a Server Component is not): the tour, the journey, the language
   slider and the chart kit leave the home page's first load, which the bundle
   budget holds per route. They still render on the server — no `ssr: false` —
   so every word in them is in the HTML for a crawler and a visitor without
   JavaScript, and the pictures are ordinary lazy images. */
const ProductTour = dynamic(() => import("../showcase/ProductTour").then((m) => m.ProductTour));
const RecordJourney = dynamic(() => import("../showcase/RecordJourney").then((m) => m.RecordJourney));
const LanguageSlider = dynamic(() => import("../showcase/LanguageSlider").then((m) => m.LanguageSlider));
const LiveCharts = dynamic(() => import("../showcase/LiveCharts").then((m) => m.LiveCharts));

/* THE HOME PAGE, AND EVERY SENTENCE ON IT IS ONE THE PRODUCT CAN STAND BEHIND.

   WHAT LEFT. `HowItWorks`, `Features` and `SmartInsights` are deleted, not
   softened. Between them they claimed 180+ connectors, point-of-sale and
   bank-feed ingestion, consolidation of 40 legal entities across 12 currencies,
   sub-second analytics with no warehouse hop, SSO/SCIM, an agent that drafts
   workflows for you, and anomaly detection. The product has none of them. A
   claim nobody can check is not improved by hedging it, so they went whole.
   `StatsBand` went earlier for the same reason — 99.99% uptime and transactions
   per day, counted for a product that measures neither.

   WHAT ARRIVED, 26/09/2026 — the owner: the page must show the real product,
   with real screenshots, real components, interactive visuals and motion. Every
   picture below is a capture of the product (scripts/screenshots.mjs) from an
   invented sample company, captioned as such; the charts are the product's own
   chart kit running live; the journey and the language slider are interactive.
   Nothing is a mock-up, which is the same standard the claims above were cut to.

   WHAT IS NOT HERE YET, named so it is not mistaken for an omission: the
   featured-companies band needs the studio consent path before it can show a
   real name, and the statistics row needs the nightly job before it has a real
   figure. Both must degrade to nothing rather than to placeholders — a logo
   wall of companies that are not customers says less than no logo wall. */
export function OverviewView({ customers = null, stats = null }) {
  const locale = useLandingLocale();
  return (<>
      <HeroV1Assembly locale={locale}/>
      <DepartmentMarquee locale={locale}/>
      {/* THE COMPANIES THAT AGREED, between the marquee and the explanation.
          Handed in already rendered, on the server; `null` when nobody has both
          consented and been featured, so the section is absent rather than
          empty. A logo wall of companies that are not customers says less than
          no logo wall — the site carried four invented names until August. */}
      {customers}
      <WhatItIs locale={locale}/>
      {/* THE PRODUCT ITSELF, in the order a visitor's questions come: what does
          it look like (the tour of the owner's three departments), why one
          system (the journey), is the Arabic real (the slider), and is any of
          this live (the charts). */}
      <ProductTour locale={locale}/>
      <GradientRule />
      <RecordJourney locale={locale}/>
      <LanguageSlider locale={locale}/>
      <LiveCharts locale={locale}/>
      <GradientRule />
      <DepartmentsGlance locale={locale}/>
      {/* WHERE IT STANDS, after the departments and before the price. Handed in
          already rendered, like the customers band above: it is a server
          component reading the nightly aggregate, and this is a client
          component that cannot render one as a child but can render one it was
          given. Unlike that band it is never null — it has product facts to
          show until the counts are worth stating. WRAPPED HERE, because the
          section sets no width of its own (see PlatformStats), so it sits on
          the same left edge as everything above it. */}
      <div className="mx-auto max-w-6xl px-6">{stats}</div>
      <GradientRule />
      <PricingTeaser locale={locale}/>
      <CtaBand />
    </>);
}
