import { buildMetadata, softwareApplicationLd } from "@/lib/seo";
import { featuredCompanies, landingPricing } from "@/lib/data/publicLanding";
import JsonLd from "@/components/JsonLd";
import { platformStatLines } from "@/components/landing/sections/PlatformStats";
import { HomePage } from "@/components/landing/site/HomePage";
import { liveDepartments } from "@/shared/marketing/departments";
import { livePostCards } from "@/lib/data/blog";
import { blogCopy } from "@/shared/marketing/blog";

// The public home page, in the new design (27/09/2026). It lives in the
// `(site)` group, whose layout mounts the new chrome once; the address is
// `/<locale>` as it always was.
//
// NO `force-dynamic`: every read goes through the minute cache in
// lib/data/publicLanding (the pricing for the schema, the featured companies,
// the nightly platform figures, the newest blog posts). It still renders dynamically — the root layout
// reads a cookie — but it does not opt out of the data cache while doing so.

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "" });
}

export default async function Home({ params }) {
  const { locale } = await params;
  const [pricing, companies, stats, posts] = await Promise.all([
    landingPricing(),
    featuredCompanies(),
    platformStatLines(locale),
    // The three newest in the reader's language. A failed read hides the strip
    // rather than the home page: the blog is the least of what this page is for.
    livePostCards(locale, 3).catch(() => []),
  ]);
  const { minutes: _minutes, ...blogTr } = blogCopy(locale);

  // Every department, named in the reader's language and in the other one,
  // read from the software itself. Joined by key so the two lists cannot pair
  // one department's English with another's Arabic.
  const otherLocale = locale === "ar" ? "en" : "ar";
  const otherNames = new Map(liveDepartments(otherLocale).map((d) => [d.key, d.name]));
  const departments = liveDepartments(locale).map((d) => ({ key: d.key, name: d.name, other: otherNames.get(d.key) || "" }));

  return (
    <>
      {/* WHAT THE PRODUCT COSTS, ON THE PAGE THAT SELLS IT: SoftwareApplication
          with the real offers, in the default region's prices. Organization and
          WebSite come from the root layout. */}
      <JsonLd data={softwareApplicationLd(pricing.cards, pricing.currency, locale)} />
      <HomePage
        departments={departments}
        stats={stats}
        companies={companies.map((c) => ({ name: c.name, logo: c.logo || "", sector: c.sector || "" }))}
        posts={posts}
        blogTr={blogTr}
      />
    </>
  );
}
