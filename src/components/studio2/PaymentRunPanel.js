"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { moneyText } from "@/shared/money";
import { fmtDate } from "@/lib/format";
import { paymentRunDict } from "@/shared/studio/paymentRun";

// PAYABLES → PAYMENT RUN (modules/finance/paymentRun). The approved bills due
// by a date; the chosen ones paid together, each through the bill's own pay
// door. The result of every run is kept, including what it could not pay.
const th = "py-2 text-start text-[12px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500";

export default function PaymentRunPanel({ slug, locale }) {
  const tr = paymentRunDict(locale);
  const [dueBy, setDueBy] = useState("");
  const [payOn, setPayOn] = useState("");
  const [accountId, setAccountId] = useState("");
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const q = dueBy ? `?dueBy=${encodeURIComponent(dueBy)}` : "";
    const res = await fetch(`/api/studios/${slug}/finance/payment-runs${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(tr.problem(String(body.error || ""))); return; }
    setProblem(""); setData(body);
    // EVERYTHING PAYABLE STARTS CHOSEN; a held bill never is.
    setPicked(new Set((body.candidates || []).filter((c) => !c.held).map((c) => c.id)));
  }, [slug, dueBy, tr]);
  useReload(load);
  useLiveUpdates(slug, "finance-payables", load);

  if (!data) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : <p className="text-sm text-slate-500">…</p>;
  const { candidates = [], runs = [], moneyAccounts = [], canPay } = data;
  const chosen = candidates.filter((c) => picked.has(c.id) && !c.held);
  const totals = {};
  for (const c of chosen) totals[c.currency || ""] = (totals[c.currency || ""] || 0) + c.outstanding;
  const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const pay = async () => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/payment-runs`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billIds: chosen.map((c) => c.id), date: payOn, accountId }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(tr.problem(String(body.error || ""))); return; }
    await load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.title}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>
      {problem && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <Field label={tr.dueBy} type="date" className="w-44" value={dueBy || data.dueBy} onChange={(v) => setDueBy(v)} />
      </div>
      {candidates.length === 0 ? <p className="text-sm text-slate-400">{tr.none}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr>
              <th className={th} /><th className={th}>{tr.bill}</th><th className={th}>{tr.supplier}</th>
              <th className={th}>{tr.due}</th><th className={th}>{tr.amount}</th>
            </tr></thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 text-slate-700 dark:border-white/10 dark:text-slate-200">
                  <td className="py-2 pe-2">
                    {canPay && !c.held && <input type="checkbox" aria-label={c.reference} checked={picked.has(c.id)} onChange={() => toggle(c.id)} />}
                  </td>
                  <td className="py-2 pe-3 font-mono text-xs">{c.reference}</td>
                  <td className="py-2 pe-3">
                    {c.vendorName}
                    {c.held && <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-600 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{tr.held}</span>}
                  </td>
                  <td className="py-2 pe-3">{c.dueDate ? fmtDate(c.dueDate) : tr.undated}</td>
                  <td className="num py-2 pe-3">{moneyText(c.outstanding, c.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canPay && candidates.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 rounded-geex border border-slate-200 p-3 dark:border-white/10">
          <Field label={tr.payOn} type="date" className="w-44" value={payOn} onChange={(v) => setPayOn(v)} />
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            {tr.from}
            <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#191921] dark:text-white"
              value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">{tr.defaultBank}</option>
              {moneyAccounts.filter((a) => a.code !== "1010").map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
          </label>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {tr.total}: {Object.entries(totals).map(([cur, n]) => moneyText(n, cur)).join(" + ") || moneyText(0)}
          </p>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy || chosen.length === 0} onClick={pay}>{tr.pay(chosen.length)}</button>
        </div>
      )}
      {runs.length > 0 && (
        <div>
          <h4 className="text-xs font-600 text-slate-500 dark:text-slate-400">{tr.history}</h4>
          <ul className="mt-1 space-y-2">
            {runs.map((r) => {
              const paid = r.lines.filter((l) => l.outcome === "paid").length;
              return (
                <li key={r.id} className="text-sm text-slate-700 dark:text-slate-200">
                  <p>{tr.runOn(fmtDate(r.date), paid, r.lines.length - paid)}</p>
                  <ul className="ms-4 text-xs text-slate-500 dark:text-slate-400">
                    {r.lines.map((l) => (
                      <li key={l.billId}>{l.reference} {l.vendorName} · {moneyText(l.amount, l.currency)} · {tr.outcome(l.outcome)}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
