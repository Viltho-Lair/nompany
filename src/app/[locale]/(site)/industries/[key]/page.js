import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { PageHero } from "@/components/landing/site/PageHero";
import { IndustryBody } from "@/components/landing/site/pages/industries/IndustryViews";
import { industryByKey, industryView } from "@/lib/industryPages";
import { breadcrumbLd, buildMetadata, urlFor } from "@/lib/seo";
import { getDict, isLocale } from "@/shared/i18n";
import { industriesCopy } from "@/shared/marketing/industries";

// ONE INDUSTRY, at /<locale>/industries/<industry key>. The key is the
// catalogue's, which is published for exactly this reason: renaming one would
// break every link to its page. An unknown key is a 404, never a guess.

export async function generateMetadata({ params }) {
  const { locale, key } = await params;
  const ind = isLocale(locale) ? industryByKey(key) : null;
  if (!ind) return { robots: { index: false } };
  const path = `/industries/${ind.key}`;
  const view = industryView(locale, ind);
  // The layout's title template appends the brand; naming it here too
  // printed it twice.
  const title = view.name;
  const base = buildMetadata({ locale, path });
  return {
    ...base,
    title,
    description: view.lead,
    openGraph: { ...base.openGraph, title, description: view.lead },
    twitter: { ...base.twitter, title, description: view.lead },
  };
}

export default async function IndustryPage({ params }) {
  const { locale, key } = await params;
  if (!isLocale(locale)) notFound();
  const ind = industryByKey(key);
  if (!ind) notFound();
  const tr = industriesCopy(locale);
  const dict = getDict(locale);
  const view = industryView(locale, ind);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: dict.nav.home, url: urlFor(locale, "") },
          { name: tr.title, url: urlFor(locale, "/industries") },
          { name: view.name, url: urlFor(locale, `/industries/${ind.key}`) },
        ])}
      />
      <PageHero title={view.name} lead={view.lead} />
      <IndustryBody tr={tr} locale={locale} specialisms={view.specialisms} departments={view.departments} others={view.others} />
    </>
  );
}
