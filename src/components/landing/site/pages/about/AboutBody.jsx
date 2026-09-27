"use client";
import { motion } from "motion/react";
import { BRAND, BRAND_AR } from "@/shared/marketing/company";
import { CELL_IN, Cta, ScrollWords, useInViewReveal } from "@/components/landing/site/primitives";
import { PageHero } from "../../PageHero";

/**
 * ABOUT, in the new design. Every word arrives as props from the server page
 * (the about copy module), except the brand itself, which company.ts owns.
 *
 * The page's one signature moment is "what we make" read into existence by the
 * scroll, word by word — the same device the home page uses for "what it is",
 * because it is the same kind of sentence: the one a reader should not skim.
 */
export function AboutBody({ title, lead, what, fit, where, why, contactHeading, contactLead, emails }) {
  return (
    <>
      <PageHero title={title} lead={lead}>
        <Wordmark />
      </PageHero>
      <What heading={what.heading} body={what.body} />
      <Principles items={[fit, where, why]} />
      <Contact heading={contactHeading} lead={contactLead} emails={emails} />
    </>
  );
}

/**
 * THE NAME IN BOTH SCRIPTS, as large as the page allows. The company's first
 * claim about itself is that it works in Arabic and English equally, and this
 * is that claim as type. Hidden from assistive technology: the H1 above already
 * says the name, and a screen reader does not need it twice.
 */
function Wordmark() {
  const reveal = useInViewReveal(0.16, CELL_IN, 0.2);
  return (
    <motion.div
      {...reveal}
      aria-hidden="true"
      className="mt-16 flex flex-wrap items-baseline gap-x-10 gap-y-2 md:mt-24"
    >
      <span dir="ltr" lang="en" className="text-[4.5rem] font-medium leading-none tracking-[-0.05em] text-white/90 md:text-[9rem]">
        {BRAND}
      </span>
      <span dir="rtl" lang="ar" className="text-[4rem] font-medium leading-none text-[#c9c2ff]/70 md:text-[8rem]" style={{ fontFamily: "var(--f-readex)" }}>
        {BRAND_AR}
      </span>
    </motion.div>
  );
}

function What({ heading, body }) {
  const title = useInViewReveal(0);
  return (
    <section className="px-6 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1280px] md:ps-[8%]">
        <motion.h2 {...title} className="text-[15px] text-white/45">
          {heading}
        </motion.h2>
        <ScrollWords
          className="mt-6 max-w-[40ch] text-[1.4rem] font-medium leading-[1.3] tracking-[-0.02em] md:text-[2.1rem] rtl:leading-[1.6] rtl:tracking-normal"
          text={body}
        />
      </div>
    </section>
  );
}

/** How it fits, where the company is, and why it is building this — three
 *  cards that arrive in a short cascade and stack on a phone. */
function Principles({ items }) {
  return (
    <section className="px-6 pb-28 md:px-10 md:pb-36">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-4 lg:grid-cols-3">
        {items.map((it, i) => (
          <Principle key={it.heading} i={i} heading={it.heading} body={it.body} />
        ))}
      </div>
    </section>
  );
}

function Principle({ i, heading, body }) {
  const reveal = useInViewReveal(i * 0.08, CELL_IN, 0.2);
  return (
    <motion.section
      {...reveal}
      className="rounded-3xl bg-white/[0.025] p-7 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-9"
    >
      <span aria-hidden="true" className="block h-px w-8 bg-[#8b7cff]" />
      <h2 className="mt-6 text-[1.35rem] font-medium leading-snug tracking-[-0.02em] md:text-[1.6rem] rtl:tracking-normal">{heading}</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-[#9a9aa8]">{body}</p>
    </motion.section>
  );
}

/** Two addresses, each reaching a person. */
function Contact({ heading, lead, emails }) {
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
            style={{ background: "radial-gradient(130% 120% at 0% 100%, rgba(139,124,255,0.36), rgba(76,60,190,0.12) 45%, rgba(139,124,255,0) 75%)" }}
          />
          <h2 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[2.75rem] rtl:leading-[1.35] rtl:tracking-normal">{heading}</h2>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-white/70 md:text-[17px]">{lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {emails.map((address) => (
              <Cta key={address} href={`mailto:${address}`} variant="secondary">
                <span dir="ltr">{address}</span>
              </Cta>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
