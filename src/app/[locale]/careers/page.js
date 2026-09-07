import Link from "next/link";
import { MarketingShell } from "@/components/landing/chrome/MarketingShell";
import { getDict, field } from "@/shared/i18n";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import RichText from "@/components/RichText";
import { getSiteCollection } from "@/lib/data/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/careers" });
}

/* CAREERS, ON THE SAME CHROME AS EVERY OTHER PUBLIC PAGE.
   ------------------------------------------------------------------
   IT WAS THE LAST PAGE WEARING THE ACCOUNT LAYOUT — a light editorial
   header and a different footer, while the home page, platform,
   pricing, security, about and contact are all dark and share one
   shell. Following a link from any of them landed on what looked like
   a different company's site, which is the kind of thing a visitor
   notices before they read a word.

   `Reveal` WENT WITH THE RESTYLE, and not only for consistency: it
   wraps each row in an entrance that starts hidden, and the rows here
   are the job openings — the entire content of the page. A crawler
   that does not run JavaScript was being served a heading and nothing
   else, on the page a candidate arrives at from a job board. */
export default async function CareersPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  // nompany's own job openings, managed in the Super console (Careers). Public
  // pages default to the nompany tenant, so this reads nompany's postings.
  const jobs = await getSiteCollection("careers");

  const structured = [
    breadcrumbLd([
      { name: dict.nav.home, url: urlFor(locale, "") },
      { name: dict.careers.title, url: urlFor(locale, "/careers") },
    ]),
  ];

  return (
    <>
      <JsonLd data={structured} />
      <MarketingShell locale={locale}>
      <div className="mx-auto max-w-6xl px-6 py-4">
        {/* NO EYEBROW. It read the brand name, set directly beneath the
            wordmark in the nav — the same word twice in eighty pixels. */}
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {dict.careers.title}
          </h1>
          <p className="mt-5 text-lg text-fg-muted">{dict.careers.lead}</p>
        </header>
      <section className="py-12 sm:py-14">
        {jobs.length === 0 ? (
          <p className="surface rounded-2xl p-8 text-fg-muted">{dict.careers.noRoles}</p>
        ) : (
          <div className="border-t border-line">
            {jobs.map((job) => (
              <div key={job.id}>
                <Link
                  href={`/${locale}/careers/${job.id}`}
                  className="group flex flex-col gap-5 border-b border-line py-8 transition-colors hover:bg-iris/[0.06] md:flex-row md:items-center md:justify-between"
                >
                  <div className="max-w-2xl">
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-fg transition-colors group-hover:text-iris-bright sm:text-3xl">
                      {field(job, "title", locale)}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[field(job, "dept", locale), field(job, "location", locale), field(job, "type", locale)].filter(Boolean).map((tag, ti) => (
                        <span key={ti} className="rounded-full border border-line px-3 py-1 text-[11px] tracking-[0.1em] text-fg-muted uppercase">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <RichText value={field(job, "desc", locale)} className="mt-3 line-clamp-2 text-sm text-fg-muted" />
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 font-display text-sm font-medium text-fg-muted transition-colors group-hover:text-fg">
                    {dict.careers.apply}
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
      </MarketingShell>
    </>
  );
}
