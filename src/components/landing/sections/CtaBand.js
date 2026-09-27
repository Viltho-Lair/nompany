"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLandingLocale } from "@/components/landing/locale";
import { chromeCopy } from "@/shared/marketing/chrome";
import { homeCopy } from "@/shared/marketing/home";
import { spotlight } from "../lib/spotlight";

/* THE CLOSE: the page's one field of solid stamp-ink violet (27/09/2026).
   Everything above is paper with a little ink on it; the last thing a visitor
   sees before the footer is the ink itself, and the company's seal pressed
   into it. THE COLOUR IS FIXED, NOT THE THEME'S `iris`: dark mode lightens
   iris so it reads on a dark ground, and white type on that lighter violet
   falls under 3:1. A field this size is one colour in both themes.

   The conic sheen and the glass veil that were here went with the old world;
   so did GradientRule, the divider between sections — a ruled line is now
   part of how every section opens (SectionHead). */
export function CtaBand() {
  const locale = useLandingLocale();
  const tr = chromeCopy(locale);
  // THE COPY MOVED, THE SESSION LOGIC DID NOT. What this band decides — start,
  // create a studio, or go straight back into the one you already own — is
  // genuinely useful and stays. What it SAID was invented: "Replace nine
  // systems with one operating layer", "most teams are live in under six
  // weeks", and a footnote promising an "average implementation: 38 days" with
  // a "dedicated migration engineer", for a product that has never been
  // implemented for anyone. There is no average of nought deployments.
  const home = homeCopy(locale);
  // The primary action follows where the visitor actually is: a stranger is
  // asked to start, someone signed in without a studio is asked to create one,
  // and someone who already has one is simply let back into it.
  const [session, setSession] = useState(null); // null = still unknown
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await fetch("/api/identity/me", { cache: "no-store" });
        if (!me.ok) { if (alive) setSession({ signedIn: false }); return; }
        const st = await fetch("/api/studios", { cache: "no-store" });
        const studios = st.ok ? await st.json() : { owned: [] };
        // The band offers ONE door, so it takes the first owned studio —
        // which studiosForUser has already sorted most-opened first, so it
        // is the one this person actually works in rather than whichever
        // the registry happened to hold first.
        if (alive) setSession({ signedIn: true, studio: studios.owned?.[0] || null });
      } catch {
        if (alive) setSession({ signedIn: false }); // resolve to guest, never hang
      }
    })();
    return () => { alive = false; };
  }, []);

  const cta = !session || !session.signedIn
    ? { label: tr.startFreeNow, href: `/api/intent?locale=${locale}` }
    : session.studio
      ? { label: tr.goStudio, href: `/${session.studio.slug}` }
      : { label: tr.createStudio, href: `/${locale}/account` };

  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">
      <div
        data-reveal="scale"
        onPointerMove={spotlight}
        style={{ "--spot": "rgb(255 255 255 / 0.13)" }}
        className="lh-spot relative isolate overflow-hidden rounded-[18px] bg-[#4a33d6] px-7 py-16 text-white sm:px-14 sm:py-20"
      >
        <div data-reveal="rule" style={{ "--d": "300ms" }} className="lh-band absolute inset-x-0 top-0" aria-hidden="true" />

        {/* THE SEAL. The wordmark in a double ring, the way a company stamp
            carries its name — decoration, so it is hidden from assistive tech
            and sits behind the words at a strength that cannot compete. */}
        <div
          aria-hidden="true"
          className="lh-seal pointer-events-none absolute -end-16 -bottom-24 -z-10 grid h-80 w-80 rotate-[-14deg] place-items-center rounded-full border-[3px] border-white/15 sm:-end-8 sm:-bottom-16"
          style={{ boxShadow: "inset 0 0 0 10px #4a33d6, inset 0 0 0 13px rgb(255 255 255 / 0.15)" }}
        >
          <span className="font-display text-5xl font-semibold tracking-tight text-white/15" dir="ltr">nompany</span>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_auto] lg:items-end">
          <div>
            <h2 data-reveal="rise" style={{ "--d": "200ms" }} className="max-w-2xl font-display text-[clamp(2.1rem,4.4vw,3.6rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance text-white rtl:leading-[1.25] rtl:tracking-normal">
              {home.closingTitle}
            </h2>
            <p data-reveal="rise" style={{ "--d": "320ms" }} className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-white/80">{home.closingLead}</p>
          </div>
          <div data-reveal="rise" style={{ "--d": "440ms" }} className="flex flex-wrap items-center gap-3">
            {/* A PLAIN ANCHOR: the destination is often a studio — another
                surface with its own chrome — so this was a full navigation
                before (window.location.assign) and stays one. */}
            <a
              href={cta.href}
              className="inline-flex items-center rounded-[9px] bg-white px-6 py-3.5 text-[0.9375rem] font-medium text-[#2f1fa3] shadow-[0_10px_24px_-12px_rgb(0_0_0/0.5)] transition-transform hover:-translate-y-px active:translate-y-px"
            >
              {cta.label}
            </a>
            <Link
              href={`/${locale}/pricing`}
              className="inline-flex items-center rounded-[9px] border border-white/35 px-6 py-3.5 text-[0.9375rem] font-medium text-white transition-colors hover:border-white/70 hover:bg-white/10"
            >
              {tr.seePricing}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
