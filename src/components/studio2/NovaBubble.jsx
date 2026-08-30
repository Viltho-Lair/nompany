"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { bubbleDict, insightCopy, rankForView } from "@/shared/studio/insights";
import { fmtMoney } from "@/lib/format";

// NOVA SPEAKS FIRST — a speech bubble beside the launcher, every two minutes.
//
// BONDED TO THE LAUNCHER, mechanically rather than by convention: this renders
// from inside NovaLauncher, AFTER its `enabled` guard, so there is no path on
// which the head shows and the bubble does not, and none on which the bubble
// outlives it. It also stands down while the chat panel is open, because the
// panel owns that corner.
//
// EVERY OFFSET IS LOGICAL. The launcher sits at `end-5` (or `end-24` when the
// support chat shares the corner) and the bubble is measured from the same
// edge, so an Arabic studio mirrors the whole arrangement — bubble, tail and
// all — with no second rule. `left`/`right` appear nowhere in this file, which
// is the only reason that is true.
//
// WHAT IT SAYS IS REAL. The sentences are built from the studio's own rows
// (modules/main/insights.ts) and rendered in the reader's language here
// (shared/studio/insights.ts). Nothing in this file invents a figure, and a
// kind this build does not recognise is SKIPPED rather than drawn half-empty.

// Timings. The first bubble waits long enough not to ambush a page load, then
// it is every two minutes as asked.
const FIRST_DELAY_MS = 15_000;
const EVERY_MS = 120_000;
const VISIBLE_MS = 15_000;
const SNOOZE_MS = 600_000;      // what the × buys: ten quiet minutes

// ONE READ SERVES A SESSION OF NAVIGATION. Every studio screen is its own server
// render, so this component remounts on each page — a fetch per mount would be
// thirteen collections per click. The list is held at module scope instead
// (which survives a remount inside one tab) and re-ranked for the new screen,
// which is pure. Five minutes is short enough that a task assigned to you shows
// up on the next appearance but one.
const CACHE_MS = 300_000;
let cache = null;   // { slug, at, insights }

const toneClass = {
  urgent: "bg-rose-500",
  warn: "bg-amber-500",
  info: "bg-brand-500",
};

