"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DateInput from "@/components/studio/DateInput";
import {
  DAYS, DEFAULT_LEGEND, normalizeSchedule, normalizeLegend, dateToHours,
  dayKey, startOfWeekSunday, addDays, fmtDMY, daysUntil, visibleWindow,
  hhmmToHours, OT_LEGEND_ID,
} from "@/lib/operations";
import { confirmDialog } from "@/lib/appDialog";
import { canManageSection } from "@/lib/sectionAccessConstants";

const card = "rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const input = "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white";
const initials = (name) => (name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
// A Google-Maps URL: use a pasted link as-is, else build a search query.
const mapsHref = (v) => { const s = String(v || "").trim(); return /^https?:\/\//i.test(s) ? s : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`; };

// "09:00 AM" from a Date.
function fmtTime(d) {
  if (!d || Number.isNaN(d.getTime())) return "—";
  let h = d.getHours(); const m = d.getMinutes(); const ap = h < 12 ? "AM" : "PM"; const hh = h % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
}
// "X", "X and Y", "X, Y, and Z".
function joinNames(names) {
  const a = names.filter(Boolean);
  if (a.length === 0) return "No one";
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`;
}
// True if two [start,end) datetime ranges (ms) overlap.
const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

// A round employee avatar with a native-title name tooltip.
function Avatar({ emp, size = 22, ring = true }) {
  const s = { width: size, height: size };
  return emp?.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={emp.photo} alt={emp.fullName} title={emp.fullName} style={s}
      className={`shrink-0 rounded-full object-cover ${ring ? "ring-2 ring-white dark:ring-[#20202c]" : ""}`} />
  ) : (
    <span title={emp?.fullName || "Unknown"} style={s}
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[9px] font-700 text-brand-800 dark:text-brand-200 ${ring ? "ring-2 ring-white dark:ring-[#20202c]" : ""}`}>
      {initials(emp?.fullName)}
    </span>
  );
}

