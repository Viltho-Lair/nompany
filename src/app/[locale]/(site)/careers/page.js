import { getDict, field } from "@/shared/i18n";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import RichText from "@/components/RichText";
import { openJobs } from "@/lib/data/careers";
import { Cta } from "@/components/landing/site/primitives";
import { Forward } from "@/components/landing/site/Chrome";
import { Reveal } from "@/components/landing/site/Reveal";
import { JobCard } from "@/components/landing/site/pages/careers/JobCard";
import { JOB_TEXT } from "@/components/landing/site/pages/careers/skins";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/careers" });
}

/* CAREERS, IN THE SITE'S OWN DESIGN (27/09/2026).
   ------------------------------------------------------------------
   IT WAS THE LAST PAGE WEARING THE ACCOUNT LAYOUT, then the last on the old
   marketing shell; it is on the (site) group's chrome now, dark, one accent,
   the openings as cards that light under the cursor like the home page's.

   EVERY OPENING IS IN THE SERVER HTML. The old `Reveal` wrapped each row in an
   entrance that started hidden, and the rows are the entire content of the
   page — a crawler that does not run JavaScript was served a heading and
   nothing else, on the page a candidate arrives at from a job board. The
   cascade now runs from keyframes after hydration (useInViewReveal), so what
   is in the HTML is every title, tag and description, settled.

   AN EMPTY LIST SAYS SO. No placeholder roles, no "coming soon" grid: the
   sentence that there are none right now, and the way to write to us anyway. */
export default async function CareersPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  // nompany's own job openings, written in the Super console (/super/careers,
  // 27/09/2026 — the screen this comment named did not exist until then).
  // Only OPEN ones: a closed opening leaves the page and its own address.
  //
  // NOT A TENANT'S DATA, AND THIS COMMENT USED TO SAY OTHERWISE. It claimed
  // "public pages default to the nompany tenant, so this reads nompany's
  // postings", which is wrong in a way nothing would ever surface: `SITE`
  // builds `g:site:<name>`, a GLOBAL key with no studio in it. The public
  // site's careers, messages and settings belong to the platform, sit outside
  // every cascade, and are owned by no studio — so deleting the studio whose
  // slug happens to be `nompany` would change nothing on this page.
  const jobs = await openJobs();

  const structured = [
    breadcrumbLd([
      { name: dict.nav.home, url: urlFor(locale, "") },
      { name: dict.careers.title, url: urlFor(locale, "/careers") },
    ]),
  ];

  return (
    <>
      <JsonLd data={structured} />
      <section className="px-6 pb-28 pt-36 md:px-10 md:pb-40 md:pt-44">
        <div className="mx-auto max-w-[1280px]">
          {/* NO EYEBROW. It read the brand name, set directly beneath the
              wordmark in the nav — the same word twice in eighty pixels. */}
          <header className="max-w-[46rem]">
            <Reveal as="h1" variant="rise" className="text-balance text-[2.6rem] font-medium leading-[1.05] tracking-[-0.035em] md:text-[4rem] rtl:leading-[1.25] rtl:tracking-normal">
              {dict.careers.title}
            </Reveal>
            <Reveal as="p" delay={0.08} className="mt-7 max-w-[52ch] text-[16px] leading-relaxed text-[#9d9dab] md:text-[17px]">
              {dict.careers.lead}
            </Reveal>
          </header>

          {jobs.length === 0 ? (
            <Reveal
              delay={0.14}
              className="mt-16 max-w-[46rem] rounded-3xl bg-white/[0.025] p-7 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:mt-20 md:p-9"
            >
              <p className="text-[16px] leading-relaxed text-[#9a9aa8]">{dict.careers.noRoles}</p>
              <div className="mt-7">
                <Cta href={`/${locale}/contact`} variant="ghost" size="sm">
                  {dict.nav.contact}
                  <Forward size={15} />
                </Cta>
              </div>
            </Reveal>
          ) : (
            <ul className="mt-16 grid gap-3 md:mt-20 md:gap-4">
              {jobs.map((job, i) => {
                const tags = [field(job, "dept", locale), field(job, "location", locale), field(job, "type", locale)].filter(Boolean);
                return (
                  <JobCard key={job.id} index={i} href={`/${locale}/careers/${job.id}`} cta={dict.careers.apply}>
                    <h2 className="text-[1.4rem] font-medium leading-snug tracking-[-0.025em] text-[#ececf1] md:text-[1.75rem] rtl:tracking-normal">
                      {field(job, "title", locale)}
                    </h2>
                    {tags.length ? (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {tags.map((tag, ti) => (
                          <li key={ti} className="rounded-full bg-white/[0.04] px-3 py-1 text-[12px] text-white/60 ring-1 ring-inset ring-white/[0.08]">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <RichText
                      value={field(job, "desc", locale)}
                      className={`mt-4 line-clamp-2 text-[14px] [&_ol]:!my-0 [&_p]:!my-0 [&_ul]:!my-0 ${JOB_TEXT} !text-[#9a9aa8]`}
                    />
                  </JobCard>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
