"use client";

import { useCallback, useState } from "react";
import { executiveDict } from "@/shared/studio/executive";
import { Field } from "@/components/fields/Field";
import { fmtDate } from "@/lib/format";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useReload } from "@/components/studio2/useReload";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

// THE COMPANY ON ONE SCREEN.
//
// A CLIENT PANEL ON A SERVER PAGE. `StudioReports` is a Server Component and
// says why; this needs client state for exactly one thing — the window — so it
// is the smallest client boundary that buys it, loaded through `nextDynamic`
// from the page.
//
// IT COMPUTES NOTHING. Every figure, every movement and the previous window all
// arrive from `modules/reports/executive`, which is pure and which the server
// runs. A second copy of "what does a 33% rise mean" on the client is two
// answers to one question.
//
// A TILE'S LABEL COMES FROM THE TILE. `TILES` is the declared list both sides
// share; naming them again in a dictionary keyed by tile would be free to
// disagree with it the day one is added, which is the failure the sales funnel's
// hard-coded labels already cost this product once. Only the chrome is
// translated.
const TONE = {
  better: "text-emerald-600 dark:text-emerald-400",
  worse: "text-rose-600 dark:text-rose-400",
  flat: "text-slate-400 dark:text-slate-500",
  unknown: "text-slate-400 dark:text-slate-500",
};

export default function ExecutiveBoard({ slug, locale = "en" }) {
  const tr = executiveDict(locale);
  // THE FIGURES ARE FREE AND THE ANALYSIS IS SOLD. A tile is a sum of
  // records the reader can already open on the screen that owns them, so
  // charging for the arithmetic would be charging for something they could
  // do by hand. What a tier sells is the COMPARISON — this period against
  // the same length before it — and the freedom to choose the period.
  //
  // THE GATE IS THE ONE EVERY OTHER DASHBOARD ASKS, not a second mechanism:
  // `useWidgetVisible` resolves the studio's tier once in the shell, and a
  // key the registry does not list answers TRUE, so nothing here can be
  // silently hidden by a typo.
  const visible = useWidgetVisible();
  const showMovement = visible("reports.movement");
  const showWindow = visible("reports.window");
  const [data, setData] = useState(null);
  const [window, setWindow] = useState({ from: "", to: "" });

  const load = useCallback(async () => {
    const query = window.from && window.to
      ? `?from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}`
      : "";
    const res = await fetch(`/api/studios/${slug}/reports/executive${query}`, { cache: "no-store" });
    if (!res.ok) { setData({ tiles: [], hidden: [], total: 0 }); return; }
    setData(await res.json());
  }, [slug, window]);

  useReload(load);

  if (!data) return <ScreenSkeleton loadingLabel={tr.title} />;

  const { tiles = [], hidden = [], total = 0, previous, currency = "" } = data;

  // WHAT THE NUMBER IS IN, said beside it. A money tile with no currency is
  // a figure a director cannot act on; a count is a count and needs nothing;
  // and days are named because 0.50 is half a day, not fifty pence.
  const unitOf = (t) => (t.unit === "money" ? currency : t.unit === "days" ? tr.days : "");

  return (
    <section>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.title}</h3>
      <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>

      {/* THE PERIOD PICKER IS THE SOLD HALF. Without it the board is this
          month, which is the question a director asks daily; choosing a window
          is the analyst's tool. Absent rather than disabled — a control that is
          always refused is a control that should not be drawn. */}
      {showWindow && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label={tr.from} type="date" value={window.from}
            onChange={(v) => setWindow((w) => ({ ...w, from: v }))} className="w-full sm:w-44" />
          <Field label={tr.to} type="date" value={window.to}
            onChange={(v) => setWindow((w) => ({ ...w, to: v }))} className="w-full sm:w-44" />
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white"
            onClick={load}>{tr.apply}</button>
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 dark:border-white/15 dark:text-slate-200"
            onClick={() => { setWindow({ from: "", to: "" }); }}>{tr.reset}</button>
        </div>
      )}

      {showMovement && previous?.from && (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {tr.comparedWith(fmtDate(previous.from, locale), fmtDate(previous.to, locale))}
        </p>
      )}

      {tiles.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{tr.nothing}</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.key}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]">
              <p className="text-xs font-600 text-slate-500 dark:text-slate-400">{t.label}</p>
              <p className="num mt-1 text-2xl font-800 text-slate-900 dark:text-white">
                {t.unit === "count"
                  ? t.value
                  : t.value.toLocaleString(locale === "ar" ? "ar" : "en-GB",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {unitOf(t) && (
                  <span className="ms-1 text-xs font-600 text-slate-400 dark:text-slate-500">
                    {unitOf(t)}
                  </span>
                )}
              </p>
              {/* NULL IS SAID IN WORDS, not shown as a dash. "No comparison"
                  and "0%" are different statements and a reader has to be able
                  to tell them apart. */}
              {showMovement ? (
                <p className={`mt-1 text-xs ${TONE[t.direction]}`}>
                  {t.change === null
                    ? tr.noComparison
                    : t.change === 0
                      ? tr.flat
                      : `${t.change > 0 ? "+" : ""}${t.change}%`}
                </p>
              ) : (
                // THE FIGURE STAYS AND THE ANALYSIS GOES. A locked teaser here
                // would put a padlock under every tile on the free tier, which
                // reads as a broken board rather than as an offer.
                <p className="mt-1 text-xs text-slate-300 dark:text-slate-600">{tr.movementLocked}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WHAT IS NOT BEING SHOWN, and why. A board that silently omitted six of
          eight figures reads as a company doing very little; naming the gap
          turns it into "ask for these rights". */}
      {hidden.length > 0 && (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          {tr.hidden(hidden.length, total)} — {tr.hiddenHint}
        </p>
      )}
      {showMovement && tiles.some((t) => t.change === null) && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{tr.noComparisonHint}</p>
      )}
      {!showMovement && tiles.length > 0 && (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">{tr.movementLockedHint}</p>
      )}
    </section>
  );
}
