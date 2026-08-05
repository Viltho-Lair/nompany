"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

function fmtDate(v) { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); } }
function fmtMoney(v) { if (v == null || v === "") return "—"; const n = Number(v); return Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " SAR" : String(v); }

// All columns Finance can show. `core` ones are on by default.
const COLUMNS = [
  { key: "poNumber", label: "PO Number", core: true, get: (p) => p.poNumber || "—" },
  { key: "quotationNumber", label: "Quotation Number", core: true, get: (p) => p.quotationNumber || "—" },
  { key: "title_en", label: "Project Title", core: true, get: (p) => p.title_en || "—" },
  { key: "clientName", label: "Client", core: true, get: (p) => p.clientName || "—" },
  { key: "dealValue", label: "Value", core: true, get: (p) => fmtMoney(p.dealValue) },
  { key: "projectNumber", label: "Project Number", core: true, get: (p) => p.projectNumber || "—" },
  { key: "ownerLabel", label: "Project Manager", core: true, get: (p) => p.ownerLabel || "—" },
  { key: "ticketRef", label: "Ticket Ref", core: false, get: (p) => p.ticketRef || "—" },
  { key: "industry", label: "Industry", core: false, get: (p) => p.industry || "—" },
  { key: "urgency", label: "Urgency", core: false, get: (p) => p.urgency || "—" },
  { key: "stage", label: "Stage", core: false, get: (p) => p.stage || "—" },
  { key: "contactName", label: "Contact", core: false, get: (p) => p.contactName || "—" },
  { key: "deadline", label: "Deadline", core: false, get: (p) => fmtDate(p.deadline) },
  { key: "ticketCreatedAt", label: "Ticket date", core: false, get: (p) => fmtDate(p.ticketCreatedAt) },
  { key: "quotationCompletedAt", label: "Quotation date", core: false, get: (p) => fmtDate(p.quotationCompletedAt) },
  { key: "approvedAt", label: "Approved date", core: false, get: (p) => fmtDate(p.approvedAt) },
];

export default function FinanceProjects() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [poFilter, setPoFilter] = useState("all"); // all | issued | awaiting
  const [visible, setVisible] = useState(() => new Set(COLUMNS.filter((c) => c.core).map((c) => c.key)));
  const [showCols, setShowCols] = useState(false);
  const [edit, setEdit] = useState(null); // project being edited
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load projects.");
      setRows(await res.json());
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shownColumns = COLUMNS.filter((c) => visible.has(c.key));
  const toggleCol = (key) => setVisible((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((p) => {
        if (poFilter === "issued" && !p.projectNumber) return false;
        if (poFilter === "awaiting" && p.projectNumber) return false;
        if (!q) return true;
        return `${p.title_en} ${p.clientName} ${p.quotationNumber} ${p.poNumber} ${p.projectNumber} ${p.ticketRef} ${p.ownerLabel}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (b.approvedAt || b.id || "").localeCompare(a.approvedAt || a.id || ""));
  }, [rows, query, poFilter]);

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/finance-projects/${edit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poNumber: edit.poNumber || "", projectNumber: edit.projectNumber || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEdit(null);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">Approved projects with their PO and finance details. {filtered.length} of {rows.length}.</p>
        <div className="relative">
          <button onClick={() => setShowCols((v) => !v)} className={btnGhost}><Icon name="settings" className="h-4 w-4" /> Columns</button>
          {showCols && (
            <div className="absolute end-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#20202c]">
              <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-400">Show columns</p>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {COLUMNS.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={visible.has(c.key)} onChange={() => toggleCol(c.key)} className="h-4 w-4 rounded border-slate-300 accent-brand-600 dark:border-white/20" />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <input type="search" placeholder="Search PO, quotation, project number, client…" value={query} onChange={(e) => setQuery(e.target.value)} className={`${input} max-w-md`} />
        <select value={poFilter} onChange={(e) => setPoFilter(e.target.value)} className={`${input} max-w-[16rem]`}>
          <option value="all">All projects</option>
          <option value="awaiting">Awaiting project number</option>
          <option value="issued">Project number issued</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-geex border border-slate-200/70 shadow-geex-sm bg-white dark:border-white/10 dark:bg-[#20202c]">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{rows.length === 0 ? "No projects yet." : "No projects match."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  {shownColumns.map((c) => (<th key={c.key} className="px-4 py-3.5 text-start font-600">{c.label}</th>))}
                  <th className="px-4 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]">
                    {shownColumns.map((c) => (
                      <td key={c.key} className={`px-4 py-3.5 ${c.key === "title_en" ? "font-600 text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>{c.get(p)}</td>
                    ))}
                    <td className="px-4 py-3.5 text-end">
                      <button onClick={() => setEdit({ id: p.id, title_en: p.title_en, poNumber: p.poNumber || "", projectNumber: p.projectNumber || "", poFileUrl: p.poFileUrl })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-600 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"><Icon name="pencil" className="h-3.5 w-3.5" /> Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={() => setEdit(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 font-display text-lg font-700 text-slate-900 dark:text-white">Finance details</h2>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{edit.title_en}</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">PO Number</label>
                <input className={input} value={edit.poNumber} onChange={(e) => setEdit((s) => ({ ...s, poNumber: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Project Number</label>
                <input className={input} value={edit.projectNumber} onChange={(e) => setEdit((s) => ({ ...s, projectNumber: e.target.value }))} />
              </div>
              {edit.poFileUrl && (
                <a href={edit.poFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-600 text-brand-700 hover:underline dark:text-brand-300"><Icon name="open" className="h-4 w-4" /> View submitted PO</a>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEdit(null)} className={btnGhost}>Cancel</button>
              <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
