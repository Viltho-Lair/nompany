"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { moneyText } from "@/shared/money";
import { schedulesDict } from "@/shared/studio/schedules";

// LEDGER → SCHEDULES (modules/finance/schedules). Revenue over time and
// prepayments: a schedule moves its amount out of the P&L on its day, and a
// monthly run brings each month's share back. Previewed before it posts, like
// the depreciation run.
const ghost = "rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300";
const primary = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50";
const blank = { kind: "revenue", accountId: "", amount: "", from: "", months: "12", deferredOn: "", description: "", reference: "" };

export default function SchedulesPanel({ slug, locale }) {
  const tr = schedulesDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [run, setRun] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/schedules`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(String(body.error || "failed")); return; }
    setProblem(""); setData(body);
  }, [slug]);
  useReload(load);
  useLiveUpdates(slug, "finance-ledger", load);

  const post = async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/schedules`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(String(body.error || ""))); return null; }
    return body;
  };

  if (!data) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : <p className="text-sm text-slate-500">…</p>;
  const { schedules = [], accounts = [], canPost } = data;
  const accountName = (id) => { const a = accounts.find((x) => x.id === id); return a ? `${a.code} ${a.name}` : ""; };
  const kindAccounts = (kind) => accounts.filter((a) => a.type === (kind === "revenue" ? "income" : "expense"));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.title}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>
      {problem && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}

      {schedules.length === 0 ? <p className="text-sm text-slate-400">{tr.none}</p> : (
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-600 text-slate-900 dark:text-white">{s.description || s.reference || tr.kinds[s.kind]}</span>
                {s.reference && <span className="font-mono text-xs text-slate-400">{s.reference}</span>}
                <span className="text-xs text-slate-500 dark:text-slate-400">{tr.kinds[s.kind]} · {accountName(s.accountId)} · {tr.window(s.from, s.to)}</span>
                <span className="num ms-auto">{moneyText(s.amount)}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {s.status === "cancelled" ? tr.cancelled : tr.progress(s.monthsDone, s.months, moneyText(s.recognised), moneyText(s.remaining))}
                {s.status === "active" && !s.deferred && <span className="ms-2 text-amber-700 dark:text-amber-300">{tr.notDeferred}</span>}
              </p>
              {canPost && s.status === "active" && s.monthsDone === 0 && (
                <button className={`${ghost} mt-1`} disabled={busy}
                  onClick={async () => { if (await post({ action: "cancel", id: s.id })) await load(); }}>{tr.cancelSchedule}</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canPost && !draft && <button className={ghost} onClick={() => setDraft({ ...blank })}>{tr.newSchedule}</button>}
      {draft && (
        <div className="flex flex-wrap items-end gap-2 rounded-geex border border-slate-200 p-3 dark:border-white/10">
          <Field label={tr.kind} as="select" required className="w-56" value={draft.kind}
            options={Object.entries(tr.kinds).map(([value, label]) => ({ value, label }))}
            onChange={(v) => setDraft({ ...draft, kind: v, accountId: "" })} />
          <Field label={tr.account} as="select" className="w-64" value={draft.accountId}
            options={kindAccounts(draft.kind).map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))}
            onChange={(v) => setDraft({ ...draft, accountId: v })} />
          <Field label={tr.amount} type="number" className="w-36" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} />
          <Field label={tr.from} type="month" className="w-44" value={draft.from} onChange={(v) => setDraft({ ...draft, from: v })} />
          <Field label={tr.months} type="number" className="w-28" value={draft.months} onChange={(v) => setDraft({ ...draft, months: v })} />
          <Field label={tr.deferredOn} type="date" className="w-44" value={draft.deferredOn} onChange={(v) => setDraft({ ...draft, deferredOn: v })} />
          <Field label={tr.description} className="w-64" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
          <Field label={tr.reference} className="w-40" value={draft.reference} onChange={(v) => setDraft({ ...draft, reference: v })} />
          <button className={primary} disabled={busy}
            onClick={async () => {
              if (await post({ action: "create", ...draft, amount: Number(draft.amount), months: Number(draft.months) })) { setDraft(null); await load(); }
            }}>{tr.create}</button>
          <button className={ghost} onClick={() => setDraft(null)}>{tr.cancel}</button>
        </div>
      )}

      <div className="space-y-2 rounded-geex border border-slate-200/70 p-4 dark:border-white/10">
        <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.runTitle}</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.runLead}</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label={tr.period} type="month" className="w-44" value={period} onChange={(v) => { setPeriod(v); setRun(null); }} />
          <button className={ghost} disabled={busy} onClick={async () => { const r = await post({ action: "run", period }); if (r) setRun(r); }}>{tr.preview}</button>
          {canPost && run && run.rows.some((r) => r.state === "due") && (
            <button className={primary} disabled={busy}
              onClick={async () => { const r = await post({ action: "run", period, post: true }); if (r) { setRun(r); await load(); } }}>
              {tr.post(run.rows.filter((r) => r.state === "due").length)}
            </button>
          )}
        </div>
        {run && (run.rows.length === 0 ? <p className="text-sm text-slate-400">{tr.nothingDue}</p> : (
          <ul className="space-y-0.5 text-sm">
            {run.rows.map((r) => (
              <li key={`${r.scheduleId}:${r.period}`} className="flex flex-wrap gap-2 text-slate-700 dark:text-slate-200">
                <span className="font-mono text-xs text-slate-400">{r.period}</span>
                <span>{r.description}</span>
                <span className="num ms-auto">{moneyText(r.share)}</span>
                <span className={`text-xs ${r.state === "posted" ? "text-emerald-600 dark:text-emerald-300" : r.state === "due" ? "text-slate-500" : "text-amber-700 dark:text-amber-300"}`}>{tr.state(r.state)}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
