import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbLd, urlFor, organizationLd } from "@/lib/seo";
import { aboutCopy } from "@/shared/marketing/about";
import { companyCopy, BRAND_AR } from "@/shared/marketing/company";
import { CONTACT } from "@/lib/site";
import { getDict } from "@/shared/i18n";
import { AboutBody } from "@/components/landing/site/pages/about/AboutBody";

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
   site did before: assert a city address in the Organization schema,
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
      <AboutBody
        title={tr.title}
        lead={tr.lead}
        what={{ heading: tr.whatHeading, body: tr.whatBody }}
        fit={{ heading: tr.fitHeading, body: tr.fitBody }}
        where={{ heading: tr.whereHeading, body: tr.whereBody }}
        why={{ heading: tr.whyHeading, body: tr.whyBody }}
        contactHeading={tr.contactHeading}
        contactLead={tr.contactLead}
        emails={[CONTACT.sales, CONTACT.support]}
      />
    </>
  );
}
