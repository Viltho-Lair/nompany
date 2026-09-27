"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { tourCopy } from "@/shared/marketing/tour";
import { Forward } from "@/components/landing/site/Chrome";
import { useSite } from "@/components/landing/site/locale";
import { CELL_IN, Cta, GlassWindow, Shot, useInViewReveal } from "@/components/landing/site/primitives";
import { PageHero } from "../../PageHero";

// WHICH DEPARTMENTS GET A PICTURE, and which one. Only departments with a real
// capture in public/screens AND a caption in tour.screens are listed, so a
// picture always carries words saying what it is. The rest are text alone,
// which is honest: a screen from another department would show the reader a
// place where that department's work does not happen.
const DEPT_SHOT = {
  "crm-sales": "pipeline",
  quotations: "quotations",
  projects: "gantt",
  procurement: "requisitions",
  inventory: "stock",
};

/**
 * THE PLATFORM, in the new design. Everything it says arrives as props from the
 * server page (the copy module and the department list read from SECTION_DEFS);
 * the only words read here are the screens' captions, which the tour owns.
 */
export function PlatformBody({ title, lead, foundationHeading, foundation, departmentsHeading, departmentsLead, departments }) {
  return (
    <>
      <PlatformHero title={title} lead={lead} />
      <Foundation heading={foundationHeading} items={foundation} />
      <DepartmentIndex heading={departmentsHeading} lead={departmentsLead} departments={departments} />
    </>
  );
}

/** The title, the lead, and the customer page — the screen where the one data
 *  model is most visible, because every other department's record meets there. */
function PlatformHero({ title, lead }) {
  const { locale } = useSite();
  const tour = tourCopy(locale);
  const shot = useInViewReveal(0.16, CELL_IN, 0.15);
  return (
    <PageHero title={title} lead={lead}>
      <motion.figure {...shot} className="mt-14 md:mt-20">
        <GlassWindow>
          <Shot name="clients" alt={tour.screens.clients.title} priority sizes="(min-width: 1280px) 1200px, 100vw" />
        </GlassWindow>
        <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span className="text-[15px] text-white/80">{tour.screens.clients.title}</span>
          <span className="text-[12px] text-white/35">{tour.sampleNote}</span>
        </figcaption>
      </motion.figure>
    </PageHero>
  );
}

