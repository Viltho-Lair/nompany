"use client";

// THE FINANCE DASHBOARD (UI/UX overhaul §2.4, Finance 1a + 1b). The AR half
// (invoices/expenses) is drawn from the views its screen already holds and
// passed in; the AP/FA half (bills, fixed assets) is fetched here on mount from
// its own two routes, because Payables and Assets are separate sub-sections with
// separate routes and the dashboard is the one place that wants both at once.
// Everything drawn is DERIVED by the pure functions in modules/finance/analytics.
//
// ANALYTICS IS GATED, and the gating model is deliberately behind ONE SEAM. Every
// widget declares a STABLE KEY (the WIDGETS registry) and asks a single
// `visible(key)` helper whether to render or show the locked teaser. Today that
// helper compares the studio's ordinal rung to the widget's rung; if gating moves
// to per-widget SET MEMBERSHIP (a tier picking exactly which widgets it grants),
// only `makeGate` changes — no widget is touched, because each already asks by
// its own id. The registry doubles as the rung→widget-set source of truth.

import { useEffect, useState } from "react";
import { money, StatTile } from "@/components/studio2/ui";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { BarChart, BarList, Donut, Radial, ChartFrame } from "@/components/charts";
import { CurrencySymbol } from "@/components/Currency";
import {
  arAging, topDebtors, collectionRate, dso, incomeVsExpense, expenseMix,
  apAging, topVendors, assetRegister,
} from "@/modules/finance/analytics";
import { analyticsAllows } from "@/lib/analytics";

// ---- widget registry: stable id → rung ------------------------------------
// The keys are the contract the gate is keyed on; nothing here is an inline
// ad-hoc string at a call site. A rung→widget-set map is `Object.entries` of this.
export const FINANCE_WIDGETS = {
  "finance.ar-aging": { rung: "simple" },
  "finance.top-debtors": { rung: "simple" },
  "finance.collection-rate": { rung: "simple" },
  "finance.income-vs-expense": { rung: "simple" },
  "finance.expense-mix": { rung: "simple" },
  "finance.dso": { rung: "moderate" },
  "finance.ap-aging": { rung: "moderate" },
  "finance.top-vendors": { rung: "simple" },
  "finance.asset-register": { rung: "simple" },
  "finance.asset-breakdown": { rung: "moderate" },
};

export const rungOf = (widgetKey) => FINANCE_WIDGETS[widgetKey]?.rung;

// THE ONE GATE. Swap the body here (ordinal rung → set membership) and every
// widget follows, because each calls this with its stable key and nothing else.
function makeGate(level) {
  return (widgetKey) => analyticsAllows(level, rungOf(widgetKey));
}

const monthKey = (d) => String(d).slice(0, 7);

