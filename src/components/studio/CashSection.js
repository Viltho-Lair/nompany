"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import DateInput from "@/components/studio/DateInput";
import { TimelineChart } from "@/components/studio/MiniCharts";
import { confirmDialog } from "@/lib/appDialog";

const card = "rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const input = "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sar = (n) => `SAR ${new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0))}`;
// Up to 2 decimals (used for Remaining) — trailing zeros dropped: 100 → "100", 100.5 → "100.5".
const sar2 = (n) => `SAR ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0)}`;
const monthKey = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const monthLabel = (key) => { const [y, m] = key.split("-"); return `${MONTHS[Number(m) - 1]} ${y}`; };

export default function CashSection() {
  const [sheets, setSheets] = useState([]);
  const [refs, setRefs] = useState({ employees: [], projects: [], categories: [] });
  const [meId, setMeId] = useState("");
  const [meName, setMeName] = useState("");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [tab, setTab] = useState("main");          // "main" | sheetId
  const [drillProject, setDrillProject] = useState(null); // projectId | null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, rRes, meRes] = await Promise.all([
        fetch("/api/cash-sheets", { cache: "no-store" }),
        fetch("/api/cash-sheets/refs", { cache: "no-store" }),
        fetch("/api/users/me", { cache: "no-store" }),
      ]);
      if (sRes.status === 403) throw new Error("You don't have access to Cash.");
      setSheets(sRes.ok ? await sRes.json() : []);
      setRefs(rRes.ok ? await rRes.json() : { employees: [], projects: [], categories: [] });
      const meUser = meRes.ok ? (await meRes.json())?.user : null;
      setMeId(meUser?.id || "");
      setMeName(meUser?.fullName || meUser?.userId || "");
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const projById = useMemo(() => Object.fromEntries(refs.projects.map((p) => [p.id, p])), [refs.projects]);
  const empById = useMemo(() => Object.fromEntries(refs.employees.map((e) => [e.id, e])), [refs.employees]);

  // Year options = every year that has a sheet, plus the current year.
  const years = useMemo(() => {
    const set = new Set(sheets.map((s) => s.year));
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [sheets]);

  const sheetsForYear = useMemo(
    () => sheets.filter((s) => s.year === year).sort((a, b) => (a.index || 0) - (b.index || 0)),
    [sheets, year]
  );

  // Keep the active tab valid when the year changes.
  useEffect(() => {
    if (tab !== "main" && !sheetsForYear.some((s) => s.id === tab)) setTab("main");
  }, [sheetsForYear, tab]);

  async function addSheet() {
    setAdding(true); setError("");
    try {
      const res = await fetch("/api/cash-sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not add sheet");
      await load();
      setDrillProject(null);
      setTab(data.id);
    } catch (e) { setError(e.message); }
    finally { setAdding(false); }
  }

  const activeSheet = tab === "main" ? null : sheets.find((s) => s.id === tab) || null;

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;

  return (
    <div className="-mb-8 flex h-[calc(100vh-5rem)] min-h-[520px] flex-col gap-4">
      {error && <p className="shrink-0 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="min-w-0 flex-1 overflow-auto pr-1">
        {drillProject ? (
          <ProjectDrill
            projectId={drillProject}
            sheets={sheets}
            project={projById[drillProject]}
            empById={empById}
            onBack={() => setDrillProject(null)}
          />
        ) : tab === "main" ? (
          <MainView
            year={year} years={years} onYear={setYear}
            sheetsForYear={sheetsForYear} projById={projById}
            onOpenProject={(pid) => setDrillProject(pid)}
          />
        ) : activeSheet ? (
          <SheetGrid
            key={activeSheet.id}
            sheet={activeSheet}
            refs={refs}
            meId={meId}
            meName={meName}
            projById={projById}
            onSaved={load}
            onDeleted={() => { setTab("main"); load(); }}
          />
        ) : null}
      </div>

      {/* Bottom sheet bar: Main + this year's sheets + add */}
      <div className="z-10 flex shrink-0 flex-wrap items-center gap-1 rounded-t-geex border border-b-0 border-slate-200/70 bg-white p-2 shadow-[0_-8px_22px_-14px_rgba(20,30,72,0.16)] dark:border-white/10 dark:bg-[#20202c]">
        <button
          onClick={() => { setDrillProject(null); setTab("main"); }}
          className={`rounded-t-md border px-4 py-1.5 text-sm font-600 transition-colors ${tab === "main" && !drillProject ? "border-brand-500 bg-brand-500/10 text-brand-800 dark:border-brand-400 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:bg-[#191921] dark:text-slate-300 dark:hover:bg-white/5"}`}
        >
          Main
        </button>
        {sheetsForYear.map((s) => (
          <button
            key={s.id}
            onClick={() => { setDrillProject(null); setTab(s.id); }}
            className={`rounded-t-md border px-3 py-1.5 text-sm font-600 transition-colors ${tab === s.id && !drillProject ? "border-brand-500 bg-brand-500/10 text-brand-800 dark:border-brand-400 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:bg-[#191921] dark:text-slate-300 dark:hover:bg-white/5"}`}
          >
            {s.name}
          </button>
        ))}
        <button onClick={addSheet} disabled={adding} title={`Add a sheet for ${year}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-500/10 disabled:opacity-50 dark:text-brand-300" aria-label="Add sheet">
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---- Main analytics --------------------------------------------------------
function MainView({ year, years, onYear, sheetsForYear, projById, onOpenProject }) {
  const rows = useMemo(() => sheetsForYear.flatMap((s) => s.rows || []), [sheetsForYear]);

  const monthly = useMemo(() => {
    const totals = Array(12).fill(0);
    for (const r of rows) {
      const d = new Date(r.invoiceDate);
      if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) continue;
      totals[d.getMonth()] += Number(r.amount) || 0;
    }
    return MONTHS.map((label, i) => ({ label, value: totals[i] }));
  }, [rows, year]);

  const projectCards = useMemo(() => {
    const m = {};
    for (const r of rows) {
      if (!r.projectId || r.projectId === "__non__") continue; // skip unset + Non-Project
      const d = new Date(r.invoiceDate);
      if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) continue;
      m[r.projectId] = (m[r.projectId] || 0) + (Number(r.amount) || 0);
    }
    return Object.entries(m).map(([id, amount]) => ({ id, amount })).sort((a, b) => b.amount - a.amount);
  }, [rows, year]);

  const total = monthly.reduce((a, m) => a + m.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800 text-slate-900 dark:text-white">Cash</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Your spending for {year} · {sar(total)} total</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Year
          <select value={year} onChange={(e) => onYear(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-600 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-slate-100">
            {years.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </label>
      </div>

      <div className={`${card} p-5 text-brand-700 dark:text-brand-300`}>
        <p className="mb-3 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Spending by month · {year}</p>
        <TimelineChart data={monthly} ariaLabel="Monthly spending" />
      </div>

      <div>
        <p className="mb-3 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Project spending · {year}</p>
        {projectCards.length === 0 ? (
          <div className={`${card} p-10 text-center text-sm text-slate-400`}>No project spending recorded for {year} yet.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectCards.map(({ id, amount }) => {
              const p = projById[id];
              return (
                <button key={id} onClick={() => onOpenProject(id)} className={`${card} p-5 text-start transition-shadow hover:shadow-geex`}>
                  <p className="font-display text-xl font-800 text-slate-900 dark:text-white">{sar(amount)}</p>
                  <p className="mt-2 truncate text-sm font-600 text-slate-700 dark:text-slate-200">{p?.name || "Unknown project"}</p>
                  <p className="truncate text-xs text-slate-400">{p?.code || "No project number"}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Project lifetime spending drill-down ----------------------------------
function ProjectDrill({ projectId, sheets, project, empById, onBack }) {
  const [openMonth, setOpenMonth] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  // Every payment for this project across ALL the user's sheets/years.
  const payments = useMemo(() => {
    const out = [];
    for (const s of sheets) for (const r of s.rows || []) {
      if (r.projectId !== projectId) continue;
      const key = monthKey(r.invoiceDate);
      if (!key || !(Number(r.amount) > 0)) continue;
      out.push({ ...r, key });
    }
    return out;
  }, [sheets, projectId]);

  const months = useMemo(() => {
    const m = {};
    for (const p of payments) { (m[p.key] ||= { key: p.key, total: 0, items: [] }); m[p.key].total += Number(p.amount) || 0; m[p.key].items.push(p); }
    const arr = Object.values(m).sort((a, b) => a.key.localeCompare(b.key));
    return arr.map((row, i) => {
      const prev = i > 0 ? arr[i - 1].total : null;
      const pct = prev && prev > 0 ? ((row.total - prev) / prev) * 100 : null;
      return { ...row, pct, first: i === 0 };
    });
  }, [payments]);

  const chart = useMemo(() => months.map((m) => ({ label: monthLabel(m.key), value: m.total })), [months]);
  const total = months.reduce((a, m) => a + m.total, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" title="Back" aria-label="Back"><Icon name="arrowLeft" className="h-4 w-4" /></button>
          <div>
            <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">{project?.name || "Project"} spending</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{[project?.code, `${sar(total)} lifetime`].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <button onClick={() => setExportOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5">
          <Icon name="external" className="h-4 w-4" /> Export
        </button>
      </div>

      <div className={`${card} p-5 text-brand-700 dark:text-brand-300`}>
        <p className="mb-3 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Lifetime spending by month</p>
        {chart.length ? <TimelineChart data={chart} ariaLabel="Lifetime spending" /> : <p className="py-6 text-center text-sm text-slate-400">No spending recorded for this project yet.</p>}
      </div>

      <div className={`${card} divide-y divide-slate-100 dark:divide-white/5`}>
        {months.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No payments yet.</p>
        ) : months.map((m) => {
          const open = openMonth === m.key;
          const up = m.pct != null && m.pct > 0;
          const down = m.pct != null && m.pct < 0;
          return (
            <div key={m.key}>
              <button onClick={() => setOpenMonth(open ? null : m.key)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                <span className="flex items-center gap-2">
                  <Icon name="chevronDown" className={`h-4 w-4 text-slate-400 transition-transform ${open ? "" : "-rotate-90"}`} />
                  <span className="font-600 text-slate-800 dark:text-slate-100">{monthLabel(m.key)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-700 text-slate-900 dark:text-white">{sar(m.total)}</span>
                  {m.first ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-600 text-slate-500 dark:bg-white/10 dark:text-slate-400">First month</span>
                  ) : m.pct != null ? (
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-700 ${up ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" : down ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}>
                      {up ? "▲" : down ? "▼" : ""} {Math.abs(m.pct).toFixed(0)}%
                    </span>
                  ) : null}
                </span>
              </button>
              {open && (
                <div className="overflow-x-auto bg-slate-50/60 px-4 py-2 dark:bg-[#191921]/40">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="py-1.5 pe-3 text-start font-600">Date</th>
                        <th className="py-1.5 pe-3 text-start font-600">Category</th>
                        <th className="py-1.5 pe-3 text-start font-600">Description</th>
                        <th className="py-1.5 pe-3 text-start font-600">Paid by</th>
                        <th className="py-1.5 text-end font-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.items.map((it, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-white/5">
                          <td className="whitespace-nowrap py-1.5 pe-3 text-slate-600 dark:text-slate-300">{it.invoiceDate ? new Date(it.invoiceDate).toLocaleDateString("en-GB") : "—"}</td>
                          <td className="py-1.5 pe-3 text-slate-600 dark:text-slate-300">{it.category || "—"}</td>
                          <td className="py-1.5 pe-3 text-slate-600 dark:text-slate-300">{it.description || "—"}</td>
                          <td className="py-1.5 pe-3 text-slate-600 dark:text-slate-300">{empById[it.paidBy]?.username || empById[it.paidBy]?.name || "—"}</td>
                          <td className="whitespace-nowrap py-1.5 text-end font-600 text-slate-800 dark:text-slate-100">{sar(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </div>
  );
}

// Placeholder export dialog — content to be filled in later.
// REFERENCE: CashProjectExportModal
function ExportModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-geex border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">Export</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Icon name="close" className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Export options will be available here soon.</p>
      </div>
    </div>
  );
}

// ---- Data-entry sheet grid -------------------------------------------------
const NON_PROJECT = { value: "__non__", label: "Non Project" };

function SheetGrid({ sheet, refs, meId, meName, projById, onSaved, onDeleted }) {
  const [rows, setRows] = useState(() => sheet.rows || []);
  const [includeAll, setIncludeAll] = useState(!!sheet.includeAllProjects);
  const [notes, setNotes] = useState(sheet.notes || "");
  const [origin, setOrigin] = useState(sheet.origin === 0 ? 0 : (sheet.origin || ""));
  const [extraCash, setExtraCash] = useState(sheet.extraCash === 0 ? 0 : (sheet.extraCash || ""));
  const [locked, setLocked] = useState(!!sheet.locked);
  const [lockedAt, setLockedAt] = useState(sheet.lockedAt || "");
  const [nowTs, setNowTs] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false);

  const empById = useMemo(() => Object.fromEntries(refs.employees.map((e) => [e.id, e])), [refs.employees]);
  const projectOptions = useMemo(
    () => (includeAll ? refs.projects : refs.projects.filter((p) => p.ownerId === meId)).map((p) => ({ value: p.id, label: p.name, sub: p.code })),
    [includeAll, refs.projects, meId]
  );
  const categoryOptions = useMemo(() => refs.categories.map((c) => ({ value: c, label: c })), [refs.categories]);

  // Tick every second while locked so the 15-minute unlock countdown updates.
  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  const LOCK_MS = 15 * 60 * 1000;
  const lockRemaining = locked && lockedAt ? Math.max(0, LOCK_MS - (nowTs - new Date(lockedAt).getTime())) : 0;
  const canUnlock = locked && lockRemaining <= 0;
  const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

  const setCell = (i, patch) => { setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); setDirty(true); setSaved(false); };
  const total = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const remaining = (Number(origin) || 0) + (Number(extraCash) || 0) - total;
  const projLabel = (pid) => (pid === "__non__" ? "Non Project" : (projById[pid]?.name || ""));

  async function save() {
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/cash-sheets/${sheet.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows, includeAllProjects: includeAll, notes, origin, extraCash }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      setSaved(true); setDirty(false); setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function toggleLock() {
    if (locked && !canUnlock) return;
    const action = locked ? "unlock" : "lock";
    if (action === "lock" && dirty && !(await confirmDialog({ title: "Lock sheet", message: "Lock this sheet? You have unsaved changes — save first if you want them kept. A locked sheet can't be edited or unlocked for 15 minutes.", confirmLabel: "Lock anyway", tone: "danger" }))) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/cash-sheets/${sheet.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not change lock");
      setLocked(!!data.locked); setLockedAt(data.lockedAt || ""); setNowTs(Date.now());
      onSaved?.();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function del() {
    if (!(await confirmDialog({ title: "Delete sheet", message: `Delete ${sheet.name}? This can't be undone.`, confirmLabel: "Delete", tone: "danger" }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cash-sheets/${sheet.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete");
      onDeleted?.();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  // Print the sheet using the reference layout (logo · header · 7-col table · footer).
  function printSheet() {
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const today = new Date().toLocaleDateString("en-GB");
    const logo = `${window.location.origin}/brand/logo-full.png`;
    // Equal row height so the table exactly fills its 80% band: header + 28 rows
    // + total = 30 rows across the content area (297mm − 8mm top − 22mm bottom) × 80%.
    const rowH = (((297 - 30) * 0.80) / (rows.length + 2)).toFixed(2);
    const bodyRows = rows.map((r, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${r.invoiceDate ? esc(new Date(r.invoiceDate).toLocaleDateString("en-GB")) : ""}</td>
        <td>${esc(r.category)}</td>
        <td>${esc(r.description)}</td>
        <td>${esc(empById[r.paidBy]?.username || empById[r.paidBy]?.name || "")}</td>
        <td>${esc(projLabel(r.projectId))}</td>
        <td class="r">${r.amount === "" || r.amount == null ? "" : esc(new Intl.NumberFormat("en-US").format(Number(r.amount) || 0))}</td>
      </tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sheet.name)}</title>
      <style>
        @page{size:A4 portrait;margin:0;}
        *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        html,body{margin:0;padding:0;color:#111;}
        /* A4 split: header 20% · table 80% of the content area; footer overlays the bottom. */
        .page{position:relative;width:210mm;height:297mm;padding:8mm 8mm 22mm 8mm;display:flex;flex-direction:column;overflow:hidden;}
        .hdr{height:20%;display:flex;flex-direction:column;justify-content:center;}
        .mainarea{height:80%;overflow:hidden;}
        .foot{position:absolute;left:8mm;right:8mm;bottom:8mm;display:flex;align-items:flex-start;justify-content:space-between;font-size:13px;}
        .top{display:flex;justify-content:space-between;align-items:center;gap:12px;}
        .logo{max-height:84px;max-width:240px;object-fit:contain;}
        .mid{text-align:center;flex:1;}
        .mid .line{font-size:13px;margin:1px 0;}
        .notes{margin:6px auto 0;min-height:30px;max-width:260px;padding:2px;font-size:12px;text-align:left;}
        .right{font-size:13px;text-align:right;min-width:150px;}
        table{width:100%;height:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;}
        tr{height:${rowH}mm;}
        th,td{border:1px solid #333;padding:1px 4px;text-align:left;vertical-align:middle;word-wrap:break-word;overflow-wrap:break-word;}
        th{background:#022e72;color:#fff;}
        td.c,th.c{text-align:center;width:22px;} td.r,th.r{text-align:right;width:70px;}
        tfoot td{font-weight:bold;background:#eef2fb;}
      </style></head><body onload="window.print()">
      <div class="page">
        <div class="hdr">
          <div class="top">
            <div><img src="${logo}" class="logo" alt=""/></div>
            <div class="mid">
              <div class="line"><b>Sheet Name:</b> ${esc(sheet.name)}</div>
              <div class="line"><b>Date:</b> ${esc(today)}</div>
              <div class="notes"><b>Notes</b><br/>${esc(notes)}</div>
            </div>
            <div class="right">
              <div>Extra Cash: ${esc(new Intl.NumberFormat("en-US").format(Number(extraCash) || 0))}</div>
              <div>Origin: ${esc(new Intl.NumberFormat("en-US").format(Number(origin) || 0))}</div>
              <div>Remaining: ${esc(new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(remaining))}</div>
            </div>
          </div>
        </div>
        <div class="mainarea">
          <table>
            <thead><tr><th class="c">#</th><th>Invoice Date</th><th>Category</th><th>Description</th><th>Paid By</th><th>Projects</th><th class="r">Amount</th></tr></thead>
            <tbody>${bodyRows}</tbody>
            <tfoot><tr><td colspan="6">Total</td><td class="r">${esc(new Intl.NumberFormat("en-US").format(total))}</td></tr></tfoot>
          </table>
        </div>
        <div class="foot">
          <div>Prepared By: ${esc(meName || "")}</div>
          <div>Accounting:</div>
          <div>Approval:</div>
        </div>
      </div>
      </body></html>`;
    const w = window.open("", "_blank", "width=980,height=1100");
    if (!w) { setErr("Allow pop-ups to print this sheet."); return; }
    w.document.write(html); w.document.close(); w.focus();
  }

  const th = "whitespace-nowrap px-2 py-2 text-start text-[11px] font-600 uppercase tracking-wide text-slate-400";
  const numInput = "w-32 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-end text-slate-900 focus:border-brand-500 focus:outline-none disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">
            {sheet.name}{locked && <span className="ms-2 align-middle text-xs font-600 text-amber-600 dark:text-amber-400">🔒 Locked</span>}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{sar(total)} total · Remaining {sar2(remaining)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 ${locked ? "opacity-60" : ""}`}>
            <input type="checkbox" disabled={locked} checked={includeAll} onChange={(e) => { setIncludeAll(e.target.checked); setDirty(true); setSaved(false); }} className="h-4 w-4 rounded border-slate-300 text-brand-600 dark:border-white/20 dark:bg-[#191921]" />
            Include all projects
          </label>
          <button onClick={printSheet} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5" title="Print sheet"><Icon name="external" className="h-4 w-4" /> Print</button>
          <button
            onClick={toggleLock}
            disabled={busy || (locked && !canUnlock)}
            title={locked ? (canUnlock ? "Unlock sheet" : `Locked — unlock available in ${mmss(lockRemaining)}`) : "Lock sheet (read-only)"}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-600 transition-colors disabled:opacity-60 ${locked ? "border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10" : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"}`}
          >
            {locked ? (canUnlock ? "Unlock" : `Locked ${mmss(lockRemaining)}`) : "Lock"}
          </button>
          {!locked && <button onClick={del} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-2 text-sm font-600 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"><Icon name="trash" className="h-4 w-4" /></button>}
          {!locked && <button onClick={save} disabled={busy || !dirty} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2 text-sm font-600 text-white hover:bg-brand-950 disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>}
          {saved && <span className="text-sm font-600 text-emerald-600 dark:text-emerald-400">Saved.</span>}
        </div>
      </div>
      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

      {/* Sheet header — Notes + cash figures */}
      <div className={`${card} grid gap-4 p-4 sm:grid-cols-[1fr_auto]`}>
        <div>
          <label className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Notes</label>
          <textarea rows={2} disabled={locked} value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); setSaved(false); }} className={`${input} resize-y disabled:opacity-60`} />
        </div>
        <div className="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400">Origin</span>
          <input type="number" disabled={locked} value={origin} onChange={(e) => { setOrigin(e.target.value === "" ? "" : Number(e.target.value)); setDirty(true); setSaved(false); }} className={numInput} />
          <span className="text-slate-500 dark:text-slate-400">Extra Cash</span>
          <input type="number" disabled={locked} value={extraCash} onChange={(e) => { setExtraCash(e.target.value === "" ? "" : Number(e.target.value)); setDirty(true); setSaved(false); }} className={numInput} />
          <span className="font-600 text-slate-700 dark:text-slate-200">Remaining</span>
          <span className="text-end font-700 text-slate-900 dark:text-white">{sar2(remaining)}</span>
        </div>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-[#191921]">
              <th className={`${th} w-10 text-center`}>#</th>
              <th className={`${th} w-36`}>Invoice Date</th>
              <th className={`${th} w-40`}>Category</th>
              <th className={th}>Description</th>
              <th className={`${th} w-44`}>Paid By</th>
              <th className={`${th} w-56`}>Projects</th>
              <th className={`${th} w-32 text-end`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                <td className="px-2 py-1.5 text-center text-xs font-600 text-slate-400">{i + 1}</td>
                <td className="px-2 py-1.5"><DateInput className={input} disabled={locked} value={r.invoiceDate || ""} onChange={(v) => setCell(i, { invoiceDate: v })} /></td>
                <td className="px-2 py-1.5"><ComboSelect className={input} disabled={locked} value={r.category || ""} options={categoryOptions} placeholder="—" onChange={(v) => setCell(i, { category: v })} /></td>
                <td className="px-2 py-1.5"><input className={input} disabled={locked} value={r.description || ""} onChange={(e) => setCell(i, { description: e.target.value })} /></td>
                <td className="px-2 py-1.5">
                  <select className={`${input} disabled:opacity-60`} disabled={locked} value={r.paidBy || ""} onChange={(e) => setCell(i, { paidBy: e.target.value })}>
                    <option value="">—</option>
                    {refs.employees.map((e) => (<option key={e.id} value={e.id}>{e.username || e.name}</option>))}
                  </select>
                </td>
                <td className="px-2 py-1.5"><ComboSelect className={input} disabled={locked} value={r.projectId || ""} options={projectOptions} pinnedTop={NON_PROJECT} placeholder="Select project…" displayLabel={r.projectId ? projLabel(r.projectId) : ""} onChange={(v) => setCell(i, { projectId: v })} /></td>
                <td className="px-2 py-1.5"><input type="number" min="0" disabled={locked} className={`${input} text-end disabled:opacity-60`} value={r.amount === "" || r.amount == null ? "" : r.amount} onChange={(e) => setCell(i, { amount: e.target.value === "" ? "" : Number(e.target.value) })} /></td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-700 dark:border-white/15 dark:bg-[#191921]">
              <td className="px-2 py-2.5" colSpan={6}><span className="text-slate-700 dark:text-slate-200">Total</span></td>
              <td className="whitespace-nowrap px-2 py-2.5 text-end text-slate-900 dark:text-white">{sar(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Searchable select field styled like the Sales-ticket contact-name field:
// a text input that filters a dropdown. Pick-only (typing searches). Optional
// `pinnedTop` option is always shown first (e.g. "Non Project").
function ComboSelect({ value, options, onChange, placeholder = "Select…", disabled, pinnedTop, displayLabel, className }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const all = pinnedTop ? [pinnedTop, ...options] : options;
  const selectedLabel = displayLabel != null && displayLabel !== "" ? displayLabel : (all.find((o) => o.value === value)?.label || "");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? options.filter((o) => `${o.label} ${o.sub || ""}`.toLowerCase().includes(s)) : options;
    return base.slice(0, 50);
  }, [q, options]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <input
        className={`${className} disabled:opacity-60`}
        disabled={disabled}
        value={open ? q : selectedLabel}
        placeholder={placeholder}
        onFocus={() => { if (!disabled) { setOpen(true); setQ(""); } }}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />
      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-56 w-full min-w-[13rem] overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-white/15 dark:bg-[#20202c]">
          {pinnedTop && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(pinnedTop.value); setOpen(false); setQ(""); }} className="block w-full rounded-md px-2 py-1.5 text-start text-xs font-600 text-slate-700 hover:bg-brand-500/10 dark:text-slate-200">{pinnedTop.label}</button>
          )}
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-400">No matches.</p>
          ) : filtered.map((o) => (
            <button key={o.value} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(o.value); setOpen(false); setQ(""); }} className="block w-full rounded-md px-2 py-1.5 text-start text-xs text-slate-700 hover:bg-brand-500/10 dark:text-slate-200">
              <span className="font-600">{o.label}</span>{o.sub ? <span className="text-slate-400"> · {o.sub}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