/** What is true of every department — a short grid that arrives in a cascade. */
function Foundation({ heading, items }) {
  const title = useInViewReveal(0);
  return (
    <section className="px-6 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1280px]">
        <motion.h2 {...title} className="max-w-[20ch] text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3.25rem] rtl:leading-[1.35] rtl:tracking-normal">
          {heading}
        </motion.h2>
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((f, i) => (
            <FoundationCard key={f.title} i={i} title={f.title} body={f.body} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FoundationCard({ i, title, body }) {
  const reveal = useInViewReveal(i * 0.07, CELL_IN, 0.2);
  return (
    <motion.article
      {...reveal}
      className="rounded-3xl bg-white/[0.025] p-7 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-8"
    >
      <span aria-hidden="true" className="block h-px w-8 bg-[#8b7cff]" />
      <h3 className="mt-6 text-[1.2rem] font-medium leading-snug tracking-[-0.02em] rtl:tracking-normal">{title}</h3>
      <p className="mt-3 text-[14px] leading-relaxed text-[#9a9aa8]">{body}</p>
    </motion.article>
  );
}

/**
 * EVERY DEPARTMENT, WITH WHAT IT DOES — the page's one signature moment. On a
 * wide screen an index of every department stays pinned beside the list and
 * lights the one being read, and each name in it jumps to its description. On
 * a phone the index would be a second copy of the list, so there is none.
 *
 * The index is navigation, not decoration, so it works the same under reduced
 * motion: the highlight is a colour change, not a movement.
 */
function DepartmentIndex({ heading, lead, departments }) {
  const { locale } = useSite();
  const tour = tourCopy(locale);
  const title = useInViewReveal(0);
  const sub = useInViewReveal(0.08);
  const [active, setActive] = useState(departments[0]?.key || "");

  return (
    <section className="px-6 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1280px]">
        <motion.h2 {...title} className="max-w-[20ch] text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3.25rem] rtl:leading-[1.35] rtl:tracking-normal">
          {heading}
        </motion.h2>
        <motion.div {...sub}>
          <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[#8f8f9c] md:text-[17px]">{lead}</p>
          <p className="mt-3 text-[12px] text-white/35">{tour.sampleNote}</p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <nav aria-label={heading} className="hidden lg:col-span-4 lg:block">
            <ol className="sticky top-32 max-h-[calc(100dvh-10rem)] overflow-y-auto pe-4">
              {departments.map((d) => {
                const on = d.key === active;
                return (
                  <li key={d.key}>
                    <a
                      href={`#${d.key}`}
                      aria-current={on ? "location" : undefined}
                      className={`group flex items-center gap-3 py-1 text-[14px] leading-6 transition-colors duration-300 ease-out hover:text-white ${
                        on ? "text-[#ececf1]" : "text-white/35"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-px shrink-0 transition-[width,background-color] duration-300 ease-out ${
                          on ? "w-6 bg-[#8b7cff]" : "w-3 bg-white/20 group-hover:bg-white/50"
                        }`}
                      />
                      {d.name}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="lg:col-span-8">
            {departments.map((d) => (
              <Department key={d.key} dept={d} shot={DEPT_SHOT[d.key]} caption={DEPT_SHOT[d.key] ? tour.screens[DEPT_SHOT[d.key]]?.title : ""} onActive={setActive} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Department({ dept, shot, caption, onActive }) {
  const ref = useRef(null);
  // "Being read" is the article crossing a band just above the middle of the
  // viewport, so exactly one is lit at a time as the list scrolls past.
  const reading = useInView(ref, { margin: "-40% 0px -55% 0px" });
  const reveal = useInViewReveal(0, undefined, 0.15);
  useEffect(() => {
    if (reading) onActive(dept.key);
  }, [reading, dept.key, onActive]);

  return (
    <motion.article ref={ref} id={dept.key} {...reveal} className="scroll-mt-32 pb-16 md:pb-20">
      <h3 className="text-[1.6rem] font-medium leading-tight tracking-[-0.03em] md:text-[2.1rem] rtl:leading-snug rtl:tracking-normal">{dept.name}</h3>
      {dept.blurb ? <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-[#9a9aa8] md:text-[16px]">{dept.blurb}</p> : null}
      {shot && caption ? (
        <figure className="mt-8">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_40px_100px_-30px_rgba(24,16,80,0.9)]">
            <Shot name={shot} alt={caption} sizes="(min-width: 1024px) 60vw, 100vw" />
          </div>
          <figcaption className="mt-3 text-[13px] text-white/45">{caption}</figcaption>
        </figure>
      ) : null}
    </motion.article>
  );
}

/** Free to start — the claim from the register, and the site's one primary button. */
export function PlatformCta({ claim, label, href }) {
  const reveal = useInViewReveal(0, CELL_IN, 0.3);
  return (
    <section className="px-6 pb-36 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          {...reveal}
          className="relative isolate overflow-hidden rounded-3xl bg-white/[0.025] p-8 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-14"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: "radial-gradient(130% 120% at 0% 100%, rgba(139,124,255,0.42), rgba(76,60,190,0.14) 45%, rgba(139,124,255,0) 75%)" }}
          />
          <h2 className="max-w-[22ch] text-[2rem] font-medium leading-[1.08] tracking-[-0.035em] md:text-[3rem] rtl:leading-[1.35] rtl:tracking-normal">
            {claim}
          </h2>
          <div className="mt-9">
            <Cta href={href}>
              {label}
              <Forward />
            </Cta>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
