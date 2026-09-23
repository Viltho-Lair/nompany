"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { useReload } from "@/components/studio2/useReload";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { moneyText } from "@/shared/money";
import { budgetsDict } from "@/shared/studio/budgets";

// FINANCE → BUDGETS (modules/finance/budgets). Every budget with its variance,
// computed on the server by the same P&L the Reports screen draws. A line with
// actuals and no budget is shown, marked, because spending nobody planned is
// the variance most worth seeing.
const th = "py-2 text-start text-[12px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500";
const ghost = "rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300";
const lastMonth = (from) => {
  const [y, m] = String(from || "").split("-").map(Number);
  return y ? new Date(Date.UTC(y, m - 1 + 11, 1)).toISOString().slice(0, 7) : "";
};

// `initial` is the /finance/budgets body the studio page answered in its own
// render (handed down through StudioFinance), so the budgets paint at once;
// absent, the panel fetches on mount exactly as before.
export default function BudgetsPanel({ slug, locale, initial }) {
  const tr = budgetsDict(locale);
  const [data, setData] = useState(initial ?? null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/budgets`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(String(body.error || "failed")); return; }
    setProblem(""); setData(body);
  }, [slug]);
  useReload(load, initial);
  // Budgets live under their own section; the actuals move with every posting.
  useLiveUpdates(slug, "finance-budgets", load);
  useLiveUpdates(slug, "finance-ledger", load);

  const send = async (method, payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/budgets`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(String(body.error || ""))); return false; }
    await load();
    return true;
  };

  if (!data) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : <ScreenSkeleton />;
  const { budgets = [], accounts = [], dimensionValues = {}, canCreate, canEdit, canDelete } = data;
  const open = (b) => setEditing(b
    ? { id: b.id, name: b.name, from: b.from, dimension: b.dimension || "", value: b.value || "",
        lines: b.lines.map((l) => ({ accountId: l.accountId, annual: String(l.months.reduce((s, n) => s + n, 0)) })) }
    : { name: "", from: "", dimension: "", value: "", lines: [{ accountId: "", annual: "" }] });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>
      {problem && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}

      {editing && (
        <div className="space-y-3 rounded-geex border border-slate-200 p-4 dark:border-white/10">
          <div className="flex flex-wrap items-end gap-2">
            <Field label={tr.name} className="w-64" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <Field label={tr.from} type="month" className="w-44" value={editing.from} onChange={(v) => setEditing({ ...editing, from: v })} />
            <Field label={tr.cutBy} as="select" required className="w-48" value={editing.dimension}
              options={Object.entries(tr.dimensions).map(([value, label]) => ({ value, label }))}
              onChange={(v) => setEditing({ ...editing, dimension: v, value: "" })} />
            {editing.dimension && (
              <Field label={tr.which} as="select" className="w-56" value={editing.value}
                options={(dimensionValues[editing.dimension] || [])}
                onChange={(v) => setEditing({ ...editing, value: v })} />
            )}
          </div>
          {editing.lines.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <Field label={tr.account} as="select" className="w-72" value={l.accountId}
                options={accounts.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))}
                onChange={(v) => setEditing({ ...editing, lines: editing.lines.map((x, n) => (n === i ? { ...x, accountId: v } : x)) })} />
              <Field label={tr.annual} type="number" className="w-40" value={l.annual}
                onChange={(v) => setEditing({ ...editing, lines: editing.lines.map((x, n) => (n === i ? { ...x, annual: v } : x)) })} />
              {editing.lines.length > 1 && (
                <button className={ghost} onClick={() => setEditing({ ...editing, lines: editing.lines.filter((_, n) => n !== i) })}>×</button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button className={ghost} onClick={() => setEditing({ ...editing, lines: [...editing.lines, { accountId: "", annual: "" }] })}>{tr.addLine}</button>
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50" disabled={busy}
              onClick={async () => {
                const body = { ...editing, lines: editing.lines.filter((l) => l.accountId).map((l) => ({ accountId: l.accountId, annual: Number(l.annual) || 0 })) };
                if (await send("POST", body)) setEditing(null);
              }}>{tr.save}</button>
            <button className={ghost} onClick={() => setEditing(null)}>{tr.cancel}</button>
          </div>
        </div>
      )}
      {canCreate && !editing && (
        <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-600 text-slate-700 dark:border-white/15 dark:text-slate-200" onClick={() => open(null)}>{tr.newBudget}</button>
      )}

      {budgets.length === 0 ? <p className="text-sm text-slate-400">{tr.noBudgets}</p> : budgets.map((b) => {
        const r = b.report;
        const cut = b.dimension ? `${tr.dimensions[b.dimension]}: ${(dimensionValues[b.dimension] || []).find((v) => v.value === b.value)?.label || b.value}` : tr.dimensions[""];
        return (
          <section key={b.id} className="space-y-2 rounded-geex border border-slate-200/70 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{b.name}</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{tr.window(b.from, lastMonth(b.from))} · {cut}</span>
              <span className="ms-auto flex gap-1">
                {canEdit && <button className={ghost} onClick={() => open(b)}>{tr.edit}</button>}
                {canDelete && <button className={ghost} disabled={busy} onClick={() => send("DELETE", { id: b.id })}>{tr.remove}</button>}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">{tr.through(r.through, r.months)}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead><tr>
                  <th className={th}>{tr.account}</th><th className={th}>{tr.year}</th><th className={th}>{tr.budget}</th>
                  <th className={th}>{tr.actual}</th><th className={th}>{tr.variance}</th>
                </tr></thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.accountId} className="border-t border-slate-100 text-slate-700 dark:border-white/10 dark:text-slate-200">
                      <td className="py-1.5 pe-3">
                        <span className="font-mono text-xs text-slate-400">{row.code}</span> {row.name}
                        {row.unbudgeted && <span className="ms-2 text-xs text-amber-700 dark:text-amber-300">{tr.unbudgeted}</span>}
                      </td>
                      <td className="num py-1.5 pe-3">{moneyText(row.year)}</td>
                      <td className="num py-1.5 pe-3">{moneyText(row.budget)}</td>
                      <td className="num py-1.5 pe-3">{moneyText(row.actual)}</td>
                      <td className={`num py-1.5 pe-3 ${row.adverse ? "font-600 text-rose-600 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}
                        title={row.adverse ? tr.adverse : ""}>
                        {moneyText(row.variance)}
                      </td>
                    </tr>
                  ))}
                  {[[tr.income, r.totals.incomeBudget, r.totals.incomeActual], [tr.expense, r.totals.expenseBudget, r.totals.expenseActual],
                    [tr.result, r.totals.resultBudget, r.totals.resultActual]].map(([label, bud, act]) => (
                    <tr key={label} className="border-t border-slate-200 font-600 text-slate-900 dark:border-white/15 dark:text-white">
                      <td className="py-1.5 pe-3">{label}</td><td /><td className="num py-1.5 pe-3">{moneyText(bud)}</td>
                      <td className="num py-1.5 pe-3">{moneyText(act)}</td><td className="num py-1.5 pe-3">{moneyText(act - bud)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
