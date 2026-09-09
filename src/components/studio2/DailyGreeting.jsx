"use client";

import { useEffect, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { miscDict } from "@/shared/studio/misc";
import { Icon } from "@/components/studio2/icons";

/* THE DAILY BAND, across the top of the studio.
   ------------------------------------------------------------------
   ONE BOX, HOWEVER MANY MESSAGES. The header is a single row and the band is one
   item in it, so a second message cannot be a second band without the header
   growing every time somebody writes one. It cycles instead: five seconds each,
   a dot per message, and the dots are buttons so nobody has to wait for the one
   they want.

   DISMISSAL IS THE BROWSER'S, NOT THE DATABASE'S, and it closes the BAND rather
   than a message — "not now" is about the strip across the top, not about which
   sentence happened to be showing when it was clicked. It lasts the rest of the
   day, and "the rest of the day" is decided by the SERVER's date, which arrives
   with the messages: the key is `greeting-dismissed:<that day>`, so tomorrow's
   band has a key nobody has written yet and appears on its own. Nothing expires,
   nothing is swept, and a stale key from last March costs one string in one
   browser.

   Storing it server-side would be a row per member per day in a shared table —
   real writes, real cascade, real sweeping — to remember something that is true
   for one person on one device until midnight.

   IT RENDERS NOTHING UNTIL IT HAS BOTH ANSWERS, the band and whether this browser
   has already dismissed today's. Showing it and then removing it a beat later is
   worse than a beat of nothing: it moves the header twice, and the second move
   looks like a bug rather than a dismissal.

   `localStorage` CAN THROW — a private window, blocked site data — so every read
   and write is guarded and a failure means "not dismissed", which shows the
   band. A message nobody can dismiss is a smaller fault than a message nobody
   can see. */

const KEY = (day) => `greeting-dismissed:${day}`;
const ROTATE_MS = 5000;

export default function DailyGreeting({ slug }) {
  const tr = miscDict(useStudioLocale());
  const [band, setBand] = useState(null);
  const [dismissed, setDismissed] = useState(null);   // null = not yet known
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dayRef = useRef("");

  useEffect(() => {
    let live = true;
    fetch(`/api/studios/${slug}/greeting`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const next = d?.band;
        if (!live || !next?.messages?.length) return;
        setBand(next);
        dayRef.current = next.day;
        let hidden = false;
        try { hidden = localStorage.getItem(KEY(next.day)) === "1"; } catch { hidden = false; }
        setDismissed(hidden);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [slug]);

  const messages = band?.messages || [];
  const count = messages.length;

  /* THE ROTATION STOPS FOR TWO PEOPLE: anyone hovering or tabbing into the band,
     and anyone whose system asks for reduced motion. The second is not
     decoration — a strip of text that rewrites itself every five seconds is
     exactly what that setting exists to stop, and the dots still work, so
     turning the timer off removes nothing but the surprise. */
  useEffect(() => {
    if (count < 2 || paused) return undefined;
    let reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { reduced = false; }
    if (reduced) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    // KEYED ON `index` AS WELL, so choosing a dot restarts the five seconds
    // rather than leaving a part-spent timer to move it again immediately.
    return () => clearTimeout(t);
  }, [count, paused, index]);

  function close() {
    setDismissed(true);
    try { localStorage.setItem(KEY(dayRef.current), "1"); } catch { /* a browser that cannot remember simply asks again tomorrow */ }
  }

  if (!count || dismissed !== false) return null;

  const msg = messages[Math.min(index, count - 1)];
  const style = {
    "--band-bg": msg.css.background,
    "--band-border": msg.css.border,
    "--band-glow": msg.css.glow,
  };

  return (
    <div
      className="greeting-band order-last flex min-w-0 flex-1 items-start gap-3 px-4 py-2.5 lg:order-none lg:mx-6"
      style={style}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-600 text-slate-900 dark:text-white">{msg.greeting}</p>
        {msg.quote && (
          /* THE QUOTATION IS A <blockquote>, because it is one. It costs nothing
             and it is the difference between a screen reader announcing a quote
             and announcing a second sentence of the greeting. */
          <blockquote className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
            “{msg.quote}”
            {msg.author && <cite className="ms-1.5 not-italic text-slate-400 dark:text-slate-500">— {msg.author}</cite>}
          </blockquote>
        )}
      </div>

      {count > 1 && (
        /* THE DOTS ARE LABELLED WITH THE MESSAGE THEY OPEN rather than with its
           number: "Good morning. Here is your studio." tells somebody on a screen
           reader what they are about to move to, and "message 2 of 3" does not.
           It also costs no dictionary entry, which would otherwise have to exist
           in both languages to say something the message already says. */
        <div className="mt-1 flex shrink-0 items-center gap-1.5">
          {messages.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={m.greeting || m.quote}
              aria-current={i === index ? "true" : undefined}
              className={`h-1.5 w-1.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
                i === index
                  ? "bg-slate-700 dark:bg-white"
                  : "bg-slate-400/50 hover:bg-slate-500 dark:bg-white/30 dark:hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={close}
        aria-label={tr.close}
        title={tr.close}
        className="-me-1 mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  );
}
