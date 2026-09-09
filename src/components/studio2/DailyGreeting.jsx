"use client";

import { useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { miscDict } from "@/shared/studio/misc";
import { Icon } from "@/components/studio2/icons";

/* THE DAILY GREETING, across the top of the studio.
   ------------------------------------------------------------------
   DISMISSAL IS THE BROWSER'S, NOT THE DATABASE'S. Closing it hides it for the
   rest of the day, and "the rest of the day" is decided by the SERVER's date,
   which arrives with the message: the key is `greeting-dismissed:<that day>`,
   so tomorrow's message has a key nobody has written yet and appears on its
   own. Nothing expires, nothing is swept, and a stale key from last March costs
   one string in one browser.

   Storing it server-side would be a row per member per day in a shared table —
   real writes, real cascade, real sweeping — to remember something that is true
   for one person on one device until midnight.

   IT RENDERS NOTHING UNTIL IT HAS BOTH ANSWERS, the message and whether this
   browser has already dismissed today's. Showing the band and then removing it
   a beat later is worse than a beat of nothing: it moves the header twice, and
   the second move looks like a bug rather than a dismissal.

   `localStorage` CAN THROW — a private window, blocked site data — so every
   read and write is guarded and a failure means "not dismissed", which shows
   the message. A greeting nobody can dismiss is a smaller fault than a greeting
   nobody can see. */

const KEY = (day) => `greeting-dismissed:${day}`;

export default function DailyGreeting({ slug }) {
  const tr = miscDict(useStudioLocale());
  const [msg, setMsg] = useState(null);
  const [dismissed, setDismissed] = useState(null);   // null = not yet known

  useEffect(() => {
    let live = true;
    fetch(`/api/studios/${slug}/greeting`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live || !d?.greeting) return;
        setMsg(d.greeting);
        let hidden = false;
        try { hidden = localStorage.getItem(KEY(d.greeting.day)) === "1"; } catch { hidden = false; }
        setDismissed(hidden);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [slug]);

  function close() {
    setDismissed(true);
    try { localStorage.setItem(KEY(msg.day), "1"); } catch { /* a session that cannot remember simply asks again tomorrow */ }
  }

  if (!msg || dismissed !== false) return null;
  if (!msg.greeting && !msg.quote) return null;   // a custom message left blank

  return (
    <div className="greeting-band order-last flex min-w-0 flex-1 items-start gap-3 px-4 py-2.5 lg:order-none lg:mx-6">
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
