"use client";

// THE FINANCE DASHBOARD (UI/UX overhaul §2.4, Finance 1a + 1b). The AR half
// (invoices/expenses) is drawn from the views its screen already holds and
// passed in; the AP/FA half (bills, fixed assets) is fetched here on mount from
// its own two routes, because Payables and Assets are separate sub-sections with
// separate routes and the dashboard is the one place that wants both at once.
// Everything drawn is DERIVED by the pure functions in modules/finance/analytics.
//
// ANALYTICS IS GATED by the per-component SELECTION model. Every widget declares a
// STABLE KEY (matching the shared registry in lib/dashboardWidgets) and asks the
// single `useWidgetVisible()` gate whether to render or show the locked teaser.
// The gate resolves a tier's enabled-widget set once and answers by key, so no
// widget reasons about rungs — the entitlement rule lives entirely in
// `enabledWidgets`, never here.

import { useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { financeDict } from "@/shared/studio/finance";
import { money, StatTile } from "@/components/studio2/ui";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { BarChart, BarList, Donut, Radial, ChartFrame } from "@/components/charts";
import { CurrencySymbol } from "@/components/Currency";
import {
  arAging, topDebtors, collectionRate, dso, incomeVsExpense, expenseMix,
  apAging, topVendors, assetRegister,
} from "@/modules/finance/analytics";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

const monthKey = (d) => String(d).slice(0, 7);

export default function FinanceDashboard({ invoices = [], expenses = [], currency = "", slug = "" }) {
  const tr = financeDict(useStudioLocale());
  // AP + FA land from their own routes. A route that is missing or forbidden
  // degrades to empty widgets rather than breaking the AR dashboard beside them.
  const [payables, setPayables] = useState([]);
  const [assets, setAssets] = useState([]);
  useEffect(() => {
    if (!slug) return undefined;
    let alive = true;
    const get = (kind, field) =>
      fetch(`/api/studios/${slug}/finance/${kind}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (j && Array.isArray(j[field]) ? j[field] : []))
        .catch(() => []);
    Promise.all([get("bills", "bills"), get("assets", "assets")]).then(([b, a]) => {
      if (!alive) return;
      setPayables(b);
      setAssets(a);
    });
    return () => { alive = false; };
  }, [slug]);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = monthKey(today);

  const live = invoices.filter((i) => i.status !== "Cancelled" && i.status !== "Draft");
  const outstanding = live.reduce((s, i) => s + (i.outstanding || 0), 0);
  const overdue = invoices.filter((i) => i.overdue).reduce((s, i) => s + (i.outstanding || 0), 0);
  const overdueCount = invoices.filter((i) => i.overdue).length;
  const collectedThisMonth = invoices.reduce(
    (s, i) => s + (i.payments || []).filter((p) => monthKey(p.date) === thisMonth).reduce((a, p) => a + (Number(p.amount) || 0), 0),
    0,
  );
  const expensesThisMonth = expenses.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const aging = arAging(invoices, today);
  const debtors = topDebtors(invoices, 5);
  const rate = collectionRate(invoices, 90, today);
  const days = dso(invoices, today);
  const months = incomeVsExpense(invoices, expenses, 12, today);
  const mix = expenseMix(expenses);

  // AP + FA (Finance 1b).
  const apeing = apAging(payables, today);
  const vendors = topVendors(payables, 5);
  const owedToVendors = payables
    .filter((b) => b.status !== "Cancelled" && b.status !== "Draft")
    .reduce((s, b) => s + (b.outstanding || 0), 0);
  const register = assetRegister(assets);
  const catNbv = register.byCategory.filter((g) => g.bookValue > 0).slice(0, 6);

  const amt = (n) => <span className="num"><CurrencyGlyph currency={currency} />{money(n)}</span>;
  const visible = useWidgetVisible();

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. AR at a glance,
          then the two headline AP/FA figures (Finance 1b) beside them. */}
      <StatRow>
        <StatTile label={tr.outstanding} value={amt(outstanding)} />
        <StatTile label={`Overdue · ${overdueCount}`} value={amt(overdue)} tone={overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""} />
        <StatTile label={tr.collectedMonth} value={amt(collectedThisMonth)} tone="text-emerald-600 dark:text-emerald-400" />
        <StatTile label={tr.spentMonth} value={amt(expensesThisMonth)} />
        <StatTile label={tr.owedVendors} value={amt(owedToVendors)} />
        <StatTile label={tr.netBookValue} value={amt(register.netBookValue)} />
      </StatRow>

      <DashGrid>
        {/* ---- receivables (AR) ---- */}
        <Widget title={tr.receivablesAging} hint={tr.outstandingDaysPastDue} locked={!visible("finance.ar-aging")} lockedWhat={tr.receivablesAging}>
          <AgingBars aging={aging} />
        </Widget>

        <Widget title={tr.topDebtors} hint={tr.whoOwesMost} locked={!visible("finance.top-debtors")} lockedWhat={tr.topDebtors}>
          <BarList items={debtors.map((d) => ({ label: d.clientName, value: debtors[0]?.owed ? Math.round((d.owed / debtors[0].owed) * 100) : 0, display: <span className="num">{money(d.owed)}</span> }))} />
        </Widget>

        <Widget title={tr.collectionRate} hint={tr.collectedInvoicedLast90} locked={!visible("finance.collection-rate")} lockedWhat={tr.collectionRate}>
          <div className="flex justify-center py-2">
            <Radial value={Math.round(rate * 100)} label={`${Math.round(rate * 100)}%`} sub="last 90 days" color="rgb(var(--chart-2))" />
          </div>
        </Widget>

        <Widget title={tr.incomeVsExpense} hint={tr.cashOut12Months} span={2} locked={!visible("finance.income-vs-expense")} lockedWhat={tr.incomeVsExpense}>
          <ChartFrame labels={months.map((m) => m.month.slice(5))} legend={[{ name: "Income", color: "rgb(var(--chart-2))" }, { name: "Expense", color: "rgb(var(--chart-3))" }]} height={220}>
            <BarChart height={220}
              labels={months.map((m) => m.month)}
              series={[
                { name: "Income", data: months.map((m) => m.income), color: "rgb(var(--chart-2))" },
                { name: "Expense", data: months.map((m) => m.expense), color: "rgb(var(--chart-3))" },
              ]} />
          </ChartFrame>
        </Widget>

        <Widget title={tr.expenseMix} hint={tr.spendCategory} locked={!visible("finance.expense-mix")} lockedWhat={tr.expenseMix}>
          {mix.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={mix.slice(0, 6).map((m) => ({ label: m.category, value: m.amount }))}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{money(mix.reduce((s, m) => s + m.amount, 0))}</p><p className="text-[11px] text-slate-400">total</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noExpensesYet2}</p>}
        </Widget>

        {/* ---- payables (AP), Finance 1b ---- */}
        <Widget title={tr.topVendorsOwed} hint={tr.whoOweMost} locked={!visible("finance.top-vendors")} lockedWhat={tr.topVendorsOwed}>
          {vendors.length ? (
            <BarList items={vendors.map((v) => ({ label: v.vendorName, value: vendors[0]?.owed ? Math.round((v.owed / vendors[0].owed) * 100) : 0, display: <span className="num">{money(v.owed)}</span> }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.nothingOwedVendors}</p>}
        </Widget>

        <Widget title={tr.payablesAging} hint={tr.whatOweDaysPast} locked={!visible("finance.ap-aging")} lockedWhat={tr.payablesAging}>
          <AgingBars aging={apeing} />
        </Widget>

        {/* ---- fixed assets (FA), Finance 1b ---- */}
        <Widget title={tr.fixedAssetRegister} hint={tr.costDepreciationNetBook} locked={!visible("finance.asset-register")} lockedWhat={tr.fixedAssetRegister}>
          {register.count || register.disposedCount ? (
            <div className="space-y-3 py-1">
              <RegLine label={tr.totalCost} value={money(register.totalCost)} />
              <RegLine label={tr.accumulatedDepreciation} value={money(register.totalAccumulated)} tone="text-slate-500 dark:text-slate-400" />
              <div className="border-t border-slate-200 pt-3 dark:border-white/10">
                <RegLine label={tr.netBookValue} value={money(register.netBookValue)} strong />
              </div>
              <p className="text-xs text-slate-400">{register.count} in service{register.disposedCount ? ` · ${register.disposedCount} disposed` : ""}</p>
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noAssetsYet2}</p>}
        </Widget>

        <Widget title={tr.assetsCategory} hint={tr.netBookValueCategory} locked={!visible("finance.asset-breakdown")} lockedWhat={tr.assetsCategory}>
          {catNbv.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={catNbv.map((g) => ({ label: g.label, value: g.bookValue }))}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{money(register.netBookValue)}</p><p className="text-[11px] text-slate-400">{tr.netBookValue2}</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noAssetsService}</p>}
        </Widget>

        {/* Moderate */}
        <Widget title={tr.daysSalesOutstanding} hint={tr.averageAgeMoneyOwed} locked={!visible("finance.dso")} lockedWhat={tr.daysSalesOutstanding}>
          <div className="flex flex-col items-center justify-center py-4">
            <p className="num text-4xl font-800 text-slate-900 dark:text-white">{days}</p>
            <p className="mt-1 text-xs text-slate-400">{tr.daysWeightedAmount}</p>
          </div>
        </Widget>
      </DashGrid>
    </div>
  );
}

// The horizontal aging bars, shared by the receivables and payables widgets so
// the two read identically and cannot drift (§2.4). Current is calm, the 90+ tail
// is the warning colour, the middle bands the accent.
function AgingBars({ aging }) {
  return (
    <div className="space-y-2.5">
      {aging.buckets.map((b) => {
        const pct = aging.total > 0 ? Math.round((b.amount / aging.total) * 100) : 0;
        return (
          <div key={b.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs font-600 text-slate-500 dark:text-slate-400">{b.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: b.key === "current" ? "rgb(var(--chart-2))" : b.key === "d90" ? "rgb(var(--chart-3))" : "rgb(var(--chart-1))" }} />
            </div>
            <span className="num w-24 shrink-0 text-end text-xs font-700 text-slate-700 dark:text-slate-200">{money(b.amount)}</span>
          </div>
        );
      })}
    </div>
  );
}

// A labelled figure in the register summary — tabular, so a column of them aligns.
function RegLine({ label, value, tone, strong }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${strong ? "font-700 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{label}</span>
      <span className={`num text-sm ${strong ? "font-800 text-slate-900 dark:text-white" : `font-600 ${tone || "text-slate-700 dark:text-slate-200"}`}`}>{value}</span>
    </div>
  );
}

// The currency glyph before an amount, when the studio has one configured.
function CurrencyGlyph({ currency }) {
  if (!currency) return null;
  return <span className="me-0.5 text-slate-400"><CurrencySymbol code={currency} /></span>;
}
