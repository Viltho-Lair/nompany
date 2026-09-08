import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { securityCopy } from "@/shared/marketing/security";
import { CONTACT } from "@/lib/site";
import { getDict } from "@/shared/i18n";
import { MarketingShell } from "@/components/landing/chrome/MarketingShell";

/* SECURITY — the page an enterprise buyer opens before any other.
   ------------------------------------------------------------------
   EVERY PRACTICE NAMED HERE WAS CHECKED AGAINST THE CODE, and the file
   each rests on is carried in the copy module beside it for whoever
   edits this next. This is the one page where an unverified sentence is
   worse than no page at all: it is read by exactly the people who check.

   AND IT STATES WHAT IS NOT CLAIMED — no ISO, no SOC 2, no national
   assessment, no published penetration test, no residency guarantee, no
   registered entity. A buyer asks all six early. "No, and here is what
   we do have" is worth more than silence, and much more than a page that
   implies an audit by saying nothing. */

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
      <MarketingShell locale={locale}>
      <div className="mx-auto max-w-6xl px-6 py-4">
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {tr.title}
          </h1>
          <p className="mt-5 text-lg text-steel-700 dark:text-slate-300">{tr.lead}</p>
        </header>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-600">{tr.practicesHeading}</h2>
          <div className="mt-8 border-t border-steel-400/20 dark:border-white/10">
            {tr.practices.map((p) => (
              <article
                key={p.title}
                className="grid gap-3 border-b border-steel-400/20 py-7 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-10 dark:border-white/10"
              >
                <h3 className="font-display text-base font-600 text-brand-950 dark:text-white">
                  {p.title}
                </h3>
                <p className="text-steel-700 dark:text-slate-300">{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* NOT A DISCLAIMER IN SMALL PRINT. It sits at the same weight as the
            list above it, because a buyer who finds out later that an implied
            certification does not exist has learned something about the vendor
            rather than about the certification. */}
        <section className="mt-14 rounded-2xl border border-steel-400/25 bg-slate-50 p-7 sm:p-9 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="font-display text-2xl font-600">{tr.notClaimedHeading}</h2>
          <p className="mt-3 max-w-2xl text-steel-700 dark:text-slate-300">
            {tr.notClaimedLead}
          </p>
          <ul className="mt-6 space-y-2">
            {tr.notClaimed.map((n) => (
              <li key={n} className="text-steel-700 dark:text-slate-300">
                {n}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-600">{tr.contactHeading}</h2>
          <p className="mt-3 max-w-2xl text-steel-700 dark:text-slate-300">
            {tr.contactLead}
          </p>
          <Link
            href={`mailto:${CONTACT.support}`}
            className="mt-4 inline-flex font-display text-sm font-600 text-brand-700 dark:text-brand-300"
          >
            {CONTACT.support}
          </Link>
        </section>
      </div>
    </MarketingShell>
    </>
  );
}
