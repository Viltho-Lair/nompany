import { buildMetadata, softwareApplicationLd } from "@/lib/seo";
import { landingPricing } from "@/lib/data/publicLanding";
import JsonLd from "@/components/JsonLd";
import { OverviewView } from "@/components/landing/views/OverviewView";
import { FeaturedCompanies } from "@/components/landing/sections/FeaturedCompanies";
import { PlatformStats } from "@/components/landing/sections/PlatformStats";

// The public landing page. It lives in the `(marketing)` group and wears the
// ONE chrome its layout mounts. It used to bring its own nav, footer and
// background (`LandingPage.js`, deleted), and a shell a page carries is a
// different subtree on every page — so a click between home and any other
// public page tore the header down and built it again. `Nav` and `Footer`
// still opt out of this route (see the `isLanding` checks there).
//
// NO `force-dynamic`: this page reads nothing per-request now that the settings
// read has gone (the schema comes from the pricing catalogue, which is the same
// source /pricing uses). It still renders dynamically — the root layout reads
// the theme cookie — but it no longer opts out of the data cache while doing so.

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "" });
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  // WHAT THE PRODUCT COSTS, ON THE PAGE THAT SELLS IT. Home emitted
  // `ProfessionalService` — a LocalBusiness type — for a company with no
  // address and no premises anybody can walk into. Nobody buys an ERP from a
  // map result, and the design asks this page for Organization + WebSite
  // (both from the root layout) + SoftwareApplication with the real offers.
  // No geo header is read: home renders the base currency, and the pricing
  // page is where a visitor is offered their own.
  // Through the minute cache (lib/data/publicLanding): three catalogue reads
  // per visit otherwise, for prices that change when somebody edits /super.
  const pricing = await landingPricing();

  return (
    <>
      <JsonLd data={softwareApplicationLd(pricing.cards, pricing.base, locale)} />
      {/* RENDERED HERE, ON THE SERVER, and handed down as a slot. OverviewView
          is a client component and cannot render an async server component as a
          child — but it can render one it was given, which keeps the customer
          names in the HTML instead of arriving after a fetch. The band returns
          null when no studio has both consented and been featured, so the home
          page simply does not have that section rather than having an empty
          one. */}
      <OverviewView
        customers={<FeaturedCompanies locale={locale} />}
        stats={<PlatformStats locale={locale} />}
      />
    </>
  );
}
