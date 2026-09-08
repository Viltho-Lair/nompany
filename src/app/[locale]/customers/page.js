import Link from "next/link";
import { MarketingShell } from "@/components/landing/chrome/MarketingShell";
import JsonLd from "@/components/JsonLd";
import { getDict } from "@/shared/i18n";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { listStudios } from "@/modules/main/studios";
import { publicCompanies } from "@/shared/marketing/showcase";
import { customersCopy } from "@/shared/marketing/customers";
import { heroCopy } from "@/shared/marketing/hero";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/customers" });
}

/* THE COMPANIES THAT ASKED TO BE NAMED, ON THEIR OWN PAGE.
   ------------------------------------------------------------------
   THE HOME PAGE'S BAND AND THIS PAGE READ THE SAME FUNCTION. `publicCompanies`
   applies both halves of the rule — consent given in the studio's own settings
   AND featured in /super — and `toPublicCompany` is an ALLOW-LIST of four
   fields rather than a redaction, so a field added to the studio record stays
   private by default. Two readers, one rule: a second filter here would be free
   to disagree with the band about who may be shown.

   IT READS DIRECTLY RATHER THAN CALLING /api/showcase. The endpoint exists for
   callers that are not this process; using it here would make the page wait on
   an HTTP round trip to itself and put the names in a fetch instead of in the
   HTML.

   NO SLUG, ANYWHERE. A customer list keyed by address is a roster of tenants to
   try.

   NO SENTENCE ABOUT WHAT EACH COMPANY RUNS ON IT, YET. The design asks for one
   "where the studio has agreed", and there is no field for it: adding one means
   a studio setting somebody types into, which is a screen rather than a line
   here. Inventing the field and rendering it empty would put a shape on the
   page that nothing can ever fill, so it is left out and written down.

   IT IS A REAL PAGE WHEN EMPTY, which is the state it ships in. Nobody has both
   consented and been featured yet, and the copy says that is a fact about
   permission rather than about usage — a blank page with no explanation reads
   as "nobody uses this". */
export default async function CustomersPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const tr = customersCopy(locale);
  const companies = publicCompanies(await listStudios());

  const structured = [
    breadcrumbLd([
      { name: dict.nav.home, url: urlFor(locale, "") },
      { name: tr.title, url: urlFor(locale, "/customers") },
    ]),
  ];

  return (
    <>
      <JsonLd data={structured} />
      <MarketingShell locale={locale}>
        <div className="mx-auto max-w-6xl px-6 py-4">
          <header className="max-w-2xl">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {tr.title}
            </h1>
            <p className="mt-5 text-lg text-fg-muted">{tr.lead}</p>
          </header>

          <section className="py-12 sm:py-14">
            {companies.length === 0 ? (
              <div className="surface max-w-2xl rounded-2xl p-8">
                <h2 className="font-display text-xl font-semibold text-fg">{tr.emptyHeading}</h2>
                <p className="mt-3 text-fg-muted">{tr.emptyBody}</p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {companies.map((c) => (
                  <li key={c.name} className="surface rounded-2xl p-6">
                    {c.logo ? (
                      /* A stored data URI or an uploaded file, so next/image
                         cannot fetch it at build time and would only get in the
                         way — a tenant's logo is neither fixed nor ours. */
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logo} alt="" className="h-9 w-auto max-w-[10rem] object-contain" />
                    ) : null}
                    <p className="mt-4 font-medium text-fg">{c.name}</p>
                    {c.sector ? <p className="mt-1 text-sm text-fg-dim">{c.sector}</p> : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-8 max-w-2xl text-sm text-fg-dim">{tr.consentNote}</p>
          </section>

          <section className="border-t border-line/70 py-12">
            <h2 className="font-display text-2xl font-semibold text-fg">{tr.ctaHeading}</h2>
            <p className="mt-3 max-w-xl text-fg-muted">{tr.ctaBody}</p>
            <Link
              href={`/${locale}/signup`}
              className="mt-6 inline-flex items-center rounded-full bg-gradient-to-br from-iris to-violet px-6 py-3 text-sm font-medium text-white shadow-lg shadow-iris/20 transition-transform hover:scale-[1.02]"
            >
              {heroCopy(locale).ctaPrimary}
            </Link>
          </section>
        </div>
      </MarketingShell>
    </>
  );
}
