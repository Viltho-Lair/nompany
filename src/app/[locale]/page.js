import { buildMetadata, softwareApplicationLd } from "@/lib/seo";
import { buildPricing } from "@/modules/marketing/pricing";
import JsonLd from "@/components/JsonLd";
import LandingPage from "@/components/landing/LandingPage";
import { FeaturedCompanies } from "@/components/landing/sections/FeaturedCompanies";

// The public landing page. It renders its own header/footer and background, so
// `Nav` and `Footer` opt out of this route (see the `isLanding` checks there).
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
  const pricing = await buildPricing(null);

  return (
    <>
      <JsonLd data={softwareApplicationLd(pricing.cards, pricing.base, locale)} />
      {/* RENDERED HERE, ON THE SERVER, and handed down as a slot. LandingPage
          is a client component and cannot render an async server component as a
          child — but it can render one it was given, which keeps the customer
          names in the HTML instead of arriving after a fetch. The band returns
          null when no studio has both consented and been featured, so the home
          page simply does not have that section rather than having an empty
          one. */}
      <LandingPage locale={locale} customers={<FeaturedCompanies locale={locale} />} />
    </>
  );
}
