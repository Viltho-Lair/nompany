import Link from "next/link";
import { notFound } from "next/navigation";
import EditorialHeader from "@/components/public/EditorialHeader";
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
      <EditorialHeader eyebrow={dict.careers.title} title={title} />
      <section className="container-page grid gap-12 py-14 sm:py-16 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <Link
            href={`/${locale}/careers`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-600 text-brand-700 hover:underline dark:text-brand-500"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            {dict.apply.backToRoles}
          </Link>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-950/5 px-3 py-1 text-xs font-500 text-brand-700 dark:bg-white/10 dark:text-white">
              {field(job, "dept", locale)}
            </span>
            <span className="rounded-full bg-brand-950/5 px-3 py-1 text-xs font-500 text-brand-700 dark:bg-white/10 dark:text-white">
              {field(job, "location", locale)}
            </span>
            <span className="rounded-full bg-brand-950/5 px-3 py-1 text-xs font-500 text-brand-700 dark:bg-white/10 dark:text-white">
              {field(job, "type", locale)}
            </span>
          </div>
          <div className="mt-6">
            <span className="eyebrow">{dict.apply.overview}</span>
            <RichText value={field(job, "desc", locale)} className="mt-3 text-base" />
          </div>
        </div>

        <div className="rounded-3xl border border-steel-400/20 bg-white p-6 dark:border-white/10 dark:bg-[#263965] sm:p-8">
          <p className="mb-5 text-sm font-600 text-brand-700 dark:text-brand-500">
            {dict.apply.applyFor} {title}
          </p>
          <ApplyForm job={{ id: job.id, title }} dict={dict} backHref={`/${locale}/careers`} />
        </div>
      </section>
    </>
  );
}
