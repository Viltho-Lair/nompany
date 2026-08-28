"use client";

import Link from "next/link";
import { rememberLocale } from "@/lib/langCookie";

// Hover-/focus-expandable language control. Collapsed it shows a globe icon +
// the current language's short code; on hover (or keyboard focus) a small
// dropdown reveals every language — mirroring the ThemeToggle interaction.
//
// Each option is either a Link (main site: navigating swaps the locale) or a
// button (Studio: a client-side dir/lang switch), decided by whether `href` is
// present.
//
// THE TRIGGER HAS A DEFAULT, and the default is the product's language button:
// the pill the site header and the account hub both drew, written out twice
// there before this. A caller may still pass `triggerClass` where the chrome
// genuinely differs — the studio bar sizes it to a 36px row, the questionnaire
// paints it in the landing's own tokens — but a caller that says nothing now
// gets the language button rather than an unstyled one. The landing's TopNav
// said nothing, and its control rendered as a 22px-wide column with the globe,
// the code and the chevron stacked on top of each other: an omission neither
// `tsc` nor `next build` can see, because "" is a valid class.
//
// It inherits `currentColor` for its border and its text, so it takes the
// colour of whatever bar it sits in without knowing which surface that is.
//
// EVERY SELECTION IS REMEMBERED, whichever form it takes. The public site's
// language lives in the address and does not need a cookie to work — but the
// studio's cannot (its address is the tenant's slug), and the two are the same
// choice made by the same person. Writing it here means picking Arabic on the
// marketing site is still Arabic when you walk into your studio, without every
// caller remembering to say so.
const TRIGGER =
  "inline-flex items-center gap-1.5 rounded-full border border-current/25 px-3 py-1.5 font-display text-xs font-600 uppercase tracking-[0.12em] transition-colors hover:border-current";

function GlobeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
    </svg>
  );
}

export default function LangMenu({
  current,
  options,
  label = "Language",
  triggerClass = TRIGGER,
  align = "end", // "end" | "start" — which edge the dropdown aligns to
  direction = "down", // "down" | "up" — which way the dropdown opens
}) {
  const cur = options.find((o) => o.code === current) || options[0];
  const choose = (o) => { rememberLocale(o.code); o.onSelect?.(); };
  const panelPos =
    direction === "up"
      ? "bottom-full pb-2 translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0"
      : "top-full pt-2 -translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0";
  const edge = align === "start" ? "start-0" : "end-0";

  return (
    <div role="group" aria-label={label} className="group relative inline-flex">
      <button type="button" aria-haspopup="menu" className={triggerClass}>
        <GlobeIcon className="h-4 w-4 shrink-0" />
        <span>{cur?.short || cur?.label}</span>
        <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 opacity-60 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className={`invisible absolute z-50 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${edge} ${panelPos}`}
      >
        <div className="min-w-[150px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#20202c]">
          {options.map((o) => {
            const active = o.code === current;
            const cls = `flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm font-600 normal-case tracking-normal transition-colors ${
              active
                ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`;
            const inner = (
              <>
                <span lang={o.code}>{o.label}</span>
                {active && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </>
            );
            return o.href ? (
              <Link key={o.code} href={o.href} onClick={() => choose(o)} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={o.code} type="button" onClick={() => choose(o)} className={cls}>
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
