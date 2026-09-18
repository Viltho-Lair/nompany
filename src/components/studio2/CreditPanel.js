"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { moneyText } from "@/shared/money";
import { fmtDate } from "@/lib/format";
import { creditDict } from "@/shared/studio/credit";

// RECEIVABLES → CREDIT and → REMINDERS (modules/finance/credit). One read serves
// both tabs; `tab` picks which half is drawn.
const money = (n, c) => moneyText(n, c);

export default function CreditPanel({ slug, locale, tab }) {
  const tr = creditDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/receivables`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(tr.problem(String(body.error || ""))); return; }
    setProblem(""); setData(body);
  }, [slug, tr]);
  useReload(load);
  // Invoices are filed under Cash; the credit rows and notices under Receivables.
  useLiveUpdates(slug, "finance-cash", load);
  useLiveUpdates(slug, "finance-receivables", load);

  const post = useCallback(async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/receivables`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(String(body.error || ""))); return null; }
    await load();
    return body;
  }, [slug, load, tr]);

  if (!data) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : <p className="text-sm text-slate-500">…</p>;
  return (
    <div className="space-y-4">
      {problem && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}
      {tab === "credit"
        ? <Credit tr={tr} data={data} busy={busy} post={post} />
        : <Dunning tr={tr} data={data} busy={busy} post={post} />}
    </div>
  );
}

const th = "py-2 text-start text-[12px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500";
const ghost = "rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300";

function Credit({ tr, data, busy, post }) {
  const [editing, setEditing] = useState(null);
  const { customers = [], canManage } = data;
  const open = (c) => setEditing({
    id: c?.id || "", clientName: c?.clientName || "", limit: c?.limit ?? "", onHold: Boolean(c?.onHold), note: c?.note || "", fixed: Boolean(c),
  });
  const save = async () => {
    const body = { clientName: editing.clientName, limit: editing.limit === "" ? null : editing.limit, onHold: editing.onHold, note: editing.note };
    if (await post({ action: "credit", ...body })) setEditing(null);
  };
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.creditTitle}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.creditLead}</p>
      </div>
      {customers.length === 0 ? <p className="text-sm text-slate-400">{tr.noCustomers}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead><tr>
              <th className={th}>{tr.customer}</th><th className={th}>{tr.owes}</th><th className={th}>{tr.overdue}</th>
              <th className={th}>{tr.limit}</th><th className={th}>{tr.headroom}</th><th />
            </tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.key} className="border-t border-slate-100 text-slate-700 dark:border-white/10 dark:text-slate-200">
                  <td className="py-2 pe-3">
                    {c.clientName}
                    {c.onHold && <span className="ms-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-600 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{tr.onHold}</span>}
                  </td>
                  <td className="num py-2 pe-3">{money(c.outstanding)}</td>
                  <td className={`num py-2 pe-3 ${c.overdue > 0 ? "text-amber-700 dark:text-amber-300" : ""}`}>{money(c.overdue)}</td>
                  <td className="num py-2 pe-3">{c.limit === null ? tr.noLimit : money(c.limit)}</td>
                  {/* HEADROOM IS A DASH WITH NO LIMIT — "unlimited" and "nought left" must not read alike. */}
                  <td className={`num py-2 pe-3 ${c.headroom !== null && c.headroom < 0 ? "text-rose-600 dark:text-rose-300" : ""}`}>{c.headroom === null ? tr.none : money(c.headroom)}</td>
                  <td className="py-2 text-end">
                    {canManage && <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300" onClick={() => open(c)}>{tr.edit}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canManage && !editing && <button className={ghost} onClick={() => open(null)}>{tr.addCustomer}</button>}
      {editing && (
        <div className="flex flex-wrap items-end gap-2 rounded-geex border border-slate-200 p-3 dark:border-white/10">
          <Field label={tr.customer} className="w-64" value={editing.clientName} disabled={editing.fixed}
            onChange={(v) => setEditing({ ...editing, clientName: v })} />
          <Field label={tr.limit} type="number" className="w-40" value={String(editing.limit)}
            onChange={(v) => setEditing({ ...editing, limit: v })} />
          <Field label={tr.note} className="w-64" value={editing.note} onChange={(v) => setEditing({ ...editing, note: v })} />
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={editing.onHold} onChange={(e) => setEditing({ ...editing, onHold: e.target.checked })} />
            {tr.hold}
          </label>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy || !editing.clientName.trim()} onClick={save}>{tr.save}</button>
          {editing.id && (
            <button className={ghost} disabled={busy}
              onClick={async () => { if (await post({ action: "credit-remove", id: editing.id })) setEditing(null); }}>{tr.remove}</button>
          )}
          <button className={ghost} onClick={() => setEditing(null)}>{tr.cancel}</button>
        </div>
      )}
    </section>
  );
}

