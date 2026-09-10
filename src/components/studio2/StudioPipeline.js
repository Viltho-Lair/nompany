// THE PIPELINE BOARD — the front of the funnel, which the product could not
// draw until now.
//
// Every stage on it already existed on the ticket. What did not exist was the
// arrangement: a list sorted by creation date cannot answer "what is stuck",
// "what is this quarter worth" or "why do we lose", and those are the three
// questions a sales review is made of. The columns answer the first, the tiles
// the second, and the reason a losing close now demands answers the third.
//
// IT MOVES NOTHING — the owner's instruction, 10/09/2026: the "Move to" control
// on every card is gone. The board is for READING the funnel; a deal changes
// stage where the ticket is edited, which is the same write this board used to
// send (the tickets route — there was never a pipeline write endpoint) and
// the same `stageProblem` rules, including the reason a losing close asks for.
"use client";
import { useCallback, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { salesDict } from "@/shared/studio/sales";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, microLabel, Empty, StatTile, money, fmtDate } from "@/components/studio2/ui";
import { StatusPill } from "@/components/studio2/StatusPill";
import { useReload } from "@/components/studio2/useReload";

// A deal that has sat in one stage this long is the thing the board exists to
// surface. Named rather than inlined because it is a judgement about sales, not
// a rendering detail — and because the next person to change it should have to
// find one number, not three.
const STALE_DAYS = 30;

export default function StudioPipeline({ slug }) {
  const locale = useStudioLocale();
  const tr = salesDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales/pipeline`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setData(body);
  }, [slug]);

  useReload(load);
  // THE BOARD OWNS NO COLLECTION — a deal on it is a `salesTicket`, and those
  // live under Tickets. So the key to watch is where the rows are WRITTEN, not
  // the section this screen is in: `crm-sales-pipeline` would never fire, and
  // neither would the department root, which nothing writes under at all.
  useLiveUpdates(slug, "crm-sales-tickets", load);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingPipeline} />;

  const decided = (data.closed || []).reduce((s, c) => s + c.count, 0);
  const anyOpen = (data.columns || []).some((c) => c.count > 0);

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div>
        <h2 className={h2}>{tr.pipeline}</h2>
        <p className={sub}>{tr.pipelineSub}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={panel}><StatTile label={tr.openValue} value={money(data.openValue)} /></div>
        <div className={panel}>
          <StatTile label={tr.weighted} value={money(data.weightedValue)} accent="rgb(var(--chart-2))" />
        </div>
        <div className={panel}>
          {/* A studio with nothing decided has no win rate, and the route sends
              null rather than 0 to say so — "0%" would read as a verdict on a
              studio that has simply not finished a deal yet. */}
          <StatTile
            label={tr.winRate}
            value={data.winRate == null ? "—" : `${data.winRate}%`}
            sub={tr.nDecided(decided)}
            accent="rgb(var(--chart-3))"
          />
        </div>
      </div>

      {!anyOpen ? <Empty title={tr.noDealsYet} body={tr.noDealsYetBody} /> : (
        <div className="-mx-2 overflow-x-auto px-2 pb-2">
          <div className="flex min-w-full gap-4">
            {(data.columns || []).map((col) => (
              <section key={col.status} className={`${panel} w-[19rem] shrink-0 !p-4`}>
                <div className="flex items-baseline justify-between gap-2">
                  <StatusPill kind="ticketStage" status={col.status} />
                  <span className="num text-xs text-slate-500 dark:text-slate-400">{col.count}</span>
                </div>
                <p className="num mt-2 font-700 text-slate-900 dark:text-white">{money(col.value)}</p>
                <p className={`${microLabel} mt-0.5`}>
                  {col.weighted == null ? tr.notForecast : `${tr.weighted} ${money(col.weighted)}`}
                </p>

                {col.deals.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{tr.noDealsHere}</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {col.deals.map((d) => (
                      <li key={d.id} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                        <a href={`/${slug}/crm-sales-tickets/${d.id}`}
                          className="font-mono text-[11px] text-brand-700 hover:underline dark:text-brand-300">
                          {d.ref || d.id}
                        </a>
                        <p className="mt-0.5 font-600 leading-snug text-slate-900 dark:text-white">{d.title}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{d.clientName}</p>

                        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="num text-sm font-700 text-slate-900 dark:text-white">{money(d.value)}</span>
                          {d.probability > 0 && (
                            <span className="num text-xs text-slate-500 dark:text-slate-400">
                              {d.probability}% · {money(d.weighted)}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {/* HOW LONG IT HAS BEEN HERE, amber past the threshold.
                              This is the number the board was built for: a deal
                              nobody has touched in six weeks looks exactly like
                              a fresh one on any list sorted by date. */}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-600 ${
                            d.days >= STALE_DAYS
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                          }`}>
                            {tr.nDaysHere(d.days)}
                          </span>
                          {d.deadline && (
                            <span className={`text-[11px] ${
                              d.deadline < today
                                ? "font-600 text-rose-600 dark:text-rose-300"
                                : "text-slate-500 dark:text-slate-400"
                            }`}>
                              {d.deadline < today ? `${tr.overdue} · ` : ""}{fmtDate(d.deadline)}
                            </span>
                          )}
                        </div>

                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      )}

      {/* HOW DEALS ENDED. Not columns: a studio that has been trading for a year
          has more closed deals than open ones, and giving them equal width would
          bury the live pipeline under its own history. */}
      {decided > 0 && (
        <section className={panel}>
          <p className={microLabel}>{tr.nDecided(decided)}</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {(data.closed || []).filter((c) => c.count > 0).map((c) => (
              <li key={c.status} className="flex items-center gap-2">
                <StatusPill kind="ticketStage" status={c.status} />
                <span className="num text-sm text-slate-600 dark:text-slate-300">{c.count} · {money(c.value)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
