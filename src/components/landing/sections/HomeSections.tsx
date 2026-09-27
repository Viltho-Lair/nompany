"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { homeCopy } from "@/shared/marketing/home";
import { heroCopy } from "@/shared/marketing/hero";
import { claimText } from "@/shared/marketing/claims";
import { liveDepartments } from "@/shared/marketing/departments";
import { SectionHead } from "./SectionHead";
import { spotlight } from "../lib/spotlight";

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

   THE LETTERHEAD (27/09/2026). Every section opens on SectionHead's ruled
   field — the label in the margin, the heading beside it — and every
   width is the one `max-w-6xl` column the hero sets, so no section starts
   on a different left edge from the one above it (this file used to
   carry a paragraph about exactly that drift).
================================================================== */

/* THE ONE PARAGRAPH OF ARGUMENT, READ AT THE READER'S PACE (27/09/2026).
   The section pins while its paragraph lights up word by word with the
   scroll — Motion's scroll word reveal (motion.dev, react/text-scroll-word-
   reveal), adapted. The pinning is plain CSS `sticky`, so it holds without
   JavaScript; the dimming is not: every word is at full strength in the
   server's HTML and only dims once the page has hydrated (`live`), which is
   below the fold, where nobody sees it happen. The words are spans inside one
   paragraph with their spaces between them, so the text a crawler or a screen
   reader gets is the same sentence it always was. */
const WORD_FROM = 0.14;
const SPREAD = 0.78;
const WORD_SPAN = 0.16;

function Word({ word, i, count, progress, live }: {
  word: string; i: number; count: number; progress: MotionValue<number>; live: boolean;
}) {
  const start = count <= 1 ? 0 : (i / (count - 1)) * SPREAD;
  const opacity = useTransform(progress, [start, Math.min(1, start + WORD_SPAN)], [WORD_FROM, 1]);
  return <motion.span style={live ? { opacity } : undefined}>{word}</motion.span>;
}

export function WhatItIs({ locale }: { locale: string }) {
  const tr = homeCopy(locale);
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [live, setLive] = useState(false);
  useEffect(() => { if (!reduce) queueMicrotask(() => setLive(true)); }, [reduce]);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.35", "end end"] });
  const words = tr.whatBody.split(" ");

  return (
    <section ref={ref} className="relative mx-auto max-w-6xl px-6 lg:min-h-[190vh]">
      <div className="py-20 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:py-24">
        <SectionHead label={tr.whatEyebrow} title={tr.whatTitle}>
          <p className="mt-7 max-w-[40ch] font-display text-[clamp(1.3rem,2.2vw,1.95rem)] leading-[1.38] font-medium tracking-[-0.015em] text-fg rtl:leading-[1.6] rtl:tracking-normal">
            {words.map((w, i) => (
              <Fragment key={i}>
                <Word word={w} i={i} count={words.length} progress={scrollYProgress} live={live && !reduce} />
                {i < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </p>
        </SectionHead>
      </div>
    </section>
  );
}

/* THE DEPARTMENTS AS A REGISTER, IN BOTH LANGUAGES.
   It replaced two lists of the same eighteen names — a marquee under the
   hero and a grid of chips further down — which told a visitor the same
   thing twice and proved nothing either time. A numbered register proves
   the headline's count, and the second column proves the Arabic: each name
   is the one the product itself shows in that language (`sectionName`),
   never a translation written here.

   READ FROM THE SOFTWARE, not written here. The old page streamed sixteen
   names past every visitor — a control that is not a department, and four
   sections that render nothing. */
export function DepartmentsRegister({ locale }: { locale: string }) {
  const tr = homeCopy(locale);
  const hero = heroCopy(locale);
  const other = locale === "ar" ? "en" : "ar";
  const departments = liveDepartments(locale);
  const theirs = new Map(liveDepartments(other).map((d) => [d.key, d.name]));

  return (
    <section id="departments" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
      <SectionHead label={hero.marqueeLabel} title={tr.departmentsTitle} lead={tr.departmentsLead}>
        <ol data-reveal="scale" className="lh-sheet mt-10 grid overflow-hidden sm:grid-cols-2">
          {departments.map((d, i) => (
            <li
              key={d.key}
              data-reveal="rise"
              style={{ "--i": i } as CSSProperties}
              className="flex min-w-0 items-baseline gap-4 border-b border-line px-5 py-3.5 sm:odd:border-e"
              /* NOTHING TRUNCATES: "Procurement & Subcontracting" clipped to
                 "Procurement & Sub…" at desktop width, and a register that
                 hides half a name is not a register. The row wraps instead,
                 the other language dropping under the reader's. */
            >
              <span className="lh-ref w-5 shrink-0 text-[11px] text-fg-dim" dir="ltr">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="font-medium text-fg">{d.name}</span>
                <span
                  lang={other}
                  dir={other === "ar" ? "rtl" : "ltr"}
                  className="font-display text-[13px] text-fg-dim"
                >
                  {theirs.get(d.key)}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <Link
          href={`/${locale}/platform`}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-iris underline-offset-4 transition-colors hover:underline"
        >
          {tr.departmentsCta}
          <span aria-hidden className="rtl:-scale-x-100">→</span>
        </Link>
      </SectionHead>
    </section>
  );
}

export function PricingTeaser({ locale }: { locale: string }) {
  const tr = homeCopy(locale);
  const hero = heroCopy(locale);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
      <div data-reveal="scale" onPointerMove={spotlight} className="lh-sheet lh-spot overflow-hidden">
        <div data-reveal="rule" style={{ "--d": "300ms" } as CSSProperties} className="lh-band" aria-hidden="true" />
        <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div>
            <h2 className="font-display text-[clamp(1.95rem,3.5vw,2.95rem)] leading-[1.06] font-semibold tracking-[-0.03em] text-balance text-fg rtl:leading-[1.3] rtl:tracking-normal">
              {tr.pricingTitle}
            </h2>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-fg-muted">{tr.pricingLead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={`/api/intent?locale=${locale}`} className="lh-btn">
                {hero.ctaPrimary}
              </Link>
              <Link href={`/${locale}/pricing`} className="lh-btn-quiet">
                {tr.pricingCta}
              </Link>
            </div>
          </div>

          {/* THE TWO FIGURES COME FROM THE REGISTER, so each names the module
              that backs it and the build fails if that module stops saying so.
              The free band and the paid floor are both read from the same PLANS
              table the app bills against — this page cannot quote a price the
              product does not charge. Set as the lines of a quotation, which is
              the document a buyer here compares prices on. */}
          <ul className="border-t border-line">
            {[claimText("free-tier", locale), claimText("paid-plans", locale)].map((line, i) => (
              <li key={line} data-reveal="rise" style={{ "--i": i + 2 } as CSSProperties} className="flex items-start gap-3 border-b border-line py-4 text-fg">
                <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 text-iris" fill="none" aria-hidden="true">
                  <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