function Dunning({ tr, data, busy, post }) {
  const { overdue = [], dunningDays = [], canManage } = data;
  const [picked, setPicked] = useState(() => new Set());
  const [shown, setShown] = useState("");
  const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const letterFor = (i) => tr.letter({
    level: i.levelDue || i.sent || 1, reference: i.reference, clientName: i.clientName,
    amount: money(i.outstanding, i.currency), dueDate: fmtDate(i.dueDate), daysLate: i.daysLate,
  });
  const letter = shown ? overdue.find((x) => x.id === shown) : null;
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.dunningTitle}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.dunningLead(dunningDays)}</p>
      </div>
      {overdue.length === 0 ? <p className="text-sm text-slate-400">{tr.noOverdue}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead><tr>
              <th className={th} /><th className={th}>{tr.invoice}</th><th className={th}>{tr.customer}</th><th className={th}>{tr.daysLate}</th>
              <th className={th}>{tr.outstanding}</th><th className={th}>{tr.sent}</th><th className={th}>{tr.due}</th><th />
            </tr></thead>
            <tbody>
              {overdue.map((i) => (
                <tr key={i.id} className="border-t border-slate-100 text-slate-700 dark:border-white/10 dark:text-slate-200">
                  <td className="py-2 pe-2">
                    {canManage && i.levelDue > 0 && <input type="checkbox" aria-label={i.reference} checked={picked.has(i.id)} onChange={() => toggle(i.id)} />}
                  </td>
                  <td className="py-2 pe-3 font-mono text-xs">{i.reference}</td>
                  <td className="py-2 pe-3">{i.clientName}</td>
                  <td className="num py-2 pe-3">{i.daysLate}</td>
                  <td className="num py-2 pe-3">{money(i.outstanding, i.currency)}</td>
                  <td className="py-2 pe-3">{i.sent ? `${tr.level(i.sent)} · ${fmtDate(i.lastSentOn)}` : tr.none}</td>
                  <td className="py-2 pe-3">{i.levelDue ? <span className="font-600 text-amber-700 dark:text-amber-300">{tr.level(i.levelDue)}</span> : tr.nothingDue}</td>
                  <td className="py-2 text-end">
                    <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                      onClick={() => setShown(shown === i.id ? "" : i.id)}>{tr.copy}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {letter && (
        <div className="space-y-2">
          <textarea readOnly className="h-48 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 dark:border-white/15 dark:bg-[#191921] dark:text-slate-100"
            value={letterFor(letter)} />
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
            onClick={() => { try { navigator.clipboard.writeText(letterFor(letter)); } catch { /* the text is selectable */ } }}>{tr.copy}</button>
        </div>
      )}
      {canManage && overdue.some((i) => i.levelDue > 0) && (
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50" disabled={busy || picked.size === 0}
          onClick={async () => { if (await post({ action: "dunning", invoiceIds: [...picked] })) setPicked(new Set()); }}>
          {tr.record(picked.size)}
        </button>
      )}
    </section>
  );
}
