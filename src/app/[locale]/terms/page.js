import { getDict } from "@/shared/i18n";
import { breadcrumbLd, urlFor, buildMetadata } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import LegalDocument from "@/components/LegalDocument";
import { TERMS_META, TERMS_SECTIONS } from "@/lib/legalTerms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/terms" });
}

// The chrome — hero, table of contents, section rendering, contact card — moved
// to components/LegalDocument.js when /privacy arrived and needed all of it.
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
      <LegalDocument
        meta={TERMS_META}
        sections={TERMS_SECTIONS}
        copy={dict.terms}
        crossLink={{ href: `/${locale}/privacy`, label: dict.terms.privacyLink }}
      />
    </>
  );
}
