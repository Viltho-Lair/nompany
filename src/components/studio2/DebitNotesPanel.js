"use client";

// THE DEBIT NOTES (04/10/2026) — raised, issued and cancelled here, the mirror
// of ./CreditNotesPanel. Unlike a credit note, nothing else raises one (a
// return gives money back; nothing takes more), so the screen carries the form.
// Issuing is what posts and makes the extra owed; the server decides who may.

import { useCallback, useState } from "react";
import { debitNotesDict } from "@/shared/studio/debitNotes";
import { useReload } from "@/components/studio2/useReload";
import Link from "next/link";
import { btn, btnGhost, btnRow, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { useMoney } from "@/components/studio2/studioCurrency";

export default function DebitNotesPanel({ slug, locale = "en", canManage = false, invoices = [] }) {
  const money = useMoney();
  const tr = debitNotesDict(locale);
  const [rows, setRows] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/debit-notes`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(tr.refusal(body.error || "", body)); return; }
    setRows([...(body.debitNotes || [])].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
  }, [slug, tr]);
  useReload(load);

  async function call(method, payload) {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/debit-notes`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(tr.refusal(body.error || "", body)); return false; }
    await load();
    return true;
  }

  // ONLY AN ISSUED INVOICE CAN BE ADDED TO — a draft is edited (./debitNotes).
  const issued = invoices.filter((i) => i.status !== "Draft" && i.status !== "Cancelled");

  if (!rows) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      {problem && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}

      {canManage && !form && (
        <button type="button" className={btn} onClick={() => setForm({ invoiceId: "", amount: "", reason: "" })}>{tr.raise}</button>
      )}
      {canManage && form && (
        <div className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-3 dark:border-white/10">
          <Field label={tr.invoice} as="select" value={form.invoiceId}
            options={issued.map((i) => ({ value: i.id, label: `${i.reference} · ${i.clientName}` }))}
            onChange={(v) => setForm((f) => ({ ...f, invoiceId: v }))} />
          <Field label={tr.amount} hint={tr.amountHint} type="number" currency value={form.amount}
            onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
          <Field label={tr.reason} hint={tr.reasonHint} value={form.reason}
            onChange={(v) => setForm((f) => ({ ...f, reason: v }))} />
          <div className="flex gap-2 sm:col-span-3">
            <button type="button" className={btn} disabled={busy || !form.invoiceId || !(Number(form.amount) > 0) || !form.reason.trim()}
              onClick={async () => { if (await call("POST", { ...form, amount: Number(form.amount) })) setForm(null); }}>{tr.save}</button>
            <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{tr.empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="py-2.5 pe-3 font-mono">{n.reference}</td>
                  <td className="py-2.5 pe-3">{tr.against(n.invoiceReference)}{n.clientName ? ` · ${n.clientName}` : ""}</td>
                  <td className="py-2.5 pe-3 text-slate-500 dark:text-slate-400">{n.reason}</td>
                  <td className="py-2.5 pe-3 text-slate-500 dark:text-slate-400">{n.issueDate ? fmtDate(n.issueDate) : ""}</td>
                  <td className="num py-2.5 pe-3 text-end">{money(n.amount)}</td>
                  <td className="py-2.5 pe-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-600 text-slate-600 dark:bg-white/10 dark:text-slate-300">{tr.status(n.status)}</span>
                  </td>
                  <td className="py-2.5 text-end">
                    {/* PRINT IS A READER'S ACT, at any status — a draft prints with its
                        watermark — through the studio's layout for this type. */}
                    <Link className={btnRow} href={`/${slug}/print/debitNote/${n.id}`}>{tr.print}</Link>
                    {canManage && n.status === "Draft" && (
                      <span className="inline-flex gap-2">
                        <button type="button" className={btn} disabled={busy} onClick={() => call("PATCH", { id: n.id, action: "issue" })}>{tr.issue}</button>
                        <button type="button" className={btnGhost} disabled={busy} onClick={() => call("PATCH", { id: n.id, action: "cancel" })}>{tr.cancel}</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
