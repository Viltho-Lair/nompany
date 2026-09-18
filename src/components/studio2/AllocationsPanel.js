"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { moneyText } from "@/shared/money";
import { allocationsDict } from "@/shared/studio/allocations";

// LEDGER → ALLOCATIONS (modules/finance/allocations). The rules, and a month's
// run previewed before it posts.
const ghost = "rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300";
const primary = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50";
const blank = () => ({ name: "", accountId: "", dimension: "projectId", basis: "fixed", shares: [{ value: "", percent: "" }, { value: "", percent: "" }] });

export default function AllocationsPanel({ slug, locale }) {
  const tr = allocationsDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [run, setRun] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/allocations`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(String(body.error || "failed")); return; }
    setProblem(""); setData(body);
  }, [slug]);
  useReload(load);
  useLiveUpdates(slug, "finance-ledger", load);

  const post = async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/allocations`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || String(body.error || "")); return null; }
    return body;
  };

  if (!data) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : <p className="text-sm text-slate-500">…</p>;
  const { rules = [], accounts = [], dimensionValues = {}, canPost } = data;
  const accountName = (id) => { const a = accounts.find((x) => x.id === id); return a ? `${a.code} ${a.name}` : ""; };
  const labelOf = (dim, v) => (dimensionValues[dim] || []).find((x) => x.value === v)?.label || v;
  const setShare = (i, p) => setDraft({ ...draft, shares: draft.shares.map((s, n) => (n === i ? { ...s, ...p } : s)) });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.title}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>
      {problem && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}

      {rules.length === 0 ? <p className="text-sm text-slate-400">{tr.none}</p> : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-600 text-slate-900 dark:text-white">{r.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{tr.describe(accountName(r.accountId), tr.dimensions[r.dimension], tr.bases[r.basis])}</span>
                {canPost && (
                  <span className="ms-auto flex gap-1">
                    <button className={ghost} onClick={() => setDraft({ ...r, shares: r.shares.length ? r.shares.map((s) => ({ ...s, percent: String(s.percent) })) : blank().shares })}>{tr.edit}</button>
                    <button className={ghost} disabled={busy} onClick={async () => { if (await post({ action: "remove", id: r.id })) await load(); }}>{tr.remove}</button>
                  </span>
                )}
              </div>
              {r.basis === "fixed" && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{r.shares.map((s) => `${labelOf(r.dimension, s.value)} ${s.percent}%`).join(" · ")}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canPost && !draft && <button className={ghost} onClick={() => setDraft(blank())}>{tr.newRule}</button>}
      {draft && (
        <div className="space-y-2 rounded-geex border border-slate-200 p-3 dark:border-white/10">
          <div className="flex flex-wrap items-end gap-2">
            <Field label={tr.name} className="w-56" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
            <Field label={tr.account} as="select" className="w-64" value={draft.accountId}
              options={accounts.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))} onChange={(v) => setDraft({ ...draft, accountId: v })} />
            <Field label={tr.along} as="select" required className="w-44" value={draft.dimension}
              options={Object.entries(tr.dimensions).map(([value, label]) => ({ value, label }))} onChange={(v) => setDraft({ ...draft, dimension: v })} />
            <Field label={tr.basis} as="select" required className="w-64" value={draft.basis}
              options={Object.entries(tr.bases).map(([value, label]) => ({ value, label }))} onChange={(v) => setDraft({ ...draft, basis: v })} />
          </div>
          {draft.basis === "fixed" && draft.shares.map((s, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <Field label={tr.value} as="select" className="w-64" value={s.value}
                options={(dimensionValues[draft.dimension] || [])} onChange={(v) => setShare(i, { value: v })} />
              <Field label={tr.percent} type="number" className="w-28" value={s.percent} onChange={(v) => setShare(i, { percent: v })} />
              {draft.shares.length > 2 && <button className={ghost} onClick={() => setDraft({ ...draft, shares: draft.shares.filter((_, n) => n !== i) })}>×</button>}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {draft.basis === "fixed" && <button className={ghost} onClick={() => setDraft({ ...draft, shares: [...draft.shares, { value: "", percent: "" }] })}>{tr.addShare}</button>}
            <button className={primary} disabled={busy}
              onClick={async () => {
                const body = { action: "save", ...draft, shares: draft.shares.map((s) => ({ value: s.value, percent: Number(s.percent) })) };
                if (await post(body)) { setDraft(null); await load(); }
              }}>{tr.save}</button>
            <button className={ghost} onClick={() => setDraft(null)}>{tr.cancel}</button>
          </div>
        </div>
      )}

      {rules.length > 0 && (
        <div className="space-y-2 rounded-geex border border-slate-200/70 p-4 dark:border-white/10">
          <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.runTitle}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.runLead}</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={tr.period} type="month" className="w-44" value={period} onChange={(v) => { setPeriod(v); setRun(null); }} />
            <button className={ghost} disabled={busy} onClick={async () => { const r = await post({ action: "run", period }); if (r) setRun(r); }}>{tr.preview}</button>
            {canPost && run && run.rows.some((r) => r.state === "due") && (
              <button className={primary} disabled={busy}
                onClick={async () => { const r = await post({ action: "run", period, post: true }); if (r) setRun(r); }}>
                {tr.post(run.rows.filter((r) => r.state === "due").length)}
              </button>
            )}
          </div>
          {run && (
            <ul className="space-y-2 text-sm">
              {run.rows.map((r) => {
                const rule = rules.find((x) => x.id === r.ruleId);
                return (
                  <li key={r.ruleId} className="text-slate-700 dark:text-slate-200">
                    <p className="flex flex-wrap gap-2">
                      <span className="font-600">{r.name}</span>
                      {r.pool > 0 && <span className="text-xs text-slate-500">{tr.pool(moneyText(r.pool))}</span>}
                      <span className={`ms-auto text-xs ${r.state === "posted" ? "text-emerald-600 dark:text-emerald-300" : r.state === "due" ? "text-slate-500" : "text-amber-700 dark:text-amber-300"}`}>{tr.state(r.state)}</span>
                    </p>
                    {r.split.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{r.split.map((s) => `${labelOf(rule?.dimension, s.value)} ${moneyText(s.amount)}`).join(" · ")}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
