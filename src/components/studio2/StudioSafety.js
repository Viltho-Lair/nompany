"use client";

import { useCallback, useState } from "react";
import { safetyDict } from "@/shared/studio/safety";
import { engineWords } from "@/shared/studio/engineTypes";
import { useReload } from "@/components/studio2/useReload";
import { useStudioLocale } from "@/components/studio2/locale";

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
//
// `initial` is the /quality/safety body the studio page answered in its own
// render, so the panel lands with the page rather than after it; absent —
// including a refusal, which must still draw nothing — it fetches as before.
//
// THE LANGUAGE IS THE STUDIO SHELL'S (useStudioLocale), never a prop: this took
// `locale = "en"`, which is how the panel would have stayed English for any
// caller that forgot to pass one.
export default function StudioSafety({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = safetyDict(locale);
  // THE KINDS ARE THE BUILT-IN INCIDENT REGISTER'S OPTIONS, so they translate
  // on display exactly as the register itself shows them (engineWords, keyed by
  // the stored word). A kind a studio added itself has no translation and is
  // shown as typed — typed data is data.
  const kindWord = engineWords({ key: "incident", origin: "builtin" }, locale).word;
  const [data, setData] = useState(initial ?? null);
  const [state, setState] = useState(initial !== undefined ? "ready" : "loading");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/quality/safety`, { cache: "no-store" });
    if (!res.ok) { setState("hidden"); return; }
    setData(await res.json());
    setState("ready");
  }, [slug]);

  useReload(load, initial);

  // A READER WITHOUT THE INCIDENT REGISTER SEES NO PANEL AT ALL, rather than an
  // empty one saying they may not look. The route refuses them; a box announcing
  // the refusal would tell them a register exists that they cannot open, which
  // is the one thing the gate is for.
  if (state === "loading") return <div className="mt-6 h-20 rounded-xl skel" aria-busy="true" />;
  if (state === "hidden" || !data) return null;

  const rate = (v) => (v === null || v === undefined ? "—" : v.toFixed(1));

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/15 dark:bg-[#0c0c11]">
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
              {/* TRANSLATED ON DISPLAY, keyed by the stored option — the rule
                  every register's statuses follow. This printed the stored
                  English to every Arabic studio. "" is an incident nobody has
                  classified yet, and it is said in words, not left blank. */}
              <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{k.kind ? kindWord(k.kind) : tr.unclassified}</span>
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
