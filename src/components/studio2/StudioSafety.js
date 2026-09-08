"use client";

import { useCallback, useState } from "react";
import { safetyDict } from "@/shared/studio/safety";
import { useReload } from "@/components/studio2/useReload";

// SAFETY PERFORMANCE, on the Quality & HSE page.
//
// QUALITY & HSE ONLY, and that is why it is mounted by key rather than joining
// the generic register panel every engine section gets. LTIFR is not a fact
// about registers in general — it is a fact about injuries and hours worked,
// and putting it under Logistics because Logistics also has registers would be
// a number in a place it means nothing.
//
// IT COMPUTES NOTHING. Every figure is `modules/quality/safety`, pure and
// asserted by tests/safety-model.mjs, and the window comes back in the response
// so the screen never reads its own clock.
export default function StudioSafety({ slug, locale = "en" }) {
  const tr = safetyDict(locale);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/quality/safety`, { cache: "no-store" });
    if (!res.ok) { setState("hidden"); return; }
    setData(await res.json());
    setState("ready");
  }, [slug]);

  useReload(load);

  // A READER WITHOUT THE INCIDENT REGISTER SEES NO PANEL AT ALL, rather than an
  // empty one saying they may not look. The route refuses them; a box announcing
  // the refusal would tell them a register exists that they cannot open, which
  // is the one thing the gate is for.
  if (state === "loading") return <div className="mt-6 h-20 rounded-xl skel" aria-busy="true" />;
  if (state === "hidden" || !data) return null;

  const rate = (v) => (v === null || v === undefined ? "—" : v.toFixed(1));

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/15 dark:bg-[#191921]">
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.heading}</h3>

      <div className="mt-3 grid gap-4 sm:grid-cols-4">
        <Figure label={tr.ltifr} value={rate(data.ltifr)} />
        <Figure label={tr.trifr} value={rate(data.trifr)} />
        <Figure label={tr.daysLost} value={String(data.daysLost)} />
        <Figure label={tr.incidents} value={String(data.incidents)} />
      </div>

      {/* WHY THERE IS NO RATE, in a sentence rather than a dash. Three states
          that send somebody to three different places: ask for the Projects
          right, book some hours, or — the good one — nothing has happened yet.
          A dash alone reads as a bug in all three. */}
      {data.reason && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{tr.reason[data.reason]}</p>
      )}

      {data.byKind.length > 0 && (
        <ul className="mt-4 space-y-1">
          {data.byKind.map((k) => (
            <li key={k.kind} className="flex items-baseline justify-between gap-2 text-xs">
              {/* The KIND is the studio's own declared option, so it is shown
                  verbatim — the rule every register's statuses follow. */}
              <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{k.kind}</span>
              <span className="num shrink-0 text-slate-900 dark:text-white">{k.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Figure({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="num mt-0.5 font-display text-xl font-700 text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
