import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { securityCopy } from "@/shared/marketing/security";
import { CONTACT } from "@/lib/site";
import { getDict } from "@/shared/i18n";
import { SecurityBody } from "@/components/landing/site/pages/security/SecurityBody";

/* SECURITY — the page an enterprise buyer opens before any other.
   ------------------------------------------------------------------
   EVERY PRACTICE NAMED HERE WAS CHECKED AGAINST THE CODE, and the file
   each rests on is carried in the copy module beside it for whoever
   edits this next. This is the one page where an unverified sentence is
   worse than no page at all: it is read by exactly the people who check. */

/* NO `force-dynamic`. It was here and it was a no-op: the root layout reads
   the theme cookie, so every route in this application is dynamically rendered
   whatever a page asks for. What the directive DID do was opt this page out of
   the data cache, which is the only caching available to it. See
   lib/data/publicSettings.ts. */

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/security" });
}

export default async function SecurityPage({ params }) {
  const { locale } = await params;
  const tr = securityCopy(locale);
  const dict = getDict(locale);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: dict.nav.home, url: urlFor(locale, "") },
          { name: tr.title, url: urlFor(locale, "/security") },
        ])}
      />
      {/* `source` stays on the server: it names the file each practice rests
          on, for whoever edits the copy next, and is never rendered. */}
      <SecurityBody
        title={tr.title}
        lead={tr.lead}
        practicesHeading={tr.practicesHeading}
        groups={tr.groups.map((g) => ({
          heading: g.heading,
          practices: g.practices.map((p) => ({ title: p.title, body: p.body })),
        }))}
        contactHeading={tr.contactHeading}
        contactLead={tr.contactLead}
        email={CONTACT.support}
      />
    </>
  );
}
