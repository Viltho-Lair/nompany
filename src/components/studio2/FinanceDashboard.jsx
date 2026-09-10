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
import { Widget, StatRow, DashGrid, DashEmpty, DonutLegend } from "@/components/dashboard";
import { BarChart, BarList, ComboChart, Donut, Radial, ChartFrame, PALETTE } from "@/components/charts";
import { monthLabel, stackByMonth } from "@/components/dashboard/series";
import { CurrencySymbol } from "@/components/Currency";
import {
  arAging, topDebtors, collectionRate, dso, incomeVsExpense, expenseMix,
  apAging, topVendors, assetRegister,
} from "@/modules/finance/analytics";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

const monthKey = (d) => String(d).slice(0, 7);

// WHERE EVERY INVOICE STANDS — one state each, decided in this order: a draft
// has gone to nobody, a paid invoice is paid even if it was once overdue, and a
// cancelled one is nobody's receivable and is left out entirely.
const INVOICE_STATES = [
  { key: "paid", word: "dashPaid", color: "rgb(var(--chart-2))" },
  { key: "partly", word: "dashPartlyPaid", color: "rgb(var(--chart-1))" },
  { key: "unpaid", word: "dashUnpaid", color: "rgb(var(--chart-4))" },
  { key: "overdue", word: "dashOverdue", color: "rgb(var(--chart-3))" },
  { key: "draft", word: "dashDraft", color: "rgb(var(--chart-5))" },
];
function invoiceStateOf(i) {
  if (i.status === "Cancelled") return null;
  if (i.status === "Draft") return "draft";
  if ((Number(i.outstanding) || 0) <= 0) return "paid";
  if (i.overdue) return "overdue";
  return (Number(i.paid) || 0) > 0 ? "partly" : "unpaid";
}

export default function FinanceDashboard({ invoices = [], expenses = [], currency = "", slug = "" }) {
  const locale = useStudioLocale();
  const tr = financeDict(locale);
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

  // ---- the richer half (10/09/2026) ---------------------------------------
  const rtl = locale === "ar";
  const monthNames = months.map((m) => monthLabel(m.month, locale));
  // AR AND AP IN THE SAME BANDS, side by side — the comparison neither aging
  // widget can make alone: whether what the studio is owed covers what it owes,
  // band by band. The two agings share their bucket keys by construction
  // (modules/finance/analytics), so index i is the same band in both.
  const bands = aging.buckets.map((b, i) => ({ label: b.label, ar: b.amount, ap: apeing.buckets[i]?.amount || 0 }));
  const hasBands = bands.some((b) => b.ar > 0 || b.ap > 0);
  const invoiceStates = INVOICE_STATES.map((st) => ({
    label: tr[st.word], color: st.color,
    value: invoices.filter((i) => invoiceStateOf(i) === st.key).length,
  }));
  const invoiceCount = invoiceStates.reduce((a, s) => a + s.value, 0);
  // THE SAME TWELVE MONTHS the income chart draws, so the two line up.
  const expenseMonths = months.map((m) => m.month);
  const expenseStack = stackByMonth(expenses, (e) => e.date || e.createdAt, (e) => e.category || tr.dashOther,
    (e) => Number(e.amount) || 0, expenseMonths, 4, tr.dashOther);

  const amt = (n) => <span className="num"><CurrencyGlyph currency={currency} />{money(n)}</span>;
  const visible = useWidgetVisible();

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. AR at a glance,
          then the two headline AP/FA figures (Finance 1b) beside them. */}
      <StatRow>
        <StatTile label={tr.outstanding} value={amt(outstanding)} />
        <StatTile label={tr.overdueCount(overdueCount)} value={amt(overdue)} tone={overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""} />
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
            <Radial value={Math.round(rate * 100)} label={`${Math.round(rate * 100)}%`} sub={tr.last90Days} color="rgb(var(--chart-2))" />
          </div>
        </Widget>

        <Widget title={tr.incomeVsExpense} hint={tr.cashOut12Months} span={2} locked={!visible("finance.income-vs-expense")} lockedWhat={tr.incomeVsExpense}>
          {/* NET RIDES OVER THE BARS AS A LINE, on its own scale — income and
              expense are the bars, and what a month actually left behind is
              the gap between them, which two bars made the reader subtract. */}
          <ChartFrame labels={monthNames} height={220}
            legend={[{ name: tr.income, color: "rgb(var(--chart-2))" }, { name: tr.expense, color: "rgb(var(--chart-3))" }, { name: tr.dashNet, color: "rgb(var(--chart-1))" }]}>
            <ComboChart height={220} rtl={rtl}
              bars={[
                { name: tr.income, data: months.map((m) => m.income), color: "rgb(var(--chart-2))" },
                { name: tr.expense, data: months.map((m) => m.expense), color: "rgb(var(--chart-3))" },
              ]}
              line={{ name: tr.dashNet, data: months.map((m) => m.net), color: "rgb(var(--chart-1))" }} />
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

        {/* ---- the richer half (10/09/2026) ---- */}
        <Widget title={tr.dashInvoiceStatus} hint={tr.dashInvoiceStatusHint} locked={!visible("finance.invoice-status")} lockedWhat={tr.dashInvoiceStatus}>
          {invoiceCount ? <DonutLegend data={invoiceStates} word={tr.dashInvoicesWord} /> : <DashEmpty text={tr.dashNoInvoices} />}
        </Widget>

        <Widget title={tr.dashRvp} hint={tr.dashRvpHint} span={2} locked={!visible("finance.receivable-vs-payable")} lockedWhat={tr.dashRvp}>
          {hasBands ? (
            <ChartFrame labels={bands.map((b) => b.label)} height={200}
              legend={[{ name: tr.dashReceivables, color: "rgb(var(--chart-2))" }, { name: tr.dashPayables, color: "rgb(var(--chart-4))" }]}>
              <BarChart height={200} rtl={rtl} labels={bands.map((b) => b.label)}
                series={[
                  { name: tr.dashReceivables, data: bands.map((b) => b.ar), color: "rgb(var(--chart-2))" },
                  { name: tr.dashPayables, data: bands.map((b) => b.ap), color: "rgb(var(--chart-4))" },
                ]} />
            </ChartFrame>
          ) : <DashEmpty text={tr.dashNoHistory} />}
        </Widget>

        <Widget title={tr.dashExpenseTrend} hint={tr.dashExpenseTrendHint} span={3} locked={!visible("finance.expense-trend")} lockedWhat={tr.dashExpenseTrend}>
          {expenseStack.length ? (
            <ChartFrame labels={monthNames} height={220} legend={expenseStack.map((s, i) => ({ name: s.name, color: PALETTE[i % PALETTE.length] }))}>
              <BarChart height={220} stacked rtl={rtl} labels={expenseMonths}
                series={expenseStack.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }))} />
            </ChartFrame>
          ) : <DashEmpty text={tr.noExpensesYet2} />}
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