export default function NovaBubble({ slug, view = "", besideChat = false, suspended = false, onAsk }) {
  const locale = useStudioLocale();
  const tr = bubbleDict(locale);
  const [insights, setInsights] = useState(() => (cache && cache.slug === slug ? cache.insights : []));
  const [shown, setShown] = useState(null);   // the insight currently on screen
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const cursor = useRef(0);
  const seen = useRef(new Set());

  // ---- the read -----------------------------------------------------------
  useEffect(() => {
    let live = true;
    const fresh = () => cache && cache.slug === slug && Date.now() - cache.at < CACHE_MS;
    const load = () => {
      if (fresh()) { setInsights(cache.insights); return; }
      fetch(`/api/studios/${slug}/nova/insights`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!live || !d) return;
          const rows = Array.isArray(d.insights) ? d.insights : [];
          cache = { slug, at: Date.now(), insights: rows };
          setInsights(rows);
        })
        // A refusal is silence, not an error message. The bubble is an
        // unprompted nicety; a studio without Nova in its package answers 403
        // here and simply never speaks.
        .catch(() => {});
    };
    load();
    const t = setInterval(load, CACHE_MS);
    return () => { live = false; clearInterval(t); };
  }, [slug]);

  // WHAT IS WORTH SAYING ON THIS SCREEN, re-ranked on every navigation without
  // another read. A kind this build cannot render is dropped here rather than at
  // draw time, so it never costs a turn of the rotation.
  const queue = useMemo(
    () => rankForView(insights, view).filter((i) => insightCopy(i.kind, i.vars, locale, fmtMoney)),
    [insights, view, locale],
  );

  // A new ranking is a new rotation: whatever the screen is about should be the
  // first thing said on it, not the fourth.
  useEffect(() => { cursor.current = 0; }, [view]);

  // ---- the rhythm ---------------------------------------------------------
  const speak = useCallback(() => {
    if (!queue.length) return;
    // Walk the queue rather than repeating the top item, and prefer something
    // not yet said this session — otherwise a studio with one loud overdue
    // invoice would say only that, forever.
    for (let step = 0; step < queue.length; step += 1) {
      const next = queue[(cursor.current + step) % queue.length];
      if (!seen.current.has(next.id)) {
        cursor.current = (cursor.current + step + 1) % queue.length;
        seen.current.add(next.id);
        setShown(next);
        return;
      }
    }
    // Everything has been said once. Start again from the top.
    seen.current.clear();
    setShown(queue[0]);
    cursor.current = 1 % queue.length;
  }, [queue]);

  useEffect(() => {
    if (suspended || !queue.length) return undefined;
    let hide;
    const fire = () => {
      if (Date.now() < snoozedUntil) return;
      speak();
      hide = setTimeout(() => setShown(null), VISIBLE_MS);
    };
    const first = setTimeout(fire, FIRST_DELAY_MS);
    const every = setInterval(fire, EVERY_MS);
    // CLEARING THE SENTENCE BELONGS IN THE CLEANUP, not in the effect body. The
    // panel opening, the queue emptying and a navigation all tear this down, and
    // every one of them must also take whatever is on screen with it — otherwise
    // closing the panel flashes the sentence from before it was opened, minutes
    // stale, before the next one is due.
    return () => { clearTimeout(first); clearInterval(every); clearTimeout(hide); setShown(null); };
  }, [suspended, queue.length, snoozedUntil, speak]);

  // Suspended is checked HERE as well as in the effect: the effect's cleanup
  // runs after this render, so for one frame `shown` still holds a sentence the
  // panel is now sitting on top of.
  if (suspended || !shown) return null;
  const copy = insightCopy(shown.kind, shown.vars, locale, fmtMoney);
  if (!copy) return null;

  const dismiss = () => { setShown(null); setSnoozedUntil(Date.now() + SNOOZE_MS); };
  const ask = () => {
    setShown(null);
    onAsk?.(`${copy.text}\n\n${tr.whatShouldIDo}`);
  };

  return (
    // NOT A LIVE REGION, and that is the considered choice rather than an
    // oversight. `role="status"` would interrupt a screen-reader user every two
    // minutes with something they did not ask for — and a polite region
    // inserted into the DOM in the same commit as its text is the case several
    // screen readers miss anyway, so it would be an interruption that sometimes
    // does not arrive. It is a labelled landmark instead: reachable on demand,
    // and its two controls are in the tab order.
    <aside
      aria-label={tr.fromNova}
      className={`fixed z-40 w-[min(20rem,calc(100vw-2.5rem))] print:hidden
        bottom-[5.75rem] end-5
        sm:bottom-6 ${besideChat ? "sm:end-[10.75rem]" : "sm:end-24"}
        motion-safe:animate-[nova-bubble-in_320ms_cubic-bezier(0.16,1,0.3,1)]`}
    >
      <div className="relative rounded-2xl rounded-ee-sm bg-[var(--geex-surface)] p-3.5 shadow-geex ring-1 ring-slate-900/5 dark:ring-white/10">
        {/* THE TAIL, a rotated square rather than an SVG triangle so it inherits
            the surface colour and the ring in both themes without a second
            declaration. It points DOWN at the launcher on a phone (where the
            bubble sits above it) and sideways at the head on anything wider —
            and `end` is what makes both mirror under RTL.

            THE PHONE OFFSET IS ARITHMETIC, not a guess, and it depends on where
            the launcher is: the head's centre sits 52px from the viewport's end
            edge (20px inset + half of 64px), or 128px when the support chat has
            pushed it along. The bubble's own end edge is at 20px and the tail is
            12px wide, so the offset is centre − 20 − 6. Get this wrong and the
            tail points at empty space beside the button.

            On sm and up the bubble is BESIDE the head, so the tail sits at 24px
            up from the bubble's bottom edge, which is 24px off the floor — 48px,
            the head's own centre line. */}
        <span
          aria-hidden
          className={`absolute h-3 w-3 rotate-45 bg-[var(--geex-surface)] -bottom-1 sm:bottom-6 sm:-end-1 ${
            besideChat ? "end-[6.375rem]" : "end-[1.625rem]"}`}
        />

        <div className="flex items-start gap-2">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneClass[shown.tone] || toneClass.info}`} />
          <div className="min-w-0 flex-1">
            {copy.label && (
              <p className="text-[10px] font-600 uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {copy.label}
              </p>
            )}
            <p className="mt-0.5 text-[13px] leading-snug text-slate-800 dark:text-slate-100">{copy.text}</p>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={ask}
                className="text-xs font-600 text-brand-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-brand-400"
              >
                {tr.askNova}
              </button>
              {shown.href && (
                <Link
                  href={`/${slug}/${shown.href}`}
                  onClick={() => setShown(null)}
                  className="text-xs font-500 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  {tr.open}
                </Link>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={tr.dismiss}
            className="-me-1 -mt-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:hover:bg-white/5"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
