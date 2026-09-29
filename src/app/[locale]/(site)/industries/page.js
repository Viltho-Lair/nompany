import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { PageHero } from "@/components/landing/site/PageHero";
import { IndustriesGrid } from "@/components/landing/site/pages/industries/IndustryViews";
import { industryCards } from "@/lib/industryPages";
import { breadcrumbLd, buildMetadata, urlFor } from "@/lib/seo";
import { getDict, isLocale } from "@/shared/i18n";
import { industriesCopy } from "@/shared/marketing/industries";

// THE INDUSTRIES INDEX (29/09/2026) — the owner asked for the site to be
// organised like Salesforce's industries. Sixteen industries, each with the
// specialisms a company picks from when it creates a studio: the list is the
// product's own (shared/industryCatalogue), not a marketing copy of it.

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/industries" });
}

export default async function IndustriesPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = industriesCopy(locale);
  const dict = getDict(locale);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: dict.nav.home, url: urlFor(locale, "") },
          { name: tr.title, url: urlFor(locale, "/industries") },
        ])}
      />
      <PageHero title={tr.title} lead={tr.lead} />
      <IndustriesGrid industries={industryCards(locale)} locale={locale} explore={tr.explore} />
    </>
  );
}
