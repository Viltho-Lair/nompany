import { getDict } from "@/shared/i18n";
import { breadcrumbLd, urlFor, buildMetadata } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { LegalPage } from "@/components/landing/site/pages/legal/LegalPage";
import { TERMS_META, TERMS_SECTIONS } from "@/lib/legalTerms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/terms" });
}

// The chrome — hero, table of contents, section rendering, contact card — is
// shared with /privacy, which needs all of it. It moved to LegalDocument.js when
// /privacy arrived, and to the site's own LegalPage when both joined the (site)
// group's design (27/09/2026).
export default async function TermsPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.terms.title, url: urlFor(locale, "/terms") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <LegalPage
        meta={TERMS_META}
        sections={TERMS_SECTIONS}
        copy={dict.terms}
        crossLink={{ href: `/${locale}/privacy`, label: dict.terms.privacyLink }}
      />
    </>
  );
}
