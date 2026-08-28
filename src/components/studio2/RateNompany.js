"use client";

import { useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { miscDict } from "@/shared/studio/misc";
import { Icon } from "@/components/studio2/icons";

// "How are we doing?", asked once, fifteen days in.
//
// It sits at the TOP MIDDLE of the studio and nowhere else: a studio is where
// somebody is actually using the product, so it is the only place the question
// means anything. It is small and dismissible because it interrupts work that
// the person came here to do.
//
// Whether to show it is decided by the SERVER — the browser only asks. That is
// what makes a rating unique per user: nobody can summon the prompt again once
// they have answered, and a stale tab cannot re-ask.
export default function RateNompany() {
  const tr = miscDict(useStudioLocale());
  const [show, setShow] = useState(false);
  const [hover, setHover] = useState(0);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/me/rating", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d?.prompt) setShow(true); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  if (!show) return null;

  const send = async (payload) => {
    // Closed immediately on answering rather than after the round trip: the
    // person has said their piece, and making them watch a spinner for it would
    // be a worse interruption than the question was.
    try { await fetch("/api/me/rating", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
    catch { /* a lost rating is not worth an error message */ }
  };

  const rate = (n) => {
    setStars(n);
    setDone(true);
    send({ stars: n });
    setTimeout(() => setShow(false), 1400);
  };

  const dismiss = () => { setShow(false); send({ decline: true }); };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex justify-center px-4">
      <div role="dialog" aria-label={tr.rateNompany}
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-200 bg-[var(--geex-surface)] px-4 py-2.5 shadow-geex dark:border-white/10">
        {done ? (
          <p className="text-sm font-600 text-slate-700 dark:text-slate-200">{tr.thankNoted}</p>
        ) : (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-200">How would you rate nompany?</p>
            <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onMouseEnter={() => setHover(n)} onClick={() => rate(n)}
                  className="p-0.5 transition-transform hover:scale-110">
                  <Icon name="star"
                    className={`h-5 w-5 ${(hover || stars) >= n ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
                </button>
              ))}
            </div>
            <button type="button" onClick={dismiss} aria-label={tr.notNow}
              className="ms-1 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/10">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
