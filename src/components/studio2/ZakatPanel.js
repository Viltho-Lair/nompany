"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { useReload } from "@/components/studio2/useReload";
import { moneyText } from "@/shared/money";
import { financeDict } from "@/shared/studio/finance";

// THE ZAKAT WORKSHEET (modules/finance/zakat) — drawn only when the studio's
// country levies zakat; the route answers `enabled: false` everywhere else and
// this renders nothing. The ledger supplies equity, net fixed assets and the
// year's profit; everything else is the accountant's adjustment, named.
const money = (n) => moneyText(n);
const KINDS = ["add", "deduct", "profit"];

export default function ZakatPanel({ slug, locale }) {
  const tr = financeDict(locale);
  const [period, setPeriod] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (period.from) q.set("from", period.from);
    if (period.to) q.set("to", period.to);
    const res = await fetch(`/api/studios/${slug}/finance/zakat?${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(tr.zakatProblem(String(body.error || ""))); return; }
    setData(body);
    setDraft({ adjustments: body.saved?.adjustments || [], zakatableShare: String(body.saved?.zakatableShare ?? 100) });
  }, [slug, period, tr]);
  useReload(load);

  if (!data || !data.enabled || !draft) return null;
  const { inputs, result, saved, sheets = [], canFile, from, to, days } = data;
  const editable = canFile && (!saved || saved.status === "draft");

  const act = async (body) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/zakat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(tr.zakatProblem(String(out.error || ""))); return false; }
    await load();
    return true;
  };
  const setAdj = (i, k, v) => setDraft((d) => ({ ...d, adjustments: d.adjustments.map((a, j) => (j === i ? { ...a, [k]: v } : a)) }));
  const row = (label, value, strong) => (
    <li className={`flex justify-between py-1 ${strong ? "font-600 text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
      <span>{label}</span><span className="num">{value}</span>
    </li>
  );

  return (
    <section className="space-y-4 rounded-geex border border-slate-200 p-4 dark:border-white/10">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.zakatTitle}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.zakatLead}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
        <Field label={tr.zakatFrom} filled><StudioDate value={from} onChange={(iso) => setPeriod((p) => ({ from: iso, to: p.to || to }))} /></Field>
        <Field label={tr.zakatTo} filled><StudioDate value={to} onChange={(iso) => setPeriod((p) => ({ from: p.from || from, to: iso }))} /></Field>
        <Field label={tr.zakatShare} type="number" value={draft.zakatableShare} disabled={!editable}
          onChange={(v) => setDraft((d) => ({ ...d, zakatableShare: v }))} />
      </div>

      <ul className="divide-y divide-slate-100 text-sm dark:divide-white/5 lg:max-w-2xl">
        {row(tr.zakatEquity, money(inputs.equity))}
        {row(tr.zakatFixed, money(inputs.netFixedAssets))}
        {row(tr.zakatProfit, money(inputs.profit))}
      </ul>

      <div className="space-y-2 lg:max-w-2xl">
        <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.zakatAdjustments}</p>
        {draft.adjustments.map((a, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_10rem_9rem_auto]">
            <Field label={tr.zakatAdjLabel} value={a.label} disabled={!editable} onChange={(v) => setAdj(i, "label", v)} />
            <Field label={tr.zakatAdjKind} as="select" value={a.kind} disabled={!editable} onChange={(v) => setAdj(i, "kind", v)}
              options={KINDS.map((k) => ({ value: k, label: tr.zakatKind(k) }))} />
            <Field label={tr.zakatAdjAmount} type="number" value={String(a.amount ?? "")} disabled={!editable} onChange={(v) => setAdj(i, "amount", v)} />
            {editable && <button className="self-end rounded-full border border-slate-200 px-3 py-2 text-sm dark:border-white/10"
              onClick={() => setDraft((d) => ({ ...d, adjustments: d.adjustments.filter((_, j) => j !== i) }))}>×</button>}
          </div>
        ))}
        {editable && (
          <button className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-600 dark:border-white/10"
            onClick={() => setDraft((d) => ({ ...d, adjustments: [...d.adjustments, { label: "", kind: "add", amount: "" }] }))}>{tr.zakatAddAdj}</button>
        )}
      </div>

      <ul className="divide-y divide-slate-100 text-sm dark:divide-white/5 lg:max-w-2xl">
        {row(tr.zakatAdditions, money(result.additions))}
        {row(tr.zakatDeductions, money(result.deductions))}
        {row(tr.zakatComputed, money(result.computed))}
        {row(tr.zakatAdjustedProfit, money(result.adjustedProfit))}
        {row(tr.zakatBase, money(result.base), true)}
        {row(tr.zakatRate(days), `${result.rate.toFixed(4)}%`)}
        {row(tr.zakatDue, money(result.zakat), true)}
      </ul>
      {result.floored && <p className="text-xs text-slate-500 dark:text-slate-400">{tr.zakatFloored}</p>}
      {result.capped && <p className="text-xs text-slate-500 dark:text-slate-400">{tr.zakatCapped}</p>}
      <p className="text-xs text-slate-400">{tr.zakatNotDeclaration}</p>

      {canFile && (
        <div className="flex flex-wrap gap-2">
          {editable && (
            <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-600 dark:border-white/10" disabled={busy}
              onClick={() => act({ action: "save", from, to, zakatableShare: Number(draft.zakatableShare) || 0,
                adjustments: draft.adjustments.map((a) => ({ ...a, amount: Number(a.amount) || 0 })) })}>{tr.zakatSave}</button>
          )}
          {saved?.status === "draft" && (
            <button className="rounded-full bg-brand-600 px-4 py-2 text-sm font-600 text-white" disabled={busy}
              onClick={() => act({ action: "provision", id: saved.id })}>{tr.zakatProvision}</button>
          )}
          {saved?.status === "provisioned" && (
            <button className="rounded-full bg-brand-600 px-4 py-2 text-sm font-600 text-white" disabled={busy}
              onClick={() => act({ action: "pay", id: saved.id })}>{tr.zakatPay}</button>
          )}
        </div>
      )}
      {problem && <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p>}

      {sheets.length > 0 && (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-white/5">
          {sheets.map((s) => (
            <li key={s.id} className="flex justify-between py-1.5">
              <span className="text-slate-900 dark:text-white">{tr.filedRow(s.from, s.to)}</span>
              <span className="flex gap-3">
                {s.provisioned && <span className="num">{money(s.provisioned.zakat)}</span>}
                <span className="text-xs text-slate-500">{tr.zakatStatus(s.status)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
