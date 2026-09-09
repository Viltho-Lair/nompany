import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbLd, urlFor, organizationLd } from "@/lib/seo";
import { aboutCopy } from "@/shared/marketing/about";
import { companyCopy, BRAND_AR } from "@/shared/marketing/company";
import { CONTACT } from "@/lib/site";
import { getDict } from "@/shared/i18n";

/* ABOUT — the entity home.
   ------------------------------------------------------------------
   THIS IS THE URL EVERY EXTERNAL PROFILE POINTS BACK AT: a directory
   listing, a review site, a knowledge panel. Those are created once and
   are expensive to correct, so the description they copy is the
   canonical one from shared/marketing/company, reused verbatim rather
   than reworded for this page — a profile written from a second draft
   is a permanent inconsistency nobody can fix from here.

   `alternateName` CARRIES THE ARABIC BRAND. An Arabic searcher typing
   the name phonetically previously matched nothing at all, because the
   entity had no Arabic form anywhere in its markup.

   THE PAGE ANSWERS "WHERE ARE YOU" BY SAYING NOWHERE YET, which is a
   real answer to a question buyers ask. The alternative is what this
   site did before: assert a Riyadh address in the Organization schema,
   on every page, for a company that has never been there. */

/* NO `force-dynamic`. It was here and it was a no-op: the root layout reads
   the theme cookie, so every route in this application is dynamically rendered
   whatever a page asks for. What the directive DID do was opt this page out of
   the data cache, which is the only caching available to it. See
   lib/data/publicSettings.ts. */

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/about" });
}

export default async function AboutPage({ params }) {
  const { locale } = await params;
  const tr = aboutCopy(locale);
  const dict = getDict(locale);

  const org = {
    ...organizationLd(undefined, locale),
    alternateName: BRAND_AR,
    // The one canonical sentence, in the reader's language, identical to the
    // one every external profile will carry.
    description: companyCopy(locale).description,
  };

  const sections = [
    { heading: tr.whatHeading, body: tr.whatBody },
    { heading: tr.whereHeading, body: tr.whereBody },
    { heading: tr.whyHeading, body: tr.whyBody },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: dict.nav.home, url: urlFor(locale, "") },
            { name: tr.title, url: urlFor(locale, "/about") },
          ]),
          org,
        ]}
      />
      <div className="mx-auto max-w-6xl px-6 py-4">
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {tr.title}
          </h1>
          <p className="mt-5 text-lg text-steel-700 dark:text-slate-300">{tr.lead}</p>
        </header>

        <div className="mt-14 border-t border-steel-400/20 dark:border-white/10">
          {sections.map((s) => (
            <section
              key={s.heading}
              className="grid gap-3 border-b border-steel-400/20 py-8 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10 dark:border-white/10"
            >
              <h2 className="font-display text-lg font-600 text-brand-950 dark:text-white">
                {s.heading}
              </h2>
              <p className="text-steel-700 dark:text-slate-300">{s.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-600">{tr.contactHeading}</h2>
          <p className="mt-3 text-steel-700 dark:text-slate-300">{tr.contactLead}</p>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
            {[CONTACT.sales, CONTACT.support].map((address) => (
              <Link
                key={address}
                href={`mailto:${address}`}
                className="font-display text-sm font-600 text-brand-700 dark:text-brand-300"
              >
                {address}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
