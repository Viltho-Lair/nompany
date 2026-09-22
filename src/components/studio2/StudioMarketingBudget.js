"use client";

// BUDGET & SPEND (21/09/2026) — Marketing's second money screen, and the first
// that reads any. A campaign has carried a budget since the department shipped
// with nothing measured against it; this puts Finance's own bills and expenses
// beside it, and then says what the money bought.
//
// IT SPENDS NOTHING. There is no form here: a cost is a bill or an expense, it
// is raised in Finance, and it names its campaign there. The screen says so in
// as many words when nothing has been filed yet, because an empty table that
// explains nothing reads as a broken feature rather than an unused one.
//
// NO LIVE UPDATES, deliberately, and it is the choice Customer insights made
// for the same reason: the rows come from three places at once (campaigns,
// bills, expenses) and `useLiveUpdates` hears ONE section, so a half-live
// screen would refresh for a budget edit and sit still for the bill that
// actually moved the figure — worse than a screen nobody expects to move.

import { useCallback, useEffect, useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useStudioLocale } from "@/components/studio2/locale";
import { panel, h2, sub, btnGhost, money, StatTile } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { marketingBudgetDict } from "@/shared/studio/marketingBudget";
import { marketingDeptDict } from "@/shared/studio/marketingDept";

const FILTERS = ["all", "attention", "spending", "open"];
const OPEN = new Set(["Draft", "Planned", "Active", "Paused"]);

export default function StudioMarketingBudget({ slug }) {
  const locale = useStudioLocale();
  const tr = marketingBudgetDict(locale);
  const dept = marketingDeptDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/budget`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || tr.failed); return; }
    setError("");
    setData(body);
  }, [slug, tr]);

  useEffect(() => {
    let alive = true;
    (async () => { if (alive) await reload(); })();
    return () => { alive = false; };
  }, [reload]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { campaigns = [], totals = {}, currency = "", sources = {}, unconverted = 0 } = data;
  const cash = (n) => `${money(n || 0, currency)}${currency ? ` ${currency}` : ""}`;
  const pct = (v) => `${Math.round((v || 0) * 100)}%`;
  const shown = campaigns.filter((c) => (
    filter === "attention" ? c.over || c.nearly
      : filter === "spending" ? c.spent > 0
        : filter === "open" ? OPEN.has(c.status)
          : true));
  const nothingFiled = campaigns.every((c) => c.spent === 0) && !totals.unattributed;

  return (
    <div className="space-y-4">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <h2 className={h2}>{tr.title}</h2>
            <p className={sub}>{tr.sub}</p>
          </div>
          <a className={btnGhost} href={`/${slug}/marketing-campaigns`}>{tr.openCampaigns}</a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label={tr.budget} value={cash(totals.budget)} accent="rgb(var(--chart-1))" />
          <StatTile label={tr.spent} value={cash(totals.spent)} accent="rgb(var(--chart-2))"
            sub={totals.remaining === null ? tr.noBudget : tr.ofBudget(pct(totals.budget ? totals.spent / totals.budget : 0))} />
          <StatTile label={tr.remaining} accent="rgb(var(--chart-4))"
            value={totals.remaining === null ? tr.noAnswerYet : cash(totals.remaining)} />
          <StatTile label={tr.colReturn} accent="rgb(var(--chart-3))"
            value={totals.returnOnSpend === null ? tr.noAnswerYet : tr.times(String(Math.round((totals.returnOnSpend || 0) * 10) / 10))}
            sub={tr.returnHint} />
        </div>

        <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
          {totals.over > 0 && <p className="text-rose-600 dark:text-rose-300">{tr.campaignsOver(totals.over)}</p>}
          {totals.nearly > 0 && <p className="text-amber-600 dark:text-amber-300">{tr.campaignsNearly(totals.nearly)}</p>}
          {!sources.finance && <p>{tr.financeOff}</p>}
          {totals.unattributed > 0 && <p>{tr.unattributed(cash(totals.unattributed))}</p>}
          {unconverted > 0 && <p>{tr.unconverted(unconverted)}</p>}
        </div>
      </section>

      <section className={panel}>
        <div className="mb-4 max-w-xs">
          <Field label={tr.filter} as="select" value={filter} onChange={setFilter}
            options={FILTERS.map((f) => ({ value: f, label: tr.filters[f] }))} />
        </div>

        {campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{tr.none}</p>
        ) : nothingFiled ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nothingFiled}</p>
            <p className="mt-1 text-xs text-slate-400">{tr.howToFile}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="py-2 text-start font-600">{tr.colCampaign}</th>
                  <th className="py-2 text-start font-600">{tr.colStatus}</th>
                  <th className="py-2 text-end font-600">{tr.colBudget}</th>
                  <th className="py-2 text-end font-600">{tr.colSpent}</th>
                  <th className="py-2 text-end font-600">{tr.colRemaining}</th>
                  <th className="py-2 text-start font-600">{tr.colUsed}</th>
                  <th className="py-2 text-end font-600">{tr.colLeads}</th>
                  <th className="py-2 text-end font-600" title={tr.costPerLeadHint}>{tr.colCostPerLead}</th>
                  <th className="py-2 text-end font-600">{tr.colWon}</th>
                  <th className="py-2 text-end font-600" title={tr.returnHint}>{tr.colReturn}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 align-top last:border-0 dark:border-white/5">
                    <td className="py-2.5 pe-3">
                      <p className="font-600 text-[var(--geex-ink)]">{c.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[c.reference, tr.fromBills(c.bills, c.expenses)].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="py-2.5 pe-3 text-xs text-slate-500 dark:text-slate-400">{dept.status(c.status)}</td>
                    <td className="num py-2.5 pe-3 text-end">{c.budget === null ? tr.noAnswerYet : cash(c.budget)}</td>
                    <td className="num py-2.5 pe-3 text-end">{cash(c.spent)}</td>
                    <td className={`num py-2.5 pe-3 text-end ${c.over ? "text-rose-600 dark:text-rose-300" : ""}`}>
                      {c.remaining === null ? tr.noAnswerYet : cash(c.remaining)}
                    </td>
                    <td className="py-2.5 pe-3">
                      {c.used === null ? (
                        <span className="text-xs text-slate-400">{tr.noBudget}</span>
                      ) : (
                        <div className="min-w-[6rem]">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div className={`h-full rounded-full ${c.over ? "bg-rose-500" : c.nearly ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(100, Math.round(c.used * 100))}%` }} />
                          </div>
                          <p className="num mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {c.over ? tr.overBy(cash(Math.abs(c.remaining))) : pct(c.used)}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="num py-2.5 pe-3 text-end">{c.leads}</td>
                    <td className="num py-2.5 pe-3 text-end">{c.costPerLead === null ? tr.noAnswerYet : cash(c.costPerLead)}</td>
                    <td className="num py-2.5 pe-3 text-end">
                      {c.won}
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{cash(c.wonValue)}</span>
                    </td>
                    <td className="num py-2.5 text-end">
                      {c.returnOnSpend === null ? tr.noAnswerYet : tr.times(String(Math.round(c.returnOnSpend * 10) / 10))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
