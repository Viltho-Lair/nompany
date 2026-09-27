import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { liveDepartments } from "@/shared/marketing/departments";
import { platformCopy } from "@/shared/marketing/platform";
import { claimText } from "@/shared/marketing/claims";
import { heroCopy } from "@/shared/marketing/hero";
import { getDict } from "@/shared/i18n";
import { platformStatLines } from "@/components/landing/sections/PlatformStats";
import { Proof } from "@/components/landing/site/Proof";
import { PlatformBody, PlatformCta } from "@/components/landing/site/pages/platform/PlatformBody";

/* THE PLATFORM — the system explained on one page.
   ------------------------------------------------------------------
   THE DEPARTMENT LIST IS DERIVED, never typed. `liveDepartments` reads
   SECTION_DEFS and drops Main, Approvals and everything in NO_SCREEN_YET,
   so this page cannot advertise a section that renders nothing — which
   the old landing page did, streaming sixteen names past every visitor
   including four that open onto an empty screen.

   A DEPARTMENT WITH NO BLURB SHOWS ITS NAME AND NOTHING ELSE, rather
   than being dropped. The suite asserts every live key has a blurb, so
   this fallback should be unreachable; if it ever renders, the honest
   failure is a name without a description, not a section silently
   missing from the page a buyer is using to judge the product.

   Schema: SoftwareApplication with `featureList` naming every live department. */

/* NO `force-dynamic`. It was here and it was a no-op: the root layout reads
   the theme cookie, so every route in this application is dynamically rendered
   whatever a page asks for. What the directive DID do was opt this page out of
   the data cache, which is the only caching available to it. See
   lib/data/publicSettings.ts. */

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/platform" });
}

export default async function PlatformPage({ params }) {
  const { locale } = await params;
  const tr = platformCopy(locale);
  const dict = getDict(locale);
  const departments = liveDepartments(locale);
  const stats = await platformStatLines(locale);

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
      // EVERY LIVE DEPARTMENT, from the same derived list the page renders. A featureList
      // naming a section that renders nothing is the same false claim as one in
      // the copy, and harder to notice because nobody reads their own JSON-LD.
      featureList: departments.map((d) => d.name),
    },
  ];

  return (
    <>
      <JsonLd data={structured} />
      {/* A DEPARTMENT WITH NO BLURB SHOWS ITS NAME AND NOTHING ELSE (see the
          note at the top): the blurb is joined here, by key, so the client
          renders exactly the list the featureList above names. */}
      <PlatformBody
        title={tr.title}
        lead={tr.lead}
        foundationHeading={tr.foundationHeading}
        foundation={tr.foundation}
        departmentsHeading={tr.departmentsHeading}
        departmentsLead={tr.departmentsLead}
        departments={departments.map((d) => ({ key: d.key, name: d.name, blurb: tr.blurbs[d.key] || "" }))}
      />

      {/* WHERE IT STANDS, between the departments and the CTA. The design
          asks this page for general statistics; what it shows is product
          facts until the nightly aggregate has figures worth stating, and
          each slot swaps to a figure on its own as that count clears its
          threshold. The same lines and the same component as the home
          page's, so two pages can never pick different slots for one night.
          The featured-companies band is the home page's; none here. */}
      <Proof stats={stats} companies={[]} />

      {/* "Start free" is the only primary CTA on this site, so it is read
          from the one module that owns it rather than written per page —
          two copies of a button label drift the first time one is
          reworded, and the reader sees a product that cannot agree with
          itself about what its own button says. */}
      <PlatformCta
        claim={claimText("free-tier", locale)}
        label={heroCopy(locale).ctaPrimary}
        href={`/api/intent?locale=${locale}`}
      />
    </>
  );
}
