"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer } from "@/components/ui/drawer";
import { computeSchedule, fmtPlanDate, daySpan, isWeekend } from "@/lib/planSchedule";

const DEFAULT_COLOR = "#022e72";
const STATUSES = ["Not Started", "In Progress", "On Hold", "Complete"];
const DEFAULT_COLS = { status: true, assignedTo: true, duration: true, start: true, end: true, deps: true, comments: true };
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const input = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const escapeHtml = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// DD/MM — used for the timeline axis (table columns keep full DD/MM/YYYY).
const fmtDM = (d) => { try { const x = new Date(d); return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`; } catch { return ""; } };

const PrinterIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
);

const COL_LABELS = { status: "Status", assignedTo: "Assigned to", duration: "Duration", start: "Start date", end: "End date", deps: "Dependencies", comments: "Comments" };

export default function ProjectPlanBuilder({ projectId }) {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState({ includeWeekends: false, colors: {}, cols: DEFAULT_COLS });
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [depOpen, setDepOpen] = useState(null);
  const [depRect, setDepRect] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCols, setShowCols] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [granularity, setGranularity] = useState("week");

  const cols = settings.cols || DEFAULT_COLS;

  const timelineRef = useRef(null);
  const [timelineW, setTimelineW] = useState(900);
  useEffect(() => {
    const el = timelineRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => { for (const e of entries) setTimelineW(Math.max(320, e.contentRect.width)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [timelineOpen]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        const list = res.ok ? await res.json() : [];
        const row = Array.isArray(list) ? list.find((p) => p.id === projectId) : null;
        if (!row) { setNotFound(true); return; }
        setProject(row);
        const plan = row.plan || {};
        setTasks(Array.isArray(plan.tasks) ? plan.tasks : []);
        setSettings({ includeWeekends: !!plan.settings?.includeWeekends, colors: plan.settings?.colors || {}, cols: { ...DEFAULT_COLS, ...(plan.settings?.cols || {}) } });
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const projectStart = project?.startDate || project?.receivedDate || new Date().toISOString();

  const ordered = useMemo(() => {
    const tops = tasks.filter((t) => !t.parentId);
    const out = [];
    for (const top of tops) {
      out.push(top);
      for (const c of tasks.filter((t) => t.parentId === top.id)) out.push(c);
    }
    for (const t of tasks) if (t.parentId && !tops.some((x) => x.id === t.parentId)) out.push(t);
    return out;
  }, [tasks]);

  const labelOf = useMemo(() => {
    const map = {};
    let topN = 0; const topNum = {}; const childIdx = {};
    for (const t of ordered) {
      if (!t.parentId) { topN += 1; topNum[t.id] = topN; map[t.id] = String(topN); }
      else { childIdx[t.parentId] = (childIdx[t.parentId] || 0) + 1; map[t.id] = `${topNum[t.parentId] || "?"}.${childIdx[t.parentId]}`; }
    }
    return map;
  }, [ordered]);

  const scheduled = useMemo(
    () => computeSchedule(ordered, projectStart, settings.includeWeekends),
    [ordered, projectStart, settings.includeWeekends]
  );

  const markDirty = () => setDirty(true);
  const patchTask = (id, fields) => { setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...fields } : t))); markDirty(); };
  const removeTask = (id) => {
    setTasks((ts) => {
      const kill = new Set([id, ...ts.filter((t) => t.parentId === id).map((t) => t.id)]);
      return ts.filter((t) => !kill.has(t.id)).map((t) => ({ ...t, deps: (t.deps || []).filter((d) => !kill.has(d)) }));
    });
    markDirty();
  };
  const commitDraft = () => {
    const name = draft.trim();
    if (!name) return;
    setTasks((ts) => [...ts, { id: uid(), name, duration: 1, deps: [], notes: "", done: false, status: "Not Started", assignedTo: "" }]);
    setDraft("");
    markDirty();
  };
  const addSubTask = (parentId) => {
    setTasks((ts) => [...ts, { id: uid(), name: "", parentId, duration: 1, deps: [], notes: "", done: false, status: "Not Started", assignedTo: "" }]);
    markDirty();
  };
  const toggleDep = (taskId, depId) => {
    setTasks((ts) => ts.map((t) => {
      if (t.id !== taskId) return t;
      const has = (t.deps || []).includes(depId);
      return { ...t, deps: has ? t.deps.filter((d) => d !== depId) : [...(t.deps || []), depId] };
    }));
    markDirty();
  };
  const setCols = (next) => { setSettings((s) => ({ ...s, cols: next })); markDirty(); };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: { tasks, settings } }),
      });
      if (res.ok) { setDirty(false); setSavedAt(Date.now()); }
    } finally {
      setSaving(false);
    }
  }, [projectId, tasks, settings]);

  // Print a plan sheet in the reference template layout: header fields → a WBS
  // table → the Gantt below. Full dates in the table; DD/MM on the timeline.
  const handlePrint = useCallback(() => {
    const svg = timelineRef.current?.querySelector("svg");
    const svgHTML = svg ? svg.outerHTML : "";
    const projName = project?.title_en || "Untitled";
    const manager = project?.ownerLabel || "—";
    const ends = scheduled.map((t) => t.end).filter(Boolean).map((d) => new Date(d).getTime());
    const maxEnd = ends.length ? new Date(Math.max(...ends)) : null;
    const durationDays = maxEnd ? daySpan(projectStart, maxEnd) + 1 : "";
    const rowsHtml = scheduled.map((t) => {
      const depth = t.parentId ? 1 : 0;
      const nm = depth === 0 ? `<b>${escapeHtml(t.name || "Untitled")}</b>` : `<span style="padding-left:14px">– ${escapeHtml(t.name || "Untitled")}</span>`;
      return `<tr class="${depth === 0 ? "grp" : ""}">
        <td class="c">${labelOf[t.id] || ""}</td>
        <td>${nm}</td>
        <td>${escapeHtml(t.status || "")}</td>
        <td>${escapeHtml(t.assignedTo || "")}</td>
        <td class="c">${fmtPlanDate(t.start)}</td>
        <td class="c">${fmtPlanDate(t.end)}</td>
        <td class="c">${t.duration ?? ""}</td>
        <td>${escapeHtml(t.notes || "")}</td>
      </tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(projName)} — Project Plan</title><style>
      @page { size: A4 landscape; margin: 8mm; }
      * { box-sizing: border-box; }
      body { font-family: system-ui, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 11px; }
      h1 { font-size: 16px; letter-spacing: .06em; text-transform: uppercase; color: #334155; margin: 0 0 10px; }
      .fields { display: flex; flex-wrap: wrap; gap: 16px 28px; margin-bottom: 14px; }
      .f { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
      .f .box { margin-top: 3px; min-width: 150px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; font-size: 12px; color: #0f172a; text-transform: none; letter-spacing: 0; }
      table.wbs { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      table.wbs th { background: #1e293b; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; padding: 7px 8px; text-align: left; }
      table.wbs td { border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px; vertical-align: top; }
      table.wbs td.c { text-align: center; white-space: nowrap; }
      table.wbs tr.grp td { background: #eef2f7; font-weight: 700; }
      /* Keep the whole timeline together: if it can't fit after the table on
         this page, push the entire timeline onto its own new page. */
      .timeline { break-inside: avoid; page-break-inside: avoid; margin-top: 8px; }
      .timeline svg { display: block; width: 100% !important; height: auto !important; max-width: 100% !important; min-width: 0 !important; }
      text { fill: #475569; } .fill-slate-400 { fill: #94a3b8; } .fill-slate-600 { fill: #475569; } .fill-slate-500 { fill: #64748b; } .fill-white { fill: #fff; } .fill-slate-100 { fill: #f1f5f9; }
      line, .stroke-slate-200 { stroke: #e2e8f0; } path.stroke-slate-500, .stroke-slate-500 { stroke: #64748b; }
    </style></head><body>
      <h1>Project Plan</h1>
      <div class="fields">
        <div class="f">Project Title<div class="box">${escapeHtml(projName)}</div></div>
        <div class="f">Project Manager<div class="box">${escapeHtml(manager)}</div></div>
        <div class="f">Start Date<div class="box">${fmtPlanDate(projectStart)}</div></div>
        <div class="f">End Date<div class="box">${maxEnd ? fmtPlanDate(maxEnd) : "—"}</div></div>
        <div class="f">Duration (days)<div class="box">${durationDays}</div></div>
      </div>
      <table class="wbs">
        <thead><tr><th>WBS</th><th>Task Name</th><th>Status</th><th>Assigned To</th><th>Start Date</th><th>End Date</th><th>Duration</th><th>Comments</th></tr></thead>
        <tbody>${rowsHtml || `<tr><td colspan="8" style="text-align:center;color:#94a3b8">No tasks.</td></tr>`}</tbody>
      </table>
      <div class="timeline">${svgHTML}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }, [project, scheduled, projectStart, labelOf]);

  const visibleOptional = ["status", "assignedTo", "duration", "start", "end", "deps", "comments"].filter((k) => cols[k]).length;

  if (loading) return <div className="flex h-screen items-center justify-center text-sm text-slate-400">Loading…</div>;
  if (notFound) return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-sm text-slate-500">
      This project doesn&apos;t exist.
      <Link href="/studio/projects/list" className="font-600 text-brand-700 hover:underline">← Back to projects</Link>
    </div>
  );

  const depTask = depOpen ? ordered.find((t) => t.id === depOpen) : null;
  const depEarlier = depTask ? ordered.slice(0, ordered.findIndex((t) => t.id === depOpen)) : [];

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-[#14141b]">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#20202c]">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/studio/projects/list/${projectId}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" title="Back to project" aria-label="Back to project"><Icon name="arrowLeft" className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-800 text-slate-900 dark:text-white">Project Plan</h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{project.title_en || "Untitled"}{project.projectNumber ? ` · ${project.projectNumber}` : ""} · Start {fmtPlanDate(projectStart)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowCols((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"><Icon name="eye" className="h-4 w-4" /> Columns</button>
            {showCols && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCols(false)} />
                <div className="absolute end-0 z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/15 dark:bg-[#20202c]">
                  {Object.keys(COL_LABELS).map((k) => (
                    <label key={k} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
                      <input type="checkbox" checked={!!cols[k]} onChange={(e) => setCols({ ...cols, [k]: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600 dark:border-white/20 dark:bg-[#191921]" />
                      {COL_LABELS[k]}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={() => setTimelineOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"><Icon name="calendar" className="h-4 w-4" /> Timeline</button>
          <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"><Icon name="settings" className="h-4 w-4" /> Settings</button>
          <button onClick={save} disabled={saving || !dirty} className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2 text-sm font-600 text-white hover:bg-brand-950 disabled:opacity-60">
            {saving ? "Saving…" : dirty ? "Save" : savedAt ? "Saved" : "Save"}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-12">#</TableHead>
                <TableHead className="min-w-[200px] ps-4">Task Name</TableHead>
                {cols.status && <TableHead className="w-32">Status</TableHead>}
                {cols.assignedTo && <TableHead className="w-32">Assigned to</TableHead>}
                {cols.duration && <TableHead className="w-28">Duration</TableHead>}
                {cols.start && <TableHead className="w-28">Start Date</TableHead>}
                {cols.end && <TableHead className="w-28">End Date</TableHead>}
                {cols.deps && <TableHead className="min-w-[160px]">Dependencies</TableHead>}
                {cols.comments && <TableHead className="min-w-[180px]">Comments</TableHead>}
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduled.map((t, i) => {
                const isSub = !!t.parentId;
                const depLabels = (t.deps || []).map((d) => labelOf[d]).filter(Boolean).map((n) => `#${n}`);
                return (
                  <TableRow key={t.id} data-state={t.done ? "selected" : undefined}>
                    <TableCell>
                      <input type="checkbox" role="checkbox" checked={!!t.done} onChange={(e) => patchTask(t.id, { done: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-white/20 dark:bg-[#191921]" />
                    </TableCell>
                    <TableCell className={`font-600 ${isSub ? "text-slate-400" : "text-slate-500"}`}>{labelOf[t.id]}</TableCell>
                    <TableCell>
                      <div style={{ paddingInlineStart: isSub ? 18 : 0 }} className="flex items-center gap-1.5">
                        {isSub && <span className="text-slate-300">↳</span>}
                        <input className={`${input} ps-4 text-start`} value={t.name} onChange={(e) => patchTask(t.id, { name: e.target.value })} placeholder={isSub ? "Sub-task name" : "Task name"} />
                      </div>
                    </TableCell>
                    {cols.status && (
                      <TableCell>
                        <select value={t.status || "Not Started"} onChange={(e) => patchTask(t.id, { status: e.target.value })} className={input}>
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </TableCell>
                    )}
                    {cols.assignedTo && (
                      <TableCell><input className={input} value={t.assignedTo || ""} onChange={(e) => patchTask(t.id, { assignedTo: e.target.value })} placeholder="—" /></TableCell>
                    )}
                    {cols.duration && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <input type="number" min="1" className={`${input} w-14`} value={t.duration ?? 1} onChange={(e) => patchTask(t.id, { duration: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                          <span className="text-xs text-slate-400">Days</span>
                        </div>
                      </TableCell>
                    )}
                    {cols.start && <TableCell className="whitespace-nowrap text-slate-500">{fmtPlanDate(t.start)}</TableCell>}
                    {cols.end && <TableCell className="whitespace-nowrap text-slate-500">{fmtPlanDate(t.end)}</TableCell>}
                    {cols.deps && (
                      <TableCell>
                        {i === 0 ? (
                          <span className="text-xs text-slate-400">— (first task)</span>
                        ) : (
                          <button
                            onClick={(e) => { setDepRect(e.currentTarget.getBoundingClientRect()); setDepOpen(depOpen === t.id ? null : t.id); }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-start text-sm text-slate-700 hover:border-brand-400 dark:border-white/15 dark:text-slate-200"
                          >
                            <span className="truncate">{depLabels.length ? depLabels.join(", ") : <span className="text-slate-400">None</span>}</span>
                            <Icon name="chevronDown" className="h-3.5 w-3.5 text-slate-400" />
                          </button>
                        )}
                      </TableCell>
                    )}
                    {cols.comments && (
                      <TableCell><input className={input} value={t.notes || ""} onChange={(e) => patchTask(t.id, { notes: e.target.value })} placeholder="Comments" /></TableCell>
                    )}
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {!isSub && (
                          <button onClick={() => addSubTask(t.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-500/10 dark:text-brand-300" title="Add sub-task" aria-label="Add sub-task"><Icon name="plus" className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => removeTask(t.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" aria-label="Remove task"><Icon name="trash" className="h-4 w-4" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Draft row — typing a name commits a new top-level task. */}
              <TableRow>
                <TableCell />
                <TableCell className="text-slate-300">+</TableCell>
                <TableCell colSpan={visibleOptional + 2}>
                  <input
                    className={`${input} ps-4`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitDraft(); } }}
                    onBlur={commitDraft}
                    placeholder="Add a task — type a name and press Enter"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dependency picker — fixed-positioned so it opens fully ABOVE the table
          (never clipped by the table's scroll area, never scrolls internally). */}
      {depTask && depRect && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setDepOpen(null)} />
          <div
            style={{ position: "fixed", left: Math.max(8, Math.min(depRect.left, (typeof window !== "undefined" ? window.innerWidth : 1200) - 260)), bottom: (typeof window !== "undefined" ? window.innerHeight : 800) - depRect.top + 6, minWidth: Math.max(depRect.width, 220) }}
            className="z-[60] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#20202c]"
          >
            <p className="px-2.5 pb-1 pt-0.5 text-[11px] font-600 uppercase tracking-wide text-slate-400">Starts after…</p>
            {depEarlier.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No earlier tasks.</p>
            ) : depEarlier.map((e) => (
              <label key={e.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 hover:bg-brand-500/10 dark:text-slate-200">
                <input type="checkbox" checked={(depTask.deps || []).includes(e.id)} onChange={() => toggleDep(depTask.id, e.id)} className="h-4 w-4 rounded border-slate-300 text-brand-600 dark:border-white/20 dark:bg-[#191921]" />
                <span className="truncate">#{labelOf[e.id]} · {e.name || "Untitled"}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* Timeline drawer */}
      <Drawer
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        title="Time Line"
        description={`${project.title_en || "Project"} · plan timeline`}
        widthClass="w-[90vw]"
        actions={
          <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5">
            <PrinterIcon /> Print
          </button>
        }
      >
        <div ref={timelineRef} className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          <div className="flex items-center justify-center gap-2 border-b border-slate-100 py-2.5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            Divided by
            <select value={granularity} onChange={(e) => setGranularity(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-600 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white">
              <option value="day">Days</option>
              <option value="week">Weeks</option>
              <option value="month">Months</option>
            </select>
          </div>
          <Gantt scheduled={scheduled} colors={settings.colors} includeWeekends={settings.includeWeekends} labelOf={labelOf} availW={timelineW} granularity={granularity} />
        </div>
      </Drawer>

      {showSettings && (
        <SettingsModal
          settings={settings}
          tasks={ordered}
          labelOf={labelOf}
          onClose={() => setShowSettings(false)}
          onChange={(next) => { setSettings(next); markDirty(); }}
        />
      )}
    </div>
  );
}

// ── Gantt chart ────────────────────────────────────────────────────────────
function Gantt({ scheduled, colors, includeWeekends, labelOf, availW = 900, granularity = "week" }) {
  const withDates = scheduled.filter((t) => t.start && t.end);
  if (withDates.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-slate-400">Add tasks to draw the timeline.</div>;
  }
  const starts = withDates.map((t) => new Date(t.start).getTime());
  const ends = withDates.map((t) => new Date(t.end).getTime());
  const rangeStart = new Date(Math.min(...starts));
  const rangeEnd = new Date(Math.max(...ends));
  const totalDays = Math.max(1, daySpan(rangeStart, rangeEnd) + 1);

  const labelW = availW < 640 ? 120 : 200;
  const pad = 8, rowH = 40, headH = 62;
  const minDayW = 6, maxDayW = 60;
  const fitDayW = (availW - labelW - pad) / totalDays;
  const dayW = Math.max(minDayW, Math.min(maxDayW, fitDayW));
  const chartW = Math.max(availW, labelW + totalDays * dayW + pad);
  const chartH = headH + scheduled.length * rowH + pad;
  const xForDate = (d) => labelW + daySpan(rangeStart, d) * dayW;
  const centerY = (i) => headH + i * rowH + rowH / 2;
  const rowIndex = Object.fromEntries(scheduled.map((t, i) => [t.id, i]));

  // Axis ticks — dates shown as DD/MM (months as short name).
  const ticks = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(rangeStart); d.setDate(d.getDate() + i);
    let mark = false, label = "";
    if (granularity === "day") { mark = true; label = fmtDM(d); }
    else if (granularity === "week") { if (d.getDay() === 0 || i === 0) { mark = true; label = fmtDM(d); } }
    else { if (d.getDate() === 1 || i === 0) { mark = true; label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }); } }
    if (mark) ticks.push({ i, d, label });
  }

  const weekendCols = [];
  if (!includeWeekends) {
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(rangeStart); d.setDate(d.getDate() + i);
      if (isWeekend(d)) weekendCols.push(i);
    }
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} width={chartW} height={chartH} className="max-w-none" style={{ minWidth: availW }}>
        <defs>
          <marker id="plan-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className="fill-slate-500 dark:fill-slate-300" />
          </marker>
        </defs>

        {!includeWeekends && weekendCols.map((i) => (
          <rect key={`wk-${i}`} x={labelW + i * dayW} y={headH} width={dayW} height={chartH - headH - pad} className="fill-slate-100 dark:fill-white/5" />
        ))}
        {ticks.map((t) => {
          const tx = labelW + t.i * dayW;
          const ty = headH - 8;
          return (
            <g key={`ax-${t.i}`}>
              <line x1={tx} y1={headH} x2={tx} y2={chartH - pad} className="stroke-slate-200 dark:stroke-white/10" strokeWidth="1" />
              <text x={tx} y={ty} transform={`rotate(-35 ${tx} ${ty})`} textAnchor="end" className="fill-slate-400 text-[9px]">{t.label}</text>
            </g>
          );
        })}

        {scheduled.map((t, i) => (t.deps || []).map((depId) => {
          const dep = scheduled.find((x) => x.id === depId);
          if (!dep || !dep.end || !t.start || rowIndex[depId] == null) return null;
          const x1 = xForDate(dep.end) + dayW;
          const y1 = centerY(rowIndex[depId]);
          const x2 = xForDate(t.start);
          const y2 = centerY(i);
          const midX = Math.max(x1 + 6, x2 - 6);
          return (
            <path key={`${t.id}-${depId}`} d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`} fill="none" className="stroke-slate-500 dark:stroke-slate-300" strokeWidth="1.4" strokeDasharray="3 2" markerEnd="url(#plan-arrow)" />
          );
        }))}

        {scheduled.map((t, i) => {
          const y = headH + i * rowH;
          const color = colors?.[t.id] || DEFAULT_COLOR;
          const hasBar = t.start && t.end;
          const bx = hasBar ? xForDate(t.start) : labelW;
          const bw = hasBar ? (daySpan(t.start, t.end) + 1) * dayW : 0;
          const isSub = !!t.parentId;
          return (
            <g key={t.id}>
              <text x={isSub ? 18 : 4} y={y + rowH / 2 + 4} className={`text-[11px] font-500 ${isSub ? "fill-slate-400" : "fill-slate-600 dark:fill-slate-300"}`}>
                {labelOf[t.id]}. {(t.name || "Untitled").slice(0, availW < 640 ? 10 : 22)}
              </text>
              {hasBar && (
                <g>
                  <rect x={bx} y={y + (isSub ? 11 : 8)} width={Math.max(bw, Math.max(dayW, 6))} height={rowH - (isSub ? 22 : 16)} rx="4" fill={color} opacity={t.done ? 0.5 : 1} />
                  {bw >= 22 && <text x={bx + Math.max(bw, dayW) / 2} y={y + rowH / 2 + 4} textAnchor="middle" className="fill-white text-[10px] font-600">{labelOf[t.id]}</text>}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Settings modal ───────────────────────────────────────────────────────────
function SettingsModal({ settings, tasks, labelOf, onClose, onChange }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-geex border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Plan settings</h2>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
          <input type="checkbox" checked={settings.includeWeekends} onChange={(e) => onChange({ ...settings, includeWeekends: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600 dark:border-white/20 dark:bg-[#191921]" />
          <span className="text-slate-700 dark:text-slate-200">Include weekends (Fri &amp; Sat) in durations</span>
        </label>

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-600 uppercase tracking-wide text-slate-400">Bar colors</p>
          <div className="max-h-64 space-y-2 overflow-auto">
            {tasks.length === 0 && <p className="text-sm text-slate-400">Add tasks first.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-white/5">
                <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">{labelOf[t.id]}. {t.name || "Untitled"}</span>
                <input
                  type="color"
                  value={settings.colors?.[t.id] || DEFAULT_COLOR}
                  onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, [t.id]: e.target.value } })}
                  className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-white/15"
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Default bar color is {DEFAULT_COLOR}.</p>
        </div>
      </div>
    </div>
  );
}
