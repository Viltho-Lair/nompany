"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { miscDict } from "@/shared/studio/misc";
import { Icon } from "@/components/studio2/icons";
import { useReload } from "@/components/studio2/useReload";
import { daypartFor } from "@/shared/greeting";

/* THE BROADCAST BAND, across the top of the studio.
   ------------------------------------------------------------------
   ONE BOX, HOWEVER MANY MESSAGES. The header is a single row and the band is one
   item in it, so a second message cannot be a second band without the header
   growing every time somebody writes one. It cycles instead: five seconds each,
   a dot per message, and the dots are buttons so nobody has to wait for the one
   they want.

   DISMISSAL IS PER MESSAGE, AND THIS IS THE CORRECTION THAT MATTERS. It was
   keyed on the DAY and closed the whole band: close it once and nothing sent
   afterwards reached that reader until midnight, which is the opposite of
   broadcasting. The key is `<message id>:<sentAt>` now, so —

     · closing one message never hides another, then or later;
     · a message sent AFTER a reader closed something else still arrives;
     · re-sending a message stamps it afresh, and a fresh stamp is a key nobody
       has dismissed — which is how a correction reaches the people who closed
       the first version.

   IT KEEPS ASKING. A broadcast is somebody deciding to say something now, so a
   band that only looked once on mount would reach nobody already sitting in a
   studio — the common case, since this is a screen people leave open. It
   re-reads every minute and whenever the tab is looked at again. That is one
   small platform document and no tenant data; see the route.

   NOT INSTANT, and deliberately so: pushing would mean writing one event into
   every studio's stream on every send, a fan-out across the whole platform for a
   message that is not urgent. A minute is the same cadence the Pulse wall uses
   for its own platform figures.

   AND THE BAND CAN BE EMPTY. There is no built-in text behind an automated
   message any more — nothing is hardcoded anywhere — so no key, a failed call,
   or nothing generated yet for THIS part of the day all render nothing at all.
   That is deliberate: an empty header is a state somebody can see and fix, and
   words nobody chose are not.

   `localStorage` CAN THROW — a private window, blocked site data — so every read
   and write is guarded and a failure means "not dismissed", which shows the
   message. A message nobody can dismiss is a smaller fault than a message nobody
   can see. */

const KEY = (k) => `broadcast-dismissed:${k}`;
const ROTATE_MS = 5000;
const POLL_MS = 60000;

function storedDismissals(messages) {
  const out = [];
  try {
    for (const m of messages) if (localStorage.getItem(KEY(m.key)) === "1") out.push(m.key);
  } catch { /* a browser that cannot remember simply shows the message */ }
  return out;
}

export default function DailyGreeting({ slug }) {
  const tr = miscDict(useStudioLocale());
  const [messages, setMessages] = useState(null);   // null = not yet known
  const [dismissed, setDismissed] = useState(() => new Set());
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const load = useCallback(async () => {
    try {
      // THE READER'S OWN CLOCK DECIDES THE WORDS. Computed on every poll rather
      // than once on mount, so a tab open across noon or six picks up the next
      // part of the day within the minute — and so a platform whose tenants sit
      // in different timezones never greets anybody with the wrong hour.
      const daypart = daypartFor(new Date().getHours());
      const res = await fetch(`/api/studios/${slug}/greeting?daypart=${daypart}`, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json())?.band?.messages || [];
      setMessages(next);
      // MERGED, NEVER REPLACED: what this session dismissed stays dismissed even
      // if `localStorage` refused to record it, and a message arriving in a later
      // poll gets its own stored answer read for the first time here.
      setDismissed((prev) => new Set([...prev, ...storedDismissals(next)]));
    } catch { /* a failed poll leaves the band exactly as it was */ }
  }, [slug]);

  // THE FIRST READ GOES THROUGH THE SHARED HOOK, which is where this repository
  // keeps "fetch on mount" — the pattern React's linter flags and its own
  // documentation permits. Thirty-odd components share that one exemption rather
  // than each spending a warning against a shrink-only budget.
  useReload(load);

  useEffect(() => {
    const t = setInterval(load, POLL_MS);
    // A TAB LEFT OPEN OVERNIGHT is the case the interval alone handles badly —
    // browsers throttle timers in background tabs, so coming back to the tab
    // asks immediately rather than waiting out a stretched interval.
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  const visible = (messages || []).filter((m) => !dismissed.has(m.key));
  const count = visible.length;

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

  if (!count) return null;

  const at = Math.min(index, count - 1);
  const msg = visible[at];
  const ink = msg.css.ink;

  // CLOSES THIS MESSAGE, NOT THE BAND. The next one slides into its place; the
  // band goes when the last one is closed.
  function close() {
    setDismissed((prev) => new Set([...prev, msg.key]));
    setIndex((i) => (i >= count - 1 ? 0 : i));
    try { localStorage.setItem(KEY(msg.key), "1"); } catch { /* remembered for this session only */ }
  }

  const style = {
    "--band-bg": msg.css.background,
    "--band-border": msg.css.border,
    "--band-glow": msg.css.glow,
    // A CUSTOM FILL BRINGS ITS OWN INK — it is the same colour in both themes,
    // so the theme's text colour is wrong on it half the time. See inkFor.
    color: ink || undefined,
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
        <p className={`truncate text-sm font-600 ${ink ? "" : "text-slate-900 dark:text-white"}`}>{msg.greeting}</p>
        {msg.quote && (
          /* THE QUOTATION IS A <blockquote>, because it is one. It costs nothing
             and it is the difference between a screen reader announcing a quote
             and announcing a second sentence of the greeting. */
          <blockquote className={`mt-0.5 truncate text-xs ${ink ? "opacity-80" : "text-slate-600 dark:text-slate-300"}`}>
            “{msg.quote}”
            {msg.author && <cite className={`ms-1.5 not-italic ${ink ? "opacity-70" : "text-slate-400 dark:text-slate-500"}`}>— {msg.author}</cite>}
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
          {visible.map((m, i) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={m.greeting || m.quote}
              aria-current={i === at ? "true" : undefined}
              className={`h-1.5 w-1.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
                i === at
                  ? (ink ? "bg-current" : "bg-slate-700 dark:bg-white")
                  : (ink ? "bg-current opacity-40 hover:opacity-70" : "bg-slate-400/50 hover:bg-slate-500 dark:bg-white/30 dark:hover:bg-white/60")
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
        className={`-me-1 mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${ink ? "opacity-70 hover:bg-black/10 hover:opacity-100" : "text-slate-500 hover:bg-black/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"}`}
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  );
}
