import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { contactCopy } from "@/shared/marketing/contact";
import { MarketingShell } from "@/components/landing/chrome/MarketingShell";
import { ContactView } from "@/components/landing/views/ContactView";
import { getDict } from "@/shared/i18n";

/* CONTACT — the view that finally earned an address.
   ------------------------------------------------------------------
   IT WAS A `view === "contact"` BRANCH inside the landing page, and the
   comment holding it there named its own release condition: contact
   becomes a route when it has a backend that actually sends. Minting a
   URL for a form that discarded every enquiry while showing the sender
   a tick would have advertised the lie. `/api/contact` sends now, and
   answers `ok` only once the mail has left, so the condition is met.

   WHAT FORCED IT was the pricing board. Its premium card says "Contact
   sales", and on a server-rendered route there is no client `navigate`
   to call — the button referenced an `onNavigate` prop nothing passed
   and nothing could pass, because `pricing/page.js` is a Server
   Component and a function is not serialisable across that boundary.
   The two candidate patches were both worse than a route: a prop the
   page cannot supply, or a link back to `/{locale}?view=contact`, which
   mints an address whose content is not in the HTML — exactly the
   defect that moving pricing out of a view was meant to fix.

   SO CONTACT IS NOT A VIEW ANY MORE, anywhere. It is here, once, with a
   canonical URL, an hreflang pair, a sitemap entry and a breadcrumb.
   Leaving the in-page copy behind would have given one form two
   addresses, and the nav would have shown it as an active tab on the
   home page while the footer and the pricing card pointed somewhere
   else.

   THE FORM ITSELF IS UNCHANGED, `mailboxFor` included: ten people or
   more reaches sales, below that reaches support, and an unanswered
   dropdown misfiles an enquiry rather than losing it. Moving where a
   form lives must not move where it sends. */

/* NO `force-dynamic`. It was here and it was a no-op: the root layout reads
   the theme cookie, so every route in this application is dynamically rendered
   whatever a page asks for. What the directive DID do was opt this page out of
   the data cache, which is the only caching available to it. See
   lib/data/publicSettings.ts. */

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/contact" });
}

export default async function ContactPage({ params }) {
  const { locale } = await params;
  const tr = contactCopy(locale);
  const dict = getDict(locale);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: dict.nav.home, url: urlFor(locale, "") },
          { name: tr.eyebrow, url: urlFor(locale, "/contact") },
        ])}
      />
      {/* The same chrome as every other public page, and the same locale
          context — `ContactView` reads its language from the provider, not
          from a prop, so without this /ar would render an Arabic route in
          English. */}
      <MarketingShell locale={locale}>
        <ContactView />
      </MarketingShell>
    </>
  );
}
