"use client";

// THE CREDIT NOTES, and the one door that issues them (18/09/2026).
//
// THE ROUTE AND THE RULES WERE BUILT AND NOTHING ON SCREEN CALLED THEM, so a
// note could be raised only through the API and never issued by anybody —
// invariant 16 from the screen's end. A signed return against an invoice now
// raises one as a DRAFT (modules/sales/posReturns), which made the gap a dead
// end: a draft nobody could issue. This is the screen. Issuing is what posts
// to the ledger, and it answers to Finance's own right on the server.

import { useCallback, useState } from "react";
import { creditNotesDict } from "@/shared/studio/creditNotes";
import { useReload } from "@/components/studio2/useReload";
import { btn, btnGhost, money, fmtDate } from "@/components/studio2/ui";

export default function CreditNotesPanel({ slug, locale = "en", canManage = false }) {
  const tr = creditNotesDict(locale);
  const [rows, setRows] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/credit-notes`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(tr.refusal(body.error || "", body)); return; }
    setRows([...(body.creditNotes || [])].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
  }, [slug, tr]);
  useReload(load);

  async function act(id, action) {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/credit-notes`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(tr.refusal(body.error || "", body)); return; }
    load();
  }

  if (!rows) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      {problem && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}
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
                    {canManage && n.status === "Draft" && (
                      <span className="inline-flex gap-2">
                        <button type="button" className={btn} disabled={busy} onClick={() => act(n.id, "issue")}>{tr.issue}</button>
                        <button type="button" className={btnGhost} disabled={busy} onClick={() => act(n.id, "cancel")}>{tr.cancel}</button>
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
