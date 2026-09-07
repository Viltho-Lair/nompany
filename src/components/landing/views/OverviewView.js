"use client";
import { useLandingLocale } from "@/components/landing/locale";
import { HeroV1Assembly } from "../hero/variants/HeroV1Assembly";
import { DepartmentMarquee } from "../hero/DepartmentMarquee";
import { CtaBand, GradientRule } from "../sections/CtaBand";
import { Features } from "../sections/Features";
import { HowItWorks } from "../sections/HowItWorks";
import { SmartInsights } from "../sections/SmartInsights";

/* THE HERO IS THE ASSEMBLY VARIANT, chosen from three built behind a preview
   route and judged running rather than described. The other two and the route
   are deleted — scaffolding that outlives the choice becomes a page nobody
   meant to publish.

   WHAT WENT WITH THE OLD HERO. `Hero.js` carried a badge reading "Nompany 4.0 —
   now with agentic workflows" (a version that does not exist, a capability that
   does not exist, and the brand spelled with a capital) and split its headline
   per character into aria-hidden spans, so a tag-stripping extractor read it as
   `T h e O p e r a t i n g S y s t e m`. Its replacement's copy comes from
   shared/marketing/hero, whose every figure names the module that backs it.

   AND `StatsBand` WENT WITH IT, which is the bigger removal: 99.99% uptime and
   "transactions processed / day" were counted for a product that measures
   neither. They sat directly beneath the hero, so an honest headline was
   introducing six invented figures. The band comes back when the nightly
   platform-statistics job gives it real ones, and prints only above a stated
   threshold. The marquee stands there meanwhile, naming the eleven departments
   that genuinely exist.

   STILL UNTRUE BELOW THIS LINE, and named so it is not mistaken for finished:
   `HowItWorks` claims 180+ connectors and `Features` claims SSO/SCIM. They go
   with the page rewrite that replaces these sections outright. */
export function OverviewView({ onNavigate }) {
  const locale = useLandingLocale();
  return (<>
      <HeroV1Assembly locale={locale}/>
      <DepartmentMarquee locale={locale}/>
      <GradientRule />
      <HowItWorks />
      <GradientRule />
      <Features />
      <SmartInsights />
      <CtaBand onNavigate={onNavigate}/>
    </>);
}