export default function OperationsReport() {
  const [tasks, setTasks] = useState([]);
  const [permits, setPermits] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState(null);
  const [accessMap, setAccessMap] = useState({});
  const [meUsername, setMeUsername] = useState("");
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [clients, setClients] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [weekStart, setWeekStart] = useState(() => startOfWeekSunday(new Date()));
  const [workingOnly, setWorkingOnly] = useState(false);
  const [showOvertimes, setShowOvertimes] = useState(false);
  const [overtimes, setOvertimes] = useState([]);
  const [schedule, setSchedule] = useState(normalizeSchedule(null));
  const [legend, setLegend] = useState(DEFAULT_LEGEND);
  const [sheetNames, setSheetNames] = useState({ employees: "Employees", permits: "Permits" });
  const [rosterPrefix, setRosterPrefix] = useState("");


  const [taskModal, setTaskModal] = useState(null); // {task} | {new:true}
  const [permitModal, setPermitModal] = useState(null);
  const [locationModal, setLocationModal] = useState(null);
  const [dayCopy, setDayCopy] = useState(null); // { title, text }
  const [activeSheet, setActiveSheet] = useState("main");
  const [renamingSheet, setRenamingSheet] = useState(false);

  const trackRef = useRef(null);
  const [trackW, setTrackW] = useState(700);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes, dRes, sRes, meRes, aRes, lRes] = await Promise.all([
        fetch("/api/work-tasks", { cache: "no-store" }),
        fetch("/api/permits", { cache: "no-store" }),
        fetch("/api/operations/directory", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/section-access", { cache: "no-store" }),
        fetch("/api/locations", { cache: "no-store" }),
      ]);
      if (tRes.status === 403) throw new Error("You don't have access to Operations.");
      setLocations(lRes.ok ? await lRes.json() : []);
      const meUser = meRes.ok ? (await meRes.json())?.user || null : null;
      setMe(meUser);
      setIsAdmin(Array.isArray(meUser?.tags) && meUser.tags.includes("admin"));
      setMeUsername(meUser?.userId || "");
      setAccessMap(aRes.ok ? ((await aRes.json())?.access || {}) : {});
      setTasks(tRes.ok ? await tRes.json() : []);
      setPermits(pRes.ok ? await pRes.json() : []);
      const dir = dRes.ok ? await dRes.json() : { employees: [], projects: [], departments: [] };
      setEmployees(dir.employees || []);
      setProjects(dir.projects || []);
      setDepartments(dir.departments || []);
      setClients(dir.clients || []);
      setOvertimes(dir.overtimes || []);
      const s = sRes.ok ? await sRes.json() : {};
      setCities(Array.isArray(s.salesCities) ? s.salesCities : []);
      setSchedule(normalizeSchedule(s.workSchedule));
      setLegend(normalizeLegend(s.operationsLegend));
      setShowOvertimes(!!s.operationsShowOvertimes);
      // "Show overtimes" forces the full window (OT is outside working hours).
      setWorkingOnly(!s.operationsShowOvertimes && !!s.operationsShowWorkingHoursOnly);
      setSheetNames({ employees: s.operationsSheetNames?.employees || "Employees", permits: s.operationsSheetNames?.permits || "Permits" });
      setRosterPrefix(s.operationsRosterPrefix || "");
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // The Employees sheet is admin-only — bounce non-admins back to Main.
  useEffect(() => { if (!isAdmin && activeSheet === "employees") setActiveSheet("main"); }, [isAdmin, activeSheet]);

  // Track the calendar time-track width so we can decide how many avatars fit.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => { for (const e of entries) setTrackW(e.contentRect.width); });
    ro.observe(el);
    setTrackW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [loading]);

  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  // The employee record for the logged-in user (matched by login username), so
  // we can highlight tasks they're assigned to on the calendar.
  const myEmpId = useMemo(() => employees.find((e) => e.username && e.username === meUsername)?.id || "", [employees, meUsername]);
  // Whether the user can manage Operations — gates the Add buttons.
  const canManageOps = useMemo(() => canManageSection(me, "operations", accessMap), [me, accessMap]);
  const legendById = useMemo(() => Object.fromEntries(legend.map((t) => [t.id, t])), [legend]);
  const [winStart, winEnd] = useMemo(() => visibleWindow(schedule, workingOnly), [schedule, workingOnly]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const todayKey = dayKey(new Date());

  // Bucket tasks by local day key, then lay overlapping ones into lanes.
  const tasksByDay = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (!t.start) continue;
      const d = new Date(t.start);
      if (Number.isNaN(d.getTime())) continue;
      const k = dayKey(d);
      (map[k] ||= []).push(t);
    }
    return map;
  }, [tasks]);

  function layDay(dayTasks) {
    const items = (dayTasks || []).map((t) => {
      const s = new Date(t.start), e = new Date(t.end || t.start);
      let sh = dateToHours(s);
      let eh = e > s ? (dayKey(e) === dayKey(s) ? dateToHours(e) : 24) : sh + 0.5;
      return { task: t, sh, eh };
    }).filter((it) => it.eh > winStart && it.sh < winEnd)
      .sort((a, b) => a.sh - b.sh);
    const laneEnds = []; // end hour per lane
    for (const it of items) {
      let lane = laneEnds.findIndex((end) => it.sh >= end);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.eh); }
      else laneEnds[lane] = it.eh;
      it.lane = lane;
    }
    return { items, laneCount: Math.max(1, laneEnds.length) };
  }

  // Overtime entries bucketed by day (only when "Show overtimes" is on) — drawn
  // as OT blocks below the work-task lanes.
  const otByDay = useMemo(() => {
    if (!showOvertimes) return {};
    const map = {};
    for (const o of overtimes) { if (o.date) (map[o.date] ||= []).push(o); }
    return map;
  }, [overtimes, showOvertimes]);

  function layOt(dayOts) {
    const items = (dayOts || []).map((o) => {
      const sh = hhmmToHours(o.from, NaN), eh = hhmmToHours(o.to, NaN);
      return { ot: o, sh, eh };
    }).filter((it) => Number.isFinite(it.sh) && Number.isFinite(it.eh) && it.eh > it.sh && it.eh > winStart && it.sh < winEnd)
      .sort((a, b) => a.sh - b.sh);
    const laneEnds = [];
    for (const it of items) {
      let lane = laneEnds.findIndex((end) => it.sh >= end);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.eh); }
      else laneEnds[lane] = it.eh;
      it.lane = lane;
    }
    return { items, laneCount: laneEnds.length };
  }

  const ticks = useMemo(() => {
    const range = winEnd - winStart;
    const step = range <= 10 ? 1 : 3;
    const out = [];
    for (let h = winStart; h <= winEnd + 0.001; h += step) out.push(Math.round(h));
    return out;
  }, [winStart, winEnd]);

  const fmtHour = (h) => {
    const hh = ((h % 24) + 24) % 24;
    const ap = hh < 12 ? "AM" : "PM";
    let d = hh % 12; if (d === 0) d = 12;
    return `${String(d).padStart(2, "0")}:00 ${ap}`;
  };

  async function saveSettings(extra = {}) {
    setError("");
    try {
      // Only the sheet names are edited here now (Working Hours + Legend moved
      // to Operations → Settings).
      const body = { operationsSheetNames: sheetNames, ...extra };
      const res = await fetch("/api/operations/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      setRenamingSheet(false);
    } catch (e) { setError(e.message); }
  }

  async function deleteTask(id) {
    if (!(await confirmDialog({ title: "Remove work task", message: "Remove this work task from the calendar?", confirmLabel: "Remove", tone: "danger" }))) return;
    await fetch(`/api/work-tasks/${id}`, { method: "DELETE" });
    setTaskModal(null);
    load();
  }
  async function deletePermit(id) {
    if (!(await confirmDialog({ title: "Remove permit", message: "Remove this permit?", confirmLabel: "Remove", tone: "danger" }))) return;
    await fetch(`/api/permits/${id}`, { method: "DELETE" });
    setPermitModal(null);
    load();
  }
  async function deleteLocation(id) {
    if (!(await confirmDialog({ title: "Remove location", message: "Remove this location?", confirmLabel: "Remove", tone: "danger" }))) return;
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    setLocationModal(null);
    load();
  }

  // Clicking a day builds a copyable roster of that day's tasks:
  // "X, Y, and Z to [Project] for [Task] from [FROM] to [TO]" (one line per task).
  function openDayCopy(day) {
    const k = dayKey(day);
    const dayTasks = (tasksByDay[k] || []).slice().sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    const lines = dayTasks.map((t) => {
      const mentions = (t.assigneeIds || [])
        .map((id) => empById[id])
        .filter(Boolean)
        .map((e) => (e.username ? `@${e.username}` : e.fullName))
        .join(" ") || "No one";
      const from = fmtTime(new Date(t.start));
      const to = fmtTime(new Date(t.end || t.start));
      return `${mentions} to ${t.projectName || "—"} for ${t.taskName || "task"} from ${from} to ${to}`;
    });
    const bodyText = lines.length ? lines.join("\n") : "No tasks scheduled this day.";
    const prefix = (rosterPrefix || "").trim();
    setDayCopy({
      title: `${DAYS[day.getDay()]} ${fmtDMY(day)}`,
      text: prefix ? `${prefix}\n\n${bodyText}` : bodyText,
    });
  }

  // Expiry watch — nearest upcoming (and overdue) documents.
  const expLists = useMemo(() => {
    const mk = (arr) => arr.filter((x) => x.days !== null).sort((a, b) => a.days - b.days).slice(0, 4);
    const id = mk(employees.map((e) => ({ label: e.fullName, days: daysUntil(e.idExpiry), date: e.idExpiry })));
    const passport = mk(employees.map((e) => ({ label: e.fullName, days: daysUntil(e.passportExpiry), date: e.passportExpiry })));
    const permit = mk(permits.map((p) => ({ label: p.name, days: daysUntil(p.expireDate), date: p.expireDate })));
    return { id, passport, permit };
  }, [employees, permits]);

  const rangeLabel = `Week Sun ${fmtDMY(weekDays[0])} to Sat ${fmtDMY(weekDays[6])}`;

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;

  return (
    <div className="-mb-8 flex h-[calc(100vh-5rem)] min-h-[520px] flex-col gap-4">
      {error && <p className="shrink-0 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="min-w-0 flex-1 overflow-auto pr-1">
      {activeSheet === "main" && (
      <div className="space-y-6">
      {/* Work Calendar (full width) */}
      <div className={`${card} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Work Calendar</h2>
            {canManageOps && (
              <button onClick={() => setTaskModal({ new: true })} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-600 text-white hover:bg-brand-950">
                <Icon name="plus" className="h-4 w-4" /> Add Work Task
              </button>
            )}
          </div>

          {/* Time header */}
          <div className="flex">
            <div className="w-24 shrink-0" />
            <div className="relative h-6 flex-1">
              {ticks.map((h, i) => (
                <span key={i} className="absolute -translate-x-1/2 text-[10px] text-slate-400" style={{ left: `${((h - winStart) / (winEnd - winStart)) * 100}%` }}>{fmtHour(h)}</span>
              ))}
            </div>
          </div>

          {/* Day rows */}
          <div className="mt-1 border-t border-slate-200 dark:border-white/10">
            {weekDays.map((day, di) => {
              const k = dayKey(day);
              const { items, laneCount } = layDay(tasksByDay[k]);
              const ot = layOt(otByDay[k]);
              const rowH = (laneCount + ot.laneCount) * 34 + 10;
              const otColor = legendById[OT_LEGEND_ID]?.color || "#c4b5fd";
              const isToday = k === todayKey;
              // Non-working days (per the Operations working-hours schedule) get a
              // muted, striped background so they read as "off".
              const dayOff = !schedule?.[DAYS[di]]?.on;
              return (
                <div key={k} className={`flex border-b border-slate-100 dark:border-white/5 ${dayOff ? "bg-slate-100/70 dark:bg-white/[0.02]" : ""}`}>
                  <button type="button" onClick={() => openDayCopy(day)} title="Copy this day's task roster" className={`flex w-24 shrink-0 flex-col justify-center border-r border-slate-200 px-2 py-1 text-start transition-colors hover:bg-brand-500/5 dark:border-white/10 ${dayOff ? "text-slate-400" : ""}`}>
                    <span className={`text-sm font-600 ${dayOff ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>{DAYS[di].slice(0, 3)}</span>
                    <span className="text-[10px] text-slate-400">{day.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}</span>
                  </button>
                  <div ref={di === 0 ? trackRef : undefined} className={`relative flex-1 ${isToday ? "bg-brand-500/5 ring-2 ring-inset ring-brand-500/50" : ""} ${dayOff ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(100,116,139,0.06)_8px,rgba(100,116,139,0.06)_16px)]" : ""}`} style={{ height: rowH }}>
                    {/* gridlines */}
                    {ticks.map((h, i) => (
                      <span key={i} className="absolute top-0 bottom-0 border-l border-dashed border-slate-200/70 dark:border-white/10" style={{ left: `${((h - winStart) / (winEnd - winStart)) * 100}%` }} />
                    ))}
                    {/* tasks */}
                    {items.map(({ task, sh, eh, lane }) => {
                      const left = Math.max(0, ((sh - winStart) / (winEnd - winStart)) * 100);
                      const width = Math.max(2.5, ((Math.min(eh, winEnd) - Math.max(sh, winStart)) / (winEnd - winStart)) * 100);
                      const type = legendById[task.typeId];
                      const color = type?.color || "#cbd5e1";
                      const wpx = (width / 100) * trackW;
                      const assignees = (task.assigneeIds || []).map((id) => empById[id]).filter(Boolean);
                      // Tasks the logged-in user is assigned to get a solid black
                      // border + a slight shadow so they stand out.
                      const mine = !!myEmpId && (task.assigneeIds || []).includes(myEmpId);
                      // How many 20px avatars (with gap) fit, leaving room for a
                      // "+N" chip. If none fit, show only the count "+N".
                      const capacity = Math.floor((wpx - 6) / 22);
                      let showN, extra;
                      if (capacity >= assignees.length) { showN = assignees.length; extra = 0; }
                      else if (capacity >= 1) { showN = Math.max(1, capacity - 1); extra = assignees.length - showN; }
                      else { showN = 0; extra = assignees.length; }
                      return (
                        <div key={task.id} onClick={canManageOps ? () => setTaskModal({ task }) : undefined}
                          className={`group absolute overflow-visible rounded-md ${canManageOps ? "cursor-pointer" : ""} ${mine ? "border-2 border-black shadow-md" : "border border-black/10 shadow-sm"}`}
                          style={{ left: `${left}%`, width: `${width}%`, top: lane * 34 + 5, height: 28, backgroundColor: color }}>
                          <div className="flex h-full items-center justify-center gap-0.5 px-1">
                            {assignees.slice(0, showN).map((e) => (<Avatar key={e.id} emp={e} size={20} />))}
                            {extra > 0 && (
                              <span className="flex h-5 shrink-0 items-center rounded-full bg-black/15 px-1 text-[9px] font-700 text-slate-800">+{extra}</span>
                            )}
                          </div>
                          {/* hover tooltip: [Project Name] - [Task] */}
                          <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-600 text-slate-700 shadow-lg group-hover:block dark:border-white/15 dark:bg-[#20202c] dark:text-slate-200">
                            {(task.projectName || "No project")} - {task.taskName || "Task"}
                          </div>
                        </div>
                      );
                    })}
                    {/* overtime blocks (labelled OT; project shown on hover) */}
                    {ot.items.map(({ ot: o, sh, eh, lane }) => {
                      const left = Math.max(0, ((sh - winStart) / (winEnd - winStart)) * 100);
                      const width = Math.max(2.5, ((Math.min(eh, winEnd) - Math.max(sh, winStart)) / (winEnd - winStart)) * 100);
                      return (
                        <div key={o.id} className="group absolute overflow-visible rounded-md border border-black/10 shadow-sm" style={{ left: `${left}%`, width: `${width}%`, top: (laneCount + lane) * 34 + 5, height: 28, backgroundColor: otColor }}>
                          <div className="flex h-full items-center justify-center px-1 text-[11px] font-700 text-slate-800">OT</div>
                          <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-600 text-slate-700 shadow-lg group-hover:block dark:border-white/15 dark:bg-[#20202c] dark:text-slate-200">
                            OT · {(o.projectName || "No project")}{o.userName ? ` · ${o.userName}` : ""} ({o.from}–{o.to})
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week nav */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <button onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300">◀</button>
            <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-600 text-slate-700 dark:border-white/15 dark:text-slate-200">{rangeLabel}</span>
            <button onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Next week" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300">▶</button>
            <button onClick={() => setWeekStart(startOfWeekSunday(new Date()))} className="rounded-lg border border-brand-500/40 px-3 py-1.5 text-sm font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">Current week</button>
          </div>

          {/* Legend (read-only — managed in Operations → Settings) */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 dark:border-white/10">
            <span className="text-[11px] font-700 uppercase tracking-wide text-slate-400">Legend</span>
            {legend.length === 0 ? (
              <span className="text-sm text-slate-400">No legend items — add them in Operations → Settings.</span>
            ) : legend.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1.5">
                <span className="h-4 w-6 shrink-0 rounded border border-black/10" style={{ backgroundColor: t.color }} />
                <span className="text-sm text-slate-700 dark:text-slate-200">{t.label}</span>
              </span>
            ))}
          </div>
      </div>

      {/* Expiry watch */}
      <div className="grid gap-4 md:grid-cols-3">
        <ExpiryCard title="ID expiring soon" list={expLists.id} />
        <ExpiryCard title="Passport expiring soon" list={expLists.passport} />
        <ExpiryCard title="Permit expiring soon" list={expLists.permit} />
      </div>
      </div>
      )}

      {activeSheet === "employees" && isAdmin && (
      <div className={`${card} overflow-hidden`}>
        <SheetHeader name={sheetNames.employees} onRename={(v) => setSheetNames((n) => ({ ...n, employees: v }))} renaming={renamingSheet} setRenaming={setRenamingSheet} onSave={saveSettings} canManage={canManageOps} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>ID Expiry</TableHead>
                <TableHead>Passport Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-slate-400">No employees.</TableCell></TableRow>
              ) : employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell><span className="flex items-center gap-2"><Avatar emp={e} size={26} ring={false} /><span className="font-600 text-slate-800 dark:text-slate-100">{e.fullName}</span></span></TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{e.idNumber || "—"}</TableCell>
                  <TableCell><ExpiryBadge date={e.idExpiry} /></TableCell>
                  <TableCell><ExpiryBadge date={e.passportExpiry} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      {activeSheet === "permits" && (
      <div className={`${card} overflow-hidden`}>
        <SheetHeader name={sheetNames.permits} onRename={(v) => setSheetNames((n) => ({ ...n, permits: v }))} renaming={renamingSheet} setRenaming={setRenamingSheet} onSave={saveSettings} canManage={canManageOps}
          action={canManageOps ? <button onClick={() => setPermitModal({ new: true })} className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand-700 px-3 py-1 text-xs font-600 text-white hover:bg-brand-950"><Icon name="plus" className="h-3.5 w-3.5" /> Add permit</button> : null} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permit</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Issue date</TableHead>
                <TableHead>Expire date</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {permits.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-slate-400">No permits yet.</TableCell></TableRow>
              ) : permits.map((p) => (
                <TableRow key={p.id} className={canManageOps ? "cursor-pointer" : ""} onClick={canManageOps ? () => setPermitModal({ permit: p }) : undefined}>
                  <TableCell className="font-600 text-slate-800 dark:text-slate-100">{p.name}</TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{p.number || "—"}</TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{p.issueDate ? fmtDMY(new Date(p.issueDate)) : "—"}</TableCell>
                  <TableCell><ExpiryBadge date={p.expireDate} /></TableCell>
                  <TableCell>
                    {p.attachmentUrl ? (
                      <a href={p.attachmentUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-sm font-600 text-brand-700 hover:underline dark:text-brand-300"><Icon name="open" className="h-4 w-4" /> View</a>
                    ) : <span className="text-sm text-slate-400">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className="flex -space-x-1.5">
                      {(p.employeeIds || []).map((id) => empById[id]).filter(Boolean).slice(0, 6).map((e) => (<Avatar key={e.id} emp={e} size={22} />))}
                    </span>
                  </TableCell>
                  <TableCell>{canManageOps ? <Icon name="pencil" className="h-4 w-4 text-slate-400" /> : null}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      {activeSheet === "locations" && (
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-white/10 dark:bg-[#191921]">
          <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">Locations</h2>
          {canManageOps && <button onClick={() => setLocationModal({ new: true })} className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand-700 px-3 py-1 text-xs font-600 text-white hover:bg-brand-950"><Icon name="plus" className="h-3.5 w-3.5" /> Add location</button>}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead className="w-16 text-center">Map</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-slate-400">No locations yet.</TableCell></TableRow>
              ) : locations.map((l) => (
                <TableRow key={l.id} className={canManageOps ? "cursor-pointer" : ""} onClick={canManageOps ? () => setLocationModal({ location: l }) : undefined}>
                  <TableCell className="font-600 text-slate-800 dark:text-slate-100">{l.name}</TableCell>
                  <TableCell className="text-center">
                    {l.mapUrl ? (
                      <a href={mapsHref(l.mapUrl)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Open in Google Maps" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-500/10 dark:text-brand-300"><Icon name="location" className="h-4 w-4" /></a>
                    ) : <span className="text-sm text-slate-400">—</span>}
                  </TableCell>
                  <TableCell>
                    {(l.contacts || []).length === 0 ? (
                      <span className="text-sm text-slate-400">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {(l.contacts || []).map((c, i) => (
                          <span key={i} className="text-sm text-slate-700 dark:text-slate-200">
                            {c.name || "—"}
                            {c.phone && <> · <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="font-600 text-brand-700 hover:underline dark:text-brand-300">{c.phone}</a></>}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{canManageOps ? <Icon name="pencil" className="h-4 w-4 text-slate-400" /> : null}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      )}
      </div>

      {/* Sheet tabs — Main is the default landing; Employees / Permits / Locations switch views */}
      <div className="z-10 flex shrink-0 flex-wrap items-center gap-1 rounded-t-geex border border-b-0 border-slate-200/70 bg-white p-2 shadow-[0_-8px_22px_-14px_rgba(20,30,72,0.16)] dark:border-white/10 dark:bg-[#20202c]">
        {[{ key: "main", label: "Main" }, ...(isAdmin ? [{ key: "employees", label: sheetNames.employees }] : []), { key: "permits", label: sheetNames.permits }, { key: "locations", label: "Locations" }].map((t) => (
          <button key={t.key} onClick={() => { setActiveSheet(t.key); setRenamingSheet(false); }}
            className={`rounded-t-md border px-4 py-1.5 text-sm font-600 transition-colors ${activeSheet === t.key ? "border-brand-500 bg-brand-500/10 text-brand-800 dark:border-brand-400 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:bg-[#191921] dark:text-slate-300 dark:hover:bg-white/5"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {taskModal && (
        <WorkTaskModal
          initial={taskModal.task || null}
          projects={projects}
          employees={employees}
          departments={departments}
          legend={legend}
          tasks={tasks}
          weekStart={weekStart}
          schedule={schedule}
          onClose={() => setTaskModal(null)}
          onSaved={() => { setTaskModal(null); load(); }}
          onDelete={taskModal.task ? () => deleteTask(taskModal.task.id) : null}
        />
      )}
      {dayCopy && (
        <DayCopyModal title={dayCopy.title} text={dayCopy.text} onClose={() => setDayCopy(null)} />
      )}
      {permitModal && (
        <PermitModal
          initial={permitModal.permit || null}
          employees={employees}
          departments={departments}
          clients={clients}
          cities={cities}
          onClose={() => setPermitModal(null)}
          onSaved={() => { setPermitModal(null); load(); }}
          onDelete={permitModal.permit ? () => deletePermit(permitModal.permit.id) : null}
        />
      )}
      {locationModal && (
        <LocationModal
          initial={locationModal.location || null}
          onClose={() => setLocationModal(null)}
          onSaved={() => { setLocationModal(null); load(); }}
          onDelete={locationModal.location ? () => deleteLocation(locationModal.location.id) : null}
        />
      )}
    </div>
  );
}

// ---- Add / edit a location -------------------------------------------------
function LocationModal({ initial, onClose, onSaved, onDelete }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    mapUrl: initial?.mapUrl || "",
    contacts: initial?.contacts?.length ? initial.contacts.map((c) => ({ ...c })) : [{ name: "", phone: "" }],
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (p) => setForm((s) => ({ ...s, ...p }));
  const setContact = (i, p) => set({ contacts: form.contacts.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const addContact = () => set({ contacts: [...form.contacts, { name: "", phone: "" }] });
  const removeContact = (i) => set({ contacts: form.contacts.filter((_, j) => j !== i) });

  async function save() {
    if (!form.name.trim()) { setErr("Location name is required."); return; }
    setBusy(true); setErr("");
    try {
      const payload = { name: form.name.trim(), mapUrl: form.mapUrl.trim(), contacts: form.contacts.filter((c) => c.name.trim() || c.phone.trim()) };
      const res = await fetch(initial ? `/api/locations/${initial.id}` : "/api/locations", { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
  return (
    <Modal onClose={onClose} title={initial ? "Edit location" : "Add location"}>
      {err && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{err}</p>}
      <div className="space-y-3">
        <div><label className={label}>Name</label><input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div>
          <label className={label}>Google Maps link <span className="font-400 normal-case text-slate-400">(paste a maps URL, or an address)</span></label>
          <input className={input} value={form.mapUrl} onChange={(e) => set({ mapUrl: e.target.value })} placeholder="https://maps.google.com/…  or  King Fahd Rd, Riyadh" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className={label + " mb-0"}>Contacts</label>
            <button type="button" onClick={addContact} className="inline-flex items-center gap-1 text-xs font-600 text-brand-700 hover:underline dark:text-brand-300"><Icon name="plus" className="h-3.5 w-3.5" /> Add contact</button>
          </div>
          <div className="space-y-2">
            {form.contacts.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={input} value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} placeholder="Contact name" />
                <input className={input} value={c.phone} onChange={(e) => setContact(i, { phone: e.target.value })} placeholder="Phone number" />
                <button type="button" onClick={() => removeContact(i)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="Remove contact"><Icon name="trash" className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ModalActions busy={busy} onClose={onClose} onSave={save} onDelete={onDelete} />
    </Modal>
  );
}

// A renamable sheet header (Employees / Permits) — pencil toggles an inline
// rename box; `action` renders on the right (e.g. the "Add permit" button).
function SheetHeader({ name, onRename, renaming, setRenaming, onSave, action, canManage = true }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-white/10 dark:bg-[#191921]">
      {renaming && canManage ? (
        <>
          <input value={name} onChange={(e) => onRename(e.target.value)} className={`${input} w-48`} />
          <button onClick={() => onSave()} className="rounded-md bg-brand-700 px-3 py-1 text-xs font-600 text-white">Save</button>
          <button onClick={() => setRenaming(false)} className="rounded-md px-2 py-1 text-xs font-600 text-slate-500 hover:text-slate-700 dark:text-slate-400">Cancel</button>
        </>
      ) : (
        <>
          <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">{name}</h2>
          {canManage && (
            <button onClick={() => setRenaming(true)} className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-brand-700 dark:hover:text-brand-300" title="Rename sheet"><Icon name="pencil" className="h-3.5 w-3.5" /></button>
          )}
        </>
      )}
      {action}
    </div>
  );
}

function ExpiryBadge({ date }) {
  if (!date) return <span className="text-sm text-slate-400">—</span>;
  const d = daysUntil(date);
  const label = fmtDMY(new Date(date));
  let cls = "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
  if (d !== null && d < 0) cls = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
  else if (d !== null && d <= 30) cls = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
  else if (d !== null && d <= 90) cls = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-600 ${cls}`}>{label}{d !== null ? ` · ${d < 0 ? `${-d}d overdue` : `${d}d`}` : ""}</span>;
}

function ExpiryCard({ title, list }) {
  const card = "rounded-geex border border-slate-200/70 bg-white p-4 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
  return (
    <div className={card}>
      <p className="mb-3 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      {list.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing recorded.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((x, i) => {
            const overdue = x.days < 0;
            const near = x.days <= 30;
            return (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-slate-700 dark:text-slate-200">{x.label}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-600 ${overdue || near ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" : x.days <= 90 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}>
                  {overdue ? `${-x.days}d overdue` : `${x.days}d`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Employee multi-select with a department filter. Employees already booked to
// another task in the chosen time window (`busyIds`) can't be added until that
// task finishes — they're greyed out (unless already on this task).
function AssigneeSelector({ employees, departments, selectedIds, onToggle, busyIds, defaultDept = "", label = "Assignees" }) {
  const [dept, setDept] = useState(defaultDept);
  const shown = dept ? employees.filter((e) => e.departmentId === dept) : employees;
  const busy = busyIds || new Set();
  return (
    <div className="sm:col-span-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</label>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className={`${input} w-auto max-w-[55%] py-1 text-xs`}>
          <option value="">All departments</option>
          {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
        </select>
      </div>
      <div className="max-h-40 space-y-1 overflow-auto rounded-lg border border-slate-200 p-2 dark:border-white/15">
        {shown.length === 0 ? (
          <p className="text-xs text-slate-400">No employees{dept ? " in this department" : ""}.</p>
        ) : shown.map((e) => {
          const checked = selectedIds.includes(e.id);
          const disabled = busy.has(e.id) && !checked; // busy elsewhere → can't add
          return (
            <label key={e.id} className={`flex items-center gap-2 rounded-md px-1 py-0.5 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"}`}>
              <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggle(e.id)} className="h-4 w-4 rounded border-slate-300 text-brand-600 disabled:cursor-not-allowed dark:border-white/20" />
              <Avatar emp={e} size={22} ring={false} />
              <span className="text-slate-700 dark:text-slate-200">{e.fullName}</span>
              {disabled && <span className="ms-auto shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-600 text-amber-700 dark:text-amber-300">Busy</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ---- Add / edit a work task ------------------------------------------------
function WorkTaskModal({ initial, projects, employees, departments, legend, tasks, weekStart, schedule, onClose, onSaved, onDelete }) {
  const startDate = initial?.start ? new Date(initial.start) : null;
  const endDate = initial?.end ? new Date(initial.end) : null;
  const pad = (n) => String(n).padStart(2, "0");
  // A brand-new task defaults to the day AFTER today (the usual planning
  // horizon); editing keeps the task's own date.
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d; })();
  const defaultDateObj = startDate || tomorrow;
  const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toTimeInput = (d, fb) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : fb);
  // Default times come from the configured working hours for the default day
  // (falling back to the first working day, then 08:00–10:00).
  const [defFrom, defTo] = (() => {
    const pick = (name) => { const s = schedule?.[name]; return s && s.on && s.from && s.to ? [s.from, s.to] : null; };
    return pick(DAYS[defaultDateObj.getDay()]) || DAYS.map(pick).find(Boolean) || ["08:00", "10:00"];
  })();

  const [form, setForm] = useState({
    projectId: initial?.projectId || "",
    taskName: initial?.taskName || "",
    typeId: initial?.typeId || (legend[0]?.id || ""),
    assigneeIds: initial?.assigneeIds || [],
    date: toDateInput(defaultDateObj),
    from: toTimeInput(startDate, defFrom),
    to: toTimeInput(endDate, defTo),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (p) => setForm((s) => ({ ...s, ...p }));
  const toggle = (id) => set({ assigneeIds: form.assigneeIds.includes(id) ? form.assigneeIds.filter((x) => x !== id) : [...form.assigneeIds, id] });

  // A task scheduled on a non-working day (per the Operations schedule) is
  // always Overtime — the Type is forced to OT and locked while such a date is
  // selected.
  const dayOff = useMemo(() => {
    if (!form.date) return false;
    const d = new Date(`${form.date}T00:00`);
    if (Number.isNaN(d.getTime())) return false;
    return !schedule?.[DAYS[d.getDay()]]?.on;
  }, [form.date, schedule]);
  useEffect(() => {
    if (dayOff && form.typeId !== OT_LEGEND_ID) set({ typeId: OT_LEGEND_ID });
  }, [dayOff]); // eslint-disable-line react-hooks/exhaustive-deps

  // Employees booked to another task overlapping the chosen window are busy.
  const busyIds = useMemo(() => {
    const set = new Set();
    if (!form.date || !form.from || !form.to) return set;
    const s = new Date(`${form.date}T${form.from}`).getTime();
    const e = new Date(`${form.date}T${form.to}`).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return set;
    for (const t of tasks || []) {
      if (initial && t.id === initial.id) continue;
      const ts = new Date(t.start).getTime();
      const te = new Date(t.end || t.start).getTime();
      if (Number.isNaN(ts) || Number.isNaN(te)) continue;
      if (overlaps(s, e, ts, te)) for (const id of t.assigneeIds || []) set.add(id);
    }
    return set;
  }, [tasks, form.date, form.from, form.to, initial]);

  async function save() {
    if (!form.taskName.trim()) { setErr("Task name is required."); return; }
    if (form.to <= form.from) { setErr("End time must be after start time."); return; }
    setBusy(true); setErr("");
    try {
      const proj = projects.find((p) => p.id === form.projectId);
      const body = {
        projectId: form.projectId,
        projectName: proj ? proj.title : "",
        taskName: form.taskName.trim(),
        typeId: dayOff ? OT_LEGEND_ID : form.typeId,
        assigneeIds: form.assigneeIds,
        start: new Date(`${form.date}T${form.from}`).toISOString(),
        end: new Date(`${form.date}T${form.to}`).toISOString(),
      };
      const res = await fetch(initial ? `/api/work-tasks/${initial.id}` : "/api/work-tasks", { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
  return (
    <Modal onClose={onClose} dismissable={false} title={initial ? "Edit work task" : "Add work task"}>
      {err && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Task name</label>
          <input className={input} value={form.taskName} onChange={(e) => set({ taskName: e.target.value })} placeholder="e.g. Rack installation" />
        </div>
        <div>
          <label className={label}>Project</label>
          <select className={input} value={form.projectId} onChange={(e) => set({ projectId: e.target.value })}>
            <option value="">— none —</option>
            {projects.map((p) => (<option key={p.id} value={p.id}>{p.title}{p.projectNumber ? ` (${p.projectNumber})` : ""}</option>))}
          </select>
        </div>
        <div>
          <label className={label}>Type</label>
          <select className={input} value={dayOff ? OT_LEGEND_ID : form.typeId} disabled={dayOff} onChange={(e) => set({ typeId: e.target.value })}>
            {legend.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
          </select>
          {dayOff && <p className="mt-1 text-[11px] text-slate-400">Non-working day — set to Overtime automatically.</p>}
        </div>
        <div>
          <label className={label}>Date</label>
          <DateInput className={input} value={form.date} onChange={(v) => set({ date: v })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={label}>From</label><input type="time" className={input} value={form.from} onChange={(e) => set({ from: e.target.value })} /></div>
          <div><label className={label}>To</label><input type="time" className={input} value={form.to} onChange={(e) => set({ to: e.target.value })} /></div>
        </div>
        <AssigneeSelector employees={employees} departments={departments} selectedIds={form.assigneeIds} onToggle={toggle} busyIds={busyIds} defaultDept={initial ? "" : (departments.find((d) => (d.name || "").trim().toLowerCase() === "technicians")?.id || "")} />
      </div>
      <ModalActions busy={busy} onClose={onClose} onSave={save} onDelete={onDelete} />
    </Modal>
  );
}

// ---- Add / edit a permit ---------------------------------------------------
function PermitModal({ initial, employees, departments, clients = [], cities = [], onClose, onSaved, onDelete }) {
  const [form, setForm] = useState({
    clientId: initial?.clientId || "",
    clientName: initial?.clientName || "",
    locationName: initial?.locationName || "",
    city: initial?.city || "",
    locationUrl: initial?.locationUrl || "",
    number: initial?.number || "",
    issueDate: initial?.issueDate || "",
    expireDate: initial?.expireDate || "",
    employeeIds: initial?.employeeIds || [],
    attachmentId: initial?.attachmentId || "",
    attachmentUrl: initial?.attachmentUrl || "",
    attachmentName: initial?.attachmentName || "",
  });
  const clientLocs = (clients.find((c) => c.id === form.clientId)?.locations) || [];
  // When the chosen client has no saved locations (or the user wants a fresh
  // one), the location is entered inline (name + city + link) and saved back to
  // the client on submit. Existing permits with a location that isn't in the
  // client's saved list also start in manual mode so nothing is lost.
  const savedMatch = clientLocs.find((l) => l.name === form.locationName);
  const [manualLoc, setManualLoc] = useState(!!(initial?.locationName && !savedMatch));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const set = (p) => setForm((s) => ({ ...s, ...p }));
  const toggle = (id) => set({ employeeIds: form.employeeIds.includes(id) ? form.employeeIds.filter((x) => x !== id) : [...form.employeeIds, id] });

  async function uploadAttachment(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (file.size > 5 * 1024 * 1024) { setErr(`File is ${Math.round(file.size / 1024)} KB — the limit is 5 MB.`); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.append("file", file);
      const res = await fetch("/api/permits/attachment", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      // Replace: the previous file is removed from the store on save (server-side).
      set({ attachmentId: data.id, attachmentUrl: data.url, attachmentName: data.name });
    } catch (e2) { setErr(e2.message); }
    finally { setUploading(false); }
  }

  function pickClient(id) {
    const c = clients.find((x) => x.id === id);
    const locs = c?.locations || [];
    // No saved locations for this client → drop straight into manual entry.
    setManualLoc(locs.length === 0);
    set({ clientId: id, clientName: c?.name || "", locationName: "", city: "", locationUrl: "" });
  }
  function pickLocation(name) {
    if (name === "__new__") { setManualLoc(true); set({ locationName: "", city: "", locationUrl: "" }); return; }
    const l = clientLocs.find((x) => x.name === name);
    set({ locationName: name, city: l?.city || "", locationUrl: l?.url || "" });
  }

  async function save() {
    if (!form.clientId) { setErr("Select a client."); return; }
    if (!form.locationName.trim()) { setErr("Add or select a location."); return; }
    if (!form.attachmentUrl) { setErr("An attachment is required."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch(initial ? `/api/permits/${initial.id}` : "/api/permits", { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
  return (
    <Modal onClose={onClose} title={initial ? "Edit permit" : "Add permit"}>
      {err && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Client</label>
          <select className={input} value={form.clientId} onChange={(e) => pickClient(e.target.value)}>
            <option value="">— select client —</option>
            {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className={label}>Location</label>
          {!form.clientId ? (
            <input className={input} disabled placeholder="Pick a client first" />
          ) : manualLoc ? (
            <div className="space-y-2">
              <input className={input} placeholder="Location name" value={form.locationName} onChange={(e) => set({ locationName: e.target.value })} />
              <div className="flex items-center gap-2">
                <select className={input} value={form.city} onChange={(e) => set({ city: e.target.value })}>
                  <option value="">— city —</option>
                  {cities.map((c) => (<option key={c} value={c}>{c}</option>))}
                  {form.city && !cities.includes(form.city) && <option value={form.city}>{form.city}</option>}
                </select>
                {form.locationUrl && <a href={form.locationUrl} target="_blank" rel="noreferrer" title="Open location" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-brand-700 hover:bg-brand-500/10 dark:border-white/15 dark:text-brand-300"><Icon name="location" className="h-4 w-4" /></a>}
              </div>
              <input type="url" className={input} placeholder="Location link (Maps URL)" value={form.locationUrl} onChange={(e) => set({ locationUrl: e.target.value })} />
              {clientLocs.length > 0 && <button type="button" onClick={() => { setManualLoc(false); set({ locationName: "", city: "", locationUrl: "" }); }} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">← Pick a saved location</button>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select className={input} value={form.locationName} onChange={(e) => pickLocation(e.target.value)}>
                <option value="">— select location —</option>
                {clientLocs.map((l) => (<option key={l.id || l.name} value={l.name}>{l.name}{l.city ? ` · ${l.city}` : ""}</option>))}
                <option value="__new__">+ Add a new location…</option>
              </select>
              {form.locationUrl && <a href={form.locationUrl} target="_blank" rel="noreferrer" title="Open location" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-brand-700 hover:bg-brand-500/10 dark:border-white/15 dark:text-brand-300"><Icon name="location" className="h-4 w-4" /></a>}
            </div>
          )}
        </div>
        <div><label className={label}>Number</label><input className={input} value={form.number} onChange={(e) => set({ number: e.target.value })} /></div>
        <div><label className={label}>Issue date</label><DateInput className={input} value={form.issueDate} onChange={(v) => set({ issueDate: v })} /></div>
        <div><label className={label}>Expire date</label><DateInput className={input} value={form.expireDate} onChange={(v) => set({ expireDate: v })} /></div>

        {/* Mandatory attachment — upload, view, and replace (old file removed on save). */}
        <div className="sm:col-span-2">
          <label className={label}>Attachment <span className="text-red-500">*</span> <span className="font-400 normal-case text-slate-400">(PDF or image, max 5 MB)</span></label>
          {form.attachmentUrl ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/15 dark:bg-[#191921]">
              <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-sm font-600 text-brand-700 hover:underline dark:text-brand-300">
                <Icon name="open" className="h-4 w-4 shrink-0" /> <span className="truncate">{form.attachmentName || "View attachment"}</span>
              </a>
              <label className="ms-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-600 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">
                <Icon name="pencil" className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Replace"}
                <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" onChange={uploadAttachment} disabled={uploading} className="hidden" />
              </label>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-600 text-slate-500 hover:border-brand-500 hover:text-brand-700 dark:border-white/20 dark:bg-[#191921] dark:text-slate-400 dark:hover:text-brand-300">
              <Icon name="plus" className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload attachment"}
              <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" onChange={uploadAttachment} disabled={uploading} className="hidden" />
            </label>
          )}
        </div>

        <AssigneeSelector employees={employees} departments={departments} selectedIds={form.employeeIds} onToggle={toggle} label="Employees" />
      </div>
      <ModalActions busy={busy || uploading} onClose={onClose} onSave={save} onDelete={onDelete} />
    </Modal>
  );
}

function Modal({ title, children, onClose, dismissable = true }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={dismissable ? onClose : undefined}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-geex border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Icon name="close" className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Read-only, copyable roster of a day's tasks.
function DayCopyModal({ title, text, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  return (
    <Modal title={title} onClose={onClose}>
      <textarea readOnly value={text} rows={Math.min(12, Math.max(3, text.split("\n").length + 1))} className={`${input} w-full resize-y font-mono text-xs`} onFocus={(e) => e.target.select()} />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300">Close</button>
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2 text-sm font-600 text-white hover:bg-brand-950"><Icon name={copied ? "check" : "external"} className="h-4 w-4" /> {copied ? "Copied" : "Copy"}</button>
      </div>
    </Modal>
  );
}

function ModalActions({ busy, onClose, onSave, onDelete }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <div>{onDelete && <button onClick={onDelete} className="inline-flex items-center gap-1.5 text-sm font-600 text-red-600 hover:underline"><Icon name="trash" className="h-4 w-4" /> Delete</button>}</div>
      <div className="flex gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300">Cancel</button>
        <button onClick={onSave} disabled={busy} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-600 text-white hover:bg-brand-950 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
