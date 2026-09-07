"use client";
import { useLandingLocale } from "@/components/landing/locale";
import { HeroV1Assembly } from "../hero/variants/HeroV1Assembly";
import { DepartmentMarquee } from "../hero/DepartmentMarquee";
import { WhatItIs, DepartmentsGlance, PricingTeaser } from "../sections/HomeSections";
import { CtaBand, GradientRule } from "../sections/CtaBand";

/* THE HOME PAGE, AND EVERY SENTENCE ON IT IS ONE THE PRODUCT CAN STAND BEHIND.

   WHAT LEFT. `HowItWorks`, `Features` and `SmartInsights` are deleted, not
   softened. Between them they claimed 180+ connectors, point-of-sale and
   bank-feed ingestion, consolidation of 40 legal entities across 12 currencies,
   sub-second analytics with no warehouse hop, SSO/SCIM, an agent that drafts
   workflows for you, and anomaly detection. The product has none of them. A
   claim nobody can check is not improved by hedging it, so they went whole.
   `StatsBand` went earlier for the same reason — 99.99% uptime and transactions
   per day, counted for a product that measures neither.

   WHAT IS NOT HERE YET, named so it is not mistaken for an omission: the
   featured-companies band needs the studio consent path before it can show a
   real name, and the statistics row needs the nightly job before it has a real
   figure. Both must degrade to nothing rather than to placeholders — a logo
   wall of companies that are not customers says less than no logo wall. */
export function OverviewView() {
  const locale = useLandingLocale();
  return (<>
      <HeroV1Assembly locale={locale}/>
      <DepartmentMarquee locale={locale}/>
      <WhatItIs locale={locale}/>
      <GradientRule />
      <DepartmentsGlance locale={locale}/>
      <GradientRule />
      <PricingTeaser locale={locale}/>
      <CtaBand />
    </>);
}
