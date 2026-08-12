import { buildMetadata, localBusinessLd } from "@/lib/seo";
import { getSiteSettings } from "@/lib/data/site";
import JsonLd from "@/components/JsonLd";
import LandingPage from "@/components/landing/LandingPage";

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
      <LandingPage locale={locale} />
    </>
  );
}
