import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/landing/chrome/MarketingShell";
import ApplyForm from "@/components/ApplyForm";
import JsonLd from "@/components/JsonLd";
import RichText from "@/components/RichText";
import { getSiteCollection, getSiteSettings } from "@/lib/data/site";
import { getDict, field } from "@/shared/i18n";
import { urlFor, alternatesFor, breadcrumbLd, jobPostingLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function findJob(jobId) {
  const jobs = await getSiteCollection("careers");
  return jobs.find((j) => j.id === jobId) || null;
}

export async function generateMetadata({ params }) {
  const { locale, jobId } = await params;
  const job = await findJob(jobId);
  if (!job) return {};

  const title = field(job, "title", locale);
  // Meta description must be plain text — strip any rich-text tags.
  const description = (field(job, "desc", locale) || title).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const path = `/careers/${jobId}`;
  const canonical = urlFor(locale, path);

  return {
    title,
    description,
    alternates: { canonical, languages: alternatesFor(path) },
    openGraph: { type: "website", url: canonical, siteName: "nompany", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function JobApplicationPage({ params }) {
  const { locale, jobId } = await params;
  const dict = getDict(locale);
  const job = await findJob(jobId);
  if (!job) notFound();

  const s = await getSiteSettings();
  const title = field(job, "title", locale);

  const structured = [
    breadcrumbLd([
      { name: dict.nav.home, url: urlFor(locale, "") },
      { name: dict.careers.title, url: urlFor(locale, "/careers") },
      { name: title, url: urlFor(locale, `/careers/${jobId}`) },
    ]),
    jobPostingLd(job, s, locale),
  ];

  return (
    <>
      <JsonLd data={structured} />
      {/* THE SAME SHELL AS EVERY OTHER PUBLIC PAGE. This is where a candidate
          arrives from a job board — often before they have seen anything else
          of the company — so it was the worst page to leave wearing a
          different site's chrome. */}
      <MarketingShell locale={locale}>
      <div className="mx-auto max-w-6xl px-6 py-4">
        <header className="max-w-3xl">
          <p className="text-xs tracking-[0.16em] text-fg-dim uppercase">{dict.careers.title}</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
        </header>
      <section className="grid gap-12 py-12 sm:py-14 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <Link
            href={`/${locale}/careers`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            {dict.apply.backToRoles}
          </Link>
          <div className="flex flex-wrap gap-2">
            <span className="surface rounded-full px-3 py-1 text-xs text-fg-muted">
              {field(job, "dept", locale)}
            </span>
            <span className="surface rounded-full px-3 py-1 text-xs text-fg-muted">
              {field(job, "location", locale)}
            </span>
            <span className="surface rounded-full px-3 py-1 text-xs text-fg-muted">
              {field(job, "type", locale)}
            </span>
          </div>
          <div className="mt-6">
            <span className="font-display text-xs font-600 tracking-[0.22em] text-fg-dim uppercase">
              {dict.apply.overview}
            </span>
            <RichText value={field(job, "desc", locale)} className="mt-3 text-base" />
          </div>
        </div>

        <div className="surface rounded-3xl p-6 sm:p-8">
          <p className="mb-5 text-sm font-medium text-fg">
            {dict.apply.applyFor} {title}
          </p>
          <ApplyForm job={{ id: job.id, title }} dict={dict} backHref={`/${locale}/careers`} />
        </div>
      </section>
      </div>
      </MarketingShell>
    </>
  );
}
