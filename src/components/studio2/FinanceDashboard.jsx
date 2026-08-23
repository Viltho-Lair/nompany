"use client";

// THE FINANCE DASHBOARD (UI/UX overhaul §2.4, Finance 1a). Realised on data that
// already exists — invoices and expenses — through the pure functions in
// modules/finance/analytics. Presentational: it takes the views its screen
// already holds and draws them, so it has no fetch of its own and can be dropped
// into StudioFinance with one line.
//
// ANALYTICS IS PAID, so each widget names the rung it belongs to and a studio
// below that rung sees the locked teaser instead of the number — the gate lives
// in `analyticsAllows`, the tiers in the catalogue.

import { money, StatTile } from "@/components/studio2/ui";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { BarChart, BarList, Donut, Radial, ChartFrame } from "@/components/charts";
import { CurrencySymbol } from "@/components/Currency";
import {
  arAging, topDebtors, collectionRate, dso, incomeVsExpense, expenseMix,
} from "@/modules/finance/analytics";
import { analyticsAllows } from "@/lib/analytics";

const monthKey = (d) => String(d).slice(0, 7);

export default function FinanceDashboard({ invoices = [], expenses = [], level = "basic", currency = "" }) {
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

  const amt = (n) => <span className="num"><CurrencyGlyph currency={currency} />{money(n)}</span>;
  const can = (rung) => analyticsAllows(level, rung);

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label="Outstanding" value={amt(outstanding)} />
        <StatTile label={`Overdue · ${overdueCount}`} value={amt(overdue)} tone={overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""} />
        <StatTile label="Collected this month" value={amt(collectedThisMonth)} tone="text-emerald-600 dark:text-emerald-400" />
        <StatTile label="Spent this month" value={amt(expensesThisMonth)} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title="Receivables aging" hint="Outstanding by days past due" locked={!can("simple")} lockedWhat="Receivables aging">
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
        </Widget>

        <Widget title="Top debtors" hint="Who owes the most" locked={!can("simple")} lockedWhat="Top debtors">
          <BarList items={debtors.map((d) => ({ label: d.clientName, value: aging.total > 0 ? Math.round((d.owed / (debtors[0]?.owed || 1)) * 100) : 0, display: <span className="num">{money(d.owed)}</span> }))} />
        </Widget>

        <Widget title="Collection rate" hint="Collected ÷ invoiced, last 90 days" locked={!can("simple")} lockedWhat="Collection rate">
          <div className="flex justify-center py-2">
            <Radial value={Math.round(rate * 100)} label={`${Math.round(rate * 100)}%`} sub="last 90 days" color="rgb(var(--chart-2))" />
          </div>
        </Widget>

        <Widget title="Income vs expense" hint="Cash in and out, 12 months" span={2} locked={!can("simple")} lockedWhat="Income vs expense">
          <ChartFrame labels={months.map((m) => m.month.slice(5))} legend={[{ name: "Income", color: "rgb(var(--chart-2))" }, { name: "Expense", color: "rgb(var(--chart-3))" }]} height={220}>
            <BarChart height={220}
              labels={months.map((m) => m.month)}
              series={[
                { name: "Income", data: months.map((m) => m.income), color: "rgb(var(--chart-2))" },
                { name: "Expense", data: months.map((m) => m.expense), color: "rgb(var(--chart-3))" },
              ]} />
          </ChartFrame>
        </Widget>

        <Widget title="Expense mix" hint="Spend by category" locked={!can("simple")} lockedWhat="Expense mix">
          {mix.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={mix.slice(0, 6).map((m) => ({ label: m.category, value: m.amount }))}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{money(mix.reduce((s, m) => s + m.amount, 0))}</p><p className="text-[11px] text-slate-400">total</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">No expenses yet.</p>}
        </Widget>

        {/* Moderate */}
        <Widget title="Days sales outstanding" hint="Average age of money owed" locked={!can("moderate")} lockedWhat="Days sales outstanding">
          <div className="flex flex-col items-center justify-center py-4">
            <p className="num text-4xl font-800 text-slate-900 dark:text-white">{days}</p>
            <p className="mt-1 text-xs text-slate-400">days, weighted by amount</p>
          </div>
        </Widget>
      </DashGrid>
    </div>
  );
}

// The currency glyph before an amount, when the studio has one configured.
function CurrencyGlyph({ currency }) {
  if (!currency) return null;
  return <span className="me-0.5 text-slate-400"><CurrencySymbol code={currency} /></span>;
}
