"use client";

import { useCallback, useState } from "react";
import nextDynamic from "next/dynamic";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useStudioLocale } from "@/components/studio2/locale";
import { ledgerDict } from "@/shared/studio/ledger";
import { reconciliationDict } from "@/shared/studio/reconciliation";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";

// THE LEDGER — and until now this section had no screen at all.
//
// `finance-ledger` fell through `StudioFinance`'s view switch to the CASH
// screen, so a studio granted `finance.ledger.view` opened a page of invoices:
// the trial balance, the journal, the profit and loss and the balance sheet
// were all computed by a route nothing in the product called. That is the
// project `/costs` routing bug in a second place, and the shape CLAUDE.md names
// — a section that silently renders the wrong screen is how a right ends up
// exercising nothing (invariant 16).
//
// IT READS ONE ROUTE. Everything below comes from a single GET, because the
// trial balance and the two statements are computed from ONE read of the
// journal — serving them separately would be four reads and four chances for
// the profit and the trial balance to be computed a second apart.
const PeriodsPanel = nextDynamic(() => import("@/components/studio2/PeriodsPanel"),
  { loading: () => <ScreenSkeleton /> });
const ReconciliationPanel = nextDynamic(() => import("@/components/studio2/ReconciliationPanel"),
  { loading: () => <ScreenSkeleton /> });

const money = (n) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  .format(Number(n) || 0);

export default function StudioLedger({ slug }) {
  const locale = useStudioLocale();
  const tr = ledgerDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("trial");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/ledger`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setData(body);
  }, [slug, setData, setError]);

  useReload(load);
  useLiveUpdates(slug, "finance-ledger", load);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton />;

  const { trialBalance = {}, journal = [], profitAndLoss = {}, balanceSheet = {} } = data;
  const rows = trialBalance.rows || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-white/10">
        {[["trial", tr.trial], ["journal", tr.journal], ["pl", tr.pl], ["bs", tr.bs], ["reconcile", reconciliationDict(locale).tab], ["periods", tr.periods]]
          .map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-4 py-2 font-display text-sm font-600 transition-colors ${
                tab === k
                  ? "border-brand-600 text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
              {label}
            </button>
          ))}
      </div>

      {tab === "trial" && (
        <section className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="py-1 pe-3 text-start">{tr.account}</th>
                <th className="py-1 pe-3 text-end">{tr.debit}</th>
                <th className="py-1 text-end">{tr.credit}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.accountId} className="border-t border-slate-100 dark:border-white/5">
                  <td className="py-1.5 pe-3 text-slate-700 dark:text-slate-200">
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{r.code}</span> {r.name}
                  </td>
                  <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{r.debit ? money(r.debit) : ""}</td>
                  <td className="num py-1.5 text-end text-slate-600 dark:text-slate-300">{r.credit ? money(r.credit) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* THE TWO SIDES ARE SHOWN SEPARATELY AND NOT AS A DIFFERENCE. A
                  trial balance that printed one "out by" figure would hide
                  which side is wrong, which is the only thing the report is
                  read for when it does not balance. */}
              <tr className="border-t-2 border-slate-200 font-600 dark:border-white/10">
                <td className="py-1.5 pe-3 text-slate-900 dark:text-white">{tr.total}</td>
                {/* `totalDebit`/`totalCredit`, READ OFF THE MODEL. A first
                    draft guessed `debit`/`credit` — the per-ROW field names —
                    and the footer printed 0.00 under two columns of real
                    figures, which looks like a broken report rather than a
                    wrong field. Found by opening the screen. */}
                <td className="num py-1.5 pe-3 text-end text-slate-900 dark:text-white">{money(trialBalance.totalDebit)}</td>
                <td className="num py-1.5 text-end text-slate-900 dark:text-white">{money(trialBalance.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
          {trialBalance.balanced === false && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {tr.unbalanced}
            </p>
          )}
        </section>
      )}

      {tab === "journal" && (
        <section className="space-y-2">
          {journal.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noEntries}</p>
          ) : journal.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-slate-900 dark:text-white">{e.reference}</span>
                <span className="text-slate-500 dark:text-slate-400">{e.date}</span>
                <span className="text-slate-600 dark:text-slate-300">{e.memo}</span>
                <span className="ms-auto text-xs text-slate-400 dark:text-slate-500">{e.source?.kind}</span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {(e.lines || []).map((l, i) => (
                  <li key={i} className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{rows.find((r) => r.accountId === l.accountId)?.name || l.accountId}</span>
                    <span className="num">{l.debit ? money(l.debit) : `(${money(l.credit)})`}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {tab === "pl" && (
        <Statement tr={tr}
          groups={[[tr.income, profitAndLoss.income, profitAndLoss.totalIncome],
            [tr.expenses, profitAndLoss.expense, profitAndLoss.totalExpense]]}
          total={profitAndLoss.profit} totalLabel={tr.profit} />
      )}
      {/* THE RETAINED RESULT IS SHOWN rather than folded into equity: no
          account holds it until a year-end moves it, so a sheet that hid it
          would report every trading studio out of balance. */}
      {tab === "bs" && (
        <Statement tr={tr}
          groups={[[tr.assets, balanceSheet.asset, balanceSheet.totalAssets],
            [tr.liabilities, balanceSheet.liability, balanceSheet.totalLiabilities],
            [tr.equity, balanceSheet.equity, balanceSheet.totalEquity]]}
          total={balanceSheet.totalAssets} totalLabel={tr.assets}
          note={balanceSheet.balanced ? tr.retained(balanceSheet.retainedResult) : tr.outBy(balanceSheet.difference)} />
      )}

      {tab === "reconcile" && <ReconciliationPanel slug={slug} locale={locale} />}

      {tab === "periods" && <PeriodsPanel slug={slug} locale={locale} />}
    </div>
  );
}

// ONE COMPONENT FOR BOTH STATEMENTS. They differ in what the sections are
// called and what the closing figure means; the shape — named sections of
// accounts with a total each — is identical, and two copies would be two places
// a rounding choice could drift.
function Statement({ groups, total, totalLabel, note, tr }) {
  return (
    <section className="space-y-4">
      {groups.map(([name, rows, groupTotal]) => (
        <div key={name}>
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{name}</h3>
          {(rows || []).length === 0 ? (
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{tr.nothingHere}</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {(rows || []).map((r) => (
                <li key={r.accountId || r.code} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{r.code}</span> {r.name}
                  </span>
                  <span className="num">{money(r.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 flex justify-between border-t border-slate-100 pt-1 text-sm font-600 text-slate-900 dark:border-white/5 dark:text-white">
            <span>{name}</span><span className="num">{money(groupTotal)}</span>
          </p>
        </div>
      ))}
      <p className="flex justify-between border-t-2 border-slate-200 pt-2 font-display text-sm font-700 text-slate-900 dark:border-white/10 dark:text-white">
        <span>{totalLabel}</span><span className="num">{money(total)}</span>
      </p>
      {note && <p className="text-xs text-slate-400 dark:text-slate-500">{note}</p>}
    </section>
  );
}
