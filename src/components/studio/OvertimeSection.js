"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import DateInput from "@/components/studio/DateInput";
import { confirmDialog } from "@/lib/appDialog";
import { downloadOvertimeMatrix } from "@/lib/overtimePdf";
import { DAYS, hhmmToHours } from "@/lib/operations";

// The base working-hours end for a given date (fallback: the latest working end
// across the week, else 17:00) — Add-OT defaults From to just after this.
function workingEndFor(schedule, dateStr) {
  const pick = (name) => { const s = schedule?.[name]; return s && s.on && s.to ? s.to : null; };
  if (dateStr) { const wd = new Date(`${dateStr}T00:00`).getDay(); const t = pick(DAYS[wd]); if (t) return t; }
  let latest = ""; for (const d of DAYS) { const t = pick(d); if (t && t > latest) latest = t; }
  return latest || "17:00";
}
function addHoursHHMM(hhmm, add) {
  const total = Math.min(24 * 60 - 1, Math.round((hhmmToHours(hhmm, 17) + add) * 60));
  const h = Math.floor(total / 60), m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

const card = "rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

const rnd = (n) => Math.round((Number(n) || 0) * 100) / 100;
function fmtDate(v) { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); } }

export default function OvertimeSection() {
  const [data, setData] = useState({ items: [], projects: [], users: [], departments: [], meId: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("main");
  const [adding, setAdding] = useState(false);
  const [editRec, setEditRec] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/overtimes", { cache: "no-store" });
      if (res.status === 403) throw new Error("You don't have access to Overtimes.");
      if (!res.ok) throw new Error("Could not load overtimes.");
      setData(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Matrix: rows = projects that have OT, columns = users that have OT.
  const matrix = useMemo(() => {
    const items = data.items || [];
    const projMap = new Map(), userMap = new Map(), cell = {};
    for (const it of items) {
      if (!projMap.has(it.projectId)) projMap.set(it.projectId, it.projectName || it.projectId);
      if (!userMap.has(it.userId)) userMap.set(it.userId, it.userName || it.userId);
      const key = `${it.projectId}::${it.userId}`;
      cell[key] = rnd((cell[key] || 0) + (Number(it.hours) || 0));
    }
    const projects = [...projMap].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    const users = [...userMap].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    const get = (pid, uid) => cell[`${pid}::${uid}`] || 0;
    const rowTotal = (pid) => rnd(users.reduce((a, u) => a + get(pid, u.id), 0));
    const colTotal = (uid) => rnd(projects.reduce((a, p) => a + get(p.id, uid), 0));
    const grand = rnd(projects.reduce((a, p) => a + rowTotal(p.id), 0));
    return { projects, users, cell: get, rowTotal, colTotal, grand };
  }, [data.items]);

  async function removeRec(id) {
    if (!(await confirmDialog({ title: "Delete overtime", message: "Delete this overtime record?", confirmLabel: "Delete", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/overtimes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete");
      setEditRec(null); await load();
    } catch (e) { setError(e.message); }
  }

  const sortedItems = useMemo(() => [...(data.items || [])].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || "")), [data.items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/15">
          {[["main", "Main"], ["list", "List"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${tab === k ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>{lbl}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {tab === "main" && (
            <button onClick={() => downloadOvertimeMatrix(matrix)} className={btnGhost}><Icon name="open" className="h-4 w-4" /> Export</button>
          )}
          <button onClick={() => setAdding(true)} className={btnPrimary}><Icon name="plus" className="h-4 w-4" /> Add OT</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : tab === "main" ? (
        <div className={`${card} overflow-x-auto`}>
          {matrix.projects.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No overtime recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-[#191921] dark:text-slate-400">
                  <th className="px-4 py-3 text-center font-600">Project</th>
                  {matrix.users.map((u) => (<th key={u.id} className="px-3 py-3 text-center font-600">{u.name}</th>))}
                  <th className="px-3 py-3 text-center font-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.projects.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 dark:border-white/5">
                    <td className="px-4 py-2.5 text-center font-600 text-slate-800 dark:text-slate-100">{p.name}</td>
                    {matrix.users.map((u) => { const h = matrix.cell(p.id, u.id); return (<td key={u.id} className="px-3 py-2.5 text-center text-slate-700 dark:text-slate-200">{h || "—"}</td>); })}
                    <td className="px-3 py-2.5 text-center font-700 text-slate-900 dark:text-white">{matrix.rowTotal(p.id)}</td>
                  </tr>
                ))}
                <tr className="bg-brand-500/5 font-700">
                  <td className="px-4 py-2.5 text-center text-slate-900 dark:text-white">Total</td>
                  {matrix.users.map((u) => (<td key={u.id} className="px-3 py-2.5 text-center text-slate-900 dark:text-white">{matrix.colTotal(u.id)}</td>))}
                  <td className="px-3 py-2.5 text-center text-brand-700 dark:text-brand-300">{matrix.grand}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          {sortedItems.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No overtime records yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-[#191921] dark:text-slate-400">
                  <th className="px-4 py-3 text-start font-600">Project</th>
                  <th className="px-4 py-3 text-start font-600">User</th>
                  <th className="px-4 py-3 text-start font-600">Department</th>
                  <th className="px-4 py-3 text-start font-600">Date</th>
                  <th className="px-4 py-3 text-start font-600">From–To</th>
                  <th className="px-4 py-3 text-end font-600">Hours</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((r) => (
                  <tr key={r.id} onClick={() => setEditRec(r)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setEditRec(r); }} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5 font-600 text-slate-800 dark:text-slate-100">{r.projectName}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{r.userName}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{r.department || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{r.from || "—"} – {r.to || "—"}</td>
                    <td className="px-4 py-2.5 text-end font-700 text-slate-900 dark:text-white">{r.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {adding && <AddOvertimeModal data={data} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await load(); }} />}
      {editRec && <EditOvertimeModal rec={editRec} data={data} onClose={() => setEditRec(null)} onSaved={async () => { setEditRec(null); await load(); }} onDelete={() => removeRec(editRec.id)} />}
    </div>
  );
}

function AddOvertimeModal({ data, onClose, onSaved }) {
  const schedule = data.workSchedule || {};
  const initFrom = workingEndFor(schedule, "");
  const [showAll, setShowAll] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [deptId, setDeptId] = useState(data.defaultDept || "");
  const [userIds, setUserIds] = useState([]);
  const [date, setDate] = useState("");
  // From defaults to just after working hours (outside the base plan).
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(addHoursHHMM(initFrom, 3));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Picking a date re-anchors From to that day's working-hours end.
  function onDateChange(v) {
    setDate(v);
    if (v) { const f = workingEndFor(schedule, v); setFrom(f); setTo(addHoursHHMM(f, 3)); }
  }

  const timesReady = !!(date && from && to);
  // A user is "busy" if assigned to a work task overlapping the OT window.
  const busyIds = useMemo(() => {
    const set = new Set();
    if (!timesReady) return set;
    const s = new Date(`${date}T${from}`).getTime(), e = new Date(`${date}T${to}`).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return set;
    for (const t of data.workTasks || []) {
      const ts = new Date(t.start).getTime(), te = new Date(t.end || t.start).getTime();
      if (Number.isNaN(ts) || Number.isNaN(te)) continue;
      if (overlaps(s, e, ts, te)) for (const id of t.assigneeIds || []) set.add(id);
    }
    return set;
  }, [data.workTasks, timesReady, date, from, to]);

  const projects = useMemo(() => {
    const mine = (data.projects || []).filter((p) => p.ownerId && p.ownerId === data.meId);
    return showAll || mine.length === 0 ? (data.projects || []) : mine;
  }, [data, showAll]);
  const users = useMemo(() => (data.users || []).filter((u) => !deptId || u.departmentId === deptId), [data.users, deptId]);
  const toggleUser = (id) => setUserIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  async function save() {
    setErr("");
    if (!projectId) return setErr("Select a project.");
    if (!date) return setErr("Select a date.");
    if (to <= from) return setErr("End time must be after start time.");
    const finalUsers = userIds.filter((id) => !busyIds.has(id));
    if (finalUsers.length === 0) return setErr("Select at least one available user.");
    setBusy(true);
    try {
      const res = await fetch("/api/overtimes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, userIds: finalUsers, date, from, to }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save");
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onClose()}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 border-b border-slate-100 px-6 py-4 dark:border-white/10"><h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Add overtime</h2></div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={label + " mb-0"}>Project</label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-600 text-slate-500 dark:text-slate-400"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-3.5 w-3.5 accent-brand-600" /> Show all projects</label>
            </div>
            <select className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— select project —</option>
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.title}{p.projectNumber ? ` (${p.projectNumber})` : ""}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={label}>Date</label><DateInput className={input} value={date} onChange={onDateChange} /></div>
            <div><label className={label}>From</label><input type="time" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className={label}>To</label><input type="time" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={label + " mb-0"}>Users {userIds.length ? `(${userIds.length})` : ""}</label>
              <select disabled={!timesReady} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs disabled:opacity-50 dark:border-white/15 dark:bg-[#191921] dark:text-white" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                <option value="">All departments</option>
                {(data.departments || []).map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
            {!timesReady ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-white/15">Set the date, from and to times first to choose users.</p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-white/15">
                {users.length === 0 ? <p className="p-2 text-sm text-slate-400">No users in this department.</p> : users.map((u) => {
                  const isBusy = busyIds.has(u.id);
                  return (
                    <label key={u.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${isBusy ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"}`}>
                      <input type="checkbox" checked={userIds.includes(u.id)} disabled={isBusy} onChange={() => toggleUser(u.id)} className="h-4 w-4 accent-brand-600 disabled:cursor-not-allowed" />
                      <span className="text-slate-700 dark:text-slate-200">{u.fullName}</span>
                      {u.department && <span className="text-xs text-slate-400">· {u.department}</span>}
                      {isBusy && <span className="ms-auto text-[11px] font-600 text-amber-600 dark:text-amber-400">Busy</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-white/10">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={save} disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Add overtime"}</button>
        </div>
      </div>
    </div>
  );
}

function EditOvertimeModal({ rec, data, onClose, onSaved, onDelete }) {
  const [projectId, setProjectId] = useState(rec.projectId || "");
  const [userId, setUserId] = useState(rec.userId || "");
  const [date, setDate] = useState(rec.date || "");
  const [from, setFrom] = useState(rec.from || "17:00");
  const [to, setTo] = useState(rec.to || "20:00");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    if (to <= from) return setErr("End time must be after start time.");
    setBusy(true);
    try {
      const res = await fetch(`/api/overtimes/${rec.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, userId, date, from, to }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save");
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-lg font-700 text-slate-900 dark:text-white">Edit overtime</h2>
        {err && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{err}</p>}
        <div className="space-y-4">
          <div><label className={label}>Project</label>
            <select className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {(data.projects || []).map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
            </select>
          </div>
          <div><label className={label}>User</label>
            <select className={input} value={userId} onChange={(e) => setUserId(e.target.value)}>
              {(data.users || []).map((u) => (<option key={u.id} value={u.id}>{u.fullName}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={label}>Date</label><DateInput className={input} value={date} onChange={setDate} /></div>
            <div><label className={label}>From</label><input type="time" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className={label}>To</label><input type="time" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button onClick={onDelete} className="inline-flex items-center gap-1.5 text-sm font-600 text-red-600 hover:underline dark:text-red-400"><Icon name="trash" className="h-4 w-4" /> Delete</button>
          <div className="flex gap-3">
            <button onClick={onClose} className={btnGhost}>Cancel</button>
            <button onClick={save} disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
