"use client";

import { useCallback, useEffect, useState } from "react";
import { summaryDict } from "@/shared/studio/summary";

// A SECTION'S REGISTERS, ON THE SECTION'S OWN PAGE.
//
// FIVE SECTIONS SHARE THIS ONE COMPONENT — Manufacturing, Assets, Quality &
// HSE, Field Operations, Logistics — because all five are sections whose whole
// content is engine registers. Five screens would be five places to forget a
// register; this asks one route for whatever the section holds and draws what
// comes back.
//
// IT COMPUTES NOTHING. Every figure is the server's (`platform/engine/summary`,
// pure and asserted by tests/engine-summary.mjs), including `asOf` — the screen
// never reads its own clock, so a figure and the date it was measured against
// cannot disagree. The same rule the tender register and the operations week
// window follow.
export default function StudioSectionSummary({ slug, sectionKey, locale = "en" }) {
  const tr = summaryDict(locale);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/studios/${slug}/records/summary?section=${encodeURIComponent(sectionKey)}`,
      { cache: "no-store" },
    );
    if (!res.ok) { setState("failed"); return; }
    setData(await res.json());
    setState("ready");
  }, [slug, sectionKey]);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") {
    return <div className="mt-5 h-24 rounded-xl skel" aria-busy="true" />;
  }
  // A SECTION WITH NO REGISTERS RENDERS NOTHING AT ALL rather than an empty
  // panel. The dashboard already shows the section's name and its sub-section
  // cards; a box saying "0 records" under them is noise on every section that
  // has not been given a register yet.
  if (state === "failed" || !data?.registers?.length) return null;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.heading}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {tr.asOf(data.asOf)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.registers.map((r) => (
          <div key={r.typeKey}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/15 dark:bg-[#191921]">
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate font-display text-sm font-700 text-slate-900 dark:text-white">{r.label}</p>
              <span className="num shrink-0 text-sm text-slate-500 dark:text-slate-400">{r.total}</span>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {tr.openOf(r.open, r.total)}
              {r.overdue > 0 && (
                <>
                  {/* A SEPARATOR RATHER THAN A MARGIN. `ms-2` looks right and
                      reads as "3 open of 3 2 overdue" to a screen reader and to
                      anything else that takes the text without the CSS — two
                      numbers run together is the one thing this line must not
                      produce. The middot is what the rest of the studio uses. */}
                  <span aria-hidden="true"> · </span>
                  <span className="text-rose-600 dark:text-rose-400">{tr.overdue(r.overdue)}</span>
                </>
              )}
            </p>

            {/* EVERY DECLARED STATUS, INCLUDING THE EMPTY ONES, in the type's
                own order. A funnel that hides its empty rungs cannot show that
                nothing has reached the last one — which is what it is read for.
                Statuses are the STUDIO'S words (a type's own declaration) and
                are therefore never translated, the rule section names, client
                names and service actions all follow. */}
            <ul className="mt-3 space-y-1">
              {r.byStatus.map((b) => (
                <li key={b.status} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className={`min-w-0 truncate ${b.count ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
                    {b.status}
                  </span>
                  <span className={`num shrink-0 ${b.count ? "text-slate-900 dark:text-white" : "text-slate-300 dark:text-slate-600"}`}>
                    {b.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* WHAT IS ACTUALLY LATE, worst first and across every register — the one
          thing a person opens a department page to find out. Absent entirely
          when nothing is late, rather than an empty list with a cheerful
          heading: a panel that is usually empty trains people to skip it. */}
      {data.attention.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/30 dark:bg-rose-500/5">
          <h4 className="font-display text-xs font-700 text-rose-700 dark:text-rose-300">
            {tr.attention(data.totalOverdue)}
          </h4>
          <ul className="mt-2 space-y-1">
            {data.attention.map((a) => (
              <li key={`${a.typeKey}:${a.id}`} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                <span className="font-mono text-slate-700 dark:text-slate-200">{a.reference || a.id}</span>
                <span className="text-slate-500 dark:text-slate-400">{a.status}</span>
                {/* The FIELD's own label, so a person is told which date is
                    past — "Action due" and "Valid to" send you to different
                    places, and "overdue" alone sends you to neither. */}
                <span className="ms-auto text-slate-500 dark:text-slate-400">{a.label}</span>
                <span className="num text-rose-700 dark:text-rose-300">{tr.daysLate(a.daysLate)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
