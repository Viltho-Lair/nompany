import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ApplyForm from "@/components/landing/site/pages/careers/ApplyForm";
import JsonLd from "@/components/JsonLd";
import RichText from "@/components/RichText";
import { getSiteSettings } from "@/lib/data/site";
import { openJobs } from "@/lib/data/careers";
import { getDict, field } from "@/shared/i18n";
import { urlFor, alternatesFor, breadcrumbLd, jobPostingLd, shareImagesFor } from "@/lib/seo";
import { Reveal } from "@/components/landing/site/Reveal";
import { JOB_TEXT } from "@/components/landing/site/pages/careers/skins";

export const dynamic = "force-dynamic";

// A CLOSED opening answers 404, like one that never existed: it is not taking
// applications, and a page with a live apply form for it would say it is.
async function findJob(jobId) {
  const jobs = await openJobs();
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
  const images = shareImagesFor(locale);

  return {
    title,
    description,
    alternates: { canonical, languages: alternatesFor(path) },
    openGraph: { type: "website", url: canonical, siteName: "nompany", title, description, images: images.og },
    twitter: { card: "summary_large_image", title, description, images: images.twitter },
  };
}

/* ONE OPENING, IN THE SITE'S OWN DESIGN (27/09/2026).
   ------------------------------------------------------------------
   This is where a candidate arrives from a job board — often before they have
   seen anything else of the company — so it was the worst page to leave in a
   different site's chrome. The description reads on the left at a reading
   measure; the form sits beside it on a wide screen and below it on a phone.
   The form is NOT sticky: it is taller than a laptop's viewport, and a sticky
   column taller than the window hides its own submit button until the
   description beside it runs out.

   THE DESCRIPTION IS IN THE SERVER HTML, sanitised by RichText, and so is the
   JobPosting JSON-LD a job board reads. The motion is keyframes that run after
   hydration; nothing here starts hidden in the markup. */
export default async function JobApplicationPage({ params }) {
  const { locale, jobId } = await params;
  const dict = getDict(locale);
  const job = await findJob(jobId);
  if (!job) notFound();

  const s = await getSiteSettings();
  const title = field(job, "title", locale);
  const tags = [field(job, "dept", locale), field(job, "location", locale), field(job, "type", locale)].filter(Boolean);

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
      <section className="px-6 pb-28 pt-32 md:px-10 md:pb-40 md:pt-40">
        <div className="mx-auto max-w-[1280px]">
          <Link
            href={`/${locale}/careers`}
            className="group inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.05] px-4 text-[13px] text-white/70 ring-1 ring-inset ring-white/10 backdrop-blur-md transition-colors duration-200 hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff]"
          >
            <ArrowLeft
              size={15}
              strokeWidth={2}
              aria-hidden="true"
              className="transition-transform duration-200 ease-out group-hover:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:translate-x-0.5"
            />
            {dict.apply.backToRoles}
          </Link>

          <Reveal as="header" variant="rise" className="mt-10 max-w-[52rem] md:mt-12">
            <p className="text-[15px] text-white/45">{dict.careers.title}</p>
            <h1 className="mt-4 text-balance text-[2.6rem] font-medium leading-[1.05] tracking-[-0.035em] md:text-[4rem] rtl:leading-[1.25] rtl:tracking-normal">
              {title}
            </h1>
            {tags.length ? (
              <ul className="mt-8 flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <li key={i} className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-white/70 ring-1 ring-inset ring-white/[0.08]">
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </Reveal>

          <div className="mt-14 grid gap-10 border-t border-white/[0.07] pt-12 md:mt-16 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 xl:gap-24">
            <Reveal delay={0.08} className="min-w-0 max-w-[68ch]">
              <h2 className="text-[15px] font-normal text-white/45">{dict.apply.overview}</h2>
              <RichText
                value={field(job, "desc", locale)}
                className={`mt-5 text-[16px] leading-[1.75] ${JOB_TEXT} !text-white/70 [&_li]:!my-1.5 [&_p]:!my-4`}
              />
            </Reveal>

            <aside className="lg:self-start">
              <Reveal
                delay={0.14}
                className="rounded-3xl bg-white/[0.025] p-6 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-8"
              >
                <p className="text-[13px] text-white/45">{dict.apply.applyFor}</p>
                <p className="mt-1 text-[1.2rem] font-medium leading-snug tracking-[-0.02em] rtl:tracking-normal">{title}</p>
                <div className="mt-7">
                  <ApplyForm job={{ id: job.id, title }} dict={dict} backHref={`/${locale}/careers`} />
                </div>
              </Reveal>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
