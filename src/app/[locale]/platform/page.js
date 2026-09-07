import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { liveDepartments } from "@/shared/marketing/departments";
import { platformCopy } from "@/shared/marketing/platform";
import { claimText } from "@/shared/marketing/claims";
import { heroCopy } from "@/shared/marketing/hero";
import { getDict } from "@/shared/i18n";
import { MarketingShell } from "@/components/landing/chrome/MarketingShell";

/* THE PLATFORM — the system explained on one page.
   ------------------------------------------------------------------
   THE DEPARTMENT LIST IS DERIVED, never typed. `liveDepartments` reads
   SECTION_DEFS and drops Main, Tasks and everything in NO_SCREEN_YET,
   so this page cannot advertise a section that renders nothing — which
   the old landing page did, streaming sixteen names past every visitor
   including four that open onto an empty screen.

   A DEPARTMENT WITH NO BLURB SHOWS ITS NAME AND NOTHING ELSE, rather
   than being dropped. The suite asserts every live key has a blurb, so
   this fallback should be unreachable; if it ever renders, the honest
   failure is a name without a description, not a section silently
   missing from the page a buyer is using to judge the product.

   Schema: SoftwareApplication with `featureList` naming the eleven. */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/platform" });
}

export default async function PlatformPage({ params }) {
  const { locale } = await params;
  const tr = platformCopy(locale);
  const dict = getDict(locale);
  const departments = liveDepartments(locale);

  const structured = [
    breadcrumbLd([
      { name: dict.nav.home, url: urlFor(locale, "") },
      { name: tr.title, url: urlFor(locale, "/platform") },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "nompany",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      // THE ELEVEN, from the same derived list the page renders. A featureList
      // naming a section that renders nothing is the same false claim as one in
      // the copy, and harder to notice because nobody reads their own JSON-LD.
      featureList: departments.map((d) => d.name),
    },
  ];

  return (
    <>
      <JsonLd data={structured} />
      <MarketingShell locale={locale}>
      <div className="mx-auto max-w-6xl px-6 py-4">
        <header className="max-w-3xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {tr.title}
          </h1>
          <p className="mt-5 text-lg text-steel-700 dark:text-slate-300">{tr.lead}</p>
        </header>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-600">{tr.foundationHeading}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {tr.foundation.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-steel-400/20 p-6 dark:border-white/10"
              >
                <p className="font-display text-base font-600">{f.title}</p>
                <p className="mt-2 text-sm text-steel-700 dark:text-slate-300">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-600">{tr.departmentsHeading}</h2>
          <p className="mt-2 max-w-2xl text-steel-700 dark:text-slate-300">
            {tr.departmentsLead}
          </p>

          <div className="mt-8 border-t border-steel-400/20 dark:border-white/10">
            {departments.map((d) => (
              <article
                key={d.key}
                className="grid gap-3 border-b border-steel-400/20 py-7 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10 dark:border-white/10"
              >
                <h3 className="font-display text-lg font-600 text-brand-950 dark:text-white">
                  {d.name}
                </h3>
                <p className="text-steel-700 dark:text-slate-300">
                  {tr.blurbs[d.key] || ""}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-brand-500/25 bg-brand-500/[0.04] p-7 sm:p-9">
          <p className="font-display text-xl font-600">
            {claimText("free-under-ten", locale)}
          </p>
          {/* "Start free" is the only primary CTA on this site, so it is read
              from the one module that owns it rather than written per page —
              two copies of a button label drift the first time one is
              reworded, and the reader sees a product that cannot agree with
              itself about what its own button says. */}
          <Link
            href={`/${locale}/signup`}
            className="mt-5 inline-flex items-center rounded-full bg-brand-600 px-6 py-3 font-display text-sm font-600 text-white transition-colors hover:bg-brand-700"
          >
            {heroCopy(locale).ctaPrimary}
          </Link>
        </section>
      </div>
    </MarketingShell>
    </>
  );
}
