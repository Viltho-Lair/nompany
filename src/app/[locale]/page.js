import { buildMetadata, localBusinessLd } from "@/lib/seo";
import { getSiteSettings } from "@/lib/data/site";
import JsonLd from "@/components/JsonLd";
import LandingPage from "@/components/landing/LandingPage";
import { FeaturedCompanies } from "@/components/landing/sections/FeaturedCompanies";

// The public landing page. It renders its own header/footer and background, so
// `Nav` and `Footer` opt out of this route (see the `isLanding` checks there).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "" });
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  const settings = await getSiteSettings();

  return (
    <>
      <JsonLd data={localBusinessLd(settings, locale)} />
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
