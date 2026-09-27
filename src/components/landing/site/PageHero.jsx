"use client";
import { useReadyReveal } from "./primitives";

/**
 * THE OPENING OF AN INNER PAGE — its title and the one sentence under it, clear
 * of the floating header. It arrives out of focus and settles as soon as the
 * page is ready (on every page but the home page, that is at once), with a
 * faint wash of the accent behind it so the page does not open onto flat black.
 *
 * The H1 is the copy module's string, rendered as one text node: a
 * tag-stripping extractor reads per-word spans as separate tokens. Whatever the
 * page wants beneath the lead (a screen, a row of links) is `children`.
 *
 * Used by every inner page of the site (platform, security, about, the blog).
 */
export function PageHero({ title, lead, children }) {
  const h = useReadyReveal(0);
  const l = useReadyReveal(0.08);
  return (
    <section className="relative isolate px-6 pb-16 pt-36 md:px-10 md:pb-24 md:pt-44">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
        style={{ background: "radial-gradient(60% 70% at 50% 0%, rgba(139,124,255,0.16), rgba(139,124,255,0) 70%)" }}
      />
      <div className="mx-auto max-w-[1280px]">
        <h1
          {...h}
          className="max-w-[18ch] text-balance text-[2.6rem] font-medium leading-[1.05] tracking-[-0.035em] md:text-[4rem] rtl:leading-[1.3] rtl:tracking-normal"
        >
          {title}
        </h1>
        <p {...l} className="mt-6 max-w-[56ch] text-[17px] leading-relaxed text-[#9a9aa8] md:text-[19px]">
          {lead}
        </p>
        {children}
      </div>
    </section>
  );
}
