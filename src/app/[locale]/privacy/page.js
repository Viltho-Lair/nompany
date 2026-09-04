import { getDict } from "@/shared/i18n";
import { breadcrumbLd, urlFor, buildMetadata } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import LegalDocument from "@/components/LegalDocument";
import { PRIVACY_META, PRIVACY_SECTIONS } from "@/lib/legalPrivacy";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/privacy" });
}

// The standalone Privacy Policy, and the URL given to Google for OAuth
// verification — which requires a dedicated page that is not the homepage, is
// linked from the homepage and in-app, and answers what the app accesses, uses,
// shares, protects and deletes. The disclosure itself is section 4
// (src/lib/legalGoogleData.ts, shared with Annex B of the Terms).
export default async function PrivacyPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.privacy.title, url: urlFor(locale, "/privacy") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <LegalDocument
        meta={PRIVACY_META}
        sections={PRIVACY_SECTIONS}
        copy={dict.privacy}
        crossLink={{ href: `/${locale}/terms`, label: dict.privacy.termsLink }}
      />
    </>
  );
}
