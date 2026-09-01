import Link from "next/link";
import EditorialHeader from "@/components/public/EditorialHeader";
import Reveal from "@/components/motion/Reveal";
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
      <EditorialHeader eyebrow={dict.common.brand} title={dict.careers.title} lead={dict.careers.lead} />
      <section className="container-page py-14 sm:py-16">
        {jobs.length === 0 ? (
          <p className="rounded-2xl border border-steel-400/15 bg-slate-50 p-8 text-steel-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            {dict.careers.noRoles}
          </p>
        ) : (
          <div className="border-t border-steel-400/20 dark:border-white/10">
            {jobs.map((job) => (
              <Reveal key={job.id}>
                <Link
                  href={`/${locale}/careers/${job.id}`}
                  className="group flex flex-col gap-5 border-b border-steel-400/20 py-8 transition-colors hover:bg-brand-500/[0.03] md:flex-row md:items-center md:justify-between dark:border-white/10"
                >
                  <div className="max-w-2xl">
                    <h2 className="font-display text-2xl font-700 uppercase tracking-tight text-brand-950 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300 sm:text-3xl">
                      {field(job, "title", locale)}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[field(job, "dept", locale), field(job, "location", locale), field(job, "type", locale)].filter(Boolean).map((tag, ti) => (
                        <span key={ti} className="rounded-full border border-steel-400/25 px-3 py-1 font-display text-[11px] font-600 uppercase tracking-[0.1em] text-brand-700 dark:border-white/15 dark:text-brand-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <RichText value={field(job, "desc", locale)} className="mt-3 text-sm line-clamp-2 text-steel-700 dark:text-slate-300" />
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 font-display text-sm font-700 uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                    {dict.careers.apply}
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
