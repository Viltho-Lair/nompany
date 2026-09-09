"use client";

import Link from "next/link";
import { homeCopy } from "@/shared/marketing/home";
import { heroCopy } from "@/shared/marketing/hero";
import { claimText } from "@/shared/marketing/claims";
import { liveDepartments } from "@/shared/marketing/departments";

/* ==================================================================
   THE HOME PAGE BELOW THE HERO.
   Three sections in one module because they are one story told in
   order — what it is, what it contains, what it costs — and splitting
   them across three files would make the order an accident of imports.

   WHAT THESE REPLACED. `HowItWorks`, `Features` and `SmartInsights`
   between them claimed 180+ connectors, point-of-sale and bank-feed
   ingestion, consolidation of 40 legal entities across 12 currencies,
   sub-second analytics with "no warehouse hop", SSO/SCIM, an agent
   that drafts workflows, and anomaly detection. The product has none
   of those. They are deleted rather than softened, because a claim
   nobody can check is not improved by hedging it.

   NOTHING HERE ANIMATES FROM INVISIBLE. `motion/react` writes a
   component's `initial` into the server-rendered style attribute, so
   an entrance that starts at opacity 0 ships as `style="opacity:0"`
   in the HTML — and the crawlers this rebuild is aimed at do not run
   JavaScript. These sections use no motion at all: they are text, and
   text that needs an animation to become readable is a defect.
================================================================== */

export function WhatItIs({ locale }: { locale: string }) {
  const tr = homeCopy(locale);
  return (
    /* THE SECTION IS THE PAGE'S WIDTH; THE PROSE IS NARROWER INSIDE IT.
       This was `max-w-3xl` on the SECTION, so the whole block — eyebrow,
       heading and paragraph — started 192px to the right of every other
       section on the page. Measured at 1265px: this one began at x=273 while
       the departments heading directly below it began at x=81.
       The narrow measure was right and the element carrying it was wrong. A
       comfortable line length is a property of the PARAGRAPH; applying it to
       the section indents the heading too, and the reader sees a column that
       starts in a different place for no reason they can name. `max-w-2xl` on
       the inner block is the same pattern DepartmentsGlance below already
       uses. */
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <div className="max-w-2xl">
        <p className="text-xs tracking-[0.16em] text-fg-dim uppercase">{tr.whatEyebrow}</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {tr.whatTitle}
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-fg-muted">{tr.whatBody}</p>
      </div>
    </section>
  );
}

export function DepartmentsGlance({ locale }: { locale: string }) {
  const tr = homeCopy(locale);
  // READ FROM THE SOFTWARE, not written here. The old page streamed sixteen
  // names past every visitor — Tasks, which is not a department, and four
  // sections that render nothing.
  const departments = liveDepartments(locale);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {tr.departmentsTitle}
        </h2>
        <p className="mt-5 text-lg text-fg-muted">{tr.departmentsLead}</p>
      </div>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => (
          <li
            key={d.key}
            className="surface rounded-xl px-5 py-4 text-sm font-medium text-fg-muted"
          >
            {d.name}
          </li>
        ))}
      </ul>

      <Link
        href={`/${locale}/platform`}
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
      >
        {tr.departmentsCta}
        <span aria-hidden className="rtl:-scale-x-100">
          →
        </span>
      </Link>
    </section>
  );
}

export function PricingTeaser({ locale }: { locale: string }) {
  const tr = homeCopy(locale);
  const hero = heroCopy(locale);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
      <div className="surface rounded-2xl p-8 sm:p-12">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {tr.pricingTitle}
        </h2>
        <p className="mt-5 max-w-2xl text-lg text-fg-muted">{tr.pricingLead}</p>

        {/* THE TWO FIGURES COME FROM THE REGISTER, so each names the module
            that backs it and the build fails if that module stops saying so.
            The free band and the paid floor are both read from the same PLANS
            table the app bills against — this page cannot quote a price the
            product does not charge. */}
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
          <span>{claimText("free-under-ten", locale)}</span>
          <span>{claimText("paid-from-ten", locale)}</span>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/signup`}
            className="inline-flex items-center rounded-full bg-gradient-to-br from-iris to-violet px-6 py-3 text-sm font-medium text-white shadow-lg shadow-iris/25 transition-transform hover:scale-[1.02]"
          >
            {hero.ctaPrimary}
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="inline-flex items-center rounded-full border border-line px-6 py-3 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            {tr.pricingCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
