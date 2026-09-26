"use client";

import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { moneyText } from "@/shared/money";
import { leasesDict } from "@/shared/studio/leases";

// FIXED ASSETS → LEASES (IFRS 16, modules/finance/leases). The register, and
// the month's run that depreciates, charges interest and records the payment —
// previewed before it posts, like the depreciation run beside it.
const ghost = "rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300";
const primary = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50";
const blank = { name: "", lessor: "", start: "", termMonths: "36", payment: "", timing: "arrears", annualRate: "", accountId: "" };

export default function LeasesPanel({ slug, locale }) {
  const tr = leasesDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [run, setRun] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/leases`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(String(body.error || "failed")); return; }
    setProblem(""); setData(body);
  }, [slug]);
  useReload(load);
  useLiveUpdates(slug, "finance-assets", load);

  const post = async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/leases`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(String(body.error || ""))); return null; }
    return body;
  };

  if (!data) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : <ScreenSkeleton />;
  const { leases = [], moneyAccounts = [], canCreate, canRun } = data;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.title}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>
      {problem && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}

      {leases.length === 0 ? <p className="text-sm text-slate-400">{tr.none}</p> : (
        <ul className="space-y-2">
          {leases.map((l) => (
            <li key={l.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-600 text-slate-900 dark:text-white">{l.name}</span>
                {l.lessor && <span className="text-xs text-slate-500 dark:text-slate-400">{l.lessor}</span>}
                <span className="text-xs text-slate-500 dark:text-slate-400">{tr.window(l.start.slice(0, 7), l.end)} · {moneyText(l.payment)} · {tr.timings[l.timing]} · {l.annualRate}%</span>
                {l.due > 0 && <span className="ms-auto text-xs font-600 text-amber-700 dark:text-amber-300">{tr.dueNow(l.due)}</span>}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {tr.summary(moneyText(l.initial), moneyText(l.liability), l.monthsDone, l.termMonths)}
                {!l.recognised && <span className="ms-2 text-amber-700 dark:text-amber-300">{tr.notRecognised}</span>}
              </p>
              {canRun && l.monthsDone === 0 && (
                <button className={`${ghost} mt-1`} disabled={busy}
                  onClick={async () => { if (await post({ action: "remove", id: l.id })) await load(); }}>{tr.remove}</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canCreate && !draft && <button className={ghost} onClick={() => setDraft({ ...blank })}>{tr.newLease}</button>}
      {draft && (
        <div className="flex flex-wrap items-end gap-2 rounded-geex border border-slate-200 p-3 dark:border-white/10">
          <Field label={tr.name} className="w-56" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <Field label={tr.lessor} className="w-48" value={draft.lessor} onChange={(v) => setDraft({ ...draft, lessor: v })} />
          <Field label={tr.start} type="date" className="w-44" value={draft.start} onChange={(v) => setDraft({ ...draft, start: v })} />
          <Field label={tr.term} type="number" className="w-28" value={draft.termMonths} onChange={(v) => setDraft({ ...draft, termMonths: v })} />
          <Field label={tr.payment} type="number" className="w-36" value={draft.payment} onChange={(v) => setDraft({ ...draft, payment: v })} />
          <Field label={tr.timing} as="select" required className="w-56" value={draft.timing}
            options={Object.entries(tr.timings).map(([value, label]) => ({ value, label }))} onChange={(v) => setDraft({ ...draft, timing: v })} />
          <Field label={tr.rate} type="number" className="w-40" value={draft.annualRate} onChange={(v) => setDraft({ ...draft, annualRate: v })} />
          <Field label={tr.paidFrom} as="select" required className="w-56" value={draft.accountId}
            options={[{ value: "", label: tr.defaultBank }, ...moneyAccounts.filter((a) => a.code !== "1010").map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))]}
            onChange={(v) => setDraft({ ...draft, accountId: v })} />
          <button className={primary} disabled={busy}
            onClick={async () => {
              const body = { action: "create", ...draft, termMonths: Number(draft.termMonths), payment: Number(draft.payment), annualRate: Number(draft.annualRate) };
              if (await post(body)) { setDraft(null); await load(); }
            }}>{tr.create}</button>
          <button className={ghost} onClick={() => setDraft(null)}>{tr.cancel}</button>
        </div>
      )}

      {leases.length > 0 && (
        <div className="space-y-2 rounded-geex border border-slate-200/70 p-4 dark:border-white/10">
          <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.runTitle}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.runLead}</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={tr.period} type="month" className="w-44" value={period} onChange={(v) => { setPeriod(v); setRun(null); }} />
            <button className={ghost} disabled={busy} onClick={async () => { const r = await post({ action: "run", period }); if (r) setRun(r); }}>{tr.preview}</button>
            {canRun && run && run.rows.some((r) => r.state === "due") && (
              <button className={primary} disabled={busy}
                onClick={async () => { const r = await post({ action: "run", period, post: true }); if (r) { setRun(r); await load(); } }}>
                {tr.post(run.rows.filter((r) => r.state === "due").length)}
              </button>
            )}
          </div>
          {run && (run.rows.length === 0 ? <p className="text-sm text-slate-400">{tr.nothingDue}</p> : (
            <ul className="space-y-0.5 text-sm">
              {run.rows.map((r) => (
                <li key={`${r.leaseId}:${r.period}`} className="flex flex-wrap gap-2 text-slate-700 dark:text-slate-200">
                  <span className="font-mono text-xs text-slate-400">{r.period}</span>
                  <span>{r.name}</span>
                  <span className="text-xs text-slate-500">{tr.line(moneyText(r.payment), moneyText(r.interest), moneyText(r.depreciation))}</span>
                  <span className={`ms-auto text-xs ${r.state === "posted" ? "text-emerald-600 dark:text-emerald-300" : r.state === "due" ? "text-slate-500" : "text-amber-700 dark:text-amber-300"}`}>{tr.state(r.state)}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      )}
    </div>
  );
}
