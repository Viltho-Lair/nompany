"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { heroCopy } from "@/shared/marketing/hero";
import { tourCopy } from "@/shared/marketing/tour";
import { ScreenShot } from "@/components/landing/showcase/ScreenShot";
import { RoutingSlip } from "@/components/landing/showcase/RoutingSlip";
import { Unfold } from "@/components/landing/showcase/Unfold";
import { spotlight } from "@/components/landing/lib/spotlight";

// The load sequence: each piece of the letterhead lands a beat after the one
// before it, in reading order (globals.css, `data-enter`). CSS keyframes that
// start on FIRST PAINT, not on an observer: the hero is on screen before any
// script has loaded, and it must not sit empty waiting for one.
const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/* ==================================================================
   THE LETTERHEAD (27/09/2026) — the hero is the first sheet of the
   company's paperwork, not a headline floating on a glow.

   BOTH LANGUAGES ARE ON IT, the way a Gulf company's letterhead sets
   English and Arabic on one sheet. The reader's own headline is the H1;
   the other language's is a line in the masthead, marked with its own
   `lang` and `dir`, so a screen reader switches voice for it and a
   crawler knows what it is. It is the product's bilingual claim made
   before a word of it is read.

   THE LETTERHEAD ASSEMBLES ON LOAD — sheet, colour band, masthead, headline,
   slip, screen, each a beat behind the last — through `data-enter`, which
   hides nothing in the server's HTML (globals.css says how). motion/react's
   `initial` is still never used for an entrance here: it is written into the
   server-rendered style attribute, and the crawlers this site is written for
   do not run JavaScript. The routing slip stamps itself; the screen below
   unfolds with the scroll (showcase/Unfold); the sheet keeps a soft pool of
   stamp colour under the cursor.

   THE REAL SCREEN FOLLOWS AT FULL WIDTH, as the attachment behind the
   letter — side by side it was unreadable, which is why the previous
   hero stacked it too. Captioned as sample data under it.
================================================================== */

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 rtl:-scale-x-100" fill="none" aria-hidden="true">
      <path d="M3 8h9.5M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeroLetterhead({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const other = locale === "ar" ? "en" : "ar";
  const counterpart = heroCopy(other).h1;
  const tour = tourCopy(locale);

  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-24 sm:px-6 lg:pt-28">
      <div data-enter="scale" onPointerMove={spotlight} className="lh-sheet lh-spot overflow-hidden">
        <div data-enter="rule" style={at(250)} className="lh-band" aria-hidden="true" />

        {/* THE MASTHEAD: the offer on the reader's side, the other language on
            the far side — which is the right side in English and the left in
            Arabic, because the row follows the page's direction. */}
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-b border-line px-6 py-3.5 sm:px-10">
          <p data-enter="rise" style={at(380)} className="inline-flex items-center gap-2 text-[13px] text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {tr.badge}
          </p>
          <p
            lang={other}
            dir={other === "ar" ? "rtl" : "ltr"}
            data-reveal="rise"
            style={at(460)}
            className="font-display text-[13px] text-fg-dim"
          >
            {counterpart}
          </p>
        </div>

        <div className="grid gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
          <div className="flex flex-col">
            {/* ONE TEXT NODE. */}
            <h1 data-enter="rise" style={at(300)} className="font-display text-[clamp(2.55rem,5.3vw,4.4rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-fg rtl:leading-[1.22] rtl:tracking-normal">
              {tr.h1}
            </h1>
            <p data-enter="rise" style={at(440)} className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-fg-muted">{tr.lead}</p>

            <div data-enter="rise" style={at(560)} className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={`/api/intent?locale=${locale}`} className="lh-btn">
                {tr.ctaPrimary}
                <Arrow />
              </Link>
              {/* Scrolls to the tour of real screens, which is what it promises. */}
              <a href="#tour" className="lh-btn-quiet">
                {tr.ctaSecondary}
              </a>
            </div>
            <p data-enter="rise" style={at(640)} className="mt-4 text-[13px] text-fg-dim">{tr.footnote}</p>
          </div>

          <div data-enter="scale" style={at(520)}>
            <RoutingSlip locale={locale} />
          </div>
        </div>
      </div>

      <div data-enter="rise" style={at(700)} className="mt-5 sm:mt-6">
        <Unfold>
        <ScreenShot
          name="pipeline"
          locale={locale}
          path="/crm-sales-pipeline"
          alt={tour.heroAlt}
          priority
          sizes="(min-width: 1200px) 1100px, 100vw"
        />
        </Unfold>
        {/* SAID IN WORDS: the screen is real, the company in it is not. */}
        <p className="mt-3 text-center text-[11.5px] text-fg-dim">{tour.sampleNote}</p>
      </div>
    </section>
  );
}