export default function FinanceDashboard({ invoices = [], expenses = [], level = "basic", currency = "", slug = "" }) {
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
  const visible = makeGate(level);

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. AR at a glance,
          then the two headline AP/FA figures (Finance 1b) beside them. */}
      <StatRow>
        <StatTile label="Outstanding" value={amt(outstanding)} />
        <StatTile label={`Overdue · ${overdueCount}`} value={amt(overdue)} tone={overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""} />
        <StatTile label="Collected this month" value={amt(collectedThisMonth)} tone="text-emerald-600 dark:text-emerald-400" />
        <StatTile label="Spent this month" value={amt(expensesThisMonth)} />
        <StatTile label="Owed to vendors" value={amt(owedToVendors)} />
        <StatTile label="Net book value" value={amt(register.netBookValue)} />
      </StatRow>

      <DashGrid>
        {/* ---- receivables (AR) ---- */}
        <Widget title="Receivables aging" hint="Outstanding by days past due" locked={!visible("finance.ar-aging")} lockedWhat="Receivables aging">
          <AgingBars aging={aging} />
        </Widget>

        <Widget title="Top debtors" hint="Who owes the most" locked={!visible("finance.top-debtors")} lockedWhat="Top debtors">
          <BarList items={debtors.map((d) => ({ label: d.clientName, value: debtors[0]?.owed ? Math.round((d.owed / debtors[0].owed) * 100) : 0, display: <span className="num">{money(d.owed)}</span> }))} />
        </Widget>

        <Widget title="Collection rate" hint="Collected ÷ invoiced, last 90 days" locked={!visible("finance.collection-rate")} lockedWhat="Collection rate">
          <div className="flex justify-center py-2">
            <Radial value={Math.round(rate * 100)} label={`${Math.round(rate * 100)}%`} sub="last 90 days" color="rgb(var(--chart-2))" />
          </div>
        </Widget>

        <Widget title="Income vs expense" hint="Cash in and out, 12 months" span={2} locked={!visible("finance.income-vs-expense")} lockedWhat="Income vs expense">
          <ChartFrame labels={months.map((m) => m.month.slice(5))} legend={[{ name: "Income", color: "rgb(var(--chart-2))" }, { name: "Expense", color: "rgb(var(--chart-3))" }]} height={220}>
            <BarChart height={220}
              labels={months.map((m) => m.month)}
              series={[
                { name: "Income", data: months.map((m) => m.income), color: "rgb(var(--chart-2))" },
                { name: "Expense", data: months.map((m) => m.expense), color: "rgb(var(--chart-3))" },
              ]} />
          </ChartFrame>
        </Widget>

        <Widget title="Expense mix" hint="Spend by category" locked={!visible("finance.expense-mix")} lockedWhat="Expense mix">
          {mix.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={mix.slice(0, 6).map((m) => ({ label: m.category, value: m.amount }))}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{money(mix.reduce((s, m) => s + m.amount, 0))}</p><p className="text-[11px] text-slate-400">total</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">No expenses yet.</p>}
        </Widget>

        {/* ---- payables (AP), Finance 1b ---- */}
        <Widget title="Top vendors owed" hint="Who we owe the most" locked={!visible("finance.top-vendors")} lockedWhat="Top vendors owed">
          {vendors.length ? (
            <BarList items={vendors.map((v) => ({ label: v.vendorName, value: vendors[0]?.owed ? Math.round((v.owed / vendors[0].owed) * 100) : 0, display: <span className="num">{money(v.owed)}</span> }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">Nothing owed to vendors.</p>}
        </Widget>

        <Widget title="Payables aging" hint="What we owe, by days past due" locked={!visible("finance.ap-aging")} lockedWhat="Payables aging">
          <AgingBars aging={apeing} />
        </Widget>

        {/* ---- fixed assets (FA), Finance 1b ---- */}
        <Widget title="Fixed-asset register" hint="Cost, depreciation and net book value" locked={!visible("finance.asset-register")} lockedWhat="Fixed-asset register">
          {register.count || register.disposedCount ? (
            <div className="space-y-3 py-1">
              <RegLine label="Total cost" value={money(register.totalCost)} />
              <RegLine label="Accumulated depreciation" value={money(register.totalAccumulated)} tone="text-slate-500 dark:text-slate-400" />
              <div className="border-t border-slate-200 pt-3 dark:border-white/10">
                <RegLine label="Net book value" value={money(register.netBookValue)} strong />
              </div>
              <p className="text-xs text-slate-400">{register.count} in service{register.disposedCount ? ` · ${register.disposedCount} disposed` : ""}</p>
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">No assets yet.</p>}
        </Widget>

        <Widget title="Assets by category" hint="Net book value by category" locked={!visible("finance.asset-breakdown")} lockedWhat="Assets by category">
          {catNbv.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={catNbv.map((g) => ({ label: g.label, value: g.bookValue }))}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{money(register.netBookValue)}</p><p className="text-[11px] text-slate-400">net book value</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">No assets in service.</p>}
        </Widget>

        {/* Moderate */}
        <Widget title="Days sales outstanding" hint="Average age of money owed" locked={!visible("finance.dso")} lockedWhat="Days sales outstanding">
          <div className="flex flex-col items-center justify-center py-4">
            <p className="num text-4xl font-800 text-slate-900 dark:text-white">{days}</p>
            <p className="mt-1 text-xs text-slate-400">days, weighted by amount</p>
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
