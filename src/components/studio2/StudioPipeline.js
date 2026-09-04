// THE PIPELINE BOARD — the front of the funnel, which the product could not
// draw until now.
//
// Every stage on it already existed on the ticket. What did not exist was the
// arrangement: a list sorted by creation date cannot answer "what is stuck",
// "what is this quarter worth" or "why do we lose", and those are the three
// questions a sales review is made of. The columns answer the first, the tiles
// the second, and the reason a losing close now demands answers the third.
//
// THE BOARD REFUSES WITH THE SERVER'S OWN FUNCTION. `stageProblem` comes from
// modules/sales/pipeline, which has no server import for exactly this reason —
// the move this screen offers and the move the route accepts are decided by one
// piece of code, so they cannot drift apart. A second copy here would be free
// to keep offering a move the server had started refusing, and the person
// looking at the stale copy is the one who would hit the wall.
//
// A SELECT, NOT DRAG AND DROP. The board is bilingual and scrolls horizontally,
// which is where drag implementations go wrong: a pointer-driven drop target
// computed in physical pixels mirrors incorrectly under `dir="rtl"`, and it is
// unusable on a phone and invisible to a keyboard. The move is a decision with
// consequences — a close asks why — so it reads better as a deliberate choice
// than as a gesture.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { salesDict } from "@/shared/studio/sales";
import { statusLabel } from "@/shared/studio/statuses";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, microLabel, Empty, Dialog, StatTile, money, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { StatusPill } from "@/components/studio2/StatusPill";
import { BOARD_COLUMNS, CLOSED_STAGES, stageDef, stageProblem } from "@/modules/sales/pipeline";

// A deal that has sat in one stage this long is the thing the board exists to
// surface. Named rather than inlined because it is a judgement about sales, not
// a rendering detail — and because the next person to change it should have to
// find one number, not three.
const STALE_DAYS = 30;

// The refusal tokens the tickets route can hand back on a stage move, in the
// studio's own language. Anything else falls through as its raw token rather
// than being swallowed — an unrecognised error is still an error.
function refusal(tr, token) {
  if (token === "already-closed") return tr.refuseAlreadyClosed;
  if (token === "no-quotation") return tr.refuseNoQuotation;
  if (token === "reason-required") return tr.refuseReasonRequired;
  return token;
}

export default function StudioPipeline({ slug }) {
  const locale = useStudioLocale();
  const tr = salesDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // The move in progress: the deal, and where it is going. A losing stage holds
  // it here until a reason is typed; anything else goes straight through.
  const [move, setMove] = useState(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales/pipeline`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setData(body);
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(slug, load);

  // THE MOVE GOES TO THE TICKETS ROUTE, because moving a deal IS editing the
  // ticket. There is no pipeline write endpoint, deliberately — see the route.
  const commit = useCallback(async (deal, to, lostReason) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/sales/tickets`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deal.id, status: to, lostReason: lostReason || "" }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return; }
    setMove(null); setReason("");
    await load();
  }, [slug, load, tr]);

  const onPick = useCallback((deal, to) => {
    if (!to || to === deal.status) return;
    // A LOSING CLOSE STOPS FOR ITS REASON. Asked here as well as refused by the
    // server: `reason-required` coming back as an error would be a worse way to
    // learn that the field exists than simply being asked for it.
    if (stageDef(to)?.needsReason) { setReason(""); setMove({ deal, to }); return; }
    commit(deal, to);
  }, [commit]);

  // Where a given deal may go: everything except the moves the server would
  // refuse on structure. A placeholder reason is passed so `reason-required`
  // does NOT filter a stage out — the dialog above collects it, and hiding
  // "Closed Lost" until a reason existed would hide the only control that asks
  // for one.
  const targetsFor = useCallback((deal) => (
    [...BOARD_COLUMNS, ...CLOSED_STAGES].filter((to) => (
      to !== deal.status
      && !stageProblem({ from: deal.status, to, hasQuotation: deal.hasQuotation, lostReason: "-" })
    ))
  ), []);

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
                  <StatusPill kind="sales" status={col.status} />
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

                        {/* VALUE IS ALWAYS "", because this is an action and not
                            a bound field. The COLUMN says which stage the deal
                            is in; a select bound to that would read as "the
                            stage is Lead" rather than "send it somewhere", and
                            it would list the deal's own stage as a choice.
                            Picking fires the move and the control returns to
                            empty. */}
                        {data.canMove && (
                          <div className="mt-3">
                            <Field
                              label={tr.moveTo}
                              as="select"
                              value=""
                              disabled={busy}
                              onChange={(to) => onPick(d, to)}
                              options={targetsFor(d).map((to) => ({ value: to, label: statusLabel("sales", to, locale) }))}
                            />
                          </div>
                        )}
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
                <StatusPill kind="sales" status={c.status} />
                <span className="num text-sm text-slate-600 dark:text-slate-300">{c.count} · {money(c.value)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {move && (
        <Dialog title={tr.whyLost} description={tr.whyLostHint} onClose={() => setMove(null)} width="max-w-[520px]">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {move.deal.ref} · {move.deal.title} → <StatusPill kind="sales" status={move.to} />
            </p>
            <Field
              label={tr.lostReasonLabel}
              value={reason}
              required
              onChange={setReason}
              inputProps={{ maxLength: 400, autoFocus: true }}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setMove(null)}>{tr.cancel}</button>
              <button
                type="button"
                className={btn}
                disabled={busy || !reason.trim()}
                onClick={() => commit(move.deal, move.to, reason)}
              >
                {tr.moveDeal}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
